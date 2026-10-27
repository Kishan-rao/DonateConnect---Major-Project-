package com.donateconnect.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "chat_messages", indexes = {
    @Index(name = "idx_chat_msg_conv", columnList = "conversation_id"),
    @Index(name = "idx_chat_msg_sender", columnList = "sender_id"),
    @Index(name = "idx_chat_msg_recipient", columnList = "recipient_id"),
    @Index(name = "idx_chat_msg_created_at", columnList = "created_at"),
    @Index(name = "idx_chat_msg_client_id", columnList = "client_message_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @Column(length = 2000)
    private String content;

    @Column(name = "attachment_url", length = 500)
    private String attachmentUrl;

    @Column(name = "attachment_content_type", length = 100)
    private String attachmentContentType;

    @Column(name = "attachment_size")
    private Long attachmentSize;

    @Column(name = "attachment_original_filename", length = 255)
    private String attachmentOriginalFilename;

    @Builder.Default
    @Column(name = "is_read", nullable = false)
    private boolean read = false;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @Column(name = "client_message_id", length = 64)
    private String clientMessageId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
