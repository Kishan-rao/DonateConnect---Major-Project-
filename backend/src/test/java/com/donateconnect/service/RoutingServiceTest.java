package com.donateconnect.service;

import com.donateconnect.dto.RouteEtaDto;
import com.donateconnect.entity.*;
import com.donateconnect.exception.ResourceNotFoundException;
import com.donateconnect.repository.DeliveryRepository;
import com.donateconnect.service.impl.RoutingServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoutingServiceTest {

    @Mock
    private DeliveryRepository deliveryRepository;

    @Mock
    private RestTemplate restTemplate;

    private ObjectMapper objectMapper;
    private RoutingServiceImpl routingService;

    private UUID donationId;
    private UUID donorUserId;
    private UUID ngoUserId;
    private UUID volunteerUserId;
    private UUID strangerUserId;

    private User donorUser;
    private User ngoUser;
    private User volunteerUser;
    private NGOProfile ngoProfile;
    private Donation donation;
    private Delivery delivery;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        routingService = new RoutingServiceImpl(deliveryRepository, objectMapper, restTemplate);

        donationId = UUID.randomUUID();
        donorUserId = UUID.randomUUID();
        ngoUserId = UUID.randomUUID();
        volunteerUserId = UUID.randomUUID();
        strangerUserId = UUID.randomUUID();

        donorUser = User.builder().id(donorUserId).fullName("Donor User").role(Role.DONOR).build();
        ngoUser = User.builder().id(ngoUserId).fullName("NGO User").role(Role.NGO).build();
        volunteerUser = User.builder().id(volunteerUserId).fullName("Volunteer Driver").role(Role.VOLUNTEER).build();

        ngoProfile = NGOProfile.builder()
                .id(UUID.randomUUID())
                .user(ngoUser)
                .name("Hope Charity Center")
                .address("100 Charity Lane, Bengaluru")
                .latitude(12.9716)
                .longitude(77.5946)
                .verified(true)
                .build();

        donation = Donation.builder()
                .id(donationId)
                .donor(donorUser)
                .ngo(ngoProfile)
                .pickupAddress("25 Koramangala, Bengaluru")
                .pickupLat(12.9352)
                .pickupLng(77.6245)
                .status(DonationStatus.ACCEPTED)
                .build();

        delivery = Delivery.builder()
                .id(UUID.randomUUID())
                .donation(donation)
                .volunteer(volunteerUser)
                .status(DeliveryStatus.EN_ROUTE_TO_PICKUP)
                .lastLat(12.9279)
                .lastLng(77.6271)
                .lastLocationAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("1. Authoritative destination before pickup routes to donor pickup coordinates")
    void testDestinationSelectionBeforePickup() {
        delivery.setStatus(DeliveryStatus.EN_ROUTE_TO_PICKUP);
        when(deliveryRepository.findByDonationId(donationId)).thenReturn(Optional.of(delivery));

        String mockOsrmResponse = """
            {
              "code": "Ok",
              "routes": [{
                "distance": 1420.5,
                "duration": 240.2,
                "geometry": {
                  "coordinates": [[77.6271, 12.9279], [77.6245, 12.9352]]
                }
              }]
            }
            """;
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>(mockOsrmResponse, HttpStatus.OK));

        RouteEtaDto dto = routingService.calculateDeliveryRouteEta(donationId, donorUserId, "ROLE_DONOR");

        assertNotNull(dto);
        assertEquals("PICKUP", dto.getDestinationType());
        assertEquals("25 Koramangala, Bengaluru", dto.getDestinationAddress());
        assertEquals(12.9352, dto.getDestinationLat());
        assertEquals(77.6245, dto.getDestinationLng());
        assertEquals(1.4, dto.getRoadDistanceKm());
        assertEquals(4, dto.getDurationMinutes());
        assertEquals("SUCCESS", dto.getRoutingStatus());
        assertFalse(dto.isTrafficAware(), "OSRM results must explicitly have trafficAware=false");
        assertEquals("OSRM", dto.getProvider());
        assertEquals(2, dto.getRouteCoordinates().size());
        assertEquals(12.9279, dto.getRouteCoordinates().get(0).get(0));
    }

    @Test
    @DisplayName("2. Authoritative destination after pickup routes to NGO hub coordinates")
    void testDestinationSelectionAfterPickup() {
        delivery.setStatus(DeliveryStatus.PICKED_UP);
        donation.setStatus(DonationStatus.PICKED_UP);
        when(deliveryRepository.findByDonationId(donationId)).thenReturn(Optional.of(delivery));

        String mockOsrmResponse = """
            {
              "code": "Ok",
              "routes": [{
                "distance": 8500.0,
                "duration": 1200.0,
                "geometry": {
                  "coordinates": [[77.6271, 12.9279], [77.5946, 12.9716]]
                }
              }]
            }
            """;
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>(mockOsrmResponse, HttpStatus.OK));

        RouteEtaDto dto = routingService.calculateDeliveryRouteEta(donationId, ngoUserId, "ROLE_NGO");

        assertNotNull(dto);
        assertEquals("NGO_HUB", dto.getDestinationType());
        assertEquals("100 Charity Lane, Bengaluru", dto.getDestinationAddress());
        assertEquals(12.9716, dto.getDestinationLat());
        assertEquals(77.5946, dto.getDestinationLng());
        assertEquals(8.5, dto.getRoadDistanceKm());
        assertEquals(20, dto.getDurationMinutes());
        assertFalse(dto.isTrafficAware());
        assertEquals("OSRM", dto.getProvider());
    }

    @Test
    @DisplayName("3. Missing driver GPS returns DRIVER_OFFLINE without calling OSRM")
    void testMissingDriverGpsReturnsDriverOffline() {
        delivery.setLastLat(null);
        delivery.setLastLng(null);
        when(deliveryRepository.findByDonationId(donationId)).thenReturn(Optional.of(delivery));

        RouteEtaDto dto = routingService.calculateDeliveryRouteEta(donationId, donorUserId, "ROLE_DONOR");

        assertNotNull(dto);
        assertEquals("DRIVER_OFFLINE", dto.getRoutingStatus());
        assertTrue(dto.isStaleGps());
        verifyNoInteractions(restTemplate);
    }

    @Test
    @DisplayName("4. Missing destination coordinates returns MISSING_COORDINATES")
    void testMissingDestinationCoordinates() {
        donation.setPickupLat(null);
        donation.setPickupLng(null);
        when(deliveryRepository.findByDonationId(donationId)).thenReturn(Optional.of(delivery));

        RouteEtaDto dto = routingService.calculateDeliveryRouteEta(donationId, donorUserId, "ROLE_DONOR");

        assertNotNull(dto);
        assertEquals("MISSING_COORDINATES", dto.getRoutingStatus());
        verifyNoInteractions(restTemplate);
    }

    @Test
    @DisplayName("5. Completed delivery returns DELIVERY_COMPLETED with zero distance and ETA")
    void testCompletedDeliveryReturnsTerminalState() {
        delivery.setStatus(DeliveryStatus.DELIVERED);
        donation.setStatus(DonationStatus.DELIVERED);
        when(deliveryRepository.findByDonationId(donationId)).thenReturn(Optional.of(delivery));

        RouteEtaDto dto = routingService.calculateDeliveryRouteEta(donationId, donorUserId, "ROLE_DONOR");

        assertNotNull(dto);
        assertEquals("DELIVERY_COMPLETED", dto.getRoutingStatus());
        assertEquals(0.0, dto.getRoadDistanceKm());
        assertEquals(0, dto.getDurationMinutes());
        verifyNoInteractions(restTemplate);
    }

    @Test
    @DisplayName("6. Provider failure falls back to urban circuity distance calculation gracefully")
    void testProviderFailureFallbackCalculation() {
        when(deliveryRepository.findByDonationId(donationId)).thenReturn(Optional.of(delivery));
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
                .thenThrow(new RestClientException("Connection timed out"));

        RouteEtaDto dto = routingService.calculateDeliveryRouteEta(donationId, donorUserId, "ROLE_DONOR");

        assertNotNull(dto);
        assertEquals("FALLBACK_ESTIMATE", dto.getRoutingStatus());
        assertEquals("ESTIMATED_FALLBACK", dto.getProvider());
        assertFalse(dto.isTrafficAware());
        assertTrue(dto.getRoadDistanceKm() > 0.0);
        assertTrue(dto.getDurationMinutes() > 0);
        assertEquals(2, dto.getRouteCoordinates().size());
    }

    @Test
    @DisplayName("7. Stale GPS (>60s) flags staleGps=true")
    void testStaleGpsDetection() {
        delivery.setLastLocationAt(LocalDateTime.now().minusSeconds(90));
        when(deliveryRepository.findByDonationId(donationId)).thenReturn(Optional.of(delivery));

        String mockOsrmResponse = """
            {
              "code": "Ok",
              "routes": [{
                "distance": 1200.0,
                "duration": 180.0,
                "geometry": { "coordinates": [[77.6271, 12.9279], [77.6245, 12.9352]] }
              }]
            }
            """;
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>(mockOsrmResponse, HttpStatus.OK));

        RouteEtaDto dto = routingService.calculateDeliveryRouteEta(donationId, donorUserId, "ROLE_DONOR");

        assertTrue(dto.isStaleGps());
    }

    @Test
    @DisplayName("8. Multiple calls within 30s return cached result without hitting OSRM again")
    void testCachingDeduplicationWithinTtl() {
        when(deliveryRepository.findByDonationId(donationId)).thenReturn(Optional.of(delivery));

        String mockOsrmResponse = """
            {
              "code": "Ok",
              "routes": [{
                "distance": 2000.0,
                "duration": 300.0,
                "geometry": { "coordinates": [[77.6271, 12.9279], [77.6245, 12.9352]] }
              }]
            }
            """;
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>(mockOsrmResponse, HttpStatus.OK));

        // Call 1: Donor queries
        RouteEtaDto first = routingService.calculateDeliveryRouteEta(donationId, donorUserId, "ROLE_DONOR");
        // Call 2: NGO queries simultaneously
        RouteEtaDto second = routingService.calculateDeliveryRouteEta(donationId, ngoUserId, "ROLE_NGO");

        assertEquals(first.getRoadDistanceKm(), second.getRoadDistanceKm());
        assertEquals(first.getDurationMinutes(), second.getDurationMinutes());
        // Verify OSRM was only invoked ONCE due to caching
        verify(restTemplate, times(1)).exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class));
    }

    @Test
    @DisplayName("9. Destination change after pickup invalidates previous cache key")
    void testDestinationChangeInvalidatesCache() {
        when(deliveryRepository.findByDonationId(donationId)).thenReturn(Optional.of(delivery));

        String pickupOsrmResponse = """
            {
              "code": "Ok",
              "routes": [{
                "distance": 1000.0,
                "duration": 150.0,
                "geometry": { "coordinates": [[77.6271, 12.9279], [77.6245, 12.9352]] }
              }]
            }
            """;
        String hubOsrmResponse = """
            {
              "code": "Ok",
              "routes": [{
                "distance": 8000.0,
                "duration": 1000.0,
                "geometry": { "coordinates": [[77.6271, 12.9279], [77.5946, 12.9716]] }
              }]
            }
            """;
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>(pickupOsrmResponse, HttpStatus.OK))
                .thenReturn(new ResponseEntity<>(hubOsrmResponse, HttpStatus.OK));

        // Call before pickup
        RouteEtaDto pickupDto = routingService.calculateDeliveryRouteEta(donationId, donorUserId, "ROLE_DONOR");
        assertEquals("PICKUP", pickupDto.getDestinationType());

        // Delivery transitions to picked up
        delivery.setStatus(DeliveryStatus.PICKED_UP);
        donation.setStatus(DonationStatus.PICKED_UP);

        // Call after pickup
        RouteEtaDto hubDto = routingService.calculateDeliveryRouteEta(donationId, ngoUserId, "ROLE_NGO");
        assertEquals("NGO_HUB", hubDto.getDestinationType());

        // RestTemplate should be called twice because destination key changed
        verify(restTemplate, times(2)).exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class));
    }

    @Test
    @DisplayName("10. Unauthorized user is rejected with AccessDeniedException")
    void testUnauthorizedUserRejected() {
        when(deliveryRepository.findByDonationId(donationId)).thenReturn(Optional.of(delivery));

        assertThrows(AccessDeniedException.class, () -> {
            routingService.calculateDeliveryRouteEta(donationId, strangerUserId, "ROLE_DONOR");
        });
        verifyNoInteractions(restTemplate);
    }

    @Test
    @DisplayName("11. Admin user is permitted regardless of user ID")
    void testAdminUserAuthorized() {
        when(deliveryRepository.findByDonationId(donationId)).thenReturn(Optional.of(delivery));

        String mockOsrmResponse = """
            {
              "code": "Ok",
              "routes": [{
                "distance": 3000.0,
                "duration": 400.0,
                "geometry": { "coordinates": [[77.6271, 12.9279], [77.6245, 12.9352]] }
              }]
            }
            """;
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>(mockOsrmResponse, HttpStatus.OK));

        RouteEtaDto dto = routingService.calculateDeliveryRouteEta(donationId, strangerUserId, "ROLE_ADMIN");
        assertNotNull(dto);
        assertEquals("SUCCESS", dto.getRoutingStatus());
    }

    @Test
    @DisplayName("12. Nonexistent delivery throws ResourceNotFoundException")
    void testNonexistentDeliveryThrowsNotFound() {
        UUID unknownDonationId = UUID.randomUUID();
        when(deliveryRepository.findByDonationId(unknownDonationId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> {
            routingService.calculateDeliveryRouteEta(unknownDonationId, donorUserId, "ROLE_DONOR");
        });
    }
}

