package com.myblog.auth.repository;

import com.myblog.auth.entity.AdminUser;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AdminUserRepository {
  private final JdbcTemplate jdbc;

  public AdminUserRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public Optional<AdminUser> findByUsername(String username) {
    return jdbc
        .query(
            "SELECT id, username, password_hash, display_name, enabled FROM admin_users WHERE"
                + " username = ?",
            (rs, row) ->
                new AdminUser(
                    rs.getLong("id"),
                    rs.getString("username"),
                    rs.getString("password_hash"),
                    rs.getString("display_name"),
                    rs.getBoolean("enabled")),
            username)
        .stream()
        .findFirst();
  }

  public long count() {
    return jdbc.queryForObject("SELECT COUNT(*) FROM admin_users", Long.class);
  }

  public void create(String username, String hash, String displayName) {
    jdbc.update(
        "INSERT INTO admin_users (username, password_hash, display_name) VALUES (?, ?, ?)",
        username,
        hash,
        displayName);
  }
}
