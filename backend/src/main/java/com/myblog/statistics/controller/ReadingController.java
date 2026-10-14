package com.myblog.statistics.controller;

import com.myblog.common.api.ApiResponse;
import com.myblog.statistics.dto.ReadingStatistics;
import com.myblog.statistics.service.ReadingService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.*;

@RestController
public class ReadingController {
  private final ReadingService service;

  public ReadingController(ReadingService service) {
    this.service = service;
  }

  @GetMapping("/api/v1/posts/{slug}/view")
  public ApiResponse<Long> count(@PathVariable @Size(max = 160) String slug) {
    return ApiResponse.success(service.count(slug));
  }

  @PostMapping("/api/v1/posts/{slug}/view")
  public ApiResponse<Long> record(
      @PathVariable @Size(max = 160) String slug, HttpServletRequest request) {
    return ApiResponse.success(service.record(slug, request.getSession()));
  }

  @GetMapping("/api/v1/admin/statistics")
  public ApiResponse<ReadingStatistics> statistics() {
    return ApiResponse.success(service.statistics());
  }
}
