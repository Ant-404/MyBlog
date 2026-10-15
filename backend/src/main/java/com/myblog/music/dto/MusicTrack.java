package com.myblog.music.dto;

public record MusicTrack(
    long id, String title, String artist, String audioUrl, String cover, String sourceUrl) {}
