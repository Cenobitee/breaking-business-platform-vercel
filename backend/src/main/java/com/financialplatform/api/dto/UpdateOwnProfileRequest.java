package com.financialplatform.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record UpdateOwnProfileRequest(
    @Email @Size(max = 254) String contactEmail,
    @Size(max = 500) String address,
    @Size(max = 950000) String profileImageDataUrl,
    @Size(min = 1, max = 120) String fullName,
    @Size(max = 40) String phone,
    @Email @Size(max = 254) String loginEmail) {}
