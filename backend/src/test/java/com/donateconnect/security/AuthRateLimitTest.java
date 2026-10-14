
package com.donateconnect.security;

import com.donateconnect.dto.VerifyOtpRequest;
import com.donateconnect.entity.Role;
import com.donateconnect.entity.User;
import com.donateconnect.repository.UserRepository;
import com.donateconnect.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AuthRateLimitTest {

    @Autowired
    private AuthService authService;

    @MockBean
    private com.donateconnect.service.EmailService emailService;

    @Autowired
    private UserRepository userRepository;

    private User testUser;

    @BeforeEach
    void setup() {
        testUser = userRepository.save(User.builder()
                .email("ratelimit@test.com")
                .fullName("Rate Limit User")
                .passwordHash("hash")
                .role(Role.DONOR)
                .approved(true)
                .otp("123456")
                .otpExpiry(LocalDateTime.now().plusMinutes(5))
                .build());
    }

    @Test
    void testResendOtpCooldown() {
        testUser.setLastOtpSentAt(LocalDateTime.now().minusSeconds(30));
        userRepository.save(testUser);

        assertDoesNotThrow(() ->
                authService.resendOtp("ratelimit@test.com", "127.0.0.1"));

        verify(emailService, never())
                .sendOtpEmail(anyString(), anyString());

        testUser.setLastOtpSentAt(LocalDateTime.now().minusSeconds(65));
        userRepository.save(testUser);

        assertDoesNotThrow(() ->
                authService.resendOtp("ratelimit@test.com", "127.0.0.1"));

        verify(emailService, times(1))
                .sendOtpEmail(anyString(), anyString());
    }

    @Test
    void testResendOtpMaxResendsPerHour() {
        testUser.setLastOtpSentAt(LocalDateTime.now().minusSeconds(65));
        testUser.setFirstOtpResendAt(LocalDateTime.now().minusMinutes(10));
        testUser.setOtpResendCount(5);
        userRepository.save(testUser);

        assertDoesNotThrow(() ->
                authService.resendOtp("ratelimit@test.com", "127.0.0.1"));

        verify(emailService, never())
                .sendOtpEmail(anyString(), anyString());

        testUser.setFirstOtpResendAt(LocalDateTime.now().minusMinutes(65));
        userRepository.save(testUser);

        assertDoesNotThrow(() ->
                authService.resendOtp("ratelimit@test.com", "127.0.0.1"));

        verify(emailService, times(1))
                .sendOtpEmail(anyString(), anyString());
    }

    @Test
    void testIpRateLimit() {
        String ip = "192.168.1.100";

        for (int i = 0; i < 5; i++) {
            authService.resendOtp("nonexistent" + i + "@test.com", ip);
        }

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> authService.resendOtp("nonexistent6@test.com", ip)
        );

        assertTrue(ex.getReason() != null
                && ex.getReason().contains("Too many requests from this IP"));
    }

    @Test
    void testTotalOtpAttemptsCap() {
        testUser.setOtp("123456");
        testUser.setOtpExpiry(LocalDateTime.now().plusMinutes(5));
        testUser.setTotalOtpAttempts(9);
        userRepository.save(testUser);

        VerifyOtpRequest request = new VerifyOtpRequest();
        request.setEmail("ratelimit@test.com");
        request.setOtp("wrong");

        assertThrows(
                BadCredentialsException.class,
                () -> authService.verifyOtp(request)
        );

        User updated = userRepository.findById(testUser.getId()).orElseThrow();
        assertEquals(10, updated.getTotalOtpAttempts());

        request.setOtp("123456");

        BadCredentialsException ex = assertThrows(
                BadCredentialsException.class,
                () -> authService.verifyOtp(request)
        );

        assertTrue(ex.getMessage().contains("Too many invalid attempts"));

        updated = userRepository.findById(testUser.getId()).orElseThrow();
        assertNull(updated.getOtp());
    }

    @Test
    void testResendOtpGenericResponse() {
        assertDoesNotThrow(() ->
                authService.resendOtp("totally_fake@test.com", "127.0.0.1"));

        verify(emailService, never())
                .sendOtpEmail(anyString(), anyString());
    }
}
