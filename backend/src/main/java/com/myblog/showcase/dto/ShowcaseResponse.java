package com.myblog.showcase.dto;

import java.time.LocalDate;
import java.util.List;

public record ShowcaseResponse(
    long id,
    String section,
    String title,
    String summary,
    String content,
    String cover,
    String status,
    List<String> technologies,
    String sourceUrl,
    String demoUrl,
    List<String> images,
    List<LinkedPost> posts,
    LocalDate publishedAt,
    int sortOrder,
    boolean visible,
    int version) {
  public record LinkedPost(long id, String title, String slug, boolean published) {}
}
