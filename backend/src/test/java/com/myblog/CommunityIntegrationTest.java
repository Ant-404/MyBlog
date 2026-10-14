package com.myblog;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser(roles = "ADMIN")
@Transactional
class CommunityIntegrationTest {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper mapper;
  @Autowired JdbcTemplate jdbc;

  private String fixture(String status, LocalDate date) {
    String slug = "community-test-" + UUID.randomUUID();
    long category = jdbc.queryForObject("SELECT MIN(id) FROM categories", Long.class);
    jdbc.update(
        "INSERT INTO posts(slug,title,excerpt,content,category_id,published_at,status) VALUES"
            + " (?,?,?,?,?,?,?)",
        slug,
        "Community < & test",
        "escaped < excerpt",
        "## content",
        category,
        date,
        status);
    return slug;
  }

  @Test
  void pendingCommentsRequireApprovalAndVersionChecks() throws Exception {
    String slug = fixture("PUBLISHED", LocalDate.now().minusDays(1));
    String body =
        "{\"author\":\"CommunityTest\",\"content\":\"<script>plain"
            + " text</script>\",\"website\":\"\"}";
    mvc.perform(
            post("/api/v1/posts/" + slug + "/comments")
                .with(anonymous())
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isAccepted());
    mvc.perform(get("/api/v1/posts/" + slug + "/comments").with(anonymous()))
        .andExpect(jsonPath("$.data.total").value(0));
    long id =
        jdbc.queryForObject(
            "SELECT c.id FROM comments c JOIN posts p ON p.id=c.post_id WHERE p.slug=?",
            Long.class,
            slug);
    mvc.perform(
            patch("/api/v1/admin/comments/" + id)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"APPROVED\",\"version\":0}"))
        .andExpect(status().isOk());
    mvc.perform(get("/api/v1/posts/" + slug + "/comments").with(anonymous()))
        .andExpect(jsonPath("$.data.total").value(1))
        .andExpect(jsonPath("$.data.items[0].content").value("<script>plain text</script>"));
    mvc.perform(delete("/api/v1/admin/comments/" + id).param("version", "0").with(csrf()))
        .andExpect(status().isConflict());
    mvc.perform(
            patch("/api/v1/admin/comments/" + id)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"REJECTED\",\"version\":1}"))
        .andExpect(status().isOk());
    mvc.perform(get("/api/v1/posts/" + slug + "/comments"))
        .andExpect(jsonPath("$.data.total").value(0));
    mvc.perform(delete("/api/v1/admin/comments/" + id).param("version", "2").with(csrf()))
        .andExpect(status().isOk());
  }

  @Test
  void commentsEnforceCsrfRateLimitAndPublicVisibility() throws Exception {
    String slug = fixture("PUBLISHED", LocalDate.now().minusDays(1));
    String body = "{\"author\":\"CommunityRateTest\",\"content\":\"hello\",\"website\":\"\"}";
    mvc.perform(
            post("/api/v1/posts/" + slug + "/comments")
                .with(anonymous())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isForbidden());
    for (int i = 0; i < 5; i++)
      mvc.perform(
              post("/api/v1/posts/" + slug + "/comments")
                  .with(anonymous())
                  .with(csrf())
                  .with(
                      request -> {
                        request.setRemoteAddr("127.0.0.50");
                        return request;
                      })
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(body))
          .andExpect(status().isAccepted());
    mvc.perform(
            post("/api/v1/posts/" + slug + "/comments")
                .with(anonymous())
                .with(csrf())
                .with(
                    request -> {
                      request.setRemoteAddr("127.0.0.50");
                      return request;
                    })
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isTooManyRequests());
    String draft = fixture("DRAFT", LocalDate.now());
    mvc.perform(get("/api/v1/posts/" + draft + "/comments")).andExpect(status().isNotFound());
    jdbc.update("UPDATE site_settings SET comments_enabled=false WHERE id=1");
    mvc.perform(
            post("/api/v1/posts/" + slug + "/comments")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isBadRequest());
  }

  @Test
  void readingCountsDeduplicateWithinSessionAndRejectDrafts() throws Exception {
    String slug = fixture("PUBLISHED", LocalDate.now());
    var session = new MockHttpSession();
    for (int i = 0; i < 2; i++)
      mvc.perform(
              post("/api/v1/posts/" + slug + "/view")
                  .session(session)
                  .with(anonymous())
                  .with(csrf()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data").value(1));
    mvc.perform(
            post("/api/v1/posts/" + slug + "/view")
                .session(new MockHttpSession())
                .with(anonymous())
                .with(csrf()))
        .andExpect(jsonPath("$.data").value(2));
    mvc.perform(get("/api/v1/admin/statistics")).andExpect(jsonPath("$.data.todayReads").value(2));
    String draft = fixture("DRAFT", LocalDate.now());
    mvc.perform(post("/api/v1/posts/" + draft + "/view").with(csrf()))
        .andExpect(status().isNotFound());
  }

  @Test
  void feedsAreValidXmlAndContainOnlyPublicPages() throws Exception {
    String published = fixture("PUBLISHED", LocalDate.now().minusDays(1)),
        draft = fixture("DRAFT", LocalDate.now()),
        future = fixture("PUBLISHED", LocalDate.now().plusDays(3));
    var factory = javax.xml.parsers.DocumentBuilderFactory.newInstance();
    factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
    for (String path : List.of("/rss.xml", "/sitemap.xml")) {
      String xml =
          mvc.perform(get(path).with(anonymous()))
              .andExpect(status().isOk())
              .andReturn()
              .getResponse()
              .getContentAsString();
      assertNotNull(
          factory
              .newDocumentBuilder()
              .parse(
                  new java.io.ByteArrayInputStream(
                      xml.getBytes(java.nio.charset.StandardCharsets.UTF_8))));
      assertTrue(xml.contains(published));
      assertFalse(xml.contains(draft));
      assertFalse(xml.contains(future));
      assertFalse(xml.contains("/admin"));
    }
    mvc.perform(get("/api/v1/posts/" + draft + "/neighbors")).andExpect(status().isNotFound());
    String neighbors =
        mvc.perform(get("/api/v1/posts/" + published + "/neighbors"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertFalse(neighbors.contains(draft));
    assertFalse(neighbors.contains(future));
  }
}
