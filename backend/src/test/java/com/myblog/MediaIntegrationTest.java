package com.myblog;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@org.springframework.context.annotation.Import(TestDatabaseConfiguration.class)
@SpringBootTest(properties = "blog.media.directory=target/test-uploads")
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser(roles = "ADMIN")
class MediaIntegrationTest {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper mapper;
  @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;

  @Test
  void imageUploadReadAndDelete() throws Exception {
    var bytes = new ByteArrayOutputStream();
    ImageIO.write(new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB), "png", bytes);
    var result =
        mvc.perform(
                multipart("/api/v1/admin/media")
                    .file(
                        new MockMultipartFile(
                            "file", "../../test.png", "image/png", bytes.toByteArray()))
                    .with(csrf()))
            .andExpect(status().isCreated())
            .andReturn();
    var image = mapper.readTree(result.getResponse().getContentAsString()).path("data");
    String url = image.path("url").asText();
    long id = image.path("id").asLong();
    mvc.perform(get(url).with(anonymous()))
        .andExpect(status().isOk())
        .andExpect(content().contentType("image/png"))
        .andExpect(header().string("X-Content-Type-Options", "nosniff"));
    String slug = "media-test-" + java.util.UUID.randomUUID();
    long category = jdbc.queryForObject("SELECT MIN(id) FROM categories", Long.class);
    jdbc.update(
        "INSERT INTO posts(slug,title,excerpt,content,cover,category_id,published_at) VALUES"
            + " (?,?,?,?,?,?,CURRENT_DATE)",
        slug,
        "Media test",
        "",
        "",
        url,
        category);
    try {
      mvc.perform(delete("/api/v1/admin/media/" + id).with(csrf()))
          .andExpect(status().isConflict());
    } finally {
      jdbc.update("DELETE FROM posts WHERE slug=?", slug);
    }
    mvc.perform(delete("/api/v1/admin/media/" + id).with(csrf())).andExpect(status().isOk());
    mvc.perform(get(url)).andExpect(status().isNotFound());
  }

  @Test
  void rejectsDisguisedFilesAndMissingCsrf() throws Exception {
    var fake =
        new MockMultipartFile(
            "file", "image.png", "image/png", "<script>alert(1)</script>".getBytes());
    mvc.perform(multipart("/api/v1/admin/media").file(fake).with(csrf()))
        .andExpect(status().isBadRequest());
    mvc.perform(multipart("/api/v1/admin/media").file(fake)).andExpect(status().isForbidden());
    mvc.perform(get("/api/v1/admin/media").with(anonymous())).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/v1/media/not-an-image.png")).andExpect(status().isNotFound());
  }

  @Test
  void visitorsUploadPhotosAndReferencedPhotosCannotBeDeleted() throws Exception {
    var bytes = new ByteArrayOutputStream();
    ImageIO.write(new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB), "png", bytes);
    var file = new MockMultipartFile("file", "photo.png", "image/png", bytes.toByteArray());
    mvc.perform(multipart("/api/v1/comments/images").file(file).with(anonymous()))
        .andExpect(status().isForbidden());
    mvc.perform(
            multipart("/api/v1/comments/images")
                .file(
                    new MockMultipartFile(
                        "file", "fake.png", "image/png", "not an image".getBytes()))
                .with(anonymous())
                .with(csrf()))
        .andExpect(status().isBadRequest());
    var result =
        mvc.perform(multipart("/api/v1/comments/images").file(file).with(anonymous()).with(csrf()))
            .andExpect(status().isCreated())
            .andReturn();
    var image = mapper.readTree(result.getResponse().getContentAsString()).path("data");
    String url = image.path("url").asText();
    long id = image.path("id").asLong();
    mvc.perform(get(url).with(anonymous())).andExpect(status().isOk());
    long postId = jdbc.queryForObject("SELECT MIN(id) FROM posts", Long.class);
    String comment = "![photo](" + url + ")";
    jdbc.update(
        "INSERT INTO comments(post_id,author,content,status) VALUES (?,?,?,'APPROVED')",
        postId,
        "photo-test",
        comment);
    try {
      mvc.perform(delete("/api/v1/admin/media/" + id).with(csrf()))
          .andExpect(status().isConflict());
    } finally {
      jdbc.update("DELETE FROM comments WHERE content=?", comment);
      mvc.perform(delete("/api/v1/admin/media/" + id).with(csrf())).andExpect(status().isOk());
    }
  }

  @Test
  void visitorPhotoUploadsAreRateLimited() throws Exception {
    String address = "photo-limit-" + java.util.UUID.randomUUID();
    for (int i = 0; i < 11; i++) {
      mvc.perform(
              multipart("/api/v1/comments/images")
                  .file(new MockMultipartFile("file", "bad.png", "image/png", "bad".getBytes()))
                  .with(anonymous())
                  .with(csrf())
                  .with(
                      request -> {
                        request.setRemoteAddr(address);
                        return request;
                      }))
          .andExpect(i < 10 ? status().isBadRequest() : status().isTooManyRequests());
    }
  }
}
