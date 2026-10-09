package com.financialplatform.api;

import com.financialplatform.api.dto.*;
import com.financialplatform.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.Arrays;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final AuthService authService;
  private final boolean secureCookies;
  private static final String ACCESS_COOKIE = "bb_access";
  private static final String REFRESH_COOKIE = "bb_refresh";

  public AuthController(
      AuthService authService, @Value("${app.jwt.cookie-secure:true}") boolean secureCookies) {
    this.authService = authService;
    this.secureCookies = secureCookies;
  }

  @PostMapping("/login")
  public ResponseEntity<AuthResponse> login(
      @Valid @RequestBody LoginRequest request, HttpServletResponse response) {
    return sessionResponse(authService.login(request), HttpStatus.OK, response);
  }

  @PostMapping("/register")
  public ResponseEntity<AuthResponse> register(
      @Valid @RequestBody RegisterRequest request, HttpServletResponse response) {
    return sessionResponse(authService.register(request), HttpStatus.CREATED, response);
  }

  @PostMapping("/refresh")
  public ResponseEntity<AuthResponse> refresh(
      HttpServletRequest request, HttpServletResponse response) {
    String refreshToken = cookieValue(request, REFRESH_COOKIE);
    if (refreshToken == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    return sessionResponse(authService.refresh(refreshToken), HttpStatus.OK, response);
  }

  @PostMapping("/logout")
  public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
    authService.logout(cookieValue(request, REFRESH_COOKIE));
    expireCookie(response, ACCESS_COOKIE, "/");
    expireCookie(response, REFRESH_COOKIE, "/api/auth");
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/me")
  public AuthResponse.UserView me(Authentication authentication) {
    return authService.currentUser(authentication.getName());
  }

  @PostMapping("/forgot-password")
  public ResponseEntity<ForgotPasswordResponse> forgotPassword(
      @Valid @RequestBody ForgotPasswordRequest request) {
    return ResponseEntity.ok(authService.forgotPassword(request.email()));
  }

  @PostMapping("/reset-password")
  public ResponseEntity<MessageResponse> resetPassword(
      @Valid @RequestBody ResetPasswordRequest request) {
    authService.resetPassword(request.token(), request.newPassword());
    return ResponseEntity.ok(
        new MessageResponse("Your password has been reset. You can now sign in."));
  }

  private ResponseEntity<AuthResponse> sessionResponse(
      AuthService.AuthSession session, HttpStatus status, HttpServletResponse response) {
    response.addHeader(
        HttpHeaders.SET_COOKIE,
        cookie(ACCESS_COOKIE, session.accessToken(), "/", session.response().expiresInSeconds())
            .toString());
    ResponseCookie.ResponseCookieBuilder refreshCookie =
        cookieBuilder(REFRESH_COOKIE, session.refreshToken(), "/api/auth");
    if (session.remembered()) {
      refreshCookie.maxAge(Duration.ofSeconds(session.refreshExpiresInSeconds()));
    }
    response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.build().toString());
    return ResponseEntity.status(status).body(session.response());
  }

  private ResponseCookie cookie(String name, String value, String path, long maxAgeSeconds) {
    return cookieBuilder(name, value, path)
        .maxAge(Duration.ofSeconds(maxAgeSeconds))
        .build();
  }

  private ResponseCookie.ResponseCookieBuilder cookieBuilder(
      String name, String value, String path) {
    return ResponseCookie.from(name, value)
        .httpOnly(true)
        .secure(secureCookies)
        .sameSite("Lax")
        .path(path);
  }

  private void expireCookie(HttpServletResponse response, String name, String path) {
    response.addHeader(
        HttpHeaders.SET_COOKIE,
        cookieBuilder(name, "", path).maxAge(Duration.ZERO).build().toString());
  }

  private String cookieValue(HttpServletRequest request, String name) {
    if (request.getCookies() == null) return null;
    return Arrays.stream(request.getCookies())
        .filter(cookie -> name.equals(cookie.getName()))
        .map(Cookie::getValue)
        .findFirst()
        .orElse(null);
  }
}
