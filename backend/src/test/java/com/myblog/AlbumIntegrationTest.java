package com.myblog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myblog.media.repository.MediaRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@org.springframework.context.annotation.Import(TestDatabaseConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser(roles = "ADMIN")
@Transactional
class AlbumIntegrationTest {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper mapper;
  @Autowired MediaRepository media;

  private String input(boolean visible, int version) {
    return """
    {"title":"Album test","description":"A day outside","cover":"/api/v1/media/album-cover.png","sortOrder":1,"visible":%s,"version":%d,
    "photos":[{"url":"/api/v1/media/album-b.png","caption":"Second"},{"url":"/api/v1/media/album-a.png","caption":"First"}]}
    """
        .formatted(visible, version);
  }

  @Test
  void lifecycleVisibilityPhotoOrderConflictAndMediaProtection() throws Exception {
    var result =
        mvc.perform(
                post("/api/v1/admin/albums")
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(input(false, 0)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.photoCount").value(2))
            .andReturn();
    long id =
        mapper.readTree(result.getResponse().getContentAsString()).path("data").path("id").asLong();
    mvc.perform(get("/api/v1/albums").with(anonymous()))
        .andExpect(jsonPath("$.data.length()").value(0));
    mvc.perform(get("/api/v1/albums/" + id).with(anonymous())).andExpect(status().isNotFound());
    assertThat(media.used("/api/v1/media/album-cover.png")).isTrue();
    assertThat(media.used("/api/v1/media/album-b.png")).isTrue();
    mvc.perform(
            put("/api/v1/admin/albums/" + id)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(input(true, 0)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.version").value(1));
    mvc.perform(get("/api/v1/albums/" + id).with(anonymous()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.photos[0].caption").value("Second"))
        .andExpect(jsonPath("$.data.photos[1].caption").value("First"));
    mvc.perform(
            put("/api/v1/admin/albums/" + id)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(input(false, 0)))
        .andExpect(status().isConflict());
    mvc.perform(get("/api/v1/albums/" + id))
        .andExpect(jsonPath("$.data.photoCount").value(2))
        .andExpect(jsonPath("$.data.visible").value(true));
    mvc.perform(delete("/api/v1/admin/albums/" + id).with(csrf()).param("version", "0"))
        .andExpect(status().isConflict());
    mvc.perform(delete("/api/v1/admin/albums/" + id).with(csrf()).param("version", "1"))
        .andExpect(status().isOk());
    assertThat(media.used("/api/v1/media/album-cover.png")).isFalse();
    assertThat(media.used("/api/v1/media/album-b.png")).isFalse();
  }

  @Test
  void searchesAlbumAndPhotoTextWithoutExposingHiddenAlbumsOrTreatingWildcardsAsPatterns()
      throws Exception {
    mvc.perform(
            post("/api/v1/admin/albums")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(input(true, 0)))
        .andExpect(status().isOk());
    mvc.perform(
            post("/api/v1/admin/albums")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(input(false, 0).replace("Second", "HiddenOnly")))
        .andExpect(status().isOk());
    mvc.perform(get("/api/v1/albums").with(anonymous()).param("keyword", "second"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.length()").value(1))
        .andExpect(jsonPath("$.data[0].previewImages[0]").value("/api/v1/media/album-b.png"))
        .andExpect(jsonPath("$.data[0].createdAt").isString());
    for (String keyword : new String[] {"Album test", "day outside"}) {
      mvc.perform(get("/api/v1/albums").param("keyword", keyword))
          .andExpect(jsonPath("$.data.length()").value(1));
    }
    for (String keyword : new String[] {"HiddenOnly", "%", "_", "!", "' OR 1=1 --"}) {
      mvc.perform(get("/api/v1/albums").with(anonymous()).param("keyword", keyword))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.length()").value(0));
    }
    mvc.perform(get("/api/v1/albums").param("keyword", "x".repeat(101)))
        .andExpect(status().isBadRequest());
  }

  @Test
  void validatesPhotosAndRequiresAdminAndCsrf() throws Exception {
    mvc.perform(get("/api/v1/admin/albums").with(anonymous())).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/v1/admin/albums/1").with(anonymous()))
        .andExpect(status().isUnauthorized());
    mvc.perform(
            post("/api/v1/admin/albums")
                .with(anonymous())
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(input(true, 0)))
        .andExpect(status().isUnauthorized());
    mvc.perform(
            post("/api/v1/admin/albums")
                .contentType(MediaType.APPLICATION_JSON)
                .content(input(true, 0)))
        .andExpect(status().isForbidden());
    for (String bad :
        new String[] {
          input(true, 0)
              .replace("album-b.png", "bad.png")
              .replace("/api/v1/media/bad.png", "javascript:alert(1)"),
          input(true, 0).replace("Album test", " "),
          input(true, 0).replace("/api/v1/media/album-a.png", " ")
        }) {
      mvc.perform(
              post("/api/v1/admin/albums")
                  .with(csrf())
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(bad))
          .andExpect(status().isBadRequest());
    }
    mvc.perform(get("/api/v1/admin/albums")).andExpect(jsonPath("$.data.length()").value(0));
  }
}
