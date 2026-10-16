package com.myblog.comment.controller;

import com.myblog.comment.dto.*;
import com.myblog.comment.service.CommentService;
import com.myblog.common.api.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
public class CommentController {
  private final CommentService service;

  public CommentController(CommentService service) {
    this.service = service;
  }

  @GetMapping("/api/v1/posts/{slug}/comments")
  public ApiResponse<PageResponse<CommentResponse>> list(
      @PathVariable @Size(max = 160) String slug,
      @RequestParam(defaultValue = "1") @Min(1) @Max(100000) int page) {
    return ApiResponse.success(service.list(slug, page));
  }

  @PostMapping("/api/v1/posts/{slug}/comments")
  @ResponseStatus(HttpStatus.ACCEPTED)
  public ApiResponse<Void> submit(
      @PathVariable @Size(max = 160) String slug,
      @Valid @RequestBody CommentWriteRequest input,
      HttpServletRequest request) {
    service.submit(slug, input, request.getRemoteAddr());
    return ApiResponse.success(null);
  }

  @GetMapping("/api/v1/admin/comments")
  public ApiResponse<PageResponse<AdminCommentResponse>> admin(
      @RequestParam(defaultValue = "1") @Min(1) @Max(100000) int page) {
    return ApiResponse.success(service.adminList(page));
  }

  @DeleteMapping("/api/v1/admin/comments/{id}")
  public ApiResponse<Void> delete(@PathVariable long id, @RequestParam int version) {
    service.delete(id, version);
    return ApiResponse.success(null);
  }
}
