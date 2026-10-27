import { apiClient } from './client';
import {
  ApiResponse,
  ConversationDto,
  ChatMessageDto,
  CreateConversationRequest,
  SendMessageRequest,
  PageResponse,
} from '../types';

export const getConversations = async (): Promise<ConversationDto[]> => {
  const response = await apiClient.get<ApiResponse<ConversationDto[]>>('/chat/conversations');
  return response.data?.data || [];
};

export const getConversation = async (conversationId: string): Promise<ConversationDto> => {
  const response = await apiClient.get<ApiResponse<ConversationDto>>(`/chat/conversations/${conversationId}`);
  return response.data.data;
};

export const createOrGetConversation = async (
  request: CreateConversationRequest
): Promise<ConversationDto> => {
  const response = await apiClient.post<ApiResponse<ConversationDto>>('/chat/conversations', request);
  return response.data.data;
};

export const getMessages = async (
  conversationId: string,
  page = 0,
  size = 50
): Promise<PageResponse<ChatMessageDto>> => {
  const response = await apiClient.get<ApiResponse<PageResponse<ChatMessageDto>>>(
    `/chat/conversations/${conversationId}/messages?page=${page}&size=${size}`
  );
  return response.data.data;
};

export const sendTextMessage = async (
  conversationId: string,
  content: string,
  clientMessageId?: string
): Promise<ChatMessageDto> => {
  const payload: SendMessageRequest = {
    content: content.trim(),
    clientMessageId,
  };
  const response = await apiClient.post<ApiResponse<ChatMessageDto>>(
    `/chat/conversations/${conversationId}/messages`,
    payload
  );
  return response.data.data;
};

export const sendPhotoMessage = async (
  conversationId: string,
  file: File,
  caption?: string,
  clientMessageId?: string
): Promise<ChatMessageDto> => {
  const formData = new FormData();
  formData.append('file', file);
  if (caption && caption.trim()) {
    formData.append('caption', caption.trim());
  }
  if (clientMessageId) {
    formData.append('clientMessageId', clientMessageId);
  }

  const response = await apiClient.post<ApiResponse<ChatMessageDto>>(
    `/chat/conversations/${conversationId}/attachment`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data.data;
};

export const markConversationRead = async (conversationId: string): Promise<void> => {
  await apiClient.patch<ApiResponse<void>>(`/chat/conversations/${conversationId}/read`);
};

export const getChatUnreadCount = async (): Promise<number> => {
  const response = await apiClient.get<ApiResponse<number>>('/chat/unread-count');
  return response.data?.data ?? 0;
};

/**
 * Fetch a private chat attachment using authenticated API client and return a blob/object URL.
 */
export const getChatAttachmentBlobUrl = async (attachmentUrl: string): Promise<string> => {
  if (!attachmentUrl) return '';

  // Extract filename from attachmentUrl (e.g. /api/chat/attachments/{filename})
  const filename = attachmentUrl.includes('/')
    ? attachmentUrl.substring(attachmentUrl.lastIndexOf('/') + 1)
    : attachmentUrl;

  const response = await apiClient.get<Blob>(`/chat/attachments/${filename}`, {
    responseType: 'blob',
  });

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to render chat attachment'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read chat attachment'));
    reader.readAsDataURL(response.data);
  });
};

