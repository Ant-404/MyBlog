package com.myblog.member.controller;

import com.myblog.common.api.*;
import com.myblog.member.dto.MemberModels.ReportRequest;
import com.myblog.member.repository.CommunityMemberRepository;
import com.myblog.member.repository.CommunityMemberRepository.*;
import com.myblog.member.service.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@Validated
@RequestMapping("/api/v1")
public class MemberCommunityController {
  private final CommunityMemberRepository repository;
  private final MemberService members;
  private final MemberRateLimiter limiter;

  public MemberCommunityController(
      CommunityMemberRepository repository, MemberService members, MemberRateLimiter limiter) {
    this.repository = repository;
    this.members = members;
    this.limiter = limiter;
  }

  @GetMapping("/members/comments")
  public ApiResponse<PageResponse<OwnComment>> comments(
      Authentication authentication,
      @RequestParam(defaultValue = "1") @Min(1) @Max(100000) int page) {
    return ApiResponse.success(
        repository.comments(members.current(authentication).profile().id(), page));
  }

  @DeleteMapping("/members/comments/{id}")
  public ApiResponse<Void> deleteComment(
      Authentication authentication,
      @PathVariable @Positive long id,
      @RequestParam @Min(0) int version) {
    repository.deleteComment(members.current(authentication).profile().id(), id, version);
    return ApiResponse.success(null);
  }

  @GetMapping("/members/notifications")
  public ApiResponse<PageResponse<Notice>> notices(
      Authentication authentication,
      @RequestParam(defaultValue = "1") @Min(1) @Max(100000) int page) {
    return ApiResponse.success(
        repository.notices(members.current(authentication).profile().id(), page));
  }

  @PatchMapping("/members/notifications/{id}")
  public ApiResponse<Void> read(Authentication authentication, @PathVariable @Positive long id) {
    repository.read(members.current(authentication).profile().id(), id);
    return ApiResponse.success(null);
  }

  @PostMapping("/comments/{id}/reports")
  public ApiResponse<Void> report(
      Authentication authentication,
      @PathVariable @Positive long id,
      @Valid @RequestBody ReportRequest input) {
    long member = members.commenter(authentication).id();
    limiter.check("report:" + member, 5);
    repository.report(member, id, input.reason());
    return ApiResponse.success(null);
  }

  @GetMapping("/admin/reports")
  public ApiResponse<PageResponse<Report>> reports(
      @RequestParam(defaultValue = "1") @Min(1) @Max(100000) int page) {
    return ApiResponse.success(repository.reports(page));
  }

  @PatchMapping("/admin/reports/{id}")
  public ApiResponse<Void> resolve(@PathVariable @Positive long id) {
    repository.resolve(id);
    return ApiResponse.success(null);
  }

  public record NoteInput(
      @NotBlank @Size(max = 500) String content,
      @NotNull @Pattern(regexp = "lavender|peach|mint|sky") String color,
      @Size(max = 200) String website) {}

  public record NoteState(
      @NotNull @Pattern(regexp = "PENDING|APPROVED|REJECTED") String status, @Min(0) int version) {}

  @GetMapping("/guestbook")
  public ApiResponse<PageResponse<Note>> notes(
      @RequestParam(defaultValue = "1") @Min(1) @Max(100000) int page) {
    return ApiResponse.success(repository.notes(false, page));
  }

  @PostMapping("/guestbook")
  public ApiResponse<Void> addNote(
      Authentication authentication,
      @Valid @RequestBody NoteInput input,
      jakarta.servlet.http.HttpServletRequest request) {
    Long member =
        authentication != null
                && authentication.getPrincipal()
                    instanceof com.myblog.member.dto.MemberModels.Identity
            ? members.commenter(authentication).id()
            : null;
    if (input.website() != null && !input.website().isBlank()) return ApiResponse.success(null);
    limiter.check("note-ip:" + request.getRemoteAddr(), 3);
    if (member != null) limiter.check("note:" + member, 3);
    repository.addNote(member, input.content(), input.color());
    return ApiResponse.success(null);
  }

  @DeleteMapping("/members/guestbook/{id}")
  public ApiResponse<Void> removeNote(
      Authentication authentication,
      @PathVariable @Positive long id,
      @RequestParam @Min(0) int version) {
    repository.deleteNote(members.current(authentication).profile().id(), id, version);
    return ApiResponse.success(null);
  }

  @GetMapping("/members/guestbook")
  public ApiResponse<PageResponse<Note>> ownNotes(
      Authentication authentication,
      @RequestParam(defaultValue = "1") @Min(1) @Max(100000) int page) {
    return ApiResponse.success(
        repository.notes(false, page, members.current(authentication).profile().id()));
  }

  @GetMapping("/admin/guestbook")
  public ApiResponse<PageResponse<Note>> adminNotes(
      @RequestParam(defaultValue = "1") @Min(1) @Max(100000) int page) {
    return ApiResponse.success(repository.notes(true, page));
  }

  @PatchMapping("/admin/guestbook/{id}")
  public ApiResponse<Void> noteState(
      @PathVariable @Positive long id, @Valid @RequestBody NoteState input) {
    repository.noteState(id, input.status(), input.version());
    return ApiResponse.success(null);
  }

  @DeleteMapping("/admin/guestbook/{id}")
  public ApiResponse<Void> deleteNote(
      @PathVariable @Positive long id, @RequestParam @Min(0) int version) {
    repository.deleteNote(null, id, version);
    return ApiResponse.success(null);
  }
}
