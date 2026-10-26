package com.donateconnect.controller;

import com.donateconnect.config.JwtUtils;
import com.donateconnect.dto.RouteEtaDto;
import com.donateconnect.entity.Role;
import com.donateconnect.entity.User;
import com.donateconnect.repository.UserRepository;
import com.donateconnect.service.RoutingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class RouteEtaControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserRepository userRepository;

    @MockitoBean
    private RoutingService routingService;

    private UUID donationId;
    private User donorUser;
    private String donorToken;

    @BeforeEach
    void setUp() {
        donationId = UUID.randomUUID();

        donorUser = userRepository.save(User.builder()
                .email("donor_eta_" + UUID.randomUUID() + "@test.com")
                .passwordHash("hash")
                .fullName("Donor Tester")
                .role(Role.DONOR)
                .approved(true)
                .build());

        donorToken = jwtUtils.generateToken(donorUser);
    }

    @Test
    @DisplayName("GET /api/deliveries/donations/{id}/route-eta returns 200 with route details")
    void testGetRouteEtaSuccess() throws Exception {
        RouteEtaDto mockDto = RouteEtaDto.builder()
                .deliveryId(UUID.randomUUID())
                .donationId(donationId)
                .deliveryStatus("EN_ROUTE_TO_PICKUP")
                .destinationType("PICKUP")
                .destinationAddress("123 Main St")
                .destinationLat(12.9352)
                .destinationLng(77.6245)
                .originLat(12.9279)
                .originLng(77.6271)
                .driverLastLocationAt(LocalDateTime.now())
                .staleGps(false)
                .roadDistanceKm(1.4)
                .roadDistanceMeters(1400.0)
                .durationMinutes(4)
                .durationSeconds(240)
                .trafficAware(false)
                .provider("OSRM")
                .routingStatus("SUCCESS")
                .statusMessage("Route calculated via OpenStreetMap road routing.")
                .routeCoordinates(Collections.emptyList())
                .build();

        when(routingService.calculateDeliveryRouteEta(eq(donationId), eq(donorUser.getId()), anyString()))
                .thenReturn(mockDto);

        mockMvc.perform(get("/api/deliveries/donations/" + donationId + "/route-eta")
                        .header("Authorization", "Bearer " + donorToken)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.destinationType", is("PICKUP")))
                .andExpect(jsonPath("$.data.roadDistanceKm", is(1.4)))
                .andExpect(jsonPath("$.data.durationMinutes", is(4)))
                .andExpect(jsonPath("$.data.trafficAware", is(false)))
                .andExpect(jsonPath("$.data.provider", is("OSRM")))
                .andExpect(jsonPath("$.data.routingStatus", is("SUCCESS")));
    }

    @Test
    @DisplayName("GET /api/deliveries/donations/{id}/route-eta without token returns 401 Unauthorized")
    void testGetRouteEtaUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/deliveries/donations/" + donationId + "/route-eta")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/deliveries/donations/{id}/route-eta returns 403 when user is unauthorized")
    void testGetRouteEtaUnauthorized() throws Exception {
        when(routingService.calculateDeliveryRouteEta(eq(donationId), eq(donorUser.getId()), anyString()))
                .thenThrow(new AccessDeniedException("You are not authorized to view route ETA for this delivery."));

        mockMvc.perform(get("/api/deliveries/donations/" + donationId + "/route-eta")
                        .header("Authorization", "Bearer " + donorToken)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }
}
