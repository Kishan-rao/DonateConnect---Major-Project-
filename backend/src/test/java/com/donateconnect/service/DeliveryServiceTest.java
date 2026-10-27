package com.donateconnect.service;

import com.donateconnect.dto.DeliveryDto;
import com.donateconnect.entity.Delivery;
import com.donateconnect.entity.DeliveryStatus;
import com.donateconnect.entity.Donation;
import com.donateconnect.entity.NGOProfile;
import com.donateconnect.entity.User;
import com.donateconnect.repository.DeliveryRepository;
import com.donateconnect.repository.DonationRepository;
import com.donateconnect.service.impl.DeliveryServiceImpl;
import com.donateconnect.service.NotificationService;
import org.springframework.security.access.AccessDeniedException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;

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
    private User donor;
    private User ngoUser;
    private byte[] proofData;
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
        donor = new User();
        donor.setId(UUID.randomUUID());
        ngoUser = new User();
        ngoUser.setId(UUID.randomUUID());
        NGOProfile ngo = new NGOProfile();
        ngo.setUser(ngoUser);
        donation.setDonor(donor);
        donation.setNgo(ngo);

        delivery = new Delivery();
        delivery.setId(deliveryId);
        delivery.setVolunteer(volunteer);
        delivery.setDonation(donation);
        delivery.setStatus(DeliveryStatus.ASSIGNED);
        delivery.setDeliveryOtp("123456");
        proofData = createValidJpeg();
    }

    @Test
    void testUpdateDeliveryStatus_Success() {
        when(deliveryRepository.findByIdForUpdate(deliveryId)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.save(any(Delivery.class))).thenReturn(delivery);

        DeliveryDto result = deliveryService.updateDeliveryStatus(volunteerId, deliveryId, DeliveryStatus.ACCEPTED_BY_VOLUNTEER);

        assertEquals(DeliveryStatus.ACCEPTED_BY_VOLUNTEER, result.getStatus());
        verify(deliveryRepository).save(delivery);
    }

    @Test
    void testUpdateDeliveryStatus_UnauthorizedVolunteer_ThrowsException() {
        UUID otherVolunteerId = UUID.randomUUID();
        when(deliveryRepository.findByIdForUpdate(deliveryId)).thenReturn(Optional.of(delivery));

        assertThrows(AccessDeniedException.class, () -> {
            deliveryService.updateDeliveryStatus(otherVolunteerId, deliveryId, DeliveryStatus.PICKED_UP);
        });

        verify(deliveryRepository, never()).save(any());
    }

    @Test
    void testUpdateDeliveryStatus_NullVolunteer_ThrowsExceptionWithoutNpe() {
        delivery.setVolunteer(null);
        when(deliveryRepository.findByIdForUpdate(deliveryId)).thenReturn(Optional.of(delivery));

        assertThrows(AccessDeniedException.class, () -> {
            deliveryService.updateDeliveryStatus(volunteerId, deliveryId, DeliveryStatus.ACCEPTED_BY_VOLUNTEER);
        });

        verify(deliveryRepository, never()).save(any());
    }

    @Test
    void testUpdateDeliveryStatus_PickedUp_GeneratesOtpAndRecordsStatusHistory() {
        delivery.setStatus(DeliveryStatus.EN_ROUTE_TO_PICKUP);
        when(deliveryRepository.findByIdForUpdate(deliveryId)).thenReturn(Optional.of(delivery));
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

        org.springframework.web.multipart.MultipartFile mockFile = mockProofImage(proofData);
        when(storageService.store(any(), any())).thenReturn("/api/donations/photo/proof.jpg");
        when(storageService.load("proof.jpg")).thenReturn(proofData);

        when(deliveryRepository.findByIdForUpdate(deliveryId)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(inv -> inv.getArgument(0));

        DeliveryDto result = deliveryService.completeDelivery(volunteerId, deliveryId, "654321", mockFile);

        assertEquals(DeliveryStatus.DELIVERED, result.getStatus());
        assertEquals("/api/volunteer/deliveries/" + deliveryId + "/proof-image", result.getProofImageUrl());
        assertEquals("/api/donations/photo/proof.jpg", delivery.getProofImageUrl());
        assertNotNull(delivery.getDeliveredAt());
        verify(storageService).load("proof.jpg");
        verify(statusHistoryRepository).save(any());
        verify(donationRepository).save(donation);
    }

    @Test
    void testCompleteDelivery_InvalidOtp_IncrementsAttemptsAndRejects() {
        delivery.setStatus(DeliveryStatus.PICKED_UP);
        delivery.setDeliveryOtp("654321");
        delivery.setDeliveryOtpExpiry(java.time.LocalDateTime.now().plusHours(1));

        org.springframework.web.multipart.MultipartFile mockFile = mockProofImage(proofData);
        when(deliveryRepository.findByIdForUpdate(deliveryId)).thenReturn(Optional.of(delivery));

        assertThrows(IllegalArgumentException.class, () -> {
            deliveryService.completeDelivery(volunteerId, deliveryId, "000000", mockFile);
        });

        assertEquals(1, delivery.getDeliveryOtpAttempts());
        verify(deliveryRepository).save(delivery);
    }

    @Test
    void testUpdateDeliveryStatus_CannotDeliverWithoutProofVerifiedCompletion() {
        delivery.setStatus(DeliveryStatus.EN_ROUTE_TO_NGO);
        when(deliveryRepository.findByIdForUpdate(deliveryId)).thenReturn(Optional.of(delivery));

        assertThrows(IllegalArgumentException.class, () ->
                deliveryService.updateDeliveryStatus(volunteerId, deliveryId, DeliveryStatus.DELIVERED));

        assertEquals(DeliveryStatus.EN_ROUTE_TO_NGO, delivery.getStatus());
        verify(deliveryRepository, never()).save(any());
        verify(donationRepository, never()).save(any());
    }

    @Test
    void testCompleteDelivery_MissingProofDoesNotCompleteDelivery() throws Exception {
        delivery.setStatus(DeliveryStatus.PICKED_UP);
        delivery.setDeliveryOtp("654321");
        delivery.setDeliveryOtpExpiry(java.time.LocalDateTime.now().plusHours(1));
        org.springframework.web.multipart.MultipartFile emptyFile = mock(org.springframework.web.multipart.MultipartFile.class);
        when(emptyFile.isEmpty()).thenReturn(true);
        when(deliveryRepository.findByIdForUpdate(deliveryId)).thenReturn(Optional.of(delivery));

        assertThrows(IllegalArgumentException.class, () ->
                deliveryService.completeDelivery(volunteerId, deliveryId, "654321", emptyFile));

        assertEquals(DeliveryStatus.PICKED_UP, delivery.getStatus());
        verify(storageService, never()).store(any(), any());
        verify(donationRepository, never()).save(any());
    }

    @Test
    void testCompleteDelivery_FailedUploadDoesNotCompleteDelivery() throws Exception {
        delivery.setStatus(DeliveryStatus.PICKED_UP);
        delivery.setDeliveryOtp("654321");
        delivery.setDeliveryOtpExpiry(java.time.LocalDateTime.now().plusHours(1));
        when(deliveryRepository.findByIdForUpdate(deliveryId)).thenReturn(Optional.of(delivery));
        when(storageService.store(any(), any())).thenThrow(new java.io.IOException("storage unavailable"));

        assertThrows(RuntimeException.class, () ->
                deliveryService.completeDelivery(volunteerId, deliveryId, "654321", mockProofImage(proofData)));

        assertEquals(DeliveryStatus.PICKED_UP, delivery.getStatus());
        assertNull(delivery.getProofImageUrl());
        verify(deliveryRepository, never()).save(any());
        verify(donationRepository, never()).save(any());
    }

    @Test
    void testCompleteDelivery_DuplicateSubmissionDoesNotUploadOrTransitionAgain() throws Exception {
        delivery.setStatus(DeliveryStatus.PICKED_UP);
        delivery.setDeliveryOtp("654321");
        delivery.setDeliveryOtpExpiry(java.time.LocalDateTime.now().plusHours(1));
        when(deliveryRepository.findByIdForUpdate(deliveryId)).thenReturn(Optional.of(delivery));
        when(storageService.store(any(), any())).thenReturn("/api/donations/photo/proof.jpg");
        when(storageService.load("proof.jpg")).thenReturn(proofData);
        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(inv -> inv.getArgument(0));

        deliveryService.completeDelivery(volunteerId, deliveryId, "654321", mockProofImage(proofData));

        assertThrows(IllegalArgumentException.class, () ->
                deliveryService.completeDelivery(volunteerId, deliveryId, "654321", mockProofImage(proofData)));
        verify(storageService, times(1)).store(any(), any());
        verify(deliveryRepository, times(1)).save(delivery);
    }

    @Test
    void testCompleteDelivery_UnauthorizedVolunteerCannotUploadProof() throws Exception {
        delivery.setStatus(DeliveryStatus.PICKED_UP);
        delivery.setDeliveryOtp("654321");
        delivery.setDeliveryOtpExpiry(java.time.LocalDateTime.now().plusHours(1));
        when(deliveryRepository.findByIdForUpdate(deliveryId)).thenReturn(Optional.of(delivery));

        assertThrows(AccessDeniedException.class, () ->
                deliveryService.completeDelivery(UUID.randomUUID(), deliveryId, "654321", mockProofImage(proofData)));

        verify(storageService, never()).store(any(), any());
        verify(deliveryRepository, never()).save(any());
    }

    @Test
    void testGetDeliveryProofImage_AllowsDonorAndReceivingNgoOnly() throws Exception {
        delivery.setProofImageUrl("/api/donations/photo/proof.jpg");
        when(deliveryRepository.findById(deliveryId)).thenReturn(Optional.of(delivery));
        when(storageService.load("proof.jpg")).thenReturn(proofData);
        when(storageService.getContentType("proof.jpg")).thenReturn("image/jpeg");

        assertArrayEquals(proofData, deliveryService.getDeliveryProofImage(donor.getId(), deliveryId).data());
        assertEquals("image/jpeg", deliveryService.getDeliveryProofImage(ngoUser.getId(), deliveryId).contentType());

        assertThrows(AccessDeniedException.class, () ->
                deliveryService.getDeliveryProofImage(UUID.randomUUID(), deliveryId));
        verify(storageService, times(2)).load("proof.jpg");
    }

    private org.springframework.web.multipart.MultipartFile mockProofImage(byte[] data) {
        return new org.springframework.mock.web.MockMultipartFile(
                "proofImage", "proof.jpg", "image/jpeg", data);
    }

    private byte[] createValidJpeg() {
        try {
            BufferedImage image = new BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB);
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            ImageIO.write(image, "jpg", output);
            return output.toByteArray();
        } catch (java.io.IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
