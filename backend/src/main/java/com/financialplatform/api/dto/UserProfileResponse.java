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
    String professionalHeadline,
    String professionalSummary,
    String educationSummary,
    String experienceSummary,
    String professionalSkills,
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
        user.getProfessionalHeadline(),
        user.getProfessionalSummary(),
        user.getEducationSummary(),
        user.getExperienceSummary(),
        user.getProfessionalSkills(),
        user.getRole(),
        user.isActive(),
        ownerEditingAllowed);
  }
}
