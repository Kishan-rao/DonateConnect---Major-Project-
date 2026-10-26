package com.donateconnect.service;

import com.donateconnect.dto.RouteEtaDto;

import java.util.UUID;

public interface RoutingService {
    /**
     * Calculates the authoritative road distance and duration (ETA) for an active delivery.
     *
     * @param donationId        The ID of the donation associated with the delivery.
     * @param requestingUserId  The authenticated user requesting the ETA.
     * @param userRole          The role of the requesting user (e.g. ROLE_DONOR, ROLE_NGO, ROLE_ADMIN, ROLE_VOLUNTEER).
     * @return Authoritative RouteEtaDto containing road distance, duration, destination stage, and polyline coordinates.
     */
    RouteEtaDto calculateDeliveryRouteEta(UUID donationId, UUID requestingUserId, String userRole);
}

