package com.myblog.taxonomy.repository;

import com.myblog.taxonomy.dto.TaxonomyResponse;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class TaxonomyRepository {
  private final JdbcTemplate jdbc;

  public TaxonomyRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<TaxonomyResponse> categories() {
    return jdbc.query(
        "SELECT c.name, COUNT(p.id) AS total FROM categories c JOIN posts p ON p.category_id = c.id"
            + " WHERE p.status = 'PUBLISHED' AND p.published_at <= CURRENT_DATE GROUP BY c.id,"
            + " c.name ORDER BY c.id",
        (rs, row) -> new TaxonomyResponse(rs.getString("name"), rs.getLong("total")));
  }

  public List<TaxonomyResponse> tags() {
    return jdbc.query(
        "SELECT t.name, COUNT(p.id) AS total FROM tags t JOIN post_tags pt ON pt.tag_id = t.id JOIN"
            + " posts p ON p.id = pt.post_id WHERE p.status = 'PUBLISHED' AND p.published_at <="
            + " CURRENT_DATE GROUP BY t.id, t.name ORDER BY total DESC, t.id",
        (rs, row) -> new TaxonomyResponse(rs.getString("name"), rs.getLong("total")));
  }
}
