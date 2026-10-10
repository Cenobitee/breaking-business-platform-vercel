package com.financialplatform.api;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.financialplatform.api.dto.ApiError;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class GlobalExceptionHandlerTest {
  private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

  @Test
  void allAuthenticationFailuresReturnUnauthorized() {
    ResponseEntity<ApiError> response = handler.authenticationFailed();

    assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    assertEquals("Invalid email or password", response.getBody().message());
  }

  @Test
  void databaseConflictsReturnConflictWithoutLeakingDetails() {
    ResponseEntity<ApiError> response = handler.dataConflict();

    assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
    assertEquals(
        "This request conflicts with an existing record. Refresh the page and try again.",
        response.getBody().message());
  }
}
