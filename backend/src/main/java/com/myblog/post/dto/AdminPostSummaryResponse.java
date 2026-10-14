package com.myblog.post.dto;

import com.myblog.post.entity.AdminPostEntity;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record AdminPostSummaryResponse(
    long id,
    String slug,
    String title,
    String excerpt,
    String cover,
    String category,
    List<String> tags,
    LocalDate publishedAt,
    int readingMinutes,
    boolean pinned,
    String status,
    int version,
    LocalDateTime updatedAt) {
  public static AdminPostSummaryResponse from(AdminPostEntity post) {
    return new AdminPostSummaryResponse(
        post.id(),
        post.slug(),
        post.title(),
        post.excerpt(),
        post.cover(),
        post.category(),
        post.tags(),
        post.publishedAt(),
        post.readingMinutes(),
        post.pinned(),
        post.status(),
        post.version(),
        post.updatedAt());
  }
}
