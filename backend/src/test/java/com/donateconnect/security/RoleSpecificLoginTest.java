package com.donateconnect.security;

import com.donateconnect.dto.LoginRequest;
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
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class RoleSpecificLoginTest {

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

    @MockBean
    private EmailService emailService;

    private static final String DEFAULT_PASSWORD = "Password123!";

    private void cleanupTestAccounts() {
        java.util.List<String> emails = java.util.List.of(
                "donor@roleauth.org",
                "volunteer@roleauth.org",
                "ngo@roleauth.org",
                "pending.ngo@roleauth.org",
                "admin@roleauth.org"
        );
        for (String email : emails) {
            userRepository.findByEmail(email).ifPresent(user -> {
                ngoProfileRepository.findByUserId(user.getId()).ifPresent(ngoProfileRepository::delete);
                userRepository.delete(user);
            });
        }
    }

    @BeforeEach
    void setupAccounts() {
        cleanupTestAccounts();

        // 1. Approved Donor
        userRepository.save(User.builder()
                .email("donor@roleauth.org")
                .passwordHash(passwordEncoder.encode(DEFAULT_PASSWORD))
                .fullName("Standard Donor")
                .role(Role.DONOR)
                .approved(true)
                .build());

        // 2. Approved Volunteer
        userRepository.save(User.builder()
                .email("volunteer@roleauth.org")
                .passwordHash(passwordEncoder.encode(DEFAULT_PASSWORD))
                .fullName("Delivery Volunteer")
                .role(Role.VOLUNTEER)
                .approved(true)
                .build());

        // 3. Approved NGO
        User ngoUser = userRepository.save(User.builder()
                .email("ngo@roleauth.org")
                .passwordHash(passwordEncoder.encode(DEFAULT_PASSWORD))
                .fullName("Care NGO")
                .role(Role.NGO)
                .approved(true)
                .build());

        ngoProfileRepository.save(NGOProfile.builder()
                .user(ngoUser)
                .name("Care NGO")
                .address("Indiranagar, Bengaluru")
                .phone("+91 98765 43210")
                .verified(true)
                .build());

        // 4. Unapproved NGO
        User pendingNgo = userRepository.save(User.builder()
                .email("pending.ngo@roleauth.org")
                .passwordHash(passwordEncoder.encode(DEFAULT_PASSWORD))
                .fullName("Pending NGO")
                .role(Role.NGO)
                .approved(false)
                .build());

        ngoProfileRepository.save(NGOProfile.builder()
                .user(pendingNgo)
                .name("Pending NGO")
                .address("Whitefield, Bengaluru")
                .phone("+91 98765 00000")
                .verified(false)
                .build());

        // 5. Admin
        userRepository.save(User.builder()
                .email("admin@roleauth.org")
                .passwordHash(passwordEncoder.encode(DEFAULT_PASSWORD))
                .fullName("System Admin")
                .role(Role.ADMIN)
                .approved(true)
                .build());
    }

    @org.junit.jupiter.api.AfterEach
    void tearDownAccounts() {
        cleanupTestAccounts();
    }

    // ==========================================
    // 1-4. SUCCESSFUL ROLE-MATCHED SIGN IN
    // ==========================================

    @Test
    @DisplayName("1. Donor credentials with expected role DONOR succeed")
    void testDonorLogin_WithExpectedRoleDonor_Succeeds() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("donor@roleauth.org")
                .password(DEFAULT_PASSWORD)
                .expectedRole("DONOR")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isString())
                .andExpect(jsonPath("$.data.user.role").value("DONOR"));
    }

    @Test
    @DisplayName("2. Volunteer credentials with expected role VOLUNTEER succeed")
    void testVolunteerLogin_WithExpectedRoleVolunteer_Succeeds() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("volunteer@roleauth.org")
                .password(DEFAULT_PASSWORD)
                .expectedRole("VOLUNTEER")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isString())
                .andExpect(jsonPath("$.data.user.role").value("VOLUNTEER"));
    }

    @Test
    @DisplayName("3. Approved NGO credentials with expected role NGO succeed")
    void testApprovedNgoLogin_WithExpectedRoleNgo_Succeeds() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("ngo@roleauth.org")
                .password(DEFAULT_PASSWORD)
                .expectedRole("NGO")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isString())
                .andExpect(jsonPath("$.data.user.role").value("NGO"));
    }

    @Test
    @DisplayName("4. Admin credentials with expected role ADMIN succeed")
    void testAdminLogin_WithExpectedRoleAdmin_Succeeds() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("admin@roleauth.org")
                .password(DEFAULT_PASSWORD)
                .expectedRole("ADMIN")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isString())
                .andExpect(jsonPath("$.data.user.role").value("ADMIN"));
    }

    // ==========================================
    // 5-9. ROLE-MISMATCH COMBINATIONS (403 FORBIDDEN)
    // ==========================================

    @ParameterizedTest(name = "{index} => email={0}, expectedRole={1}, expectedMessage={2}")
    @CsvSource({
            // Volunteer attempting other roles
            "volunteer@roleauth.org, DONOR, This account is not registered as a donor. Please use Volunteer Sign In.",
            "volunteer@roleauth.org, NGO, This account is not registered as an NGO. Please use Volunteer Sign In.",
            "volunteer@roleauth.org, ADMIN, This account is not registered as an admin. Please use Volunteer Sign In.",

            // Donor attempting other roles
            "donor@roleauth.org, VOLUNTEER, This account is not registered as a volunteer. Please use Donor Sign In.",
            "donor@roleauth.org, NGO, This account is not registered as an NGO. Please use Donor Sign In.",
            "donor@roleauth.org, ADMIN, This account is not registered as an admin. Please use Donor Sign In.",

            // NGO attempting other roles
            "ngo@roleauth.org, DONOR, This account is not registered as a donor. Please use NGO Sign In.",
            "ngo@roleauth.org, VOLUNTEER, This account is not registered as a volunteer. Please use NGO Sign In.",
            "ngo@roleauth.org, ADMIN, This account is not registered as an admin. Please use NGO Sign In.",

            // Admin attempting other roles
            "admin@roleauth.org, DONOR, This account is not registered as a donor. Please use Admin Sign In.",
            "admin@roleauth.org, VOLUNTEER, This account is not registered as a volunteer. Please use Admin Sign In.",
            "admin@roleauth.org, NGO, This account is not registered as an NGO. Please use Admin Sign In."
    })
    @DisplayName("Cross-role login attempts are rejected with 403 Forbidden and descriptive actionable error message")
    void testCrossRoleLoginAttempts_AreRejectedWith403(String email, String expectedRole, String expectedMessage) throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email(email)
                .password(DEFAULT_PASSWORD)
                .expectedRole(expectedRole)
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(expectedMessage))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    // ==========================================
    // 10. MISSING OR UNSUPPORTED EXPECTED ROLES
    // ==========================================

    @Test
    @DisplayName("10a. Login with missing expected role fails safely (400 Bad Request, no token)")
    void testMissingExpectedRole_FailsSafely() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("donor@roleauth.org")
                .password(DEFAULT_PASSWORD)
                .expectedRole(null)
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    @DisplayName("10b. Login with blank expected role fails safely (400 Bad Request, no token)")
    void testBlankExpectedRole_FailsSafely() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("donor@roleauth.org")
                .password(DEFAULT_PASSWORD)
                .expectedRole("   ")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    @DisplayName("10c. Login with unsupported/invalid expected role fails safely (400 Bad Request, no token)")
    void testUnsupportedExpectedRole_FailsSafely() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("donor@roleauth.org")
                .password(DEFAULT_PASSWORD)
                .expectedRole("SUPERUSER")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    // ==========================================
    // 11-12. ROLE IMMUTABILITY & NO TOKEN ISSUANCE ON MISMATCH
    // ==========================================

    @Test
    @DisplayName("11 & 12. Failed cross-role login never issues tokens and preserves stored role in DB")
    void testRoleMismatch_NeverIssuesToken_AndPreservesDatabaseRole() throws Exception {
        User volunteerBefore = userRepository.findByEmail("volunteer@roleauth.org").orElseThrow();
        assertEquals(Role.VOLUNTEER, volunteerBefore.getRole());

        LoginRequest request = LoginRequest.builder()
                .email("volunteer@roleauth.org")
                .password(DEFAULT_PASSWORD)
                .expectedRole("DONOR")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.data").doesNotExist());

        User volunteerAfter = userRepository.findByEmail("volunteer@roleauth.org").orElseThrow();
        assertEquals(Role.VOLUNTEER, volunteerAfter.getRole(), "User role in database must remain unmodified");
    }

    // ==========================================
    // 13. INVALID CREDENTIALS SAFE BEHAVIOR
    // ==========================================

    @Test
    @DisplayName("13a. Wrong password returns 401 BadCredentials without revealing role mismatch")
    void testWrongPassword_Returns401_RegardlessOfExpectedRole() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("volunteer@roleauth.org")
                .password("WrongPassword123")
                .expectedRole("DONOR")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    @DisplayName("13b. Unknown email returns 401 BadCredentials without revealing account existence")
    void testUnknownEmail_Returns401() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("ghost@unknown.org")
                .password(DEFAULT_PASSWORD)
                .expectedRole("DONOR")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    // ==========================================
    // 14. PRESERVE NGO APPROVAL RESTRICTIONS
    // ==========================================

    @Test
    @DisplayName("14. Unapproved NGO selecting NGO sign-in still fails approval requirement")
    void testUnapprovedNgo_WithExpectedRoleNgo_FailsApproval() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("pending.ngo@roleauth.org")
                .password(DEFAULT_PASSWORD)
                .expectedRole("NGO")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Your email may be verified, but your account is pending admin approval."));
    }

    // ==========================================
    // 15. ROLE NORMALIZATION (PREFIX & CASE)
    // ==========================================

    @Test
    @DisplayName("15. Role normalization handles ROLE_ prefix, lowercase, and whitespace")
    void testRoleNormalization_HandlesRolePrefixAndCase() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("donor@roleauth.org")
                .password(DEFAULT_PASSWORD)
                .expectedRole("  ROLE_donor  ")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isString())
                .andExpect(jsonPath("$.data.user.role").value("DONOR"));
    }
}
