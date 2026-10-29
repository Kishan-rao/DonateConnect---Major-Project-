package com.donateconnect.controller;

import com.donateconnect.dto.AdminStatsDto;
import com.donateconnect.dto.ApiResponse;
import com.donateconnect.entity.Donation;
import com.donateconnect.entity.DonationStatus;
import com.donateconnect.entity.Delivery;
import com.donateconnect.entity.DeliveryStatus;
import com.donateconnect.repository.DonationRepository;
import com.donateconnect.repository.DeliveryRepository;
import com.donateconnect.repository.NGOProfileRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/stats")
@PreAuthorize("hasRole('ADMIN')")
public class AdminStatsController {

    private final DonationRepository donationRepository;
    private final DeliveryRepository deliveryRepository;
    private final NGOProfileRepository ngoProfileRepository;

    public AdminStatsController(
            DonationRepository donationRepository,
            DeliveryRepository deliveryRepository,
            NGOProfileRepository ngoProfileRepository
    ) {
        this.donationRepository = donationRepository;
        this.deliveryRepository = deliveryRepository;
        this.ngoProfileRepository = ngoProfileRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<AdminStatsDto>> getAdminStats() {
        List<Donation> allDonations = donationRepository.findAll();
        List<Delivery> allDeliveries = deliveryRepository.findAll();

        long totalDonations = allDonations.size();
        long verifiedNgos = ngoProfileRepository.countByVerifiedTrue();
        long pendingRequests = allDonations.stream().filter(d -> d.getStatus() == DonationStatus.REQUESTED).count();
        long completedDeliveries = allDonations.stream().filter(d -> d.getStatus() == DonationStatus.DELIVERED).count();

        // 1. Donations Over Time (sorted chronologically)
        Map<String, Long> donationsByDate = allDonations.stream()
                .filter(d -> d.getCreatedAt() != null)
                .collect(Collectors.groupingBy(
                        d -> d.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE),
                        Collectors.counting()
                ));
        donationsByDate = donationsByDate.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue,
                        (e1, e2) -> e1, LinkedHashMap::new));

        // 2. Donations by Category
        Map<String, Long> donationsByCategory = allDonations.stream()
                .filter(d -> d.getCategory() != null)
                .collect(Collectors.groupingBy(d -> d.getCategory().name(), Collectors.counting()));

        // 3. Donations by City
        // Business Rule: Counts all submitted donation records across the platform, resolving the
        // city primarily from the donor's pickup address and falling back to the partner NGO's city/address.
        // Known city aliases (e.g. Bangalore -> Bengaluru) are normalized safely without merging different cities.
        Map<String, Long> donationsByCity = allDonations.stream()
                .collect(Collectors.groupingBy(this::resolveCity, Collectors.counting()));
        // Sort by donation count descending so highest-activity cities appear first
        donationsByCity = donationsByCity.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue,
                        (e1, e2) -> e1, LinkedHashMap::new));

        // 4. Delivery Success Rate
        // Business Rule: Ratio of completed deliveries (status DELIVERED or deliveredAt set)
        // to all assigned deliveries, expressed as a percentage rounded to 1 decimal place.
        long totalAssigned = allDeliveries.size();
        long successfulDeliveries = allDeliveries.stream()
                .filter(d -> d.getStatus() == DeliveryStatus.DELIVERED || d.getDeliveredAt() != null)
                .count();
        double deliverySuccessRate = totalAssigned > 0
                ? Math.round(((double) successfulDeliveries / totalAssigned) * 1000.0) / 10.0
                : 0.0;

        // 5. Average Delivery Time (Picked Up to Delivered in Hours)
        // Business Rule: Average duration from pickup to delivery across all completed deliveries.
        // Durations with missing timestamps or negative values (clock skew) are strictly excluded.
        List<Delivery> validDeliveries = allDeliveries.stream()
                .filter(d -> d.getPickedUpAt() != null && d.getDeliveredAt() != null
                        && !d.getDeliveredAt().isBefore(d.getPickedUpAt()))
                .toList();

        double averageDeliveryTimeHours = 0.0;
        if (!validDeliveries.isEmpty()) {
            double totalSeconds = validDeliveries.stream()
                    .mapToDouble(d -> Duration.between(d.getPickedUpAt(), d.getDeliveredAt()).toSeconds())
                    .filter(sec -> sec >= 0)
                    .sum();
            double avgHours = (totalSeconds / validDeliveries.size()) / 3600.0;
            averageDeliveryTimeHours = Math.round(avgHours * 100.0) / 100.0;
        }

        // 6. Top Donors (null-safe)
        Map<String, Long> donorCounts = allDonations.stream()
                .filter(d -> d.getDonor() != null && d.getDonor().getFullName() != null && !d.getDonor().getFullName().isBlank())
                .collect(Collectors.groupingBy(d -> d.getDonor().getFullName().trim(), Collectors.counting()));
        List<Map<String, Object>> topDonors = donorCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("name", e.getKey());
                    map.put("donations", e.getValue());
                    return map;
                }).collect(Collectors.toList());

        // 7. Top NGOs (null-safe)
        Map<String, Long> ngoCounts = allDonations.stream()
                .filter(d -> d.getNgo() != null && d.getNgo().getName() != null && !d.getNgo().getName().isBlank())
                .collect(Collectors.groupingBy(d -> d.getNgo().getName().trim(), Collectors.counting()));
        List<Map<String, Object>> topNgos = ngoCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("name", e.getKey());
                    map.put("donations", e.getValue());
                    return map;
                }).collect(Collectors.toList());

        AdminStatsDto stats = AdminStatsDto.builder()
                .totalDonations(totalDonations)
                .verifiedNgos(verifiedNgos)
                .pendingRequests(pendingRequests)
                .completedDeliveries(completedDeliveries)
                .donationsByDate(donationsByDate)
                .donationsByCategory(donationsByCategory)
                .donationsByCity(donationsByCity)
                .deliverySuccessRate(deliverySuccessRate)
                .averageDeliveryTimeHours(averageDeliveryTimeHours)
                .topDonors(topDonors)
                .topNgos(topNgos)
                .build();

        return ResponseEntity.ok(ApiResponse.success("Fetched admin statistics successfully", stats));
    }

    /**
     * Resolves and normalizes the donation city from pickup address, NGO city, or NGO address.
     * Normalizes historical aliases (e.g. Bangalore -> Bengaluru, Bombay -> Mumbai) safely.
     */
    public String resolveCity(Donation donation) {
        if (donation == null) {
            return "Unspecified";
        }

        // 1. Try pickup address first (primary origin of donation)
        if (donation.getPickupAddress() != null && !donation.getPickupAddress().isBlank()) {
            String extracted = extractCityFromAddress(donation.getPickupAddress());
            if (extracted != null) {
                return extracted;
            }
        }

        // 2. Try NGO profile explicit city field
        if (donation.getNgo() != null) {
            if (donation.getNgo().getCity() != null && !donation.getNgo().getCity().isBlank()) {
                return normalizeCity(donation.getNgo().getCity().trim());
            }

            // 3. Try NGO address
            if (donation.getNgo().getAddress() != null && !donation.getNgo().getAddress().isBlank()) {
                String extracted = extractCityFromAddress(donation.getNgo().getAddress());
                if (extracted != null) {
                    return extracted;
                }
            }
        }

        return "Unspecified";
    }

    /**
     * Scans address text for known Indian cities, postal tokens, or comma-separated city segments.
     */
    private String extractCityFromAddress(String rawAddress) {
        if (rawAddress == null || rawAddress.isBlank()) {
            return null;
        }

        String lower = rawAddress.toLowerCase(Locale.ROOT);

        // Pattern matching for major Indian metropolitan areas and regions
        if (lower.contains("bengaluru") || lower.contains("bangalore")) return "Bengaluru";
        if (lower.contains("new delhi")) return "New Delhi";
        if (lower.contains("delhi")) return "Delhi";
        if (lower.contains("mumbai") || lower.contains("bombay")) return "Mumbai";
        if (lower.contains("pune")) return "Pune";
        if (lower.contains("hyderabad") || lower.contains("secunderabad")) return "Hyderabad";
        if (lower.contains("chennai") || lower.contains("madras")) return "Chennai";
        if (lower.contains("kolkata") || lower.contains("calcutta")) return "Kolkata";
        if (lower.contains("ahmedabad")) return "Ahmedabad";
        if (lower.contains("jaipur")) return "Jaipur";
        if (lower.contains("mysuru") || lower.contains("mysore")) return "Mysuru";
        if (lower.contains("noida")) return "Noida";
        if (lower.contains("gurugram") || lower.contains("gurgaon")) return "Gurugram";
        if (lower.contains("chandigarh")) return "Chandigarh";
        if (lower.contains("kochi") || lower.contains("cochin")) return "Kochi";

        // Fallback: heuristic extraction from comma-separated address
        // Example: "123 Street, Indiranagar, Bengaluru, Karnataka - 560038"
        String[] parts = rawAddress.split(",");
        if (parts.length >= 2) {
            // Check second-to-last or middle part
            for (int i = parts.length - 1; i >= 0; i--) {
                String part = parts[i].replaceAll("[-–]\\s*\\d{6}", "").trim();
                part = part.replaceAll("\\b\\d{6}\\b", "").trim();
                if (!part.isBlank() && part.length() >= 3 && part.length() <= 30
                        && !part.equalsIgnoreCase("india")
                        && !part.equalsIgnoreCase("karnataka")
                        && !part.equalsIgnoreCase("maharashtra")) {
                    return normalizeCity(part);
                }
            }
        }

        return null;
    }

    /**
     * Normalizes known aliases and applies clean title-casing.
     */
    private String normalizeCity(String city) {
        if (city == null || city.isBlank()) return "Unspecified";

        String trimmed = city.trim();
        String lower = trimmed.toLowerCase(Locale.ROOT);

        if (lower.equals("bangalore") || lower.equals("bengaluru")) return "Bengaluru";
        if (lower.equals("new delhi")) return "New Delhi";
        if (lower.equals("delhi")) return "Delhi";
        if (lower.equals("bombay") || lower.equals("mumbai")) return "Mumbai";
        if (lower.equals("madras") || lower.equals("chennai")) return "Chennai";
        if (lower.equals("calcutta") || lower.equals("kolkata")) return "Kolkata";
        if (lower.equals("mysore") || lower.equals("mysuru")) return "Mysuru";
        if (lower.equals("gurgaon") || lower.equals("gurugram")) return "Gurugram";

        // Title-case single/multi-word city names
        String[] words = trimmed.split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String w : words) {
            if (w.isEmpty()) continue;
            if (sb.length() > 0) sb.append(" ");
            sb.append(Character.toUpperCase(w.charAt(0)));
            if (w.length() > 1) {
                sb.append(w.substring(1).toLowerCase(Locale.ROOT));
            }
        }
        return sb.toString();
    }
}

