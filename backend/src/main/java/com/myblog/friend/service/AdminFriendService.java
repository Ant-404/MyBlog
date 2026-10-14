package com.myblog.friend.service;

import com.myblog.common.exception.ConflictException;
import com.myblog.common.validation.WebAddress;
import com.myblog.friend.dto.*;
import com.myblog.friend.repository.AdminFriendRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class AdminFriendService {
  private final AdminFriendRepository repository;

  public AdminFriendService(AdminFriendRepository repository) {
    this.repository = repository;
  }

  public List<AdminFriendResponse> list() {
    return repository.list();
  }

  public void create(FriendWriteRequest input) {
    repository.create(input, WebAddress.http(input.url()));
  }

  public void update(long id, FriendWriteRequest input) {
    if (repository.update(id, input, WebAddress.http(input.url())) != 1)
      throw new ConflictException("友链已被修改或删除，请刷新");
  }

  public void delete(long id, int version) {
    if (repository.delete(id, version) != 1) throw new ConflictException("友链已被修改或删除，请刷新");
  }
}
