package com.myblog.comment.dto;

public record CommentResponse(long id, String author, String content, String createdAt) {}
