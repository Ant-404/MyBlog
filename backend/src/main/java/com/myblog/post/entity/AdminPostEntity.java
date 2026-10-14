package com.myblog.post.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record AdminPostEntity(
    long id,
    String slug,
    String title,
    String excerpt,
    String content,
    String cover,
    String category,
    List<String> tags,
    LocalDate publishedAt,
    int readingMinutes,
    boolean pinned,
    String status,
    int version,
    LocalDateTime updatedAt) {
  public AdminPostEntity withTags(List<String> names) {
    return new AdminPostEntity(
        id,
        slug,
        title,
        excerpt,
        content,
        cover,
        category,
        names,
        publishedAt,
        readingMinutes,
        pinned,
        status,
        version,
        updatedAt);
  }
}
