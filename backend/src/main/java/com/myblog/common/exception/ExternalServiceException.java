package com.myblog.common.exception;

public class ExternalServiceException extends RuntimeException {
  public ExternalServiceException(String message) {
    super(message);
  }
}
