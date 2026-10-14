package com.myblog.site.repository;

import com.myblog.site.dto.SiteSettings;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class SiteSettingsRepository {
  private final JdbcTemplate jdbc;

  public SiteSettingsRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public SiteSettings get() {
    return jdbc.queryForObject(
        "SELECT * FROM site_settings WHERE id=1",
        (rs, n) ->
            new SiteSettings(
                rs.getString("name"),
                rs.getString("title"),
                rs.getString("subtitle"),
                rs.getString("author"),
                rs.getString("bio"),
                rs.getString("description"),
                rs.getString("about_content"),
                rs.getString("avatar"),
                rs.getString("public_url"),
                rs.getBoolean("comments_enabled"),
                rs.getInt("version")));
  }

  public int update(SiteSettings s, String avatar, String url) {
    return jdbc.update(
        "UPDATE site_settings SET"
            + " name=?,title=?,subtitle=?,author=?,bio=?,description=?,about_content=?,avatar=?,public_url=?,comments_enabled=?,version=version+1"
            + " WHERE id=1 AND version=?",
        s.name().trim(),
        s.title().trim(),
        s.subtitle(),
        s.author().trim(),
        s.bio(),
        s.description(),
        s.aboutContent(),
        avatar,
        url,
        s.commentsEnabled(),
        s.version());
  }
}
