package com.myblog.post.service;

import com.myblog.common.api.PageResponse;
import com.myblog.common.exception.ResourceNotFoundException;
import com.myblog.post.dto.PostDetailResponse;
import com.myblog.post.dto.PostSummaryResponse;
import com.myblog.post.repository.PostRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class PostService {
  private final PostRepository repository;

  public PostService(PostRepository repository) {
    this.repository = repository;
  }

  public PageResponse<PostSummaryResponse> list(
      int page, int size, String keyword, String category, String tag) {
    var items =
        repository.findPage(page, size, keyword.trim(), category.trim(), tag.trim()).stream()
            .map(PostSummaryResponse::from)
            .toList();
    return new PageResponse<>(
        items, repository.count(keyword.trim(), category.trim(), tag.trim()), page, size);
  }

  public PostDetailResponse detail(String slug) {
    return repository
        .findBySlug(slug)
        .map(PostDetailResponse::from)
        .orElseThrow(() -> new ResourceNotFoundException("文章不存在"));
  }

  public com.myblog.post.dto.PostNeighborsResponse neighbors(String slug) {
    var post =
        repository.findBySlug(slug).orElseThrow(() -> new ResourceNotFoundException("文章不存在"));
    return new com.myblog.post.dto.PostNeighborsResponse(
        repository.neighbor(post, true).map(PostSummaryResponse::from).orElse(null),
        repository.neighbor(post, false).map(PostSummaryResponse::from).orElse(null));
  }

  public List<PostSummaryResponse> archives() {
    return repository.findArchives().stream().map(PostSummaryResponse::from).toList();
  }
}
