package com.financialplatform.service;

import com.financialplatform.domain.AppUser;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

@Service
public class TokenService {
  private final JwtEncoder encoder;
  private final long ttlMinutes;

  public TokenService(JwtEncoder encoder, @Value("${app.jwt.ttl-minutes}") long ttlMinutes) {
    this.encoder = encoder;
    this.ttlMinutes = ttlMinutes;
  }

  public IssuedToken issue(AppUser user) {
    Instant now = Instant.now();
    Instant expiresAt = now.plus(ttlMinutes, ChronoUnit.MINUTES);
    JwtClaimsSet claims =
        JwtClaimsSet.builder()
            .issuer("financial-transparency-platform")
            .audience(java.util.List.of("breaking-business-api"))
            .issuedAt(now)
            .expiresAt(expiresAt)
            .subject(user.getEmail())
            .claim("userId", user.getId())
            .claim("role", user.getRole().name())
            .claim("businessId", user.getBusiness().getId())
            .build();
    return new IssuedToken(
        encoder
            .encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
            .getTokenValue(),
        ttlMinutes * 60);
  }

  public record IssuedToken(String value, long expiresInSeconds) {}
}
