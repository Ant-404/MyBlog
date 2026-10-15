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
  private final com.myblog.member.service.MemberService members;

  public CommentService(
      CommentRepository repository,
      SiteSettingsService settings,
      CommentRateLimiter limiter,
      com.myblog.member.service.MemberService members) {
    this.repository = repository;
    this.settings = settings;
    this.limiter = limiter;
    this.members = members;
  }

  public PageResponse<CommentResponse> list(String slug, int page) {
    long id = repository.publicPostId(slug);
    return new PageResponse<>(repository.list(id, page), repository.count(id), page, 20);
  }

  @org.springframework.transaction.annotation.Transactional
  public void submit(
      String slug,
      CommentWriteRequest input,
      String address,
      org.springframework.security.core.Authentication authentication) {
    var member =
        authentication != null
                && authentication.getPrincipal()
                    instanceof com.myblog.member.dto.MemberModels.Identity
            ? members.commenter(authentication)
            : null;
    long id = repository.publicPostId(slug);
    if (!settings.get().commentsEnabled()) throw new InvalidInputException("评论暂时关闭");
    if (input.website() != null && !input.website().isBlank())
      return; // Honeypot: bots get the same acknowledgement.
    limiter.check(address);
    if (member != null) limiter.check("member:" + member.id());
    long comment =
        repository.create(
            id,
            input,
            member == null ? null : member.id(),
            member == null ? "匿名用户" : member.nickname());
    if (member != null) repository.notifyReply(comment, "PENDING");
  }

  public PageResponse<AdminCommentResponse> adminList(String status, int page) {
    return new PageResponse<>(
        repository.adminList(status, page), repository.adminCount(status), page, 20);
  }

  @org.springframework.transaction.annotation.Transactional
  public void state(long id, CommentStateRequest input) {
    if (repository.state(id, input) != 1) throw new ConflictException("评论已被修改或删除，请刷新");
    repository.notifyReply(id, input.status());
  }

  public void delete(long id, int version) {
    if (repository.delete(id, version) != 1) throw new ConflictException("评论已被修改或删除，请刷新");
  }
}
