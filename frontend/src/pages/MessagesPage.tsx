import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  Camera,
  X,
  RotateCcw,
  ArrowLeft,
  Search,
  Check,
  CheckCheck,
  Loader2,
  AlertCircle,
  Building2,
  User as UserIcon,
  Plus,
  RefreshCw,
  HeartHandshake,
  ShieldCheck,
} from 'lucide-react';
import {
  getConversations,
  getConversation,
  createOrGetConversation,
  getMessages,
  sendTextMessage,
  sendPhotoMessage,
  markConversationRead,
} from '../api/chatApi';
import { getVerifiedNgos } from '../api/ngoApi';
import { ConversationDto, ChatMessageDto, NGOProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatRelativeTime } from '../utils/formatters';
import { capturePhotoWithCamera, CapturedPhoto } from '../utils/cameraService';
import { ChatAttachmentThumbnail } from '../components/ChatAttachmentThumbnail';
import { PhotoViewerModal } from '../components/PhotoViewerModal';

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // State
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationDto | null>(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [loadingConversations, setLoadingConversations] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  // Search & New Chat
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showNewChatModal, setShowNewChatModal] = useState<boolean>(false);
  const [ngosList, setNgosList] = useState<NGOProfile[]>([]);
  const [loadingNgos, setLoadingNgos] = useState<boolean>(false);

  // Composer
  const [inputText, setInputText] = useState<string>('');
  const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(null);
  const [capturingPhoto, setCapturingPhoto] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Full-size Photo Viewer Modal
  const [viewerPhotoUrl, setViewerPhotoUrl] = useState<string | null>(null);

  // Refs for tracking active requests & unmounts
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  const isSendingRef = useRef<boolean>(false);

  const isDonor = user?.role === 'DONOR';
  const isNgo = user?.role === 'NGO';

  // 1. Fetch Conversations List
  const fetchConversationsList = useCallback(async (quiet = false) => {
    if (!quiet) setLoadingConversations(true);
    setConversationsError(null);
    try {
      const data = await getConversations();
      setConversations(data);
    } catch (err: any) {
      if (!quiet) {
        setConversationsError(err?.message || 'Failed to load conversations.');
      }
    } finally {
      if (!quiet) setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    fetchConversationsList();
    const interval = setInterval(() => {
      fetchConversationsList(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchConversationsList]);

  // 2. Handle URL parameters (direct link to a conversation or new chat with ?ngoId=..., ?donorId=... or ?donationId=...)
  useEffect(() => {
    const targetNgoId = searchParams.get('ngoId');
    const targetDonorId = searchParams.get('donorId');
    const targetDonationId = searchParams.get('donationId');

    if (targetNgoId || targetDonorId || targetDonationId) {
      (async () => {
        try {
          const conv = await createOrGetConversation({
            ngoId: targetNgoId || undefined,
            donorId: targetDonorId || undefined,
            donationId: targetDonationId || undefined,
          });
          navigate(`/messages/${conv.id}`, { replace: true });
        } catch (err) {
          console.error('Failed to initiate conversation from params:', err);
        }
      })();
    }
  }, [searchParams, navigate]);

  // 3. Handle Active Conversation Change
  useEffect(() => {
    activeConversationIdRef.current = conversationId || null;

    if (!conversationId) {
      setActiveConversation(null);
      setMessages([]);
      return;
    }

    let isMounted = true;
    setLoadingMessages(true);
    setMessagesError(null);

    // Fetch conversation details and messages
    (async () => {
      try {
        const [conv, msgPage] = await Promise.all([
          getConversation(conversationId),
          getMessages(conversationId, 0, 50),
        ]);

        if (!isMounted || activeConversationIdRef.current !== conversationId) return;

        setActiveConversation(conv);
        setMessages(msgPage.content);
        markConversationRead(conversationId).catch(() => {});
      } catch (err: any) {
        if (!isMounted || activeConversationIdRef.current !== conversationId) return;
        setMessagesError(err?.message || 'Failed to load messages.');
      } finally {
        if (isMounted && activeConversationIdRef.current === conversationId) {
          setLoadingMessages(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [conversationId]);

  // 4. Bounded Polling for Active Messages (every 3.5 seconds)
  useEffect(() => {
    if (!conversationId) return;

    const interval = setInterval(async () => {
      if (document.hidden || isSendingRef.current) return;
      try {
        const msgPage = await getMessages(conversationId, 0, 50);
        if (activeConversationIdRef.current === conversationId) {
          setMessages((prev) => {
            // Only update if count or IDs changed to avoid unnecessary re-renders
            if (prev.length !== msgPage.content.length || (prev.length > 0 && prev[prev.length - 1].id !== msgPage.content[msgPage.content.length - 1]?.id)) {
              return msgPage.content;
            }
            return prev;
          });
        }
      } catch {
        // Silently swallow polling errors to prevent disruptive UI flickers
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [conversationId]);

  // 5. Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0 && typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // 6. Camera Photo Capture (Strictly Camera-Only)
  const handleOpenNativeCamera = async () => {
    if (capturingPhoto || sending) return;
    setCapturingPhoto(true);
    setCameraError(null);

    try {
      const result = await capturePhotoWithCamera('chat-photo');
      if (result) {
        setCapturedPhoto(result);
      }
    } catch (err: any) {
      setCameraError(err?.message || 'Could not access device camera.');
    } finally {
      setCapturingPhoto(false);
    }
  };

  const handleCancelCapturedPhoto = () => {
    if (capturedPhoto?.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(capturedPhoto.previewUrl);
    }
    setCapturedPhoto(null);
    setCameraError(null);
  };

  // 7. Send Message (Text or Photo Attachment)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!conversationId || sending || isSendingRef.current) return;

    const text = inputText.trim();
    if (!text && !capturedPhoto) return;

    setSending(true);
    isSendingRef.current = true;
    setMessagesError(null);

    const clientMsgId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      let newMsg: ChatMessageDto;

      if (capturedPhoto) {
        newMsg = await sendPhotoMessage(conversationId, capturedPhoto.file, text || undefined, clientMsgId);
        handleCancelCapturedPhoto();
      } else {
        newMsg = await sendTextMessage(conversationId, text, clientMsgId);
      }

      setInputText('');
      setMessages((prev) => [...prev, newMsg]);
      fetchConversationsList(true);
    } catch (err: any) {
      setMessagesError(err?.message || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
      isSendingRef.current = false;
    }
  };

  // 8. Open New Chat Modal (NGO selection for Donors)
  const handleOpenNewChat = async () => {
    setShowNewChatModal(true);
    if (isDonor && ngosList.length === 0) {
      setLoadingNgos(true);
      try {
        const ngos = await getVerifiedNgos();
        setNgosList(ngos);
      } catch (err) {
        console.error('Failed to load NGOs:', err);
      } finally {
        setLoadingNgos(false);
      }
    }
  };

  const handleSelectNgoForChat = async (ngoId: string) => {
    setShowNewChatModal(false);
    try {
      const conv = await createOrGetConversation({ ngoId });
      navigate(`/messages/${conv.id}`);
    } catch (err: any) {
      setConversationsError(err?.message || 'Failed to start conversation.');
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) =>
    (c.otherParticipantName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.lastMessageText && c.lastMessageText.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="py-4 sm:py-6 max-w-6xl mx-auto safe-pt safe-pb">
      {/* Full-size Photo Viewer Modal */}
      <PhotoViewerModal
        isOpen={Boolean(viewerPhotoUrl)}
        photos={viewerPhotoUrl ? [viewerPhotoUrl] : []}
        title="Photo Attachment"
        onClose={() => setViewerPhotoUrl(null)}
      />

      {/* Main Container */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col md:flex-row h-[calc(100vh-140px)] min-h-[500px]">
        {/* ==================== LEFT COLUMN: Conversation List ==================== */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-[#E5E7EB] flex flex-col shrink-0 ${
            conversationId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-[#E5E7EB] bg-[#FAF8F5]/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#7567E8]" />
              <h1 className="text-base font-extrabold text-[#111827]">Messages</h1>
            </div>
            {isDonor && (
              <button
                onClick={handleOpenNewChat}
                className="p-2 rounded-xl bg-[#7567E8]/10 hover:bg-[#7567E8]/20 text-[#7567E8] transition-colors flex items-center gap-1 text-xs font-bold"
                title="Start new conversation with an NGO"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Chat</span>
              </button>
            )}
          </div>

          {/* Search bar */}
          <div className="p-3 border-b border-[#E5E7EB] bg-white">
            <div className="relative">
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7567E8]/30 focus:border-[#7567E8]"
              />
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#E5E7EB]">
            {loadingConversations ? (
              <div className="p-8 text-center text-[#6B7280] flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#7567E8]" />
                <span className="text-xs">Loading conversations...</span>
              </div>
            ) : conversationsError ? (
              <div className="p-6 text-center text-rose-600 space-y-2">
                <AlertCircle className="w-6 h-6 mx-auto" />
                <p className="text-xs font-semibold">{conversationsError}</p>
                <button
                  onClick={() => fetchConversationsList(false)}
                  className="px-3 py-1 bg-[#7567E8] text-white text-xs font-bold rounded-lg hover:bg-[#6355d8]"
                >
                  Retry
                </button>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-10 text-center text-[#6B7280] space-y-3 flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 rounded-full bg-[#7567E8]/10 flex items-center justify-center text-[#7567E8]">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111827]">No conversations yet</h3>
                  <p className="text-xs text-[#6B7280] mt-1 max-w-xs">
                    {isDonor
                      ? 'Reach out to an NGO partner regarding your donations or community needs.'
                      : 'Conversations with donors will appear here as donations are scheduled.'}
                  </p>
                </div>
                {isDonor && (
                  <button
                    onClick={handleOpenNewChat}
                    className="mt-2 px-4 py-2 bg-[#7567E8] text-white text-xs font-bold rounded-xl shadow-sm hover:bg-[#6355d8] transition-colors"
                  >
                    Find an NGO to Message
                  </button>
                )}
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === conversationId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => navigate(`/messages/${conv.id}`)}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors text-left ${
                      isSelected
                        ? 'bg-[#7567E8]/10 border-l-4 border-[#7567E8]'
                        : 'hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#7567E8] text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {conv.otherParticipantName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-[#111827] truncate">
                          {conv.otherParticipantName}
                        </h4>
                        <span className="text-[10px] text-[#9CA3AF] shrink-0">
                          {conv.lastMessageAt ? formatRelativeTime(conv.lastMessageAt) : ''}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-bold text-[#7567E8] uppercase tracking-wider">
                          {conv.otherParticipantRole}
                        </span>
                        {conv.ngoVerified && (
                          <span className="text-[10px] text-emerald-600 flex items-center gap-0.5 font-semibold">
                            <ShieldCheck className="w-3 h-3" /> Verified
                          </span>
                        )}
                      </div>

                      {conv.donationCategory && (
                        <span className="inline-block px-1.5 py-0.2 mt-1 bg-slate-100 text-[#4B5563] text-[9px] font-bold rounded">
                          Donation: {conv.donationCategory}
                        </span>
                      )}

                      <p className="text-xs text-[#6B7280] truncate mt-1">
                        {conv.lastMessageText || 'No messages yet'}
                      </p>
                    </div>

                    {conv.unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-[#7567E8] text-white font-bold text-[10px] rounded-full shrink-0 mt-1">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ==================== RIGHT COLUMN: Active Chat View ==================== */}
        <div
          className={`flex-1 flex flex-col bg-[#F9FAFB]/50 ${
            conversationId ? 'flex' : 'hidden md:flex'
          }`}
        >
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-3.5 sm:p-4 border-b border-[#E5E7EB] bg-white flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => navigate('/messages')}
                    className="p-1.5 -ml-1 text-[#4B5563] hover:text-[#111827] rounded-lg md:hidden"
                    title="Back to conversations"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-9 h-9 rounded-full bg-[#7567E8] text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {activeConversation.otherParticipantName.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-[#111827] truncate flex items-center gap-1.5">
                      {activeConversation.otherParticipantName}
                      {activeConversation.ngoVerified && (
                        <span title="Verified NGO">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        </span>
                      )}
                    </h2>
                    <div className="flex items-center gap-2 text-[11px] text-[#6B7280]">
                      <span className="font-semibold text-[#7567E8]">
                        {activeConversation.otherParticipantRole}
                      </span>
                      {activeConversation.ngoCity && (
                        <span>• {activeConversation.ngoCity}</span>
                      )}
                    </div>
                  </div>
                </div>

                {activeConversation.donationCategory && (
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-bold border border-purple-200">
                    <HeartHandshake className="w-3.5 h-3.5" />
                    <span>Donation: {activeConversation.donationCategory}</span>
                  </div>
                )}
              </div>

              {/* Message Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="flex flex-col items-center justify-center h-full text-[#6B7280] gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-[#7567E8]" />
                    <span className="text-xs">Loading message history...</span>
                  </div>
                ) : messagesError ? (
                  <div className="p-4 text-center text-rose-600 bg-rose-50 rounded-xl border border-rose-200 text-xs font-medium">
                    {messagesError}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-[#6B7280] space-y-2">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-semibold text-[#111827]">No messages in this chat yet</p>
                    <p className="text-[11px] text-[#6B7280] max-w-xs">
                      Send a message or snap a photo from your camera to get started.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOutgoing = msg.senderId === user?.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs space-y-1.5 ${
                            isOutgoing
                              ? 'bg-[#7567E8] text-white rounded-br-xs'
                              : 'bg-white text-[#111827] border border-[#E5E7EB] rounded-bl-xs'
                          }`}
                        >
                          {/* Attachment (if present) */}
                          {msg.attachmentUrl && (
                            <div className="pt-0.5">
                              <ChatAttachmentThumbnail
                                attachmentUrl={msg.attachmentUrl}
                                onOpenViewer={(url) => setViewerPhotoUrl(url)}
                              />
                            </div>
                          )}

                          {/* Text content */}
                          {msg.content && (
                            <p className="whitespace-pre-wrap break-words leading-relaxed text-xs">
                              {msg.content}
                            </p>
                          )}

                          {/* Footer: timestamp + read check */}
                          <div
                            className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                              isOutgoing ? 'text-white/75' : 'text-[#9CA3AF]'
                            }`}
                          >
                            <span>{formatRelativeTime(msg.createdAt)}</span>
                            {isOutgoing && (
                              <span>
                                {msg.read ? (
                                  <span title="Read">
                                    <CheckCheck className="w-3 h-3 text-emerald-300" />
                                  </span>
                                ) : (
                                  <span title="Sent">
                                    <Check className="w-3 h-3" />
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Photo Attachment Preview Bar (above composer when photo is captured) */}
              {capturedPhoto && (
                <div className="p-3 bg-slate-50 border-t border-[#E5E7EB] flex items-center justify-between gap-3 animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <img
                      src={capturedPhoto.previewUrl}
                      alt="Captured preview"
                      className="w-14 h-14 object-cover rounded-xl border border-slate-300 shadow-xs"
                    />
                    <div>
                      <span className="text-xs font-bold text-[#111827] block">Photo Attachment</span>
                      <span className="text-[10px] text-[#6B7280]">
                        Captured from camera • {(capturedPhoto.file.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenNativeCamera}
                      disabled={capturingPhoto || sending}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg border border-[#7567E8] text-[#7567E8] bg-white hover:bg-[#7567E8]/10 transition-colors flex items-center gap-1"
                      title="Retake Photo"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Retake
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelCapturedPhoto}
                      disabled={sending}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 transition-colors flex items-center gap-1"
                      title="Cancel Attachment"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Camera Error Alert */}
              {cameraError && (
                <div className="px-4 py-2 bg-rose-50 border-t border-rose-200 text-rose-700 text-xs flex items-center justify-between">
                  <span>{cameraError}</span>
                  <button onClick={() => setCameraError(null)} className="font-bold text-rose-900 ml-2">
                    Dismiss
                  </button>
                </div>
              )}

              {/* Message Composer */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white border-t border-[#E5E7EB] flex items-center gap-2"
              >
                {/* Native Device Camera Button (Camera-Only) */}
                <button
                  type="button"
                  onClick={handleOpenNativeCamera}
                  disabled={capturingPhoto || sending}
                  className="p-2.5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] hover:bg-[#F4F2FA] text-[#7567E8] transition-colors flex items-center justify-center shrink-0 min-w-[40px] min-h-[40px]"
                  title="Capture photo from device camera"
                  aria-label="Capture photo from device camera"
                >
                  {capturingPhoto ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#7567E8]" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>

                {/* Text Input */}
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={capturedPhoto ? 'Add a caption (optional)...' : 'Type a message...'}
                  maxLength={2000}
                  disabled={sending}
                  className="flex-1 py-2.5 px-3.5 text-xs bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7567E8]/30 focus:border-[#7567E8] min-h-[40px]"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={sending || (!inputText.trim() && !capturedPhoto)}
                  className="px-4 py-2.5 bg-[#7567E8] hover:bg-[#6355d8] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 min-h-[40px]"
                  title="Send message"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Send</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#6B7280] space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-[#7567E8]/10 text-[#7567E8] flex items-center justify-center">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold text-[#111827]">Your Conversations</h3>
              <p className="text-xs text-[#6B7280] max-w-sm">
                Select a conversation on the left to view message history, or initiate a new chat with an NGO partner.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Modal for Donors */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-[#E5E7EB]">
            <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#FAF8F5]">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#7567E8]" />
                <h3 className="text-sm font-bold text-[#111827]">Message an NGO</h3>
              </div>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 max-h-80 overflow-y-auto space-y-2">
              {loadingNgos ? (
                <div className="p-8 text-center text-[#6B7280] flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#7567E8]" />
                  <span className="text-xs">Loading NGO partners...</span>
                </div>
              ) : ngosList.length === 0 ? (
                <p className="text-xs text-[#6B7280] text-center p-6">No NGO partners available.</p>
              ) : (
                ngosList.map((ngo) => (
                  <div
                    key={ngo.id}
                    onClick={() => handleSelectNgoForChat(ngo.id)}
                    className="p-3 rounded-xl border border-[#E5E7EB] hover:border-[#7567E8] hover:bg-[#7567E8]/5 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
                        {ngo.name}
                        {ngo.verified && (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                      </h4>
                      <p className="text-[11px] text-[#6B7280]">{ngo.city || ngo.address}</p>
                    </div>
                    <span className="text-xs font-bold text-[#7567E8]">Chat</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
