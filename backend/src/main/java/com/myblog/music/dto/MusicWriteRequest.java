package com.myblog.music.dto;

import jakarta.validation.constraints.*;

public record MusicWriteRequest(
    @NotNull @Size(max = 1000) String playlistId,
    @NotBlank @Size(max = 100) String name,
    @NotNull @Size(max = 1000) String profileUrl,
    boolean enabled,
    @Min(0) int version) {}
