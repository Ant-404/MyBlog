package com.myblog.comment.dto;

import jakarta.validation.constraints.*;

public record CommentWriteRequest(
    @NotBlank @Size(max = 64) String author,
    @NotBlank @Size(max = 2000) String content,
    @Size(max = 200) String website) {}
