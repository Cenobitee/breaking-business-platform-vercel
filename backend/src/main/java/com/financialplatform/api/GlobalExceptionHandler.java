package com.financialplatform.api;

import com.financialplatform.api.dto.ApiError;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ApiError> validation(MethodArgumentNotValidException exception) {
    Map<String, String> errors = new LinkedHashMap<>();
    exception
        .getBindingResult()
        .getFieldErrors()
        .forEach(error -> errors.putIfAbsent(error.getField(), error.getDefaultMessage()));
    return response(HttpStatus.BAD_REQUEST, "Validation failed", errors);
  }

  @ExceptionHandler(IllegalArgumentException.class)
  ResponseEntity<ApiError> invalidRequest(IllegalArgumentException exception) {
    return response(HttpStatus.BAD_REQUEST, exception.getMessage(), Map.of());
  }

  @ExceptionHandler(AuthenticationException.class)
  ResponseEntity<ApiError> authenticationFailed() {
    return response(HttpStatus.UNAUTHORIZED, "Invalid email or password", Map.of());
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<ApiError> dataConflict() {
    return response(
        HttpStatus.CONFLICT,
        "This request conflicts with an existing record. Refresh the page and try again.",
        Map.of());
  }

  private ResponseEntity<ApiError> response(
      HttpStatus status, String message, Map<String, String> fieldErrors) {
    return ResponseEntity.status(status)
        .body(
            new ApiError(
                Instant.now(), status.value(), status.getReasonPhrase(), message, fieldErrors));
  }
}
