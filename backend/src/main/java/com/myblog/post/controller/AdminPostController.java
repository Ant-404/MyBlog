package com.myblog.post.controller;

import com.myblog.common.api.*;
import com.myblog.post.dto.*;
import com.myblog.post.service.AdminPostService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/posts")
public class AdminPostController {
  private final AdminPostService service;

  public AdminPostController(AdminPostService service) {
    this.service = service;
  }

  @GetMapping
  public ApiResponse<PageResponse<AdminPostSummaryResponse>> list(
      @RequestParam(defaultValue = "1") @Min(1) @Max(100000) int page,
      @RequestParam(defaultValue = "10") @Min(1) @Max(100) int size,
      @RequestParam(defaultValue = "") @Size(max = 100) String keyword,
      @RequestParam(defaultValue = "") @Pattern(regexp = "|DRAFT|PUBLISHED") String status) {
    return ApiResponse.success(service.list(page, size, keyword, status));
  }

  @GetMapping("/options")
  public ApiResponse<PostOptionsResponse> options() {
    return ApiResponse.success(service.options());
  }

  @GetMapping("/{id}")
  public ApiResponse<AdminPostDetailResponse> detail(@PathVariable @Min(1) long id) {
    return ApiResponse.success(AdminPostDetailResponse.from(service.detail(id)));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<AdminPostDetailResponse>> create(
      @Valid @RequestBody PostWriteRequest input) {
    return ResponseEntity.status(201)
        .body(ApiResponse.success(AdminPostDetailResponse.from(service.create(input))));
  }

  @PutMapping("/{id}")
  public ApiResponse<AdminPostDetailResponse> update(
      @PathVariable @Min(1) long id, @Valid @RequestBody PostWriteRequest input) {
    return ApiResponse.success(AdminPostDetailResponse.from(service.update(id, input)));
  }

  @PatchMapping("/{id}/state")
  public ApiResponse<AdminPostDetailResponse> state(
      @PathVariable @Min(1) long id, @Valid @RequestBody PostStateRequest input) {
    return ApiResponse.success(AdminPostDetailResponse.from(service.state(id, input)));
  }

  @DeleteMapping("/{id}")
  public ApiResponse<Void> delete(
      @PathVariable @Min(1) long id, @RequestParam @Min(0) int version) {
    service.delete(id, version);
    return ApiResponse.success(null);
  }
}
