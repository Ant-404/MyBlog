package com.myblog.media.service;

import com.myblog.common.exception.*;
import com.myblog.media.dto.MediaResponse;
import com.myblog.media.repository.MediaRepository;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import javax.imageio.ImageIO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class MediaService {
  private final MediaRepository repository;
  private final Path directory;

  public MediaService(
      MediaRepository repository, @Value("${blog.media.directory}") String directory) {
    this.repository = repository;
    this.directory = Path.of(directory).toAbsolutePath().normalize();
  }

  public List<MediaResponse> list() {
    return repository.list();
  }

  public MediaResponse upload(MultipartFile file) throws IOException {
    if (file.isEmpty() || file.getSize() > 5 * 1024 * 1024)
      throw new InvalidInputException("图片必须在 5MB 以内");
    byte[] bytes = file.getBytes();
    String extension;
    // Inspect the actual image format and dimensions before decoding, never trust the filename or
    // MIME header.
    try (var stream = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
      var readers = ImageIO.getImageReaders(stream);
      if (!readers.hasNext()) throw new InvalidInputException("仅支持 PNG 和 JPEG 图片");
      var reader = readers.next();
      try {
        reader.setInput(stream);
        String format = reader.getFormatName().toLowerCase(Locale.ROOT);
        extension =
            switch (format) {
              case "png" -> ".png";
              case "jpeg", "jpg" -> ".jpg";
              default -> throw new InvalidInputException("仅支持 PNG 和 JPEG 图片");
            };
        if ((long) reader.getWidth(0) * reader.getHeight(0) > 20_000_000)
          throw new InvalidInputException("图片像素总数不能超过 2000 万");
        if (reader.read(0) == null) throw new InvalidInputException("图片无法解析");
      } finally {
        reader.dispose();
      }
    } catch (javax.imageio.IIOException e) {
      throw new InvalidInputException("图片文件已损坏");
    }
    String filename = UUID.randomUUID() + extension;
    Files.createDirectories(directory);
    Path target = directory.resolve(filename);
    // Re-encode to discard embedded metadata and trailing non-image payloads.
    var image = ImageIO.read(new ByteArrayInputStream(bytes));
    ImageIO.write(image, extension.equals(".png") ? "png" : "jpeg", target.toFile());
    String original =
        Optional.ofNullable(file.getOriginalFilename())
            .orElse("image")
            .replaceAll("[\\\\/\\p{Cntrl}]", "_");
    if (original.length() > 200) original = original.substring(0, 200);
    try {
      repository.insert(
          filename,
          original,
          extension.equals(".png") ? "image/png" : "image/jpeg",
          Files.size(target));
    } catch (RuntimeException e) {
      Files.deleteIfExists(target);
      throw e;
    }
    return repository.find(filename);
  }

  public MediaResponse metadata(String filename) {
    validate(filename);
    return repository.find(filename);
  }

  public FileSystemResource resource(String filename) {
    validate(filename);
    var resource = new FileSystemResource(directory.resolve(filename));
    if (!resource.exists()) throw new ResourceNotFoundException("图片不存在");
    return resource;
  }

  public void delete(long id) throws IOException {
    String filename = repository.filename(id);
    if (repository.used("/api/v1/media/" + filename))
      throw new ConflictException("图片正在被文章使用，请先移除引用");
    Files.deleteIfExists(directory.resolve(filename));
    repository.delete(id);
  }

  private void validate(String filename) {
    if (!filename.matches("[a-f0-9-]{36}\\.(png|jpg)"))
      throw new ResourceNotFoundException("图片不存在");
  }
}
