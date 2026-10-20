package com.myblog;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.context.config.ConfigDataEnvironmentPostProcessor;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

class ProductionConfigurationTest {
  @TempDir Path root;

  @Test
  void linuxUsesProductionDefaultsAndIgnoresDevelopmentAndWindowsFiles() throws IOException {
    write(".env", "UPLOAD_DIRECTORY=D:/development/uploads\nDB_PASSWORD=development-only\n");
    write(".env.prod-windows", "UPLOAD_DIRECTORY=D:/windows/uploads\n");
    var environment = load("prod-linux", Map.of());
    assertThat(environment.getActiveProfiles()).contains("prod-linux", "prod");
    assertThat(environment.getProperty("blog.media.directory")).isEqualTo("/srv/myblog/uploads");
    assertThat(environment.getProperty("blog.music.directory"))
        .isEqualTo("/srv/myblog/uploads/music");
    assertThat(environment.getProperty("blog.music.source-directory"))
        .isEqualTo("/srv/myblog/frontend/public/music");
    assertThat(environment.getProperty("DB_PASSWORD")).isNull();
    assertThat(environment.getProperty("server.servlet.session.cookie.secure")).isEqualTo("true");
    assertThat(environment.getProperty("server.forward-headers-strategy")).isEqualTo("native");
    assertThat(environment.getProperty("server.address")).isEqualTo("127.0.0.1");
  }

  @Test
  void windowsUsesWindowsDefaults() throws IOException {
    var environment = load("prod-windows", Map.of());
    assertThat(environment.getActiveProfiles()).contains("prod-windows", "prod");
    assertThat(environment.getProperty("blog.media.directory")).isEqualTo("D:/MyBlog/uploads");
    assertThat(environment.getProperty("blog.music.directory"))
        .isEqualTo("D:/MyBlog/uploads/music");
    assertThat(environment.getProperty("blog.music.source-directory"))
        .isEqualTo("D:/MyBlog/frontend/public/music");
  }

  @Test
  void selectedProductionFileLoadsAndProcessEnvironmentWins() throws IOException {
    write(".env.prod-linux", "UPLOAD_DIRECTORY=/data/files\nDB_PASSWORD=linux-only\n");
    var fromFile = load("prod-linux", Map.of());
    assertThat(fromFile.getProperty("blog.media.directory")).isEqualTo("/data/files");
    assertThat(fromFile.getProperty("DB_PASSWORD")).isEqualTo("linux-only");
    var overridden = load("prod-linux", Map.of("UPLOAD_DIRECTORY", "/mounted/files"));
    assertThat(overridden.getProperty("blog.media.directory")).isEqualTo("/mounted/files");
    assertThat(overridden.getProperty("blog.music.directory")).isEqualTo("/mounted/files/music");
  }

  @Test
  void developmentKeepsLoadingOriginalEnv() throws IOException {
    write(".env", "UPLOAD_DIRECTORY=D:/development/uploads\n");
    var environment = load("default", Map.of());
    assertThat(environment.getProperty("blog.media.directory")).isEqualTo("D:/development/uploads");
    assertThat(environment.getProperty("server.servlet.session.cookie.secure")).isEqualTo("false");
  }

  private void write(String name, String content) throws IOException {
    Files.createDirectories(root.resolve("backend"));
    Files.writeString(root.resolve("backend").resolve(name), content);
  }

  private StandardEnvironment load(String profile, Map<String, Object> overrides)
      throws IOException {
    // Copy the real configuration, redirecting only external imports into a sandbox.
    // Never read the developer's actual .env or production credentials.
    for (String name :
        new String[] {
          "application.yml",
          "application-default.yml",
          "application-prod.yml",
          "application-prod-windows.yml",
          "application-prod-linux.yml"
        }) {
      try (var input = getClass().getResourceAsStream("/" + name)) {
        String yaml = new String(input.readAllBytes(), StandardCharsets.UTF_8);
        Files.writeString(
            root.resolve(name), yaml.replace("optional:file:./", "optional:" + root.toUri()));
      }
    }
    var environment = new StandardEnvironment();
    environment
        .getPropertySources()
        .remove(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME);
    environment
        .getPropertySources()
        .remove(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME);
    environment.getPropertySources().addFirst(new MapPropertySource("processOverrides", overrides));
    environment
        .getPropertySources()
        .addFirst(
            new MapPropertySource(
                "testConfig",
                Map.of(
                    "spring.config.location",
                    root.resolve("application.yml").toUri().toString(),
                    "spring.profiles.active",
                    profile)));
    ConfigDataEnvironmentPostProcessor.applyTo(environment);
    return environment;
  }
}
