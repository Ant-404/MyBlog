package com.myblog.post.service;

import com.myblog.common.api.PageResponse;
import com.myblog.common.exception.*;
import com.myblog.post.dto.*;
import com.myblog.post.entity.AdminPostEntity;
import com.myblog.post.repository.AdminPostRepository;
import java.net.URI;
import java.util.LinkedHashSet;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AdminPostService {
  private final AdminPostRepository repository;

  public AdminPostService(AdminPostRepository repository) {
    this.repository = repository;
  }

  public PageResponse<AdminPostSummaryResponse> list(
      int page, int size, String keyword, String status) {
    return new PageResponse<>(
        repository.list(page, size, keyword.trim(), status).stream()
            .map(AdminPostSummaryResponse::from)
            .toList(),
        repository.count(keyword.trim(), status),
        page,
        size);
  }

  public AdminPostEntity detail(long id) {
    return repository.find(id).orElseThrow(() -> new ResourceNotFoundException("文章不存在"));
  }

  public PostOptionsResponse options() {
    return repository.options();
  }

  @Transactional
  public AdminPostEntity create(PostWriteRequest input) {
    validate(input);
    long categoryId = repository.categoryId(input.category().trim());
    final long id;
    try {
      id = repository.create(input, categoryId);
    } catch (DuplicateKeyException exception) {
      throw new ConflictException("文章地址已被使用，请换一个 slug");
    }
    saveTags(id, input);
    return detail(id);
  }

  @Transactional
  public AdminPostEntity update(long id, PostWriteRequest input) {
    checkVersion(detail(id), input.version());
    validate(input);
    long categoryId = repository.categoryId(input.category().trim());
    try {
      if (repository.update(id, input, categoryId) != 1) throw stale();
    } catch (DuplicateKeyException exception) {
      throw new ConflictException("文章地址已被使用，请换一个 slug");
    }
    saveTags(id, input);
    return detail(id);
  }

  @Transactional
  public AdminPostEntity state(long id, PostStateRequest input) {
    var post = detail(id);
    checkVersion(post, input.version());
    if (input.status().equals("PUBLISHED") && post.content().isBlank())
      throw new InvalidInputException("请先填写正文，再发布文章");
    if (repository.state(id, input.status(), input.pinned(), input.version()) != 1) throw stale();
    return detail(id);
  }

  @Transactional
  public void delete(long id, int version) {
    checkVersion(detail(id), version);
    if (repository.delete(id, version) != 1) throw stale();
  }

  private void saveTags(long id, PostWriteRequest input) {
    var names = new LinkedHashSet<>(input.tags().stream().map(String::trim).toList());
    repository.replaceTags(id, names.stream().map(repository::tagId).toList());
  }

  private void checkVersion(AdminPostEntity post, int version) {
    if (post.version() != version) throw stale();
  }

  private ConflictException stale() {
    return new ConflictException("文章已被其他操作修改，请重新加载后再编辑");
  }

  private void validate(PostWriteRequest input) {
    if (input.publishedAt().getYear() < 1000 || input.publishedAt().getYear() > 9999)
      throw new InvalidInputException("发布日期须在 1000 年至 9999 年之间");
    if (input.title().trim().isEmpty()
        || input.category().trim().isEmpty()
        || input.tags().stream().anyMatch(tag -> tag.trim().isEmpty()))
      throw new InvalidInputException("标题、分类和标签不能只包含空格");
    if (input.status().equals("PUBLISHED") && input.content().isBlank())
      throw new InvalidInputException("请先填写正文，再发布文章");
    String cover = input.cover().trim();
    if (!cover.isEmpty()) {
      try {
        var uri = URI.create(cover);
        boolean local = cover.startsWith("/") && !cover.startsWith("//") && !cover.contains("\\");
        boolean remote =
            ("http".equals(uri.getScheme()) || "https".equals(uri.getScheme()))
                && uri.getHost() != null
                && uri.getUserInfo() == null;
        if (!local && !remote) throw new IllegalArgumentException();
      } catch (IllegalArgumentException exception) {
        throw new InvalidInputException("封面地址须为站内路径或 HTTP/HTTPS 图片地址");
      }
    }
  }
}
