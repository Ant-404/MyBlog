package com.myblog.album.service;

import com.myblog.album.dto.*;
import com.myblog.album.repository.AlbumRepository;
import com.myblog.common.exception.*;
import com.myblog.common.validation.WebAddress;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AlbumService {
  private final AlbumRepository repository;

  public AlbumService(AlbumRepository repository) {
    this.repository = repository;
  }

  public List<AlbumResponse> list(boolean admin, String keyword) {
    return repository.list(admin, keyword);
  }

  @Transactional(
      readOnly = true,
      isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
  public AlbumResponse detail(long id, boolean admin) {
    return repository.detail(id, admin);
  }

  @Transactional
  public AlbumResponse save(Long id, AlbumWriteRequest input) {
    String cover = WebAddress.image(input.cover());
    var photos =
        input.photos().stream()
            .map(p -> new AlbumWriteRequest.Photo(WebAddress.image(p.url()), p.caption()))
            .toList();
    if (photos.stream().anyMatch(p -> p.url().isBlank()))
      throw new InvalidInputException("照片地址不能为空");
    if (id == null) id = repository.create(input, cover);
    else if (repository.update(id, input, cover) != 1)
      throw new ConflictException("相册已被修改或删除，请保留输入并刷新后重试");
    repository.photos(id, photos);
    return repository.detail(id, true);
  }

  @Transactional
  public void delete(long id, int version) {
    if (repository.delete(id, version) != 1) throw new ConflictException("相册已被修改或删除，请刷新后重试");
  }
}
