package com.myblog.member.controller;

import com.myblog.common.api.*;
import com.myblog.member.dto.MemberModels.*;
import com.myblog.member.service.MemberService;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@Validated
@RequestMapping("/api/v1")
public class MemberController {
  private final MemberService service;
  private final SecurityContextRepository contexts;
  private final CsrfTokenRepository csrf;

  public MemberController(
      MemberService service, SecurityContextRepository contexts, CsrfTokenRepository csrf) {
    this.service = service;
    this.contexts = contexts;
    this.csrf = csrf;
  }

  @GetMapping("/members/config")
  public ApiResponse<Map<String, Boolean>> config() {
    return ApiResponse.success(Map.of("mailEnabled", service.mailEnabled()));
  }

  @GetMapping("/people/{id}")
  public ApiResponse<PublicProfile> publicProfile(@PathVariable @Positive long id) {
    return ApiResponse.success(service.publicProfile(id));
  }

  @PostMapping("/members/email")
  public ApiResponse<Void> email(
      @Valid @RequestBody EmailRequest input, HttpServletRequest request) {
    service.send(input, request.getRemoteAddr());
    return ApiResponse.success(null);
  }

  @PostMapping("/members/register")
  public ApiResponse<Profile> register(
      @Valid @RequestBody RegisterRequest input, HttpServletRequest request) {
    return ApiResponse.success(service.register(input, request.getRemoteAddr()));
  }

  @PostMapping("/members/login")
  public ApiResponse<Profile> login(
      @Valid @RequestBody LoginRequest input,
      HttpServletRequest request,
      HttpServletResponse response) {
    var account = service.login(input, request.getRemoteAddr());
    var authentication =
        UsernamePasswordAuthenticationToken.authenticated(
            new Identity(account.profile().id(), account.sessionVersion()),
            null,
            List.of(new SimpleGrantedAuthority("ROLE_MEMBER")));
    new ChangeSessionIdAuthenticationStrategy().onAuthentication(authentication, request, response);
    var context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(authentication);
    SecurityContextHolder.setContext(context);
    contexts.saveContext(context, request, response);
    csrf.saveToken(null, request, response);
    return ApiResponse.success(account.profile());
  }

  @PostMapping("/members/reset")
  public ApiResponse<Void> reset(
      @Valid @RequestBody ResetRequest input, HttpServletRequest request) {
    service.reset(input, request.getRemoteAddr());
    return ApiResponse.success(null);
  }

  @GetMapping("/members/me")
  public ApiResponse<Profile> me(Authentication authentication) {
    return ApiResponse.success(service.current(authentication).profile());
  }

  @GetMapping("/members/session")
  public ApiResponse<Profile> session(Authentication authentication) {
    try {
      return ApiResponse.success(service.current(authentication).profile());
    } catch (org.springframework.security.core.AuthenticationException exception) {
      return ApiResponse.success(null);
    }
  }

  @PutMapping("/members/me")
  public ApiResponse<Profile> edit(
      Authentication authentication, @Valid @RequestBody EditProfile input) {
    return ApiResponse.success(service.edit(authentication, input));
  }

  @PutMapping("/members/password")
  public ApiResponse<Void> password(
      Authentication authentication,
      @Valid @RequestBody PasswordRequest input,
      HttpServletRequest request) {
    service.changePassword(authentication, input);
    request.getSession().invalidate();
    SecurityContextHolder.clearContext();
    return ApiResponse.success(null);
  }

  @DeleteMapping("/members/me")
  public ApiResponse<Void> close(
      Authentication authentication,
      @Valid @RequestBody CloseRequest input,
      HttpServletRequest request) {
    service.close(authentication, input);
    request.getSession().invalidate();
    SecurityContextHolder.clearContext();
    return ApiResponse.success(null);
  }

  @GetMapping("/admin/members")
  public ApiResponse<PageResponse<Profile>> list(
      @RequestParam(defaultValue = "") @Size(max = 100) String keyword,
      @RequestParam(defaultValue = "1") @Min(1) @Max(100000) int page) {
    return ApiResponse.success(service.list(keyword, page));
  }

  @PatchMapping("/admin/members/{id}")
  public ApiResponse<Void> state(
      @PathVariable @Positive long id, @Valid @RequestBody StateRequest input) {
    service.state(id, input);
    return ApiResponse.success(null);
  }
}
