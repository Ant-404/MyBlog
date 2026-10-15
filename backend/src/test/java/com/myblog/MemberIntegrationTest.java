package com.myblog;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myblog.member.dto.MemberModels.Identity;
import com.myblog.member.service.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.*;
import org.springframework.transaction.annotation.Transactional;

@org.springframework.context.annotation.Import(TestDatabaseConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class MemberIntegrationTest {
  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired ObjectMapper mapper;
  @Autowired PasswordEncoder encoder;
  @MockitoBean AccountMailer mailer;
  private static final String PASSWORD = "Member-Test-Password-2026";
  private String address;

  @BeforeEach
  void setup() {
    when(mailer.enabled()).thenReturn(true);
    address = "test-" + UUID.randomUUID();
  }

  private MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder request, Object input)
      throws Exception {
    return request
        .with(csrf())
        .with(
            r -> {
              r.setRemoteAddr(address);
              return r;
            })
        .contentType(MediaType.APPLICATION_JSON)
        .content(mapper.writeValueAsString(input));
  }

  private long member(String name) {
    String email = UUID.randomUUID() + "@example.com";
    jdbc.update(
        "INSERT INTO members(email,password_hash,nickname) VALUES (?,?,?)",
        email,
        encoder.encode(PASSWORD),
        name);
    return jdbc.queryForObject("SELECT id FROM members WHERE email=?", Long.class, email);
  }

  private RequestPostProcessor as(long id) {
    return authentication(
        UsernamePasswordAuthenticationToken.authenticated(
            new Identity(id, 0), null, List.of(new SimpleGrantedAuthority("ROLE_MEMBER"))));
  }

  private String email(long id) {
    return jdbc.queryForObject("SELECT email FROM members WHERE id=?", String.class, id);
  }

  private String token(String email, String purpose, boolean expired) {
    String token = UUID.randomUUID().toString();
    jdbc.update(
        "INSERT INTO member_tokens(token_hash,email,purpose,expires_at) VALUES (?,?,?,?)",
        MemberService.hash(token),
        email,
        purpose,
        java.sql.Timestamp.from(Instant.now().plusSeconds(expired ? -60 : 600)));
    return token;
  }

  private long comment(long member, String status, Long parent) {
    long post =
        jdbc.queryForObject(
            "SELECT MIN(id) FROM posts WHERE status='PUBLISHED' AND published_at<=CURRENT_DATE",
            Long.class);
    jdbc.update(
        "INSERT INTO comments(post_id,member_id,author,content,status,parent_id) VALUES"
            + " (?,?,'snapshot','member text',?,?)",
        post,
        member,
        status,
        parent);
    return jdbc.queryForObject(
        "SELECT MAX(id) FROM comments WHERE member_id=?", Long.class, member);
  }

  @Test
  void verifiedRegistrationUsesHashedSingleUseEmailBoundTokens() throws Exception {
    String email = UUID.randomUUID() + "@example.com";
    mvc.perform(json(post("/api/v1/members/email"), Map.of("email", email, "purpose", "REGISTER")))
        .andExpect(status().isOk());
    var link = ArgumentCaptor.forClass(String.class);
    verify(mailer).send(eq(email), eq("REGISTER"), link.capture());
    String raw = link.getValue().substring(link.getValue().indexOf("&token=") + 7);
    assertEquals(
        1,
        jdbc.queryForObject(
            "SELECT COUNT(*) FROM member_tokens WHERE token_hash=?",
            Integer.class,
            MemberService.hash(raw)));
    assertEquals(
        0,
        jdbc.queryForObject(
            "SELECT COUNT(*) FROM member_tokens WHERE token_hash=?", Integer.class, raw));
    var request = Map.of("email", email, "token", raw, "nickname", "新用户", "password", PASSWORD);
    mvc.perform(json(post("/api/v1/members/register"), request))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.nickname").value("新用户"))
        .andExpect(jsonPath("$.data.passwordHash").doesNotExist());
    String hash =
        jdbc.queryForObject("SELECT password_hash FROM members WHERE email=?", String.class, email);
    assertNotEquals(PASSWORD, hash);
    assertTrue(encoder.matches(PASSWORD, hash));
    mvc.perform(json(post("/api/v1/members/register"), request)).andExpect(status().isBadRequest());
    mvc.perform(
            json(
                post("/api/v1/members/register"),
                Map.of(
                    "email",
                    "different@example.com",
                    "token",
                    raw,
                    "nickname",
                    "冒名",
                    "password",
                    PASSWORD)))
        .andExpect(status().isBadRequest());
  }

  @Test
  @Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
  void expiredTokensAndFailedDeliveryNeverCreateAccounts() throws Exception {
    String email = UUID.randomUUID() + "@example.com";
    String raw = token(email, "REGISTER", true);
    mvc.perform(
            json(
                post("/api/v1/members/register"),
                Map.of("email", email, "token", raw, "nickname", "过期", "password", PASSWORD)))
        .andExpect(status().isBadRequest());
    doThrow(new com.myblog.common.exception.InvalidInputException("邮件失败"))
        .when(mailer)
        .send(anyString(), anyString(), anyString());
    String failed = UUID.randomUUID() + "@example.com";
    mvc.perform(json(post("/api/v1/members/email"), Map.of("email", failed, "purpose", "REGISTER")))
        .andExpect(status().isBadRequest());
    assertEquals(
        0,
        jdbc.queryForObject(
            "SELECT COUNT(*) FROM member_tokens WHERE email=?", Integer.class, failed));
    mvc.perform(post("/api/v1/members/login").contentType(MediaType.APPLICATION_JSON).content("{}"))
        .andExpect(status().isForbidden());
    jdbc.update("DELETE FROM member_tokens WHERE email=?", email);
  }

  @Test
  void sessionsRotateAndNeverGrantAdministratorPrivileges() throws Exception {
    long id = member("普通用户");
    var session = new MockHttpSession();
    String old = session.getId();
    mvc.perform(
            json(
                post("/api/v1/members/login").session(session),
                Map.of("email", email(id), "password", PASSWORD)))
        .andExpect(status().isOk());
    assertNotEquals(old, session.getId());
    mvc.perform(get("/api/v1/members/me").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.id").value(id));
    mvc.perform(get("/api/v1/admin/members").session(session)).andExpect(status().isForbidden());
    mvc.perform(get("/api/v1/auth/me").session(session)).andExpect(status().isForbidden());
    mvc.perform(
            json(
                post("/api/v1/members/login"),
                Map.of("email", email(id), "password", "wrong-password")))
        .andExpect(status().isUnauthorized());
    mvc.perform(json(post("/api/v1/auth/logout").session(session), Map.of()))
        .andExpect(status().isOk());
    assertTrue(session.isInvalid());
  }

  @Test
  void passwordResetRevokesOldSessionsAndTokens() throws Exception {
    long id = member("找回账号");
    String email = email(id), raw = token(email, "RESET", false);
    var session = new MockHttpSession();
    mvc.perform(
            json(
                post("/api/v1/members/login").session(session),
                Map.of("email", email, "password", PASSWORD)))
        .andExpect(status().isOk());
    mvc.perform(
            json(
                post("/api/v1/members/reset"),
                Map.of("email", email, "token", raw, "password", "New-Password-2026")))
        .andExpect(status().isOk());
    mvc.perform(get("/api/v1/members/me").session(session)).andExpect(status().isUnauthorized());
    mvc.perform(
            json(
                post("/api/v1/members/reset"),
                Map.of("email", email, "token", raw, "password", PASSWORD)))
        .andExpect(status().isBadRequest());
    mvc.perform(json(post("/api/v1/members/login"), Map.of("email", email, "password", PASSWORD)))
        .andExpect(status().isUnauthorized());
    mvc.perform(
            json(
                post("/api/v1/members/login"),
                Map.of("email", email, "password", "New-Password-2026")))
        .andExpect(status().isOk());
    String unknown = UUID.randomUUID() + "@example.com";
    mvc.perform(json(post("/api/v1/members/email"), Map.of("email", unknown, "purpose", "RESET")))
        .andExpect(status().isOk());
    verify(mailer, never()).send(eq(unknown), anyString(), anyString());
  }

  @Test
  void commentsUseServerIdentityAndOwnershipProtectsDelete() throws Exception {
    long a = member("真实昵称"), b = member("其他用户");
    String slug = jdbc.queryForObject("SELECT slug FROM posts WHERE id=1", String.class);
    mvc.perform(json(post("/api/v1/posts/" + slug + "/comments"), Map.of("content", "hello")))
        .andExpect(status().isUnauthorized());
    mvc.perform(
            json(
                post("/api/v1/posts/" + slug + "/comments").with(as(a)),
                Map.of("author", "冒用博主", "content", "hello")))
        .andExpect(status().isAccepted());
    long id = jdbc.queryForObject("SELECT MAX(id) FROM comments WHERE member_id=?", Long.class, a);
    assertEquals(
        "真实昵称", jdbc.queryForObject("SELECT author FROM comments WHERE id=?", String.class, id));
    mvc.perform(get("/api/v1/posts/" + slug + "/comments"))
        .andExpect(jsonPath("$.data.total").value(0));
    mvc.perform(
            json(
                delete("/api/v1/members/comments/" + id).param("version", "0").with(as(b)),
                Map.of()))
        .andExpect(status().isConflict());
    mvc.perform(
            json(
                delete("/api/v1/members/comments/" + id).param("version", "0").with(as(a)),
                Map.of()))
        .andExpect(status().isOk());
  }

  @Test
  void replyNotificationRequiresApprovalAndReportsArePrivate() throws Exception {
    long a = member("原评论"), b = member("回复者");
    long parent = comment(a, "APPROVED", null), reply = comment(b, "PENDING", parent);
    mvc.perform(get("/api/v1/members/notifications").with(as(a)))
        .andExpect(jsonPath("$.data.total").value(0));
    mvc.perform(
            json(
                patch("/api/v1/admin/comments/" + reply).with(user("admin").roles("ADMIN")),
                Map.of("status", "APPROVED", "version", 0)))
        .andExpect(status().isOk());
    mvc.perform(get("/api/v1/members/notifications").with(as(a)))
        .andExpect(jsonPath("$.data.total").value(1));
    mvc.perform(get("/api/v1/members/notifications").with(as(b)))
        .andExpect(jsonPath("$.data.total").value(0));
    mvc.perform(
            json(
                post("/api/v1/comments/" + reply + "/reports").with(as(a)),
                Map.of("reason", "请核查")))
        .andExpect(status().isOk());
    mvc.perform(
            json(
                post("/api/v1/comments/" + reply + "/reports").with(as(a)),
                Map.of("reason", "重复举报")))
        .andExpect(status().isConflict());
    mvc.perform(get("/api/v1/admin/reports").with(as(a))).andExpect(status().isForbidden());
    String response =
        mvc.perform(get("/api/v1/posts/hello-world/comments"))
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertFalse(response.contains("email"));
    assertFalse(response.contains("password"));
    assertTrue(response.contains("replyTo"));
    jdbc.update(
        "UPDATE posts SET status='DRAFT' WHERE id=(SELECT post_id FROM comments WHERE id=?)",
        reply);
    mvc.perform(get("/api/v1/members/notifications").with(as(a)))
        .andExpect(jsonPath("$.data.total").value(0));
  }

  @Test
  void moderationRevokesSessionsAndMutedUsersCannotPublish() throws Exception {
    long id = member("待禁言用户");
    mvc.perform(
            json(
                patch("/api/v1/admin/members/" + id).with(user("admin").roles("ADMIN")),
                Map.of("status", "MUTED", "version", 0)))
        .andExpect(status().isOk());
    mvc.perform(get("/api/v1/members/me").with(as(id))).andExpect(status().isUnauthorized());
    var session = new MockHttpSession();
    mvc.perform(
            json(
                post("/api/v1/members/login").session(session),
                Map.of("email", email(id), "password", PASSWORD)))
        .andExpect(status().isOk());
    mvc.perform(
            json(
                post("/api/v1/guestbook").session(session),
                Map.of("content", "不允许发布", "color", "mint")))
        .andExpect(status().isBadRequest());
    mvc.perform(
            json(
                patch("/api/v1/admin/members/" + id).with(user("admin").roles("ADMIN")),
                Map.of("status", "BANNED", "version", 1)))
        .andExpect(status().isOk());
    mvc.perform(
            json(post("/api/v1/members/login"), Map.of("email", email(id), "password", PASSWORD)))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void profileVersionAndDeletionRemovePrivateData() throws Exception {
    long id = member("注销前");
    long comment = comment(id, "APPROVED", null);
    mvc.perform(
            json(
                put("/api/v1/members/me").with(as(id)),
                Map.of(
                    "nickname", "新昵称", "avatar", "javascript:alert(1)", "bio", "", "version", 0)))
        .andExpect(status().isBadRequest());
    var profile = Map.of("nickname", "新昵称", "avatar", "", "bio", "简介", "version", 0);
    mvc.perform(json(put("/api/v1/members/me").with(as(id)), profile)).andExpect(status().isOk());
    mvc.perform(json(put("/api/v1/members/me").with(as(id)), profile))
        .andExpect(status().isConflict());
    mvc.perform(json(delete("/api/v1/members/me").with(as(id)), Map.of("password", PASSWORD)))
        .andExpect(status().isOk());
    assertNull(jdbc.queryForObject("SELECT email FROM members WHERE id=?", String.class, id));
    assertEquals(
        "", jdbc.queryForObject("SELECT password_hash FROM members WHERE id=?", String.class, id));
    assertEquals(
        "已注销用户",
        jdbc.queryForObject("SELECT author FROM comments WHERE id=?", String.class, comment));
    mvc.perform(get("/api/v1/members/me").with(as(id))).andExpect(status().isUnauthorized());
  }

  @Test
  void guestbookIsModeratedAndCannotDeleteOtherMembersNotes() throws Exception {
    long a = member("便签作者"), b = member("其他人");
    mvc.perform(
            json(
                post("/api/v1/guestbook").with(as(a)),
                Map.of("content", "<script>literal</script>", "color", "mint")))
        .andExpect(status().isOk());
    mvc.perform(get("/api/v1/guestbook")).andExpect(jsonPath("$.data.total").value(0));
    long id = jdbc.queryForObject("SELECT MAX(id) FROM guestbook_entries", Long.class);
    mvc.perform(
            json(
                patch("/api/v1/admin/guestbook/" + id).with(user("admin").roles("ADMIN")),
                Map.of("status", "APPROVED", "version", 0)))
        .andExpect(status().isOk());
    mvc.perform(get("/api/v1/guestbook"))
        .andExpect(jsonPath("$.data.items[0].content").value("<script>literal</script>"));
    mvc.perform(
            json(
                delete("/api/v1/members/guestbook/" + id).param("version", "1").with(as(b)),
                Map.of()))
        .andExpect(status().isConflict());
    mvc.perform(
            json(
                delete("/api/v1/members/guestbook/" + id).param("version", "1").with(as(a)),
                Map.of()))
        .andExpect(status().isOk());
  }

  @Test
  void limiterRejectsExcess() {
    var limiter = new MemberRateLimiter();
    for (int i = 0; i < 3; i++) limiter.check("test", 3);
    assertThrows(
        com.myblog.common.exception.TooManyRequestsException.class, () -> limiter.check("test", 3));
  }

  @Test
  void publicProfilesAndOptionalSessionNeverExposePrivateAccountFields() throws Exception {
    long id = member("公开资料");
    mvc.perform(get("/api/v1/members/session"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data").isEmpty());
    mvc.perform(get("/api/v1/people/" + id))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.nickname").value("公开资料"))
        .andExpect(jsonPath("$.data.email").doesNotExist())
        .andExpect(jsonPath("$.data.passwordHash").doesNotExist())
        .andExpect(jsonPath("$.data.status").doesNotExist());
    jdbc.update("UPDATE members SET status='BANNED' WHERE id=?", id);
    mvc.perform(get("/api/v1/people/" + id)).andExpect(status().isNotFound());
    when(mailer.enabled()).thenReturn(false);
    mvc.perform(json(post("/api/v1/members/email"), Map.of("email", email(id), "purpose", "RESET")))
        .andExpect(status().isBadRequest());
  }

  @Test
  void changingPasswordRequiresCurrentSecretAndRevokesOtherSessions() throws Exception {
    long id = member("修改密码");
    mvc.perform(
            json(
                put("/api/v1/members/password").with(as(id)),
                Map.of("currentPassword", "wrong", "password", "New-Member-Password-2026")))
        .andExpect(status().isBadRequest());
    mvc.perform(
            json(
                put("/api/v1/members/password").with(as(id)),
                Map.of("currentPassword", PASSWORD, "password", "密".repeat(30))))
        .andExpect(status().isBadRequest());
    mvc.perform(
            json(
                put("/api/v1/members/password").with(as(id)),
                Map.of("currentPassword", PASSWORD, "password", "New-Member-Password-2026")))
        .andExpect(status().isOk());
    mvc.perform(get("/api/v1/members/me").with(as(id))).andExpect(status().isUnauthorized());
    mvc.perform(
            json(post("/api/v1/members/login"), Map.of("email", email(id), "password", PASSWORD)))
        .andExpect(status().isUnauthorized());
  }
}
