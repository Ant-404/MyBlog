package com.myblog.feed.controller;

import com.myblog.feed.service.FeedService;
import javax.xml.stream.XMLStreamException;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
public class FeedController {
  private final FeedService service;

  public FeedController(FeedService service) {
    this.service = service;
  }

  @GetMapping(
      value = {"/rss.xml", "/api/v1/feed.xml"},
      produces = "application/rss+xml;charset=UTF-8")
  public ResponseEntity<String> rss() throws XMLStreamException {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.maxAge(java.time.Duration.ofMinutes(5)))
        .body(service.rss());
  }

  @GetMapping(
      value = {"/sitemap.xml", "/api/v1/sitemap.xml"},
      produces = "application/xml;charset=UTF-8")
  public ResponseEntity<String> sitemap() throws XMLStreamException {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.maxAge(java.time.Duration.ofMinutes(5)))
        .body(service.sitemap());
  }
}
