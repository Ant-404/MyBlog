package com.myblog.guestbook;

import com.myblog.common.api.PageResponse;
import com.myblog.common.exception.ConflictException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class GuestbookRepository {
  private final JdbcTemplate jdbc;

  public GuestbookRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public record Note(
      long id, String author, String content, String color, int version, String createdAt) {}

  public PageResponse<Note> notes(int page) {
    var items =
        jdbc.query(
            "SELECT * FROM guestbook_entries ORDER BY id DESC LIMIT 20 OFFSET ?",
            (r, n) ->
                new Note(
                    r.getLong("id"),
                    "匿名用户",
                    r.getString("content"),
                    r.getString("color"),
                    r.getInt("version"),
                    r.getString("created_at")),
            (page - 1) * 20);
    return new PageResponse<>(
        items, jdbc.queryForObject("SELECT COUNT(*) FROM guestbook_entries", Long.class), page, 20);
  }

  public void add(String content, String color) {
    jdbc.update(
        "INSERT INTO guestbook_entries(content,color,status) VALUES (?, ?, 'APPROVED')",
        content.trim(),
        color);
  }

  public void delete(long id, int version) {
    if (jdbc.update("DELETE FROM guestbook_entries WHERE id=? AND version=?", id, version) != 1)
      throw new ConflictException("便签已更新或不存在，请刷新");
  }
}
