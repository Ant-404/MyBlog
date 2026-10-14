package com.myblog.taxonomy.service;

import com.myblog.taxonomy.dto.TaxonomyResponse;
import com.myblog.taxonomy.repository.TaxonomyRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class TaxonomyService {
  private final TaxonomyRepository repository;

  public TaxonomyService(TaxonomyRepository repository) {
    this.repository = repository;
  }

  public List<TaxonomyResponse> categories() {
    return repository.categories();
  }

  public List<TaxonomyResponse> tags() {
    return repository.tags();
  }
}
