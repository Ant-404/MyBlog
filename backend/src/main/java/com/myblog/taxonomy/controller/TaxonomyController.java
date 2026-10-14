package com.myblog.taxonomy.controller;

import com.myblog.common.api.ApiResponse;
import com.myblog.taxonomy.dto.TaxonomyResponse;
import com.myblog.taxonomy.service.TaxonomyService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class TaxonomyController {
  private final TaxonomyService service;

  public TaxonomyController(TaxonomyService service) {
    this.service = service;
  }

  @GetMapping("/categories")
  public ApiResponse<List<TaxonomyResponse>> categories() {
    return ApiResponse.success(service.categories());
  }

  @GetMapping("/tags")
  public ApiResponse<List<TaxonomyResponse>> tags() {
    return ApiResponse.success(service.tags());
  }
}
