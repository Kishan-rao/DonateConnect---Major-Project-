package com.donateconnect.integration;

import com.donateconnect.config.JwtUtils;
import com.donateconnect.dto.AuthResponse;
import com.donateconnect.dto.CreateDonationRequest;
import com.donateconnect.dto.LoginRequest;
import com.donateconnect.dto.RegisterRequest;
import com.donateconnect.entity.Category;
import com.donateconnect.entity.NGOProfile;
import com.donateconnect.entity.Role;
import com.donateconnect.entity.User;
import com.donateconnect.repository.NGOProfileRepository;
import com.donateconnect.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.boot.test.mock.mockito.MockBean;
import com.donateconnect.service.EmailService;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class NgoRegistrationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NGOProfileRepository ngoProfileRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtils jwtUtils;

    @MockBean
    private EmailService emailService;

    @Test
    @DisplayName("NGO registration persists Role.NGO and creates associated NGOProfile")
    void testNgoRegistrationPersistsRoleAndProfile() throws Exception {
        String email = "ngo.reg.test@bangalorerelief.org";
        RegisterRequest request = RegisterRequest.builder()
                .fullName("Bangalore Relief Foundation")
                .email(email)
                .password("SecurePass123!")
                .role(Role.NGO)
                .address("456 MG Road, Bengaluru, Karnataka 560001")
                .phone("+91 98765 43210")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.requiresOtp").value(true))
                .andExpect(jsonPath("$.data.user.role").value("NGO"))
                .andExpect(jsonPath("$.data.user.fullName").value("Bangalore Relief Foundation"));

        // Verify database persistence
        Optional<User> persistedUserOpt = userRepository.findByEmail(email);
        assertTrue(persistedUserOpt.isPresent(), "User should be persisted in database");

        User persistedUser = persistedUserOpt.get();
        assertEquals(Role.NGO, persistedUser.getRole(), "User role must strictly be NGO, not DONOR");
        assertFalse(persistedUser.isApproved(), "Public registered NGO requires admin approval");
        assertNotNull(persistedUser.getOtp(), "OTP should be generated for verification");

        // Verify associated NGO profile
        Optional<NGOProfile> ngoProfileOpt = ngoProfileRepository.findByUserId(persistedUser.getId());
        assertTrue(ngoProfileOpt.isPresent(), "NGO profile must be automatically created and linked to the user");

        NGOProfile profile = ngoProfileOpt.get();
        assertEquals("Bangalore Relief Foundation", profile.getName());
        assertEquals("456 MG Road, Bengaluru, Karnataka 560001", profile.getAddress());
        assertEquals("+91 98765 43210", profile.getPhone());
        assertEquals(persistedUser.getId(), profile.getUser().getId(), "NGO profile must reference the newly created NGO user");
    }

    @Test
    @DisplayName("Donor registration persists Role.DONOR and does not create an NGO profile")
    void testDonorRegistrationPersistsDonorRoleOnly() throws Exception {
        String email = "donor.individual@example.com";
        RegisterRequest request = RegisterRequest.builder()
                .fullName("Aarav Sharma")
                .email(email)
                .password("DonorPass123!")
                .role(Role.DONOR)
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.user.role").value("DONOR"));

        User persistedUser = userRepository.findByEmail(email).orElseThrow();
        assertEquals(Role.DONOR, persistedUser.getRole());
        assertTrue(persistedUser.isApproved(), "Donors are approved upon verification");

        Optional<NGOProfile> profileOpt = ngoProfileRepository.findByUserId(persistedUser.getId());
        assertTrue(profileOpt.isEmpty(), "No NGO profile should exist for a DONOR account");
    }

    @Test
    @DisplayName("Registration rejects unauthorized roles like ADMIN")
    void testRegistrationRejectsUnauthorizedRoles() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .fullName("Attacker")
                .email("hacker@malicious.com")
                .password("Hacker123!")
                .role(Role.ADMIN)
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("NGO registration requires address and phone")
    void testNgoRegistrationRequiresAddressAndPhone() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .fullName("Incomplete NGO")
                .email("incomplete@ngo.org")
                .password("Password123!")
                .role(Role.NGO)
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("NGO registration rejects non-Bengaluru operational addresses")
    void testNgoRegistrationRejectsNonBengaluruAddress() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .fullName("Delhi Charity")
                .email("delhi@charity.org")
                .password("Password123!")
                .role(Role.NGO)
                .address("Connaught Place, New Delhi")
                .phone("+91 98765 43210")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Approved NGO login returns Role.NGO and token successfully")
    void testApprovedNgoLoginReturnsNgoRole() throws Exception {
        User ngoUser = userRepository.save(User.builder()
                .email("active.ngo@bangalore.org")
                .passwordHash(passwordEncoder.encode("NgoPassword123!"))
                .fullName("Active NGO Foundation")
                .role(Role.NGO)
                .approved(true)
                .build());

        ngoProfileRepository.save(NGOProfile.builder()
                .user(ngoUser)
                .name("Active NGO Foundation")
                .address("Koramangala, Bengaluru")
                .phone("+91 98765 00000")
                .verified(true)
                .build());

        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("active.ngo@bangalore.org");
        loginRequest.setPassword("NgoPassword123!");
        loginRequest.setExpectedRole("NGO");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").isString())
                .andExpect(jsonPath("$.data.user.role").value("NGO"))
                .andExpect(jsonPath("$.data.user.fullName").value("Active NGO Foundation"));
    }

    @Test
    @DisplayName("NGO user cannot access Donor-only endpoints")
    void testNgoCannotAccessDonorEndpoints() throws Exception {
        User ngoUser = userRepository.save(User.builder()
                .email("ngo.isolated@bangalore.org")
                .passwordHash(passwordEncoder.encode("Pass123!"))
                .fullName("Isolated NGO")
                .role(Role.NGO)
                .approved(true)
                .build());

        String ngoToken = jwtUtils.generateToken(ngoUser);

        // Test GET /api/donations/mine which is strictly hasRole('DONOR')
        mockMvc.perform(get("/api/donations/mine")
                        .header("Authorization", "Bearer " + ngoToken))
                .andExpect(status().isForbidden());

        // Test POST /api/donations with valid body to verify hasRole('DONOR') blocks NGO
        CreateDonationRequest createReq = CreateDonationRequest.builder()
                .ngoId(UUID.randomUUID())
                .category(Category.FOOD)
                .description("Detailed description exceeding minimum character length requirements")
                .pickupDate(LocalDate.now().plusDays(1))
                .pickupAddress("123 Indiranagar, Bengaluru")
                .pickupLat(12.9716)
                .pickupLng(77.5946)
                .build();

        mockMvc.perform(post("/api/donations")
                        .header("Authorization", "Bearer " + ngoToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Donor user cannot access NGO-only endpoints")
    void testDonorCannotAccessNgoEndpoints() throws Exception {
        User donorUser = userRepository.save(User.builder()
                .email("donor.isolated@test.com")
                .passwordHash(passwordEncoder.encode("Pass123!"))
                .fullName("Isolated Donor")
                .role(Role.DONOR)
                .approved(true)
                .build());

        String donorToken = jwtUtils.generateToken(donorUser);

        mockMvc.perform(get("/api/ngo/me/profile")
                        .header("Authorization", "Bearer " + donorToken))
                .andExpect(status().isForbidden());
    }
}
