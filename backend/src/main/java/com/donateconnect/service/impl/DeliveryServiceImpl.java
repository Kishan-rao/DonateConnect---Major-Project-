package com.donateconnect.service.impl;

import com.donateconnect.dto.DeliveryDto;
import com.donateconnect.entity.Delivery;
import com.donateconnect.entity.DeliveryStatus;
import com.donateconnect.entity.Donation;
import com.donateconnect.entity.DonationStatus;
import com.donateconnect.entity.StatusHistory;
import com.donateconnect.entity.VolunteerTask;
import com.donateconnect.exception.ResourceNotFoundException;
import com.donateconnect.repository.DeliveryRepository;
import com.donateconnect.repository.DonationRepository;
import com.donateconnect.repository.StatusHistoryRepository;
import com.donateconnect.repository.VolunteerTaskRepository;
import com.donateconnect.service.DeliveryProofImage;
import com.donateconnect.service.DeliveryService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DeliveryServiceImpl implements DeliveryService {

    private static final long MAX_PROOF_IMAGE_SIZE = 10 * 1024 * 1024;
    private static final String DONATION_PHOTO_URL_PREFIX = "/api/donations/photo/";

    private final DeliveryRepository deliveryRepository;
    private final DonationRepository donationRepository;
    private final VolunteerTaskRepository volunteerTaskRepository;
    private final com.donateconnect.service.StorageService storageService;
    private final com.donateconnect.service.NotificationService notificationService;
    private final StatusHistoryRepository statusHistoryRepository;

    @Override
    @Transactional
    public DeliveryDto updateDeliveryStatus(UUID volunteerId, UUID deliveryId, DeliveryStatus newStatus) {
        Delivery delivery = deliveryRepository.findByIdForUpdate(deliveryId)
                .orElseThrow(() -> new ResourceNotFoundException("Delivery not found"));

        if (delivery.getVolunteer() == null || !delivery.getVolunteer().getId().equals(volunteerId)) {
            throw new AccessDeniedException("You are not assigned to this delivery");
        }

        if (newStatus == DeliveryStatus.DELIVERED) {
            throw new IllegalArgumentException("Use the proof-verified completion endpoint to deliver this donation");
        }

        DeliveryStatus currentStatus = delivery.getStatus();
        
        // Validate transition
        if (!isValidTransition(currentStatus, newStatus)) {
            throw new IllegalArgumentException("Invalid status transition from " + currentStatus + " to " + newStatus);
        }

        delivery.setStatus(newStatus);
        
        // Timestamp tracking
        if (newStatus == DeliveryStatus.PICKED_UP) {
            delivery.setPickedUpAt(LocalDateTime.now());
            // Generate OTP for proof of delivery with expiry
            delivery.setDeliveryOtp(String.format("%06d", new java.security.SecureRandom().nextInt(1000000)));
            delivery.setDeliveryOtpExpiry(LocalDateTime.now().plusHours(24));
            delivery.setDeliveryOtpAttempts(0);
        } else if (newStatus == DeliveryStatus.DELIVERED) {
            delivery.setDeliveredAt(LocalDateTime.now());
        }

        // Sync with Donation status
        Donation donation = delivery.getDonation();
        if (newStatus == DeliveryStatus.PICKED_UP || newStatus == DeliveryStatus.EN_ROUTE_TO_NGO) {
            if (newStatus == DeliveryStatus.PICKED_UP) {
                donation.setStatus(DonationStatus.PICKED_UP);
                donationRepository.save(donation);

                if (statusHistoryRepository != null) {
                    statusHistoryRepository.save(StatusHistory.builder()
                            .donation(donation)
                            .status(DonationStatus.PICKED_UP)
                            .build());
                }
            }
            // Sync VolunteerTask to IN_TRANSIT if currently CLAIMED
            volunteerTaskRepository.findByDonationIdAndStatusIn(
                    donation.getId(),
                    List.of(VolunteerTask.TaskStatus.CLAIMED)
            ).forEach(task -> {
                task.setStatus(VolunteerTask.TaskStatus.IN_TRANSIT);
                volunteerTaskRepository.save(task);
            });
        } else if (newStatus == DeliveryStatus.DELIVERED) {
            donation.setStatus(DonationStatus.DELIVERED);
            donationRepository.save(donation);

            if (statusHistoryRepository != null) {
                statusHistoryRepository.save(StatusHistory.builder()
                        .donation(donation)
                        .status(DonationStatus.DELIVERED)
                        .build());
            }

            // Sync VolunteerTask to COMPLETED
            volunteerTaskRepository.findByDonationIdAndStatusIn(
                    donation.getId(),
                    List.of(VolunteerTask.TaskStatus.CLAIMED, VolunteerTask.TaskStatus.IN_TRANSIT)
            ).forEach(task -> {
                task.setStatus(VolunteerTask.TaskStatus.COMPLETED);
                volunteerTaskRepository.save(task);
            });
        }

        // Send notifications
        notifyStatusChange(delivery, newStatus);

        Delivery saved = deliveryRepository.save(delivery);
        return mapToDto(saved);
    }

    private boolean isValidTransition(DeliveryStatus current, DeliveryStatus next) {
        return switch (current) {
            case ASSIGNED -> next == DeliveryStatus.ACCEPTED_BY_VOLUNTEER;
            case ACCEPTED_BY_VOLUNTEER -> next == DeliveryStatus.EN_ROUTE_TO_PICKUP;
            case EN_ROUTE_TO_PICKUP -> next == DeliveryStatus.PICKED_UP;
            case PICKED_UP -> next == DeliveryStatus.EN_ROUTE_TO_NGO;
            case EN_ROUTE_TO_NGO -> next == DeliveryStatus.DELIVERED;
            case DELIVERED -> false;
        };
    }

    @Override
    @Transactional
    public DeliveryDto completeDelivery(UUID volunteerId, UUID deliveryId, String otp, org.springframework.web.multipart.MultipartFile proofImage) {
        Delivery delivery = deliveryRepository.findByIdForUpdate(deliveryId)
                .orElseThrow(() -> new ResourceNotFoundException("Delivery not found"));

        if (delivery.getVolunteer() == null || !delivery.getVolunteer().getId().equals(volunteerId)) {
            throw new AccessDeniedException("You are not assigned to this delivery");
        }

        if (delivery.getStatus() == DeliveryStatus.DELIVERED) {
            throw new IllegalArgumentException("Delivery is already completed");
        }

        // Verify OTP
        if (delivery.getDeliveryOtp() == null) {
            throw new IllegalArgumentException("No OTP generated for this delivery.");
        }
        if (delivery.getDeliveryOtpAttempts() >= 3) {
            throw new IllegalArgumentException("Maximum OTP attempts exceeded.");
        }
        if (delivery.getDeliveryOtpExpiry() != null && LocalDateTime.now().isAfter(delivery.getDeliveryOtpExpiry())) {
            throw new IllegalArgumentException("OTP has expired.");
        }
        if (!delivery.getDeliveryOtp().equals(otp)) {
            delivery.setDeliveryOtpAttempts(delivery.getDeliveryOtpAttempts() + 1);
            deliveryRepository.save(delivery);
            throw new IllegalArgumentException("Invalid OTP. Please check the code provided by the NGO.");
        }

        // Validate state
        if (delivery.getStatus() != DeliveryStatus.EN_ROUTE_TO_NGO && delivery.getStatus() != DeliveryStatus.PICKED_UP) {
            throw new IllegalArgumentException("Delivery must be PICKED_UP or EN_ROUTE_TO_NGO to complete");
        }

        byte[] proofData = validateProofImage(proofImage);
        try {
            String originalFilename = proofImage.getOriginalFilename() != null
                    ? proofImage.getOriginalFilename()
                    : "delivery-proof.jpg";
            String imageUrl = storageService.store(proofData, originalFilename);
            String storedFilename = extractStoredPhotoFilename(imageUrl);
            byte[] persistedProof = storageService.load(storedFilename);
            if (!MessageDigest.isEqual(proofData, persistedProof)) {
                throw new IllegalStateException("Stored proof image does not match the uploaded image");
            }
            delivery.setProofImageUrl(imageUrl);
        } catch (java.io.IOException e) {
            throw new RuntimeException("Failed to store proof image", e);
        }

        delivery.setStatus(DeliveryStatus.DELIVERED);
        delivery.setDeliveredAt(LocalDateTime.now());

        // Sync with Donation status
        Donation donation = delivery.getDonation();
        donation.setStatus(DonationStatus.DELIVERED);
        donationRepository.save(donation);

        if (statusHistoryRepository != null) {
            statusHistoryRepository.save(StatusHistory.builder()
                    .donation(donation)
                    .status(DonationStatus.DELIVERED)
                    .build());
        }

        // Sync with VolunteerTask status
        List<VolunteerTask> activeTasks = volunteerTaskRepository.findByDonationIdAndStatusIn(
                donation.getId(),
                List.of(VolunteerTask.TaskStatus.CLAIMED, VolunteerTask.TaskStatus.IN_TRANSIT)
        );
        for (VolunteerTask task : activeTasks) {
            task.setStatus(VolunteerTask.TaskStatus.COMPLETED);
            volunteerTaskRepository.save(task);
        }

        // Send notifications
        notifyStatusChange(delivery, DeliveryStatus.DELIVERED);

        return mapToDto(deliveryRepository.save(delivery));
    }

    @Override
    @Transactional(readOnly = true)
    public DeliveryProofImage getDeliveryProofImage(UUID requesterId, UUID deliveryId) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new ResourceNotFoundException("Delivery not found"));

        Donation donation = delivery.getDonation();
        UUID donorId = donation.getDonor() != null ? donation.getDonor().getId() : null;
        UUID ngoUserId = donation.getNgo() != null && donation.getNgo().getUser() != null
                ? donation.getNgo().getUser().getId()
                : null;
        if (!requesterId.equals(donorId) && !requesterId.equals(ngoUserId)) {
            throw new AccessDeniedException("Only the donor or receiving NGO can view this delivery proof");
        }

        String proofImageUrl = delivery.getProofImageUrl();
        if (proofImageUrl == null || proofImageUrl.isBlank()) {
            throw new ResourceNotFoundException("No proof image is available for this delivery");
        }

        String storedFilename = extractProofFilename(proofImageUrl);
        try {
            return new DeliveryProofImage(
                    storageService.load(storedFilename),
                    storageService.getContentType(storedFilename)
            );
        } catch (IOException e) {
            throw new ResourceNotFoundException("The proof image for this delivery is unavailable");
        }
    }

    private byte[] validateProofImage(org.springframework.web.multipart.MultipartFile proofImage) {
        if (proofImage == null || proofImage.isEmpty()) {
            throw new IllegalArgumentException("A proof-of-delivery photo is required");
        }
        if (proofImage.getSize() > MAX_PROOF_IMAGE_SIZE) {
            throw new IllegalArgumentException("Proof-of-delivery photos must be 10 MB or smaller");
        }

        try {
            byte[] data = proofImage.getBytes();
            if (data.length == 0 || data.length > MAX_PROOF_IMAGE_SIZE
                    || ImageIO.read(new ByteArrayInputStream(data)) == null) {
                throw new IllegalArgumentException("The proof-of-delivery file must be a valid image");
            }
            return data;
        } catch (IOException e) {
            throw new IllegalArgumentException("Could not read the proof-of-delivery image", e);
        }
    }

    private String extractStoredPhotoFilename(String imageUrl) {
        if (imageUrl == null || !imageUrl.startsWith(DONATION_PHOTO_URL_PREFIX)) {
            throw new IllegalStateException("Storage returned an invalid proof image URL");
        }
        String filename = imageUrl.substring(DONATION_PHOTO_URL_PREFIX.length());
        if (!filename.matches("[A-Za-z0-9._-]{1,255}")) {
            throw new IllegalStateException("Storage returned an invalid proof image filename");
        }
        return filename;
    }

    private String extractProofFilename(String proofImageUrl) {
        String path = proofImageUrl;
        try {
            java.net.URI uri = java.net.URI.create(proofImageUrl);
            if (uri.isAbsolute()) {
                if (!"http".equalsIgnoreCase(uri.getScheme()) && !"https".equalsIgnoreCase(uri.getScheme())) {
                    throw new ResourceNotFoundException("The proof image URL is invalid");
                }
                path = uri.getPath();
            }
        } catch (IllegalArgumentException e) {
            throw new ResourceNotFoundException("The proof image URL is invalid");
        }
        int separator = path.lastIndexOf('/');
        String filename = separator >= 0 ? path.substring(separator + 1) : path;
        if (!filename.matches("[A-Za-z0-9._-]{1,255}")) {
            throw new ResourceNotFoundException("The proof image URL is invalid");
        }
        return filename;
    }

    private void notifyStatusChange(Delivery delivery, DeliveryStatus newStatus) {
        String donorMessage = null;
        String ngoMessage = null;
        boolean emailImportant = false;

        switch (newStatus) {
            case ASSIGNED:
                donorMessage = "A volunteer has been assigned to pick up your donation.";
                ngoMessage = "A volunteer has been assigned to deliver a donation to your hub.";
                break;
            case PICKED_UP:
                donorMessage = "Your donation has been picked up and is en route!";
                ngoMessage = "A donation is on its way to your hub.";
                emailImportant = true;
                break;
            case EN_ROUTE_TO_NGO:
                donorMessage = "Your donation is nearing its destination!";
                ngoMessage = "A volunteer is near your destination to drop off a donation.";
                break;
            case DELIVERED:
                donorMessage = "Your donation has been successfully delivered! Thank you for your contribution.";
                ngoMessage = "A donation has been successfully delivered and verified at your hub.";
                emailImportant = true;
                break;
            default:
                break;
        }

        UUID donationId = delivery.getDonation().getId();
        
        if (donorMessage != null) {
            notificationService.notifyUser(delivery.getDonation().getDonor(), donorMessage, donationId, emailImportant);
        }
        if (ngoMessage != null) {
            notificationService.notifyUser(delivery.getDonation().getNgo().getUser(), ngoMessage, donationId, emailImportant);
        }
    }

    private DeliveryDto mapToDto(Delivery delivery) {
        return DeliveryDto.builder()
                .id(delivery.getId())
                .donationId(delivery.getDonation().getId())
                .volunteerId(delivery.getVolunteer() != null ? delivery.getVolunteer().getId() : null)
                .status(delivery.getStatus())
                .assignedAt(delivery.getAssignedAt())
                .pickedUpAt(delivery.getPickedUpAt())
                .deliveredAt(delivery.getDeliveredAt())
                .lastLat(delivery.getLastLat())
                .lastLng(delivery.getLastLng())
                .lastLocationAt(delivery.getLastLocationAt())
                .proofImageUrl(delivery.getProofImageUrl() == null
                        ? null
                        : "/api/volunteer/deliveries/" + delivery.getId() + "/proof-image")
                .build();
    }
}
