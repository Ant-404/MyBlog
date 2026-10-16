package com.myblog.statistics.dto;

import java.util.List;

public record ReadingStatistics(
    long totalReads,
    long todayReads,
    long totalComments,
    List<DailyRead> daily,
    List<PostRead> posts) {
  public record DailyRead(String date, long count) {}

  public record PostRead(long id, String slug, String title, long count) {}
}
