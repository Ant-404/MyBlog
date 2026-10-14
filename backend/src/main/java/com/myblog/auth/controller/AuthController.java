package com.myblog.auth.controller;

import com.myblog.auth.dto.AdminUserResponse;
import com.myblog.auth.dto.LoginRequest;
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

  public AuthController(
      AuthenticationManager manager,
      AdminUserDetailsService users,
      SecurityContextRepository contexts,
      CsrfTokenRepository csrfTokens,
      LoginAttemptService attempts) {
    this.manager = manager;
    this.users = users;
    this.contexts = contexts;
    this.csrfTokens = csrfTokens;
    this.attempts = attempts;
  }

  @GetMapping("/csrf")
  public ApiResponse<Map<String, String>> csrf(CsrfToken token) {
    return ApiResponse.success(
        Map.of("token", token.getToken(), "headerName", token.getHeaderName()));
  }

  @PostMapping("/login")
  public ResponseEntity<?> login(
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
    csrfTokens.saveToken(null, request, response);
    return ResponseEntity.ok(ApiResponse.success(users.profile(authentication.getName())));
  }

  @GetMapping("/me")
  public ApiResponse<AdminUserResponse> me(Authentication authentication) {
    return ApiResponse.success(users.profile(authentication.getName()));
  }
}
