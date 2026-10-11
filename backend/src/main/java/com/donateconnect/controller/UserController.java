package com.donateconnect.controller;

import com.donateconnect.config.JwtUtils;
import com.donateconnect.dto.*;
import com.donateconnect.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.security.core.Authentication;
import com.donateconnect.entity.User;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final JwtUtils jwtUtils;
    private final com.donateconnect.repository.UserRepository userRepository;

    private UUID extractUserId(Authentication authentication, HttpServletRequest request) {
        if (authentication != null && authentication.isAuthenticated() && authentication.getName() != null) {
            String email = authentication.getName();
            return userRepository.findByEmail(email)
                    .map(User::getId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account not found"));
        }

        String authHeader = request.getHeader("Authorization");
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtUtils.validateToken(token)) {
                return jwtUtils.getUserIdFromToken(token);
            }
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or missing authorization token");
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponseDto>> getCurrentUser(
            Authentication authentication,
            HttpServletRequest request
    ) {
        UUID userId = extractUserId(authentication, request);
        UserResponseDto userDto = userService.getCurrentUserProfile(userId);
        return ResponseEntity.ok(ApiResponse.success("User profile fetched successfully", userDto));
    }

    @PutMapping("/me/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid @RequestBody ChangePasswordRequest passwordRequest,
            Authentication authentication,
            HttpServletRequest request
    ) {
        UUID userId = extractUserId(authentication, request);
        userService.changePassword(userId, passwordRequest);
        return ResponseEntity.ok(ApiResponse.success("Password changed successfully", null));
    }

    @GetMapping("/me/preferences")
    public ResponseEntity<ApiResponse<UserPreferenceDto>> getPreferences(
            Authentication authentication,
            HttpServletRequest request
    ) {
        UUID userId = extractUserId(authentication, request);
        UserPreferenceDto preferences = userService.getUserPreferences(userId);
        return ResponseEntity.ok(ApiResponse.success("User preferences fetched successfully", preferences));
    }

    @PutMapping("/me/preferences")
    public ResponseEntity<ApiResponse<UserPreferenceDto>> updatePreferences(
            @Valid @RequestBody UserPreferenceDto preferencesDto,
            Authentication authentication,
            HttpServletRequest request
    ) {
        UUID userId = extractUserId(authentication, request);
        UserPreferenceDto updated = userService.updateUserPreferences(userId, preferencesDto);
        return ResponseEntity.ok(ApiResponse.success("User preferences updated successfully", updated));
    }

    @DeleteMapping("/me")
    public ResponseEntity<ApiResponse<Void>> deleteAccount(
            @RequestBody(required = false) DeleteAccountRequest deleteRequest,
            Authentication authentication,
            HttpServletRequest request
    ) {
        UUID userId = extractUserId(authentication, request);
        if (deleteRequest != null && StringUtils.hasText(deleteRequest.getConfirmation())) {
            if (!"DELETE".equalsIgnoreCase(deleteRequest.getConfirmation().trim())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Confirmation must be DELETE");
            }
        }
        userService.deleteAccount(userId);
        return ResponseEntity.ok(ApiResponse.success("Account deleted successfully", null));
    }
}
