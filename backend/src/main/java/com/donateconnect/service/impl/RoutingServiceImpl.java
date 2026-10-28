package com.donateconnect.service.impl;

import com.donateconnect.dto.RouteEtaDto;
import com.donateconnect.entity.Delivery;
import com.donateconnect.entity.DeliveryStatus;
import com.donateconnect.entity.Donation;
import com.donateconnect.entity.DonationStatus;
import com.donateconnect.exception.ResourceNotFoundException;
import com.donateconnect.repository.DeliveryRepository;
import com.donateconnect.service.RoutingService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class RoutingServiceImpl implements RoutingService {

    private static final long CACHE_TTL_MS = 30_000L; // 30 seconds target TTL
    private static final double MAX_CACHE_DRIFT_METERS = 30.0; // Invalidate cache if driver moved > 30m
    private static final int OSRM_CONNECT_TIMEOUT_MS = 2500;
    private static final int OSRM_READ_TIMEOUT_MS = 3500;

    private final DeliveryRepository deliveryRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    // Thread-safe in-memory cache keyed by deliveryId:destinationType
    private final Map<String, CachedRouteEta> etaCache = new ConcurrentHashMap<>();
    // Synchronization locks to prevent duplicate simultaneous calls
    private final Map<String, Object> keyLocks = new ConcurrentHashMap<>();

    @Autowired
    public RoutingServiceImpl(DeliveryRepository deliveryRepository, ObjectMapper objectMapper) {
        this.deliveryRepository = deliveryRepository;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(OSRM_CONNECT_TIMEOUT_MS);
        requestFactory.setReadTimeout(OSRM_READ_TIMEOUT_MS);
        this.restTemplate = new RestTemplate(requestFactory);
    }

    // Constructor for testing with mocked RestTemplate
    public RoutingServiceImpl(DeliveryRepository deliveryRepository, ObjectMapper objectMapper, RestTemplate restTemplate) {
        this.deliveryRepository = deliveryRepository;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
        this.restTemplate = restTemplate;
    }

    @Override
    public RouteEtaDto calculateDeliveryRouteEta(UUID donationId, UUID requestingUserId, String userRole) {
        Delivery delivery = deliveryRepository.findByDonationId(donationId)
                .orElseThrow(() -> new ResourceNotFoundException("Active delivery not found for donation ID: " + donationId));

        validateAuthorization(delivery, requestingUserId, userRole);

        Donation donation = delivery.getDonation();
        LocalDateTime now = LocalDateTime.now();

        // 1. Check if delivery or donation is terminal / completed
        if (delivery.getStatus() == DeliveryStatus.DELIVERED ||
                donation.getStatus() == DonationStatus.DELIVERED ||
                donation.getStatus() == DonationStatus.REJECTED) {
            return RouteEtaDto.builder()
                    .deliveryId(delivery.getId())
                    .donationId(donation.getId())
                    .deliveryStatus(delivery.getStatus().name())
                    .destinationType(delivery.getStatus() == DeliveryStatus.DELIVERED ? "NGO_HUB" : "UNKNOWN")
                    .originLat(delivery.getLastLat())
                    .originLng(delivery.getLastLng())
                    .driverLastLocationAt(delivery.getLastLocationAt())
                    .staleGps(isGpsStale(delivery.getLastLocationAt(), now))
                    .roadDistanceKm(0.0)
                    .roadDistanceMeters(0.0)
                    .durationMinutes(0)
                    .durationSeconds(0)
                    .calculatedAt(now)
                    .trafficAware(false)
                    .provider("NONE")
                    .routingStatus("DELIVERY_COMPLETED")
                    .statusMessage("Delivery is completed or closed. Active tracking is not available.")
                    .routeCoordinates(Collections.emptyList())
                    .build();
        }

        // 2. Authoritative Destination Selection based on delivery stage
        boolean isPostPickup = (delivery.getStatus() == DeliveryStatus.PICKED_UP ||
                delivery.getStatus() == DeliveryStatus.EN_ROUTE_TO_NGO ||
                donation.getStatus() == DonationStatus.PICKED_UP);

        String destinationType = isPostPickup ? "NGO_HUB" : "PICKUP";
        String destinationAddress = isPostPickup
                ? (donation.getNgo() != null ? donation.getNgo().getAddress() : null)
                : donation.getPickupAddress();
        Double destLat = isPostPickup
                ? (donation.getNgo() != null ? donation.getNgo().getLatitude() : null)
                : donation.getPickupLat();
        Double destLng = isPostPickup
                ? (donation.getNgo() != null ? donation.getNgo().getLongitude() : null)
                : donation.getPickupLng();

        // 3. Driver GPS Check (Origin)
        Double originLat = delivery.getLastLat();
        Double originLng = delivery.getLastLng();
        boolean hasValidOrigin = isValidCoordinate(originLat, originLng);
        boolean staleGps = isGpsStale(delivery.getLastLocationAt(), now);

        if (!hasValidOrigin) {
            return RouteEtaDto.builder()
                    .deliveryId(delivery.getId())
                    .donationId(donation.getId())
                    .deliveryStatus(delivery.getStatus().name())
                    .destinationType(destinationType)
                    .destinationAddress(destinationAddress)
                    .destinationLat(destLat)
                    .destinationLng(destLng)
                    .originLat(originLat)
                    .originLng(originLng)
                    .driverLastLocationAt(delivery.getLastLocationAt())
                    .staleGps(true)
                    .calculatedAt(now)
                    .trafficAware(false)
                    .provider("NONE")
                    .routingStatus("DRIVER_OFFLINE")
                    .statusMessage("Delivery partner location is not available yet. Waiting for live GPS fix.")
                    .routeCoordinates(Collections.emptyList())
                    .build();
        }

        // 4. Destination Coordinates Check
        boolean hasValidDest = isValidCoordinate(destLat, destLng);
        if (!hasValidDest) {
            return RouteEtaDto.builder()
                    .deliveryId(delivery.getId())
                    .donationId(donation.getId())
                    .deliveryStatus(delivery.getStatus().name())
                    .destinationType(destinationType)
                    .destinationAddress(destinationAddress)
                    .destinationLat(destLat)
                    .destinationLng(destLng)
                    .originLat(originLat)
                    .originLng(originLng)
                    .driverLastLocationAt(delivery.getLastLocationAt())
                    .staleGps(staleGps)
                    .calculatedAt(now)
                    .trafficAware(false)
                    .provider("NONE")
                    .routingStatus("MISSING_COORDINATES")
                    .statusMessage("Target coordinates for " + destinationType + " are not configured or invalid.")
                    .routeCoordinates(Collections.emptyList())
                    .build();
        }

        // 5. Caching & Request Deduplication
        String cacheKey = delivery.getId().toString() + ":" + destinationType;
        CachedRouteEta cached = etaCache.get(cacheKey);
        long nowEpochMs = System.currentTimeMillis();

        if (cached != null) {
            boolean isTtlValid = (nowEpochMs - cached.cachedAtEpochMs) < CACHE_TTL_MS;
            boolean isStageMatching = delivery.getStatus().name().equals(cached.deliveryStatus);
            double driftMeters = calculateHaversineDistanceMeters(originLat, originLng, cached.originLat, cached.originLng);
            boolean isPositionClose = driftMeters < MAX_CACHE_DRIFT_METERS;

            if (isTtlValid && isStageMatching && isPositionClose) {
                // Return fresh copy with current driver lastLocationAt and updated staleGps flag
                return copyWithFreshMetadata(cached.dto, originLat, originLng, delivery.getLastLocationAt(), staleGps);
            }
        }

        // Lock per cacheKey to avoid simultaneous duplicate OSRM requests
        Object lock = keyLocks.computeIfAbsent(cacheKey, k -> new Object());
        synchronized (lock) {
            // Double check cache under lock
            cached = etaCache.get(cacheKey);
            if (cached != null) {
                boolean isTtlValid = (System.currentTimeMillis() - cached.cachedAtEpochMs) < CACHE_TTL_MS;
                boolean isStageMatching = delivery.getStatus().name().equals(cached.deliveryStatus);
                double driftMeters = calculateHaversineDistanceMeters(originLat, originLng, cached.originLat, cached.originLng);
                if (isTtlValid && isStageMatching && driftMeters < MAX_CACHE_DRIFT_METERS) {
                    return copyWithFreshMetadata(cached.dto, originLat, originLng, delivery.getLastLocationAt(), staleGps);
                }
            }

            // 6. Execute Routing Request (OSRM)
            RouteEtaDto result = fetchOsrmRoute(
                    delivery.getId(),
                    donation.getId(),
                    delivery.getStatus().name(),
                    destinationType,
                    destinationAddress,
                    originLat,
                    originLng,
                    delivery.getLastLocationAt(),
                    staleGps,
                    destLat,
                    destLng,
                    now
            );

            // Store in cache
            etaCache.put(cacheKey, new CachedRouteEta(
                    result,
                    System.currentTimeMillis(),
                    originLat,
                    originLng,
                    delivery.getStatus().name()
            ));

            return result;
        }
    }

    private RouteEtaDto fetchOsrmRoute(
            UUID deliveryId,
            UUID donationId,
            String deliveryStatus,
            String destinationType,
            String destinationAddress,
            Double originLat,
            Double originLng,
            LocalDateTime driverLastLocationAt,
            boolean staleGps,
            Double destLat,
            Double destLng,
            LocalDateTime now
    ) {
        String url = String.format(
                Locale.US,
                "https://router.project-osrm.org/route/v1/driving/%.6f,%.6f;%.6f,%.6f?overview=full&geometries=geojson",
                originLng, originLat, destLng, destLat
        );

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "DonateConnectApp/1.0 (delivery-tracking@donateconnect.org)");
            headers.set("Accept", MediaType.APPLICATION_JSON_VALUE);
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                String code = root.path("code").asText();

                if ("Ok".equalsIgnoreCase(code) && root.has("routes") && root.get("routes").isArray() && !root.get("routes").isEmpty()) {
                    JsonNode route = root.get("routes").get(0);
                    double distanceMeters = route.path("distance").asDouble();
                    double durationSecondsRaw = route.path("duration").asDouble();

                    double roadDistanceKm = Math.round((distanceMeters / 1000.0) * 10.0) / 10.0;
                    int durationSeconds = (int) Math.round(durationSecondsRaw);
                    int durationMinutes = Math.max(1, (int) Math.round(durationSeconds / 60.0));

                    List<List<Double>> routeCoordinates = new ArrayList<>();
                    JsonNode coordinatesNode = route.path("geometry").path("coordinates");
                    if (coordinatesNode.isArray()) {
                        for (JsonNode point : coordinatesNode) {
                            if (point.isArray() && point.size() >= 2) {
                                double pLng = point.get(0).asDouble();
                                double pLat = point.get(1).asDouble();
                                routeCoordinates.add(List.of(pLat, pLng)); // [lat, lng] for Leaflet
                            }
                        }
                    }

                    return RouteEtaDto.builder()
                            .deliveryId(deliveryId)
                            .donationId(donationId)
                            .deliveryStatus(deliveryStatus)
                            .destinationType(destinationType)
                            .destinationAddress(destinationAddress)
                            .originLat(originLat)
                            .originLng(originLng)
                            .driverLastLocationAt(driverLastLocationAt)
                            .staleGps(staleGps)
                            .destinationLat(destLat)
                            .destinationLng(destLng)
                            .roadDistanceKm(roadDistanceKm)
                            .roadDistanceMeters(distanceMeters)
                            .durationMinutes(durationMinutes)
                            .durationSeconds(durationSeconds)
                            .calculatedAt(now)
                            .trafficAware(false) // OSRM public server does NOT provide live traffic
                            .provider("OSRM")
                            .routingStatus("SUCCESS")
                            .statusMessage("Route calculated via OpenStreetMap road routing.")
                            .routeCoordinates(routeCoordinates)
                            .build();
                }
            }
        } catch (Exception ex) {
            log.warn("[RoutingService] OSRM route request failed for delivery {}: {}", deliveryId, ex.getMessage());
        }

        // Resilient Fallback: Haversine straight-line * 1.3 urban circuity factor
        return calculateFallbackRoute(
                deliveryId,
                donationId,
                deliveryStatus,
                destinationType,
                destinationAddress,
                originLat,
                originLng,
                driverLastLocationAt,
                staleGps,
                destLat,
                destLng,
                now
        );
    }

    private RouteEtaDto calculateFallbackRoute(
            UUID deliveryId,
            UUID donationId,
            String deliveryStatus,
            String destinationType,
            String destinationAddress,
            Double originLat,
            Double originLng,
            LocalDateTime driverLastLocationAt,
            boolean staleGps,
            Double destLat,
            Double destLng,
            LocalDateTime now
    ) {
        double straightDistanceKm = calculateHaversineDistanceKm(originLat, originLng, destLat, destLng);
        // Multiply by 1.3 to account for standard urban road network circuity
        double estimatedRoadDistanceKm = Math.round((straightDistanceKm * 1.3) * 10.0) / 10.0;
        double estimatedRoadDistanceMeters = estimatedRoadDistanceKm * 1000.0;

        List<List<Double>> straightPolyline = List.of(
                List.of(originLat, originLng),
                List.of(destLat, destLng)
        );

        return RouteEtaDto.builder()
                .deliveryId(deliveryId)
                .donationId(donationId)
                .deliveryStatus(deliveryStatus)
                .destinationType(destinationType)
                .destinationAddress(destinationAddress)
                .originLat(originLat)
                .originLng(originLng)
                .driverLastLocationAt(driverLastLocationAt)
                .staleGps(staleGps)
                .destinationLat(destLat)
                .destinationLng(destLng)
                .roadDistanceKm(estimatedRoadDistanceKm)
                .roadDistanceMeters(estimatedRoadDistanceMeters)
                .durationMinutes(null)
                .durationSeconds(null)
                .calculatedAt(now)
                .trafficAware(false)
                .provider("ESTIMATED_FALLBACK")
                .routingStatus("FALLBACK_ESTIMATE")
                .statusMessage("Road routing service is currently unavailable. Displaying approximate straight-line circuity distance; driving ETA is unavailable.")
                .routeCoordinates(straightPolyline)
                .build();
    }

    private RouteEtaDto copyWithFreshMetadata(RouteEtaDto source, Double currentOriginLat, Double currentOriginLng, LocalDateTime driverLastLocationAt, boolean staleGps) {
        return RouteEtaDto.builder()
                .deliveryId(source.getDeliveryId())
                .donationId(source.getDonationId())
                .deliveryStatus(source.getDeliveryStatus())
                .destinationType(source.getDestinationType())
                .destinationAddress(source.getDestinationAddress())
                .originLat(currentOriginLat != null ? currentOriginLat : source.getOriginLat())
                .originLng(currentOriginLng != null ? currentOriginLng : source.getOriginLng())
                .driverLastLocationAt(driverLastLocationAt)
                .staleGps(staleGps)
                .destinationLat(source.getDestinationLat())
                .destinationLng(source.getDestinationLng())
                .roadDistanceKm(source.getRoadDistanceKm())
                .roadDistanceMeters(source.getRoadDistanceMeters())
                .durationMinutes(source.getDurationMinutes())
                .durationSeconds(source.getDurationSeconds())
                .calculatedAt(source.getCalculatedAt())
                .trafficAware(source.isTrafficAware())
                .provider(source.getProvider())
                .routingStatus(source.getRoutingStatus())
                .statusMessage(source.getStatusMessage())
                .routeCoordinates(source.getRouteCoordinates())
                .build();
    }

    private void validateAuthorization(Delivery delivery, UUID requestingUserId, String userRole) {
        if ("ROLE_ADMIN".equals(userRole)) {
            return;
        }

        UUID donorId = delivery.getDonation().getDonor() != null ? delivery.getDonation().getDonor().getId() : null;
        UUID ngoId = delivery.getDonation().getNgo() != null && delivery.getDonation().getNgo().getUser() != null
                ? delivery.getDonation().getNgo().getUser().getId()
                : null;
        UUID volunteerId = delivery.getVolunteer() != null ? delivery.getVolunteer().getId() : null;

        if (!requestingUserId.equals(donorId) && !requestingUserId.equals(ngoId) && !requestingUserId.equals(volunteerId)) {
            throw new AccessDeniedException("You are not authorized to view route ETA for this delivery.");
        }
    }

    private boolean isGpsStale(LocalDateTime lastLocationAt, LocalDateTime now) {
        if (lastLocationAt == null) return true;
        try {
            long diffSec = Duration.between(lastLocationAt, now).getSeconds();
            return diffSec > 60;
        } catch (Exception e) {
            return true;
        }
    }

    private boolean isValidCoordinate(Double lat, Double lon) {
        return lat != null && lon != null
                && !lat.isNaN() && !lat.isInfinite()
                && !lon.isNaN() && !lon.isInfinite()
                && lat >= -90.0 && lat <= 90.0
                && lon >= -180.0 && lon <= 180.0
                && !(Math.abs(lat) < 1e-6 && Math.abs(lon) < 1e-6);
    }

    private double calculateHaversineDistanceMeters(double lat1, double lon1, double lat2, double lon2) {
        return calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) * 1000.0;
    }

    private double calculateHaversineDistanceKm(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Radius of the Earth in km
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Cache entry holder
    static class CachedRouteEta {
        final RouteEtaDto dto;
        final long cachedAtEpochMs;
        final double originLat;
        final double originLng;
        final String deliveryStatus;

        CachedRouteEta(RouteEtaDto dto, long cachedAtEpochMs, double originLat, double originLng, String deliveryStatus) {
            this.dto = dto;
            this.cachedAtEpochMs = cachedAtEpochMs;
            this.originLat = originLat;
            this.originLng = originLng;
            this.deliveryStatus = deliveryStatus;
        }
    }
}

