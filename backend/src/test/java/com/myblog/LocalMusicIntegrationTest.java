package com.myblog;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myblog.music.service.LocalMusicService;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.*;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;

@org.springframework.context.annotation.Import(TestDatabaseConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser(roles = "ADMIN")
class LocalMusicIntegrationTest {
  static final Path ROOT;

  static {
    try {
      ROOT = Files.createTempDirectory("myblog-music-test-");
    } catch (Exception e) {
      throw new ExceptionInInitializerError(e);
    }
  }

  @DynamicPropertySource
  static void directories(DynamicPropertyRegistry registry) {
    registry.add("blog.music.directory", () -> ROOT.resolve("managed").toString());
    registry.add("blog.music.source-directory", () -> ROOT.resolve("source").toString());
  }

  @Autowired MockMvc mvc;
  @Autowired ObjectMapper mapper;

  @Test
  void uploadEditCoverRangeAndRestartPreserveLocalFiles() throws Exception {
    Files.createDirectories(ROOT.resolve("source"));
    byte[] audio = "RIFF0000WAVEfmt 000000000000000000000000000000000000".getBytes();
    Path original = ROOT.resolve("source/洛天依 - 蝴蝶.wav");
    Files.write(original, audio);
    var result =
        mvc.perform(get("/api/v1/admin/music/local")).andExpect(status().isOk()).andReturn();
    long sourceId =
        mapper.readTree(result.getResponse().getContentAsString()).at("/data/tracks/0/id").asLong();
    mvc.perform(
            put("/api/v1/admin/music/local/" + sourceId)
                .with(csrf())
                .contentType("application/json")
                .content("{\"title\":\"蝴蝶新版\",\"artist\":\"洛天依\",\"version\":0}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.tracks[0].title").value("蝴蝶新版"));
    mvc.perform(
            put("/api/v1/admin/music/local/" + sourceId)
                .with(csrf())
                .contentType("application/json")
                .content("{\"title\":\"覆盖\",\"artist\":\"\",\"version\":0}"))
        .andExpect(status().isConflict());
    var png = new ByteArrayOutputStream();
    ImageIO.write(new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB), "png", png);
    mvc.perform(
            multipart("/api/v1/admin/music/local/" + sourceId + "/cover")
                .file(new MockMultipartFile("file", "cover.png", "image/png", png.toByteArray()))
                .param("version", "1")
                .with(csrf()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.tracks[0].version").value(2));
    mvc.perform(get("/api/v1/music/local/" + sourceId + "/cover").with(anonymous()))
        .andExpect(status().isOk())
        .andExpect(content().contentType("image/png"));
    mvc.perform(
            get("/api/v1/music/local/" + sourceId + "/audio")
                .header("Range", "bytes=0-11")
                .with(anonymous()))
        .andExpect(status().isPartialContent())
        .andExpect(header().string("Content-Range", "bytes 0-11/" + audio.length));
    mvc.perform(
            multipart("/api/v1/admin/music/local")
                .file(new MockMultipartFile("file", "歌手 - 新歌.wav", "audio/wav", audio))
                .with(csrf()))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.tracks.length()").value(2));
    assertThat(Files.readAllBytes(original)).isEqualTo(audio);
    var restarted =
        new LocalMusicService(
            mapper, ROOT.resolve("managed").toString(), ROOT.resolve("source").toString());
    assertThat(restarted.settings().tracks()).hasSize(2);
    assertThat(restarted.settings().tracks().getFirst().title()).isEqualTo("蝴蝶新版");
    assertThat(restarted.settings().tracks().getFirst().cover()).contains("/cover?v=2");
  }

  @Test
  void visibilityOrderingAndVersionsPersistWithoutDeletingFiles() throws Exception {
    Path folder = ROOT.resolve("ordering");
    Files.createDirectories(folder);
    Files.writeString(folder.resolve("a.wav"), "RIFF0000WAVEfmt test");
    Files.writeString(folder.resolve("b.wav"), "RIFF0000WAVEfmt test");
    var service =
        new LocalMusicService(mapper, folder.resolve("managed").toString(), folder.toString());
    var tracks = service.settings(true).tracks();
    long a = tracks.get(0).id(), b = tracks.get(1).id();
    service.reorder(
        java.util.List.of(
            new LocalMusicService.TrackVersion(b, 0), new LocalMusicService.TrackVersion(a, 0)));
    assertThat(service.settings().tracks().getFirst().id()).isEqualTo(b);
    assertThatThrownBy(() -> service.visibility(b, 0, true))
        .isInstanceOf(com.myblog.common.exception.ConflictException.class);
    service.visibility(b, 1, true);
    assertThat(service.settings().tracks()).hasSize(1);
    assertThat(service.settings(true).tracks()).hasSize(2);
    var restarted =
        new LocalMusicService(mapper, folder.resolve("managed").toString(), folder.toString());
    assertThat(restarted.settings().tracks()).hasSize(1);
    restarted.visibility(b, 2, false);
    restarted.edit(b, "恢复后的歌名", "歌手", 3);
    assertThat(restarted.settings().tracks().getFirst().title()).isEqualTo("恢复后的歌名");
    assertThat(Files.exists(folder.resolve("b.wav"))).isTrue();
    assertThatThrownBy(
            () ->
                restarted.reorder(
                    java.util.List.of(
                        new LocalMusicService.TrackVersion(a, 1),
                        new LocalMusicService.TrackVersion(a, 1))))
        .isInstanceOf(com.myblog.common.exception.InvalidInputException.class);
  }

  @Test
  void rejectsAnonymousMissingCsrfFakeAudioAndUnknownIds() throws Exception {
    var fake =
        new MockMultipartFile("file", "fake.mp3", "audio/mpeg", "<script>fake</script>".getBytes());
    mvc.perform(multipart("/api/v1/admin/music/local").file(fake).with(csrf()).with(anonymous()))
        .andExpect(status().isUnauthorized());
    mvc.perform(multipart("/api/v1/admin/music/local").file(fake))
        .andExpect(status().isForbidden());
    mvc.perform(multipart("/api/v1/admin/music/local").file(fake).with(csrf()))
        .andExpect(status().isBadRequest());
    mvc.perform(get("/api/v1/music/local/0/audio").with(anonymous()))
        .andExpect(status().isNotFound());
    mvc.perform(get("/api/v1/admin/music/local").with(anonymous()))
        .andExpect(status().isUnauthorized());
  }
}
