package com.donateconnect.controller;

import com.donateconnect.config.JwtUtils;
import com.donateconnect.dto.ChangePasswordRequest;
import com.donateconnect.dto.DeleteAccountRequest;
import com.donateconnect.dto.UserPreferenceDto;
import com.donateconnect.entity.Role;
import com.donateconnect.entity.User;
import com.donateconnect.repository.UserPreferenceRepository;
import com.donateconnect.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserPreferenceRepository userPreferenceRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private com.donateconnect.repository.DeliveryRepository deliveryRepository;

    @Autowired
    private com.donateconnect.repository.DonationRepository donationRepository;

    @Autowired
    private com.donateconnect.repository.NGOProfileRepository ngoProfileRepository;

    private User donorUser;
    private String donorToken;

    private User volunteerUser;
    private String volunteerToken;

    private User adminUser;
    private String adminToken;

    @BeforeEach
    void setUp() {
        donorUser = userRepository.save(User.builder()
                .email("donor_" + UUID.randomUUID() + "@test.com")
                .passwordHash(passwordEncoder.encode("OldPassword123!"))
                .fullName("Donor Tester")
                .role(Role.DONOR)
                .approved(true)
                .build());
        donorToken = jwtUtils.generateToken(donorUser);

        volunteerUser = userRepository.save(User.builder()
                .email("volunteer_" + UUID.randomUUID() + "@test.com")
                .passwordHash(passwordEncoder.encode("VolunteerPass123!"))
                .fullName("Volunteer Tester")
                .role(Role.VOLUNTEER)
                .approved(true)
                .build());
        volunteerToken = jwtUtils.generateToken(volunteerUser);

        adminUser = userRepository.save(User.builder()
                .email("admin_" + UUID.randomUUID() + "@test.com")
                .passwordHash(passwordEncoder.encode("AdminPass123!"))
                .fullName("Admin Tester")
                .role(Role.ADMIN)
                .approved(true)
                .build());
        adminToken = jwtUtils.generateToken(adminUser);
    }

    @Test
    @DisplayName("GET /api/users/me returns authenticated user profile")
    void testGetCurrentUser() throws Exception {
        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", "Bearer " + donorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.email", is(donorUser.getEmail())))
                .andExpect(jsonPath("$.data.role", is("DONOR")));
    }

    @Test
    @DisplayName("GET /api/users/me without token returns 401")
    void testGetCurrentUserUnauthorized() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("PUT /api/users/me/password changes password with valid current password")
    void testChangePasswordSuccess() throws Exception {
        ChangePasswordRequest request = ChangePasswordRequest.builder()
                .currentPassword("OldPassword123!")
                .newPassword("NewSecretPassword456!")
                .build();

        mockMvc.perform(put("/api/users/me/password")
                        .header("Authorization", "Bearer " + donorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)));

        User updated = userRepository.findById(donorUser.getId()).orElseThrow();
        assertTrue(passwordEncoder.matches("NewSecretPassword456!", updated.getPasswordHash()));
    }

    @Test
    @DisplayName("PUT /api/users/me/password fails with wrong current password")
    void testChangePasswordWrongCurrent() throws Exception {
        ChangePasswordRequest request = ChangePasswordRequest.builder()
                .currentPassword("WrongPassword123!")
                .newPassword("NewSecretPassword456!")
                .build();

        mockMvc.perform(put("/api/users/me/password")
                        .header("Authorization", "Bearer " + donorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET and PUT /api/users/me/preferences persist notification toggles")
    void testPreferences() throws Exception {
        // GET returns defaults (all true)
        mockMvc.perform(get("/api/users/me/preferences")
                        .header("Authorization", "Bearer " + donorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.emailNotifications", is(true)))
                .andExpect(jsonPath("$.data.donationUpdates", is(true)));

        // Update preferences
        UserPreferenceDto updateDto = UserPreferenceDto.builder()
                .emailNotifications(false)
                .donationUpdates(false)
                .deliveryUpdates(true)
                .commentNotifications(true)
                .build();

        mockMvc.perform(put("/api/users/me/preferences")
                        .header("Authorization", "Bearer " + donorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.emailNotifications", is(false)))
                .andExpect(jsonPath("$.data.donationUpdates", is(false)));

        // Verify in database
        var pref = userPreferenceRepository.findByUserId(donorUser.getId()).orElseThrow();
        assertFalse(pref.isEmailNotifications());
        assertFalse(pref.isDonationUpdates());
        assertTrue(pref.isDeliveryUpdates());
    }

    @Test
    @DisplayName("DELETE /api/users/me deletes user account and permits email re-registration")
    void testDeleteAccountAndEmailReuse() throws Exception {
        DeleteAccountRequest request = DeleteAccountRequest.builder()
                .confirmation("DELETE")
                .build();

        mockMvc.perform(delete("/api/users/me")
                        .header("Authorization", "Bearer " + donorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)));

        // Verify account removed from DB
        assertFalse(userRepository.findById(donorUser.getId()).isPresent());

        // Instant JWT invalidation: old token now returns 401
        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", "Bearer " + donorToken))
                .andExpect(status().isUnauthorized());

        // Verify email is freed up for registration
        assertFalse(userRepository.existsByEmail(donorUser.getEmail()));
    }

    @Test
    @DisplayName("DELETE /api/users/me rejects deleting sole administrator account")
    void testCannotDeleteSoleAdmin() throws Exception {
        // Ensure only one admin exists by deleting others or counting
        long adminCount = userRepository.countByRole(Role.ADMIN);
        if (adminCount > 1) {
            userRepository.findAll().stream()
                    .filter(u -> u.getRole() == Role.ADMIN && !u.getId().equals(adminUser.getId()))
                    .forEach(u -> userRepository.delete(u));
        }

        DeleteAccountRequest request = DeleteAccountRequest.builder()
                .confirmation("DELETE")
                .build();

        mockMvc.perform(delete("/api/users/me")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());

        // Admin still exists
        assertTrue(userRepository.findById(adminUser.getId()).isPresent());
    }

    @Test
    @DisplayName("Deleting volunteer account unlinks deliveries and preserves donations")
    void testVolunteerDeletionPreservesDonations() throws Exception {
        // Create an NGO, donor, and donation with assigned volunteer
        User ngoUser = userRepository.save(User.builder()
                .email("ngo_" + UUID.randomUUID() + "@test.com")
                .passwordHash("hash")
                .fullName("Test NGO")
                .role(Role.NGO)
                .approved(true)
                .build());

        com.donateconnect.entity.NGOProfile ngoProfile = ngoProfileRepository.save(com.donateconnect.entity.NGOProfile.builder()
                .user(ngoUser)
                .name("NGO Organization")
                .address("Bengaluru Hub")
                .phone("9876543210")
                .verified(true)
                .build());

        com.donateconnect.entity.Donation donation = donationRepository.save(com.donateconnect.entity.Donation.builder()
                .donor(donorUser)
                .ngo(ngoProfile)
                .category(com.donateconnect.entity.Category.CLOTHES)
                .description("Warm jackets")
                .status(com.donateconnect.entity.DonationStatus.ACCEPTED)
                .build());

        com.donateconnect.entity.Delivery delivery = deliveryRepository.save(com.donateconnect.entity.Delivery.builder()
                .donation(donation)
                .volunteer(volunteerUser)
                .status(com.donateconnect.entity.DeliveryStatus.ASSIGNED)
                .build());

        // Delete volunteer account
        DeleteAccountRequest request = DeleteAccountRequest.builder().confirmation("DELETE").build();
        mockMvc.perform(delete("/api/users/me")
                        .header("Authorization", "Bearer " + volunteerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        // Verify volunteer account deleted
        assertFalse(userRepository.findById(volunteerUser.getId()).isPresent());

        // Verify donation STILL exists and is untouched
        assertTrue(donationRepository.findById(donation.getId()).isPresent());

        // Verify delivery still exists, but volunteer is safely unlinked (null)
        var updatedDelivery = deliveryRepository.findById(delivery.getId()).orElseThrow();
        assertNull(updatedDelivery.getVolunteer());
        assertEquals(donation.getId(), updatedDelivery.getDonation().getId());
    }

    @Test
    @DisplayName("Deleting account allows immediate re-registration under another permitted role")
    void testEmailReuseUnderAnotherRole() throws Exception {
        String testEmail = "switcher_" + UUID.randomUUID() + "@test.com";

        // 1. Register as DONOR initially
        com.donateconnect.dto.RegisterRequest regRequest = com.donateconnect.dto.RegisterRequest.builder()
                .email(testEmail)
                .password("Password123!")
                .fullName("Switcher User")
                .role(Role.DONOR)
                .build();

        User user = userRepository.save(User.builder()
                .email(testEmail)
                .passwordHash(passwordEncoder.encode("Password123!"))
                .fullName("Switcher User")
                .role(Role.DONOR)
                .approved(true)
                .build());

        String token = jwtUtils.generateToken(user);

        // 2. Delete account
        DeleteAccountRequest delRequest = DeleteAccountRequest.builder().confirmation("DELETE").build();
        mockMvc.perform(delete("/api/users/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(delRequest)))
                .andExpect(status().isOk());

        assertFalse(userRepository.existsByEmail(testEmail));

        // 3. Re-register using same email as VOLUNTEER (Delivery Partner role)
        com.donateconnect.dto.RegisterRequest reregRequest = com.donateconnect.dto.RegisterRequest.builder()
                .email(testEmail)
                .password("NewSecurePass123!")
                .fullName("Switcher Volunteer")
                .role(Role.VOLUNTEER)
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reregRequest)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.requiresOtp", is(true)));

        // Verify newly registered user has VOLUNTEER role and is pending approval (non-donor)
        User reRegistered = userRepository.findByEmail(testEmail).orElseThrow();
        assertEquals(Role.VOLUNTEER, reRegistered.getRole());
        assertFalse(reRegistered.isApproved());
    }
}

