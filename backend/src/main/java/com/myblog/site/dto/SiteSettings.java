package com.myblog.site.dto;

import jakarta.validation.constraints.*;

public record SiteSettings(
    @NotBlank @Size(max = 64) String name,
    @NotBlank @Size(max = 100) String title,
    @NotNull @Size(max = 200) String subtitle,
    @NotBlank @Size(max = 64) String author,
    @NotNull @Size(max = 200) String bio,
    @NotNull @Size(max = 500) String description,
    @NotNull @Size(max = 20000) String aboutContent,
    @NotNull @Size(max = 500) String avatar,
    @NotBlank @Size(max = 500) String publicUrl,
    boolean commentsEnabled,
    @Min(0) int version) {}
