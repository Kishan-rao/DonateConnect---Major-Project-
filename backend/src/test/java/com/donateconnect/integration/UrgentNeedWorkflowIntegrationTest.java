package com.donateconnect.integration;

import com.donateconnect.dto.CreateDonationRequest;
import com.donateconnect.dto.CreateUrgentNeedRequest;
import com.donateconnect.entity.*;
import com.donateconnect.repository.*;
import com.donateconnect.config.JwtUtils;
import com.donateconnect.service.NgoUrgentNeedService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class UrgentNeedWorkflowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NGOProfileRepository ngoProfileRepository;

    @Autowired
    private NgoUrgentNeedRepository urgentNeedRepository;

    @Autowired
    private DonationRepository donationRepository;

    @Autowired
    private DeliveryRepository deliveryRepository;

    @Autowired
    private NgoUrgentNeedService urgentNeedService;

    @Autowired
    private JwtUtils jwtUtils;

    private User donorUser;
    private User adminUser;
    private User ngoUser;
    private User volunteerUser;
    private NGOProfile verifiedNgo;

    private String donorToken;
    private String adminToken;
    private String ngoToken;
    private String volunteerToken;

    @BeforeEach
    void setUp() {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        donorUser = userRepository.save(User.builder()
                .email("donor_" + tag + "@test.com")
                .fullName("Donor User")
                .passwordHash("password")
                .role(Role.DONOR)
                .approved(true)
                .build());

        adminUser = userRepository.save(User.builder()
                .email("admin_" + tag + "@test.com")
                .fullName("Admin User")
                .passwordHash("password")
                .role(Role.ADMIN)
                .approved(true)
                .build());

        ngoUser = userRepository.save(User.builder()
                .email("ngo_" + tag + "@test.com")
                .fullName("NGO User")
                .passwordHash("password")
                .role(Role.NGO)
                .approved(true)
                .build());

        volunteerUser = userRepository.save(User.builder()
                .email("vol_" + tag + "@test.com")
                .fullName("Driver User")
                .passwordHash("password")
                .role(Role.VOLUNTEER)
                .approved(true)
                .build());

        verifiedNgo = ngoProfileRepository.save(NGOProfile.builder()
                .user(ngoUser)
                .name("Relief Foundation " + tag)
                .description("Dedicated NGO Partner")
                .address("Indiranagar, Bengaluru, Karnataka")
                .city("Bengaluru")
                .phone("9876543210")
                .verified(true)
                .build());

        donorToken = jwtUtils.generateToken(donorUser);
        adminToken = jwtUtils.generateToken(adminUser);
        ngoToken = jwtUtils.generateToken(ngoUser);
        volunteerToken = jwtUtils.generateToken(volunteerUser);
    }

    @Test
    @DisplayName("1. Donor can retrieve all ACTIVE urgent requirements")
    void testDonorCanRetrieveActiveUrgentRequirements() throws Exception {
        NgoUrgentNeed activeNeed = urgentNeedRepository.save(NgoUrgentNeed.builder()
                .ngo(verifiedNgo)
                .title("50 Woolen Blankets")
                .description("Needed for winter relief")
                .category(Category.CLOTHES)
                .quantity(50)
                .fulfilledQuantity(0)
                .status(UrgentNeedStatus.ACTIVE)
                .active(true)
                .build());

        mockMvc.perform(get("/api/urgent-needs")
                        .header("Authorization", "Bearer " + donorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasItem(allOf(
                        hasEntry("id", activeNeed.getId().toString()),
                        hasEntry("title", "50 Woolen Blankets"),
                        hasEntry("status", "ACTIVE")
                ))));
    }

    @Test
    @DisplayName("2. Admin can retrieve ACTIVE and COMPLETED requirements with tracking details")
    void testAdminCanRetrieveAllRequirementsWithTracking() throws Exception {
        NgoUrgentNeed activeNeed = urgentNeedRepository.save(NgoUrgentNeed.builder()
                .ngo(verifiedNgo)
                .title("Active Drive")
                .description("Desc")
                .category(Category.FOOD)
                .quantity(100)
                .fulfilledQuantity(20)
                .status(UrgentNeedStatus.ACTIVE)
                .active(true)
                .build());

        NgoUrgentNeed completedNeed = urgentNeedRepository.save(NgoUrgentNeed.builder()
                .ngo(verifiedNgo)
                .title("Completed Drive")
                .description("Desc")
                .category(Category.FOOD)
                .quantity(50)
                .fulfilledQuantity(50)
                .status(UrgentNeedStatus.COMPLETED)
                .active(false)
                .completedAt(LocalDateTime.now())
                .build());

        mockMvc.perform(get("/api/admin/urgent-needs")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasItem(hasEntry("id", activeNeed.getId().toString()))))
                .andExpect(jsonPath("$.data", hasItem(hasEntry("id", completedNeed.getId().toString()))));
    }

    @Test
    @DisplayName("3. NGO cannot retrieve urgent requirement listings (403 Forbidden)")
    void testNgoCannotRetrieveUrgentRequirements() throws Exception {
        mockMvc.perform(get("/api/urgent-needs")
                        .header("Authorization", "Bearer " + ngoToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/ngo/urgent-needs")
                        .header("Authorization", "Bearer " + ngoToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("4. Delivery partner cannot retrieve urgent requirement listings (403 Forbidden)")
    void testDeliveryPartnerCannotRetrieveUrgentRequirements() throws Exception {
        mockMvc.perform(get("/api/urgent-needs")
                        .header("Authorization", "Bearer " + volunteerToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/urgent-needs")
                        .header("Authorization", "Bearer " + volunteerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("5. NGO can create an urgent requirement")
    void testNgoCanCreateUrgentRequirement() throws Exception {
        CreateUrgentNeedRequest req = new CreateUrgentNeedRequest();
        req.setTitle("Emergency Grain Sacks");
        req.setDescription("Need 30 sacks of wheat grain for community pantry");
        req.setCategory(Category.FOOD);
        req.setQuantity(30);

        mockMvc.perform(post("/api/ngo/urgent-needs")
                        .header("Authorization", "Bearer " + ngoToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.title").value("Emergency Grain Sacks"))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.quantity").value(30));
    }

    @Test
    @DisplayName("6. Admin cannot submit a donation (403 Forbidden)")
    void testAdminCannotSubmitDonation() throws Exception {
        CreateDonationRequest req = CreateDonationRequest.builder()
                .ngoId(verifiedNgo.getId())
                .category(Category.FOOD)
                .description("Admin attempting donation")
                .pickupAddress("MG Road, Bengaluru - 560001")
                .pickupLat(12.9716)
                .pickupLng(77.5946)
                .pickupDate(LocalDate.now().plusDays(1))
                .quantity(10)
                .build();

        mockMvc.perform(post("/api/donations")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("7. Delivery partner cannot submit a donation (403 Forbidden)")
    void testVolunteerCannotSubmitDonation() throws Exception {
        CreateDonationRequest req = CreateDonationRequest.builder()
                .ngoId(verifiedNgo.getId())
                .category(Category.FOOD)
                .description("Volunteer attempting donation")
                .pickupAddress("MG Road, Bengaluru - 560001")
                .pickupLat(12.9716)
                .pickupLng(77.5946)
                .pickupDate(LocalDate.now().plusDays(1))
                .quantity(10)
                .build();

        mockMvc.perform(post("/api/donations")
                        .header("Authorization", "Bearer " + volunteerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("8. Donor can submit a donation linked to an ACTIVE urgent requirement")
    void testDonorCanSubmitUrgentDonation() throws Exception {
        NgoUrgentNeed need = urgentNeedRepository.save(NgoUrgentNeed.builder()
                .ngo(verifiedNgo)
                .title("Medicine Kits")
                .description("First aid medical supplies")
                .category(Category.OTHER)
                .quantity(20)
                .fulfilledQuantity(0)
                .status(UrgentNeedStatus.ACTIVE)
                .active(true)
                .build());

        CreateDonationRequest req = CreateDonationRequest.builder()
                .ngoId(verifiedNgo.getId())
                .urgentNeedId(need.getId())
                .category(Category.OTHER)
                .description("Donating 5 comprehensive first aid medicine kits")
                .pickupAddress("Indiranagar 100ft road, Bengaluru")
                .pickupLat(12.9716)
                .pickupLng(77.5946)
                .pickupDate(LocalDate.now().plusDays(1))
                .quantity(5)
                .build();

        mockMvc.perform(post("/api/donations")
                        .header("Authorization", "Bearer " + donorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.urgentNeedId").value(need.getId().toString()))
                .andExpect(jsonPath("$.data.quantity").value(5));
    }

    @Test
    @DisplayName("9. Donor cannot submit a donation linked to a COMPLETED requirement")
    void testDonorCannotDonateToCompletedRequirement() throws Exception {
        NgoUrgentNeed completedNeed = urgentNeedRepository.save(NgoUrgentNeed.builder()
                .ngo(verifiedNgo)
                .title("Completed Clothes Drive")
                .description("Already fully collected")
                .category(Category.CLOTHES)
                .quantity(50)
                .fulfilledQuantity(50)
                .status(UrgentNeedStatus.COMPLETED)
                .active(false)
                .completedAt(LocalDateTime.now())
                .build());

        CreateDonationRequest req = CreateDonationRequest.builder()
                .ngoId(verifiedNgo.getId())
                .urgentNeedId(completedNeed.getId())
                .category(Category.CLOTHES)
                .description("Attempting to donate to completed campaign")
                .pickupAddress("Koramangala, Bengaluru - 560034")
                .pickupLat(12.9352)
                .pickupLng(77.6245)
                .pickupDate(LocalDate.now().plusDays(1))
                .quantity(10)
                .build();

        mockMvc.perform(post("/api/donations")
                        .header("Authorization", "Bearer " + donorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("10. Invalid quantities are rejected (<= 0 or > remaining)")
    void testInvalidDonationQuantitiesRejected() throws Exception {
        NgoUrgentNeed need = urgentNeedRepository.save(NgoUrgentNeed.builder()
                .ngo(verifiedNgo)
                .title("Textbooks for School")
                .description("Grade 10 mathematics textbooks")
                .category(Category.BOOKS)
                .quantity(25)
                .fulfilledQuantity(15) // remaining is 10
                .status(UrgentNeedStatus.ACTIVE)
                .active(true)
                .build());

        // Zero quantity rejected
        CreateDonationRequest zeroReq = CreateDonationRequest.builder()
                .ngoId(verifiedNgo.getId())
                .urgentNeedId(need.getId())
                .category(Category.BOOKS)
                .description("Valid description text for donation")
                .pickupAddress("Rajajinagar, Bengaluru")
                .pickupLat(12.9901)
                .pickupLng(77.5525)
                .pickupDate(LocalDate.now().plusDays(1))
                .quantity(0)
                .build();

        mockMvc.perform(post("/api/donations")
                        .header("Authorization", "Bearer " + donorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(zeroReq)))
                .andExpect(status().isBadRequest());

        // Exceeding remaining (15 donated when only 10 remaining) rejected
        CreateDonationRequest excessReq = CreateDonationRequest.builder()
                .ngoId(verifiedNgo.getId())
                .urgentNeedId(need.getId())
                .category(Category.BOOKS)
                .description("Valid description text for donation")
                .pickupAddress("Rajajinagar, Bengaluru")
                .pickupLat(12.9901)
                .pickupLng(77.5525)
                .pickupDate(LocalDate.now().plusDays(1))
                .quantity(15)
                .build();

        mockMvc.perform(post("/api/donations")
                        .header("Authorization", "Bearer " + donorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(excessReq)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("11. Multiple donors contribute, verified deliveries update fulfilled quantity, and requirement auto-completes")
    void testMultiDonorWorkflowAndAutoCompletion() {
        // Step 1: Create urgent requirement for 100 units of rice
        NgoUrgentNeed need = urgentNeedRepository.save(NgoUrgentNeed.builder()
                .ngo(verifiedNgo)
                .title("100 kg Rice Appeal")
                .description("Food drive for community meal kitchen")
                .category(Category.FOOD)
                .quantity(100)
                .fulfilledQuantity(0)
                .status(UrgentNeedStatus.ACTIVE)
                .active(true)
                .build());

        // Step 2: Donor 1 donates 30 kg (starts REQUESTED)
        Donation d1 = donationRepository.save(Donation.builder()
                .donor(donorUser)
                .ngo(verifiedNgo)
                .urgentNeed(need)
                .quantity(30)
                .category(Category.FOOD)
                .description("30 kg Sona Masoori Rice")
                .pickupAddress("Bengaluru")
                .pickupLat(12.9716)
                .pickupLng(77.5946)
                .status(DonationStatus.REQUESTED)
                .build());

        // Prior to delivery completion: fulfilled quantity is still 0
        urgentNeedService.updateFulfilmentProgress(need.getId());
        NgoUrgentNeed check1 = urgentNeedRepository.findById(need.getId()).orElseThrow();
        assertEquals(0, check1.getFulfilledQuantity());
        assertEquals(UrgentNeedStatus.ACTIVE, check1.getStatus());

        // Donor 1 donation is delivered and verified
        d1.setStatus(DonationStatus.DELIVERED);
        donationRepository.save(d1);
        urgentNeedService.updateFulfilmentProgress(need.getId());

        NgoUrgentNeed check2 = urgentNeedRepository.findById(need.getId()).orElseThrow();
        assertEquals(30, check2.getFulfilledQuantity());
        assertEquals(UrgentNeedStatus.ACTIVE, check2.getStatus());

        // Step 3: Donor 2 donates 20 kg and is delivered
        Donation d2 = donationRepository.save(Donation.builder()
                .donor(donorUser)
                .ngo(verifiedNgo)
                .urgentNeed(need)
                .quantity(20)
                .category(Category.FOOD)
                .description("20 kg Kolam Rice")
                .pickupAddress("Bengaluru")
                .pickupLat(12.9716)
                .pickupLng(77.5946)
                .status(DonationStatus.DELIVERED)
                .build());

        urgentNeedService.updateFulfilmentProgress(need.getId());
        NgoUrgentNeed check3 = urgentNeedRepository.findById(need.getId()).orElseThrow();
        assertEquals(50, check3.getFulfilledQuantity());
        assertEquals(UrgentNeedStatus.ACTIVE, check3.getStatus());

        // Step 4: Donor 3 donates 50 kg and is delivered -> Reaches 100 kg!
        Donation d3 = donationRepository.save(Donation.builder()
                .donor(donorUser)
                .ngo(verifiedNgo)
                .urgentNeed(need)
                .quantity(50)
                .category(Category.FOOD)
                .description("50 kg Basmati Rice")
                .pickupAddress("Bengaluru")
                .pickupLat(12.9716)
                .pickupLng(77.5946)
                .status(DonationStatus.DELIVERED)
                .build());

        urgentNeedService.updateFulfilmentProgress(need.getId());
        NgoUrgentNeed completedNeed = urgentNeedRepository.findById(need.getId()).orElseThrow();
        assertEquals(100, completedNeed.getFulfilledQuantity());
        assertEquals(UrgentNeedStatus.COMPLETED, completedNeed.getStatus());
        assertFalse(completedNeed.isActive());
        assertNotNull(completedNeed.getCompletedAt());

        // Step 5: Verify completed requirement is excluded from active listings
        List<com.donateconnect.dto.NgoUrgentNeedDto> activeList = urgentNeedService.getActiveUrgentNeeds();
        boolean foundInActive = activeList.stream().anyMatch(n -> n.getId().equals(need.getId()));
        assertFalse(foundInActive, "Completed urgent requirement must be excluded from active listings");
    }
}
