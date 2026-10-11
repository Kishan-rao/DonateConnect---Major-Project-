package com.donateconnect.controller;

import com.donateconnect.dto.HealthResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@RestController
public class HealthController {

    @GetMapping("/api/health")
    public HealthResponse health() {
        return HealthResponse.builder()
                .status("UP")
                .service("donateconnect-backend")
                .timestamp(LocalDateTime.now())
                .build();
    }
}

