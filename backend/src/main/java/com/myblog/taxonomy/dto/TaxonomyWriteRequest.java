package com.myblog.taxonomy.dto;

import jakarta.validation.constraints.*;

public record TaxonomyWriteRequest(@NotBlank @Size(max = 64) String name, @Min(0) int version) {}
