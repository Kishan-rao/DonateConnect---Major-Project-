package com.donateconnect.integration;

import com.donateconnect.config.JwtUtils;
import com.donateconnect.dto.CreateNgoRequest;
import com.donateconnect.dto.LoginRequest;
import com.donateconnect.dto.RegisterRequest;
import com.donateconnect.dto.VerifyOtpRequest;
import com.donateconnect.entity.NGOProfile;
import com.donateconnect.entity.Role;
import com.donateconnect.entity.User;
import com.donateconnect.repository.NGOProfileRepository;
import com.donateconnect.repository.UserRepository;
import com.donateconnect.service.EmailService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class AdminNgoLifecycleIntegrationTest {

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

    private String adminToken;

    @BeforeEach
    void setUp() {
        User adminUser = User.builder()
                .email("admin.lifecycle@donateconnect.org")
                .passwordHash(passwordEncoder.encode("AdminPass123!"))
                .fullName("System Admin")
                .role(Role.ADMIN)
                .approved(true)
                .build();
        adminUser = userRepository.save(adminUser);
        adminToken = jwtUtils.generateToken(adminUser);
    }

    @Test
    @DisplayName("Admin creates NGO: persists Role.NGO, approved=true, verified=true, allows direct login and dashboard access")
    void testAdminCreatesNgoAndDirectLoginSucceeds() throws Exception {
        String email = "direct.ngo@lifecycletest.org";
        String password = "NgoPassword123!";

        CreateNgoRequest createRequest = CreateNgoRequest.builder()
                .name("Direct Relief Karnataka")
                .email(email)
                .password(password)
                .description("Providing healthcare and disaster relief supplies")
                .address("100 Indiranagar 100ft Road, Bengaluru, Karnataka 560038")
                .phone("+91 99887 76655")
                .build();

        // 1. Admin creates NGO via POST /api/admin/ngo
        MvcResult createResult = mockMvc.perform(post("/api/admin/ngo")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("Direct Relief Karnataka"))
                .andExpect(jsonPath("$.data.verified").value(true))
                .andExpect(jsonPath("$.data.user.role").value("NGO"))
                .andExpect(jsonPath("$.data.user.approved").value(true))
                .andReturn();

        // 2. Verify DB persistence and state
        Optional<User> persistedUserOpt = userRepository.findByEmail(email);
        assertTrue(persistedUserOpt.isPresent(), "User account must be persisted in database");
        User persistedUser = persistedUserOpt.get();
        assertEquals(Role.NGO, persistedUser.getRole());
        assertTrue(persistedUser.isApproved(), "Admin-created account must be marked approved=true");
        assertNull(persistedUser.getOtp(), "Admin-created account must have otp=null (verified email)");

        Optional<NGOProfile> persistedProfileOpt = ngoProfileRepository.findByUserId(persistedUser.getId());
        assertTrue(persistedProfileOpt.isPresent(), "NGO profile must be created and linked to the user");
        NGOProfile persistedProfile = persistedProfileOpt.get();
        assertTrue(persistedProfile.isVerified(), "NGO profile must be marked verified=true");
        assertEquals("Direct Relief Karnataka", persistedProfile.getName());
        assertEquals(persistedUser.getId(), persistedProfile.getUser().getId());

        // 3. NGO logs in directly via POST /api/auth/login with expectedRole NGO
        LoginRequest loginRequest = LoginRequest.builder()
                .email(email)
                .password(password)
                .expectedRole("NGO")
                .build();

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").isString())
                .andExpect(jsonPath("$.data.requiresOtp").value(false))
                .andExpect(jsonPath("$.data.user.role").value("NGO"))
                .andExpect(jsonPath("$.data.user.email").value(email))
                .andExpect(jsonPath("$.data.user.approved").value(true))
                .andReturn();

        String responseBody = loginResult.getResponse().getContentAsString();
        String ngoJwt = objectMapper.readTree(responseBody).get("data").get("token").asText();
        assertNotNull(ngoJwt);

        // 4. NGO can access /api/ngo/me/profile with their JWT token
        mockMvc.perform(get("/api/ngo/me/profile")
                        .header("Authorization", "Bearer " + ngoJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Direct Relief Karnataka"))
                .andExpect(jsonPath("$.data.verified").value(true));
    }

    @Test
    @DisplayName("Admin verify/unverify toggle keeps User.approved and NGOProfile.verified in sync")
    void testAdminVerifyToggleSynchronizesUserApprovalAndControlsLogin() throws Exception {
        String email = "toggle.ngo@lifecycletest.org";
        String password = "NgoPassword123!";

        CreateNgoRequest createRequest = CreateNgoRequest.builder()
                .name("Toggle NGO Foundation")
                .email(email)
                .password(password)
                .address("200 Koramangala 80ft Road, Bengaluru")
                .phone("+91 99887 11223")
                .build();

        mockMvc.perform(post("/api/admin/ngo")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated());

        User user = userRepository.findByEmail(email).orElseThrow();
        NGOProfile profile = ngoProfileRepository.findByUserId(user.getId()).orElseThrow();
        UUID ngoProfileId = profile.getId();

        // 1. Admin unverifies the NGO
        mockMvc.perform(patch("/api/admin/ngo/" + ngoProfileId + "/verify?verified=false")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verified").value(false))
                .andExpect(jsonPath("$.data.user.approved").value(false));

        // Verify DB update
        NGOProfile unverifiedProfile = ngoProfileRepository.findById(ngoProfileId).orElseThrow();
        User unapprovedUser = userRepository.findById(user.getId()).orElseThrow();
        assertFalse(unverifiedProfile.isVerified());
        assertFalse(unapprovedUser.isApproved());

        // 2. Unverified NGO attempt to log in is rejected
        LoginRequest loginRequest = LoginRequest.builder()
                .email(email)
                .password(password)
                .expectedRole("NGO")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Your email may be verified, but your account is pending admin approval."));

        // 3. Admin re-verifies the NGO
        mockMvc.perform(patch("/api/admin/ngo/" + ngoProfileId + "/verify?verified=true")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verified").value(true))
                .andExpect(jsonPath("$.data.user.approved").value(true));

        // 4. NGO can now log in successfully
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").isString());
    }

    @Test
    @DisplayName("Publicly registered NGO cannot log in until approved, and verify action unblocks them")
    void testPublicNgoBlockedUntilAdminVerifies() throws Exception {
        String email = "public.ngo@lifecycletest.org";
        String password = "NgoPassword123!";

        RegisterRequest registerRequest = RegisterRequest.builder()
                .fullName("Public Registered Foundation")
                .email(email)
                .password(password)
                .role(Role.NGO)
                .address("300 Jayanagar 4th Block, Bengaluru")
                .phone("+91 98800 12345")
                .build();

        // 1. Register publicly
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isAccepted());

        User user = userRepository.findByEmail(email).orElseThrow();
        String otp = user.getOtp();

        // 2. Verify OTP
        VerifyOtpRequest verifyRequest = new VerifyOtpRequest();
        verifyRequest.setEmail(email);
        verifyRequest.setOtp(otp);

        mockMvc.perform(post("/api/auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyRequest)))
                .andExpect(status().isUnauthorized()); // Pending admin approval

        // 3. Login attempt before admin approval fails
        LoginRequest loginRequest = LoginRequest.builder()
                .email(email)
                .password(password)
                .expectedRole("NGO")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Your email may be verified, but your account is pending admin approval."));

        // 4. Admin verifies the NGO via PATCH /api/admin/ngo/{id}/verify?verified=true
        NGOProfile profile = ngoProfileRepository.findByUserId(user.getId()).orElseThrow();
        mockMvc.perform(patch("/api/admin/ngo/" + profile.getId() + "/verify?verified=true")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verified").value(true))
                .andExpect(jsonPath("$.data.user.approved").value(true));

        // 5. Now NGO login succeeds directly
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").isString())
                .andExpect(jsonPath("$.data.user.role").value("NGO"));
    }

    @Test
    @DisplayName("Admin cannot create duplicate NGO with already registered email")
    void testAdminCannotCreateDuplicateNgoEmail() throws Exception {
        String email = "duplicate.ngo@lifecycletest.org";
        CreateNgoRequest req1 = CreateNgoRequest.builder()
                .name("Original NGO")
                .email(email)
                .password("Password123!")
                .address("123 Street, Bengaluru")
                .phone("+91 91234 56789")
                .build();

        mockMvc.perform(post("/api/admin/ngo")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isCreated());

        CreateNgoRequest req2 = CreateNgoRequest.builder()
                .name("Second NGO Attempt")
                .email(email)
                .password("DifferentPassword123!")
                .address("456 Street, Bengaluru")
                .phone("+91 99887 76655")
                .build();

        mockMvc.perform(post("/api/admin/ngo")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req2)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("User email is already registered"));
    }

    @Test
    @DisplayName("Admin-created NGO rejected when attempting cross-role login (e.g. Donor sign in)")
    void testAdminCreatedNgoRejectedOnRoleMismatch() throws Exception {
        String email = "rolemismatch.ngo@lifecycletest.org";
        CreateNgoRequest req = CreateNgoRequest.builder()
                .name("Role Mismatch NGO")
                .email(email)
                .password("Password123!")
                .address("789 Street, Bengaluru")
                .phone("+91 91234 56780")
                .build();

        mockMvc.perform(post("/api/admin/ngo")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        LoginRequest crossRoleLogin = LoginRequest.builder()
                .email(email)
                .password("Password123!")
                .expectedRole("DONOR")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(crossRoleLogin)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("This account is not registered as a donor. Please use NGO Sign In."));
    }

    @Test
    @DisplayName("Admin-created NGO rejected when wrong password entered")
    void testAdminCreatedNgoWithInvalidPasswordRejected() throws Exception {
        String email = "badpass.ngo@lifecycletest.org";
        CreateNgoRequest req = CreateNgoRequest.builder()
                .name("Bad Pass NGO")
                .email(email)
                .password("CorrectPassword123!")
                .address("321 Street, Bengaluru")
                .phone("+91 91234 56781")
                .build();

        mockMvc.perform(post("/api/admin/ngo")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        LoginRequest badLogin = LoginRequest.builder()
                .email(email)
                .password("WrongPassword999!")
                .expectedRole("NGO")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badLogin)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }
}
