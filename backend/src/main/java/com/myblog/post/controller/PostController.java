package com.myblog.post.controller;

import com.myblog.common.api.ApiResponse;
import com.myblog.common.api.PageResponse;
import com.myblog.post.dto.PostDetailResponse;
import com.myblog.post.dto.PostSummaryResponse;
import com.myblog.post.service.PostService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class PostController {
  private final PostService service;

  public PostController(PostService service) {
    this.service = service;
  }

  @GetMapping("/posts")
  public ApiResponse<PageResponse<PostSummaryResponse>> list(
      @RequestParam(defaultValue = "1") @Min(1) @Max(100000) int page,
      @RequestParam(defaultValue = "4") @Min(1) @Max(100) int size,
      @RequestParam(defaultValue = "") @Size(max = 100) String keyword,
      @RequestParam(defaultValue = "") @Size(max = 64) String category,
      @RequestParam(defaultValue = "") @Size(max = 64) String tag) {
    return ApiResponse.success(service.list(page, size, keyword, category, tag));
  }

  @GetMapping("/posts/{slug}")
  public ApiResponse<PostDetailResponse> detail(@PathVariable @Size(max = 160) String slug) {
    return ApiResponse.success(service.detail(slug));
  }

  @GetMapping("/archives")
  public ApiResponse<List<PostSummaryResponse>> archives() {
    return ApiResponse.success(service.archives());
  }

  @GetMapping("/posts/{slug}/neighbors")
  public ApiResponse<com.myblog.post.dto.PostNeighborsResponse> neighbors(
      @PathVariable @Size(max = 160) String slug) {
    return ApiResponse.success(service.neighbors(slug));
  }
}
