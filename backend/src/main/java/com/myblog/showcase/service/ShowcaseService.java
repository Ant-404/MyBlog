package com.myblog.showcase.service;

import com.myblog.common.api.PageResponse;
import com.myblog.common.exception.*;
import com.myblog.common.validation.WebAddress;
import com.myblog.showcase.dto.*;
import com.myblog.showcase.repository.ShowcaseRepository;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ShowcaseService {
  private final ShowcaseRepository repository;

  public ShowcaseService(ShowcaseRepository repository) {
    this.repository = repository;
  }

  public PageResponse<ShowcaseResponse> list(
      String section, boolean admin, String keyword, int page, int size) {
    return new PageResponse<>(
        repository.list(section, admin, keyword.trim(), page, size),
        repository.count(section, admin, keyword.trim()),
        page,
        size);
  }

  public ShowcaseResponse find(String section, long id, boolean admin) {
    return repository
        .find(section, id, admin)
        .orElseThrow(() -> new ResourceNotFoundException("内容不存在或尚未公开"));
  }

  @Transactional
  public ShowcaseResponse save(String section, Long id, ShowcaseWriteRequest input) {
    if (!section.equals("moments") && input.title().isBlank())
      throw new InvalidInputException("请填写标题");
    if (section.equals("moments") && (input.content().isBlank() || input.content().length() > 5000))
      throw new InvalidInputException("说说正文需为 1 到 5000 个字符");
    var allowed =
        section.equals("projects")
            ? List.of("IN_PROGRESS", "COMPLETED", "ARCHIVED")
            : section.equals("series") ? List.of("ONGOING", "COMPLETED") : List.of("");
    if (!allowed.contains(input.status())) throw new InvalidInputException("内容状态无效");
    if (new HashSet<>(input.postIds()).size() != input.postIds().size()
        || !repository.postsExist(input.postIds())) throw new InvalidInputException("关联文章不存在或重复");
    if (section.equals("moments") && !input.postIds().isEmpty())
      throw new InvalidInputException("说说不支持关联文章");
    if (!section.equals("projects")
        && (!input.sourceUrl().isBlank()
            || !input.demoUrl().isBlank()
            || !input.technologies().isEmpty())) throw new InvalidInputException("技术栈和项目链接仅用于项目展示");
    if (!section.equals("moments") && !input.images().isEmpty())
      throw new InvalidInputException("多图仅用于说说");
    var normalized =
        new ShowcaseWriteRequest(
            input.title().trim(),
            input.summary().trim(),
            input.content().trim(),
            WebAddress.image(input.cover()),
            input.status(),
            input.technologies().stream().map(String::trim).distinct().toList(),
            input.sourceUrl().isBlank() ? "" : WebAddress.http(input.sourceUrl()),
            input.demoUrl().isBlank() ? "" : WebAddress.http(input.demoUrl()),
            input.images().stream().map(WebAddress::image).toList(),
            input.postIds(),
            input.publishedAt(),
            input.sortOrder(),
            input.visible(),
            input.version());
    long saved;
    if (id == null) saved = repository.create(section, normalized);
    else {
      saved = id;
      if (repository.update(section, id, normalized) != 1)
        throw new ConflictException("内容已被修改或删除，请保留输入并刷新后重试");
    }
    repository.replaceLinks(saved, normalized);
    return find(section, saved, true);
  }

  @Transactional
  public void delete(String section, long id, int version) {
    if (repository.delete(section, id, version) != 1)
      throw new ConflictException("内容已被修改或删除，请刷新后重试");
  }
}
