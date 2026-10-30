package com.donateconnect.dto;

import com.donateconnect.entity.DeliveryStatus;
import com.donateconnect.entity.DonationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UrgentNeedDonationTrackingDto {
    private UUID donationId;
    private UUID donorId;
    private String donorName;
    private String donorEmail;
    private Integer quantity;
    private DonationStatus donationStatus;
    private DeliveryStatus deliveryStatus;
    private String pickupAddress;
    private LocalDate pickupDate;
    private String pickupTimeSlot;
    private LocalDateTime assignedAt;
    private LocalDateTime pickedUpAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime createdAt;
}
