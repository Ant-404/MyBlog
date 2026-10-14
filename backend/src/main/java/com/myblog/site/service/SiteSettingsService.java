package com.myblog.site.service;

import com.myblog.common.exception.ConflictException;
import com.myblog.common.validation.WebAddress;
import com.myblog.site.dto.SiteSettings;
import com.myblog.site.repository.SiteSettingsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SiteSettingsService {
  private final SiteSettingsRepository repository;

  public SiteSettingsService(SiteSettingsRepository repository) {
    this.repository = repository;
  }

  public SiteSettings get() {
    return repository.get();
  }

  @Transactional
  public SiteSettings update(SiteSettings settings) {
    var uri = java.net.URI.create(WebAddress.http(settings.publicUrl()));
    if (uri.getQuery() != null
        || uri.getFragment() != null
        || !(uri.getPath() == null || uri.getPath().isEmpty() || uri.getPath().equals("/")))
      throw new com.myblog.common.exception.InvalidInputException("站点地址应为域名根地址，不包含路径、查询或锚点");
    String url = settings.publicUrl().trim().replaceAll("/+$", "");
    if (repository.update(settings, WebAddress.image(settings.avatar()), url) != 1)
      throw new ConflictException("站点设置已被修改，请重新加载");
    return get();
  }
}
