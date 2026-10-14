package com.myblog.statistics.service;

import com.myblog.comment.repository.CommentRepository;
import com.myblog.statistics.dto.ReadingStatistics;
import com.myblog.statistics.repository.ReadingRepository;
import jakarta.servlet.http.HttpSession;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class ReadingService {
  private final ReadingRepository repository;
  private final CommentRepository posts;

  public ReadingService(ReadingRepository repository, CommentRepository posts) {
    this.repository = repository;
    this.posts = posts;
  }

  private LocalDate today() {
    return LocalDate.now(ZoneId.of("Asia/Shanghai"));
  }

  public long count(String slug) {
    return repository.count(posts.publicPostId(slug));
  }

  public long record(String slug, HttpSession session) {
    long id = posts.publicPostId(slug);
    var today = today();
    synchronized (session) {
      @SuppressWarnings("unchecked")
      var reads = (Map<Long, LocalDate>) session.getAttribute("articleReads");
      if (reads == null) reads = new LinkedHashMap<>();
      reads.values().removeIf(date -> !date.equals(today));
      if (!today.equals(reads.get(id))) {
        repository.record(id, today);
        reads.put(id, today);
        if (reads.size() > 1000) reads.remove(reads.keySet().iterator().next());
        session.setAttribute("articleReads", reads);
      }
    }
    return repository.count(id);
  }

  public ReadingStatistics statistics() {
    return repository.statistics(today());
  }
}
