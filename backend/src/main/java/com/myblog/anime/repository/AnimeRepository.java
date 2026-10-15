package com.myblog.anime.repository;

import com.myblog.anime.dto.*;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AnimeRepository {
  private final JdbcTemplate jdbc;

  public AnimeRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<AnimeResponse> list(boolean admin) {
    return jdbc.query(
        "SELECT * FROM anime_entries"
            + (admin ? "" : " WHERE visible=TRUE")
            + " ORDER BY sort_order,updated_at DESC,id DESC",
        (rs, n) ->
            new AnimeResponse(
                rs.getLong("id"),
                rs.getString("title"),
                rs.getString("cover"),
                rs.getString("status"),
                rs.getInt("watched_episodes"),
                rs.getInt("total_episodes"),
                rs.getDouble("score"),
                rs.getString("note"),
                rs.getString("source_url"),
                rs.getInt("sort_order"),
                rs.getBoolean("visible"),
                rs.getInt("version")));
  }

  public void create(AnimeWriteRequest input, String cover, String source) {
    jdbc.update(
        "INSERT INTO"
            + " anime_entries(title,cover,status,watched_episodes,total_episodes,score,note,source_url,sort_order,visible)"
            + " VALUES (?,?,?,?,?,?,?,?,?,?)",
        input.title().trim(),
        cover,
        input.status(),
        input.watchedEpisodes(),
        input.totalEpisodes(),
        input.score(),
        input.note().trim(),
        source,
        input.sortOrder(),
        input.visible());
  }

  public int update(long id, AnimeWriteRequest input, String cover, String source) {
    return jdbc.update(
        "UPDATE anime_entries SET"
            + " title=?,cover=?,status=?,watched_episodes=?,total_episodes=?,score=?,note=?,source_url=?,sort_order=?,visible=?,version=version+1,updated_at=CURRENT_TIMESTAMP"
            + " WHERE id=? AND version=?",
        input.title().trim(),
        cover,
        input.status(),
        input.watchedEpisodes(),
        input.totalEpisodes(),
        input.score(),
        input.note().trim(),
        source,
        input.sortOrder(),
        input.visible(),
        id,
        input.version());
  }

  public int delete(long id, int version) {
    return jdbc.update("DELETE FROM anime_entries WHERE id=? AND version=?", id, version);
  }
}
