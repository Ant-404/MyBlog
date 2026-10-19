package com.myblog.auth.controller;

import com.myblog.auth.dto.AdminUserResponse;
import com.myblog.auth.dto.LoginRequest;
import com.myblog.auth.dto.PasswordChangeRequest;
import com.myblog.auth.repository.AdminUserRepository;
import com.myblog.auth.service.AdminUserDetailsService;
import com.myblog.auth.service.LoginAttemptService;
import com.myblog.common.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
  private final AuthenticationManager manager;
  private final AdminUserDetailsService users;
  private final SecurityContextRepository contexts;
  private final CsrfTokenRepository csrfTokens;
  private final LoginAttemptService attempts;
  private final AdminUserRepository repository;
  private final PasswordEncoder encoder;
  private final SessionRegistry sessions;

  public AuthController(
      AuthenticationManager manager,
      AdminUserDetailsService users,
      SecurityContextRepository contexts,
      CsrfTokenRepository csrfTokens,
      LoginAttemptService attempts,
      AdminUserRepository repository,
      PasswordEncoder encoder,
      SessionRegistry sessions) {
    this.manager = manager;
    this.users = users;
    this.contexts = contexts;
    this.csrfTokens = csrfTokens;
    this.attempts = attempts;
    this.repository = repository;
    this.encoder = encoder;
    this.sessions = sessions;
  }

  @GetMapping("/csrf")
  public ApiResponse<Map<String, String>> csrf(CsrfToken token) {
    return ApiResponse.success(
        Map.of("token", token.getToken(), "headerName", token.getHeaderName()));
  }

  @PostMapping("/login")
  // Share the controller monitor with password changes: old credentials cannot register a late
  // session.
  public synchronized ResponseEntity<?> login(
      @Valid @RequestBody LoginRequest input,
      HttpServletRequest request,
      HttpServletResponse response) {
    String key = request.getRemoteAddr();
    if (input.password().getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72) {
      return ResponseEntity.badRequest().body(ApiResponse.failure("INVALID_ARGUMENT", "密码长度不合法"));
    }
    if (attempts.blocked(key)) {
      return ResponseEntity.status(429)
          .header("Retry-After", "900")
          .body(ApiResponse.failure("LOGIN_THROTTLED", "尝试次数过多，请稍后再试"));
    }
    final Authentication authentication;
    try {
      authentication =
          manager.authenticate(
              UsernamePasswordAuthenticationToken.unauthenticated(
                  input.username(), input.password()));
    } catch (AuthenticationException exception) {
      attempts.failed(key);
      return ResponseEntity.status(401)
          .body(ApiResponse.failure("INVALID_CREDENTIALS", "账号或密码不正确"));
    }
    attempts.succeeded(key);
    new ChangeSessionIdAuthenticationStrategy().onAuthentication(authentication, request, response);
    var context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(authentication);
    SecurityContextHolder.setContext(context);
    contexts.saveContext(context, request, response);
    sessions.registerNewSession(request.getSession().getId(), authentication.getPrincipal());
    csrfTokens.saveToken(null, request, response);
    return ResponseEntity.ok(ApiResponse.success(users.profile(authentication.getName())));
  }

  @GetMapping("/me")
  public ApiResponse<AdminUserResponse> me(Authentication authentication) {
    return ApiResponse.success(users.profile(authentication.getName()));
  }

  @PostMapping("/password")
  public synchronized ResponseEntity<?> changePassword(
      @Valid @RequestBody PasswordChangeRequest input,
      Authentication authentication,
      HttpServletRequest request) {
    if (input.currentPassword().getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72
        || input.newPassword().getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72
        || input.currentPassword().equals(input.newPassword())) {
      return ResponseEntity.badRequest()
          .body(ApiResponse.failure("INVALID_ARGUMENT", "新密码需与旧密码不同，且 UTF-8 编码不超过 72 字节"));
    }
    String key = "password:" + authentication.getName();
    if (attempts.blocked(key))
      return ResponseEntity.status(429)
          .header("Retry-After", "900")
          .body(ApiResponse.failure("LOGIN_THROTTLED", "尝试次数过多，请稍后再试"));
    var user = repository.findByUsername(authentication.getName()).orElseThrow();
    if (!encoder.matches(input.currentPassword(), user.passwordHash())) {
      attempts.failed(key);
      return ResponseEntity.badRequest().body(ApiResponse.failure("INVALID_PASSWORD", "旧密码不正确"));
    }
    if (!repository.changePassword(
        user.username(), user.passwordHash(), encoder.encode(input.newPassword()))) {
      return ResponseEntity.status(409).body(ApiResponse.failure("CONFLICT", "密码已变更，请重新登录"));
    }
    attempts.succeeded(key);
    for (Object principal : sessions.getAllPrincipals()) {
      if (principal instanceof UserDetails details
          && details.getUsername().equals(user.username())) {
        sessions.getAllSessions(principal, false).forEach(session -> session.expireNow());
      }
    }
    var session = request.getSession(false);
    if (session != null) session.invalidate();
    SecurityContextHolder.clearContext();
    return ResponseEntity.ok(ApiResponse.success(null));
  }
}
