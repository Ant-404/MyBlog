package com.myblog.site.controller;

import com.myblog.common.api.ApiResponse;
import com.myblog.site.dto.SiteStatsResponse;
import com.myblog.site.service.SiteService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/site")
public class SiteController {
  private final SiteService service;

  public SiteController(SiteService service) {
    this.service = service;
  }

  @GetMapping("/stats")
  public ApiResponse<SiteStatsResponse> stats() {
    return ApiResponse.success(service.stats());
  }
}
