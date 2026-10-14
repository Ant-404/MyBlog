package com.myblog.media.dto;

public record MediaResponse(
    long id,
    String url,
    String originalName,
    String contentType,
    long sizeBytes,
    String createdAt) {}
