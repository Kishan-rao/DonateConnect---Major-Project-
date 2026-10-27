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
public class ChatMessageDto {
    private UUID id;
    private UUID conversationId;
    private UUID senderId;
    private String senderName;
    private String senderRole;
    private UUID recipientId;
    private String content;
    private String attachmentUrl;
    private String attachmentContentType;
    private Long attachmentSize;
    private String attachmentOriginalFilename;
    private boolean read;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private LocalDateTime readAt;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private LocalDateTime createdAt;

    private String clientMessageId;
}
