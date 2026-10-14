package com.myblog.post.dto;

import com.myblog.post.entity.AdminPostEntity;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record AdminPostDetailResponse(
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
  public static AdminPostDetailResponse from(AdminPostEntity post) {
    return new AdminPostDetailResponse(
        post.id(),
        post.slug(),
        post.title(),
        post.excerpt(),
        post.content(),
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
