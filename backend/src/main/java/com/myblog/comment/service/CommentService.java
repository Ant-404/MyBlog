package com.myblog.comment.service;

import com.myblog.comment.dto.*;
import com.myblog.comment.repository.CommentRepository;
import com.myblog.common.api.PageResponse;
import com.myblog.common.exception.*;
import com.myblog.site.service.SiteSettingsService;
import org.springframework.stereotype.Service;

@Service
public class CommentService {
  private final CommentRepository repository;
  private final SiteSettingsService settings;
  private final CommentRateLimiter limiter;

  public CommentService(
      CommentRepository repository, SiteSettingsService settings, CommentRateLimiter limiter) {
    this.repository = repository;
    this.settings = settings;
    this.limiter = limiter;
  }

  public PageResponse<CommentResponse> list(String slug, int page) {
    long id = repository.publicPostId(slug);
    return new PageResponse<>(repository.list(id, page), repository.count(id), page, 20);
  }

  @org.springframework.transaction.annotation.Transactional
  public void submit(String slug, CommentWriteRequest input, String address) {
    long id = repository.publicPostId(slug);
    if (!settings.get().commentsEnabled()) throw new InvalidInputException("评论暂时关闭");
    if (input.website() != null && !input.website().isBlank())
      return; // Honeypot: bots get the same acknowledgement.
    limiter.check(address);
    String url =
        input.url() == null || input.url().isBlank()
            ? ""
            : com.myblog.common.validation.WebAddress.http(input.url());
    repository.create(id, input, url);
  }

  public PageResponse<AdminCommentResponse> adminList(int page) {
    return new PageResponse<>(repository.adminList(page), repository.adminCount(), page, 20);
  }

  public void delete(long id, int version) {
    if (repository.delete(id, version) != 1) throw new ConflictException("评论已被修改或删除，请刷新");
  }
}
