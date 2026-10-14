package com.myblog.post.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;

public record PostWriteRequest(
    @NotBlank @Size(max = 200) String title,
    @NotBlank @Size(max = 160) @Pattern(regexp = "[a-z0-9]+(?:-[a-z0-9]+)*") String slug,
    @NotNull @Size(max = 500) String excerpt,
    @NotNull @Size(max = 200000) String content,
    @NotNull @Size(max = 500) String cover,
    @NotBlank @Size(max = 64) String category,
    @NotNull @Size(max = 12) List<@NotBlank @Size(max = 64) String> tags,
    @NotNull LocalDate publishedAt,
    @Min(1) @Max(240) int readingMinutes,
    boolean pinned,
    @NotNull @Pattern(regexp = "DRAFT|PUBLISHED") String status,
    @Min(0) int version) {}
