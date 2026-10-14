package com.myblog.friend.controller;

import com.myblog.common.api.ApiResponse;
import com.myblog.friend.dto.FriendResponse;
import com.myblog.friend.service.FriendService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/friends")
public class FriendController {
  private final FriendService service;

  public FriendController(FriendService service) {
    this.service = service;
  }

  @GetMapping
  public ApiResponse<List<FriendResponse>> list() {
    return ApiResponse.success(service.list());
  }
}
