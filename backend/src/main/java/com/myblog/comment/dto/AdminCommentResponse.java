package com.myblog.comment.dto;

public record AdminCommentResponse(
    long id,
    String slug,
    String postTitle,
    String author,
    String content,
    String status,
    int version,
    String createdAt,
    Long memberId) {}
