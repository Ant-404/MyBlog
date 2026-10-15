package com.myblog.showcase.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;

public record ShowcaseWriteRequest(
    @NotNull @Size(max = 200) String title,
    @NotNull @Size(max = 500) String summary,
    @NotNull @Size(max = 20000) String content,
    @NotNull @Size(max = 1000) String cover,
    @NotNull @Size(max = 20) String status,
    @NotNull @Size(max = 20) List<@NotBlank @Size(max = 50) String> technologies,
    @NotNull @Size(max = 1000) String sourceUrl,
    @NotNull @Size(max = 1000) String demoUrl,
    @NotNull @Size(max = 9) List<@NotBlank @Size(max = 1000) String> images,
    @NotNull @Size(max = 100) List<@NotNull @Positive Long> postIds,
    @NotNull LocalDate publishedAt,
    @Min(-10000) @Max(10000) int sortOrder,
    boolean visible,
    @Min(0) int version) {}
