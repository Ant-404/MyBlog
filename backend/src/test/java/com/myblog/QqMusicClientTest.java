package com.myblog;

import static org.assertj.core.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myblog.common.exception.*;
import com.myblog.music.service.QqMusicClient;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

class QqMusicClientTest {
  @Test
  void acceptsCanonicalQqPlaylistLinksAndRejectsArbitraryHosts() {
    assertThat(QqMusicClient.playlistId("1234567890")).isEqualTo("1234567890");
    assertThat(QqMusicClient.playlistId("https://y.qq.com/n/ryqq/playlist/1234567890"))
        .isEqualTo("1234567890");
    assertThat(
            QqMusicClient.playlistId(
                "https://y.qq.com/n/m/detail/taoge/index.html?id=1234567890&foo=bar"))
        .isEqualTo("1234567890");
    assertThatThrownBy(
            () -> QqMusicClient.playlistId("https://qq.com.evil.example/playlist/1234567890"))
        .isInstanceOf(InvalidInputException.class);
    assertThatThrownBy(() -> QqMusicClient.profile("javascript:alert(1)"))
        .isInstanceOf(InvalidInputException.class);
  }

  @Test
  void parsesMetingResponseSkipsUnsafeSongsAndSendsTencentPlaylistQuery() throws Exception {
    var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext(
        "/meting",
        exchange -> {
          assertThat(exchange.getRequestURI().getRawQuery())
              .contains("server=tencent", "type=playlist", "id=1234567890");
          byte[] bytes =
              """
              [{"title":"可播放歌曲","author":"歌手","url":"https://example.com/test.mp3","pic":"https://example.com/cover.jpg"},
               {"title":"不安全的歌曲","author":"","url":"javascript:alert(1)","pic":""}]
              """
                  .getBytes(StandardCharsets.UTF_8);
          exchange.getResponseHeaders().set("Content-Type", "application/json");
          exchange.sendResponseHeaders(200, bytes.length);
          exchange.getResponseBody().write(bytes);
          exchange.close();
        });
    server.start();
    try {
      var client =
          new QqMusicClient(
              RestClient.builder(),
              new ObjectMapper(),
              "http://127.0.0.1:" + server.getAddress().getPort() + "/meting");
      var tracks = client.tracks("1234567890");
      assertThat(tracks).hasSize(1);
      assertThat(tracks.getFirst().title()).isEqualTo("可播放歌曲");
    } finally {
      server.stop(0);
    }
  }

  @Test
  void invalidUpstreamResponseIsReportedClearly() throws Exception {
    var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext(
        "/meting",
        exchange -> {
          byte[] bytes = "<html>upstream error</html>".getBytes(StandardCharsets.UTF_8);
          exchange.sendResponseHeaders(200, bytes.length);
          exchange.getResponseBody().write(bytes);
          exchange.close();
        });
    server.start();
    try {
      var client =
          new QqMusicClient(
              RestClient.builder(),
              new ObjectMapper(),
              "http://127.0.0.1:" + server.getAddress().getPort() + "/meting");
      assertThatThrownBy(() -> client.tracks("1234567890"))
          .isInstanceOf(ExternalServiceException.class);
    } finally {
      server.stop(0);
    }
  }
}
