package com.myblog.admin.controller;

import com.myblog.admin.dto.DashboardResponse;
import com.myblog.admin.service.DashboardService;
import com.myblog.common.api.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminDashboardController {
  private final DashboardService site;

  public AdminDashboardController(DashboardService site) {
    this.site = site;
  }

  @GetMapping("/dashboard")
  public ApiResponse<DashboardResponse> dashboard() {
    return ApiResponse.success(site.overview());
  }
}
