package com.myblog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.myblog.media.repository.MediaRepository;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
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
class ShowcaseIntegrationTest {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper mapper;
  @Autowired JdbcTemplate jdbc;
  @Autowired MediaRepository media;

  private ObjectNode input(String section) throws Exception {
    var node =
        (ObjectNode)
            mapper.readTree(
                """
                {"title":"集成测试内容","summary":"测试摘要","content":"正文内容","cover":"","status":"",
                "technologies":[],"sourceUrl":"","demoUrl":"","images":[],"postIds":[],"publishedAt":"2026-01-01","sortOrder":0,"visible":true,"version":0}
                """);
    node.put(
        "status",
        section.equals("projects") ? "IN_PROGRESS" : section.equals("series") ? "ONGOING" : "");
    return node;
  }

  private long create(String section, ObjectNode input) throws Exception {
    return mapper
        .readTree(
            mvc.perform(
                    post("/api/v1/admin/" + section)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(input)))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString())
        .path("data")
        .path("id")
        .asLong();
  }

  @Test
  void visibilityFutureDatesAndSectionsAreIsolated() throws Exception {
    var hidden = input("projects");
    hidden.put("visible", false);
    long hiddenId = create("projects", hidden);
    var future = input("projects");
    future.put("publishedAt", LocalDate.now().plusYears(1).toString());
    long futureId = create("projects", future);
    long visibleId = create("projects", input("projects"));
    mvc.perform(get("/api/v1/projects").with(anonymous()))
        .andExpect(jsonPath("$.data.total").value(1))
        .andExpect(jsonPath("$.data.items[0].id").value(visibleId));
    mvc.perform(get("/api/v1/projects/" + hiddenId).with(anonymous()))
        .andExpect(status().isNotFound());
    mvc.perform(get("/api/v1/projects/" + futureId).with(anonymous()))
        .andExpect(status().isNotFound());
    mvc.perform(get("/api/v1/series/" + visibleId).with(anonymous()))
        .andExpect(status().isNotFound());
    mvc.perform(get("/api/v1/admin/projects")).andExpect(jsonPath("$.data.total").value(3));
    mvc.perform(get("/api/v1/projects").param("page", "0")).andExpect(status().isBadRequest());
    mvc.perform(get("/api/v1/projects").param("size", "51")).andExpect(status().isBadRequest());
  }

  private long insertPost(String slug, String state, LocalDate date) {
    long category = jdbc.queryForObject("SELECT MIN(id) FROM categories", Long.class);
    jdbc.update(
        "INSERT INTO posts(slug,title,excerpt,content,category_id,published_at,status) VALUES"
            + " (?,?,?,?,?,?,?)",
        slug,
        slug,
        "excerpt",
        "body",
        category,
        date,
        state);
    return jdbc.queryForObject("SELECT id FROM posts WHERE slug=?", Long.class, slug);
  }

  @Test
  void seriesKeepsReadingOrderAndNeverExposesPrivatePostMetadata() throws Exception {
    long first = insertPost("showcase-first", "PUBLISHED", LocalDate.of(2026, 1, 1));
    long second = insertPost("showcase-second", "PUBLISHED", LocalDate.of(2026, 1, 1));
    long draft = insertPost("showcase-private", "DRAFT", LocalDate.of(2026, 1, 1));
    long future = insertPost("showcase-future", "PUBLISHED", LocalDate.now().plusYears(1));
    var value = input("series");
    value.putArray("postIds").add(second).add(draft).add(first).add(future);
    long id = create("series", value);
    mvc.perform(get("/api/v1/series/" + id).with(anonymous()))
        .andExpect(jsonPath("$.data.posts.length()").value(2))
        .andExpect(jsonPath("$.data.posts[0].id").value(second))
        .andExpect(jsonPath("$.data.posts[1].id").value(first));
    mvc.perform(get("/api/v1/admin/series"))
        .andExpect(jsonPath("$.data.items[0].posts.length()").value(4));
    var xml =
        mvc.perform(get("/sitemap.xml").with(anonymous()))
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(xml)
        .contains("/series/" + id)
        .doesNotContain("/posts/showcase-private", "/posts/showcase-future");
  }

  @Test
  void staleUpdateRollsBackAndDeleteHonorsVersion() throws Exception {
    var value = input("projects");
    long id = create("projects", value);
    value.put("title", "第一次修改");
    mvc.perform(
            put("/api/v1/admin/projects/" + id)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(value.toString()))
        .andExpect(status().isOk());
    value.put("title", "不应该覆盖");
    mvc.perform(
            put("/api/v1/admin/projects/" + id)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(value.toString()))
        .andExpect(status().isConflict());
    mvc.perform(get("/api/v1/projects/" + id)).andExpect(jsonPath("$.data.title").value("第一次修改"));
    mvc.perform(delete("/api/v1/admin/projects/" + id).param("version", "0").with(csrf()))
        .andExpect(status().isConflict());
    mvc.perform(delete("/api/v1/admin/projects/" + id).param("version", "1").with(csrf()))
        .andExpect(status().isOk());
    mvc.perform(get("/api/v1/projects/" + id)).andExpect(status().isNotFound());
  }

  @Test
  void imagesRemainProtectedUntilReferencesAreRemoved() throws Exception {
    var value = input("moments");
    value.putArray("images").add("/api/v1/media/showcase-image.png");
    long id = create("moments", value);
    assertThat(media.used("/api/v1/media/showcase-image.png")).isTrue();
    mvc.perform(delete("/api/v1/admin/moments/" + id).param("version", "0").with(csrf()))
        .andExpect(status().isOk());
    assertThat(media.used("/api/v1/media/showcase-image.png")).isFalse();
    var project = input("projects");
    project.put("visible", false);
    project.put("cover", "/api/v1/media/showcase-cover.png");
    project.put("content", "![图片](/api/v1/media/showcase-body.png)");
    create("projects", project);
    assertThat(media.used("/api/v1/media/showcase-cover.png")).isTrue();
    assertThat(media.used("/api/v1/media/showcase-body.png")).isTrue();
  }

  @Test
  void writesRequireAdminCsrfAndValidatedContent() throws Exception {
    for (String section : new String[] {"projects", "series", "moments"}) {
      mvc.perform(get("/api/v1/admin/" + section).with(anonymous()))
          .andExpect(status().isUnauthorized());
      mvc.perform(
              post("/api/v1/admin/" + section)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(input(section).toString()))
          .andExpect(status().isForbidden());
    }
    var value = input("projects");
    value.put("sourceUrl", "javascript:alert(1)");
    mvc.perform(
            post("/api/v1/admin/projects")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(value.toString()))
        .andExpect(status().isBadRequest());
    value = input("moments");
    value.putArray("images").add("//example.com/image.png");
    mvc.perform(
            post("/api/v1/admin/moments")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(value.toString()))
        .andExpect(status().isBadRequest());
    value = input("series");
    value.putArray("postIds").add(999999999);
    mvc.perform(
            post("/api/v1/admin/series")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(value.toString()))
        .andExpect(status().isBadRequest());
    assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM showcase_entries", Long.class)).isZero();
  }

  @Test
  void paginationKeywordEscapingAndDeletionCascadeWork() throws Exception {
    var value = input("projects");
    value.put("title", "百分号%与下划线_");
    long id = create("projects", value);
    create("projects", input("projects"));
    mvc.perform(get("/api/v1/projects").param("keyword", "%"))
        .andExpect(jsonPath("$.data.total").value(1));
    mvc.perform(get("/api/v1/projects").param("page", "2").param("size", "1"))
        .andExpect(jsonPath("$.data.items.length()").value(1));
    mvc.perform(delete("/api/v1/admin/projects/" + id).param("version", "0").with(csrf()))
        .andExpect(status().isOk());
    assertThat(
            jdbc.queryForObject(
                "SELECT COUNT(*) FROM showcase_images WHERE entry_id=?", Long.class, id))
        .isZero();
  }
}
