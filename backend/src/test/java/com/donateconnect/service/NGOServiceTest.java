package com.donateconnect.service;

import com.donateconnect.dto.NGOProfileDto;
import com.donateconnect.entity.NGOProfile;
import com.donateconnect.entity.Role;
import com.donateconnect.entity.User;
import com.donateconnect.repository.NGOProfileRepository;
import com.donateconnect.repository.UserRepository;
import com.donateconnect.service.impl.NGOServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NGOServiceTest {

    @Mock
    private NGOProfileRepository ngoProfileRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private GeocodingService geocodingService;

    private NGOServiceImpl ngoService;

    private User ngoUser1;
    private User ngoUser2;
    private NGOProfile ngo1;
    private NGOProfile ngo2;

    @BeforeEach
    void setUp() {
        ngoService = new NGOServiceImpl(ngoProfileRepository, userRepository, passwordEncoder, geocodingService);

        ngoUser1 = User.builder()
                .id(UUID.randomUUID())
                .email("ngo1@charity.org")
                .fullName("Charity One")
                .role(Role.NGO)
                .approved(true)
                .averageRating(4.5)
                .ratingCount(10)
                .createdAt(LocalDateTime.now())
                .build();

        ngoUser2 = User.builder()
                .id(UUID.randomUUID())
                .email("ngo2@charity.org")
                .fullName("Charity Two")
                .role(Role.NGO)
                .approved(true)
                .averageRating(null)
                .ratingCount(null)
                .createdAt(LocalDateTime.now())
                .build();

        ngo1 = NGOProfile.builder()
                .id(UUID.randomUUID())
                .user(ngoUser1)
                .name("Charity One")
                .description("Helping local families")
                .address("100 Main St")
                .city("Metro")
                .phone("555-0100")
                .latitude(12.9716)
                .longitude(77.5946)
                .verified(true)
                .averageRating(4.5)
                .ratingCount(10)
                .createdAt(LocalDateTime.now())
                .build();

        ngo2 = NGOProfile.builder()
                .id(UUID.randomUUID())
                .user(ngoUser2)
                .name("Charity Two")
                .description("Incomplete location NGO")
                .address("200 Rural Rd")
                .city("Outskirts")
                .phone("555-0200")
                .latitude(null)
                .longitude(null)
                .verified(true)
                .averageRating(null)
                .ratingCount(null)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    void testGetAllVerifiedNgos_WithoutDonorLocation_LeavesDistanceKmNull() {
        when(ngoProfileRepository.findByVerifiedTrue()).thenReturn(Arrays.asList(ngo1, ngo2));

        List<NGOProfileDto> result = ngoService.getAllVerifiedNgos(null, null, null, null, null);

        assertNotNull(result);
        assertEquals(2, result.size());
        assertNull(result.get(0).getDistanceKm(), "Distance must remain null when donor coordinates are absent");
        assertNull(result.get(1).getDistanceKm(), "Distance must remain null when donor coordinates are absent");
    }

    @Test
    void testGetAllVerifiedNgos_WithValidDonorLocation_CalculatesDistanceAndSorts() {
        when(ngoProfileRepository.findByVerifiedTrue()).thenReturn(Arrays.asList(ngo2, ngo1));

        // Donor near ngo1
        List<NGOProfileDto> result = ngoService.getAllVerifiedNgos(null, null, null, 12.9700, 77.5900);

        assertNotNull(result);
        assertEquals(2, result.size());
        // NGO 1 has valid coordinates so distance is calculated
        assertEquals("Charity One", result.get(0).getName());
        assertNotNull(result.get(0).getDistanceKm());
        assertTrue(result.get(0).getDistanceKm() > 0);

        // NGO 2 has null coordinates so distance is null and pushed to end
        assertEquals("Charity Two", result.get(1).getName());
        assertNull(result.get(1).getDistanceKm());
    }

    @Test
    void testGetAllVerifiedNgos_WithOutOfBoundsCoordinates_DoesNotCalculateDistance() {
        when(ngoProfileRepository.findByVerifiedTrue()).thenReturn(Arrays.asList(ngo1));

        // Invalid latitude (> 90)
        List<NGOProfileDto> result = ngoService.getAllVerifiedNgos(null, null, null, 95.0, 77.5900);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertNull(result.get(0).getDistanceKm(), "Distance must not be calculated for invalid coordinates");
    }
}

