package com.donateconnect.controller;

import com.donateconnect.config.JwtUtils;
import com.donateconnect.entity.Role;
import com.donateconnect.entity.User;
import com.donateconnect.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = "app.cors.allowed-origins=http://localhost:3000")
@Transactional
class HealthControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtils jwtUtils;

    private User adminUser;
    private User normalUser;
    private User pendingUser;
    private String adminToken;
    private String normalUserToken;

    @BeforeEach
    void setUp() {
        adminUser = userRepository.save(User.builder()
                .email("admin_" + UUID.randomUUID() + "@test.com")
                .passwordHash("hash")
                .fullName("Admin User")
                .role(Role.ADMIN)
                .approved(true)
                .build());

        normalUser = userRepository.save(User.builder()
                .email("user_" + UUID.randomUUID() + "@test.com")
                .passwordHash("hash")
                .fullName("Donor User")
                .role(Role.DONOR)
                .approved(true)
                .build());

        pendingUser = userRepository.save(User.builder()
                .email("pending_" + UUID.randomUUID() + "@test.com")
                .passwordHash("hash")
                .fullName("Pending Volunteer")
                .role(Role.VOLUNTEER)
                .approved(false)
                .build());

        adminToken = jwtUtils.generateToken(adminUser);
        normalUserToken = jwtUtils.generateToken(normalUser);
    }

    @Test
    @DisplayName("GET /api/health remains publicly accessible without authentication")
    void testHealthEndpointIsPubliclyAccessible() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("UP")))
                .andExpect(jsonPath("$.service", is("donateconnect-backend")))
                .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    @DisplayName("GET /api/dev-approve-all is rejected as 401 Unauthorized when unauthenticated")
    void testDevApproveAllUnauthenticatedReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/dev-approve-all"))
                .andExpect(status().isUnauthorized());

        // Verify pending user remained unapproved
        User user = userRepository.findById(pendingUser.getId()).orElseThrow();
        assertFalse(user.isApproved(), "Pending user must not be auto-approved");
    }

    @Test
    @DisplayName("GET /api/dev-approve-all handler does not exist and does not approve users when authenticated")
    void testDevApproveAllAuthenticatedDoesNotApproveUsers() throws Exception {
        mockMvc.perform(get("/api/dev-approve-all")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(result -> assertTrue(
                        result.getResolvedException() instanceof NoResourceFoundException,
                        "Handler mapping for /api/dev-approve-all must not exist"
                ));

        // Verify pending user remained unapproved
        User user = userRepository.findById(pendingUser.getId()).orElseThrow();
        assertFalse(user.isApproved(), "Pending user must not be approved via removed dev endpoint");
    }

    @Test
    @DisplayName("GET /api/debug-smtp is rejected as 401 Unauthorized when unauthenticated")
    void testDebugSmtpUnauthenticatedReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/debug-smtp"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/debug-smtp handler does not exist and does not disclose credentials")
    void testDebugSmtpAuthenticatedDoesNotExist() throws Exception {
        mockMvc.perform(get("/api/debug-smtp")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(result -> assertTrue(
                        result.getResolvedException() instanceof NoResourceFoundException,
                        "Handler mapping for /api/debug-smtp must not exist"
                ));
    }

    @Test
    @DisplayName("Legitimate admin approval endpoint PUT /api/admin/users/{id}/approve continues to function")
    void testLegitimateAdminApprovalPreserved() throws Exception {
        // Non-admin cannot approve
        mockMvc.perform(put("/api/admin/users/" + pendingUser.getId() + "/approve")
                        .header("Authorization", "Bearer " + normalUserToken))
                .andExpect(status().isForbidden());

        // Admin can approve
        mockMvc.perform(put("/api/admin/users/" + pendingUser.getId() + "/approve")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("User approved successfully")));

        User user = userRepository.findById(pendingUser.getId()).orElseThrow();
        assertTrue(user.isApproved(), "User should be approved by legitimate admin endpoint");
    }
}
