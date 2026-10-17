package com.donateconnect.entity;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Locale;

public enum Role {
    DONOR,
    NGO,
    ADMIN,
    VOLUNTEER,
    CORPORATE;

    @JsonCreator
    public static Role fromString(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        if (normalized.startsWith("ROLE_")) {
            normalized = normalized.substring(5);
        }
        normalized = normalized.replace('-', '_').replace(' ', '_');
        if ("DELIVERY_PARTNER".equals(normalized)
                || "DELIVERY".equals(normalized)
                || "DRIVER".equals(normalized)
                || "COURIER".equals(normalized)) {
            return VOLUNTEER;
        }
        if ("CORPORATE_PARTNER".equals(normalized)) {
            return CORPORATE;
        }
        try {
            return Role.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
