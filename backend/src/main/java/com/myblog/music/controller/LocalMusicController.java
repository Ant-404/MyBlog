package com.myblog.music.controller;

import com.myblog.common.api.ApiResponse;
import com.myblog.music.service.LocalMusicService;
import com.myblog.music.service.LocalMusicService.Settings;
import java.io.IOException;
import java.nio.file.*;
import org.springframework.core.io.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class LocalMusicController {
  private final LocalMusicService service;

  public LocalMusicController(LocalMusicService service) {
    this.service = service;
  }

  public record Edit(String title, String artist, int version) {}

  @GetMapping("/api/v1/music/local")
  public ApiResponse<Settings> list() throws IOException {
    return ApiResponse.success(service.settings());
  }

  @GetMapping("/api/v1/admin/music/local")
  public ApiResponse<Settings> adminList() throws IOException {
    return ApiResponse.success(service.settings(true));
  }

  public record Visibility(int version, boolean hidden) {}

  @PutMapping("/api/v1/admin/music/local/{id}/visibility")
  public ApiResponse<Settings> visibility(@PathVariable long id, @RequestBody Visibility input)
      throws IOException {
    return ApiResponse.success(service.visibility(id, input.version(), input.hidden()));
  }

  @PutMapping("/api/v1/admin/music/local/order")
  public ApiResponse<Settings> order(
      @RequestBody java.util.List<LocalMusicService.TrackVersion> input) throws IOException {
    return ApiResponse.success(service.reorder(input));
  }

  @PostMapping("/api/v1/admin/music/local")
  @ResponseStatus(HttpStatus.CREATED)
  public ApiResponse<Settings> upload(@RequestParam MultipartFile file) throws IOException {
    return ApiResponse.success(service.upload(file));
  }

  @PutMapping("/api/v1/admin/music/local/{id}")
  public ApiResponse<Settings> edit(@PathVariable long id, @RequestBody Edit input)
      throws IOException {
    return ApiResponse.success(service.edit(id, input.title(), input.artist(), input.version()));
  }

  @PostMapping("/api/v1/admin/music/local/{id}/cover")
  public ApiResponse<Settings> cover(
      @PathVariable long id, @RequestParam int version, @RequestParam MultipartFile file)
      throws IOException {
    return ApiResponse.success(service.uploadCover(id, version, file));
  }

  @GetMapping("/api/v1/music/local/{id}/{kind:audio|cover}")
  public ResponseEntity<Resource> resource(@PathVariable long id, @PathVariable String kind)
      throws IOException {
    Path path = service.resource(id, kind.equals("cover"));
    String type = Files.probeContentType(path);
    return ResponseEntity.ok()
        .header("X-Content-Type-Options", "nosniff")
        .cacheControl(CacheControl.noCache())
        .contentType(MediaType.parseMediaType(type == null ? "application/octet-stream" : type))
        .body(new FileSystemResource(path));
  }
}
