package com.myblog.showcase.repository;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.myblog.showcase.dto.*;
import java.sql.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class ShowcaseRepository {
  private final JdbcTemplate jdbc;
  private final ObjectMapper mapper;

  public ShowcaseRepository(JdbcTemplate jdbc, ObjectMapper mapper) {
    this.jdbc = jdbc;
    this.mapper = mapper;
  }

  private String filter(boolean admin) {
    return " WHERE section=?"
        + (admin ? "" : " AND visible=TRUE AND published_at<=CURRENT_DATE")
        + " AND (LOWER(title) LIKE ? ESCAPE '!' OR LOWER(summary) LIKE ? ESCAPE '!' OR"
        + " LOWER(content) LIKE ? ESCAPE '!' OR LOWER(technologies) LIKE ? ESCAPE '!')";
  }

  private String keyword(String value) {
    return "%"
        + value.toLowerCase(Locale.ROOT).replace("!", "!!").replace("%", "!%").replace("_", "!_")
        + "%";
  }

  public long count(String section, boolean admin, String query) {
    String term = keyword(query);
    return jdbc.queryForObject(
        "SELECT COUNT(*) FROM showcase_entries" + filter(admin),
        Long.class,
        section,
        term,
        term,
        term,
        term);
  }

  public List<ShowcaseResponse> list(
      String section, boolean admin, String query, int page, int size) {
    String term = keyword(query);
    return jdbc.query(
        "SELECT * FROM showcase_entries"
            + filter(admin)
            + " ORDER BY sort_order,published_at DESC,id DESC LIMIT ? OFFSET ?",
        (rs, n) -> map(rs, admin),
        section,
        term,
        term,
        term,
        term,
        size,
        (page - 1) * size);
  }

  public Optional<ShowcaseResponse> find(String section, long id, boolean admin) {
    return jdbc
        .query(
            "SELECT * FROM showcase_entries WHERE section=? AND id=?"
                + (admin ? "" : " AND visible=TRUE AND published_at<=CURRENT_DATE"),
            (rs, n) -> map(rs, admin),
            section,
            id)
        .stream()
        .findFirst();
  }

  private ShowcaseResponse map(ResultSet rs, boolean admin) throws SQLException {
    long id = rs.getLong("id");
    List<String> technologies;
    try {
      technologies =
          mapper.readValue(rs.getString("technologies"), new TypeReference<List<String>>() {});
    } catch (Exception e) {
      throw new IllegalStateException("技术栈数据不可读取", e);
    }
    var images =
        jdbc.query(
            "SELECT url FROM showcase_images WHERE entry_id=? ORDER BY sort_order",
            (row, n) -> row.getString(1),
            id);
    var posts =
        jdbc.query(
            "SELECT p.id,p.title,p.slug,p.status,p.published_at FROM showcase_posts sp JOIN posts p"
                + " ON p.id=sp.post_id WHERE sp.entry_id=?"
                + (admin ? "" : " AND p.status='PUBLISHED' AND p.published_at<=CURRENT_DATE")
                + " ORDER BY sp.sort_order",
            (row, n) ->
                new ShowcaseResponse.LinkedPost(
                    row.getLong("id"),
                    row.getString("title"),
                    row.getString("slug"),
                    row.getString("status").equals("PUBLISHED")
                        && !row.getDate("published_at")
                            .toLocalDate()
                            .isAfter(
                                java.time.LocalDate.now(java.time.ZoneId.of("Asia/Shanghai")))),
            id);
    return new ShowcaseResponse(
        id,
        rs.getString("section"),
        rs.getString("title"),
        rs.getString("summary"),
        rs.getString("content"),
        rs.getString("cover"),
        rs.getString("status"),
        technologies,
        rs.getString("source_url"),
        rs.getString("demo_url"),
        images,
        posts,
        rs.getDate("published_at").toLocalDate(),
        rs.getInt("sort_order"),
        rs.getBoolean("visible"),
        rs.getInt("version"));
  }

  private String technologyJson(List<String> values) {
    try {
      return mapper.writeValueAsString(values);
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  public long create(String section, ShowcaseWriteRequest input) {
    var key = new GeneratedKeyHolder();
    jdbc.update(
        connection -> {
          var statement =
              connection.prepareStatement(
                  "INSERT INTO"
                      + " showcase_entries(section,title,summary,content,cover,status,technologies,source_url,demo_url,published_at,sort_order,visible)"
                      + " VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                  new String[] {"id"});
          statement.setString(1, section);
          statement.setString(2, input.title());
          statement.setString(3, input.summary());
          statement.setString(4, input.content());
          statement.setString(5, input.cover());
          statement.setString(6, input.status());
          statement.setString(7, technologyJson(input.technologies()));
          statement.setString(8, input.sourceUrl());
          statement.setString(9, input.demoUrl());
          statement.setDate(10, java.sql.Date.valueOf(input.publishedAt()));
          statement.setInt(11, input.sortOrder());
          statement.setBoolean(12, input.visible());
          return statement;
        },
        key);
    return Objects.requireNonNull(key.getKey()).longValue();
  }

  public int update(String section, long id, ShowcaseWriteRequest input) {
    return jdbc.update(
        "UPDATE showcase_entries SET"
            + " title=?,summary=?,content=?,cover=?,status=?,technologies=?,source_url=?,demo_url=?,published_at=?,sort_order=?,visible=?,version=version+1,updated_at=CURRENT_TIMESTAMP"
            + " WHERE section=? AND id=? AND version=?",
        input.title(),
        input.summary(),
        input.content(),
        input.cover(),
        input.status(),
        technologyJson(input.technologies()),
        input.sourceUrl(),
        input.demoUrl(),
        input.publishedAt(),
        input.sortOrder(),
        input.visible(),
        section,
        id,
        input.version());
  }

  public boolean postsExist(List<Long> ids) {
    if (ids.isEmpty()) return true;
    return jdbc.queryForObject(
            "SELECT COUNT(*) FROM posts WHERE id IN ("
                + String.join(",", Collections.nCopies(ids.size(), "?"))
                + ")",
            Long.class,
            ids.toArray())
        == ids.size();
  }

  public void replaceLinks(long id, ShowcaseWriteRequest input) {
    jdbc.update("DELETE FROM showcase_posts WHERE entry_id=?", id);
    jdbc.update("DELETE FROM showcase_images WHERE entry_id=?", id);
    for (int i = 0; i < input.postIds().size(); i++)
      jdbc.update(
          "INSERT INTO showcase_posts(entry_id,post_id,sort_order) VALUES (?,?,?)",
          id,
          input.postIds().get(i),
          i);
    for (int i = 0; i < input.images().size(); i++)
      jdbc.update(
          "INSERT INTO showcase_images(entry_id,sort_order,url) VALUES (?,?,?)",
          id,
          i,
          input.images().get(i));
  }

  public int delete(String section, long id, int version) {
    return jdbc.update(
        "DELETE FROM showcase_entries WHERE section=? AND id=? AND version=?",
        section,
        id,
        version);
  }

  public List<String> publicPaths() {
    return jdbc.query(
        "SELECT section,id FROM showcase_entries WHERE visible=TRUE AND published_at<=CURRENT_DATE"
            + " AND section<>'moments'",
        (rs, n) -> "/" + rs.getString("section") + "/" + rs.getLong("id"));
  }
}
