package com.financialplatform.api.dto;

import com.financialplatform.domain.AppUser;
import com.financialplatform.domain.Role;

public record UserProfileResponse(
    Long id,
    String fullName,
    String loginEmail,
    String contactEmail,
    String phone,
    String address,
    String profileImageDataUrl,
    Role role,
    boolean active,
    boolean ownerEditingAllowed) {
  public static UserProfileResponse from(AppUser user, boolean ownerEditingAllowed) {
    return new UserProfileResponse(
        user.getId(),
        user.getFullName(),
        user.getEmail(),
        user.getContactEmail(),
        user.getPhone(),
        user.getAddress(),
        user.getProfileImageDataUrl(),
        user.getRole(),
        user.isActive(),
        ownerEditingAllowed);
  }
}
