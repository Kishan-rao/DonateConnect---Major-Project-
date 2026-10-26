package com.donateconnect.service;

import com.donateconnect.dto.DeliveryDto;
import com.donateconnect.entity.Delivery;
import com.donateconnect.entity.DeliveryStatus;
import com.donateconnect.entity.Donation;
import com.donateconnect.entity.User;
import com.donateconnect.repository.DeliveryRepository;
import com.donateconnect.repository.DonationRepository;
import com.donateconnect.service.impl.DeliveryServiceImpl;
import com.donateconnect.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class DeliveryServiceTest {

    @Mock
    private DeliveryRepository deliveryRepository;
    
    @Mock
    private DonationRepository donationRepository;

    @Mock
    private com.donateconnect.repository.VolunteerTaskRepository volunteerTaskRepository;

    @Mock
    private StorageService storageService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private com.donateconnect.repository.StatusHistoryRepository statusHistoryRepository;

    private DeliveryServiceImpl deliveryService;

    private User volunteer;
    private Donation donation;
    private Delivery delivery;
    private UUID volunteerId = UUID.randomUUID();
    private UUID deliveryId = UUID.randomUUID();
    private UUID donationId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        deliveryService = new DeliveryServiceImpl(
                deliveryRepository,
                donationRepository,
                volunteerTaskRepository,
                storageService,
                notificationService,
                statusHistoryRepository
        );

        volunteer = new User();
        volunteer.setId(volunteerId);

        donation = new Donation();
        donation.setId(donationId);

        delivery = new Delivery();
        delivery.setId(deliveryId);
        delivery.setVolunteer(volunteer);
        delivery.setDonation(donation);
        delivery.setStatus(DeliveryStatus.ASSIGNED);
        delivery.setDeliveryOtp("123456");
    }

    @Test
    void testUpdateDeliveryStatus_Success() {
        when(deliveryRepository.findById(deliveryId)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.save(any(Delivery.class))).thenReturn(delivery);

        DeliveryDto result = deliveryService.updateDeliveryStatus(volunteerId, deliveryId, DeliveryStatus.ACCEPTED_BY_VOLUNTEER);

        assertEquals(DeliveryStatus.ACCEPTED_BY_VOLUNTEER, result.getStatus());
        verify(deliveryRepository).save(delivery);
    }

    @Test
    void testUpdateDeliveryStatus_UnauthorizedVolunteer_ThrowsException() {
        UUID otherVolunteerId = UUID.randomUUID();
        when(deliveryRepository.findById(deliveryId)).thenReturn(Optional.of(delivery));

        assertThrows(IllegalArgumentException.class, () -> {
            deliveryService.updateDeliveryStatus(otherVolunteerId, deliveryId, DeliveryStatus.PICKED_UP);
        });

        verify(deliveryRepository, never()).save(any());
    }

    @Test
    void testUpdateDeliveryStatus_NullVolunteer_ThrowsExceptionWithoutNpe() {
        delivery.setVolunteer(null);
        when(deliveryRepository.findById(deliveryId)).thenReturn(Optional.of(delivery));

        assertThrows(IllegalArgumentException.class, () -> {
            deliveryService.updateDeliveryStatus(volunteerId, deliveryId, DeliveryStatus.ACCEPTED_BY_VOLUNTEER);
        });

        verify(deliveryRepository, never()).save(any());
    }

    @Test
    void testUpdateDeliveryStatus_PickedUp_GeneratesOtpAndRecordsStatusHistory() {
        delivery.setStatus(DeliveryStatus.EN_ROUTE_TO_PICKUP);
        when(deliveryRepository.findById(deliveryId)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(inv -> inv.getArgument(0));

        DeliveryDto result = deliveryService.updateDeliveryStatus(volunteerId, deliveryId, DeliveryStatus.PICKED_UP);

        assertEquals(DeliveryStatus.PICKED_UP, result.getStatus());
        assertNotNull(delivery.getPickedUpAt());
        assertNotNull(delivery.getDeliveryOtp());
        verify(statusHistoryRepository).save(any());
        verify(donationRepository).save(donation);
    }

    @Test
    void testCompleteDelivery_Success_PersistsDeliveredAndRecordsHistory() throws Exception {
        delivery.setStatus(DeliveryStatus.PICKED_UP);
        delivery.setDeliveryOtp("654321");
        delivery.setDeliveryOtpExpiry(java.time.LocalDateTime.now().plusHours(1));

        org.springframework.web.multipart.MultipartFile mockFile = mock(org.springframework.web.multipart.MultipartFile.class);
        when(mockFile.getBytes()).thenReturn("fake-image".getBytes());
        when(mockFile.getOriginalFilename()).thenReturn("proof.jpg");
        when(storageService.store(any(), any())).thenReturn("/api/donations/photo/proof.jpg");

        when(deliveryRepository.findById(deliveryId)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(inv -> inv.getArgument(0));

        DeliveryDto result = deliveryService.completeDelivery(volunteerId, deliveryId, "654321", mockFile);

        assertEquals(DeliveryStatus.DELIVERED, result.getStatus());
        assertEquals("/api/donations/photo/proof.jpg", result.getProofImageUrl());
        assertNotNull(delivery.getDeliveredAt());
        verify(statusHistoryRepository).save(any());
        verify(donationRepository).save(donation);
    }

    @Test
    void testCompleteDelivery_InvalidOtp_IncrementsAttemptsAndRejects() {
        delivery.setStatus(DeliveryStatus.PICKED_UP);
        delivery.setDeliveryOtp("654321");
        delivery.setDeliveryOtpExpiry(java.time.LocalDateTime.now().plusHours(1));

        org.springframework.web.multipart.MultipartFile mockFile = mock(org.springframework.web.multipart.MultipartFile.class);
        when(deliveryRepository.findById(deliveryId)).thenReturn(Optional.of(delivery));

        assertThrows(IllegalArgumentException.class, () -> {
            deliveryService.completeDelivery(volunteerId, deliveryId, "000000", mockFile);
        });

        assertEquals(1, delivery.getDeliveryOtpAttempts());
        verify(deliveryRepository).save(delivery);
    }
}
