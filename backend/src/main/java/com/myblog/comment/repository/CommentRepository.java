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

  public void create(long postId, CommentWriteRequest input, long memberId, String nickname) {
    if (input.parentId() != null
        && jdbc.queryForObject(
                "SELECT COUNT(*) FROM comments WHERE id=? AND post_id=? AND status='APPROVED'",
                Long.class,
                input.parentId(),
                postId)
            != 1) throw new com.myblog.common.exception.InvalidInputException("回复的评论已不可用，请刷新后重试");
    jdbc.update(
        "INSERT INTO comments(post_id,author,content,member_id,parent_id) VALUES (?,?,?,?,?)",
        postId,
        nickname,
        input.content().trim(),
        memberId,
        input.parentId());
  }

  public long count(long id) {
    return jdbc.queryForObject(
        "SELECT COUNT(*) FROM comments WHERE post_id=? AND status='APPROVED'", Long.class, id);
  }

  public List<CommentResponse> list(long id, int page) {
    return jdbc.query(
        "SELECT c.*,m.nickname,m.avatar,parent.member_id AS parent_member,parent.author AS"
            + " parent_author,pm.nickname AS parent_nickname FROM comments c LEFT JOIN members m ON"
            + " m.id=c.member_id LEFT JOIN comments parent ON parent.id=c.parent_id AND"
            + " parent.status='APPROVED' LEFT JOIN members pm ON pm.id=parent.member_id WHERE"
            + " c.post_id=? AND c.status='APPROVED' ORDER BY c.id DESC LIMIT 20 OFFSET ?",
        (rs, n) ->
            new CommentResponse(
                rs.getLong("id"),
                rs.getString("nickname") == null
                    ? rs.getString("author")
                    : rs.getString("nickname"),
                rs.getString("content"),
                rs.getString("created_at"),
                rs.getObject("member_id", Long.class),
                rs.getString("avatar"),
                rs.getObject("parent_id", Long.class),
                rs.getString("parent_nickname") == null
                    ? rs.getString("parent_author")
                    : rs.getString("parent_nickname")),
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

  public void notifyReply(long id, String status) {
    if (!status.equals("APPROVED")) return;
    jdbc.update(
        "INSERT INTO member_notifications(member_id,comment_id,message) SELECT"
            + " parent.member_id,c.id,'你的评论收到了一条回复' FROM comments c JOIN comments parent ON"
            + " parent.id=c.parent_id JOIN members m ON m.id=parent.member_id WHERE c.id=? AND"
            + " parent.status='APPROVED' AND parent.member_id<>c.member_id AND m.status<>'DELETED'"
            + " AND NOT EXISTS (SELECT 1 FROM member_notifications n WHERE"
            + " n.member_id=parent.member_id AND n.comment_id=c.id)",
        id);
  }

  public int delete(long id, int version) {
    return jdbc.update("DELETE FROM comments WHERE id=? AND version=?", id, version);
  }
}
