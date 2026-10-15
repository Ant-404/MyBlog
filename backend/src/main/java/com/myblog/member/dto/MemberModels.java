package com.myblog.member.dto;

import jakarta.validation.constraints.*;
import java.io.Serializable;

public final class MemberModels {
  private MemberModels() {}

  public record Identity(long id, int sessionVersion) implements Serializable {}

  public record Profile(
      long id,
      String email,
      String nickname,
      String avatar,
      String bio,
      String status,
      int version) {}

  public record PublicProfile(long id, String nickname, String avatar, String bio) {}

  public record EmailRequest(
      @NotBlank @Email @Size(max = 254) String email,
      @NotNull @Pattern(regexp = "REGISTER|RESET") String purpose) {}

  public record RegisterRequest(
      @NotBlank @Email @Size(max = 254) String email,
      @NotBlank @Size(max = 100) String token,
      @NotBlank @Size(min = 10, max = 72) String password,
      @NotBlank @Size(max = 64) String nickname) {}

  public record LoginRequest(
      @NotBlank @Email @Size(max = 254) String email, @NotBlank @Size(max = 72) String password) {}

  public record ResetRequest(
      @NotBlank @Email @Size(max = 254) String email,
      @NotBlank @Size(max = 100) String token,
      @NotBlank @Size(min = 10, max = 72) String password) {}

  public record EditProfile(
      @NotBlank @Size(max = 64) String nickname,
      @NotNull @Size(max = 1000) String avatar,
      @NotNull @Size(max = 300) String bio,
      @Min(0) int version) {}

  public record PasswordRequest(
      @NotBlank @Size(max = 72) String currentPassword,
      @NotBlank @Size(min = 10, max = 72) String password) {}

  public record CloseRequest(@NotBlank @Size(max = 72) String password) {}

  public record StateRequest(
      @NotNull @Pattern(regexp = "ACTIVE|MUTED|BANNED") String status, @Min(0) int version) {}

  public record ReportRequest(@NotBlank @Size(max = 500) String reason) {}
}
