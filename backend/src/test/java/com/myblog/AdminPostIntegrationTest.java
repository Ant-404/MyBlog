package com.myblog;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.anonymous;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser(username = "test-admin", roles = "ADMIN")
class AdminPostIntegrationTest {
  @Autowired private MockMvc mvc;
  @Autowired private ObjectMapper mapper;
  @Autowired private JdbcTemplate jdbc;

  @AfterEach
  void cleanOwnFixtures() {
    jdbc.update("DELETE FROM posts WHERE slug LIKE 'admin-test-%'");
    jdbc.update("DELETE FROM tags WHERE name LIKE 'AdminTest%'");
    jdbc.update("DELETE FROM categories WHERE name LIKE 'AdminTest%'");
  }

  private Map<String, Object> input() {
    var value = new LinkedHashMap<String, Object>();
    value.put("title", "AdminTest article");
    value.put("slug", "admin-test-" + UUID.randomUUID());
    value.put("excerpt", "AdminTest excerpt");
    value.put("content", "## AdminTest content");
    value.put("cover", "/images/landscape.svg");
    value.put("category", "AdminTestCategory");
    value.put("tags", List.of("AdminTestTag", "AdminTestTag"));
    value.put("publishedAt", LocalDate.now().toString());
    value.put("readingMinutes", 2);
    value.put("pinned", false);
    value.put("status", "DRAFT");
    value.put("version", 0);
    return value;
  }

  private JsonNode create(Map<String, Object> input) throws Exception {
    var result =
        mvc.perform(
                post("/api/v1/admin/posts")
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(mapper.writeValueAsString(input)))
            .andExpect(status().isCreated())
            .andReturn();
    return mapper.readTree(result.getResponse().getContentAsString()).path("data");
  }

  @Test
  void draftPublishPinAndDeleteUpdatePublicVisibility() throws Exception {
    var input = input();
    var created = create(input);
    long id = created.path("id").asLong();
    String slug = input.get("slug").toString();
    mvc.perform(get("/api/v1/posts/" + slug)).andExpect(status().isNotFound());
    mvc.perform(get("/api/v1/admin/posts").param("status", "DRAFT").param("keyword", "AdminTest"))
        .andExpect(jsonPath("$.data.total").value(1))
        .andExpect(jsonPath("$.data.items[0].content").doesNotExist());
    mvc.perform(
            patch("/api/v1/admin/posts/" + id + "/state")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"PUBLISHED\",\"pinned\":true,\"version\":0}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.version").value(1));
    mvc.perform(get("/api/v1/posts/" + slug))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.tags.length()").value(1));
    mvc.perform(delete("/api/v1/admin/posts/" + id).param("version", "1").with(csrf()))
        .andExpect(status().isOk());
    mvc.perform(get("/api/v1/posts/" + slug)).andExpect(status().isNotFound());
    assertEquals(
        0L,
        jdbc.queryForObject("SELECT COUNT(*) FROM post_tags WHERE post_id = ?", Long.class, id));
  }

  @Test
  void editReplacesTagsAndRejectsStaleWritesAndDeletes() throws Exception {
    var input = input();
    var created = create(input);
    long id = created.path("id").asLong();
    input.put("title", "AdminTest updated");
    input.put("tags", List.of("AdminTestOtherTag"));
    mvc.perform(
            put("/api/v1/admin/posts/" + id)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(input)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.version").value(1));
    input.put("title", "AdminTest stale write");
    mvc.perform(
            put("/api/v1/admin/posts/" + id)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(input)))
        .andExpect(status().isConflict());
    mvc.perform(delete("/api/v1/admin/posts/" + id).with(csrf()).param("version", "0"))
        .andExpect(status().isConflict());
    mvc.perform(get("/api/v1/admin/posts/" + id))
        .andExpect(jsonPath("$.data.title").value("AdminTest updated"))
        .andExpect(jsonPath("$.data.tags[0]").value("AdminTestOtherTag"));
  }

  @Test
  void duplicateSlugRollsBackNewCategory() throws Exception {
    var input = input();
    create(input);
    input.put("category", "AdminTestRollback");
    mvc.perform(
            post("/api/v1/admin/posts")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(input)))
        .andExpect(status().isConflict());
    assertEquals(
        0L,
        jdbc.queryForObject(
            "SELECT COUNT(*) FROM categories WHERE name = 'AdminTestRollback'", Long.class));
  }

  @Test
  void allowsEmptyDraftButRequiresContentToPublish() throws Exception {
    var input = input();
    input.put("content", "");
    long id = create(input).path("id").asLong();
    mvc.perform(
            patch("/api/v1/admin/posts/" + id + "/state")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"PUBLISHED\",\"pinned\":false,\"version\":0}"))
        .andExpect(status().isBadRequest());
    input.put("slug", "admin-test-empty-published");
    input.put("status", "PUBLISHED");
    mvc.perform(
            post("/api/v1/admin/posts")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(input)))
        .andExpect(status().isBadRequest());
  }

  @Test
  void futurePublicationIsVisibleOnlyToAdmin() throws Exception {
    var input = input();
    input.put("status", "PUBLISHED");
    input.put("publishedAt", "2099-01-01");
    var post = create(input);
    mvc.perform(get("/api/v1/admin/posts/" + post.path("id").asLong())).andExpect(status().isOk());
    mvc.perform(get("/api/v1/posts/" + input.get("slug"))).andExpect(status().isNotFound());
  }

  @Test
  void rejectsInvalidSlugCoverAndUnauthorizedOrUnprotectedWrites() throws Exception {
    var input = input();
    input.put("slug", "INVALID SLUG");
    mvc.perform(
            post("/api/v1/admin/posts")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(input)))
        .andExpect(status().isBadRequest());
    input.put("slug", "admin-test-invalid-cover");
    input.put("cover", "javascript:alert(1)");
    mvc.perform(
            post("/api/v1/admin/posts")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(input)))
        .andExpect(status().isBadRequest());
    mvc.perform(get("/api/v1/admin/posts").with(anonymous())).andExpect(status().isUnauthorized());
    mvc.perform(
            post("/api/v1/admin/posts")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(input)))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/v1/admin/posts/9999999")).andExpect(status().isNotFound());
    mvc.perform(
            post("/api/v1/admin/posts")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{invalid-json"))
        .andExpect(status().isBadRequest());
  }
}
