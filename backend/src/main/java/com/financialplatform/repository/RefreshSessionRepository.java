package com.financialplatform.repository;

import com.financialplatform.domain.RefreshSession;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshSessionRepository extends JpaRepository<RefreshSession, Long> {
  Optional<RefreshSession> findByTokenHashAndRevokedAtIsNull(String tokenHash);
}
