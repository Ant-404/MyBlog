package com.myblog.comment.service;

import com.myblog.common.exception.TooManyRequestsException;
import java.util.*;
import org.springframework.stereotype.Component;

@Component
public class CommentRateLimiter {
  private record Window(long start, int count) {}

  private final Map<String, Window> windows = new HashMap<>();

  public synchronized void check(String address) {
    long now = System.currentTimeMillis();
    windows.entrySet().removeIf(entry -> now - entry.getValue().start() > 600_000);
    var current = windows.get(address);
    if (current != null && current.count() >= 5)
      throw new TooManyRequestsException("评论提交过于频繁，请 10 分钟后重试");
    if (current == null && windows.size() >= 10000)
      throw new TooManyRequestsException("评论服务繁忙，请稍后重试");
    windows.put(
        address,
        current == null ? new Window(now, 1) : new Window(current.start(), current.count() + 1));
  }
}
