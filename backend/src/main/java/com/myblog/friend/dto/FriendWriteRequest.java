package com.myblog.friend.dto;

import jakarta.validation.constraints.*;

public record FriendWriteRequest(
    @NotBlank @Size(max = 100) String name,
    @NotNull @Size(max = 300) String description,
    @NotBlank @Size(max = 500) String url,
    @Min(-10000) @Max(10000) int sortOrder,
    boolean visible,
    @Min(0) int version) {}
