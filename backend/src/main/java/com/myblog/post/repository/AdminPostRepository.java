package com.myblog.post.repository;

import com.myblog.post.dto.PostOptionsResponse;
import com.myblog.post.dto.PostWriteRequest;
import com.myblog.post.entity.AdminPostEntity;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class AdminPostRepository {
  private static final String FIELDS =
      "p.id, p.slug, p.title, p.excerpt, p.cover, c.name AS category, "
          + "p.published_at, p.reading_minutes, p.pinned, p.status, p.version, p.updated_at, ";
  private static final String FROM = " FROM posts p JOIN categories c ON c.id = p.category_id ";
  private static final RowMapper<AdminPostEntity> MAPPER =
      (rs, row) ->
          new AdminPostEntity(
              rs.getLong("id"),
              rs.getString("slug"),
              rs.getString("title"),
              rs.getString("excerpt"),
              rs.getString("content"),
              rs.getString("cover"),
              rs.getString("category"),
              List.of(),
              rs.getDate("published_at").toLocalDate(),
              rs.getInt("reading_minutes"),
              rs.getBoolean("pinned"),
              rs.getString("status"),
              rs.getInt("version"),
              rs.getTimestamp("updated_at").toLocalDateTime());
  private final JdbcTemplate jdbc;
  private final NamedParameterJdbcTemplate named;

  public AdminPostRepository(JdbcTemplate jdbc, NamedParameterJdbcTemplate named) {
    this.jdbc = jdbc;
    this.named = named;
  }

  public List<AdminPostEntity> list(int page, int size, String keyword, String status) {
    var params =
        parameters(keyword, status).addValue("size", size).addValue("offset", (page - 1) * size);
    return attachTags(
        named.query(
            "SELECT "
                + FIELDS
                + "'' AS content"
                + FROM
                + filter(keyword, status)
                + " ORDER BY p.updated_at DESC, p.id DESC LIMIT :size OFFSET :offset",
            params,
            MAPPER));
  }

  public long count(String keyword, String status) {
    return named.queryForObject(
        "SELECT COUNT(*)" + FROM + filter(keyword, status),
        parameters(keyword, status),
        Long.class);
  }

  public Optional<AdminPostEntity> find(long id) {
    return attachTags(
            jdbc.query("SELECT " + FIELDS + "p.content" + FROM + "WHERE p.id = ?", MAPPER, id))
        .stream()
        .findFirst();
  }

  public long categoryId(String name) {
    return taxonomyId("categories", name);
  }

  public long tagId(String name) {
    return taxonomyId("tags", name);
  }

  private long taxonomyId(String table, String name) {
    // table is selected only by the two private callers, never from HTTP input.
    jdbc.update(
        "INSERT INTO " + table + " (name) VALUES (?) ON DUPLICATE KEY UPDATE id = id", name);
    return jdbc.queryForObject("SELECT id FROM " + table + " WHERE name = ?", Long.class, name);
  }

  public long create(PostWriteRequest input, long categoryId) {
    var keys = new GeneratedKeyHolder();
    jdbc.update(
        connection -> {
          var statement =
              connection.prepareStatement(
                  "INSERT INTO posts (slug, title, excerpt, content, cover, category_id,"
                      + " published_at, reading_minutes, pinned, status) VALUES (?, ?, ?, ?, ?, ?,"
                      + " ?, ?, ?, ?)",
                  new String[] {"id"});
          statement.setString(1, input.slug().trim());
          statement.setString(2, input.title().trim());
          statement.setString(3, input.excerpt().trim());
          statement.setString(4, input.content());
          statement.setString(5, input.cover().trim());
          statement.setLong(6, categoryId);
          statement.setDate(7, java.sql.Date.valueOf(input.publishedAt()));
          statement.setInt(8, input.readingMinutes());
          statement.setBoolean(9, input.pinned());
          statement.setString(10, input.status());
          return statement;
        },
        keys);
    return Objects.requireNonNull(keys.getKey()).longValue();
  }

  public int update(long id, PostWriteRequest input, long categoryId) {
    return jdbc.update(
        "UPDATE posts SET slug = ?, title = ?, excerpt = ?, content = ?, cover = ?, category_id ="
            + " ?, published_at = ?, reading_minutes = ?, pinned = ?, status = ?, updated_at ="
            + " CURRENT_TIMESTAMP, version = version + 1 WHERE id = ? AND version = ?",
        input.slug().trim(),
        input.title().trim(),
        input.excerpt().trim(),
        input.content(),
        input.cover().trim(),
        categoryId,
        java.sql.Date.valueOf(input.publishedAt()),
        input.readingMinutes(),
        input.pinned(),
        input.status(),
        id,
        input.version());
  }

  public int state(long id, String status, boolean pinned, int version) {
    return jdbc.update(
        "UPDATE posts SET status = ?, pinned = ?, updated_at = CURRENT_TIMESTAMP, version = version"
            + " + 1 WHERE id = ? AND version = ?",
        status,
        pinned,
        id,
        version);
  }

  public int delete(long id, int version) {
    return jdbc.update("DELETE FROM posts WHERE id = ? AND version = ?", id, version);
  }

  public void replaceTags(long id, List<Long> tagIds) {
    jdbc.update("DELETE FROM post_tags WHERE post_id = ?", id);
    for (Long tagId : new LinkedHashSet<>(tagIds))
      jdbc.update("INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)", id, tagId);
  }

  public PostOptionsResponse options() {
    return new PostOptionsResponse(
        jdbc.queryForList("SELECT name FROM categories ORDER BY id", String.class),
        jdbc.queryForList("SELECT name FROM tags ORDER BY id", String.class));
  }

  private String filter(String keyword, String status) {
    var sql = new StringBuilder(" WHERE 1 = 1");
    if (!keyword.isBlank())
      sql.append(
          " AND (LOWER(p.title) LIKE :keyword ESCAPE '!' OR LOWER(p.excerpt) LIKE :keyword ESCAPE"
              + " '!')");
    if (!status.isBlank()) sql.append(" AND p.status = :status");
    return sql.toString();
  }

  private MapSqlParameterSource parameters(String keyword, String status) {
    String literal =
        keyword.toLowerCase(Locale.ROOT).replace("!", "!!").replace("%", "!%").replace("_", "!_");
    return new MapSqlParameterSource("keyword", "%" + literal + "%").addValue("status", status);
  }

  private List<AdminPostEntity> attachTags(List<AdminPostEntity> posts) {
    if (posts.isEmpty()) return posts;
    Map<Long, List<String>> tags = new HashMap<>();
    named.query(
        "SELECT pt.post_id, t.name FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE"
            + " pt.post_id IN (:ids) ORDER BY t.id",
        new MapSqlParameterSource("ids", posts.stream().map(AdminPostEntity::id).toList()),
        (org.springframework.jdbc.core.RowCallbackHandler)
            rs ->
                tags.computeIfAbsent(rs.getLong("post_id"), id -> new ArrayList<>())
                    .add(rs.getString("name")));
    return posts.stream()
        .map(post -> post.withTags(tags.getOrDefault(post.id(), List.of())))
        .toList();
  }
}
