package com.myblog.album.repository;

import com.myblog.album.dto.*;
import com.myblog.common.exception.ResourceNotFoundException;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class AlbumRepository {
  private final JdbcTemplate jdbc;

  public AlbumRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  private final RowMapper<AlbumResponse> row =
      (rs, n) ->
          new AlbumResponse(
              rs.getLong("id"),
              rs.getString("title"),
              rs.getString("description"),
              rs.getString("cover"),
              rs.getInt("sort_order"),
              rs.getBoolean("visible"),
              rs.getInt("version"),
              rs.getInt("photo_count"),
              List.of(),
              rs.getTimestamp("created_at").toLocalDateTime().toString(),
              java.util.stream.Stream.of(
                      rs.getString("preview_1"),
                      rs.getString("preview_2"),
                      rs.getString("preview_3"))
                  .filter(java.util.Objects::nonNull)
                  .distinct()
                  .toList());
  private static final String SELECT =
      "SELECT a.*, (SELECT COUNT(*) FROM album_photos p WHERE p.album_id=a.id) AS photo_count,"
          + " (SELECT url FROM album_photos p WHERE p.album_id=a.id ORDER BY sort_order,id LIMIT 1)"
          + " AS preview_1, (SELECT url FROM album_photos p WHERE p.album_id=a.id ORDER BY"
          + " sort_order,id LIMIT 1 OFFSET 1) AS preview_2, (SELECT url FROM album_photos p WHERE"
          + " p.album_id=a.id ORDER BY sort_order,id LIMIT 1 OFFSET 2) AS preview_3 FROM albums a";

  public List<AlbumResponse> list(boolean admin, String keyword) {
    String pattern =
        "%" + keyword.trim().replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
    return jdbc.query(
        SELECT
            + (admin ? " WHERE 1=1" : " WHERE a.visible=TRUE")
            + " AND (LOWER(a.title) LIKE LOWER(?) ESCAPE '!' OR LOWER(a.description) LIKE LOWER(?)"
            + " ESCAPE '!' OR EXISTS (SELECT 1 FROM album_photos s WHERE s.album_id=a.id AND"
            + " LOWER(s.caption) LIKE LOWER(?) ESCAPE '!')) ORDER BY a.sort_order,a.id DESC",
        row,
        pattern,
        pattern,
        pattern);
  }

  public AlbumResponse detail(long id, boolean admin) {
    var a =
        jdbc
            .query(SELECT + " WHERE a.id=?" + (admin ? "" : " AND a.visible=TRUE"), row, id)
            .stream()
            .findFirst()
            .orElseThrow(() -> new ResourceNotFoundException("相册不存在或尚未公开"));
    var photos =
        jdbc.query(
            "SELECT url,caption FROM album_photos WHERE album_id=? ORDER BY sort_order,id",
            (rs, n) -> new AlbumWriteRequest.Photo(rs.getString("url"), rs.getString("caption")),
            id);
    return new AlbumResponse(
        a.id(),
        a.title(),
        a.description(),
        a.cover(),
        a.sortOrder(),
        a.visible(),
        a.version(),
        a.photoCount(),
        photos,
        a.createdAt(),
        a.previewImages());
  }

  public long create(AlbumWriteRequest a, String cover) {
    var key = new GeneratedKeyHolder();
    jdbc.update(
        connection -> {
          var s =
              connection.prepareStatement(
                  "INSERT INTO albums(title,description,cover,sort_order,visible) VALUES"
                      + " (?,?,?,?,?)",
                  new String[] {"id"});
          s.setString(1, a.title().trim());
          s.setString(2, a.description().trim());
          s.setString(3, cover);
          s.setInt(4, a.sortOrder());
          s.setBoolean(5, a.visible());
          return s;
        },
        key);
    return key.getKey().longValue();
  }

  public int update(long id, AlbumWriteRequest a, String cover) {
    return jdbc.update(
        "UPDATE albums SET"
            + " title=?,description=?,cover=?,sort_order=?,visible=?,version=version+1,updated_at=CURRENT_TIMESTAMP"
            + " WHERE id=? AND version=?",
        a.title().trim(),
        a.description().trim(),
        cover,
        a.sortOrder(),
        a.visible(),
        id,
        a.version());
  }

  public void photos(long id, List<AlbumWriteRequest.Photo> photos) {
    jdbc.update("DELETE FROM album_photos WHERE album_id=?", id);
    for (int i = 0; i < photos.size(); i++) {
      var p = photos.get(i);
      jdbc.update(
          "INSERT INTO album_photos(album_id,url,caption,sort_order) VALUES (?,?,?,?)",
          id,
          p.url(),
          p.caption().trim(),
          i);
    }
  }

  public int delete(long id, int version) {
    return jdbc.update("DELETE FROM albums WHERE id=? AND version=?", id, version);
  }
}
