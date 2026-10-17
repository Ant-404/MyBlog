package com.myblog.album.controller;

import com.myblog.album.dto.*;
import com.myblog.album.service.AlbumService;
import com.myblog.common.api.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@Validated
public class AlbumController {
  private final AlbumService service;

  public AlbumController(AlbumService service) {
    this.service = service;
  }

  @GetMapping("/api/v1/albums")
  public ApiResponse<List<AlbumResponse>> list(
      @RequestParam(defaultValue = "") @Size(max = 100) String keyword) {
    return ApiResponse.success(service.list(false, keyword));
  }

  @GetMapping("/api/v1/albums/{id}")
  public ApiResponse<AlbumResponse> detail(@PathVariable long id) {
    return ApiResponse.success(service.detail(id, false));
  }

  @GetMapping("/api/v1/admin/albums")
  public ApiResponse<List<AlbumResponse>> adminList() {
    return ApiResponse.success(service.list(true, ""));
  }

  @GetMapping("/api/v1/admin/albums/{id}")
  public ApiResponse<AlbumResponse> adminDetail(@PathVariable long id) {
    return ApiResponse.success(service.detail(id, true));
  }

  @PostMapping("/api/v1/admin/albums")
  public ApiResponse<AlbumResponse> create(@Valid @RequestBody AlbumWriteRequest input) {
    return ApiResponse.success(service.save(null, input));
  }

  @PutMapping("/api/v1/admin/albums/{id}")
  public ApiResponse<AlbumResponse> update(
      @PathVariable long id, @Valid @RequestBody AlbumWriteRequest input) {
    return ApiResponse.success(service.save(id, input));
  }

  @DeleteMapping("/api/v1/admin/albums/{id}")
  public ApiResponse<Void> delete(@PathVariable long id, @RequestParam int version) {
    service.delete(id, version);
    return ApiResponse.success(null);
  }
}
