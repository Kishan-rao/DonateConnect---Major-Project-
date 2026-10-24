package com.donateconnect.service;

import com.donateconnect.config.JwtUtils;
import com.donateconnect.entity.*;
import com.donateconnect.repository.*;
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

import java.time.LocalDate;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class VolunteerWorkflowTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NGOProfileRepository ngoProfileRepository;

    @Autowired
    private DonationRepository donationRepository;

    @Autowired
    private VolunteerTaskRepository volunteerTaskRepository;

    @Autowired
    private StatusHistoryRepository statusHistoryRepository;

    @Autowired
    private DeliveryRepository deliveryRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User donorUser;
    private User ngoUser;
    private User volunteerUser;
    private User anotherVolunteerUser;
    private NGOProfile ngoProfile;
    private Donation acceptedDonation;
    private String volunteerToken;
    private String anotherVolunteerToken;
    private String donorToken;
    private String ngoToken;

    @BeforeEach
    void setup() {
        donorUser = userRepository.save(User.builder()
                .email("donor@voltest.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .fullName("Test Donor")
                .role(Role.DONOR)
                .approved(true)
                .build());

        ngoUser = userRepository.save(User.builder()
                .email("ngo@voltest.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .fullName("Test NGO Manager")
                .role(Role.NGO)
                .approved(true)
                .build());

        volunteerUser = userRepository.save(User.builder()
                .email("volunteer@voltest.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .fullName("Test Volunteer")
                .role(Role.VOLUNTEER)
                .approved(true)
                .build());

        anotherVolunteerUser = userRepository.save(User.builder()
                .email("anothervolunteer@voltest.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .fullName("Another Volunteer")
                .role(Role.VOLUNTEER)
                .approved(true)
                .build());

        ngoProfile = ngoProfileRepository.save(NGOProfile.builder()
                .user(ngoUser)
                .name("Test NGO")
                .description("Test NGO Description")
                .address("123 Bangalore Street")
                .phone("1234567890")
                .verified(true)
                .build());

        acceptedDonation = donationRepository.save(Donation.builder()
                .donor(donorUser)
                .ngo(ngoProfile)
                .category(Category.CLOTHES)
                .description("Clothes for pickup")
                .status(DonationStatus.ACCEPTED)
                .pickupDate(LocalDate.now().plusDays(2))
                .build());

        volunteerToken = jwtUtils.generateToken(volunteerUser);
        anotherVolunteerToken = jwtUtils.generateToken(anotherVolunteerUser);
        donorToken = jwtUtils.generateToken(donorUser);
        ngoToken = jwtUtils.generateToken(ngoUser);
    }

    // ==================== AVAILABLE PICKUPS TESTS ====================

    @Test
    void testVolunteerCanListAvailablePickups() throws Exception {
        mockMvc.perform(get("/api/volunteer/pickups/available")
                        .header("Authorization", "Bearer " + volunteerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").isArray())
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[*].status", everyItem(is("ACCEPTED"))));
    }

    @Test
    void testDonorCannotListAvailablePickups() throws Exception {
        mockMvc.perform(get("/api/volunteer/pickups/available")
                        .header("Authorization", "Bearer " + donorToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void testWorkflowFromSubmissionToApprovalToVolunteerPortal() throws Exception {
        // Step 1: Donor creates a donation
        String donationJson = """
            {
                "ngoId": "%s",
                "category": "BOOKS",
                "description": "Textbooks for donation",
                "pickupAddress": "456 Elm Street, Bengaluru, Karnataka 560001",
                "pickupLat": 12.9716,
                "pickupLng": 77.5946,
                "pickupDate": "%s",
                "pickupTimeSlot": "MORNING_9_12"
            }
        """.formatted(ngoProfile.getId(), LocalDate.now().plusDays(3).toString());

        String createResp = mockMvc.perform(post("/api/donations")
                        .header("Authorization", "Bearer " + donorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(donationJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("REQUESTED"))
                .andReturn().getResponse().getContentAsString();

        String newDonationId = objectMapper.readTree(createResp).get("data").get("id").asText();
        UUID donationUuid = UUID.fromString(newDonationId);

        // Step 2: NGO approves / accepts the donation
        mockMvc.perform(patch("/api/ngo/donations/" + newDonationId + "/status")
                        .header("Authorization", "Bearer " + ngoToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\": \"ACCEPTED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACCEPTED"));

        // Step 2b: Verify Delivery entity was automatically initialized in ASSIGNED status
        Delivery assignedDelivery = deliveryRepository.findByDonationId(donationUuid).orElse(null);
        assertNotNull(assignedDelivery, "Delivery record should be initialized upon NGO acceptance");
        assertEquals(DeliveryStatus.ASSIGNED, assignedDelivery.getStatus());
        assertNull(assignedDelivery.getVolunteer(), "Delivery volunteer should be null prior to claim");

        // Step 3: Volunteer checks available pickups and sees the new donation at the top
        mockMvc.perform(get("/api/volunteer/pickups/available")
                        .header("Authorization", "Bearer " + volunteerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").isArray())
                .andExpect(jsonPath("$.data.content[0].id").value(newDonationId))
                .andExpect(jsonPath("$.data.content[0].status").value("ACCEPTED"))
                .andExpect(jsonPath("$.data.content[0].pickupAddress").value("456 Elm Street, Bengaluru, Karnataka 560001"))
                .andExpect(jsonPath("$.data.content[0].pickupTimeSlot").value("MORNING_9_12"))
                .andExpect(jsonPath("$.data.content[0].pickupLat").value(12.9716))
                .andExpect(jsonPath("$.data.content[0].pickupLng").value(77.5946));

        // Step 4: Volunteer claims the pickup
        mockMvc.perform(post("/api/volunteer/pickups/" + newDonationId + "/claim")
                        .header("Authorization", "Bearer " + volunteerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CLAIMED"))
                .andExpect(jsonPath("$.data.deliveryId").value(assignedDelivery.getId().toString()));

        // Step 5: Verify Delivery updated to ACCEPTED_BY_VOLUNTEER with volunteer assigned
        Delivery claimedDelivery = deliveryRepository.findByDonationId(donationUuid).orElseThrow();
        assertEquals(DeliveryStatus.ACCEPTED_BY_VOLUNTEER, claimedDelivery.getStatus());
        assertEquals(volunteerUser.getId(), claimedDelivery.getVolunteer().getId());

        // Step 6: Verify donation is no longer in available pickups
        mockMvc.perform(get("/api/volunteer/pickups/available")
                        .header("Authorization", "Bearer " + volunteerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[*].id", not(hasItem(newDonationId))));

        // Step 7: Verify delivery details can be retrieved by volunteer
        mockMvc.perform(get("/api/volunteer/deliveries/donation/" + newDonationId)
                        .header("Authorization", "Bearer " + volunteerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(assignedDelivery.getId().toString()))
                .andExpect(jsonPath("$.data.status").value("ACCEPTED_BY_VOLUNTEER"));
    }

    // ==================== CLAIM PICKUP TESTS ====================

    @Test
    void testVolunteerCanClaimPickup() throws Exception {
        mockMvc.perform(post("/api/volunteer/pickups/" + acceptedDonation.getId() + "/claim")
                        .header("Authorization", "Bearer " + volunteerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("CLAIMED"))
                .andExpect(jsonPath("$.data.volunteer.email").value("volunteer@voltest.com"));
    }

    @Test
    void testVolunteerCannotClaimSamePickupTwice() throws Exception {
        // First claim should succeed
        mockMvc.perform(post("/api/volunteer/pickups/" + acceptedDonation.getId() + "/claim")
                        .header("Authorization", "Bearer " + volunteerToken))
                .andExpect(status().isOk());

        // Second claim should fail
        mockMvc.perform(post("/api/volunteer/pickups/" + acceptedDonation.getId() + "/claim")
                        .header("Authorization", "Bearer " + volunteerToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testAnotherVolunteerCannotClaimAlreadyClaimedPickup() throws Exception {
        // First volunteer claims
        mockMvc.perform(post("/api/volunteer/pickups/" + acceptedDonation.getId() + "/claim")
                        .header("Authorization", "Bearer " + volunteerToken))
                .andExpect(status().isOk());

        // Second volunteer cannot claim the same
        mockMvc.perform(post("/api/volunteer/pickups/" + acceptedDonation.getId() + "/claim")
                        .header("Authorization", "Bearer " + anotherVolunteerToken))
                .andExpect(status().isBadRequest());
    }

    // ==================== STATUS TRANSITION TESTS ====================

    @Test
    void testVolunteerCanMarkInTransit() throws Exception {
        // First claim
        String claimResponse = mockMvc.perform(post("/api/volunteer/pickups/" + acceptedDonation.getId() + "/claim")
                        .header("Authorization", "Bearer " + volunteerToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String taskId = objectMapper.readTree(claimResponse).get("data").get("id").asText();

        // Then mark in transit
        mockMvc.perform(patch("/api/volunteer/pickups/" + taskId + "/status")
                        .header("Authorization", "Bearer " + volunteerToken)
                        .param("status", "IN_TRANSIT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("IN_TRANSIT"));
    }

    @Test
    void testVolunteerCanMarkCompleted() throws Exception {
        // Claim
        String claimResponse = mockMvc.perform(post("/api/volunteer/pickups/" + acceptedDonation.getId() + "/claim")
                        .header("Authorization", "Bearer " + volunteerToken))
                .andReturn().getResponse().getContentAsString();

        String taskId = objectMapper.readTree(claimResponse).get("data").get("id").asText();

        // In Transit
        mockMvc.perform(patch("/api/volunteer/pickups/" + taskId + "/status")
                        .header("Authorization", "Bearer " + volunteerToken)
                        .param("status", "IN_TRANSIT"))
                .andExpect(status().isOk());

        // Complete
        mockMvc.perform(patch("/api/volunteer/pickups/" + taskId + "/status")
                        .header("Authorization", "Bearer " + volunteerToken)
                        .param("status", "COMPLETED"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Cannot complete task directly. Use the Delivery OTP endpoint."));
    }

    @Test
    void testCompletingPickupUpdatesDonationStatus() throws Exception {
        // Claim
        String claimResponse = mockMvc.perform(post("/api/volunteer/pickups/" + acceptedDonation.getId() + "/claim")
                        .header("Authorization", "Bearer " + volunteerToken))
                .andReturn().getResponse().getContentAsString();

        String taskId = objectMapper.readTree(claimResponse).get("data").get("id").asText();

        // In Transit
        mockMvc.perform(patch("/api/volunteer/pickups/" + taskId + "/status")
                        .header("Authorization", "Bearer " + volunteerToken)
                        .param("status", "IN_TRANSIT"))
                .andExpect(status().isOk());

        // Complete should be rejected
        mockMvc.perform(patch("/api/volunteer/pickups/" + taskId + "/status")
                        .header("Authorization", "Bearer " + volunteerToken)
                        .param("status", "COMPLETED"))
                .andExpect(status().isBadRequest());

        // Verify donation is NOT DELIVERED, but still PICKED_UP
        Donation updatedDonation = donationRepository.findById(acceptedDonation.getId()).orElseThrow();
        assertEquals(DonationStatus.PICKED_UP, updatedDonation.getStatus());
    }

    @Test
    void testAnotherVolunteerCannotModifyOthersTask() throws Exception {
        // First volunteer claims
        String claimResponse = mockMvc.perform(post("/api/volunteer/pickups/" + acceptedDonation.getId() + "/claim")
                        .header("Authorization", "Bearer " + volunteerToken))
                .andReturn().getResponse().getContentAsString();

        String taskId = objectMapper.readTree(claimResponse).get("data").get("id").asText();

        // Another volunteer tries to update the status - should fail
        mockMvc.perform(patch("/api/volunteer/pickups/" + taskId + "/status")
                        .header("Authorization", "Bearer " + anotherVolunteerToken)
                        .param("status", "IN_TRANSIT"))
                .andExpect(status().isForbidden());
    }

    @Test
    void testVolunteerCanListOwnPickups() throws Exception {
        // Claim a pickup first
        mockMvc.perform(post("/api/volunteer/pickups/" + acceptedDonation.getId() + "/claim")
                        .header("Authorization", "Bearer " + volunteerToken))
                .andExpect(status().isOk());

        // Then list them
        mockMvc.perform(get("/api/volunteer/pickups")
                        .header("Authorization", "Bearer " + volunteerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    @DisplayName("Pending volunteer account is blocked with 403 from protected endpoints")
    void testPendingVolunteerIsBlockedFromClaiming() throws Exception {
        User pendingVolunteer = userRepository.save(User.builder()
                .email("pending.vol@voltest.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .fullName("Pending Volunteer")
                .role(Role.VOLUNTEER)
                .approved(false)
                .build());

        String pendingToken = jwtUtils.generateToken(pendingVolunteer);

        mockMvc.perform(get("/api/volunteer/pickups")
                        .header("Authorization", "Bearer " + pendingToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/volunteer/pickups/" + acceptedDonation.getId() + "/claim")
                        .header("Authorization", "Bearer " + pendingToken))
                .andExpect(status().isForbidden());
    }
}
