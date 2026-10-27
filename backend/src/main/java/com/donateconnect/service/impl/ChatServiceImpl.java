package com.donateconnect.service.impl;

import com.donateconnect.dto.*;
import com.donateconnect.entity.*;
import com.donateconnect.exception.ResourceNotFoundException;
import com.donateconnect.repository.*;
import com.donateconnect.service.ChatService;
import com.donateconnect.service.NotificationService;
import com.donateconnect.service.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB limit
    private static final int MAX_MESSAGE_LENGTH = 2000;

    private final ConversationRepository conversationRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final NGOProfileRepository ngoProfileRepository;
    private final DonationRepository donationRepository;
    private final StoredFileRepository storedFileRepository;
    private final NotificationService notificationService;
    private final StorageService storageService;

    @Override
    @Transactional
    public ConversationDto getOrCreateConversation(UUID authUserId, CreateConversationRequest request) {
        User authUser = getAuthenticatedUser(authUserId);
        validateSupportedChatRole(authUser);

        User donorUser;
        NGOProfile ngoProfile;
        Donation donation = null;

        if (request.getDonationId() != null) {
            donation = donationRepository.findById(request.getDonationId())
                    .orElseThrow(() -> new ResourceNotFoundException("Donation not found: " + request.getDonationId()));
            donorUser = donation.getDonor();
            ngoProfile = donation.getNgo();

            // Verify authUser is either donor or NGO for this donation
            if (!authUserId.equals(donorUser.getId()) && !authUserId.equals(ngoProfile.getUser().getId())) {
                throw new AccessDeniedException("You are not authorized to start a conversation for this donation");
            }
        } else if (authUser.getRole() == Role.DONOR) {
            donorUser = authUser;
            if (request.getNgoId() == null) {
                throw new IllegalArgumentException("Target NGO profile ID is required");
            }
            ngoProfile = ngoProfileRepository.findById(request.getNgoId())
                    .orElseThrow(() -> new ResourceNotFoundException("NGO profile not found: " + request.getNgoId()));
        } else if (authUser.getRole() == Role.NGO) {
            ngoProfile = ngoProfileRepository.findByUserId(authUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("NGO profile not found for user: " + authUserId));
            if (request.getDonorId() == null) {
                throw new IllegalArgumentException("Target donor ID is required");
            }
            donorUser = userRepository.findById(request.getDonorId())
                    .orElseThrow(() -> new ResourceNotFoundException("Donor not found: " + request.getDonorId()));
            if (donorUser.getRole() != Role.DONOR) {
                throw new IllegalArgumentException("Target user must be a DONOR");
            }
        } else {
            throw new AccessDeniedException("Only DONOR and NGO roles can participate in chat");
        }

        // Avoid duplicate conversations: search for existing conversation between these participants
        UUID donationId = donation != null ? donation.getId() : null;
        Optional<Conversation> existing = conversationRepository.findExactConversation(donorUser.getId(), ngoProfile.getId(), donationId);
        if (existing.isPresent()) {
            return mapToConversationDto(existing.get(), authUserId);
        }

        // If no donation-specific conversation exists, check for an existing general conversation
        if (donationId == null) {
            List<Conversation> generalConvs = conversationRepository.findAllByDonorIdAndNgoId(donorUser.getId(), ngoProfile.getId());
            if (!generalConvs.isEmpty()) {
                return mapToConversationDto(generalConvs.get(0), authUserId);
            }
        }

        Conversation newConv = Conversation.builder()
                .donor(donorUser)
                .ngo(ngoProfile)
                .donation(donation)
                .lastMessageAt(LocalDateTime.now())
                .build();

        Conversation saved = conversationRepository.save(newConv);
        log.info("Created new conversation {} between donor {} and NGO {}", saved.getId(), donorUser.getEmail(), ngoProfile.getName());
        return mapToConversationDto(saved, authUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConversationDto> getUserConversations(UUID authUserId) {
        User authUser = getAuthenticatedUser(authUserId);
        validateSupportedChatRole(authUser);

        List<Conversation> conversations = conversationRepository.findAllByParticipantUserId(authUserId);
        List<ConversationDto> dtos = new ArrayList<>();
        for (Conversation c : conversations) {
            dtos.add(mapToConversationDto(c, authUserId));
        }
        return dtos;
    }

    @Override
    @Transactional(readOnly = true)
    public ConversationDto getConversationById(UUID authUserId, UUID conversationId) {
        User authUser = getAuthenticatedUser(authUserId);
        validateSupportedChatRole(authUser);

        Conversation conversation = conversationRepository.findByIdAndParticipantUserId(conversationId, authUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found or access denied"));

        return mapToConversationDto(conversation, authUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ChatMessageDto> getConversationMessages(UUID authUserId, UUID conversationId, Pageable pageable) {
        User authUser = getAuthenticatedUser(authUserId);
        validateSupportedChatRole(authUser);

        Conversation conversation = conversationRepository.findByIdAndParticipantUserId(conversationId, authUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found or access denied"));

        return chatMessageRepository.findByConversationIdOrderByCreatedAtAsc(conversation.getId(), pageable)
                .map(this::mapToChatMessageDto);
    }

    @Override
    @Transactional
    public ChatMessageDto sendMessage(UUID authUserId, UUID conversationId, SendMessageRequest request) {
        User sender = getAuthenticatedUser(authUserId);
        validateSupportedChatRole(sender);

        Conversation conversation = conversationRepository.findByIdAndParticipantUserId(conversationId, authUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found or access denied"));

        String content = request.getContent() != null ? request.getContent().trim() : "";
        if (content.isEmpty()) {
            throw new IllegalArgumentException("Message content cannot be empty");
        }
        if (content.length() > MAX_MESSAGE_LENGTH) {
            throw new IllegalArgumentException("Message content exceeds maximum allowed length of " + MAX_MESSAGE_LENGTH + " characters");
        }

        // Idempotency check: prevent duplicate submissions on rapid taps or network retries
        if (request.getClientMessageId() != null && !request.getClientMessageId().trim().isEmpty()) {
            String clientMsgId = request.getClientMessageId().trim();
            if (chatMessageRepository.existsByConversationIdAndClientMessageId(conversationId, clientMsgId)) {
                log.info("Duplicate message submission detected with clientMessageId: {}", clientMsgId);
                return chatMessageRepository.findByConversationIdOrderByCreatedAtDesc(conversationId, Pageable.ofSize(1))
                        .getContent().stream()
                        .filter(m -> clientMsgId.equals(m.getClientMessageId()))
                        .findFirst()
                        .map(this::mapToChatMessageDto)
                        .orElseThrow(() -> new IllegalStateException("Message was previously processed"));
            }
        }

        User recipient = getRecipient(conversation, sender);

        ChatMessage message = ChatMessage.builder()
                .conversation(conversation)
                .sender(sender)
                .recipient(recipient)
                .content(content)
                .read(false)
                .clientMessageId(request.getClientMessageId() != null ? request.getClientMessageId().trim() : null)
                .build();

        ChatMessage savedMessage = chatMessageRepository.save(message);

        // Update conversation summary
        conversation.setLastMessageText(content.length() > 100 ? content.substring(0, 97) + "..." : content);
        conversation.setLastMessageAt(LocalDateTime.now());
        conversation.setLastMessageSender(sender);
        conversationRepository.save(conversation);

        // Notify recipient via existing notification service
        try {
            UUID relDonationId = conversation.getDonation() != null ? conversation.getDonation().getId() : null;
            notificationService.createNotification(
                    recipient,
                    "New message from " + sender.getFullName() + ": " + (content.length() > 50 ? content.substring(0, 47) + "..." : content),
                    relDonationId
            );
        } catch (Exception e) {
            log.warn("Failed to dispatch chat notification: {}", e.getMessage());
        }

        return mapToChatMessageDto(savedMessage);
    }

    @Override
    @Transactional
    public ChatMessageDto uploadAttachmentAndSendMessage(
            UUID authUserId,
            UUID conversationId,
            MultipartFile file,
            String caption,
            String clientMessageId
    ) throws IOException {
        User sender = getAuthenticatedUser(authUserId);
        validateSupportedChatRole(sender);

        Conversation conversation = conversationRepository.findByIdAndParticipantUserId(conversationId, authUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found or access denied"));

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("No image attachment provided");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Image file exceeds maximum allowed size of 10 MB");
        }

        byte[] fileBytes = file.getBytes();
        String detectedContentType = detectImageContentType(fileBytes);
        if (detectedContentType == null) {
            throw new IllegalArgumentException("Invalid image content. Only JPEG, PNG, and WebP images are permitted.");
        }

        String extension = getExtensionFromContentType(detectedContentType);
        String storedFilename = "chat-" + UUID.randomUUID() + "." + extension;
        String originalFilename = file.getOriginalFilename() != null ? sanitizeFilename(file.getOriginalFilename()) : storedFilename;

        // Persist to PostgreSQL via StoredFile
        StoredFile storedFile = StoredFile.builder()
                .filename(storedFilename)
                .originalFilename(originalFilename)
                .contentType(detectedContentType)
                .data(fileBytes)
                .fileSize(fileBytes.length)
                .build();
        storedFileRepository.save(storedFile);
        log.info("Persisted chat attachment to database: {} ({} bytes)", storedFilename, fileBytes.length);

        // Populate local cache asynchronously/safely
        try {
            storageService.store(fileBytes, storedFilename);
        } catch (Exception e) {
            log.debug("Local disk cache error for chat photo: {}", e.getMessage());
        }

        String attachmentUrl = "/api/chat/attachments/" + storedFilename;
        String trimmedCaption = caption != null ? caption.trim() : "";
        if (trimmedCaption.length() > MAX_MESSAGE_LENGTH) {
            trimmedCaption = trimmedCaption.substring(0, MAX_MESSAGE_LENGTH);
        }

        User recipient = getRecipient(conversation, sender);

        ChatMessage message = ChatMessage.builder()
                .conversation(conversation)
                .sender(sender)
                .recipient(recipient)
                .content(trimmedCaption.isEmpty() ? null : trimmedCaption)
                .attachmentUrl(attachmentUrl)
                .attachmentContentType(detectedContentType)
                .attachmentSize(file.getSize())
                .attachmentOriginalFilename(originalFilename)
                .read(false)
                .clientMessageId(clientMessageId != null ? clientMessageId.trim() : null)
                .build();

        ChatMessage savedMessage = chatMessageRepository.save(message);

        conversation.setLastMessageText(!trimmedCaption.isEmpty() ? "📷 " + trimmedCaption : "📷 Photo");
        conversation.setLastMessageAt(LocalDateTime.now());
        conversation.setLastMessageSender(sender);
        conversationRepository.save(conversation);

        try {
            UUID relDonationId = conversation.getDonation() != null ? conversation.getDonation().getId() : null;
            notificationService.createNotification(
                    recipient,
                    sender.getFullName() + " sent you a photo attachment.",
                    relDonationId
            );
        } catch (Exception e) {
            log.warn("Failed to dispatch photo chat notification: {}", e.getMessage());
        }

        return mapToChatMessageDto(savedMessage);
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] getAttachmentData(UUID authUserId, String filename) throws IOException {
        String safeName = sanitizeFilename(filename);

        // Security: verify that the requester is a participant in the conversation containing this attachment
        ChatMessage message = chatMessageRepository.findByAttachmentUrlOrFilename(
                "/api/chat/attachments/" + safeName,
                safeName
        ).orElseThrow(() -> new ResourceNotFoundException("Attachment not found: " + safeName));

        Conversation conv = message.getConversation();
        if (!authUserId.equals(conv.getDonor().getId()) && !authUserId.equals(conv.getNgo().getUser().getId())) {
            throw new AccessDeniedException("You are not authorized to view this attachment");
        }

        // Load bytes from PostgreSQL stored file
        StoredFile fileRecord = storedFileRepository.findByFilename(safeName)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment data not found"));

        return fileRecord.getData();
    }

    @Override
    @Transactional(readOnly = true)
    public String getAttachmentContentType(UUID authUserId, String filename) {
        String safeName = sanitizeFilename(filename);
        return storedFileRepository.findByFilename(safeName)
                .map(StoredFile::getContentType)
                .orElse("image/jpeg");
    }

    @Override
    @Transactional
    public void markConversationAsRead(UUID authUserId, UUID conversationId) {
        User authUser = getAuthenticatedUser(authUserId);
        validateSupportedChatRole(authUser);

        Conversation conversation = conversationRepository.findByIdAndParticipantUserId(conversationId, authUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found or access denied"));

        int updated = chatMessageRepository.markMessagesAsRead(conversation.getId(), authUserId, LocalDateTime.now());
        log.debug("Marked {} messages as read in conversation {} for user {}", updated, conversationId, authUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public long getTotalUnreadCount(UUID authUserId) {
        return chatMessageRepository.countByRecipientIdAndReadFalse(authUserId);
    }

    // ==================== HELPERS ====================

    private User getAuthenticatedUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
    }

    private void validateSupportedChatRole(User user) {
        if (user.getRole() != Role.DONOR && user.getRole() != Role.NGO) {
            throw new AccessDeniedException("Role " + user.getRole() + " is not authorized to use the chat system");
        }
    }

    private User getRecipient(Conversation conversation, User sender) {
        if (sender.getId().equals(conversation.getDonor().getId())) {
            return conversation.getNgo().getUser();
        } else {
            return conversation.getDonor();
        }
    }

    private ConversationDto mapToConversationDto(Conversation conversation, UUID authUserId) {
        boolean isDonor = authUserId.equals(conversation.getDonor().getId());
        User otherUser = isDonor ? conversation.getNgo().getUser() : conversation.getDonor();

        long unread = chatMessageRepository.countByConversationIdAndRecipientIdAndReadFalse(conversation.getId(), authUserId);

        return ConversationDto.builder()
                .id(conversation.getId())
                .otherParticipantId(otherUser.getId())
                .otherParticipantName(isDonor ? conversation.getNgo().getName() : otherUser.getFullName())
                .otherParticipantRole(otherUser.getRole().name())
                .otherParticipantEmail(otherUser.getEmail())
                .ngoVerified(isDonor ? conversation.getNgo().isVerified() : null)
                .ngoAddress(isDonor ? conversation.getNgo().getAddress() : null)
                .ngoCity(isDonor ? conversation.getNgo().getCity() : null)
                .donationId(conversation.getDonation() != null ? conversation.getDonation().getId() : null)
                .donationCategory(conversation.getDonation() != null ? conversation.getDonation().getCategory().name() : null)
                .donationDescription(conversation.getDonation() != null ? conversation.getDonation().getDescription() : null)
                .lastMessageText(conversation.getLastMessageText())
                .lastMessageAt(conversation.getLastMessageAt())
                .lastMessageSenderId(conversation.getLastMessageSender() != null ? conversation.getLastMessageSender().getId() : null)
                .unreadCount(unread)
                .createdAt(conversation.getCreatedAt())
                .build();
    }

    private ChatMessageDto mapToChatMessageDto(ChatMessage msg) {
        return ChatMessageDto.builder()
                .id(msg.getId())
                .conversationId(msg.getConversation().getId())
                .senderId(msg.getSender().getId())
                .senderName(msg.getSender().getFullName())
                .senderRole(msg.getSender().getRole().name())
                .recipientId(msg.getRecipient().getId())
                .content(msg.getContent())
                .attachmentUrl(msg.getAttachmentUrl())
                .attachmentContentType(msg.getAttachmentContentType())
                .attachmentSize(msg.getAttachmentSize())
                .attachmentOriginalFilename(msg.getAttachmentOriginalFilename())
                .read(msg.isRead())
                .readAt(msg.getReadAt())
                .createdAt(msg.getCreatedAt())
                .clientMessageId(msg.getClientMessageId())
                .build();
    }

    /**
     * Inspect file magic bytes to verify actual image content and supported formats.
     * Prevents trusting client-supplied MIME types or file extensions.
     */
    private String detectImageContentType(byte[] data) {
        if (data == null || data.length < 12) {
            return null;
        }

        // JPEG: FF D8 FF
        if ((data[0] & 0xFF) == 0xFF && (data[1] & 0xFF) == 0xD8 && (data[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }

        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if ((data[0] & 0xFF) == 0x89 && data[1] == 'P' && data[2] == 'N' && data[3] == 'G'
                && data[4] == 0x0D && data[5] == 0x0A && data[6] == 0x1A && data[7] == 0x0A) {
            return "image/png";
        }

        // WebP: RIFF .... WEBP
        if (data[0] == 'R' && data[1] == 'I' && data[2] == 'F' && data[3] == 'F'
                && data[8] == 'W' && data[9] == 'E' && data[10] == 'B' && data[11] == 'P') {
            return "image/webp";
        }

        // GIF: GIF87a or GIF89a
        if (data[0] == 'G' && data[1] == 'I' && data[2] == 'F' && data[3] == '8') {
            return "image/gif";
        }

        return null;
    }

    private String getExtensionFromContentType(String contentType) {
        return switch (contentType) {
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            case "image/gif" -> "gif";
            default -> "jpg";
        };
    }

    private String sanitizeFilename(String filename) {
        if (filename == null) return "attachment.jpg";
        return filename.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}

