package com.myblog.anime.controller;

import com.myblog.anime.dto.*;
import com.myblog.anime.service.AnimeService;
import com.myblog.common.api.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
public class AnimeController {
  private final AnimeService service;

  public AnimeController(AnimeService service) {
    this.service = service;
  }

  @GetMapping("/api/v1/anime")
  public ApiResponse<List<AnimeResponse>> publicList() {
    return ApiResponse.success(service.list(false));
  }

  @GetMapping("/api/v1/admin/anime")
  public ApiResponse<List<AnimeResponse>> adminList() {
    return ApiResponse.success(service.list(true));
  }

  @PostMapping("/api/v1/admin/anime")
  public ApiResponse<Void> create(@Valid @RequestBody AnimeWriteRequest input) {
    service.save(null, input);
    return ApiResponse.success(null);
  }

  @PutMapping("/api/v1/admin/anime/{id}")
  public ApiResponse<Void> update(
      @PathVariable long id, @Valid @RequestBody AnimeWriteRequest input) {
    service.save(id, input);
    return ApiResponse.success(null);
  }

  @DeleteMapping("/api/v1/admin/anime/{id}")
  public ApiResponse<Void> delete(@PathVariable long id, @RequestParam int version) {
    service.delete(id, version);
    return ApiResponse.success(null);
  }
}
