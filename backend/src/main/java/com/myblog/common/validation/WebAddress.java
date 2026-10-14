package com.myblog.common.validation;

import com.myblog.common.exception.InvalidInputException;
import java.net.URI;

public final class WebAddress {
  private WebAddress() {}

  public static String http(String value) {
    try {
      var uri = URI.create(value.trim());
      if (!("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))
          || uri.getHost() == null
          || uri.getUserInfo() != null
          || value.contains("\\")) throw new IllegalArgumentException();
      return value.trim();
    } catch (IllegalArgumentException e) {
      throw new InvalidInputException("请输入有效的 HTTP/HTTPS 地址");
    }
  }

  public static String image(String value) {
    String url = value.trim();
    if (url.isEmpty()) return url;
    if (url.startsWith("/")
        && !url.startsWith("//")
        && !url.contains("\\")
        && url.chars().noneMatch(Character::isISOControl)) return url;
    return http(url);
  }
}
