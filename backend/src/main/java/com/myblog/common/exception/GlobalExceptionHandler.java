package com.myblog.common.exception;

import com.myblog.common.api.ApiResponse;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {
  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(TooManyRequestsException.class)
  public ResponseEntity<ApiResponse<Void>> limited(TooManyRequestsException exception) {
    return ResponseEntity.status(429)
        .header("Retry-After", "600")
        .body(ApiResponse.failure("RATE_LIMITED", exception.getMessage()));
  }

  @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
  public ResponseEntity<ApiResponse<Void>> uploadTooLarge(Exception exception) {
    return ResponseEntity.status(413).body(ApiResponse.failure("FILE_TOO_LARGE", "图片不能超过 5MB"));
  }

  @ExceptionHandler(ConflictException.class)
  public ResponseEntity<ApiResponse<Void>> conflict(ConflictException exception) {
    return ResponseEntity.status(409).body(ApiResponse.failure("CONFLICT", exception.getMessage()));
  }

  @ExceptionHandler(InvalidInputException.class)
  public ResponseEntity<ApiResponse<Void>> invalidInput(InvalidInputException exception) {
    return ResponseEntity.badRequest()
        .body(ApiResponse.failure("INVALID_ARGUMENT", exception.getMessage()));
  }

  @ExceptionHandler(AuthenticationException.class)
  public ResponseEntity<ApiResponse<Void>> authenticationFailure(
      AuthenticationException exception) {
    return ResponseEntity.status(401).body(ApiResponse.failure("UNAUTHORIZED", "请先登录管理后台"));
  }

  @ExceptionHandler({ResourceNotFoundException.class, NoResourceFoundException.class})
  public ResponseEntity<ApiResponse<Void>> notFound(Exception exception) {
    return ResponseEntity.status(404).body(ApiResponse.failure("NOT_FOUND", "请求的资源不存在"));
  }

  @ExceptionHandler({
    ConstraintViolationException.class,
    HandlerMethodValidationException.class,
    MethodArgumentTypeMismatchException.class,
    MethodArgumentNotValidException.class,
    HttpMessageNotReadableException.class
  })
  public ResponseEntity<ApiResponse<Void>> invalidInput(Exception exception) {
    return ResponseEntity.badRequest().body(ApiResponse.failure("INVALID_ARGUMENT", "请求参数不合法"));
  }

  @ExceptionHandler(DataAccessException.class)
  public ResponseEntity<ApiResponse<Void>> databaseFailure(DataAccessException exception) {
    log.error("Database request failed", exception);
    return ResponseEntity.status(503)
        .body(ApiResponse.failure("DATABASE_UNAVAILABLE", "数据服务暂时不可用"));
  }

  @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
  public ResponseEntity<ApiResponse<Void>> integrity(Exception exception) {
    return ResponseEntity.status(409)
        .body(ApiResponse.failure("CONFLICT", "名称已存在，或记录仍被其他内容引用，请刷新后检查"));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiResponse<Void>> unexpectedFailure(Exception exception) {
    log.error("Unexpected request failure", exception);
    return ResponseEntity.internalServerError()
        .body(ApiResponse.failure("INTERNAL_ERROR", "服务暂时不可用"));
  }
}
