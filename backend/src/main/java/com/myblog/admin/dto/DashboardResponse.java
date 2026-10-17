package com.myblog.admin.dto;

public record DashboardResponse(
    long posts,
    long categories,
    long tags,
    long drafts,
    long scheduled,
    long albums,
    long photos,
    long comments,
    long notes,
    long media,
    long projects,
    long series,
    long anime) {}
