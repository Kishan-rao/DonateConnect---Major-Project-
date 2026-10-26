package com.donateconnect.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RouteEtaDto {
    private UUID deliveryId;
    private UUID donationId;

    // Delivery & Routing Stage
    private String deliveryStatus;
    private String destinationType; // "PICKUP" or "NGO_HUB"
    private String destinationAddress;

    // Origin (Driver GPS)
    private Double originLat;
    private Double originLng;
    private LocalDateTime driverLastLocationAt;
    private boolean staleGps; // true if > 60 seconds old or null

    // Destination Coordinates
    private Double destinationLat;
    private Double destinationLng;

    // Calculated Road Metrics
    private Double roadDistanceKm;
    private Double roadDistanceMeters;
    private Integer durationMinutes;
    private Integer durationSeconds;

    // Metadata & Provider Status
    private LocalDateTime calculatedAt;
    private boolean trafficAware; // false for OSRM
    private String provider; // "OSRM", "ESTIMATED_FALLBACK", "UNAVAILABLE"
    private String routingStatus; // "SUCCESS", "FALLBACK_ESTIMATE", "DRIVER_OFFLINE", "MISSING_COORDINATES", "DELIVERY_COMPLETED"
    private String statusMessage;

    // Road polyline coordinates for map display [[lat, lng], ...]
    private List<List<Double>> routeCoordinates;
}

