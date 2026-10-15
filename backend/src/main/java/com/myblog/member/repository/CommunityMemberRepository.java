package com.myblog.member.repository;

import com.myblog.common.api.PageResponse;
import com.myblog.common.exception.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CommunityMemberRepository {
  private final JdbcTemplate jdbc;

  public CommunityMemberRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public record OwnComment(
      long id,
      String slug,
      String postTitle,
      String content,
      String status,
      int version,
      String createdAt) {}

  public record Notice(
      long id, String message, String slug, long commentId, boolean read, String createdAt) {}

  public record Report(
      long id,
      long memberId,
      long commentId,
      String reason,
      String content,
      boolean resolved,
      String createdAt) {}

  public record Note(
      long id,
      long memberId,
      String author,
      String content,
      String color,
      String status,
      int version,
      String createdAt) {}

  public PageResponse<OwnComment> comments(long member, int page) {
    var list =
        jdbc.query(
            "SELECT c.*,p.slug,p.title FROM comments c JOIN posts p ON p.id=c.post_id WHERE"
                + " c.member_id=? ORDER BY c.id DESC LIMIT 20 OFFSET ?",
            (r, n) ->
                new OwnComment(
                    r.getLong("id"),
                    r.getString("slug"),
                    r.getString("title"),
                    r.getString("content"),
                    r.getString("status"),
                    r.getInt("version"),
                    r.getString("created_at")),
            member,
            (page - 1) * 20);
    long count =
        jdbc.queryForObject("SELECT COUNT(*) FROM comments WHERE member_id=?", Long.class, member);
    return new PageResponse<>(list, count, page, 20);
  }

  public void deleteComment(long member, long id, int version) {
    if (jdbc.update(
            "DELETE FROM comments WHERE id=? AND member_id=? AND version=?", id, member, version)
        != 1) throw new ConflictException("评论已更新或不存在，请刷新");
  }

  private String noticeFilter() {
    return " FROM member_notifications n JOIN comments c ON c.id=n.comment_id JOIN posts p ON"
        + " p.id=c.post_id WHERE n.member_id=? AND c.status='APPROVED' AND"
        + " p.status='PUBLISHED' AND p.published_at<=CURRENT_DATE";
  }

  public PageResponse<Notice> notices(long member, int page) {
    var items =
        jdbc.query(
            "SELECT n.*,p.slug" + noticeFilter() + " ORDER BY n.id DESC LIMIT 20 OFFSET ?",
            (r, n) ->
                new Notice(
                    r.getLong("id"),
                    r.getString("message"),
                    r.getString("slug"),
                    r.getLong("comment_id"),
                    r.getTimestamp("read_at") != null,
                    r.getString("created_at")),
            member,
            (page - 1) * 20);
    return new PageResponse<>(
        items,
        jdbc.queryForObject("SELECT COUNT(*)" + noticeFilter(), Long.class, member),
        page,
        20);
  }

  public void read(long member, long id) {
    jdbc.update(
        "UPDATE member_notifications SET read_at=CURRENT_TIMESTAMP WHERE id=? AND member_id=? AND"
            + " read_at IS NULL",
        id,
        member);
  }

  public void report(long member, long comment, String reason) {
    if (jdbc.queryForObject(
            "SELECT COUNT(*) FROM comments c JOIN posts p ON p.id=c.post_id WHERE c.id=? AND"
                + " c.status='APPROVED' AND p.status='PUBLISHED' AND p.published_at<=CURRENT_DATE",
            Long.class,
            comment)
        != 1) throw new ResourceNotFoundException("评论不存在");
    if (jdbc.queryForObject(
            "SELECT COUNT(*) FROM comment_reports WHERE member_id=? AND comment_id=?",
            Long.class,
            member,
            comment)
        > 0) throw new ConflictException("你已经举报过这条评论");
    jdbc.update(
        "INSERT INTO comment_reports(member_id,comment_id,reason) VALUES (?,?,?)",
        member,
        comment,
        reason.trim());
  }

  public PageResponse<Report> reports(int page) {
    var items =
        jdbc.query(
            "SELECT r.*,c.content FROM comment_reports r JOIN comments c ON c.id=r.comment_id ORDER"
                + " BY r.resolved,r.id DESC LIMIT 20 OFFSET ?",
            (r, n) ->
                new Report(
                    r.getLong("id"),
                    r.getLong("member_id"),
                    r.getLong("comment_id"),
                    r.getString("reason"),
                    r.getString("content"),
                    r.getBoolean("resolved"),
                    r.getString("created_at")),
            (page - 1) * 20);
    return new PageResponse<>(
        items, jdbc.queryForObject("SELECT COUNT(*) FROM comment_reports", Long.class), page, 20);
  }

  public void resolve(long id) {
    jdbc.update("UPDATE comment_reports SET resolved=TRUE WHERE id=?", id);
  }

  public PageResponse<Note> notes(boolean admin, int page) {
    return notes(admin, page, null);
  }

  public PageResponse<Note> notes(boolean admin, int page, Long owner) {
    String filter =
        owner != null ? " WHERE g.member_id=" + owner : admin ? "" : " WHERE g.status='APPROVED'";
    var items =
        jdbc.query(
            "SELECT g.*,m.nickname FROM guestbook_entries g JOIN members m ON m.id=g.member_id"
                + filter
                + " ORDER BY g.id DESC LIMIT 20 OFFSET ?",
            (r, n) ->
                new Note(
                    r.getLong("id"),
                    r.getLong("member_id"),
                    r.getString("nickname"),
                    r.getString("content"),
                    r.getString("color"),
                    r.getString("status"),
                    r.getInt("version"),
                    r.getString("created_at")),
            (page - 1) * 20);
    return new PageResponse<>(
        items,
        jdbc.queryForObject("SELECT COUNT(*) FROM guestbook_entries g" + filter, Long.class),
        page,
        20);
  }

  public void addNote(long member, String content, String color) {
    jdbc.update(
        "INSERT INTO guestbook_entries(member_id,content,color) VALUES (?,?,?)",
        member,
        content.trim(),
        color);
  }

  public void noteState(long id, String status, int version) {
    if (jdbc.update(
            "UPDATE guestbook_entries SET status=?,version=version+1 WHERE id=? AND version=?",
            status,
            id,
            version)
        != 1) throw new ConflictException("便签已更新，请刷新");
  }

  public void deleteNote(Long member, long id, int version) {
    int changed =
        member == null
            ? jdbc.update("DELETE FROM guestbook_entries WHERE id=? AND version=?", id, version)
            : jdbc.update(
                "DELETE FROM guestbook_entries WHERE id=? AND version=? AND member_id=?",
                id,
                version,
                member);
    if (changed != 1) throw new ConflictException("便签已更新或不存在，请刷新");
  }
}
