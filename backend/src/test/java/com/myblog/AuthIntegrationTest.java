package com.myblog;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myblog.auth.service.AdminBootstrap;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthIntegrationTest {
  @Autowired private MockMvc mvc;
  @Autowired private ObjectMapper mapper;
  @Autowired private JdbcTemplate jdbc;
  @Autowired private PasswordEncoder encoder;
  @Autowired private AdminBootstrap bootstrap;

  private static final String LOGIN =
      "{\"username\":\"test-admin\",\"password\":\"Test-Only-Password-2026\"}";

  @Test
  void adminApisRequireAuthenticationButPublicPostsRemainAccessible() throws Exception {
    mvc.perform(get("/api/v1/admin/dashboard"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    mvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/v1/posts")).andExpect(status().isOk());
  }

  @Test
  void csrfIsRequiredEvenForLogin() throws Exception {
    mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(LOGIN))
        .andExpect(status().isForbidden());
  }

  @Test
  void loginRotatesSessionAndLogoutRevokesAuthentication() throws Exception {
    var csrfResult = mvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andReturn();
    var token =
        mapper
            .readTree(csrfResult.getResponse().getContentAsString())
            .path("data")
            .path("token")
            .asText();
    var session = (MockHttpSession) csrfResult.getRequest().getSession();
    String initialId = session.getId();
    mvc.perform(
            post("/api/v1/auth/login")
                .session(session)
                .header("X-CSRF-TOKEN", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(LOGIN))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.displayName").value("憨Ant"))
        .andExpect(jsonPath("$.data.passwordHash").doesNotExist());
    assertNotEquals(initialId, session.getId());
    mvc.perform(get("/api/v1/admin/dashboard").session(session)).andExpect(status().isOk());
    mvc.perform(get("/api/v1/auth/me").session(session))
        .andExpect(jsonPath("$.data.username").value("test-admin"));
    mvc.perform(post("/api/v1/auth/logout").session(session)).andExpect(status().isForbidden());
    var fresh = mvc.perform(get("/api/v1/auth/csrf").session(session)).andReturn();
    var freshToken =
        mapper
            .readTree(fresh.getResponse().getContentAsString())
            .path("data")
            .path("token")
            .asText();
    assertNotEquals(token, freshToken);
    mvc.perform(post("/api/v1/auth/logout").session(session).header("X-CSRF-TOKEN", freshToken))
        .andExpect(status().isOk());
    assertTrue(session.isInvalid());
    mvc.perform(get("/api/v1/admin/dashboard")).andExpect(status().isUnauthorized());
  }

  @Test
  void wrongPasswordIsRejectedAndRepeatedFailuresAreThrottled() throws Exception {
    for (int attempt = 0; attempt < 5; attempt++) {
      mvc.perform(
              post("/api/v1/auth/login")
                  .with(csrf())
                  .with(
                      request -> {
                        request.setRemoteAddr("198.51.100.10");
                        return request;
                      })
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"username\":\"test-admin\",\"password\":\"wrong-password\"}"))
          .andExpect(status().isUnauthorized())
          .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }
    mvc.perform(
            post("/api/v1/auth/login")
                .with(csrf())
                .with(
                    request -> {
                      request.setRemoteAddr("198.51.100.10");
                      return request;
                    })
                .contentType(MediaType.APPLICATION_JSON)
                .content(LOGIN))
        .andExpect(status().isTooManyRequests());
  }

  @Test
  void passwordIsHashedAndRestartDoesNotReplaceAccount() throws Exception {
    String hash =
        jdbc.queryForObject(
            "SELECT password_hash FROM admin_users WHERE username = 'test-admin'", String.class);
    assertTrue(encoder.matches("Test-Only-Password-2026", hash));
    assertNotEquals("Test-Only-Password-2026", hash);
    bootstrap.run(new DefaultApplicationArguments());
    assertEquals(
        hash,
        jdbc.queryForObject(
            "SELECT password_hash FROM admin_users WHERE username = 'test-admin'", String.class));
    assertEquals(1L, jdbc.queryForObject("SELECT COUNT(*) FROM admin_users", Long.class));
  }
}
