package com.donateconnect.controller;

import com.donateconnect.dto.*;
import com.donateconnect.entity.User;
import com.donateconnect.exception.ResourceNotFoundException;
import com.donateconnect.repository.UserRepository;
import com.donateconnect.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('DONOR', 'NGO')")
public class ChatController {

    private final ChatService chatService;
    private final UserRepository userRepository;

    @PostMapping("/conversations")
    public ResponseEntity<ApiResponse<ConversationDto>> createOrGetConversation(
            Authentication authentication,
            @RequestBody CreateConversationRequest request
    ) {
        UUID authUserId = getUserIdFromAuth(authentication);
        ConversationDto dto = chatService.getOrCreateConversation(authUserId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Conversation ready", dto));
    }

    @GetMapping("/conversations")
    public ResponseEntity<ApiResponse<List<ConversationDto>>> getMyConversations(
            Authentication authentication
    ) {
        UUID authUserId = getUserIdFromAuth(authentication);
        List<ConversationDto> conversations = chatService.getUserConversations(authUserId);
        return ResponseEntity.ok(ApiResponse.success("Conversations fetched", conversations));
    }

    @GetMapping("/conversations/{id}")
    public ResponseEntity<ApiResponse<ConversationDto>> getConversation(
            Authentication authentication,
            @PathVariable UUID id
    ) {
        UUID authUserId = getUserIdFromAuth(authentication);
        ConversationDto dto = chatService.getConversationById(authUserId, id);
        return ResponseEntity.ok(ApiResponse.success("Conversation fetched", dto));
    }

    @GetMapping("/conversations/{id}/messages")
    public ResponseEntity<ApiResponse<Page<ChatMessageDto>>> getConversationMessages(
            Authentication authentication,
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        UUID authUserId = getUserIdFromAuth(authentication);
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("createdAt").ascending());
        Page<ChatMessageDto> messages = chatService.getConversationMessages(authUserId, id, pageRequest);
        return ResponseEntity.ok(ApiResponse.success("Messages fetched", messages));
    }

    @PostMapping("/conversations/{id}/messages")
    public ResponseEntity<ApiResponse<ChatMessageDto>> sendMessage(
            Authentication authentication,
            @PathVariable UUID id,
            @Valid @RequestBody SendMessageRequest request
    ) {
        UUID authUserId = getUserIdFromAuth(authentication);
        ChatMessageDto message = chatService.sendMessage(authUserId, id, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Message sent", message));
    }

    @PostMapping(value = "/conversations/{id}/attachment", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ChatMessageDto>> uploadAttachment(
            Authentication authentication,
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "caption", required = false) String caption,
            @RequestParam(value = "clientMessageId", required = false) String clientMessageId
    ) throws IOException {
        UUID authUserId = getUserIdFromAuth(authentication);
        ChatMessageDto message = chatService.uploadAttachmentAndSendMessage(
                authUserId,
                id,
                file,
                caption,
                clientMessageId
        );
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Photo attachment sent", message));
    }

    @GetMapping("/attachments/{filename}")
    public ResponseEntity<byte[]> getAttachment(
            Authentication authentication,
            @PathVariable String filename
    ) throws IOException {
        UUID authUserId = getUserIdFromAuth(authentication);
        byte[] data = chatService.getAttachmentData(authUserId, filename);
        String contentType = chatService.getAttachmentContentType(authUserId, filename);

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .contentType(MediaType.parseMediaType(contentType))
                .body(data);
    }

    @PatchMapping("/conversations/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            Authentication authentication,
            @PathVariable UUID id
    ) {
        UUID authUserId = getUserIdFromAuth(authentication);
        chatService.markConversationAsRead(authUserId, id);
        return ResponseEntity.ok(ApiResponse.success("Conversation marked as read", null));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(
            Authentication authentication
    ) {
        UUID authUserId = getUserIdFromAuth(authentication);
        long count = chatService.getTotalUnreadCount(authUserId);
        return ResponseEntity.ok(ApiResponse.success("Unread count fetched", count));
    }

    private UUID getUserIdFromAuth(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
        return user.getId();
    }
}
