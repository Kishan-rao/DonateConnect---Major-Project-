package com.donateconnect.service;

import com.donateconnect.dto.ChangePasswordRequest;
import com.donateconnect.dto.UserPreferenceDto;
import com.donateconnect.dto.UserResponseDto;

import java.util.UUID;

public interface UserService {
    UserResponseDto getCurrentUserProfile(UUID userId);
    void changePassword(UUID userId, ChangePasswordRequest request);
    UserPreferenceDto getUserPreferences(UUID userId);
    UserPreferenceDto updateUserPreferences(UUID userId, UserPreferenceDto dto);
    void deleteAccount(UUID userId);
}
