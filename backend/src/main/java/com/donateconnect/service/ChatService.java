package com.donateconnect.service;

import com.donateconnect.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

public interface ChatService {

    ConversationDto getOrCreateConversation(UUID authUserId, CreateConversationRequest request);

    List<ConversationDto> getUserConversations(UUID authUserId);

    ConversationDto getConversationById(UUID authUserId, UUID conversationId);

    Page<ChatMessageDto> getConversationMessages(UUID authUserId, UUID conversationId, Pageable pageable);

    ChatMessageDto sendMessage(UUID authUserId, UUID conversationId, SendMessageRequest request);

    ChatMessageDto uploadAttachmentAndSendMessage(
            UUID authUserId,
            UUID conversationId,
            MultipartFile file,
            String caption,
            String clientMessageId
    ) throws IOException;

    byte[] getAttachmentData(UUID authUserId, String filename) throws IOException;

    String getAttachmentContentType(UUID authUserId, String filename);

    void markConversationAsRead(UUID authUserId, UUID conversationId);

    long getTotalUnreadCount(UUID authUserId);
}

