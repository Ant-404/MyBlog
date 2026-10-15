package com.myblog.member.service;

import com.myblog.common.exception.TooManyRequestsException;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Component;

@Component
public class MemberRateLimiter {
  private record Window(long start, int count) {}

  private final Map<String, Window> windows = new HashMap<>();

  public synchronized void check(String key, int limit) {
    long now = Instant.now().getEpochSecond();
    windows.entrySet().removeIf(entry -> entry.getValue().start() + 600 <= now);
    if (windows.size() > 10000 && !windows.containsKey(key))
      throw new TooManyRequestsException("请求繁忙，请稍后重试");
    var old = windows.getOrDefault(key, new Window(now, 0));
    if (old.count() >= limit) throw new TooManyRequestsException("操作过于频繁，请十分钟后再试");
    windows.put(key, new Window(old.start(), old.count() + 1));
  }
}
