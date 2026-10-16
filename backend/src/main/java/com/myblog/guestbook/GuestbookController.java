package com.myblog.guestbook;

import com.myblog.common.api.*;
import com.myblog.guestbook.GuestbookRepository.Note;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@Validated
@RequestMapping("/api/v1")
public class GuestbookController {
  private final GuestbookRepository repository;
  private final GuestbookRateLimiter limiter;

  public GuestbookController(GuestbookRepository repository, GuestbookRateLimiter limiter) {
    this.repository = repository;
    this.limiter = limiter;
  }

  public record NoteInput(
      @NotBlank @Size(max = 500) String content,
      @NotNull @Pattern(regexp = "lavender|peach|mint|sky") String color,
      @Size(max = 200) String website) {}

  @GetMapping("/guestbook")
  public ApiResponse<PageResponse<Note>> notes(
      @RequestParam(defaultValue = "1") @Min(1) @Max(100000) int page) {
    return ApiResponse.success(repository.notes(page));
  }

  @PostMapping("/guestbook")
  public ApiResponse<Void> add(
      @Valid @RequestBody NoteInput input, jakarta.servlet.http.HttpServletRequest request) {
    if (input.website() != null && !input.website().isBlank()) return ApiResponse.success(null);
    limiter.check("note-ip:" + request.getRemoteAddr(), 3);
    repository.add(input.content(), input.color());
    return ApiResponse.success(null);
  }

  @GetMapping("/guestbook/highlights")
  public ApiResponse<java.util.List<Note>> highlights(
      @RequestParam(defaultValue = "latest") @Pattern(regexp = "latest|random") String mode) {
    return ApiResponse.success(repository.highlights(mode.equals("random")));
  }

  @GetMapping("/admin/guestbook")
  public ApiResponse<PageResponse<Note>> admin(
      @RequestParam(defaultValue = "1") @Min(1) @Max(100000) int page) {
    return ApiResponse.success(repository.notes(page));
  }

  @DeleteMapping("/admin/guestbook/{id}")
  public ApiResponse<Void> delete(
      @PathVariable @Positive long id, @RequestParam @Min(0) int version) {
    repository.delete(id, version);
    return ApiResponse.success(null);
  }
}
