package com.myblog.taxonomy.service;

import com.myblog.common.exception.*;
import com.myblog.taxonomy.dto.*;
import com.myblog.taxonomy.repository.AdminTaxonomyRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AdminTaxonomyService {
  private final AdminTaxonomyRepository repository;

  public AdminTaxonomyService(AdminTaxonomyRepository repository) {
    this.repository = repository;
  }

  public List<AdminTaxonomyResponse> list(String kind) {
    return repository.list(kind);
  }

  public void create(String kind, TaxonomyWriteRequest input) {
    repository.create(kind, input.name().trim());
  }

  public void update(String kind, long id, TaxonomyWriteRequest input) {
    if (repository.update(kind, id, input.name().trim(), input.version()) != 1)
      throw new ConflictException("分类或标签已被修改，请刷新列表");
  }

  public void delete(String kind, long id, int version) {
    var item =
        repository.list(kind).stream()
            .filter(value -> value.id() == id)
            .findFirst()
            .orElseThrow(() -> new ResourceNotFoundException("分类或标签不存在"));
    if (item.count() > 0) throw new ConflictException("仍有文章使用该分类或标签，请先修改文章");
    if (repository.delete(kind, id, version) != 1) throw new ConflictException("数据已被修改，请刷新列表");
  }
}
