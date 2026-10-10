package com.financialplatform.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "users")
public class AppUser {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "full_name", nullable = false, length = 120)
  private String fullName;

  @Column(nullable = false, unique = true, length = 254)
  private String email;

  @Column(name = "password_hash", nullable = false, length = 100)
  private String passwordHash;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private Role role;

  @Column(nullable = false)
  private boolean active = true;

  @Column(name = "profile_deleted", nullable = false)
  private boolean profileDeleted = false;

  @Column(name = "contact_email", length = 254)
  private String contactEmail;

  @Column(length = 40)
  private String phone;

  @Column(length = 500)
  private String address;

  @Column(name = "profile_image_data_url", columnDefinition = "text")
  private String profileImageDataUrl;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "business_id", nullable = false, updatable = false)
  private Business business;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt = Instant.now();

  protected AppUser() {}

  public AppUser(String fullName, String email, String passwordHash, Role role) {
    this(fullName, email, passwordHash, role, null);
  }

  public AppUser(String fullName, String email, String passwordHash, Role role, Business business) {
    this.fullName = fullName;
    this.email = email.toLowerCase();
    this.passwordHash = passwordHash;
    this.role = role;
    this.business = business;
  }

  public Long getId() {
    return id;
  }

  public String getFullName() {
    return fullName;
  }

  public String getEmail() {
    return email;
  }

  public String getPasswordHash() {
    return passwordHash;
  }

  public Role getRole() {
    return role;
  }

  public boolean isActive() {
    return active;
  }

  public boolean isProfileDeleted() {
    return profileDeleted;
  }

  public Business getBusiness() {
    return business;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public String getContactEmail() {
    return contactEmail == null ? email : contactEmail;
  }

  public String getPhone() {
    return phone;
  }

  public String getAddress() {
    return address;
  }

  public String getProfileImageDataUrl() {
    return profileImageDataUrl;
  }

  public void updateOwnProfile(String contactEmail, String address, String profileImageDataUrl) {
    this.contactEmail =
        contactEmail == null || contactEmail.isBlank() ? email : contactEmail.trim().toLowerCase();
    this.address = address == null || address.isBlank() ? null : address.trim();
    this.profileImageDataUrl =
        profileImageDataUrl == null || profileImageDataUrl.isBlank() ? null : profileImageDataUrl;
  }

  public void updateOwnerControlledDetails(String fullName, String phone, String loginEmail) {
    this.fullName = fullName.trim();
    this.phone = phone == null || phone.isBlank() ? null : phone.trim();
    this.email = loginEmail.trim().toLowerCase();
  }

  public void changePassword(String passwordHash) {
    this.passwordHash = passwordHash;
  }

  public void updateAccess(boolean active) {
    if (profileDeleted) throw new IllegalStateException("Deleted profiles cannot be reactivated");
    this.active = active;
  }

  public void deleteProfile() {
    this.active = false;
    this.profileDeleted = true;
  }
}
