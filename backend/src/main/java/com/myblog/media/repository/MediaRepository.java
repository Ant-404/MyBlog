package com.myblog.media.repository;

import com.myblog.media.dto.MediaResponse;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class MediaRepository {
  private final JdbcTemplate jdbc;

  public MediaRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<MediaResponse> list() {
    return jdbc.query(
        "SELECT * FROM media_files ORDER BY id DESC LIMIT 200",
        (rs, n) ->
            new MediaResponse(
                rs.getLong("id"),
                "/api/v1/media/" + rs.getString("filename"),
                rs.getString("original_name"),
                rs.getString("content_type"),
                rs.getLong("size_bytes"),
                rs.getString("created_at")));
  }

  public com.myblog.common.api.PageResponse<MediaResponse> page(int page, String keyword) {
    String pattern =
        "%" + keyword.trim().replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
    String where = " WHERE LOWER(original_name) LIKE LOWER(?) ESCAPE '!'";
    var items =
        jdbc.query(
            "SELECT * FROM media_files" + where + " ORDER BY id DESC LIMIT 50 OFFSET ?",
            (rs, n) ->
                new MediaResponse(
                    rs.getLong("id"),
                    "/api/v1/media/" + rs.getString("filename"),
                    rs.getString("original_name"),
                    rs.getString("content_type"),
                    rs.getLong("size_bytes"),
                    rs.getString("created_at")),
            pattern,
            (page - 1) * 50);
    long total =
        jdbc.queryForObject("SELECT COUNT(*) FROM media_files" + where, Long.class, pattern);
    return new com.myblog.common.api.PageResponse<>(items, total, page, 50);
  }

  public void insert(String filename, String name, String type, long size) {
    jdbc.update(
        "INSERT INTO media_files(filename, original_name, content_type, size_bytes) VALUES"
            + " (?,?,?,?)",
        filename,
        name,
        type,
        size);
  }

  public MediaResponse find(String filename) {
    return jdbc
        .query(
            "SELECT * FROM media_files WHERE filename=?",
            (rs, n) ->
                new MediaResponse(
                    rs.getLong("id"),
                    "/api/v1/media/" + rs.getString("filename"),
                    rs.getString("original_name"),
                    rs.getString("content_type"),
                    rs.getLong("size_bytes"),
                    rs.getString("created_at")),
            filename)
        .stream()
        .findFirst()
        .orElseThrow(() -> new com.myblog.common.exception.ResourceNotFoundException("图片不存在"));
  }

  public String filename(long id) {
    return jdbc
        .query("SELECT filename FROM media_files WHERE id=?", (rs, n) -> rs.getString(1), id)
        .stream()
        .findFirst()
        .orElseThrow(() -> new com.myblog.common.exception.ResourceNotFoundException("图片不存在"));
  }

  public boolean used(String url) {
    String literal = "%" + url.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
    return jdbc.queryForObject(
                "SELECT COUNT(*) FROM posts WHERE cover=? OR content LIKE ? ESCAPE '!'",
                Long.class,
                url,
                literal)
            > 0
        || jdbc.queryForObject(
                "SELECT COUNT(*) FROM comments WHERE content LIKE ? ESCAPE '!'",
                Long.class,
                literal)
            > 0
        || jdbc.queryForObject(
                "SELECT COUNT(*) FROM site_settings WHERE avatar=? OR about_content LIKE ? ESCAPE"
                    + " '!'",
                Long.class,
                url,
                literal)
            > 0
        || jdbc.queryForObject("SELECT COUNT(*) FROM anime_entries WHERE cover=?", Long.class, url)
            > 0
        || jdbc.queryForObject("SELECT COUNT(*) FROM music_tracks WHERE cover=?", Long.class, url)
            > 0
        || jdbc.queryForObject(
                "SELECT COUNT(*) FROM showcase_entries WHERE cover=? OR content LIKE ? ESCAPE '!'",
                Long.class,
                url,
                literal)
            > 0
        || jdbc.queryForObject("SELECT COUNT(*) FROM showcase_images WHERE url=?", Long.class, url)
            > 0
        || jdbc.queryForObject("SELECT COUNT(*) FROM albums WHERE cover=?", Long.class, url) > 0
        || jdbc.queryForObject("SELECT COUNT(*) FROM album_photos WHERE url=?", Long.class, url) > 0
        || jdbc.queryForObject("SELECT COUNT(*) FROM members WHERE avatar=?", Long.class, url) > 0;
  }

  public void delete(long id) {
    jdbc.update("DELETE FROM media_files WHERE id=?", id);
  }
}
