package com.donateconnect.service;

import com.donateconnect.dto.NotificationDto;
import com.donateconnect.entity.Notification;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class NotificationServiceTest {

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Test
    @DisplayName("Notification onCreate initializes createdAt when null")
    void testNotificationPrePersist() {
        Notification notification = Notification.builder()
                .message("Test message")
                .read(false)
                .build();

        assertNull(notification.getCreatedAt());

        notification.onCreate();

        assertNotNull(notification.getCreatedAt());
        assertTrue(notification.getCreatedAt().isBefore(LocalDateTime.now().plusSeconds(1)));
    }

    @Test
    @DisplayName("Notification keeps existing createdAt if already set")
    void testNotificationPrePersistPreservesExisting() {
        LocalDateTime existing = LocalDateTime.of(2026, 10, 27, 10, 0, 0);
        Notification notification = Notification.builder()
                .message("Test message")
                .read(false)
                .createdAt(existing)
                .build();

        notification.onCreate();

        assertEquals(existing, notification.getCreatedAt());
    }

    @Test
    @DisplayName("NotificationDto serializes createdAt consistently to ISO-8601 string")
    void testNotificationDtoSerialization() throws Exception {
        LocalDateTime testTimestamp = LocalDateTime.of(2026, 10, 27, 12, 30, 45);

        NotificationDto dto = NotificationDto.builder()
                .id(UUID.randomUUID())
                .message("Delivery assigned")
                .read(false)
                .createdAt(testTimestamp)
                .build();

        String json = objectMapper.writeValueAsString(dto);

        assertTrue(json.contains("\"createdAt\":\"2026-10-27T12:30:45\"") || json.contains("2026-10-27T12:30:45"));
    }
}

