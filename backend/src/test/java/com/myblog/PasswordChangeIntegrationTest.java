package com.myblog;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@org.springframework.context.annotation.Import(TestDatabaseConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PasswordChangeIntegrationTest {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper mapper;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder encoder;

  MockHttpSession login(String name, String password) throws Exception {
    var result =
        mvc.perform(
                post("/api/v1/auth/login")
                    .with(csrf())
                    .contentType("application/json")
                    .content(
                        mapper.writeValueAsString(Map.of("username", name, "password", password))))
            .andExpect(status().isOk())
            .andReturn();
    return (MockHttpSession) result.getRequest().getSession();
  }

  @Test
  void passwordChangeRevokesEverySessionAndRequiresNewPassword() throws Exception {
    String name = "password-change-test";
    String oldPassword = "Original-Password-2026";
    String newPassword = "Updated-Password-2026";
    jdbc.update(
        "INSERT INTO admin_users(username,password_hash,display_name) VALUES(?,?,?)",
        name,
        encoder.encode(oldPassword),
        "密码测试");
    try {
      var first = login(name, oldPassword);
      var second = login(name, oldPassword);
      mvc.perform(
              post("/api/v1/auth/password")
                  .session(first)
                  .with(csrf())
                  .contentType("application/json")
                  .content(
                      mapper.writeValueAsString(
                          Map.of("currentPassword", "wrong", "newPassword", newPassword))))
          .andExpect(status().isBadRequest());
      mvc.perform(get("/api/v1/auth/me").session(second)).andExpect(status().isOk());
      mvc.perform(
              post("/api/v1/auth/password")
                  .session(first)
                  .with(csrf())
                  .contentType("application/json")
                  .content(
                      mapper.writeValueAsString(
                          Map.of("currentPassword", oldPassword, "newPassword", newPassword))))
          .andExpect(status().isOk());
      assertTrue(first.isInvalid());
      mvc.perform(get("/api/v1/auth/me").session(second)).andExpect(status().isUnauthorized());
      assertTrue(second.isInvalid());
      mvc.perform(
              post("/api/v1/auth/login")
                  .with(csrf())
                  .contentType("application/json")
                  .content(
                      mapper.writeValueAsString(Map.of("username", name, "password", oldPassword))))
          .andExpect(status().isUnauthorized());
      login(name, newPassword);
      assertTrue(
          encoder.matches(
              newPassword,
              jdbc.queryForObject(
                  "SELECT password_hash FROM admin_users WHERE username=?", String.class, name)));
    } finally {
      jdbc.update("DELETE FROM admin_users WHERE username=?", name);
    }
  }

  @Test
  void rejectsAnonymousMissingCsrfWeakAndOversizePasswords() throws Exception {
    String body =
        mapper.writeValueAsString(
            Map.of("currentPassword", "Test-Only-Password-2026", "newPassword", "中文密码".repeat(10)));
    mvc.perform(
            post("/api/v1/auth/password")
                .with(csrf())
                .contentType("application/json")
                .content(body))
        .andExpect(status().isUnauthorized());
    mvc.perform(
            post("/api/v1/auth/password")
                .with(user("test-admin").roles("ADMIN"))
                .contentType("application/json")
                .content(body))
        .andExpect(status().isForbidden());
    mvc.perform(
            post("/api/v1/auth/password")
                .with(user("test-admin").roles("ADMIN"))
                .with(csrf())
                .contentType("application/json")
                .content(body))
        .andExpect(status().isBadRequest());
    mvc.perform(
            post("/api/v1/auth/password")
                .with(user("test-admin").roles("ADMIN"))
                .with(csrf())
                .contentType("application/json")
                .content("{\"currentPassword\":\"test\",\"newPassword\":\"short\"}"))
        .andExpect(status().isBadRequest());
  }
}
