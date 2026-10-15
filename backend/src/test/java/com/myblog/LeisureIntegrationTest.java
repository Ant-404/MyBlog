package com.myblog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myblog.common.exception.ExternalServiceException;
import com.myblog.media.repository.MediaRepository;
import com.myblog.music.dto.MusicTrack;
import com.myblog.music.service.QqMusicClient;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@org.springframework.context.annotation.Import(TestDatabaseConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser(roles = "ADMIN")
@Transactional
class LeisureIntegrationTest {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper mapper;
  @Autowired MediaRepository media;
  @MockitoBean QqMusicClient musicClient;

  private String anime(boolean visible) {
    return """
    {"title":"LeisureTestAnime","cover":"/api/v1/media/anime-test.png","status":"WATCHING",
    "watchedEpisodes":3,"totalEpisodes":12,"score":8.5,"note":"喜欢这段故事",
    "sourceUrl":"https://example.com/anime","sortOrder":0,"visible":%s,"version":0}
    """
        .formatted(visible);
  }

  private String music(int version) {
    return """
    {"playlistId":"https://y.qq.com/n/ryqq/playlist/1234567890","name":"LeisureTestMusic",
    "profileUrl":"https://y.qq.com/n/ryqq/profile/test","enabled":true,"version":%d}
    """
        .formatted(version);
  }

  @Test
  void animeVisibilityProgressValidationAndVersionProtection() throws Exception {
    mvc.perform(
            post("/api/v1/admin/anime")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(anime(false)))
        .andExpect(status().isOk());
    mvc.perform(get("/api/v1/anime").with(anonymous()))
        .andExpect(jsonPath("$.data.length()").value(0));
    assertThat(media.used("/api/v1/media/anime-test.png")).isTrue();
    var rows =
        mapper
            .readTree(
                mvc.perform(get("/api/v1/admin/anime"))
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data");
    long id = rows.get(0).path("id").asLong();
    mvc.perform(
            put("/api/v1/admin/anime/" + id)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(anime(true)))
        .andExpect(status().isOk());
    mvc.perform(get("/api/v1/anime").with(anonymous()))
        .andExpect(jsonPath("$.data[0].watchedEpisodes").value(3));
    mvc.perform(delete("/api/v1/admin/anime/" + id).with(csrf()).param("version", "0"))
        .andExpect(status().isConflict());
    mvc.perform(delete("/api/v1/admin/anime/" + id).with(csrf()).param("version", "1"))
        .andExpect(status().isOk());
    assertThat(media.used("/api/v1/media/anime-test.png")).isFalse();
    mvc.perform(
            post("/api/v1/admin/anime")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(anime(true).replace("\"watchedEpisodes\":3", "\"watchedEpisodes\":13")))
        .andExpect(status().isBadRequest());
    mvc.perform(
            post("/api/v1/admin/anime")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(anime(true).replace("WATCHING", "COMPLETED")))
        .andExpect(status().isBadRequest());
    mvc.perform(
            post("/api/v1/admin/anime")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(anime(true).replace("https://example.com/anime", "javascript:alert(1)")))
        .andExpect(status().isBadRequest());
  }

  @Test
  void leisureWritesRequireAdminAndCsrf() throws Exception {
    mvc.perform(get("/api/v1/admin/anime").with(anonymous())).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/v1/admin/music").with(anonymous())).andExpect(status().isUnauthorized());
    mvc.perform(
            post("/api/v1/admin/anime")
                .contentType(MediaType.APPLICATION_JSON)
                .content(anime(true)))
        .andExpect(status().isForbidden());
    mvc.perform(
            post("/api/v1/admin/music/import")
                .contentType(MediaType.APPLICATION_JSON)
                .content(music(0)))
        .andExpect(status().isForbidden());
    verifyNoInteractions(musicClient);
  }

  @Test
  void musicImportVisibilityVersionAndFailureKeepPreviousPlaylist() throws Exception {
    int version =
        mapper
            .readTree(
                mvc.perform(get("/api/v1/admin/music"))
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data")
            .path("version")
            .asInt();
    when(musicClient.tracks("1234567890"))
        .thenReturn(
            List.of(
                new MusicTrack(
                    0,
                    "测试歌曲",
                    "测试歌手",
                    "https://example.com/audio.mp3",
                    "/api/v1/media/music-test.png",
                    "https://y.qq.com/n/ryqq/playlist/1234567890")));
    mvc.perform(
            post("/api/v1/admin/music/import")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(music(version)))
        .andExpect(status().isOk());
    mvc.perform(get("/api/v1/music").with(anonymous()))
        .andExpect(jsonPath("$.data.tracks[0].title").value("测试歌曲"));
    assertThat(media.used("/api/v1/media/music-test.png")).isTrue();
    mvc.perform(
            put("/api/v1/admin/music")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(music(version)))
        .andExpect(status().isConflict());
    mvc.perform(
            put("/api/v1/admin/music")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(music(version + 1).replace("\"enabled\":true", "\"enabled\":false")))
        .andExpect(status().isOk());
    mvc.perform(get("/api/v1/music").with(anonymous()))
        .andExpect(jsonPath("$.data.tracks.length()").value(0));
    when(musicClient.tracks(anyString())).thenThrow(new ExternalServiceException("测试上游不可用"));
    mvc.perform(
            post("/api/v1/admin/music/import")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(music(version + 2)))
        .andExpect(status().isBadGateway());
    mvc.perform(get("/api/v1/admin/music"))
        .andExpect(jsonPath("$.data.version").value(version + 2))
        .andExpect(jsonPath("$.data.tracks[0].title").value("测试歌曲"));
  }

  @Test
  void invalidMusicAddressDoesNotCallUpstreamOrOverwriteSavedData() throws Exception {
    int version =
        mapper
            .readTree(
                mvc.perform(get("/api/v1/admin/music"))
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data")
            .path("version")
            .asInt();
    mvc.perform(
            post("/api/v1/admin/music/import")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    music(version)
                        .replace(
                            "https://y.qq.com/n/ryqq/playlist/1234567890",
                            "https://evil.example/playlist/1234567890")))
        .andExpect(status().isBadRequest());
    mvc.perform(
            post("/api/v1/admin/music/import")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    music(version)
                        .replace("https://y.qq.com/n/ryqq/profile/test", "javascript:alert(1)")))
        .andExpect(status().isBadRequest());
    verifyNoInteractions(musicClient);
  }
}
