package com.myblog.album.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public record AlbumWriteRequest(
    @NotBlank @Size(max = 200) String title,
    @NotNull @Size(max = 2000) String description,
    @NotNull @Size(max = 1000) String cover,
    @Min(-10000) @Max(10000) int sortOrder,
    boolean visible,
    @Min(0) int version,
    @NotNull @Size(max = 200) List<@NotNull @Valid Photo> photos) {
  public record Photo(
      @NotBlank @Size(max = 1000) String url, @NotNull @Size(max = 500) String caption) {}
}
