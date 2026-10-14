package com.myblog.auth.service;

import com.myblog.auth.repository.AdminUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminBootstrap implements ApplicationRunner {
  private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);
  private final AdminUserRepository repository;
  private final PasswordEncoder encoder;
  private final String username;
  private final String password;
  private final String displayName;

  public AdminBootstrap(
      AdminUserRepository repository,
      PasswordEncoder encoder,
      @Value("${blog.admin.username}") String username,
      @Value("${blog.admin.password}") String password,
      @Value("${blog.admin.display-name}") String displayName) {
    this.repository = repository;
    this.encoder = encoder;
    this.username = username;
    this.password = password;
    this.displayName = displayName;
  }

  @Override
  public void run(ApplicationArguments arguments) {
    if (repository.count() > 0) return;
    if (password.isBlank()) {
      log.warn("No administrator configured. Set ADMIN_PASSWORD to initialize the first account.");
      return;
    }
    if (!username.matches("[a-zA-Z0-9_-]{3,64}")
        || password.length() < 12
        || password.length() > 64
        || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72) {
      throw new IllegalStateException(
          "Admin initialization requires a valid username and a 12-64 character password");
    }
    repository.create(username, encoder.encode(password), displayName);
    log.info(
        "Initial administrator created. Password is not logged and will not be reset on restart.");
  }
}
