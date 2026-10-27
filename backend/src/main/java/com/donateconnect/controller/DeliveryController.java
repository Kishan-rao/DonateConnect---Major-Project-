package com.donateconnect.controller;

import com.donateconnect.dto.ApiResponse;
import com.donateconnect.dto.DeliveryDto;
import com.donateconnect.dto.UpdateDeliveryStatusDto;
import com.donateconnect.entity.User;
import com.donateconnect.exception.ResourceNotFoundException;
import com.donateconnect.repository.UserRepository;
import com.donateconnect.service.DeliveryService;
import com.donateconnect.service.DeliveryProofImage;
import com.donateconnect.service.AuditLogService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/volunteer")
public class DeliveryController {

    private final DeliveryService deliveryService;
    private final UserRepository userRepository;
    private final com.donateconnect.repository.DeliveryRepository deliveryRepository;
    private final AuditLogService auditLogService;

    public DeliveryController(
            DeliveryService deliveryService,
            UserRepository userRepository,
            com.donateconnect.repository.DeliveryRepository deliveryRepository,
            AuditLogService auditLogService
    ) {
        this.deliveryService = deliveryService;
        this.userRepository = userRepository;
        this.deliveryRepository = deliveryRepository;
        this.auditLogService = auditLogService;
    }

    @GetMapping("/deliveries/donation/{donationId}")
    @PreAuthorize("hasAnyRole('DONOR', 'VOLUNTEER', 'NGO', 'ADMIN')")
    public ResponseEntity<ApiResponse<DeliveryDto>> getDeliveryByDonationId(
            Authentication authentication,
            @PathVariable UUID donationId
    ) {
        com.donateconnect.entity.Delivery delivery = deliveryRepository.findByDonationId(donationId)
                .orElseThrow(() -> new ResourceNotFoundException("Delivery not found for this donation"));

        UUID userId = getUserIdFromAuth(authentication);
        String role = authentication.getAuthorities().iterator().next().getAuthority();
        if (!role.equals("ROLE_ADMIN")) {
            UUID donorId = delivery.getDonation().getDonor() != null ? delivery.getDonation().getDonor().getId() : null;
            UUID ngoId = delivery.getDonation().getNgo() != null && delivery.getDonation().getNgo().getUser() != null ? delivery.getDonation().getNgo().getUser().getId() : null;
            UUID volunteerId = delivery.getVolunteer() != null ? delivery.getVolunteer().getId() : null;
            if (!userId.equals(donorId) && !userId.equals(ngoId) && !userId.equals(volunteerId)) {
                return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
            }
        }

        DeliveryDto dto = DeliveryDto.builder()
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
        return ResponseEntity.ok(ApiResponse.success("Delivery details fetched", dto));
    }

    @GetMapping("/deliveries/{id}/proof-image")
    @PreAuthorize("hasAnyRole('DONOR', 'NGO')")
    public ResponseEntity<byte[]> getDeliveryProofImage(
            Authentication authentication,
            @PathVariable UUID id
    ) {
        UUID requesterId = getUserIdFromAuth(authentication);
        DeliveryProofImage proofImage = deliveryService.getDeliveryProofImage(requesterId, id);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .contentType(MediaType.parseMediaType(proofImage.contentType()))
                .body(proofImage.data());
    }

    @PatchMapping("/deliveries/{id}/status")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public ResponseEntity<ApiResponse<DeliveryDto>> updateDeliveryStatus(
            Authentication authentication,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateDeliveryStatusDto dto
    ) {
        UUID volunteerId = getUserIdFromAuth(authentication);
        DeliveryDto updated = deliveryService.updateDeliveryStatus(volunteerId, id, dto.getStatus());
        auditLogService.logAction("UPDATE_DELIVERY_STATUS", "DELIVERY", id.toString(), "Updated delivery status to " + dto.getStatus());
        return ResponseEntity.ok(ApiResponse.success("Delivery status updated", updated));
    }

    @PostMapping(value = "/deliveries/{id}/complete", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('VOLUNTEER')")
    public ResponseEntity<ApiResponse<DeliveryDto>> completeDelivery(
            Authentication authentication,
            @PathVariable UUID id,
            @RequestParam("otp") String otp,
            @RequestParam(value = "proofImage", required = false) org.springframework.web.multipart.MultipartFile proofImage
    ) {
        UUID volunteerId = getUserIdFromAuth(authentication);
        DeliveryDto updated = deliveryService.completeDelivery(volunteerId, id, otp, proofImage);
        auditLogService.logAction("COMPLETE_DELIVERY", "DELIVERY", id.toString(), "Completed delivery successfully");
        return ResponseEntity.ok(ApiResponse.success("Delivery completed successfully", updated));
    }

    @GetMapping("/deliveries/donation/{donationId}/otp")
    @PreAuthorize("hasRole('NGO')")
    public ResponseEntity<ApiResponse<String>> getDeliveryOtp(
            Authentication authentication,
            @PathVariable UUID donationId
    ) {
        UUID ngoUserId = getUserIdFromAuth(authentication);
        com.donateconnect.entity.Delivery delivery = deliveryRepository.findByDonationId(donationId)
                .orElseThrow(() -> new ResourceNotFoundException("Delivery not found"));

        if (!delivery.getDonation().getNgo().getUser().getId().equals(ngoUserId)) {
            throw new org.springframework.security.access.AccessDeniedException("You can only view OTP for your own deliveries");
        }

        if (delivery.getDeliveryOtp() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("OTP not generated yet. Delivery must be picked up first."));
        }

        return ResponseEntity.ok(ApiResponse.success("OTP fetched successfully", delivery.getDeliveryOtp()));
    }

    @PostMapping("/deliveries/donation/{donationId}/otp/regenerate")
    @PreAuthorize("hasRole('NGO')")
    public ResponseEntity<ApiResponse<String>> regenerateDeliveryOtp(
            Authentication authentication,
            @PathVariable UUID donationId
    ) {
        UUID ngoUserId = getUserIdFromAuth(authentication);
        com.donateconnect.entity.Delivery delivery = deliveryRepository.findByDonationId(donationId)
                .orElseThrow(() -> new ResourceNotFoundException("Delivery not found"));

        if (!delivery.getDonation().getNgo().getUser().getId().equals(ngoUserId)) {
            throw new org.springframework.security.access.AccessDeniedException("You can only regenerate OTP for your own deliveries");
        }

        if (delivery.getStatus() != com.donateconnect.entity.DeliveryStatus.PICKED_UP) {
            return ResponseEntity.badRequest().body(ApiResponse.error("OTP can only be regenerated for deliveries in PICKED_UP status."));
        }

        delivery.setDeliveryOtp(String.format("%06d", new java.security.SecureRandom().nextInt(1000000)));
        delivery.setDeliveryOtpExpiry(java.time.LocalDateTime.now().plusHours(24));
        delivery.setDeliveryOtpAttempts(0);
        deliveryRepository.save(delivery);

        auditLogService.logAction("REGENERATE_OTP", "DELIVERY", delivery.getId().toString(), "OTP regenerated for delivery");
        return ResponseEntity.ok(ApiResponse.success("OTP regenerated successfully", delivery.getDeliveryOtp()));
    }

    private UUID getUserIdFromAuth(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user profile not found"));
        return user.getId();
    }
}
