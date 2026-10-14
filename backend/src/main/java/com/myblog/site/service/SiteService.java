package com.myblog.site.service;

import com.myblog.post.repository.PostRepository;
import com.myblog.site.dto.SiteStatsResponse;
import com.myblog.taxonomy.repository.TaxonomyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class SiteService {
  private final PostRepository posts;
  private final TaxonomyRepository taxonomy;

  public SiteService(PostRepository posts, TaxonomyRepository taxonomy) {
    this.posts = posts;
    this.taxonomy = taxonomy;
  }

  public SiteStatsResponse stats() {
    return new SiteStatsResponse(
        posts.count("", "", ""), taxonomy.categories().size(), taxonomy.tags().size());
  }
}
