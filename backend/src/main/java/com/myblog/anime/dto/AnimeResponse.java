package com.myblog.anime.dto;

public record AnimeResponse(
    long id,
    String title,
    String cover,
    String status,
    int watchedEpisodes,
    int totalEpisodes,
    double score,
    String note,
    String sourceUrl,
    int sortOrder,
    boolean visible,
    int version) {}
