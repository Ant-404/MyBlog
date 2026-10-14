package com.myblog.auth.service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class LoginAttemptService {
  private record Attempt(int count, Instant expiresAt) {}

  private final Map<String, Attempt> attempts = new LinkedHashMap<>();

  public synchronized boolean blocked(String key) {
    cleanup();
    var attempt = attempts.get(key);
    return attempt != null && attempt.count() >= 5;
  }

  public synchronized void failed(String key) {
    cleanup();
    var previous = attempts.get(key);
    if (previous == null && attempts.size() >= 1000)
      attempts.remove(attempts.keySet().iterator().next());
    attempts.put(
        key,
        new Attempt(
            previous == null ? 1 : previous.count() + 1,
            previous == null ? Instant.now().plusSeconds(900) : previous.expiresAt()));
  }

  public synchronized void succeeded(String key) {
    attempts.remove(key);
  }

  private void cleanup() {
    attempts.values().removeIf(value -> value.expiresAt().isBefore(Instant.now()));
  }
}
