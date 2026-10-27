package com.donateconnect.repository;

import com.donateconnect.entity.ChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    Page<ChatMessage> findByConversationIdOrderByCreatedAtAsc(UUID conversationId, Pageable pageable);

    Page<ChatMessage> findByConversationIdOrderByCreatedAtDesc(UUID conversationId, Pageable pageable);

    long countByConversationIdAndRecipientIdAndReadFalse(UUID conversationId, UUID recipientId);

    long countByRecipientIdAndReadFalse(UUID recipientId);

    boolean existsByConversationIdAndClientMessageId(UUID conversationId, String clientMessageId);

    @Modifying
    @Query("UPDATE ChatMessage m SET m.read = true, m.readAt = :now WHERE m.conversation.id = :conversationId AND m.recipient.id = :recipientId AND m.read = false")
    int markMessagesAsRead(@Param("conversationId") UUID conversationId, @Param("recipientId") UUID recipientId, @Param("now") LocalDateTime now);

    @Query("SELECT m FROM ChatMessage m WHERE m.attachmentUrl = :attachmentUrl OR m.attachmentUrl LIKE %:filename")
    Optional<ChatMessage> findByAttachmentUrlOrFilename(@Param("attachmentUrl") String attachmentUrl, @Param("filename") String filename);
}

