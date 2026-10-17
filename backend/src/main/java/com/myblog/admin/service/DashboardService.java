package com.myblog.admin.service;

import com.myblog.admin.dto.DashboardResponse;
import com.myblog.site.service.SiteService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {
  private final JdbcTemplate jdbc;
  private final SiteService site;

  public DashboardService(JdbcTemplate jdbc, SiteService site) {
    this.jdbc = jdbc;
    this.site = site;
  }

  @Transactional(readOnly = true)
  public DashboardResponse overview() {
    var basic = site.stats();
    return jdbc.queryForObject(
        """
        SELECT
         (SELECT COUNT(*) FROM categories) AS categories,
         (SELECT COUNT(*) FROM tags) AS tags,
        (SELECT COUNT(*) FROM posts WHERE status='DRAFT') AS drafts,
        (SELECT COUNT(*) FROM posts WHERE status='PUBLISHED' AND published_at>CURRENT_DATE) AS scheduled,
        (SELECT COUNT(*) FROM albums) AS albums,
        (SELECT COUNT(*) FROM album_photos) AS photos,
        (SELECT COUNT(*) FROM comments) AS comments,
        (SELECT COUNT(*) FROM guestbook_entries) AS notes,
        (SELECT COUNT(*) FROM media_files) AS media,
        (SELECT COUNT(*) FROM showcase_entries WHERE section='projects') AS projects,
        (SELECT COUNT(*) FROM showcase_entries WHERE section='series') AS series,
        (SELECT COUNT(*) FROM anime_entries) AS anime
        """,
        (rs, n) ->
            new DashboardResponse(
                basic.posts(),
                rs.getLong("categories"),
                rs.getLong("tags"),
                rs.getLong("drafts"),
                rs.getLong("scheduled"),
                rs.getLong("albums"),
                rs.getLong("photos"),
                rs.getLong("comments"),
                rs.getLong("notes"),
                rs.getLong("media"),
                rs.getLong("projects"),
                rs.getLong("series"),
                rs.getLong("anime")));
  }
}
