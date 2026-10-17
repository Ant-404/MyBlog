package com.myblog.album.dto;

import java.util.List;

public record AlbumResponse(
    long id,
    String title,
    String description,
    String cover,
    int sortOrder,
    boolean visible,
    int version,
    int photoCount,
    List<AlbumWriteRequest.Photo> photos,
    String createdAt,
    List<String> previewImages) {}
