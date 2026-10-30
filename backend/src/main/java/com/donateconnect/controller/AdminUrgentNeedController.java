package com.donateconnect.controller;

import com.donateconnect.dto.AdminUrgentNeedTrackingDto;
import com.donateconnect.dto.ApiResponse;
import com.donateconnect.service.NgoUrgentNeedService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/urgent-needs")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUrgentNeedController {

    private final NgoUrgentNeedService urgentNeedService;

    public AdminUrgentNeedController(NgoUrgentNeedService urgentNeedService) {
        this.urgentNeedService = urgentNeedService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AdminUrgentNeedTrackingDto>>> getAllUrgentNeedsForAdmin() {
        List<AdminUrgentNeedTrackingDto> needs = urgentNeedService.getAllUrgentNeedsForAdmin();
        return ResponseEntity.ok(ApiResponse.success("Fetched all urgent requirements and associated tracking details for admin", needs));
    }
}
