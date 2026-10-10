package com.financialplatform.service;

import com.financialplatform.api.dto.*;
import com.financialplatform.domain.*;
import com.financialplatform.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserProfileService {
  private final UserRepository users;

  public UserProfileService(UserRepository users) {
    this.users = users;
  }

  @Transactional(readOnly = true)
  public UserProfileResponse me(String email) {
    AppUser user = user(email);
    return UserProfileResponse.from(user, user.getRole() == Role.OWNER);
  }

  @Transactional
  public UserProfileResponse updateMe(UpdateOwnProfileRequest request, String email) {
    AppUser user = user(email);
    user.updateOwnProfile(request.contactEmail(), request.address(), request.profileImageDataUrl());
    if (user.getRole() == Role.OWNER) {
      String fullName = request.fullName() == null ? user.getFullName() : request.fullName();
      String phone = request.phone() == null ? user.getPhone() : request.phone();
      String loginEmail =
          request.loginEmail() == null
              ? user.getEmail()
              : request.loginEmail().trim().toLowerCase();
      users
          .findByEmailIgnoreCase(loginEmail)
          .filter(existing -> !existing.getId().equals(user.getId()))
          .ifPresent(
              existing -> {
                throw new IllegalArgumentException(
                    "An account with this login email already exists");
              });
      user.updateOwnerControlledDetails(fullName, phone, loginEmail);
    }
    return UserProfileResponse.from(user, user.getRole() == Role.OWNER);
  }

  @Transactional(readOnly = true)
  public UserProfileResponse member(long id, String ownerEmail) {
    AppUser owner = owner(ownerEmail);
    AppUser member = member(id, owner);
    return UserProfileResponse.from(member, true);
  }

  @Transactional
  public UserProfileResponse updateMember(
      long id, OwnerUpdateMemberProfileRequest request, String ownerEmail) {
    AppUser owner = owner(ownerEmail);
    AppUser member = member(id, owner);
    String loginEmail = request.loginEmail().trim().toLowerCase();
    users
        .findByEmailIgnoreCase(loginEmail)
        .filter(existing -> !existing.getId().equals(member.getId()))
        .ifPresent(
            existing -> {
              throw new IllegalArgumentException("An account with this login email already exists");
            });
    member.updateOwnerControlledDetails(request.fullName(), request.phone(), loginEmail);
    return UserProfileResponse.from(member, true);
  }

  @Transactional
  public UserProfileResponse updateMemberAccess(long id, boolean active, String ownerEmail) {
    AppUser owner = owner(ownerEmail);
    AppUser member = manageableMember(id, owner);
    member.updateAccess(active);
    return UserProfileResponse.from(member, true);
  }

  @Transactional
  public void deleteMember(long id, String ownerEmail) {
    AppUser owner = owner(ownerEmail);
    AppUser member = manageableMember(id, owner);
    member.deleteProfile();
  }

  private AppUser user(String email) {
    return users.findByEmailIgnoreCase(email).orElseThrow();
  }

  private AppUser owner(String email) {
    AppUser owner = user(email);
    if (owner.getRole() != Role.OWNER)
      throw new IllegalArgumentException("Owner access is required");
    return owner;
  }

  private AppUser member(long id, AppUser owner) {
    AppUser member =
        users.findById(id).orElseThrow(() -> new IllegalArgumentException("Profile not found"));
    if (!member.getBusiness().getId().equals(owner.getBusiness().getId()))
      throw new IllegalArgumentException("Profile not found");
    if (member.isProfileDeleted()) throw new IllegalArgumentException("Profile not found");
    return member;
  }

  private AppUser manageableMember(long id, AppUser owner) {
    AppUser member = member(id, owner);
    if (member.getRole() == Role.OWNER)
      throw new IllegalArgumentException("The Owner profile cannot be disabled or deleted");
    return member;
  }
}
