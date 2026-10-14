package com.myblog.admin.controller;

import com.myblog.common.api.ApiResponse;
import com.myblog.site.dto.SiteStatsResponse;
import com.myblog.site.service.SiteService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminDashboardController {
  private final SiteService site;

  public AdminDashboardController(SiteService site) {
    this.site = site;
  }

  @GetMapping("/dashboard")
  public ApiResponse<SiteStatsResponse> dashboard() {
    return ApiResponse.success(site.stats());
  }
}
