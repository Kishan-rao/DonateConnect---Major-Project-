package com.donateconnect.service.impl;

import com.donateconnect.dto.*;
import com.donateconnect.entity.*;
import com.donateconnect.exception.ResourceNotFoundException;
import com.donateconnect.repository.DeliveryRepository;
import com.donateconnect.repository.DonationRepository;
import com.donateconnect.repository.NGOProfileRepository;
import com.donateconnect.repository.NgoUrgentNeedRepository;
import com.donateconnect.service.NgoUrgentNeedService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NgoUrgentNeedServiceImpl implements NgoUrgentNeedService {

    private final NgoUrgentNeedRepository urgentNeedRepository;
    private final NGOProfileRepository ngoProfileRepository;
    private final DonationRepository donationRepository;
    private final DeliveryRepository deliveryRepository;

    @Override
    @Transactional(readOnly = true)
    public List<NgoUrgentNeedDto> getActiveUrgentNeeds() {
        return urgentNeedRepository.findByActiveTrueOrderByCreatedAtDesc().stream()
                .filter(u -> u.getStatus() == UrgentNeedStatus.ACTIVE)
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<NgoUrgentNeedDto> getUrgentNeedsByNgoUser(UUID ngoUserId) {
        NGOProfile ngo = ngoProfileRepository.findByUserId(ngoUserId)
                .orElseThrow(() -> new ResourceNotFoundException("NGO profile not found for user: " + ngoUserId));

        return urgentNeedRepository.findByNgoIdOrderByCreatedAtDesc(ngo.getId()).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public NgoUrgentNeedDto createUrgentNeed(UUID ngoUserId, CreateUrgentNeedRequest request) {
        NGOProfile ngo = ngoProfileRepository.findByUserId(ngoUserId)
                .orElseThrow(() -> new ResourceNotFoundException("NGO profile not found for user: " + ngoUserId));

        if (!ngo.isVerified()) {
            throw new IllegalArgumentException("Unverified NGOs cannot post urgent needs");
        }

        int requestedQty = (request.getQuantity() != null && request.getQuantity() > 0)
                ? request.getQuantity()
                : 1;

        NgoUrgentNeed urgentNeed = NgoUrgentNeed.builder()
                .ngo(ngo)
                .title(request.getTitle())
                .description(request.getDescription())
                .category(request.getCategory())
                .quantity(requestedQty)
                .fulfilledQuantity(0)
                .status(UrgentNeedStatus.ACTIVE)
                .active(true)
                .build();

        NgoUrgentNeed saved = urgentNeedRepository.save(urgentNeed);
        return mapToDto(saved);
    }

    @Override
    @Transactional
    public NgoUrgentNeedDto toggleUrgentNeed(UUID ngoUserId, UUID urgentNeedId) {
        NGOProfile ngo = ngoProfileRepository.findByUserId(ngoUserId)
                .orElseThrow(() -> new ResourceNotFoundException("NGO profile not found for user: " + ngoUserId));

        NgoUrgentNeed urgentNeed = urgentNeedRepository.findById(urgentNeedId)
                .orElseThrow(() -> new ResourceNotFoundException("Urgent need not found with id: " + urgentNeedId));

        if (!urgentNeed.getNgo().getId().equals(ngo.getId())) {
            throw new AccessDeniedException("Forbidden: You do not own this urgent need campaign");
        }

        boolean newActive = !urgentNeed.isActive();
        urgentNeed.setActive(newActive);
        if (!newActive) {
            urgentNeed.setStatus(UrgentNeedStatus.COMPLETED);
            if (urgentNeed.getCompletedAt() == null) {
                urgentNeed.setCompletedAt(LocalDateTime.now());
            }
        } else {
            urgentNeed.setStatus(UrgentNeedStatus.ACTIVE);
            urgentNeed.setCompletedAt(null);
        }

        NgoUrgentNeed saved = urgentNeedRepository.save(urgentNeed);
        return mapToDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AdminUrgentNeedTrackingDto> getAllUrgentNeedsForAdmin() {
        List<NgoUrgentNeed> allNeeds = urgentNeedRepository.findAllByOrderByCreatedAtDesc();
        List<AdminUrgentNeedTrackingDto> result = new ArrayList<>(allNeeds.size());

        for (NgoUrgentNeed need : allNeeds) {
            List<Donation> associatedDonations = donationRepository.findByUrgentNeedIdOrderByCreatedAtDesc(need.getId());
            List<UrgentNeedDonationTrackingDto> donationDtos = new ArrayList<>(associatedDonations.size());

            for (Donation donation : associatedDonations) {
                Delivery delivery = deliveryRepository.findByDonationId(donation.getId()).orElse(null);

                UrgentNeedDonationTrackingDto donationDto = UrgentNeedDonationTrackingDto.builder()
                        .donationId(donation.getId())
                        .donorId(donation.getDonor() != null ? donation.getDonor().getId() : null)
                        .donorName(donation.getDonor() != null ? donation.getDonor().getFullName() : "Anonymous Donor")
                        .donorEmail(donation.getDonor() != null ? donation.getDonor().getEmail() : "")
                        .quantity(donation.getQuantity() != null ? donation.getQuantity() : 1)
                        .donationStatus(donation.getStatus())
                        .deliveryStatus(delivery != null ? delivery.getStatus() : null)
                        .pickupAddress(donation.getPickupAddress())
                        .pickupDate(donation.getPickupDate())
                        .pickupTimeSlot(donation.getPickupTimeSlot())
                        .assignedAt(delivery != null ? delivery.getAssignedAt() : null)
                        .pickedUpAt(delivery != null ? delivery.getPickedUpAt() : null)
                        .deliveredAt(delivery != null ? delivery.getDeliveredAt() : null)
                        .createdAt(donation.getCreatedAt())
                        .build();

                donationDtos.add(donationDto);
            }

            int reqQty = need.getQuantity() != null ? need.getQuantity() : 0;
            int fulQty = need.getFulfilledQuantity() != null ? need.getFulfilledQuantity() : 0;
            int remQty = Math.max(0, reqQty - fulQty);

            AdminUrgentNeedTrackingDto adminDto = AdminUrgentNeedTrackingDto.builder()
                    .id(need.getId())
                    .ngoId(need.getNgo() != null ? need.getNgo().getId() : null)
                    .ngoName(need.getNgo() != null ? need.getNgo().getName() : "Unknown NGO")
                    .ngoCity(need.getNgo() != null ? need.getNgo().getCity() : "")
                    .ngoVerified(need.getNgo() != null && need.getNgo().isVerified())
                    .title(need.getTitle())
                    .description(need.getDescription())
                    .category(need.getCategory())
                    .requestedQuantity(reqQty)
                    .fulfilledQuantity(fulQty)
                    .remainingQuantity(remQty)
                    .status(need.getStatus())
                    .active(need.isActive())
                    .createdAt(need.getCreatedAt())
                    .completedAt(need.getCompletedAt())
                    .associatedDonations(donationDtos)
                    .build();

            result.add(adminDto);
        }

        return result;
    }

    @Override
    @Transactional
    public void updateFulfilmentProgress(UUID urgentNeedId) {
        if (urgentNeedId == null) return;

        NgoUrgentNeed urgentNeed = urgentNeedRepository.findByIdWithLock(urgentNeedId)
                .orElse(null);
        if (urgentNeed == null) return;

        int totalDelivered = donationRepository.sumQuantityByUrgentNeedIdAndStatus(urgentNeedId, DonationStatus.DELIVERED);
        urgentNeed.setFulfilledQuantity(totalDelivered);

        int requestedQty = urgentNeed.getQuantity() != null ? urgentNeed.getQuantity() : 0;
        if (requestedQty > 0 && totalDelivered >= requestedQty) {
            urgentNeed.setStatus(UrgentNeedStatus.COMPLETED);
            urgentNeed.setActive(false);
            if (urgentNeed.getCompletedAt() == null) {
                urgentNeed.setCompletedAt(LocalDateTime.now());
            }
        }

        urgentNeedRepository.save(urgentNeed);
    }

    private NgoUrgentNeedDto mapToDto(NgoUrgentNeed u) {
        NGOProfile ngo = u.getNgo();
        User ngoUser = ngo != null ? ngo.getUser() : null;
        UserResponseDto ngoUserDto = ngoUser != null ? UserResponseDto.builder()
                .id(ngoUser.getId())
                .email(ngoUser.getEmail())
                .fullName(ngoUser.getFullName())
                .role(ngoUser.getRole())
                .createdAt(ngoUser.getCreatedAt())
                .build() : null;

        NGOProfileDto ngoDto = ngo != null ? NGOProfileDto.builder()
                .id(ngo.getId())
                .user(ngoUserDto)
                .name(ngo.getName())
                .description(ngo.getDescription())
                .address(ngo.getAddress())
                .city(ngo.getCity())
                .phone(ngo.getPhone())
                .verified(ngo.isVerified())
                .createdAt(ngo.getCreatedAt())
                .build() : null;

        int reqQty = u.getQuantity() != null ? u.getQuantity() : 0;
        int fulQty = u.getFulfilledQuantity() != null ? u.getFulfilledQuantity() : 0;
        int remQty = Math.max(0, reqQty - fulQty);

        return NgoUrgentNeedDto.builder()
                .id(u.getId())
                .ngo(ngoDto)
                .title(u.getTitle())
                .description(u.getDescription())
                .category(u.getCategory())
                .quantity(reqQty)
                .fulfilledQuantity(fulQty)
                .remainingQuantity(remQty)
                .status(u.getStatus())
                .active(u.isActive())
                .createdAt(u.getCreatedAt())
                .completedAt(u.getCompletedAt())
                .build();
    }
}
