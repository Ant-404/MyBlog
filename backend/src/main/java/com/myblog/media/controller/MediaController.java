package com.myblog.media.controller;

import com.myblog.common.api.ApiResponse;
import com.myblog.media.dto.MediaResponse;
import com.myblog.media.service.MediaService;
import java.io.IOException;
import java.util.List;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@org.springframework.validation.annotation.Validated
public class MediaController {
  private final MediaService service;
  private final com.myblog.guestbook.GuestbookRateLimiter uploadLimiter;

  public MediaController(
      MediaService service, com.myblog.guestbook.GuestbookRateLimiter uploadLimiter) {
    this.service = service;
    this.uploadLimiter = uploadLimiter;
  }

  @PostMapping("/api/v1/comments/images")
  @ResponseStatus(HttpStatus.CREATED)
  public ApiResponse<MediaResponse> commentImage(
      @RequestParam("file") MultipartFile file, jakarta.servlet.http.HttpServletRequest request)
      throws IOException {
    uploadLimiter.check("comment-image:" + request.getRemoteAddr(), 10);
    return ApiResponse.success(service.upload(file));
  }

  @GetMapping("/api/v1/admin/media")
  public ApiResponse<List<MediaResponse>> list() {
    return ApiResponse.success(service.list());
  }

  @GetMapping("/api/v1/admin/media/page")
  public ApiResponse<com.myblog.common.api.PageResponse<MediaResponse>> page(
      @RequestParam(defaultValue = "1")
          @jakarta.validation.constraints.Min(1)
          @jakarta.validation.constraints.Max(100000)
          int page,
      @RequestParam(defaultValue = "") @jakarta.validation.constraints.Size(max = 100)
          String keyword) {
    return ApiResponse.success(service.page(page, keyword));
  }

  @PostMapping("/api/v1/admin/media")
  @ResponseStatus(HttpStatus.CREATED)
  public ApiResponse<MediaResponse> upload(@RequestParam("file") MultipartFile file)
      throws IOException {
    return ApiResponse.success(service.upload(file));
  }

  @DeleteMapping("/api/v1/admin/media/{id}")
  public ApiResponse<Void> delete(@PathVariable long id) throws IOException {
    service.delete(id);
    return ApiResponse.success(null);
  }

  @GetMapping("/api/v1/media/{filename}")
  public ResponseEntity<Resource> image(@PathVariable String filename) {
    var metadata = service.metadata(filename);
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(metadata.contentType()))
        .header("X-Content-Type-Options", "nosniff")
        .cacheControl(CacheControl.maxAge(java.time.Duration.ofDays(30)))
        .body(service.resource(filename));
  }
}
