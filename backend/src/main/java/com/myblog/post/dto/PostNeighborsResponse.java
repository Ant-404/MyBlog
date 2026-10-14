package com.myblog.post.dto;

public record PostNeighborsResponse(PostSummaryResponse previous, PostSummaryResponse next) {}
