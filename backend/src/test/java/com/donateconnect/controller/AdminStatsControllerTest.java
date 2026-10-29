package com.donateconnect.controller;

import com.donateconnect.config.JwtUtils;
import com.donateconnect.entity.*;
import com.donateconnect.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AdminStatsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NGOProfileRepository ngoProfileRepository;

    @Autowired
    private DonationRepository donationRepository;

    @Autowired
    private DeliveryRepository deliveryRepository;

    @Autowired
    private JwtUtils jwtUtils;

    private User adminUser;
    private User donorUser;
    private User volunteerUser;
    private String adminToken;
    private String donorToken;
    private NGOProfile ngoBangalore;
    private NGOProfile ngoMumbai;

    @BeforeEach
    void setUp() {
        // Clear repositories
        deliveryRepository.deleteAll();
        donationRepository.deleteAll();
        ngoProfileRepository.deleteAll();
        userRepository.deleteAll();

        // 1. Create Users
        adminUser = userRepository.save(User.builder()
                .email("admin_" + UUID.randomUUID() + "@test.com")
                .passwordHash("hashed")
                .fullName("System Administrator")
                .role(Role.ADMIN)
                .approved(true)
                .build());

        donorUser = userRepository.save(User.builder()
                .email("donor_" + UUID.randomUUID() + "@test.com")
                .passwordHash("hashed")
                .fullName("Aarav Sharma")
                .role(Role.DONOR)
                .approved(true)
                .build());

        volunteerUser = userRepository.save(User.builder()
                .email("volunteer_" + UUID.randomUUID() + "@test.com")
                .passwordHash("hashed")
                .fullName("Rohan Gupta")
                .role(Role.VOLUNTEER)
                .approved(true)
                .build());

        adminToken = jwtUtils.generateToken(adminUser);
        donorToken = jwtUtils.generateToken(donorUser);

        // 2. Create NGOs
        User ngoUser1 = userRepository.save(User.builder()
                .email("ngo1_" + UUID.randomUUID() + "@test.com")
                .passwordHash("hashed")
                .fullName("Goonj Foundation Manager")
                .role(Role.NGO)
                .approved(true)
                .build());

        ngoBangalore = ngoProfileRepository.save(NGOProfile.builder()
                .user(ngoUser1)
                .name("Goonj Bengaluru")
                .description("Relief NGO")
                .address("100 Feet Road, Indiranagar, Bengaluru, Karnataka - 560038")
                .city("Bengaluru")
                .phone("+91 80 1234 5678")
                .verified(true)
                .build());

        User ngoUser2 = userRepository.save(User.builder()
                .email("ngo2_" + UUID.randomUUID() + "@test.com")
                .passwordHash("hashed")
                .fullName("Pratham Mumbai Manager")
                .role(Role.NGO)
                .approved(true)
                .build());

        ngoMumbai = ngoProfileRepository.save(NGOProfile.builder()
                .user(ngoUser2)
                .name("Pratham Mumbai")
                .description("Education NGO")
                .address("Nariman Point, Mumbai, Maharashtra - 400021")
                .city("Mumbai")
                .phone("+91 22 8765 4321")
                .verified(true)
                .build());
    }

    @Test
    @DisplayName("Admin stats endpoint requires authentication")
    void testUnauthenticatedAccessReturns401() throws Exception {
        mockMvc.perform(get("/api/admin/stats"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Admin stats endpoint denies access to non-admin roles")
    void testNonAdminAccessReturns403() throws Exception {
        mockMvc.perform(get("/api/admin/stats")
                        .header("Authorization", "Bearer " + donorToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Admin stats returns empty dataset gracefully when no donations or deliveries exist")
    void testEmptyDatasetHandling() throws Exception {
        mockMvc.perform(get("/api/admin/stats")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.totalDonations", is(0)))
                .andExpect(jsonPath("$.data.verifiedNgos", is(2)))
                .andExpect(jsonPath("$.data.pendingRequests", is(0)))
                .andExpect(jsonPath("$.data.completedDeliveries", is(0)))
                .andExpect(jsonPath("$.data.deliverySuccessRate", is(0.0)))
                .andExpect(jsonPath("$.data.averageDeliveryTimeHours", is(0.0)))
                .andExpect(jsonPath("$.data.donationsByCity", aMapWithSize(0)))
                .andExpect(jsonPath("$.data.topDonors", hasSize(0)))
                .andExpect(jsonPath("$.data.topNgos", hasSize(0)));
    }

    @Test
    @DisplayName("Admin stats correctly groups donations by city with normalization and address fallbacks")
    void testDonationsByCityAggregation() throws Exception {
        // Donation 1: Pickup address in Bengaluru
        donationRepository.save(Donation.builder()
                .donor(donorUser)
                .ngo(ngoBangalore)
                .category(Category.CLOTHES)
                .description("Warm sweaters")
                .status(DonationStatus.REQUESTED)
                .pickupDate(LocalDate.now().plusDays(1))
                .pickupAddress("Koramangala 4th Block, Bengaluru, Karnataka - 560034")
                .build());

        // Donation 2: Historical city alias 'Bangalore' in pickup address -> normalized to 'Bengaluru'
        donationRepository.save(Donation.builder()
                .donor(donorUser)
                .ngo(ngoBangalore)
                .category(Category.FOOD)
                .description("Canned soup")
                .status(DonationStatus.ACCEPTED)
                .pickupDate(LocalDate.now().plusDays(2))
                .pickupAddress("MG Road, Bangalore, Karnataka - 560001")
                .build());

        // Donation 3: Pickup address in Mumbai
        donationRepository.save(Donation.builder()
                .donor(donorUser)
                .ngo(ngoMumbai)
                .category(Category.BOOKS)
                .description("Math textbooks")
                .status(DonationStatus.DELIVERED)
                .pickupDate(LocalDate.now().minusDays(1))
                .pickupAddress("Bandra West, Mumbai, Maharashtra - 400050")
                .build());

        // Donation 4: No pickup address, falls back to NGO explicit city (Mumbai)
        donationRepository.save(Donation.builder()
                .donor(donorUser)
                .ngo(ngoMumbai)
                .category(Category.OTHER)
                .description("Household items")
                .status(DonationStatus.ACCEPTED)
                .pickupDate(LocalDate.now().plusDays(3))
                .pickupAddress(null)
                .build());

        mockMvc.perform(get("/api/admin/stats")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.totalDonations", is(4)))
                .andExpect(jsonPath("$.data.donationsByCity.Bengaluru", is(2)))
                .andExpect(jsonPath("$.data.donationsByCity.Mumbai", is(2)));
    }

    @Test
    @DisplayName("Calculates delivery performance metrics excluding invalid and negative durations")
    void testDeliveryPerformanceMetricsCalculation() throws Exception {
        Donation d1 = donationRepository.save(Donation.builder()
                .donor(donorUser)
                .ngo(ngoBangalore)
                .category(Category.CLOTHES)
                .description("Delivery 1")
                .status(DonationStatus.DELIVERED)
                .build());

        Donation d2 = donationRepository.save(Donation.builder()
                .donor(donorUser)
                .ngo(ngoBangalore)
                .category(Category.FOOD)
                .description("Delivery 2")
                .status(DonationStatus.DELIVERED)
                .build());

        Donation d3 = donationRepository.save(Donation.builder()
                .donor(donorUser)
                .ngo(ngoBangalore)
                .category(Category.BOOKS)
                .description("Delivery 3 - In Progress")
                .status(DonationStatus.PICKED_UP)
                .build());

        Donation d4 = donationRepository.save(Donation.builder()
                .donor(donorUser)
                .ngo(ngoBangalore)
                .category(Category.OTHER)
                .description("Delivery 4 - Invalid negative timestamp")
                .status(DonationStatus.DELIVERED)
                .build());

        LocalDateTime now = LocalDateTime.now();

        // Valid delivery 1: took exactly 2.0 hours (120 mins)
        deliveryRepository.save(Delivery.builder()
                .donation(d1)
                .volunteer(volunteerUser)
                .status(DeliveryStatus.DELIVERED)
                .assignedAt(now.minusHours(5))
                .pickedUpAt(now.minusHours(4))
                .deliveredAt(now.minusHours(2))
                .build());

        // Valid delivery 2: took exactly 4.0 hours (240 mins)
        deliveryRepository.save(Delivery.builder()
                .donation(d2)
                .volunteer(volunteerUser)
                .status(DeliveryStatus.DELIVERED)
                .assignedAt(now.minusHours(6))
                .pickedUpAt(now.minusHours(5))
                .deliveredAt(now.minusHours(1))
                .build());

        // Delivery 3: currently picked up, not delivered
        deliveryRepository.save(Delivery.builder()
                .donation(d3)
                .volunteer(volunteerUser)
                .status(DeliveryStatus.PICKED_UP)
                .assignedAt(now.minusHours(2))
                .pickedUpAt(now.minusHours(1))
                .deliveredAt(null)
                .build());

        // Delivery 4: deliveredAt is before pickedUpAt (clock anomaly, negative duration)
        deliveryRepository.save(Delivery.builder()
                .donation(d4)
                .volunteer(volunteerUser)
                .status(DeliveryStatus.DELIVERED)
                .assignedAt(now.minusHours(4))
                .pickedUpAt(now.minusHours(1))
                .deliveredAt(now.minusHours(3)) // Invalid: 2 hours in the past
                .build());

        // Total deliveries = 4
        // Successful deliveries = 3 (d1, d2, d4 have DELIVERED status)
        // Success rate = (3 / 4) * 100 = 75.0%
        // Valid delivery durations = d1 (2h) and d2 (4h). d4 is excluded because deliveredAt < pickedUpAt.
        // Average delivery time = (2.0 + 4.0) / 2 = 3.0 hours.

        mockMvc.perform(get("/api/admin/stats")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.deliverySuccessRate", is(75.0)))
                .andExpect(jsonPath("$.data.averageDeliveryTimeHours", is(3.0)));
    }

    @Test
    @DisplayName("Resolves unknown or missing cities as Unspecified without crashing")
    void testUnspecifiedCityHandling() throws Exception {
        // Create an NGO with null city and blank address
        User ngoUser = userRepository.save(User.builder()
                .email("ngo_empty_" + UUID.randomUUID() + "@test.com")
                .passwordHash("hashed")
                .fullName("Remote Foundation")
                .role(Role.NGO)
                .approved(true)
                .build());

        NGOProfile ngoEmpty = ngoProfileRepository.save(NGOProfile.builder()
                .user(ngoUser)
                .name("Remote Foundation")
                .description("No address")
                .address(" ")
                .city(null)
                .phone("+91 9999999999")
                .verified(true)
                .build());

        donationRepository.save(Donation.builder()
                .donor(donorUser)
                .ngo(ngoEmpty)
                .category(Category.CLOTHES)
                .description("Blank location donation")
                .status(DonationStatus.REQUESTED)
                .pickupAddress(" ")
                .build());

        mockMvc.perform(get("/api/admin/stats")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.donationsByCity.Unspecified", is(1)));
    }
}
