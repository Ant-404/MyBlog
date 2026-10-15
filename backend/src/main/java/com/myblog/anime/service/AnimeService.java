package com.myblog.anime.service;

import com.myblog.anime.dto.*;
import com.myblog.anime.repository.AnimeRepository;
import com.myblog.common.exception.*;
import com.myblog.common.validation.WebAddress;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class AnimeService {
  private final AnimeRepository repository;

  public AnimeService(AnimeRepository repository) {
    this.repository = repository;
  }

  public List<AnimeResponse> list(boolean admin) {
    return repository.list(admin);
  }

  public void save(Long id, AnimeWriteRequest input) {
    if (!Double.isFinite(input.score())
        || (input.totalEpisodes() > 0 && input.watchedEpisodes() > input.totalEpisodes()))
      throw new InvalidInputException("已看集数不能超过总集数，评分需在 0 到 10 之间");
    if (input.status().equals("COMPLETED")
        && (input.totalEpisodes() == 0 || input.watchedEpisodes() != input.totalEpisodes()))
      throw new InvalidInputException("标记看完前，请填写总集数并将已看集数更新为总集数");
    String cover = WebAddress.image(input.cover());
    String source = input.sourceUrl().isBlank() ? "" : WebAddress.http(input.sourceUrl());
    if (id == null) repository.create(input, cover, source);
    else if (repository.update(id, input, cover, source) != 1)
      throw new ConflictException("追番记录已被修改或删除，请刷新后重试");
  }

  public void delete(long id, int version) {
    if (repository.delete(id, version) != 1) throw new ConflictException("追番记录已被修改或删除，请刷新后重试");
  }
}
