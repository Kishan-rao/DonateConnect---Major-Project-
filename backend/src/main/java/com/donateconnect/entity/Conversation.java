package com.donateconnect.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "conversations", indexes = {
    @Index(name = "idx_conversation_donor", columnList = "donor_id"),
    @Index(name = "idx_conversation_ngo", columnList = "ngo_id"),
    @Index(name = "idx_conversation_donation", columnList = "donation_id"),
    @Index(name = "idx_conversation_last_message", columnList = "last_message_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "donor_id", nullable = false)
    private User donor;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "ngo_id", nullable = false)
    private NGOProfile ngo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "donation_id")
    private Donation donation;

    @Column(name = "last_message_text", length = 500)
    private String lastMessageText;

    @Column(name = "last_message_at")
    private LocalDateTime lastMessageAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "last_message_sender_id")
    private User lastMessageSender;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
