package com.donateconnect.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationDto {
    private UUID id;
    private UUID otherParticipantId;
    private String otherParticipantName;
    private String otherParticipantRole;
    private String otherParticipantEmail;
    private Boolean ngoVerified;
    private String ngoAddress;
    private String ngoCity;
    private UUID donationId;
    private String donationCategory;
    private String donationDescription;
    private String lastMessageText;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private LocalDateTime lastMessageAt;

    private UUID lastMessageSenderId;
    private long unreadCount;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private LocalDateTime createdAt;
}
