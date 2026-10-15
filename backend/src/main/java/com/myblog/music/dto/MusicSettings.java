package com.myblog.music.dto;

import java.util.List;

public record MusicSettings(
    String playlistId,
    String name,
    String profileUrl,
    boolean enabled,
    int version,
    List<MusicTrack> tracks) {}
