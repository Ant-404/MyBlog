package com.myblog.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordChangeRequest(
    @NotBlank @Size(max = 64) String currentPassword,
    @NotBlank @Size(min = 12, max = 64) String newPassword) {}
