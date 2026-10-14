package com.myblog.friend.service;

import com.myblog.friend.dto.FriendResponse;
import com.myblog.friend.repository.FriendRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class FriendService {
  private final FriendRepository repository;

  public FriendService(FriendRepository repository) {
    this.repository = repository;
  }

  public List<FriendResponse> list() {
    return repository.findVisible();
  }
}
