package com.myblog.statistics.repository;

import com.myblog.statistics.dto.ReadingStatistics;
import java.time.LocalDate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ReadingRepository {
  private final JdbcTemplate jdbc;

  public ReadingRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public void record(long id, LocalDate date) {
    jdbc.update(
        "INSERT INTO post_views(post_id,view_date,view_count) VALUES (?,?,1) ON DUPLICATE KEY"
            + " UPDATE view_count=view_count+1",
        id,
        date);
  }

  public long count(long id) {
    return jdbc.queryForObject(
        "SELECT COALESCE(SUM(view_count),0) FROM post_views WHERE post_id=?", Long.class, id);
  }

  public ReadingStatistics statistics(LocalDate today) {
    long total =
        jdbc.queryForObject("SELECT COALESCE(SUM(view_count),0) FROM post_views", Long.class);
    long current =
        jdbc.queryForObject(
            "SELECT COALESCE(SUM(view_count),0) FROM post_views WHERE view_date=?",
            Long.class,
            today);
    long pending =
        jdbc.queryForObject("SELECT COUNT(*) FROM comments WHERE status='PENDING'", Long.class);
    var daily =
        jdbc.query(
            "SELECT view_date,SUM(view_count) AS count FROM post_views WHERE view_date>=? GROUP BY"
                + " view_date ORDER BY view_date",
            (rs, n) ->
                new ReadingStatistics.DailyRead(rs.getString("view_date"), rs.getLong("count")),
            today.minusDays(29));
    var posts =
        jdbc.query(
            "SELECT p.id,p.slug,p.title,COALESCE(SUM(v.view_count),0) AS count FROM posts p LEFT"
                + " JOIN post_views v ON v.post_id=p.id GROUP BY p.id,p.slug,p.title ORDER BY count"
                + " DESC,p.id DESC LIMIT 20",
            (rs, n) ->
                new ReadingStatistics.PostRead(
                    rs.getLong("id"),
                    rs.getString("slug"),
                    rs.getString("title"),
                    rs.getLong("count")));
    return new ReadingStatistics(total, current, pending, daily, posts);
  }
}
