package com.myblog.showcase.controller;

import com.myblog.common.api.*;
import com.myblog.showcase.dto.*;
import com.myblog.showcase.service.ShowcaseService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@Validated
@RequestMapping("/api/v1")
public class ShowcaseController {
  private final ShowcaseService service;

  public ShowcaseController(ShowcaseService service) {
    this.service = service;
  }

  @GetMapping("/{section:projects|series|moments}")
  public ApiResponse<PageResponse<ShowcaseResponse>> list(
      @PathVariable String section,
      @RequestParam(defaultValue = "1") @Min(1) @Max(100000) int page,
      @RequestParam(defaultValue = "12") @Min(1) @Max(50) int size,
      @RequestParam(defaultValue = "") @Size(max = 100) String keyword) {
    return ApiResponse.success(service.list(section, false, keyword, page, size));
  }

  @GetMapping("/{section:projects|series}/{id}")
  public ApiResponse<ShowcaseResponse> detail(
      @PathVariable String section, @PathVariable @Positive long id) {
    return ApiResponse.success(service.find(section, id, false));
  }

  @GetMapping("/admin/{section:projects|series|moments}")
  public ApiResponse<PageResponse<ShowcaseResponse>> adminList(
      @PathVariable String section,
      @RequestParam(defaultValue = "1") @Min(1) @Max(100000) int page,
      @RequestParam(defaultValue = "12") @Min(1) @Max(50) int size,
      @RequestParam(defaultValue = "") @Size(max = 100) String keyword) {
    return ApiResponse.success(service.list(section, true, keyword, page, size));
  }

  @PostMapping("/admin/{section:projects|series|moments}")
  public ApiResponse<ShowcaseResponse> create(
      @PathVariable String section, @Valid @RequestBody ShowcaseWriteRequest input) {
    return ApiResponse.success(service.save(section, null, input));
  }

  @PutMapping("/admin/{section:projects|series|moments}/{id}")
  public ApiResponse<ShowcaseResponse> update(
      @PathVariable String section,
      @PathVariable @Positive long id,
      @Valid @RequestBody ShowcaseWriteRequest input) {
    return ApiResponse.success(service.save(section, id, input));
  }

  @DeleteMapping("/admin/{section:projects|series|moments}/{id}")
  public ApiResponse<Void> delete(
      @PathVariable String section,
      @PathVariable @Positive long id,
      @RequestParam @Min(0) int version) {
    service.delete(section, id, version);
    return ApiResponse.success(null);
  }
}
