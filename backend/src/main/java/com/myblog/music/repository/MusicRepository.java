package com.myblog.music.repository;

import com.myblog.music.dto.*;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class MusicRepository {
  private final JdbcTemplate jdbc;

  public MusicRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public MusicSettings settings(boolean admin) {
    var tracks =
        jdbc.query(
            "SELECT * FROM music_tracks ORDER BY sort_order,id",
            (rs, n) ->
                new MusicTrack(
                    rs.getLong("id"),
                    rs.getString("title"),
                    rs.getString("artist"),
                    rs.getString("audio_url"),
                    rs.getString("cover"),
                    rs.getString("source_url")));
    return jdbc.queryForObject(
        "SELECT * FROM music_settings WHERE id=1",
        (rs, n) ->
            new MusicSettings(
                rs.getString("playlist_id"),
                rs.getString("name"),
                rs.getString("profile_url"),
                rs.getBoolean("enabled"),
                admin ? rs.getInt("version") : 0,
                admin || rs.getBoolean("enabled") ? tracks : List.of()));
  }

  public int update(String playlistId, String profileUrl, MusicWriteRequest input) {
    return jdbc.update(
        "UPDATE music_settings SET playlist_id=?,name=?,profile_url=?,enabled=?,version=version+1"
            + " WHERE id=1 AND version=?",
        playlistId,
        input.name().trim(),
        profileUrl,
        input.enabled(),
        input.version());
  }

  public void replace(List<MusicTrack> tracks) {
    jdbc.update("DELETE FROM music_tracks");
    int order = 0;
    for (var track : tracks)
      jdbc.update(
          "INSERT INTO music_tracks(title,artist,audio_url,cover,source_url,sort_order) VALUES"
              + " (?,?,?,?,?,?)",
          track.title(),
          track.artist(),
          track.audioUrl(),
          track.cover(),
          track.sourceUrl(),
          order++);
  }
}
