import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessagesPage } from './MessagesPage';
import * as chatApi from '../api/chatApi';
import * as ngoApi from '../api/ngoApi';
import * as cameraService from '../utils/cameraService';
import * as AuthContextModule from '../context/AuthContext';
import { ConversationDto, ChatMessageDto } from '../types';

vi.mock('../api/chatApi', () => ({
  getConversations: vi.fn(),
  getConversation: vi.fn(),
  createOrGetConversation: vi.fn(),
  getMessages: vi.fn(),
  sendTextMessage: vi.fn(),
  sendPhotoMessage: vi.fn(),
  markConversationRead: vi.fn(),
  getChatAttachmentBlobUrl: vi.fn(),
}));

vi.mock('../api/ngoApi', () => ({
  getVerifiedNgos: vi.fn(),
}));

vi.mock('../utils/cameraService', () => ({
  capturePhotoWithCamera: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('MessagesPage - Two-Way Donor–NGO Messaging and Camera Capture', () => {
  const mockDonorUser = {
    id: 'donor-1',
    email: 'donor@test.com',
    fullName: 'Jane Donor',
    role: 'DONOR' as const,
    createdAt: '2026-01-01',
  };

  const mockConversations: ConversationDto[] = [
    {
      id: 'conv-1',
      otherParticipantId: 'ngo-1',
      otherParticipantName: 'Helping Hands NGO',
      otherParticipantRole: 'NGO',
      otherParticipantEmail: 'ngo@helpinghands.org',
      ngoVerified: true,
      donationId: 'donation-101',
      donationCategory: 'Winter Blankets',
      lastMessageText: 'Can you deliver by Friday?',
      lastMessageAt: '2026-10-27T10:30:00Z',
      unreadCount: 2,
      createdAt: '2026-10-25T08:00:00Z',
    },
    {
      id: 'conv-2',
      otherParticipantId: 'ngo-2',
      otherParticipantName: 'Food Rescue Foundation',
      otherParticipantRole: 'NGO',
      otherParticipantEmail: 'info@foodrescue.org',
      ngoVerified: false,
      lastMessageText: 'Thank you for your generous support!',
      lastMessageAt: '2026-10-26T15:00:00Z',
      unreadCount: 0,
      createdAt: '2026-10-26T14:00:00Z',
    },
  ];

  const mockMessages: ChatMessageDto[] = [
    {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'ngo-1',
      senderName: 'Helping Hands NGO',
      senderRole: 'NGO',
      content: 'Can you deliver by Friday?',
      attachmentUrl: null,
      attachmentType: null,
      attachmentOriginalName: null,
      clientMessageId: 'client-1',
      read: true,
      createdAt: '2026-10-27T10:30:00Z',
    },
    {
      id: 'msg-2',
      conversationId: 'conv-1',
      senderId: 'donor-1',
      senderName: 'Jane Donor',
      senderRole: 'DONOR',
      content: 'Yes, sure thing!',
      attachmentUrl: null,
      attachmentType: null,
      attachmentOriginalName: null,
      clientMessageId: 'client-2',
      read: false,
      createdAt: '2026-10-27T10:35:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: mockDonorUser,
      token: 'fake-jwt-token',
      isAuthenticated: true,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refetchUser: vi.fn(),
    });

    vi.mocked(chatApi.getConversations).mockResolvedValue(mockConversations);
    vi.mocked(chatApi.getConversation).mockResolvedValue(mockConversations[0]);
    vi.mocked(chatApi.getMessages).mockResolvedValue({
      content: mockMessages,
      totalElements: 2,
      totalPages: 1,
      size: 50,
      number: 0,
    });
    vi.mocked(chatApi.markConversationRead).mockResolvedValue(undefined);
    vi.mocked(chatApi.getChatAttachmentBlobUrl).mockResolvedValue('blob:http://localhost/fake-img');
  });

  const renderComponent = (initialEntries = ['/messages']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/messages/:conversationId" element={<MessagesPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders conversations list with partner names and unread counts', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Helping Hands NGO')).toBeInTheDocument();
      expect(screen.getByText('Food Rescue Foundation')).toBeInTheDocument();
    });

    // Check message preview and donation badge
    expect(screen.getByText('Can you deliver by Friday?')).toBeInTheDocument();
    expect(screen.getByText(/Winter Blankets/i)).toBeInTheDocument();

    // Check unread badge (2 unread messages for Helping Hands)
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('filters conversation list by search query', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Helping Hands NGO')).toBeInTheDocument();
      expect(screen.getByText('Food Rescue Foundation')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search conversations...');
    await user.type(searchInput, 'Food');

    expect(screen.queryByText('Helping Hands NGO')).not.toBeInTheDocument();
    expect(screen.getByText('Food Rescue Foundation')).toBeInTheDocument();
  });

  it('loads and displays message history when conversation is selected', async () => {
    renderComponent(['/messages/conv-1']);

    await waitFor(() => {
      expect(chatApi.getConversation).toHaveBeenCalledWith('conv-1');
      expect(chatApi.getMessages).toHaveBeenCalledWith('conv-1', 0, 50);
      expect(chatApi.markConversationRead).toHaveBeenCalledWith('conv-1');
    });

    expect(screen.getAllByText('Can you deliver by Friday?').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Yes, sure thing!')).toBeInTheDocument();
  });

  it('allows sending a text message and clears input', async () => {
    const user = userEvent.setup();
    const newSentMessage: ChatMessageDto = {
      id: 'msg-3',
      conversationId: 'conv-1',
      senderId: 'donor-1',
      senderName: 'Jane Donor',
      senderRole: 'DONOR',
      content: 'I will be there at 2pm',
      attachmentUrl: null,
      attachmentType: null,
      attachmentOriginalName: null,
      clientMessageId: 'client-3',
      read: false,
      createdAt: '2026-10-27T10:40:00Z',
    };
    vi.mocked(chatApi.sendTextMessage).mockResolvedValueOnce(newSentMessage);

    renderComponent(['/messages/conv-1']);

    await waitFor(() => {
      expect(screen.getByText('Can you deliver by Friday?')).toBeInTheDocument();
    });

    const textInput = screen.getByPlaceholderText('Type a message...');
    await user.type(textInput, 'I will be there at 2pm');

    const sendBtn = screen.getByTitle('Send message');
    expect(sendBtn).not.toBeDisabled();
    await user.click(sendBtn);

    expect(chatApi.sendTextMessage).toHaveBeenCalledWith(
      'conv-1',
      'I will be there at 2pm',
      expect.any(String)
    );

    // Input should be cleared
    expect(textInput).toHaveValue('');

    // Message should be appended to the thread
    await waitFor(() => {
      expect(screen.getByText('I will be there at 2pm')).toBeInTheDocument();
    });
  });

  it('strictly uses camera capture and provides preview with retake and cancel', async () => {
    const user = userEvent.setup();
    const mockFile = new File(['camera-data'], 'chat-photo.jpg', { type: 'image/jpeg' });
    const mockCapturedPhoto = {
      file: mockFile,
      previewUrl: 'blob:http://localhost/captured-preview',
      format: 'jpeg',
    };

    vi.mocked(cameraService.capturePhotoWithCamera).mockResolvedValueOnce(mockCapturedPhoto);

    renderComponent(['/messages/conv-1']);

    await waitFor(() => {
      expect(screen.getByText('Can you deliver by Friday?')).toBeInTheDocument();
    });

    // 1. Ensure NO file picker or gallery input exists on the screen
    const fileInputs = document.querySelectorAll('input[type="file"]');
    expect(fileInputs.length).toBe(0);

    // 2. Click native camera button
    const cameraBtn = screen.getByTitle('Capture photo from device camera');
    await user.click(cameraBtn);

    expect(cameraService.capturePhotoWithCamera).toHaveBeenCalledWith('chat-photo');

    // 3. Verify preview bar appears with Retake and Cancel
    await waitFor(() => {
      expect(screen.getByText('Photo Attachment')).toBeInTheDocument();
      expect(screen.getByText(/Captured from camera/i)).toBeInTheDocument();
      expect(screen.getByTitle('Retake Photo')).toBeInTheDocument();
      expect(screen.getByTitle('Cancel Attachment')).toBeInTheDocument();
    });

    // 4. Click Cancel button to dismiss preview
    const cancelBtn = screen.getByTitle('Cancel Attachment');
    await user.click(cancelBtn);

    expect(screen.queryByText('Photo Attachment')).not.toBeInTheDocument();
  });

  it('sends photo attachment captured via camera with caption', async () => {
    const user = userEvent.setup();
    const mockFile = new File(['photo-binary'], 'item.jpg', { type: 'image/jpeg' });
    const mockCapturedPhoto = {
      file: mockFile,
      previewUrl: 'blob:http://localhost/preview-item',
      format: 'jpeg',
    };

    vi.mocked(cameraService.capturePhotoWithCamera).mockResolvedValueOnce(mockCapturedPhoto);

    const photoMessageResponse: ChatMessageDto = {
      id: 'msg-4',
      conversationId: 'conv-1',
      senderId: 'donor-1',
      senderName: 'Jane Donor',
      senderRole: 'DONOR',
      content: 'Here is the blanket condition',
      attachmentUrl: '/api/chat/attachments/chat-uuid-1.jpg',
      attachmentType: 'image/jpeg',
      attachmentOriginalName: 'item.jpg',
      clientMessageId: 'client-4',
      read: false,
      createdAt: '2026-10-27T10:45:00Z',
    };
    vi.mocked(chatApi.sendPhotoMessage).mockResolvedValueOnce(photoMessageResponse);

    renderComponent(['/messages/conv-1']);

    await waitFor(() => {
      expect(screen.getByText('Can you deliver by Friday?')).toBeInTheDocument();
    });

    // Capture photo
    const cameraBtn = screen.getByTitle('Capture photo from device camera');
    await user.click(cameraBtn);

    await waitFor(() => {
      expect(screen.getByText('Photo Attachment')).toBeInTheDocument();
    });

    // Add caption
    const textInput = screen.getByPlaceholderText('Add a caption (optional)...');
    await user.type(textInput, 'Here is the blanket condition');

    // Send
    const sendBtn = screen.getByTitle('Send message');
    await user.click(sendBtn);

    expect(chatApi.sendPhotoMessage).toHaveBeenCalledWith(
      'conv-1',
      mockFile,
      'Here is the blanket condition',
      expect.any(String)
    );

    // Preview bar should be gone after sending
    await waitFor(() => {
      expect(screen.queryByText('Photo Attachment')).not.toBeInTheDocument();
      expect(screen.getByText('Here is the blanket condition')).toBeInTheDocument();
    });
  });

  it('handles camera capture errors gracefully', async () => {
    const user = userEvent.setup();
    vi.mocked(cameraService.capturePhotoWithCamera).mockRejectedValueOnce(
      new Error('Camera permission denied')
    );

    renderComponent(['/messages/conv-1']);

    await waitFor(() => {
      expect(screen.getByText('Can you deliver by Friday?')).toBeInTheDocument();
    });

    const cameraBtn = screen.getByTitle('Capture photo from device camera');
    await user.click(cameraBtn);

    await waitFor(() => {
      expect(screen.getByText('Camera permission denied')).toBeInTheDocument();
    });
  });
});
