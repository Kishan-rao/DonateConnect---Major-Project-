package com.donateconnect.dto;

import com.donateconnect.entity.Category;
import com.donateconnect.entity.UrgentNeedStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUrgentNeedTrackingDto {
    private UUID id;
    private UUID ngoId;
    private String ngoName;
    private String ngoCity;
    private boolean ngoVerified;
    private String title;
    private String description;
    private Category category;
    private Integer requestedQuantity;
    private Integer fulfilledQuantity;
    private Integer remainingQuantity;
    private UrgentNeedStatus status;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;

    @Builder.Default
    private List<UrgentNeedDonationTrackingDto> associatedDonations = new ArrayList<>();
}
