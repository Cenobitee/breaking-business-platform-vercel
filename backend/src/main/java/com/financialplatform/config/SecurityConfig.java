package com.financialplatform.config;

import com.financialplatform.repository.UserRepository;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
  @Bean
  UserDetailsService userDetailsService(UserRepository users) {
    return username ->
        users
            .findByEmailIgnoreCase(username)
            .map(
                user ->
                    User.withUsername(user.getEmail())
                        .password(user.getPasswordHash())
                        .authorities("ROLE_" + user.getRole().name())
                        .disabled(!user.isActive())
                        .build())
            .orElseThrow(
                () ->
                    new org.springframework.security.core.userdetails.UsernameNotFoundException(
                        "User not found"));
  }

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  AuthenticationManager authenticationManager(
      UserDetailsService userDetailsService, PasswordEncoder encoder) {
    DaoAuthenticationProvider provider = new DaoAuthenticationProvider(encoder);
    provider.setUserDetailsService(userDetailsService);
    return new ProviderManager(provider);
  }

  @Bean
  SecretKey jwtSecretKey(@Value("${app.jwt.secret}") String secret) {
    if (secret.getBytes(StandardCharsets.UTF_8).length < 32) {
      throw new IllegalStateException("JWT_SECRET must contain at least 32 bytes");
    }
    return new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
  }

  @Bean
  JwtEncoder jwtEncoder(SecretKey key) {
    return new NimbusJwtEncoder(new ImmutableSecret<>(key));
  }

  @Bean
  JwtDecoder jwtDecoder(SecretKey key, UserRepository users) {
    NimbusJwtDecoder decoder =
        NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
    OAuth2TokenValidator<org.springframework.security.oauth2.jwt.Jwt> accountValidator =
        jwt ->
            users
                .findByEmailIgnoreCase(jwt.getSubject())
                .filter(user -> user.isActive() && !user.isProfileDeleted())
                .map(user -> OAuth2TokenValidatorResult.success())
                .orElseGet(
                    () ->
                        OAuth2TokenValidatorResult.failure(
                            new OAuth2Error(
                                "invalid_token",
                                "The account is inactive or no longer exists",
                                null)));
    OAuth2TokenValidator<org.springframework.security.oauth2.jwt.Jwt> audienceValidator =
        new JwtClaimValidator<List<String>>(
            "aud", audience -> audience != null && audience.contains("breaking-business-api"));
    decoder.setJwtValidator(
        new DelegatingOAuth2TokenValidator<>(
            JwtValidators.createDefaultWithIssuer("financial-transparency-platform"),
            audienceValidator,
            accountValidator));
    return decoder;
  }

  @Bean
  JwtAuthenticationConverter jwtAuthenticationConverter() {
    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(
        jwt -> {
          String role = jwt.getClaimAsString("role");
          return role == null ? List.of() : List.of(new SimpleGrantedAuthority("ROLE_" + role));
        });
    return converter;
  }

  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationConverter converter)
      throws Exception {
    return http.csrf(csrf -> csrf.disable())
        .cors(cors -> {})
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            auth ->
                auth.requestMatchers(
                        "/api/auth/login",
                        "/api/auth/register",
                        "/api/auth/refresh",
                        "/api/auth/logout",
                        "/api/auth/forgot-password",
                        "/api/auth/reset-password",
                        "/error")
                    .permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/sales")
                    .hasAnyRole("OWNER", "MANAGER")
                    .requestMatchers(HttpMethod.POST, "/api/sales/bulk-delete")
                    .hasAnyRole("OWNER", "MANAGER")
                    .requestMatchers(HttpMethod.DELETE, "/api/sales/*")
                    .hasAnyRole("OWNER", "MANAGER")
                    .requestMatchers(HttpMethod.POST, "/api/investments/requests")
                    .hasRole("INVESTOR")
                    .requestMatchers(HttpMethod.GET, "/api/investments/me")
                    .hasRole("INVESTOR")
                    .requestMatchers(HttpMethod.GET, "/api/investments/packages")
                    .hasAnyRole("OWNER", "INVESTOR")
                    .requestMatchers(HttpMethod.PUT, "/api/investments/packages/*")
                    .hasRole("OWNER")
                    .requestMatchers(HttpMethod.POST, "/api/investments/packages")
                    .hasRole("OWNER")
                    .requestMatchers(HttpMethod.DELETE, "/api/investments/packages/*")
                    .hasRole("OWNER")
                    .requestMatchers(HttpMethod.GET, "/api/investments/requests/pending")
                    .hasRole("OWNER")
                    .requestMatchers(HttpMethod.POST, "/api/investments/requests/*/approve")
                    .hasRole("OWNER")
                    .requestMatchers(HttpMethod.DELETE, "/api/investments/requests/*")
                    .hasRole("OWNER")
                    .requestMatchers(HttpMethod.GET, "/api/investments/active")
                    .hasRole("OWNER")
                    .requestMatchers(HttpMethod.GET, "/api/investments/cycles")
                    .hasRole("OWNER")
                    .requestMatchers(HttpMethod.POST, "/api/investments/cycles/*/complete")
                    .hasRole("OWNER")
                    .requestMatchers(HttpMethod.POST, "/api/investments/cycles/*/withdraw")
                    .hasRole("INVESTOR")
                    .requestMatchers(HttpMethod.POST, "/api/investments/*/remove")
                    .hasRole("OWNER")
                    .requestMatchers(HttpMethod.DELETE, "/api/investments/history")
                    .hasRole("OWNER")
                    .requestMatchers(HttpMethod.POST, "/api/users")
                    .hasRole("OWNER")
                    .requestMatchers(HttpMethod.PUT, "/api/business")
                    .hasRole("OWNER")
                    .requestMatchers("/api/employees/**")
                    .hasAnyRole("OWNER", "MANAGER")
                    .requestMatchers("/api/products/**")
                    .hasAnyRole("OWNER", "MANAGER")
                    .requestMatchers("/api/product-profits/**")
                    .hasRole("OWNER")
                    .requestMatchers("/api/expenses/**")
                    .hasAnyRole("OWNER", "MANAGER")
                    .requestMatchers("/api/profile/members/**")
                    .hasRole("OWNER")
                    .requestMatchers("/api/profile/me")
                    .authenticated()
                    .requestMatchers("/api/accounting/**")
                    .hasAnyRole("OWNER", "MANAGER")
                    .requestMatchers(
                        HttpMethod.GET, "/api/sales", "/api/users", "/api/analytics/operations")
                    .hasAnyRole("OWNER", "MANAGER")
                    .requestMatchers(HttpMethod.GET, "/api/analytics/investor")
                    .hasAnyRole("OWNER", "INVESTOR")
                    .anyRequest()
                    .authenticated())
        .oauth2ResourceServer(
            oauth ->
                oauth
                    .bearerTokenResolver(cookieBearerTokenResolver())
                    .jwt(jwt -> jwt.jwtAuthenticationConverter(converter)))
        .build();
  }

  @Bean
  BearerTokenResolver cookieBearerTokenResolver() {
    DefaultBearerTokenResolver authorizationHeader = new DefaultBearerTokenResolver();
    return request -> {
      if (request.getCookies() != null) {
        for (jakarta.servlet.http.Cookie cookie : request.getCookies()) {
          if ("bb_access".equals(cookie.getName()) && !cookie.getValue().isBlank()) {
            return cookie.getValue();
          }
        }
      }
      return authorizationHeader.resolve(request);
    };
  }

  @Bean
  CorsConfigurationSource corsConfigurationSource(
      @Value("${app.cors.allowed-origins}") String allowedOrigins) {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(
        Arrays.stream(allowedOrigins.split(","))
            .map(String::trim)
            .filter(origin -> !origin.isBlank())
            .toList());
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
    config.setAllowCredentials(true);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", config);
    return source;
  }
}
