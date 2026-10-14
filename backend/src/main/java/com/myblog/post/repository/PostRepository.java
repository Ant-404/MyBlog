package com.myblog.post.repository;

import com.myblog.post.entity.PostEntity;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PostRepository {
  private static final String FIELDS =
      "p.id, p.slug, p.title, p.excerpt, p.cover, c.name AS category, "
          + "p.published_at, p.reading_minutes, p.pinned, ";
  private static final String FROM = " FROM posts p JOIN categories c ON c.id = p.category_id ";
  private static final String PUBLIC = "p.status = 'PUBLISHED' AND p.published_at <= CURRENT_DATE";
  private static final RowMapper<PostEntity> MAPPER =
      (rs, row) ->
          new PostEntity(
              rs.getLong("id"),
              rs.getString("slug"),
              rs.getString("title"),
              rs.getString("excerpt"),
              rs.getString("cover"),
              rs.getString("category"),
              rs.getDate("published_at").toLocalDate(),
              rs.getInt("reading_minutes"),
              rs.getBoolean("pinned"),
              rs.getString("content"),
              List.of());
  private final NamedParameterJdbcTemplate jdbc;

  public PostRepository(NamedParameterJdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<PostEntity> findPage(
      int page, int size, String keyword, String category, String tag) {
    var params =
        parameters(keyword, category, tag)
            .addValue("size", size)
            .addValue("offset", (page - 1) * size);
    var posts =
        jdbc.query(
            "SELECT "
                + FIELDS
                + "'' AS content"
                + FROM
                + filters(keyword, category, tag)
                + " ORDER BY p.pinned DESC, p.published_at DESC, p.id DESC LIMIT :size OFFSET"
                + " :offset",
            params,
            MAPPER);
    return attachTags(posts);
  }

  public long count(String keyword, String category, String tag) {
    return jdbc.queryForObject(
        "SELECT COUNT(*)" + FROM + filters(keyword, category, tag),
        parameters(keyword, category, tag),
        Long.class);
  }

  public Optional<PostEntity> findBySlug(String slug) {
    var posts =
        jdbc.query(
            "SELECT " + FIELDS + "p.content" + FROM + " WHERE " + PUBLIC + " AND p.slug = :slug",
            new MapSqlParameterSource("slug", slug),
            MAPPER);
    return attachTags(posts).stream().findFirst();
  }

  public List<PostEntity> findArchives() {
    return attachTags(
        jdbc.query(
            "SELECT "
                + FIELDS
                + "'' AS content"
                + FROM
                + " WHERE "
                + PUBLIC
                + " ORDER BY p.published_at DESC, p.id DESC",
            Map.of(),
            MAPPER));
  }

  public Optional<PostEntity> neighbor(PostEntity post, boolean older) {
    String operator = older ? "<" : ">", direction = older ? "DESC" : "ASC";
    var params = new MapSqlParameterSource("date", post.publishedAt()).addValue("id", post.id());
    return attachTags(
            jdbc.query(
                "SELECT "
                    + FIELDS
                    + "'' AS content"
                    + FROM
                    + " WHERE "
                    + PUBLIC
                    + " AND (p.published_at "
                    + operator
                    + " :date OR (p.published_at = :date AND p.id "
                    + operator
                    + " :id))"
                    + " ORDER BY p.published_at "
                    + direction
                    + ", p.id "
                    + direction
                    + " LIMIT 1",
                params,
                MAPPER))
        .stream()
        .findFirst();
  }

  private String filters(String keyword, String category, String tag) {
    var sql = new StringBuilder(" WHERE " + PUBLIC);
    if (!keyword.isBlank())
      sql.append(
          " AND (LOWER(p.title) LIKE :keyword ESCAPE '!' OR LOWER(p.excerpt) LIKE :keyword ESCAPE"
              + " '!' OR LOWER(p.content) LIKE :keyword ESCAPE '!')");
    if (!category.isBlank()) sql.append(" AND c.name = :category");
    if (!tag.isBlank())
      sql.append(
          " AND EXISTS (SELECT 1 FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.post_id"
              + " = p.id AND t.name = :tag)");
    return sql.toString();
  }

  private MapSqlParameterSource parameters(String keyword, String category, String tag) {
    String literal =
        keyword
            .toLowerCase(java.util.Locale.ROOT)
            .replace("!", "!!")
            .replace("%", "!%")
            .replace("_", "!_");
    return new MapSqlParameterSource()
        .addValue("keyword", "%" + literal + "%")
        .addValue("category", category)
        .addValue("tag", tag);
  }

  // One batched tag query avoids an additional database request for every post.
  private List<PostEntity> attachTags(List<PostEntity> posts) {
    if (posts.isEmpty()) return posts;
    Map<Long, List<String>> tagsByPost = new LinkedHashMap<>();
    jdbc.query(
        "SELECT pt.post_id, t.name FROM post_tags pt JOIN tags t ON t.id = pt.tag_id "
            + "WHERE pt.post_id IN (:ids) ORDER BY t.id",
        new MapSqlParameterSource("ids", posts.stream().map(PostEntity::id).toList()),
        (org.springframework.jdbc.core.RowCallbackHandler)
            rs ->
                tagsByPost
                    .computeIfAbsent(rs.getLong("post_id"), id -> new ArrayList<>())
                    .add(rs.getString("name")));
    return posts.stream()
        .map(post -> post.withTags(tagsByPost.getOrDefault(post.id(), List.of())))
        .toList();
  }
}
