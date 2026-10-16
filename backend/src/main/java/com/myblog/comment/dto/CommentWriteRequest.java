package com.myblog.comment.dto;

import jakarta.validation.constraints.*;

public record CommentWriteRequest(
    @NotBlank @Size(max = 64) String author,
    @NotBlank @Email @Size(max = 254) String email,
    @Size(max = 500) String url,
    @NotBlank @Size(max = 500) String content,
    @Size(max = 200) String website,
    @Positive Long parentId) {}
