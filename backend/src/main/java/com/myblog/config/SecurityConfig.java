package com.myblog.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myblog.auth.service.AdminUserDetailsService;
import com.myblog.common.api.ApiResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.core.session.SessionRegistryImpl;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.*;
import org.springframework.security.web.session.ConcurrentSessionFilter;
import org.springframework.security.web.session.HttpSessionEventPublisher;

@Configuration
public class SecurityConfig {
  @Bean
  public SessionRegistry sessionRegistry() {
    return new SessionRegistryImpl();
  }

  @Bean
  public HttpSessionEventPublisher httpSessionEventPublisher() {
    return new HttpSessionEventPublisher();
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  public SecurityContextRepository securityContexts() {
    return new HttpSessionSecurityContextRepository();
  }

  @Bean
  public CsrfTokenRepository csrfTokens() {
    return new HttpSessionCsrfTokenRepository();
  }

  @Bean
  public AuthenticationManager authenticationManager(
      AdminUserDetailsService users, PasswordEncoder encoder) {
    var provider = new DaoAuthenticationProvider(users);
    provider.setPasswordEncoder(encoder);
    return new ProviderManager(provider);
  }

  @Bean
  public SecurityFilterChain security(
      HttpSecurity http,
      ObjectMapper mapper,
      SecurityContextRepository contexts,
      CsrfTokenRepository csrfTokens,
      SessionRegistry sessions)
      throws Exception {
    http.addFilterBefore(
            new ConcurrentSessionFilter(
                sessions,
                event -> {
                  event.getResponse().setStatus(401);
                  event.getResponse().setContentType("application/json;charset=UTF-8");
                  mapper.writeValue(
                      event.getResponse().getWriter(),
                      ApiResponse.failure("UNAUTHORIZED", "密码已修改，请重新登录"));
                }),
            AuthorizationFilter.class)
        .securityContext(config -> config.securityContextRepository(contexts))
        .csrf(
            config ->
                config
                    .csrfTokenRepository(csrfTokens)
                    .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
        .authorizeHttpRequests(
            config ->
                config
                    .requestMatchers("/api/v1/admin/**", "/api/v1/auth/me", "/api/v1/auth/password")
                    .hasRole("ADMIN")
                    .requestMatchers("/api/v1/members/**", "/api/v1/people/**")
                    .denyAll()
                    .requestMatchers(HttpMethod.GET, "/api/v1/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/rss.xml", "/sitemap.xml")
                    .permitAll()
                    .requestMatchers(
                        HttpMethod.POST,
                        "/api/v1/posts/*/comments",
                        "/api/v1/comments/images",
                        "/api/v1/posts/*/view",
                        "/api/v1/guestbook")
                    .permitAll()
                    .requestMatchers("/api/v1/auth/login", "/api/v1/auth/logout", "/error")
                    .permitAll()
                    .anyRequest()
                    .denyAll())
        .exceptionHandling(
            config ->
                config
                    .authenticationEntryPoint(
                        (request, response, exception) -> {
                          response.setStatus(401);
                          response.setContentType("application/json;charset=UTF-8");
                          mapper.writeValue(
                              response.getWriter(),
                              ApiResponse.failure("UNAUTHORIZED", "请先登录对应账号"));
                        })
                    .accessDeniedHandler(
                        (request, response, exception) -> {
                          response.setStatus(403);
                          response.setContentType("application/json;charset=UTF-8");
                          mapper.writeValue(
                              response.getWriter(),
                              ApiResponse.failure("FORBIDDEN", "请求未通过权限或安全校验，请刷新后重试"));
                        }))
        .logout(
            config ->
                config
                    .logoutUrl("/api/v1/auth/logout")
                    .invalidateHttpSession(true)
                    .clearAuthentication(true)
                    .deleteCookies("JSESSIONID")
                    .logoutSuccessHandler(
                        (request, response, authentication) -> {
                          response.setContentType("application/json;charset=UTF-8");
                          mapper.writeValue(response.getWriter(), ApiResponse.success(null));
                        }));
    return http.build();
  }
}
