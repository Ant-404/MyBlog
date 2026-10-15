package com.myblog;

import org.springframework.boot.SpringApplication;

/** Entry point used by spring-boot:test-run; production never initializes the schema. */
public class TestMyBlogApplication {
  public static void main(String[] args) {
    SpringApplication.from(MyBlogApplication::main).with(TestDatabaseConfiguration.class).run(args);
  }
}
