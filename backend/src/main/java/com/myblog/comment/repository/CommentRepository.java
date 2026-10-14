package com.myblog.comment.repository;

import com.myblog.comment.dto.*;
import com.myblog.common.exception.ResourceNotFoundException;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CommentRepository {
  private final JdbcTemplate jdbc;

  public CommentRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public long publicPostId(String slug) {
    return jdbc
        .query(
            "SELECT id FROM posts WHERE slug=? AND status='PUBLISHED' AND"
                + " published_at<=CURRENT_DATE",
            (rs, n) -> rs.getLong(1),
            slug)
        .stream()
        .findFirst()
        .orElseThrow(() -> new ResourceNotFoundException("文章不存在"));
  }

  public void create(long postId, CommentWriteRequest input) {
    jdbc.update(
        "INSERT INTO comments(post_id,author,content) VALUES (?,?,?)",
        postId,
        input.author().trim(),
        input.content().trim());
  }

  public long count(long id) {
    return jdbc.queryForObject(
        "SELECT COUNT(*) FROM comments WHERE post_id=? AND status='APPROVED'", Long.class, id);
  }

  public List<CommentResponse> list(long id, int page) {
    return jdbc.query(
        "SELECT * FROM comments WHERE post_id=? AND status='APPROVED' ORDER BY id DESC LIMIT 20"
            + " OFFSET ?",
        (rs, n) ->
            new CommentResponse(
                rs.getLong("id"),
                rs.getString("author"),
                rs.getString("content"),
                rs.getString("created_at")),
        id,
        (page - 1) * 20);
  }

  public long adminCount(String status) {
    return jdbc.queryForObject(
        "SELECT COUNT(*) FROM comments WHERE (?='' OR status=?)", Long.class, status, status);
  }

  public List<AdminCommentResponse> adminList(String status, int page) {
    return jdbc.query(
        "SELECT c.*,p.slug,p.title FROM comments c JOIN posts p ON p.id=c.post_id WHERE (?='' OR"
            + " c.status=?) ORDER BY c.id DESC LIMIT 20 OFFSET ?",
        (rs, n) ->
            new AdminCommentResponse(
                rs.getLong("id"),
                rs.getString("slug"),
                rs.getString("title"),
                rs.getString("author"),
                rs.getString("content"),
                rs.getString("status"),
                rs.getInt("version"),
                rs.getString("created_at")),
        status,
        status,
        (page - 1) * 20);
  }

  public int state(long id, CommentStateRequest input) {
    return jdbc.update(
        "UPDATE comments SET status=?,version=version+1 WHERE id=? AND version=?",
        input.status(),
        id,
        input.version());
  }

  public int delete(long id, int version) {
    return jdbc.update("DELETE FROM comments WHERE id=? AND version=?", id, version);
  }
}
