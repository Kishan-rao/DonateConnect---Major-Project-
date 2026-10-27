package com.donateconnect.controller;

import com.donateconnect.dto.*;
import com.donateconnect.entity.Role;
import com.donateconnect.entity.User;
import com.donateconnect.repository.UserRepository;
import com.donateconnect.service.ChatService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class ChatControllerTest {

    private MockMvc mockMvc;

    @Mock
    private ChatService chatService;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ChatController chatController;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private User donorUser;
    private Authentication auth;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(chatController).build();

        donorUser = User.builder()
                .id(UUID.randomUUID())
                .email("donor@test.org")
                .fullName("Donor Tester")
                .role(Role.DONOR)
                .build();

        auth = new UsernamePasswordAuthenticationToken(donorUser.getEmail(), null);
    }

    @Test
    @DisplayName("GET /api/chat/conversations returns list of conversations")
    void testGetMyConversations() throws Exception {
        when(userRepository.findByEmail(donorUser.getEmail())).thenReturn(Optional.of(donorUser));

        ConversationDto conv = ConversationDto.builder()
                .id(UUID.randomUUID())
                .otherParticipantName("Helping Hands")
                .otherParticipantRole("NGO")
                .lastMessageText("Hello")
                .build();

        when(chatService.getUserConversations(donorUser.getId())).thenReturn(List.of(conv));

        mockMvc.perform(get("/api/chat/conversations")
                        .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].otherParticipantName").value("Helping Hands"));
    }

    @Test
    @DisplayName("POST /api/chat/conversations creates or retrieves conversation")
    void testCreateConversation() throws Exception {
        when(userRepository.findByEmail(donorUser.getEmail())).thenReturn(Optional.of(donorUser));

        UUID ngoId = UUID.randomUUID();
        CreateConversationRequest req = CreateConversationRequest.builder()
                .ngoId(ngoId)
                .build();

        ConversationDto conv = ConversationDto.builder()
                .id(UUID.randomUUID())
                .otherParticipantName("Helping Hands")
                .build();

        when(chatService.getOrCreateConversation(eq(donorUser.getId()), any(CreateConversationRequest.class)))
                .thenReturn(conv);

        mockMvc.perform(post("/api/chat/conversations")
                        .principal(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.otherParticipantName").value("Helping Hands"));
    }

    @Test
    @DisplayName("POST /api/chat/conversations/{id}/messages sends message")
    void testSendMessage() throws Exception {
        when(userRepository.findByEmail(donorUser.getEmail())).thenReturn(Optional.of(donorUser));

        UUID convId = UUID.randomUUID();
        SendMessageRequest req = SendMessageRequest.builder()
                .content("Can we deliver tomorrow?")
                .clientMessageId("c-1")
                .build();

        ChatMessageDto msgDto = ChatMessageDto.builder()
                .id(UUID.randomUUID())
                .conversationId(convId)
                .content("Can we deliver tomorrow?")
                .senderId(donorUser.getId())
                .build();

        when(chatService.sendMessage(eq(donorUser.getId()), eq(convId), any(SendMessageRequest.class)))
                .thenReturn(msgDto);

        mockMvc.perform(post("/api/chat/conversations/{id}/messages", convId)
                        .principal(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content").value("Can we deliver tomorrow?"));
    }

    @Test
    @DisplayName("GET /api/chat/conversations/{id}/messages returns messages page")
    void testGetMessages() throws Exception {
        when(userRepository.findByEmail(donorUser.getEmail())).thenReturn(Optional.of(donorUser));

        UUID convId = UUID.randomUUID();
        ChatMessageDto msgDto = ChatMessageDto.builder()
                .id(UUID.randomUUID())
                .conversationId(convId)
                .content("First message")
                .build();

        when(chatService.getConversationMessages(eq(donorUser.getId()), eq(convId), any()))
                .thenReturn(new PageImpl<>(List.of(msgDto)));

        mockMvc.perform(get("/api/chat/conversations/{id}/messages", convId)
                        .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].content").value("First message"));
    }
}

