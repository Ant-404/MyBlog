package com.myblog;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
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
class DashboardIntegrationTest {
  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;

  @Test
  void overviewIncludesHiddenContentAndCountsDraftsAndScheduledPostsSeparately() throws Exception {
    jdbc.update("INSERT INTO albums(title,visible) VALUES ('Hidden album',FALSE)");
    long id = jdbc.queryForObject("SELECT id FROM albums WHERE title='Hidden album'", Long.class);
    jdbc.update(
        "INSERT INTO album_photos(album_id,url,caption) VALUES (?, '/images/test.png','test')", id);
    jdbc.update("UPDATE posts SET status='DRAFT' WHERE id=(SELECT MIN(p.id) FROM posts p)");
    jdbc.update(
        "UPDATE posts SET published_at=DATE '2099-01-01' WHERE id=(SELECT MAX(p.id) FROM posts p)");
    mvc.perform(get("/api/v1/admin/dashboard"))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.data.posts")
                .value(
                    jdbc.queryForObject(
                        "SELECT COUNT(*) FROM posts WHERE status='PUBLISHED' AND"
                            + " published_at<=CURRENT_DATE",
                        Integer.class)))
        .andExpect(jsonPath("$.data.drafts").value(1))
        .andExpect(jsonPath("$.data.scheduled").value(1))
        .andExpect(jsonPath("$.data.albums").value(1))
        .andExpect(jsonPath("$.data.photos").value(1))
        .andExpect(
            jsonPath("$.data.categories")
                .value(jdbc.queryForObject("SELECT COUNT(*) FROM categories", Integer.class)))
        .andExpect(
            jsonPath("$.data.tags")
                .value(jdbc.queryForObject("SELECT COUNT(*) FROM tags", Integer.class)))
        .andExpect(jsonPath("$.data.comments").isNumber())
        .andExpect(jsonPath("$.data.notes").isNumber())
        .andExpect(jsonPath("$.data.media").isNumber());
    mvc.perform(get("/api/v1/admin/dashboard").with(anonymous()))
        .andExpect(status().isUnauthorized());
  }
}
