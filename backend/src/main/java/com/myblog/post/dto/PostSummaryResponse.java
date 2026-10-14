package com.myblog.post.dto;

import com.myblog.post.entity.PostEntity;
import java.time.LocalDate;
import java.util.List;

public record PostSummaryResponse(
    long id,
    String slug,
    String title,
    String excerpt,
    String cover,
    String category,
    List<String> tags,
    LocalDate publishedAt,
    int readingMinutes,
    boolean pinned) {
  public static PostSummaryResponse from(PostEntity post) {
    return new PostSummaryResponse(
        post.id(),
        post.slug(),
        post.title(),
        post.excerpt(),
        post.cover(),
        post.category(),
        post.tags(),
        post.publishedAt(),
        post.readingMinutes(),
        post.pinned());
  }
}
