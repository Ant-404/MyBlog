package com.myblog.comment.repository;

import com.myblog.comment.dto.*;
import com.myblog.common.exception.ResourceNotFoundException;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
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

  public long create(long postId, CommentWriteRequest input, String url) {
    if (input.parentId() != null
        && jdbc.queryForObject(
                "SELECT COUNT(*) FROM comments WHERE id=? AND post_id=?",
                Long.class,
                input.parentId(),
                postId)
            != 1) throw new com.myblog.common.exception.InvalidInputException("回复的评论已不可用，请刷新后重试");
    var key = new GeneratedKeyHolder();
    jdbc.update(
        connection -> {
          var statement =
              connection.prepareStatement(
                  "INSERT INTO"
                      + " comments(post_id,author,content,guest_email,guest_url,parent_id,status)"
                      + " VALUES (?,?,?,?,?,?,'APPROVED')",
                  new String[] {"id"});
          statement.setLong(1, postId);
          statement.setString(2, input.author().trim());
          statement.setString(3, input.content().trim());
          statement.setString(4, input.email().trim().toLowerCase(java.util.Locale.ROOT));
          statement.setString(5, url);
          statement.setObject(6, input.parentId(), java.sql.Types.BIGINT);
          return statement;
        },
        key);
    return key.getKey().longValue();
  }

  public long count(long id) {
    return jdbc.queryForObject("SELECT COUNT(*) FROM comments WHERE post_id=?", Long.class, id);
  }

  public List<CommentResponse> list(long id, int page) {
    return jdbc.query(
        "SELECT c.*,parent.author AS reply_author FROM comments c LEFT JOIN comments parent ON"
            + " parent.id=c.parent_id AND parent.post_id=c.post_id"
            + " WHERE c.post_id=? ORDER BY c.id DESC LIMIT 20 OFFSET ?",
        (rs, n) ->
            new CommentResponse(
                rs.getLong("id"),
                rs.getString("author"),
                rs.getString("content"),
                rs.getString("created_at"),
                rs.getString("guest_url"),
                rs.getObject("parent_id", Long.class),
                rs.getString("reply_author")),
        id,
        (page - 1) * 20);
  }

  public long adminCount() {
    return jdbc.queryForObject("SELECT COUNT(*) FROM comments", Long.class);
  }

  public List<AdminCommentResponse> adminList(int page) {
    return jdbc.query(
        "SELECT c.*,p.slug,p.title FROM comments c JOIN posts p ON p.id=c.post_id ORDER BY c.id"
            + " DESC LIMIT 20 OFFSET ?",
        (rs, n) ->
            new AdminCommentResponse(
                rs.getLong("id"),
                rs.getString("slug"),
                rs.getString("title"),
                rs.getString("author"),
                rs.getString("content"),
                rs.getInt("version"),
                rs.getString("created_at"),
                rs.getString("guest_email"),
                rs.getString("guest_url")),
        (page - 1) * 20);
  }

  public int delete(long id, int version) {
    return jdbc.update("DELETE FROM comments WHERE id=? AND version=?", id, version);
  }
}
