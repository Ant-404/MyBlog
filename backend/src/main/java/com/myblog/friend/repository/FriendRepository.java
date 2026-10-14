package com.myblog.friend.repository;

import com.myblog.friend.dto.FriendResponse;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class FriendRepository {
  private final JdbcTemplate jdbc;

  public FriendRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<FriendResponse> findVisible() {
    return jdbc.query(
        "SELECT id, name, description, url FROM friends WHERE visible = TRUE ORDER BY sort_order,"
            + " id",
        (rs, row) ->
            new FriendResponse(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getString("description"),
                rs.getString("url")));
  }
}
