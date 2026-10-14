package com.myblog.post.entity;

import java.time.LocalDate;
import java.util.List;

public record PostEntity(
    long id,
    String slug,
    String title,
    String excerpt,
    String cover,
    String category,
    LocalDate publishedAt,
    int readingMinutes,
    boolean pinned,
    String content,
    List<String> tags) {
  public PostEntity withTags(List<String> values) {
    return new PostEntity(
        id,
        slug,
        title,
        excerpt,
        cover,
        category,
        publishedAt,
        readingMinutes,
        pinned,
        content,
        values);
  }
}
