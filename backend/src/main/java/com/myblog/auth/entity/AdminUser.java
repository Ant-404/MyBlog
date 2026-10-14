package com.myblog.auth.entity;

public record AdminUser(
    long id, String username, String passwordHash, String displayName, boolean enabled) {}
