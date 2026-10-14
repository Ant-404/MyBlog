package com.myblog;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class BlogApiIntegrationTest {
  @Autowired private MockMvc mvc;
  @Autowired private JdbcTemplate jdbc;

  @Test
  void listsPostsWithStablePaginationAndWithoutFullContent() throws Exception {
    mvc.perform(get("/api/v1/posts"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.total").value(6))
        .andExpect(jsonPath("$.data.items.length()").value(4))
        .andExpect(jsonPath("$.data.items[0].slug").value("hello-world"))
        .andExpect(jsonPath("$.data.items[0].content").doesNotExist());
    mvc.perform(get("/api/v1/posts").param("page", "2"))
        .andExpect(jsonPath("$.data.items.length()").value(2))
        .andExpect(jsonPath("$.data.items[0].slug").value("quiet-weekend"));
  }

  @Test
  void filtersCategoryTagAndFullContentKeyword() throws Exception {
    mvc.perform(get("/api/v1/posts").param("category", "技术"))
        .andExpect(jsonPath("$.data.total").value(3));
    mvc.perform(get("/api/v1/posts").param("tag", "React"))
        .andExpect(jsonPath("$.data.total").value(1))
        .andExpect(jsonPath("$.data.items[0].slug").value("react-component-design"));
    mvc.perform(get("/api/v1/posts").param("keyword", "B-tree"))
        .andExpect(jsonPath("$.data.total").value(1));
  }

  @Test
  void treatsSqlAndLikeMetacharactersAsLiteralSearchText() throws Exception {
    mvc.perform(get("/api/v1/posts").param("keyword", "' OR 1=1 --"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.total").value(0));
    mvc.perform(get("/api/v1/posts").param("keyword", "_"))
        .andExpect(jsonPath("$.data.total").value(1));
  }

  @Test
  void returnsMarkdownDetailAndMissingResourceStatus() throws Exception {
    mvc.perform(get("/api/v1/posts/hello-world"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.content").isString())
        .andExpect(jsonPath("$.data.tags.length()").value(2));
    mvc.perform(get("/api/v1/posts/does-not-exist"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  @Test
  void rejectsInvalidPageAndSize() throws Exception {
    mvc.perform(get("/api/v1/posts").param("page", "0")).andExpect(status().isBadRequest());
    mvc.perform(get("/api/v1/posts").param("size", "101")).andExpect(status().isBadRequest());
    mvc.perform(get("/api/v1/posts").param("page", "abc")).andExpect(status().isBadRequest());
  }

  @Test
  void exposesArchivesTaxonomyFriendsAndStats() throws Exception {
    mvc.perform(get("/api/v1/archives")).andExpect(jsonPath("$.data.length()").value(6));
    mvc.perform(get("/api/v1/categories")).andExpect(jsonPath("$.data.length()").value(3));
    mvc.perform(get("/api/v1/tags")).andExpect(jsonPath("$.data.length()").value(9));
    mvc.perform(get("/api/v1/friends")).andExpect(jsonPath("$.data.length()").value(3));
    mvc.perform(get("/api/v1/site/stats"))
        .andExpect(jsonPath("$.data.posts").value(6))
        .andExpect(jsonPath("$.data.categories").value(3))
        .andExpect(jsonPath("$.data.tags").value(9));
  }

  @Test
  void hidesDraftsAndFuturePublicationsFromAllPublicViews() throws Exception {
    jdbc.update("UPDATE posts SET status = 'DRAFT' WHERE id = 1");
    jdbc.update("UPDATE posts SET published_at = '2099-01-01' WHERE id = 4");
    mvc.perform(get("/api/v1/posts")).andExpect(jsonPath("$.data.total").value(4));
    mvc.perform(get("/api/v1/posts/hello-world")).andExpect(status().isNotFound());
    mvc.perform(get("/api/v1/posts/react-component-design")).andExpect(status().isNotFound());
    mvc.perform(get("/api/v1/archives")).andExpect(jsonPath("$.data.length()").value(4));
    mvc.perform(get("/api/v1/tags")).andExpect(jsonPath("$.data.length()").value(6));
    mvc.perform(get("/api/v1/site/stats")).andExpect(jsonPath("$.data.posts").value(4));
  }
}
