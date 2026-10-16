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

@org.springframework.context.annotation.Import(TestDatabaseConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser(roles = "ADMIN")
@Transactional
class CommunityIntegrationTest {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper mapper;
  @Autowired JdbcTemplate jdbc;
  private final String address = "comment-test-" + UUID.randomUUID();

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
  void visitorCommentsPublishImmediatelyAndOnlyAdminCanDeleteWithCurrentVersion() throws Exception {
    String slug = fixture("PUBLISHED", LocalDate.now().minusDays(1));
    String body =
        mapper.writeValueAsString(
            Map.of("author", "Visitor", "email", "private@example.com", "content", "**hello**"));
    mvc.perform(
            post("/api/v1/posts/" + slug + "/comments")
                .with(anonymous())
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isAccepted());
    mvc.perform(get("/api/v1/posts/" + slug + "/comments").with(anonymous()))
        .andExpect(jsonPath("$.data.total").value(1))
        .andExpect(jsonPath("$.data.items[0].author").value("Visitor"))
        .andExpect(jsonPath("$.data.items[0].email").doesNotExist());
    long id =
        jdbc.queryForObject(
            "SELECT MAX(c.id) FROM comments c JOIN posts p ON p.id=c.post_id WHERE p.slug=?",
            Long.class,
            slug);
    // Historical moderation values no longer control visibility.
    jdbc.update("UPDATE comments SET status='REJECTED' WHERE id=?", id);
    mvc.perform(get("/api/v1/posts/" + slug + "/comments").with(anonymous()))
        .andExpect(jsonPath("$.data.total").value(1));
    mvc.perform(
            delete("/api/v1/admin/comments/" + id)
                .param("version", "0")
                .with(anonymous())
                .with(csrf()))
        .andExpect(status().isUnauthorized());
    mvc.perform(delete("/api/v1/admin/comments/" + id).param("version", "1").with(csrf()))
        .andExpect(status().isConflict());
    mvc.perform(delete("/api/v1/admin/comments/" + id).param("version", "0").with(csrf()))
        .andExpect(status().isOk());
    mvc.perform(get("/api/v1/posts/" + slug + "/comments").with(anonymous()))
        .andExpect(jsonPath("$.data.total").value(0));
  }

  @Test
  void commentsEnforceCsrfRateLimitAndPublicVisibility() throws Exception {
    String slug = fixture("PUBLISHED", LocalDate.now().minusDays(1));
    String body =
        "{\"author\":\"CommunityRateTest\",\"email\":\"visitor@example.com\",\"content\":\"hello\",\"website\":\"\"}";
    mvc.perform(
            post("/api/v1/posts/" + slug + "/comments")
                .with(anonymous())
                .with(
                    request -> {
                      request.setRemoteAddr(address);
                      return request;
                    })
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isForbidden());
    for (int i = 0; i < 5; i++)
      mvc.perform(
              post("/api/v1/posts/" + slug + "/comments")
                  .with(anonymous())
                  .with(
                      request -> {
                        request.setRemoteAddr(address);
                        return request;
                      })
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
                .with(
                    request -> {
                      request.setRemoteAddr(address);
                      return request;
                    })
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
                .with(anonymous())
                .with(
                    request -> {
                      request.setRemoteAddr(address);
                      return request;
                    })
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isBadRequest());
  }

  @Test
  void visitorIdentityStaysPrivateAndReplyTargetsMustBeOnSamePost() throws Exception {
    String slug = fixture("PUBLISHED", LocalDate.now().minusDays(1));
    String other = fixture("PUBLISHED", LocalDate.now().minusDays(1));
    var input = new HashMap<String, Object>();
    input.put("author", "  来访者  ");
    input.put("email", "PRIVATE@example.com");
    input.put("url", "https://example.com/visitor");
    input.put("content", "**你好** 😊");
    mvc.perform(
            post("/api/v1/posts/" + slug + "/comments")
                .with(anonymous())
                .with(
                    request -> {
                      request.setRemoteAddr(address);
                      return request;
                    })
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(input)))
        .andExpect(status().isAccepted());
    long id =
        jdbc.queryForObject(
            "SELECT MAX(c.id) FROM comments c JOIN posts p ON p.id=c.post_id WHERE p.slug=?",
            Long.class,
            slug);
    input.put("parentId", id);
    mvc.perform(
            get("/api/v1/posts/" + slug + "/comments")
                .with(anonymous())
                .with(
                    request -> {
                      request.setRemoteAddr(address);
                      return request;
                    }))
        .andExpect(jsonPath("$.data.items[0].author").value("来访者"))
        .andExpect(jsonPath("$.data.items[0].url").value("https://example.com/visitor"))
        .andExpect(jsonPath("$.data.items[0].email").doesNotExist())
        .andExpect(
            content()
                .string(
                    org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("private@example.com"))));
    mvc.perform(get("/api/v1/admin/comments").param("status", ""))
        .andExpect(content().string(org.hamcrest.Matchers.containsString("private@example.com")));
    mvc.perform(
            post("/api/v1/posts/" + other + "/comments")
                .with(anonymous())
                .with(
                    request -> {
                      request.setRemoteAddr(address);
                      return request;
                    })
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(input)))
        .andExpect(status().isBadRequest());
    mvc.perform(
            post("/api/v1/posts/" + slug + "/comments")
                .with(anonymous())
                .with(
                    request -> {
                      request.setRemoteAddr(address);
                      return request;
                    })
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(input)))
        .andExpect(status().isAccepted());
  }

  @Test
  void visitorCommentsValidateIdentityAndUrlsAndIgnoreBotFields() throws Exception {
    String slug = fixture("PUBLISHED", LocalDate.now().minusDays(1));
    Map<String, Object> valid =
        Map.of("author", "访客", "email", "visitor@example.com", "content", "hello");
    for (var invalid :
        List.of(
            Map.of("author", " "),
            Map.of("email", "not-email"),
            Map.of("url", "javascript:alert(1)"),
            Map.of("content", "x".repeat(501)))) {
      var input = new HashMap<String, Object>(valid);
      input.putAll(invalid);
      mvc.perform(
              post("/api/v1/posts/" + slug + "/comments")
                  .with(anonymous())
                  .with(
                      request -> {
                        request.setRemoteAddr(address);
                        return request;
                      })
                  .with(csrf())
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(mapper.writeValueAsString(input)))
          .andExpect(status().isBadRequest());
    }
    var bot = new HashMap<String, Object>(valid);
    bot.put("website", "https://spam.example.com");
    mvc.perform(
            post("/api/v1/posts/" + slug + "/comments")
                .with(anonymous())
                .with(
                    request -> {
                      request.setRemoteAddr(address);
                      return request;
                    })
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(bot)))
        .andExpect(status().isAccepted());
    assertEquals(
        0,
        jdbc.queryForObject(
            "SELECT COUNT(*) FROM comments c JOIN posts p ON p.id=c.post_id WHERE p.slug=?",
            Long.class,
            slug));
    mvc.perform(
            post("/api/v1/members/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/v1/members/session")).andExpect(status().isForbidden());
  }

  @Test
  void guestbookPublishesImmediatelyAndAdminCanDelete() throws Exception {
    String text = "新便签-" + UUID.randomUUID();
    mvc.perform(
            post("/api/v1/guestbook")
                .with(anonymous())
                .with(
                    request -> {
                      request.setRemoteAddr(address);
                      return request;
                    })
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("content", text, "color", "sky"))))
        .andExpect(status().isOk());
    long id =
        jdbc.queryForObject("SELECT id FROM guestbook_entries WHERE content=?", Long.class, text);
    mvc.perform(get("/api/v1/guestbook").with(anonymous()))
        .andExpect(content().string(org.hamcrest.Matchers.containsString(text)));
    mvc.perform(
            delete("/api/v1/admin/guestbook/" + id)
                .param("version", "0")
                .with(anonymous())
                .with(csrf()))
        .andExpect(status().isUnauthorized());
    mvc.perform(delete("/api/v1/admin/guestbook/" + id).param("version", "0").with(csrf()))
        .andExpect(status().isOk());
    mvc.perform(get("/api/v1/guestbook").with(anonymous()))
        .andExpect(
            content()
                .string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString(text))));
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
                  .with(
                      request -> {
                        request.setRemoteAddr(address);
                        return request;
                      })
                  .with(csrf()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data").value(1));
    mvc.perform(
            post("/api/v1/posts/" + slug + "/view")
                .session(new MockHttpSession())
                .with(anonymous())
                .with(
                    request -> {
                      request.setRemoteAddr(address);
                      return request;
                    })
                .with(csrf()))
        .andExpect(jsonPath("$.data").value(2));
    mvc.perform(get("/api/v1/admin/statistics")).andExpect(jsonPath("$.data.todayReads").value(2));
    String draft = fixture("DRAFT", LocalDate.now());
    mvc.perform(post("/api/v1/posts/" + draft + "/view").with(csrf()))
        .andExpect(status().isNotFound());
  }

  @Test
  void highlightsReturnNineLatestOrDistinctRandomNotesFromEntireWall() throws Exception {
    for (int i = 0; i < 35; i++) {
      jdbc.update(
          "INSERT INTO guestbook_entries(content,color,status) VALUES (?, 'sky', 'APPROVED')",
          "highlight-" + i);
    }
    long newest = jdbc.queryForObject("SELECT MAX(id) FROM guestbook_entries", Long.class);
    mvc.perform(get("/api/v1/guestbook/highlights").with(anonymous()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.length()").value(9))
        .andExpect(jsonPath("$.data[0].id").value(newest))
        .andExpect(jsonPath("$.data[8].id").value(newest - 8));
    var seen = new java.util.HashSet<Long>();
    for (int i = 0; i < 10; i++) {
      var result =
          mvc.perform(get("/api/v1/guestbook/highlights?mode=random").with(anonymous()))
              .andExpect(status().isOk())
              .andExpect(jsonPath("$.data.length()").value(9))
              .andReturn();
      var ids = new java.util.HashSet<Long>();
      for (var item : mapper.readTree(result.getResponse().getContentAsString()).path("data")) {
        ids.add(item.path("id").asLong());
      }
      assertEquals(9, ids.size());
      seen.addAll(ids);
    }
    assertTrue(seen.stream().anyMatch(id -> id <= newest - 20));
    mvc.perform(get("/api/v1/guestbook/highlights?mode=invalid").with(anonymous()))
        .andExpect(status().isBadRequest());
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
          mvc.perform(
                  get(path)
                      .with(anonymous())
                      .with(
                          request -> {
                            request.setRemoteAddr(address);
                            return request;
                          }))
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
