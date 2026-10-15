package com.myblog.music.service;

import com.myblog.common.exception.*;
import com.myblog.music.dto.*;
import com.myblog.music.repository.MusicRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MusicService {
  private final MusicRepository repository;
  private final QqMusicClient client;

  public MusicService(MusicRepository repository, QqMusicClient client) {
    this.repository = repository;
    this.client = client;
  }

  public MusicSettings settings(boolean admin) {
    return repository.settings(admin);
  }

  @Transactional
  public MusicSettings clear(int version) {
    var previous = repository.settings(true);
    var input = new MusicWriteRequest("", previous.name(), previous.profileUrl(), false, version);
    if (repository.update("", previous.profileUrl(), input) != 1)
      throw new ConflictException("歌单配置已被修改，请刷新后重试");
    repository.replace(java.util.List.of());
    return repository.settings(true);
  }

  @Transactional
  public MusicSettings save(MusicWriteRequest input, boolean importTracks) {
    var previous = repository.settings(true);
    if (previous.version() != input.version()) throw new ConflictException("歌单配置已被修改，请刷新后重试");
    String id = input.playlistId().isBlank() ? "" : QqMusicClient.playlistId(input.playlistId());
    String profile = QqMusicClient.profile(input.profileUrl());
    if (importTracks && id.isEmpty()) throw new InvalidInputException("请先填写 QQ 音乐歌单链接或 ID");
    if (!importTracks && !id.equals(previous.playlistId()))
      throw new InvalidInputException("更换歌单请使用「导入并保存」，以保留歌单和歌曲的一致性");
    var tracks = importTracks ? client.tracks(id) : previous.tracks();
    if (repository.update(id, profile, input) != 1) throw new ConflictException("歌单配置已被修改，请刷新后重试");
    if (importTracks) repository.replace(tracks);
    return repository.settings(true);
  }
}
