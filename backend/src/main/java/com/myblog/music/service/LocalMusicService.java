package com.myblog.music.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.myblog.common.exception.InvalidInputException;
import java.io.*;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import javax.imageio.ImageIO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class LocalMusicService {
  public record Track(
      long id, String title, String artist, String audioUrl, String cover, int version) {}

  public record Settings(String name, boolean enabled, List<Track> tracks) {}

  public record Metadata(String title, String artist, String cover, int version) {}

  private record Entry(String key, Path path) {}

  private static final Set<String> AUDIO =
      Set.of("mp3", "wav", "ogg", "m4a", "aac", "flac", "opus", "webm");
  private final Path directory;
  private final Path source;
  private final ObjectMapper mapper;

  public LocalMusicService(
      ObjectMapper mapper,
      @Value("${blog.music.directory}") String directory,
      @Value("${blog.music.source-directory:}") String source) {
    this.mapper = mapper;
    this.directory = Path.of(directory).toAbsolutePath().normalize();
    this.source =
        source.isBlank()
            ? (Files.isDirectory(Path.of("frontend/public/music"))
                    ? Path.of("frontend/public/music")
                    : Path.of("../frontend/public/music"))
                .toAbsolutePath()
                .normalize()
            : Path.of(source).toAbsolutePath().normalize();
  }

  private Map<String, Metadata> metadata() throws IOException {
    Path file = directory.resolve("library.json");
    return Files.exists(file)
        ? mapper.readValue(file.toFile(), new TypeReference<LinkedHashMap<String, Metadata>>() {})
        : new LinkedHashMap<>();
  }

  private void persist(Map<String, Metadata> values) throws IOException {
    Files.createDirectories(directory);
    Path temp = Files.createTempFile(directory, "library-", ".tmp");
    try {
      mapper.writerWithDefaultPrettyPrinter().writeValue(temp.toFile(), values);
      try {
        Files.move(
            temp,
            directory.resolve("library.json"),
            StandardCopyOption.ATOMIC_MOVE,
            StandardCopyOption.REPLACE_EXISTING);
      } catch (AtomicMoveNotSupportedException e) {
        Files.move(temp, directory.resolve("library.json"), StandardCopyOption.REPLACE_EXISTING);
      }
    } finally {
      Files.deleteIfExists(temp);
    }
  }

  private static String extension(Path file) {
    String name = file.getFileName().toString();
    return name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
  }

  private List<Entry> entries() throws IOException {
    List<Entry> result = new ArrayList<>();
    for (Path folder : source.equals(directory) ? List.of(directory) : List.of(source, directory)) {
      if (!Files.isDirectory(folder)) continue;
      try (var files = Files.list(folder)) {
        files
            .filter(
                p ->
                    Files.isRegularFile(p, LinkOption.NOFOLLOW_LINKS)
                        && AUDIO.contains(extension(p)))
            .sorted()
            .forEach(
                p ->
                    result.add(
                        new Entry(
                            (folder.equals(source) ? "source/" : "upload/") + p.getFileName(), p)));
      }
    }
    return result;
  }

  private long id(Entry entry) {
    try {
      String key =
          entry.key().startsWith("source/") ? entry.path().getFileName().toString() : entry.key();
      return Long.parseLong(
          HexFormat.of()
              .formatHex(
                  MessageDigest.getInstance("SHA-256")
                      .digest(key.getBytes(java.nio.charset.StandardCharsets.UTF_8)))
              .substring(0, 12),
          16);
    } catch (java.security.NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }

  private Entry find(long id) throws IOException {
    return entries().stream()
        .filter(e -> id(e) == id)
        .findFirst()
        .orElseThrow(() -> new com.myblog.common.exception.ResourceNotFoundException("歌曲不存在"));
  }

  private Metadata defaults(Entry entry) {
    String name = entry.path().getFileName().toString().replaceFirst("\\.[^.]+$", "");
    int split = name.indexOf(" - ");
    return new Metadata(
        split < 0 ? name : name.substring(split + 3),
        split < 0 ? "" : name.substring(0, split),
        "",
        0);
  }

  private Path cover(Entry entry, Metadata meta) throws IOException {
    if (!meta.cover().isBlank()) {
      Path path = directory.resolve(meta.cover()).normalize();
      return path.getParent().equals(directory)
              && Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS)
          ? path
          : null;
    }
    String stem = entry.path().getFileName().toString().replaceFirst("\\.[^.]+$", "");
    try (var files = Files.list(entry.path().getParent())) {
      List<Path> images =
          files
              .filter(
                  p ->
                      Files.isRegularFile(p, LinkOption.NOFOLLOW_LINKS)
                          && Set.of("jpg", "jpeg", "png", "webp", "avif").contains(extension(p)))
              .sorted()
              .toList();
      return images.stream()
          .filter(
              p -> p.getFileName().toString().replaceFirst("\\.[^.]+$", "").equalsIgnoreCase(stem))
          .findFirst()
          .orElseGet(
              () ->
                  images.stream()
                      .filter(
                          p ->
                              p.getFileName()
                                  .toString()
                                  .replaceFirst("\\.[^.]+$", "")
                                  .equalsIgnoreCase("cover"))
                      .findFirst()
                      .orElse(null));
    }
  }

  public synchronized Settings settings() throws IOException {
    Map<String, Metadata> values = metadata();
    List<Track> tracks = new ArrayList<>();
    for (Entry entry : entries()) {
      Metadata meta = values.getOrDefault(entry.key(), defaults(entry));
      long id = id(entry);
      tracks.add(
          new Track(
              id,
              meta.title(),
              meta.artist(),
              "/api/v1/music/local/" + id + "/audio",
              cover(entry, meta) == null
                  ? ""
                  : "/api/v1/music/local/" + id + "/cover?v=" + meta.version(),
              meta.version()));
    }
    return new Settings("耳边的小世界", true, tracks);
  }

  private Metadata validated(String title, String artist, String cover, int version) {
    if (title == null
        || title.isBlank()
        || title.length() > 120
        || artist == null
        || artist.length() > 120) throw new InvalidInputException("歌名必填，歌名和歌手不能超过 120 字");
    return new Metadata(title.strip(), artist.strip(), cover, version);
  }

  public synchronized Settings edit(long id, String title, String artist, int version)
      throws IOException {
    Entry entry = find(id);
    Map<String, Metadata> values = metadata();
    Metadata old = values.getOrDefault(entry.key(), defaults(entry));
    if (version != old.version())
      throw new com.myblog.common.exception.ConflictException("歌曲已更新，请刷新后重试");
    values.put(entry.key(), validated(title, artist, old.cover(), version + 1));
    persist(values);
    return settings();
  }

  private boolean audioHeader(byte[] b, String ext) {
    String head = new String(b, java.nio.charset.StandardCharsets.ISO_8859_1);
    return switch (ext) {
      case "mp3" ->
          head.startsWith("ID3") || (b.length > 1 && (b[0] & 255) == 255 && (b[1] & 224) == 224);
      case "aac" -> b.length > 1 && (b[0] & 255) == 255 && (b[1] & 246) == 240;
      case "wav" ->
          head.startsWith("RIFF") && head.length() >= 12 && head.substring(8, 12).equals("WAVE");
      case "ogg", "opus" -> head.startsWith("OggS");
      case "flac" -> head.startsWith("fLaC");
      case "m4a" -> head.length() >= 12 && head.substring(4, 8).equals("ftyp");
      case "webm" ->
          b.length >= 4
              && (b[0] & 255) == 26
              && (b[1] & 255) == 69
              && (b[2] & 255) == 223
              && (b[3] & 255) == 163;
      default -> false;
    };
  }

  public synchronized Settings upload(MultipartFile file) throws IOException {
    if (file.isEmpty() || file.getSize() > 50L * 1024 * 1024)
      throw new InvalidInputException("音乐文件不能为空且不能超过 50MB");
    String original =
        Optional.ofNullable(file.getOriginalFilename()).orElse("音乐.mp3").replace('\\', '/');
    original = original.substring(original.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "");
    String ext = extension(Path.of(original.isBlank() ? "music" : original));
    try (InputStream input = file.getInputStream()) {
      if (!AUDIO.contains(ext) || !audioHeader(input.readNBytes(32), ext))
        throw new InvalidInputException("文件内容与音频格式不符，推荐上传 MP3");
    }
    Map<String, Metadata> values = metadata();
    Files.createDirectories(directory);
    Path target = directory.resolve(UUID.randomUUID() + "." + ext);
    Entry entry = new Entry("upload/" + target.getFileName(), target);
    Metadata parsed = defaults(new Entry("", Path.of(original)));
    values.put(entry.key(), validated(parsed.title(), parsed.artist(), "", 1));
    try {
      try (InputStream input = file.getInputStream()) {
        Files.copy(input, target);
      }
      persist(values);
    } catch (IOException | RuntimeException e) {
      Files.deleteIfExists(target);
      throw e;
    }
    return settings();
  }

  public synchronized Settings uploadCover(long id, int version, MultipartFile file)
      throws IOException {
    Entry entry = find(id);
    Map<String, Metadata> values = metadata();
    Metadata old = values.getOrDefault(entry.key(), defaults(entry));
    if (version != old.version())
      throw new com.myblog.common.exception.ConflictException("歌曲已更新，请刷新后重试");
    if (file.isEmpty() || file.getSize() > 5L * 1024 * 1024)
      throw new InvalidInputException("封面不能为空且不能超过 5MB");
    java.awt.image.BufferedImage image;
    try (var input = ImageIO.createImageInputStream(file.getInputStream())) {
      var readers = ImageIO.getImageReaders(input);
      if (!readers.hasNext()) throw new InvalidInputException("请选择 PNG 或 JPEG 封面");
      var reader = readers.next();
      try {
        if (!Set.of("png", "jpeg").contains(reader.getFormatName().toLowerCase(Locale.ROOT)))
          throw new InvalidInputException("请选择 PNG 或 JPEG 封面");
        reader.setInput(input);
        if ((long) reader.getWidth(0) * reader.getHeight(0) > 20_000_000)
          throw new InvalidInputException("封面不能超过 2000 万像素");
        image = reader.read(0);
      } finally {
        reader.dispose();
      }
    } catch (IOException e) {
      throw new InvalidInputException("封面图片已损坏，请重新选择 PNG 或 JPEG 图片");
    }
    Files.createDirectories(directory);
    Path target = directory.resolve(UUID.randomUUID() + ".png");
    try {
      if (!ImageIO.write(image, "png", target.toFile())) throw new IOException("无法保存封面");
      values.put(
          entry.key(),
          new Metadata(old.title(), old.artist(), target.getFileName().toString(), version + 1));
      persist(values);
    } catch (IOException | RuntimeException e) {
      Files.deleteIfExists(target);
      throw e;
    }
    if (!old.cover().isBlank() && old.cover().matches("[a-f0-9-]{36}\\.png"))
      Files.deleteIfExists(directory.resolve(old.cover()));
    return settings();
  }

  public synchronized Path resource(long id, boolean image) throws IOException {
    Entry entry = find(id);
    Path path =
        image ? cover(entry, metadata().getOrDefault(entry.key(), defaults(entry))) : entry.path();
    if (path == null) throw new com.myblog.common.exception.ResourceNotFoundException("封面不存在");
    return path;
  }
}
