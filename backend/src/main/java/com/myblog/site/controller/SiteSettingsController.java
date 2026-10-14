package com.myblog.site.controller;

import com.myblog.common.api.ApiResponse;
import com.myblog.site.dto.SiteSettings;
import com.myblog.site.service.SiteSettingsService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
public class SiteSettingsController {
  private final SiteSettingsService service;

  public SiteSettingsController(SiteSettingsService service) {
    this.service = service;
  }

  @GetMapping({"/api/v1/site/settings", "/api/v1/admin/settings"})
  public ApiResponse<SiteSettings> get() {
    return ApiResponse.success(service.get());
  }

  @PutMapping("/api/v1/admin/settings")
  public ApiResponse<SiteSettings> update(@Valid @RequestBody SiteSettings settings) {
    return ApiResponse.success(service.update(settings));
  }
}
