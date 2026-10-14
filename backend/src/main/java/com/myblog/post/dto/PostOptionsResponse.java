package com.myblog.post.dto;

import java.util.List;

public record PostOptionsResponse(List<String> categories, List<String> tags) {}
