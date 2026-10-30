package com.donateconnect.controller;

import com.donateconnect.dto.ApiResponse;
import com.donateconnect.service.NgoUrgentNeedService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/urgent-needs")
@PreAuthorize("hasAnyRole('DONOR', 'ADMIN')")
public class PublicUrgentNeedController {

    private final NgoUrgentNeedService urgentNeedService;

    public PublicUrgentNeedController(NgoUrgentNeedService urgentNeedService) {
        this.urgentNeedService = urgentNeedService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<com.donateconnect.dto.NgoUrgentNeedPublicDto>>> getActiveUrgentNeeds() {
        List<com.donateconnect.dto.NgoUrgentNeedPublicDto> needs = urgentNeedService.getActiveUrgentNeeds().stream()
            .map(dto -> com.donateconnect.dto.NgoUrgentNeedPublicDto.builder()
                .id(dto.getId())
                .title(dto.getTitle())
                .description(dto.getDescription())
                .category(dto.getCategory())
                .quantity(dto.getQuantity())
                .fulfilledQuantity(dto.getFulfilledQuantity())
                .remainingQuantity(dto.getRemainingQuantity())
                .status(dto.getStatus())
                .active(dto.isActive())
                .createdAt(dto.getCreatedAt())
                .completedAt(dto.getCompletedAt())
                .ngoId(dto.getNgo() != null ? dto.getNgo().getId() : null)
                .ngoName(dto.getNgo() != null ? dto.getNgo().getName() : "Verified NGO")
                .ngoCity(dto.getNgo() != null ? dto.getNgo().getCity() : "")
                .ngoVerified(dto.getNgo() != null && dto.getNgo().isVerified())
                .build())
            .toList();
        return ResponseEntity.ok(ApiResponse.success("Fetched active urgent donation campaigns", needs));
    }
}
