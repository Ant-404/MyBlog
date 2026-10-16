package com.myblog.member.repository;

import com.myblog.member.dto.MemberModels.*;
import java.sql.*;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class MemberRepository {
  private final JdbcTemplate jdbc;

  public MemberRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public record Account(Profile profile, String hash, int sessionVersion) {}

  private Account map(ResultSet rs) throws SQLException {
    return new Account(
        new Profile(
            rs.getLong("id"),
            rs.getString("email"),
            rs.getString("nickname"),
            rs.getString("avatar"),
            rs.getString("bio"),
            rs.getString("status"),
            rs.getInt("version")),
        rs.getString("password_hash"),
        rs.getInt("session_version"));
  }

  public Optional<Account> email(String email) {
    return jdbc.query("SELECT * FROM members WHERE email=?", (rs, n) -> map(rs), email).stream()
        .findFirst();
  }

  public Optional<Account> id(long id) {
    return jdbc.query("SELECT * FROM members WHERE id=?", (rs, n) -> map(rs), id).stream()
        .findFirst();
  }

  public long create(String email, String hash, String nickname) {
    var key = new GeneratedKeyHolder();
    jdbc.update(
        connection -> {
          var s =
              connection.prepareStatement(
                  "INSERT INTO members(email,password_hash,nickname) VALUES (?,?,?)",
                  new String[] {"id"});
          s.setString(1, email);
          s.setString(2, hash);
          s.setString(3, nickname);
          return s;
        },
        key);
    return Objects.requireNonNull(key.getKey()).longValue();
  }

  public boolean recentToken(String email, String purpose) {
    return jdbc.queryForObject(
            "SELECT COUNT(*) FROM member_tokens WHERE email=? AND purpose=? AND created_at>?",
            Long.class,
            email,
            purpose,
            Timestamp.from(Instant.now().minusSeconds(60)))
        > 0;
  }

  public void token(String hash, String email, String purpose) {
    jdbc.update(
        "DELETE FROM member_tokens WHERE expires_at<? OR (email=? AND purpose=?)",
        Timestamp.from(Instant.now()),
        email,
        purpose);
    jdbc.update(
        "INSERT INTO member_tokens(token_hash,email,purpose,expires_at) VALUES (?,?,?,?)",
        hash,
        email,
        purpose,
        Timestamp.from(Instant.now().plusSeconds(600)));
  }

  public boolean consume(String hash, String email, String purpose) {
    return jdbc.update(
            "DELETE FROM member_tokens WHERE token_hash=? AND email=? AND purpose=? AND"
                + " expires_at>?",
            hash,
            email,
            purpose,
            Timestamp.from(Instant.now()))
        == 1;
  }

  public int profile(long id, EditProfile input, String avatar) {
    return jdbc.update(
        "UPDATE members SET nickname=?,avatar=?,bio=?,version=version+1 WHERE id=? AND version=?"
            + " AND status IN ('ACTIVE','MUTED')",
        input.nickname().trim(),
        avatar,
        input.bio().trim(),
        id,
        input.version());
  }

  public void password(long id, String hash) {
    jdbc.update(
        "UPDATE members SET password_hash=?,session_version=session_version+1,version=version+1"
            + " WHERE id=?",
        hash,
        id);
    jdbc.update("DELETE FROM member_tokens WHERE email=(SELECT email FROM members WHERE id=?)", id);
  }

  public void close(long id) {
    jdbc.update("DELETE FROM member_tokens WHERE email=(SELECT email FROM members WHERE id=?)", id);
    jdbc.update("DELETE FROM member_notifications WHERE member_id=?", id);
    jdbc.update("DELETE FROM comment_reports WHERE member_id=?", id);
    jdbc.update("DELETE FROM guestbook_entries WHERE member_id=?", id);
    jdbc.update("UPDATE comments SET author='已注销用户' WHERE member_id=?", id);
    jdbc.update(
        "UPDATE members SET"
            + " email=NULL,password_hash='',nickname='已注销用户',avatar='',bio='',status='DELETED',session_version=session_version+1,version=version+1"
            + " WHERE id=?",
        id);
  }

  public List<Profile> list(String keyword, int page) {
    String q = "%" + keyword.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
    return jdbc.query(
        "SELECT * FROM members WHERE nickname LIKE ? ESCAPE '!' OR email LIKE ? ESCAPE '!' ORDER BY"
            + " id DESC LIMIT 20 OFFSET ?",
        (rs, n) -> map(rs).profile(),
        q,
        q,
        (page - 1) * 20);
  }

  public long count(String keyword) {
    String q = "%" + keyword.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
    return jdbc.queryForObject(
        "SELECT COUNT(*) FROM members WHERE nickname LIKE ? ESCAPE '!' OR email LIKE ? ESCAPE '!'",
        Long.class,
        q,
        q);
  }

  public int state(long id, StateRequest input) {
    return jdbc.update(
        "UPDATE members SET status=?,session_version=session_version+1,version=version+1 WHERE id=?"
            + " AND version=? AND status<>'DELETED'",
        input.status(),
        id,
        input.version());
  }
}
