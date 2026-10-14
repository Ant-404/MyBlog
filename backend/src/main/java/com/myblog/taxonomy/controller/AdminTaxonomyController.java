package com.myblog.taxonomy.controller;

import com.myblog.common.api.ApiResponse;
import com.myblog.taxonomy.dto.*;
import com.myblog.taxonomy.service.AdminTaxonomyService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/taxonomy/{kind}")
public class AdminTaxonomyController {
  private final AdminTaxonomyService service;

  public AdminTaxonomyController(AdminTaxonomyService service) {
    this.service = service;
  }

  @GetMapping
  public ApiResponse<List<AdminTaxonomyResponse>> list(@PathVariable String kind) {
    return ApiResponse.success(service.list(kind));
  }

  @PostMapping
  public ApiResponse<Void> create(
      @PathVariable String kind, @Valid @RequestBody TaxonomyWriteRequest input) {
    service.create(kind, input);
    return ApiResponse.success(null);
  }

  @PutMapping("/{id}")
  public ApiResponse<Void> update(
      @PathVariable String kind,
      @PathVariable long id,
      @Valid @RequestBody TaxonomyWriteRequest input) {
    service.update(kind, id, input);
    return ApiResponse.success(null);
  }

  @DeleteMapping("/{id}")
  public ApiResponse<Void> delete(
      @PathVariable String kind, @PathVariable long id, @RequestParam int version) {
    service.delete(kind, id, version);
    return ApiResponse.success(null);
  }
}
