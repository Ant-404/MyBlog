package com.myblog.friend.dto;

public record AdminFriendResponse(
    long id,
    String name,
    String description,
    String url,
    int sortOrder,
    boolean visible,
    int version) {}
