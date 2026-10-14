package com.myblog.taxonomy.repository;

import com.myblog.common.exception.InvalidInputException;
import com.myblog.taxonomy.dto.AdminTaxonomyResponse;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AdminTaxonomyRepository {
  private final JdbcTemplate jdbc;

  public AdminTaxonomyRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  private String table(String kind) {
    return switch (kind) {
      case "categories" -> "categories";
      case "tags" -> "tags";
      default -> throw new InvalidInputException("分类类型不合法");
    };
  }

  public List<AdminTaxonomyResponse> list(String kind) {
    String count =
        kind.equals("categories")
            ? "SELECT COUNT(*) FROM posts p WHERE p.category_id=t.id"
            : "SELECT COUNT(*) FROM post_tags pt WHERE pt.tag_id=t.id";
    return jdbc.query(
        "SELECT t.*, (" + count + ") AS post_count FROM " + table(kind) + " t ORDER BY t.id",
        (rs, n) ->
            new AdminTaxonomyResponse(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getLong("post_count"),
                rs.getInt("version")));
  }

  public void create(String kind, String name) {
    jdbc.update("INSERT INTO " + table(kind) + "(name) VALUES (?)", name);
  }

  public int update(String kind, long id, String name, int version) {
    return jdbc.update(
        "UPDATE " + table(kind) + " SET name=?,version=version+1 WHERE id=? AND version=?",
        name,
        id,
        version);
  }

  public int delete(String kind, long id, int version) {
    return jdbc.update("DELETE FROM " + table(kind) + " WHERE id=? AND version=?", id, version);
  }
}
