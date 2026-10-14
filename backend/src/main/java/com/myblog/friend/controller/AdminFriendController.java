package com.myblog.friend.controller;

import com.myblog.common.api.ApiResponse;
import com.myblog.friend.dto.*;
import com.myblog.friend.service.AdminFriendService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/friends")
public class AdminFriendController {
  private final AdminFriendService service;

  public AdminFriendController(AdminFriendService service) {
    this.service = service;
  }

  @GetMapping
  public ApiResponse<List<AdminFriendResponse>> list() {
    return ApiResponse.success(service.list());
  }

  @PostMapping
  public ApiResponse<Void> create(@Valid @RequestBody FriendWriteRequest input) {
    service.create(input);
    return ApiResponse.success(null);
  }

  @PutMapping("/{id}")
  public ApiResponse<Void> update(
      @PathVariable long id, @Valid @RequestBody FriendWriteRequest input) {
    service.update(id, input);
    return ApiResponse.success(null);
  }

  @DeleteMapping("/{id}")
  public ApiResponse<Void> delete(@PathVariable long id, @RequestParam int version) {
    service.delete(id, version);
    return ApiResponse.success(null);
  }
}
