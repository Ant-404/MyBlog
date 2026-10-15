package com.myblog.feed.service;

import com.myblog.post.repository.PostRepository;
import com.myblog.showcase.repository.ShowcaseRepository;
import com.myblog.site.service.SiteSettingsService;
import java.io.StringWriter;
import java.time.*;
import java.time.format.DateTimeFormatter;
import javax.xml.stream.*;
import org.springframework.stereotype.Service;

@Service
public class FeedService {
  private final PostRepository posts;
  private final SiteSettingsService settings;
  private final ShowcaseRepository showcase;

  public FeedService(
      PostRepository posts, SiteSettingsService settings, ShowcaseRepository showcase) {
    this.posts = posts;
    this.settings = settings;
    this.showcase = showcase;
  }

  public String rss() throws XMLStreamException {
    var site = settings.get();
    var output = new StringWriter();
    var xml = XMLOutputFactory.newFactory().createXMLStreamWriter(output);
    xml.writeStartDocument("UTF-8", "1.0");
    xml.writeStartElement("rss");
    xml.writeAttribute("version", "2.0");
    xml.writeStartElement("channel");
    element(xml, "title", site.title());
    element(xml, "link", site.publicUrl());
    element(xml, "description", site.description());
    element(xml, "language", "zh-CN");
    for (var post : posts.findArchives().stream().limit(50).toList()) {
      xml.writeStartElement("item");
      element(xml, "title", post.title());
      String url = site.publicUrl() + "/posts/" + post.slug();
      element(xml, "link", url);
      element(xml, "guid", url);
      element(xml, "description", post.excerpt());
      element(
          xml,
          "pubDate",
          post.publishedAt()
              .atStartOfDay(ZoneId.of("Asia/Shanghai"))
              .format(DateTimeFormatter.RFC_1123_DATE_TIME));
      xml.writeEndElement();
    }
    xml.writeEndElement();
    xml.writeEndElement();
    xml.writeEndDocument();
    xml.close();
    return output.toString();
  }

  public String sitemap() throws XMLStreamException {
    var site = settings.get();
    var output = new StringWriter();
    var xml = XMLOutputFactory.newFactory().createXMLStreamWriter(output);
    xml.writeStartDocument("UTF-8", "1.0");
    xml.writeStartElement("urlset");
    xml.writeDefaultNamespace("http://www.sitemaps.org/schemas/sitemap/0.9");
    for (String path :
        new String[] {
          "/",
          "/archives",
          "/categories",
          "/tags",
          "/anime",
          "/friends",
          "/about",
          "/projects",
          "/series",
          "/guestbook"
        }) {
      xml.writeStartElement("url");
      element(xml, "loc", site.publicUrl() + path);
      xml.writeEndElement();
    }
    for (var post : posts.findArchives()) {
      xml.writeStartElement("url");
      element(xml, "loc", site.publicUrl() + "/posts/" + post.slug());
      xml.writeEndElement();
    }
    for (String path : showcase.publicPaths()) {
      xml.writeStartElement("url");
      element(xml, "loc", site.publicUrl() + path);
      xml.writeEndElement();
    }
    xml.writeEndElement();
    xml.writeEndDocument();
    xml.close();
    return output.toString();
  }

  private void element(XMLStreamWriter xml, String name, String content) throws XMLStreamException {
    var safe = new StringBuilder();
    content
        .codePoints()
        .filter(
            c ->
                c == 9
                    || c == 10
                    || c == 13
                    || (c >= 32 && c <= 0xD7FF)
                    || (c >= 0xE000 && c <= 0xFFFD)
                    || (c >= 0x10000 && c <= 0x10FFFF))
        .forEach(safe::appendCodePoint);
    xml.writeStartElement(name);
    xml.writeCharacters(safe.toString());
    xml.writeEndElement();
  }
}
