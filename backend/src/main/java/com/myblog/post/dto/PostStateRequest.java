package com.myblog.post.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record PostStateRequest(
    @NotNull @Pattern(regexp = "DRAFT|PUBLISHED") String status,
    @NotNull Boolean pinned,
    @Min(0) int version) {}
