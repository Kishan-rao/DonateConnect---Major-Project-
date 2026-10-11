
package com.donateconnect.service.impl;

import com.donateconnect.config.JwtUtils;
import com.donateconnect.dto.*;
import com.donateconnect.entity.NGOProfile;
import com.donateconnect.entity.Role;
import com.donateconnect.entity.User;
import com.donateconnect.exception.ResourceNotFoundException;
import com.donateconnect.repository.NGOProfileRepository;
import com.donateconnect.repository.UserRepository;
import com.donateconnect.service.AuthService;
import com.donateconnect.service.EmailService;
import com.donateconnect.service.OtpRateLimitService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final int MAX_OTP_ATTEMPTS = 3;
    private static final int MAX_TOTAL_OTP_ATTEMPTS = 10;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final EmailService emailService;
    private final NGOProfileRepository ngoProfileRepository;
    private final OtpRateLimitService otpRateLimitService;

    private final SecureRandom secureRandom = new SecureRandom();

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Email is required.");
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String generateOtp() {
        return String.format("%06d", secureRandom.nextInt(1_000_000));
    }

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Registration details are required.");
        }

        String email = normalizeEmail(request.getEmail());

        if (request.getFullName() == null || request.getFullName().isBlank()) {
            throw new IllegalArgumentException("Full name is required.");
        }

        if (request.getPassword() == null || request.getPassword().length() < 6) {
            throw new IllegalArgumentException(
                    "Password must contain at least 6 characters."
            );
        }

        // Public registration is restricted to these roles.
        // Delivery Partner is represented by VOLUNTEER in the backend.
        Role requestedRole = request.getRole() == null
                ? Role.DONOR
                : request.getRole();

        if (requestedRole != Role.DONOR
                && requestedRole != Role.VOLUNTEER
                && requestedRole != Role.NGO) {
            throw new IllegalArgumentException(
                    "Public registration is restricted to DONOR, VOLUNTEER, or NGO."
            );
        }

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException(
                    "Email address is already registered."
            );
        }

        String address = request.getAddress() == null
                ? ""
                : request.getAddress().trim();

        String phone = request.getPhone() == null
                ? ""
                : request.getPhone().trim();

        if (requestedRole == Role.NGO) {
            if (address.isBlank() || phone.isBlank()) {
                throw new IllegalArgumentException(
                        "Address and phone number are required for NGO registration."
                );
            }

            String lowerAddress = address.toLowerCase(Locale.ROOT);
            if (!lowerAddress.contains("bengaluru")
                    && !lowerAddress.contains("bangalore")) {
                throw new IllegalArgumentException(
                        "We currently accept NGOs operating in the Bengaluru region."
                );
            }
        }

        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .role(requestedRole)
                // NGO and Delivery Partner accounts need admin approval.
                .approved(requestedRole == Role.DONOR)
                .build();

        User savedUser = userRepository.save(user);

        // Create the NGO profile in the same transaction as the user.
        if (requestedRole == Role.NGO) {
            NGOProfile ngoProfile = NGOProfile.builder()
                    .user(savedUser)
                    .name(savedUser.getFullName())
                    .description("")
                    .address(address)
                    .phone(phone)
                    .verified(false)
                    .build();

            ngoProfileRepository.save(ngoProfile);
        }

        // Every newly registered account must verify its email.
        String otp = generateOtp();
        savedUser.setOtp(otp);
        savedUser.setOtpExpiry(
                LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES)
        );
        savedUser.setOtpAttempts(0);
        savedUser.setTotalOtpAttempts(0);
        savedUser.setFirstOtpFailureAt(null);

        userRepository.save(savedUser);

        // If email delivery fails, registration should fail rather than
        // claim that an OTP was successfully sent.
        emailService.sendOtpEmail(email, otp);

        return AuthResponse.builder()
                .token(null)
                .user(mapToDto(savedUser))
                .requiresOtp(true)
                .build();
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.getEmail());

        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new BadCredentialsException("Invalid email or password")
                );

        if (!passwordEncoder.matches(
                request.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        // Admin approval is separate from email verification.
        if (!user.isApproved()
                && user.getRole() != Role.DONOR
                && user.getRole() != Role.ADMIN) {
            throw new BadCredentialsException(
                    "Your email may be verified, but your account is pending admin approval."
            );
        }

        if (user.getOtp() != null) {
            throw new BadCredentialsException(
                    "Please verify your email before logging in."
            );
        }

        String token = jwtUtils.generateToken(user);

        return AuthResponse.builder()
                .token(token)
                .user(mapToDto(user))
                .requiresOtp(false)
                .build();
    }

    @Override
    @Transactional(noRollbackFor = BadCredentialsException.class)
    public AuthResponse verifyOtp(VerifyOtpRequest request) {
        String email = normalizeEmail(request.getEmail());

        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new BadCredentialsException(
                                "Invalid email or session expired."
                        )
                );

        if (user.getOtp() == null || user.getOtpExpiry() == null) {
            throw new BadCredentialsException(
                    "No active OTP session found. Please request a new OTP."
            );
        }

        LocalDateTime now = LocalDateTime.now();

        // Reset the rolling 24-hour attempt window when it has expired.
        if (user.getFirstOtpFailureAt() != null
                && user.getFirstOtpFailureAt().isBefore(now.minusHours(24))) {
            user.setTotalOtpAttempts(0);
            user.setFirstOtpFailureAt(null);
        }

        if (now.isAfter(user.getOtpExpiry())) {
            user.setOtp(null);
            user.setOtpExpiry(null);
            user.setOtpAttempts(0);
            userRepository.save(user);

            throw new BadCredentialsException(
                    "OTP has expired. Please request a new OTP."
            );
        }

        if (user.getOtpAttempts() >= MAX_OTP_ATTEMPTS
                || user.getTotalOtpAttempts() >= MAX_TOTAL_OTP_ATTEMPTS) {
            user.setOtp(null);
            user.setOtpExpiry(null);
            user.setOtpAttempts(0);
            userRepository.save(user);

            throw new BadCredentialsException(
                    "Too many invalid attempts. Please request a new OTP."
            );
        }

        if (request.getOtp() == null
                || !user.getOtp().equals(request.getOtp().trim())) {
            if (user.getTotalOtpAttempts() == 0) {
                user.setFirstOtpFailureAt(now);
            }

            user.setOtpAttempts(user.getOtpAttempts() + 1);
            user.setTotalOtpAttempts(user.getTotalOtpAttempts() + 1);
            userRepository.save(user);

            throw new BadCredentialsException("Invalid OTP code.");
        }

        // Correct OTP: clear the OTP and reset attempt counters.
        user.setOtp(null);
        user.setOtpExpiry(null);
        user.setOtpAttempts(0);
        user.setTotalOtpAttempts(0);
        user.setFirstOtpFailureAt(null);
        userRepository.save(user);

        // Do not issue a token to an unapproved NGO or volunteer.
        // noRollbackFor ensures successful OTP verification remains saved
        // when this exception is returned to the client.
        if (!user.isApproved()
                && user.getRole() != Role.DONOR
                && user.getRole() != Role.ADMIN) {
            throw new BadCredentialsException(
                    "Email verified successfully. Your account is pending admin approval."
            );
        }

        String token = jwtUtils.generateToken(user);

        return AuthResponse.builder()
                .token(token)
                .user(mapToDto(user))
                .requiresOtp(false)
                .build();
    }

    @Override
    @Transactional
    public void resendOtp(String email, String clientIp) {
        if (otpRateLimitService.isIpRateLimited(clientIp)) {
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Too many requests from this IP. Please try again later."
            );
        }

        String normalizedEmail = normalizeEmail(email);

        // Do not reveal whether an account exists.
        User user = userRepository.findByEmail(normalizedEmail).orElse(null);
        if (user == null) {
            return;
        }

        // Do not resend an OTP to an already verified account.
        if (user.getOtp() == null) {
            return;
        }

        // One resend per 60 seconds.
        if (user.getLastOtpSentAt() != null
                && LocalDateTime.now().isBefore(
                        user.getLastOtpSentAt().plusSeconds(60))) {
            return;
        }

        // Maximum five resends per rolling hour.
        if (user.getFirstOtpResendAt() == null
                || LocalDateTime.now().isAfter(
                        user.getFirstOtpResendAt().plusHours(1))) {
            user.setFirstOtpResendAt(LocalDateTime.now());
            user.setOtpResendCount(0);
        }

        if (user.getOtpResendCount() >= 5) {
            return;
        }

        String otp = generateOtp();
        user.setOtp(otp);
        user.setOtpExpiry(
                LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES)
        );
        user.setOtpAttempts(0);
        user.setLastOtpSentAt(LocalDateTime.now());
        user.setOtpResendCount(user.getOtpResendCount() + 1);
        userRepository.save(user);

        emailService.sendOtpEmail(user.getEmail(), otp);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponseDto getCurrentUser(String email) {
        User user = userRepository.findByEmail(normalizeEmail(email))
                .orElseThrow(() ->
                        new ResourceNotFoundException("User profile not found")
                );

        return mapToDto(user);
    }

    private UserResponseDto mapToDto(User user) {
        return UserResponseDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .approved(user.isApproved())
                .averageRating(user.getAverageRating())
                .ratingCount(user.getRatingCount())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
