package com.myblog.comment.dto;

public record AdminCommentResponse(
    long id,
    String slug,
    String postTitle,
    String author,
    String content,
    int version,
    String createdAt,
    String email,
    String url) {}
