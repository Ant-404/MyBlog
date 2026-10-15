package com.myblog.music.controller;

import com.myblog.common.api.ApiResponse;
import com.myblog.music.dto.*;
import com.myblog.music.service.MusicService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
public class MusicController {
  private final MusicService service;

  public MusicController(MusicService service) {
    this.service = service;
  }

  @GetMapping("/api/v1/music")
  public ApiResponse<MusicSettings> publicSettings() {
    return ApiResponse.success(service.settings(false));
  }

  @GetMapping("/api/v1/admin/music")
  public ApiResponse<MusicSettings> adminSettings() {
    return ApiResponse.success(service.settings(true));
  }

  @PutMapping("/api/v1/admin/music")
  public ApiResponse<MusicSettings> save(@Valid @RequestBody MusicWriteRequest input) {
    return ApiResponse.success(service.save(input, false));
  }

  @PostMapping("/api/v1/admin/music/import")
  public ApiResponse<MusicSettings> importPlaylist(@Valid @RequestBody MusicWriteRequest input) {
    return ApiResponse.success(service.save(input, true));
  }

  @DeleteMapping("/api/v1/admin/music")
  public ApiResponse<MusicSettings> clear(@RequestParam int version) {
    return ApiResponse.success(service.clear(version));
  }
}
