package com.financialplatform.service;

import com.financialplatform.api.dto.AuthResponse;
import com.financialplatform.api.dto.ForgotPasswordResponse;
import com.financialplatform.api.dto.LoginRequest;
import com.financialplatform.api.dto.RegisterRequest;
import com.financialplatform.domain.AppUser;
import com.financialplatform.domain.Business;
import com.financialplatform.domain.PasswordResetToken;
import com.financialplatform.domain.RefreshSession;
import com.financialplatform.domain.Role;
import com.financialplatform.repository.BusinessRepository;
import com.financialplatform.repository.PasswordResetTokenRepository;
import com.financialplatform.repository.RefreshSessionRepository;
import com.financialplatform.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
  private final AuthenticationManager authenticationManager;
  private final UserRepository users;
  private final BusinessRepository businesses;
  private final PasswordResetTokenRepository resetTokens;
  private final RefreshSessionRepository refreshSessions;
  private final TokenService tokenService;
  private final PasswordEncoder passwordEncoder;
  private final long resetTtlMinutes;
  private final boolean exposeResetToken;
  private final long refreshTtlHours;
  private final long rememberRefreshTtlDays;
  private final SecureRandom secureRandom = new SecureRandom();

  public AuthService(
      AuthenticationManager authenticationManager,
      UserRepository users,
      BusinessRepository businesses,
      PasswordResetTokenRepository resetTokens,
      RefreshSessionRepository refreshSessions,
      TokenService tokenService,
      PasswordEncoder passwordEncoder,
      @Value("${app.password-reset.ttl-minutes:30}") long resetTtlMinutes,
      @Value("${app.password-reset.expose-token:false}") boolean exposeResetToken,
      @Value("${app.jwt.refresh-ttl-hours:8}") long refreshTtlHours,
      @Value("${app.jwt.remember-refresh-ttl-days:30}") long rememberRefreshTtlDays) {
    this.authenticationManager = authenticationManager;
    this.users = users;
    this.businesses = businesses;
    this.resetTokens = resetTokens;
    this.refreshSessions = refreshSessions;
    this.tokenService = tokenService;
    this.passwordEncoder = passwordEncoder;
    this.resetTtlMinutes = resetTtlMinutes;
    this.exposeResetToken = exposeResetToken;
    this.refreshTtlHours = refreshTtlHours;
    this.rememberRefreshTtlDays = rememberRefreshTtlDays;
  }

  @Transactional(readOnly = true)
  public AuthSession login(LoginRequest request) {
    String email = request.email().trim().toLowerCase();
    authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(email, request.password()));
    AppUser user = users.findByEmailIgnoreCase(email).orElseThrow();
    return authenticatedSession(user, request.rememberMe());
  }

  @Transactional
  public AuthSession register(RegisterRequest request) {
    String email = request.email().trim().toLowerCase();
    if (users.findByEmailIgnoreCase(email).isPresent()) {
      throw new IllegalArgumentException("An account with this email already exists");
    }
    Business business = businesses.save(new Business(request.businessName().trim()));
    AppUser user =
        users.save(
            new AppUser(
                request.fullName().trim(),
                email,
                passwordEncoder.encode(request.password()),
                Role.OWNER,
                business));
    return authenticatedSession(user, false);
  }

  @Transactional
  public AuthSession refresh(String rawRefreshToken) {
    RefreshSession current =
        refreshSessions
            .findByTokenHashAndRevokedAtIsNull(hashToken(rawRefreshToken))
            .orElseThrow(() -> new IllegalArgumentException("Refresh session is invalid"));
    Instant now = Instant.now();
    AppUser user = current.getUser();
    if (current.getExpiresAt().isBefore(now) || !user.isActive() || user.isProfileDeleted()) {
      current.revoke(now);
      throw new IllegalArgumentException("Refresh session has expired");
    }
    long remainingSeconds = current.getExpiresAt().getEpochSecond() - now.getEpochSecond();
    boolean remembered = remainingSeconds > refreshTtlHours * 60 * 60;
    current.revoke(now);
    return authenticatedSession(user, remembered);
  }

  @Transactional
  public void logout(String rawRefreshToken) {
    if (rawRefreshToken == null || rawRefreshToken.isBlank()) return;
    refreshSessions
        .findByTokenHashAndRevokedAtIsNull(hashToken(rawRefreshToken))
        .ifPresent(session -> session.revoke(Instant.now()));
  }

  @Transactional(readOnly = true)
  public AuthResponse.UserView currentUser(String email) {
    return users
        .findByEmailIgnoreCase(email)
        .filter(user -> user.isActive() && !user.isProfileDeleted())
        .map(this::userView)
        .orElseThrow(() -> new IllegalArgumentException("Account is unavailable"));
  }

  @Transactional
  public ForgotPasswordResponse forgotPassword(String requestedEmail) {
    String email = requestedEmail.trim().toLowerCase();
    String rawToken =
        users
            .findByEmailIgnoreCase(email)
            .filter(AppUser::isActive)
            .map(
                user -> {
                  resetTokens.deleteByUser(user);
                  String token = generateToken();
                  resetTokens.save(
                      new PasswordResetToken(
                          user,
                          hashToken(token),
                          Instant.now().plus(resetTtlMinutes, ChronoUnit.MINUTES)));
                  return token;
                })
            .orElse(null);

    return new ForgotPasswordResponse(
        "If an active account exists for that email, password reset instructions are ready.",
        exposeResetToken ? rawToken : null);
  }

  @Transactional
  public void resetPassword(String rawToken, String newPassword) {
    PasswordResetToken token =
        resetTokens
            .findByTokenHashAndUsedAtIsNull(hashToken(rawToken))
            .orElseThrow(
                () ->
                    new IllegalArgumentException(
                        "This password reset link is invalid or has already been used"));
    Instant now = Instant.now();
    if (token.getExpiresAt().isBefore(now)) {
      throw new IllegalArgumentException(
          "This password reset link has expired. Request a new one.");
    }
    token.getUser().changePassword(passwordEncoder.encode(newPassword));
    token.markUsed(now);
  }

  private AuthSession authenticatedSession(AppUser user, boolean rememberMe) {
    TokenService.IssuedToken accessToken = tokenService.issue(user);
    String refreshToken = generateToken();
    long refreshSeconds =
        rememberMe
            ? rememberRefreshTtlDays * 24 * 60 * 60
            : refreshTtlHours * 60 * 60;
    refreshSessions.save(
        new RefreshSession(
            user, hashToken(refreshToken), Instant.now().plus(refreshSeconds, ChronoUnit.SECONDS)));
    return new AuthSession(
        new AuthResponse(accessToken.expiresInSeconds(), userView(user)),
        accessToken.value(),
        refreshToken,
        refreshSeconds,
        rememberMe);
  }

  private AuthResponse.UserView userView(AppUser user) {
    return new AuthResponse.UserView(
        user.getId(),
        user.getFullName(),
        user.getEmail(),
        user.getRole(),
        user.getBusiness().getId(),
        user.getBusiness().getName());
  }

  private String generateToken() {
    byte[] bytes = new byte[32];
    secureRandom.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  private String hashToken(String token) {
    try {
      byte[] digest =
          MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
      return java.util.HexFormat.of().formatHex(digest);
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 is unavailable", exception);
    }
  }

  public record AuthSession(
      AuthResponse response,
      String accessToken,
      String refreshToken,
      long refreshExpiresInSeconds,
      boolean remembered) {}
}
