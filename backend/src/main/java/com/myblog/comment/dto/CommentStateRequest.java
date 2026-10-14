package com.myblog.comment.dto;

import jakarta.validation.constraints.*;

public record CommentStateRequest(
    @NotNull @Pattern(regexp = "PENDING|APPROVED|REJECTED") String status, @Min(0) int version) {}
