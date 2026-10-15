package com.myblog;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
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
class ManagementIntegrationTest {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper mapper;

  @Test
  void taxonomyRenameConflictAndUsedDeletionProtection() throws Exception {
    var name = "ManagementTestCategory";
    mvc.perform(
            post("/api/v1/admin/taxonomy/categories")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"" + name + "\",\"version\":0}"))
        .andExpect(status().isOk());
    var rows =
        mapper
            .readTree(
                mvc.perform(get("/api/v1/admin/taxonomy/categories"))
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data");
    long id = 0, usedId = 0;
    for (var row : rows) {
      if (row.path("name").asText().equals(name)) id = row.path("id").asLong();
      if (row.path("count").asLong() > 0) usedId = row.path("id").asLong();
    }
    mvc.perform(
            put("/api/v1/admin/taxonomy/categories/" + id)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"ManagementTestRenamed\",\"version\":0}"))
        .andExpect(status().isOk());
    mvc.perform(
            delete("/api/v1/admin/taxonomy/categories/" + id).param("version", "0").with(csrf()))
        .andExpect(status().isConflict());
    mvc.perform(
            delete("/api/v1/admin/taxonomy/categories/" + id).param("version", "1").with(csrf()))
        .andExpect(status().isOk());
    mvc.perform(
            delete("/api/v1/admin/taxonomy/categories/" + usedId)
                .param("version", "0")
                .with(csrf()))
        .andExpect(status().isConflict());
    mvc.perform(get("/api/v1/admin/taxonomy/not-a-table")).andExpect(status().isBadRequest());
  }

  @Test
  void hiddenFriendsAndUnsafeAddresses() throws Exception {
    String value =
        "{\"name\":\"ManagementTestFriend\",\"description\":\"hidden\",\"url\":\"https://example.com\",\"sortOrder\":0,\"visible\":false,\"version\":0}";
    mvc.perform(
            post("/api/v1/admin/friends")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(value))
        .andExpect(status().isOk());
    mvc.perform(get("/api/v1/friends"))
        .andExpect(
            content()
                .string(
                    org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("ManagementTestFriend"))));
    mvc.perform(
            post("/api/v1/admin/friends")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(value.replace("https://example.com", "javascript:alert(1)")))
        .andExpect(status().isBadRequest());
  }

  @Test
  void settingsVersionAndPublicUpdate() throws Exception {
    var value =
        mapper
            .readTree(
                mvc.perform(get("/api/v1/admin/settings"))
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data");
    ((com.fasterxml.jackson.databind.node.ObjectNode) value)
        .put("subtitle", "ManagementTestSubtitle");
    mvc.perform(
            put("/api/v1/admin/settings")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(value.toString()))
        .andExpect(status().isOk());
    mvc.perform(get("/api/v1/site/settings"))
        .andExpect(jsonPath("$.data.subtitle").value("ManagementTestSubtitle"));
    mvc.perform(
            put("/api/v1/admin/settings")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(value.toString()))
        .andExpect(status().isConflict());
  }
}
