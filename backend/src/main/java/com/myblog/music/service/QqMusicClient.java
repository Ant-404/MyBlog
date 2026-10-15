package com.myblog.music.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myblog.common.exception.*;
import com.myblog.common.validation.WebAddress;
import com.myblog.music.dto.MusicTrack;
import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class QqMusicClient {
  private final RestClient client;
  private final ObjectMapper mapper;
  private final String endpoint;

  public QqMusicClient(
      RestClient.Builder builder,
      ObjectMapper mapper,
      @Value("${blog.music.meting-api}") String endpoint) {
    this.mapper = mapper;
    this.endpoint = WebAddress.http(endpoint);
    var factory =
        new JdkClientHttpRequestFactory(
            HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .followRedirects(HttpClient.Redirect.NEVER)
                .build());
    factory.setReadTimeout(Duration.ofSeconds(12));
    this.client = builder.requestFactory(factory).build();
  }

  public static String playlistId(String input) {
    String value = input.trim();
    if (value.matches("[1-9][0-9]{0,19}")) return value;
    try {
      var uri = URI.create(WebAddress.http(value));
      if (!qqHost(uri.getHost())) throw new IllegalArgumentException();
      var pathMatch = Pattern.compile("/playlist/([1-9][0-9]{0,19})(?:/|$)").matcher(uri.getPath());
      if (pathMatch.find()) return pathMatch.group(1);
      var queryMatch =
          Pattern.compile("(?:^|&)(?:id|disstid|tid)=([1-9][0-9]{0,19})(?:&|$)")
              .matcher(uri.getRawQuery() == null ? "" : uri.getRawQuery());
      if (queryMatch.find()) return queryMatch.group(1);
    } catch (IllegalArgumentException ignored) {
    }
    throw new InvalidInputException(
        "请输入 QQ 音乐歌单 ID，或包含 playlist/、id=、disstid= 的完整歌单链接；短分享链接请先在浏览器打开再复制");
  }

  public static String profile(String value) {
    if (value.isBlank()) return "";
    String url = WebAddress.http(value);
    if (!qqHost(URI.create(url).getHost()))
      throw new InvalidInputException("主页地址应为 QQ 音乐的 qq.com 链接");
    return url;
  }

  private static boolean qqHost(String host) {
    return host != null
        && (host.equalsIgnoreCase("qq.com")
            || host.toLowerCase(java.util.Locale.ROOT).endsWith(".qq.com"));
  }

  public List<MusicTrack> tracks(String playlistId) {
    try {
      var uri =
          org.springframework.web.util.UriComponentsBuilder.fromUriString(endpoint)
              .queryParam("server", "tencent")
              .queryParam("type", "playlist")
              .queryParam("id", playlistId)
              .build()
              .toUri();
      return client
          .get()
          .uri(uri)
          .exchange(
              (request, response) -> {
                if (!response.getStatusCode().is2xxSuccessful())
                  throw new ExternalServiceException("歌单解析服务暂时不可用，请稍后重试");
                byte[] body = response.getBody().readNBytes(2_000_001);
                if (body.length > 2_000_000) throw new ExternalServiceException("歌单响应过大，请使用较小的歌单");
                var rows = mapper.readTree(body);
                if (rows == null || !rows.isArray())
                  throw new ExternalServiceException("歌单解析服务返回格式异常，请稍后重试");
                List<MusicTrack> result = new ArrayList<>();
                for (var row : rows) {
                  if (result.size() >= 100) break;
                  try {
                    String title = row.path("title").asText("").trim();
                    String artist = row.path("author").asText("").trim();
                    String audio = WebAddress.http(row.path("url").asText(""));
                    String cover = WebAddress.image(row.path("pic").asText(""));
                    if (title.isEmpty()
                        || title.length() > 300
                        || artist.length() > 300
                        || audio.length() > 2000
                        || cover.length() > 2000) continue;
                    result.add(
                        new MusicTrack(
                            0,
                            title,
                            artist,
                            audio,
                            cover,
                            "https://y.qq.com/n/ryqq/playlist/" + playlistId));
                  } catch (InvalidInputException ignored) {
                  }
                }
                if (result.isEmpty())
                  throw new ExternalServiceException("没有获取到可用歌曲。请确认歌单为公开，且链接或 ID 正确");
                return List.copyOf(result);
              });
    } catch (ExternalServiceException exception) {
      throw exception;
    } catch (Exception exception) {
      throw new ExternalServiceException("QQ 歌单解析请求失败，请检查网络或配置的 Meting 服务后重试；原歌单保持不变");
    }
  }
}
