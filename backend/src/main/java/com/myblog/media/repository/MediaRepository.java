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
                "SELECT COUNT(*) FROM site_settings WHERE avatar=? OR about_content LIKE ? ESCAPE"
                    + " '!'",
                Long.class,
                url,
                literal)
            > 0;
  }

  public void delete(long id) {
    jdbc.update("DELETE FROM media_files WHERE id=?", id);
  }
}
