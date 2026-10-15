package com.myblog.anime.dto;

import jakarta.validation.constraints.*;

public record AnimeWriteRequest(
    @NotBlank @Size(max = 200) String title,
    @NotNull @Size(max = 1000) String cover,
    @NotBlank @Pattern(regexp = "PLANNED|WATCHING|COMPLETED|ON_HOLD|DROPPED") String status,
    @Min(0) @Max(100000) int watchedEpisodes,
    @Min(0) @Max(100000) int totalEpisodes,
    @DecimalMin("0") @DecimalMax("10") double score,
    @NotNull @Size(max = 2000) String note,
    @NotNull @Size(max = 1000) String sourceUrl,
    @Min(-10000) @Max(10000) int sortOrder,
    boolean visible,
    @Min(0) int version) {}
