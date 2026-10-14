package com.myblog.friend.repository;

import com.myblog.friend.dto.*;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AdminFriendRepository {
  private final JdbcTemplate jdbc;

  public AdminFriendRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<AdminFriendResponse> list() {
    return jdbc.query(
        "SELECT * FROM friends ORDER BY sort_order,id",
        (rs, n) ->
            new AdminFriendResponse(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getString("description"),
                rs.getString("url"),
                rs.getInt("sort_order"),
                rs.getBoolean("visible"),
                rs.getInt("version")));
  }

  public void create(FriendWriteRequest input, String url) {
    jdbc.update(
        "INSERT INTO friends(name,description,url,sort_order,visible) VALUES (?,?,?,?,?)",
        input.name().trim(),
        input.description().trim(),
        url,
        input.sortOrder(),
        input.visible());
  }

  public int update(long id, FriendWriteRequest input, String url) {
    return jdbc.update(
        "UPDATE friends SET name=?,description=?,url=?,sort_order=?,visible=?,version=version+1"
            + " WHERE id=? AND version=?",
        input.name().trim(),
        input.description().trim(),
        url,
        input.sortOrder(),
        input.visible(),
        id,
        input.version());
  }

  public int delete(long id, int version) {
    return jdbc.update("DELETE FROM friends WHERE id=? AND version=?", id, version);
  }
}
