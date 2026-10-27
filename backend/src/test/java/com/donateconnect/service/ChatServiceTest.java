package com.donateconnect.service;

import com.donateconnect.dto.*;
import com.donateconnect.entity.*;
import com.donateconnect.exception.ResourceNotFoundException;
import com.donateconnect.repository.*;
import com.donateconnect.service.impl.ChatServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock
    private ConversationRepository conversationRepository;
    @Mock
    private ChatMessageRepository chatMessageRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private NGOProfileRepository ngoProfileRepository;
    @Mock
    private DonationRepository donationRepository;
    @Mock
    private StoredFileRepository storedFileRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private StorageService storageService;

    private ChatServiceImpl chatService;

    private User donorUser;
    private User ngoUser;
    private User volunteerUser;
    private NGOProfile ngoProfile;
    private Conversation conversation;

    @BeforeEach
    void setUp() {
        chatService = new ChatServiceImpl(
                conversationRepository,
                chatMessageRepository,
                userRepository,
                ngoProfileRepository,
                donationRepository,
                storedFileRepository,
                notificationService,
                storageService
        );

        donorUser = User.builder()
                .id(UUID.randomUUID())
                .fullName("Alice Donor")
                .email("alice@donor.org")
                .role(Role.DONOR)
                .build();

        ngoUser = User.builder()
                .id(UUID.randomUUID())
                .fullName("Helping Hands NGO")
                .email("contact@helpinghands.org")
                .role(Role.NGO)
                .build();

        volunteerUser = User.builder()
                .id(UUID.randomUUID())
                .fullName("Bob Driver")
                .email("bob@driver.org")
                .role(Role.VOLUNTEER)
                .build();

        ngoProfile = NGOProfile.builder()
                .id(UUID.randomUUID())
                .user(ngoUser)
                .name("Helping Hands Foundation")
                .address("123 Charity Lane")
                .city("Metro City")
                .phone("555-1234")
                .verified(true)
                .build();

        conversation = Conversation.builder()
                .id(UUID.randomUUID())
                .donor(donorUser)
                .ngo(ngoProfile)
                .createdAt(LocalDateTime.now())
                .lastMessageAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Donor initiates conversation with eligible NGO")
    void testDonorInitiatesConversation() {
        when(userRepository.findById(donorUser.getId())).thenReturn(Optional.of(donorUser));
        when(ngoProfileRepository.findById(ngoProfile.getId())).thenReturn(Optional.of(ngoProfile));
        when(conversationRepository.findExactConversation(donorUser.getId(), ngoProfile.getId(), null))
                .thenReturn(Optional.empty());
        when(conversationRepository.findAllByDonorIdAndNgoId(donorUser.getId(), ngoProfile.getId()))
                .thenReturn(Collections.emptyList());
        when(conversationRepository.save(any(Conversation.class))).thenReturn(conversation);

        CreateConversationRequest request = CreateConversationRequest.builder()
                .ngoId(ngoProfile.getId())
                .build();

        ConversationDto result = chatService.getOrCreateConversation(donorUser.getId(), request);

        assertNotNull(result);
        assertEquals(conversation.getId(), result.getId());
        verify(conversationRepository).save(any(Conversation.class));
    }

    @Test
    @DisplayName("NGO initiates conversation with eligible Donor")
    void testNgoInitiatesConversation() {
        when(userRepository.findById(ngoUser.getId())).thenReturn(Optional.of(ngoUser));
        when(ngoProfileRepository.findByUserId(ngoUser.getId())).thenReturn(Optional.of(ngoProfile));
        when(userRepository.findById(donorUser.getId())).thenReturn(Optional.of(donorUser));
        when(conversationRepository.findExactConversation(donorUser.getId(), ngoProfile.getId(), null))
                .thenReturn(Optional.empty());
        when(conversationRepository.findAllByDonorIdAndNgoId(donorUser.getId(), ngoProfile.getId()))
                .thenReturn(Collections.emptyList());
        when(conversationRepository.save(any(Conversation.class))).thenReturn(conversation);

        CreateConversationRequest request = CreateConversationRequest.builder()
                .donorId(donorUser.getId())
                .build();

        ConversationDto result = chatService.getOrCreateConversation(ngoUser.getId(), request);

        assertNotNull(result);
        assertEquals(conversation.getId(), result.getId());
    }

    @Test
    @DisplayName("Reuses existing conversation to prevent duplicates")
    void testReusesExistingConversation() {
        when(userRepository.findById(donorUser.getId())).thenReturn(Optional.of(donorUser));
        when(ngoProfileRepository.findById(ngoProfile.getId())).thenReturn(Optional.of(ngoProfile));
        when(conversationRepository.findExactConversation(donorUser.getId(), ngoProfile.getId(), null))
                .thenReturn(Optional.of(conversation));

        CreateConversationRequest request = CreateConversationRequest.builder()
                .ngoId(ngoProfile.getId())
                .build();

        ConversationDto result = chatService.getOrCreateConversation(donorUser.getId(), request);

        assertNotNull(result);
        assertEquals(conversation.getId(), result.getId());
        verify(conversationRepository, never()).save(any(Conversation.class));
    }

    @Test
    @DisplayName("Rejects conversation creation for unsupported roles")
    void testRejectsUnsupportedRoles() {
        when(userRepository.findById(volunteerUser.getId())).thenReturn(Optional.of(volunteerUser));

        CreateConversationRequest request = CreateConversationRequest.builder()
                .ngoId(ngoProfile.getId())
                .build();

        assertThrows(AccessDeniedException.class, () ->
                chatService.getOrCreateConversation(volunteerUser.getId(), request)
        );
    }

    @Test
    @DisplayName("Rejects message retrieval when requester is not a participant")
    void testUnauthorizedConversationAccess() {
        UUID strangerId = UUID.randomUUID();
        User stranger = User.builder().id(strangerId).role(Role.DONOR).build();

        when(userRepository.findById(strangerId)).thenReturn(Optional.of(stranger));
        when(conversationRepository.findByIdAndParticipantUserId(conversation.getId(), strangerId))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                chatService.getConversationMessages(strangerId, conversation.getId(), PageRequest.of(0, 10))
        );
    }

    @Test
    @DisplayName("Rejects empty or blank text messages")
    void testRejectsEmptyMessages() {
        when(userRepository.findById(donorUser.getId())).thenReturn(Optional.of(donorUser));
        when(conversationRepository.findByIdAndParticipantUserId(conversation.getId(), donorUser.getId()))
                .thenReturn(Optional.of(conversation));

        SendMessageRequest emptyReq = SendMessageRequest.builder().content("   ").build();

        assertThrows(IllegalArgumentException.class, () ->
                chatService.sendMessage(donorUser.getId(), conversation.getId(), emptyReq)
        );
    }

    @Test
    @DisplayName("Rejects oversized text messages (> 2000 characters)")
    void testRejectsOversizedMessages() {
        when(userRepository.findById(donorUser.getId())).thenReturn(Optional.of(donorUser));
        when(conversationRepository.findByIdAndParticipantUserId(conversation.getId(), donorUser.getId()))
                .thenReturn(Optional.of(conversation));

        String hugeContent = "A".repeat(2001);
        SendMessageRequest req = SendMessageRequest.builder().content(hugeContent).build();

        assertThrows(IllegalArgumentException.class, () ->
                chatService.sendMessage(donorUser.getId(), conversation.getId(), req)
        );
    }

    @Test
    @DisplayName("Sends text message, persists it, and dispatches notification to recipient")
    void testSendTextMessageSuccess() {
        when(userRepository.findById(donorUser.getId())).thenReturn(Optional.of(donorUser));
        when(conversationRepository.findByIdAndParticipantUserId(conversation.getId(), donorUser.getId()))
                .thenReturn(Optional.of(conversation));

        ChatMessage message = ChatMessage.builder()
                .id(UUID.randomUUID())
                .conversation(conversation)
                .sender(donorUser)
                .recipient(ngoUser)
                .content("Hello, when can I drop off items?")
                .createdAt(LocalDateTime.now())
                .build();

        when(chatMessageRepository.save(any(ChatMessage.class))).thenReturn(message);

        SendMessageRequest req = SendMessageRequest.builder()
                .content("Hello, when can I drop off items?")
                .clientMessageId("msg-123")
                .build();

        ChatMessageDto result = chatService.sendMessage(donorUser.getId(), conversation.getId(), req);

        assertNotNull(result);
        assertEquals("Hello, when can I drop off items?", result.getContent());
        verify(chatMessageRepository).save(any(ChatMessage.class));
        verify(notificationService).createNotification(eq(ngoUser), contains("Alice Donor"), any());
    }

    @Test
    @DisplayName("Idempotency: duplicate client message ID returns existing message")
    void testIdempotentMessageSubmission() {
        when(userRepository.findById(donorUser.getId())).thenReturn(Optional.of(donorUser));
        when(conversationRepository.findByIdAndParticipantUserId(conversation.getId(), donorUser.getId()))
                .thenReturn(Optional.of(conversation));
        when(chatMessageRepository.existsByConversationIdAndClientMessageId(conversation.getId(), "client-key-1"))
                .thenReturn(true);

        ChatMessage existingMsg = ChatMessage.builder()
                .id(UUID.randomUUID())
                .conversation(conversation)
                .sender(donorUser)
                .recipient(ngoUser)
                .content("Original message")
                .clientMessageId("client-key-1")
                .createdAt(LocalDateTime.now())
                .build();

        when(chatMessageRepository.findByConversationIdOrderByCreatedAtDesc(eq(conversation.getId()), any()))
                .thenReturn(new PageImpl<>(List.of(existingMsg)));

        SendMessageRequest req = SendMessageRequest.builder()
                .content("Original message")
                .clientMessageId("client-key-1")
                .build();

        ChatMessageDto result = chatService.sendMessage(donorUser.getId(), conversation.getId(), req);

        assertNotNull(result);
        assertEquals(existingMsg.getId(), result.getId());
        verify(chatMessageRepository, never()).save(any(ChatMessage.class));
    }

    @Test
    @DisplayName("Rejects malformed, unsupported, or non-image attachments")
    void testRejectsMalformedAttachment() {
        when(userRepository.findById(donorUser.getId())).thenReturn(Optional.of(donorUser));
        when(conversationRepository.findByIdAndParticipantUserId(conversation.getId(), donorUser.getId()))
                .thenReturn(Optional.of(conversation));

        // Fake executable or text file disguised as jpg
        byte[] badData = "NotAnImageBytesData".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "test.jpg", "image/jpeg", badData);

        assertThrows(IllegalArgumentException.class, () ->
                chatService.uploadAttachmentAndSendMessage(donorUser.getId(), conversation.getId(), file, "Caption", null)
        );
    }

    @Test
    @DisplayName("Accepts valid JPEG image attachment and saves to persistent storage")
    void testValidImageAttachmentSuccess() throws IOException {
        when(userRepository.findById(donorUser.getId())).thenReturn(Optional.of(donorUser));
        when(conversationRepository.findByIdAndParticipantUserId(conversation.getId(), donorUser.getId()))
                .thenReturn(Optional.of(conversation));

        // Valid JPEG magic header: FF D8 FF E0 followed by bytes
        byte[] validJpeg = new byte[] {
                (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0,
                0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01
        };

        MockMultipartFile file = new MockMultipartFile("file", "camera.jpg", "image/jpeg", validJpeg);

        ChatMessage savedAttachmentMsg = ChatMessage.builder()
                .id(UUID.randomUUID())
                .conversation(conversation)
                .sender(donorUser)
                .recipient(ngoUser)
                .attachmentUrl("/api/chat/attachments/chat-sample.jpg")
                .attachmentContentType("image/jpeg")
                .content("Donation photo")
                .createdAt(LocalDateTime.now())
                .build();

        when(chatMessageRepository.save(any(ChatMessage.class))).thenReturn(savedAttachmentMsg);

        ChatMessageDto result = chatService.uploadAttachmentAndSendMessage(
                donorUser.getId(),
                conversation.getId(),
                file,
                "Donation photo",
                null
        );

        assertNotNull(result);
        assertTrue(result.getAttachmentUrl().contains("/api/chat/attachments/"));
        verify(storedFileRepository).save(any(StoredFile.class));
        verify(chatMessageRepository).save(any(ChatMessage.class));
    }

    @Test
    @DisplayName("Unauthorized user cannot retrieve private attachment")
    void testUnauthorizedAttachmentAccess() {
        UUID strangerId = UUID.randomUUID();
        String filename = "chat-12345.jpg";

        ChatMessage msg = ChatMessage.builder()
                .id(UUID.randomUUID())
                .conversation(conversation) // participants are donorUser and ngoUser
                .attachmentUrl("/api/chat/attachments/" + filename)
                .build();

        when(chatMessageRepository.findByAttachmentUrlOrFilename(eq("/api/chat/attachments/" + filename), eq(filename)))
                .thenReturn(Optional.of(msg));

        assertThrows(AccessDeniedException.class, () ->
                chatService.getAttachmentData(strangerId, filename)
        );
    }
}
