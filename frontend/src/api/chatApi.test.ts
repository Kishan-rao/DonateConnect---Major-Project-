import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getConversations,
  getConversation,
  createOrGetConversation,
  getMessages,
  sendTextMessage,
  sendPhotoMessage,
  markConversationRead,
  getChatUnreadCount,
  getChatAttachmentBlobUrl,
} from './chatApi';
import { apiClient } from './client';

vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('chatApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockConversation = {
    id: 'conv-123',
    donorId: 'donor-1',
    donorName: 'John Donor',
    ngoId: 'ngo-1',
    ngoName: 'Hope Foundation',
    donationId: 'donation-1',
    donationTitle: 'Winter Clothes',
    lastMessageText: 'Hello there!',
    lastMessageAt: '2026-10-27T10:00:00Z',
    unreadCount: 1,
    createdAt: '2026-10-27T09:00:00Z',
  };

  const mockMessage = {
    id: 'msg-1',
    conversationId: 'conv-123',
    senderId: 'donor-1',
    senderName: 'John Donor',
    senderRole: 'DONOR',
    content: 'Hello there!',
    attachmentUrl: null,
    attachmentType: null,
    attachmentOriginalName: null,
    clientMessageId: 'client-1',
    read: false,
    createdAt: '2026-10-27T10:00:00Z',
  };

  it('getConversations fetches conversation list', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { success: true, data: [mockConversation] },
    } as any);

    const result = await getConversations();
    expect(apiClient.get).toHaveBeenCalledWith('/chat/conversations');
    expect(result).toEqual([mockConversation]);
  });

  it('getConversation fetches a single conversation by id', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { success: true, data: mockConversation },
    } as any);

    const result = await getConversation('conv-123');
    expect(apiClient.get).toHaveBeenCalledWith('/chat/conversations/conv-123');
    expect(result).toEqual(mockConversation);
  });

  it('createOrGetConversation posts create payload and returns conversation', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { success: true, data: mockConversation },
    } as any);

    const result = await createOrGetConversation({
      ngoId: 'ngo-1',
      donationId: 'donation-1',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/chat/conversations', {
      ngoId: 'ngo-1',
      donationId: 'donation-1',
    });
    expect(result).toEqual(mockConversation);
  });

  it('getMessages fetches paginated messages for a conversation', async () => {
    const pageData = {
      content: [mockMessage],
      totalElements: 1,
      totalPages: 1,
      size: 50,
      number: 0,
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { success: true, data: pageData },
    } as any);

    const result = await getMessages('conv-123', 0, 50);
    expect(apiClient.get).toHaveBeenCalledWith(
      '/chat/conversations/conv-123/messages?page=0&size=50'
    );
    expect(result).toEqual(pageData);
  });

  it('sendTextMessage sends trimmed content and clientMessageId', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { success: true, data: mockMessage },
    } as any);

    const result = await sendTextMessage('conv-123', '  Hello there!  ', 'client-uuid-1');
    expect(apiClient.post).toHaveBeenCalledWith(
      '/chat/conversations/conv-123/messages',
      {
        content: 'Hello there!',
        clientMessageId: 'client-uuid-1',
      }
    );
    expect(result).toEqual(mockMessage);
  });

  it('sendPhotoMessage sends FormData with file, caption, and clientMessageId', async () => {
    const photoMessage = {
      ...mockMessage,
      attachmentUrl: '/api/chat/attachments/chat-photo.jpg',
      attachmentType: 'image/jpeg',
    };
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { success: true, data: photoMessage },
    } as any);

    const mockFile = new File(['dummy photo'], 'captured.jpg', { type: 'image/jpeg' });
    const result = await sendPhotoMessage(
      'conv-123',
      mockFile,
      '  Here is the photo  ',
      'client-uuid-2'
    );

    expect(apiClient.post).toHaveBeenCalledWith(
      '/chat/conversations/conv-123/attachment',
      expect.any(FormData),
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    expect(result).toEqual(photoMessage);
  });

  it('markConversationRead patches conversation read status', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({
      data: { success: true },
    } as any);

    await markConversationRead('conv-123');
    expect(apiClient.patch).toHaveBeenCalledWith('/chat/conversations/conv-123/read');
  });

  it('getChatUnreadCount returns total unread count', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { success: true, data: 4 },
    } as any);

    const count = await getChatUnreadCount();
    expect(apiClient.get).toHaveBeenCalledWith('/chat/unread-count');
    expect(count).toBe(4);
  });

  it('getChatAttachmentBlobUrl extracts filename and returns data URL from blob', async () => {
    const mockBlob = new Blob(['fake-image-bytes'], { type: 'image/jpeg' });
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: mockBlob,
    } as any);

    // Mock FileReader behavior
    const originalFileReader = globalThis.FileReader;
    class MockFileReader {
      result: string | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL(_blob: Blob) {
        this.result = 'data:image/jpeg;base64,ZmFrZS1pbWFnZS1ieXRlcw==';
        if (this.onload) this.onload();
      }
    }
    globalThis.FileReader = MockFileReader as any;

    try {
      const dataUrl = await getChatAttachmentBlobUrl('/api/chat/attachments/test-attachment.jpg');
      expect(apiClient.get).toHaveBeenCalledWith('/chat/attachments/test-attachment.jpg', {
        responseType: 'blob',
      });
      expect(dataUrl).toBe('data:image/jpeg;base64,ZmFrZS1pbWFnZS1ieXRlcw==');
    } finally {
      globalThis.FileReader = originalFileReader;
    }
  });
});
