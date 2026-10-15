package com.myblog;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.sql.DataSource;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.DataSourceInitializer;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;

/** Loads the single maintained SQL file into an isolated H2 test database. */
@TestConfiguration(proxyBeanMethods = false)
public class TestDatabaseConfiguration {
  @Bean
  DataSourceInitializer testDatabaseInitializer(DataSource dataSource) throws Exception {
    var initializer = new DataSourceInitializer();
    initializer.setDataSource(dataSource);
    var jdbc = new JdbcTemplate(dataSource);
    boolean initialized =
        jdbc.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'posts'",
                Integer.class)
            > 0;
    if (!initialized) {
      Path script = Path.of("../database/MyBlog.sql");
      if (!Files.exists(script)) script = Path.of("database/MyBlog.sql");
      String sql =
          Files.readString(script, StandardCharsets.UTF_8)
              .replaceAll("(?s)-- @mysql-only-begin.*?-- @mysql-only-end", "");
      var populator =
          new ResourceDatabasePopulator(
              new ByteArrayResource(sql.getBytes(StandardCharsets.UTF_8)));
      populator.setSqlScriptEncoding("UTF-8");
      initializer.setDatabasePopulator(populator);
    }
    return initializer;
  }
}
