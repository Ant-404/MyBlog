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
public class MediaController {
  private final MediaService service;

  public MediaController(MediaService service) {
    this.service = service;
  }

  @GetMapping("/api/v1/admin/media")
  public ApiResponse<List<MediaResponse>> list() {
    return ApiResponse.success(service.list());
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
