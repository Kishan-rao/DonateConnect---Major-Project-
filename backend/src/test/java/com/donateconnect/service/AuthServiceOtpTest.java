package com.donateconnect.service;

import com.donateconnect.config.JwtUtils;
import com.donateconnect.dto.AuthResponse;
import com.donateconnect.dto.RegisterRequest;
import com.donateconnect.dto.VerifyOtpRequest;
import com.donateconnect.entity.NGOProfile;
import com.donateconnect.entity.Role;
import com.donateconnect.entity.User;
import com.donateconnect.exception.EmailDeliveryException;
import com.donateconnect.exception.ResourceNotFoundException;
import com.donateconnect.repository.NGOProfileRepository;
import com.donateconnect.repository.UserRepository;
import com.donateconnect.service.impl.AuthServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceOtpTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtils jwtUtils;

    @Mock
    private EmailService emailService;

    @Mock
    private NGOProfileRepository ngoProfileRepository;

    @Mock
    private OtpRateLimitService otpRateLimitService;

    @InjectMocks
    private AuthServiceImpl authService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setEmail("test@test.com");
        testUser.setFullName("Test User");
        testUser.setOtp("123456");
        testUser.setOtpExpiry(LocalDateTime.now().plusMinutes(5));
        testUser.setOtpAttempts(0);
        testUser.setTotalOtpAttempts(0);
        testUser.setRole(Role.DONOR);
        testUser.setApproved(true);
    }

    @Test
    void testSuccessfulOtpResetsCounters() {
        when(userRepository.findByEmail("test@test.com"))
                .thenReturn(Optional.of(testUser));
        when(jwtUtils.generateToken(any()))
                .thenReturn("token");

        testUser.setTotalOtpAttempts(5);
        testUser.setFirstOtpFailureAt(LocalDateTime.now().minusHours(1));

        VerifyOtpRequest request = new VerifyOtpRequest();
        request.setEmail("test@test.com");
        request.setOtp("123456");

        authService.verifyOtp(request);

        assertEquals(0, testUser.getTotalOtpAttempts());
        assertNull(testUser.getFirstOtpFailureAt());
        assertNull(testUser.getOtp());
    }

    @Test
    void testLockoutExpiresAfterWindow() {
        when(userRepository.findByEmail("test@test.com"))
                .thenReturn(Optional.of(testUser));
        when(jwtUtils.generateToken(any()))
                .thenReturn("token");

        testUser.setTotalOtpAttempts(10);
        testUser.setFirstOtpFailureAt(LocalDateTime.now().minusHours(25));

        VerifyOtpRequest request = new VerifyOtpRequest();
        request.setEmail("test@test.com");
        request.setOtp("123456");

        authService.verifyOtp(request);

        assertEquals(0, testUser.getTotalOtpAttempts());
    }

    @Test
    void testSecureRandomFormat() {
        when(userRepository.findByEmail("test@test.com"))
                .thenReturn(Optional.of(testUser));

        authService.resendOtp("test@test.com", "127.0.0.1");

        assertNotNull(testUser.getOtp());
        assertTrue(testUser.getOtp().matches("\\d{6}"));
        verify(emailService, times(1)).sendOtpEmail(eq("test@test.com"), eq(testUser.getOtp()));
    }

    @Test
    void testRegisterDonorDispatchesOtpEmail() {
        RegisterRequest request = RegisterRequest.builder()
                .fullName("Donor User")
                .email("donor@test.com")
                .password("Password123!")
                .role(Role.DONOR)
                .build();

        when(userRepository.findByEmail("donor@test.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthResponse response = authService.register(request);

        assertTrue(response.isRequiresOtp());
        assertNull(response.getToken());

        ArgumentCaptor<String> otpCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService, times(1)).sendOtpEmail(eq("donor@test.com"), otpCaptor.capture());
        assertTrue(otpCaptor.getValue().matches("\\d{6}"));
    }

    @Test
    void testRegisterVolunteerDispatchesOtpEmail() {
        RegisterRequest request = RegisterRequest.builder()
                .fullName("Volunteer User")
                .email("volunteer@test.com")
                .password("Password123!")
                .role(Role.VOLUNTEER)
                .build();

        when(userRepository.findByEmail("volunteer@test.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthResponse response = authService.register(request);

        assertTrue(response.isRequiresOtp());
        assertNull(response.getToken());

        ArgumentCaptor<String> otpCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService, times(1)).sendOtpEmail(eq("volunteer@test.com"), otpCaptor.capture());
        assertTrue(otpCaptor.getValue().matches("\\d{6}"));
    }

    @Test
    void testRegisterNgoDispatchesOtpEmail() {
        RegisterRequest request = RegisterRequest.builder()
                .fullName("NGO User")
                .email("ngo@test.com")
                .password("Password123!")
                .role(Role.NGO)
                .address("123 NGO Street, Bengaluru")
                .phone("9876543210")
                .build();

        when(userRepository.findByEmail("ngo@test.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(ngoProfileRepository.save(any(NGOProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthResponse response = authService.register(request);

        assertTrue(response.isRequiresOtp());
        assertNull(response.getToken());

        ArgumentCaptor<String> otpCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService, times(1)).sendOtpEmail(eq("ngo@test.com"), otpCaptor.capture());
        assertTrue(otpCaptor.getValue().matches("\\d{6}"));
    }

    @Test
    void testRegisterEmailDeliveryFailurePropagatesException() {
        RegisterRequest request = RegisterRequest.builder()
                .fullName("Donor User")
                .email("donor@test.com")
                .password("Password123!")
                .role(Role.DONOR)
                .build();

        when(userRepository.findByEmail("donor@test.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        doThrow(new EmailDeliveryException("Failed to send email."))
                .when(emailService).sendOtpEmail(eq("donor@test.com"), anyString());

        assertThrows(
                EmailDeliveryException.class,
                () -> authService.register(request)
        );
    }

    @Test
    void testResendOtpEmailDeliveryFailurePropagatesException() {
        when(userRepository.findByEmail("test@test.com"))
                .thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        doThrow(new EmailDeliveryException("Failed to send email."))
                .when(emailService).sendOtpEmail(eq("test@test.com"), anyString());

        assertThrows(
                EmailDeliveryException.class,
                () -> authService.resendOtp("test@test.com", "127.0.0.1")
        );
    }

    @Test
    void testExpiredOtpThrowsBadCredentials() {
        testUser.setOtpExpiry(LocalDateTime.now().minusMinutes(1));
        when(userRepository.findByEmail("test@test.com"))
                .thenReturn(Optional.of(testUser));

        VerifyOtpRequest request = new VerifyOtpRequest();
        request.setEmail("test@test.com");
        request.setOtp("123456");

        BadCredentialsException ex = assertThrows(
                BadCredentialsException.class,
                () -> authService.verifyOtp(request)
        );

        assertTrue(ex.getMessage().contains("expired"));
        assertNull(testUser.getOtp());
    }

    @Test
    void unapprovedNgoMustNotReceiveJwtAfterOtpVerification() {
        testUser.setRole(Role.NGO);
        testUser.setApproved(false);

        when(userRepository.findByEmail("test@test.com"))
                .thenReturn(Optional.of(testUser));

        VerifyOtpRequest request = new VerifyOtpRequest();
        request.setEmail("test@test.com");
        request.setOtp("123456");

        assertThrows(
                BadCredentialsException.class,
                () -> authService.verifyOtp(request)
        );

        verify(jwtUtils, never()).generateToken(any());
    }

    @Test
    void unapprovedVolunteerMustNotReceiveJwtAfterOtpVerification() {
        testUser.setRole(Role.VOLUNTEER);
        testUser.setApproved(false);

        when(userRepository.findByEmail("test@test.com"))
                .thenReturn(Optional.of(testUser));

        VerifyOtpRequest request = new VerifyOtpRequest();
        request.setEmail("test@test.com");
        request.setOtp("123456");

        assertThrows(
                BadCredentialsException.class,
                () -> authService.verifyOtp(request)
        );

        verify(jwtUtils, never()).generateToken(any());
    }

    @Test
    void testRegisterExistingUnverifiedUserUpdatesDetailsAndRetriesOtp() {
        testUser.setOtp("654321"); // unverified
        when(userRepository.findByEmail("donor@test.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.encode(any())).thenReturn("hashed_new");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RegisterRequest request = RegisterRequest.builder()
                .fullName("Updated Donor")
                .email("donor@test.com")
                .password("NewPassword123!")
                .role(Role.DONOR)
                .build();

        AuthResponse response = authService.register(request);

        assertTrue(response.isRequiresOtp());
        assertEquals("Updated Donor", testUser.getFullName());
        assertEquals("hashed_new", testUser.getPasswordHash());
        verify(emailService, times(1)).sendOtpEmail(eq("donor@test.com"), anyString());
    }

    @Test
    void testRegisterExistingVerifiedUserThrowsDuplicateError() {
        testUser.setOtp(null); // verified
        when(userRepository.findByEmail("donor@test.com")).thenReturn(Optional.of(testUser));

        RegisterRequest request = RegisterRequest.builder()
                .fullName("Donor Again")
                .email("donor@test.com")
                .password("Password123!")
                .role(Role.DONOR)
                .build();

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> authService.register(request)
        );

        assertEquals("Email address is already registered.", ex.getMessage());
        verify(emailService, never()).sendOtpEmail(anyString(), anyString());
    }

    @Test
    void testResendOtpForVerifiedUserDoesNotSendEmail() {
        testUser.setOtp(null); // verified
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(testUser));

        authService.resendOtp("test@test.com", "127.0.0.1");

        verify(emailService, never()).sendOtpEmail(anyString(), anyString());
    }

    @Test
    void testRenewTokenSuccess() {
        testUser.setApproved(true);
        testUser.setRole(Role.DONOR);
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(testUser));
        when(jwtUtils.generateToken(testUser)).thenReturn("renewed-jwt-token");

        AuthResponse response = authService.renewToken("test@test.com");

        assertNotNull(response);
        assertEquals("renewed-jwt-token", response.getToken());
        assertFalse(response.isRequiresOtp());
        assertEquals(testUser.getEmail(), response.getUser().getEmail());
    }

    @Test
    void testRenewTokenUnapprovedNgoThrowsException() {
        testUser.setApproved(false);
        testUser.setRole(Role.NGO);
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(testUser));

        assertThrows(
                BadCredentialsException.class,
                () -> authService.renewToken("test@test.com")
        );
        verify(jwtUtils, never()).generateToken(any());
    }

    @Test
    void testRenewTokenUserNotFoundThrowsException() {
        when(userRepository.findByEmail("notfound@test.com")).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> authService.renewToken("notfound@test.com")
        );
    }
}