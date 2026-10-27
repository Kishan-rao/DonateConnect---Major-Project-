import React, { useEffect, useRef, useState } from 'react';
import { addDonationComment, getDonationComments } from '../api/donationApi';
import { Donation, DonationComment } from '../types';
import { useToast } from '../context/ToastContext';
import { Building2, MessageSquare, Send, X, Loader2 } from 'lucide-react';
import { pushModalDismiss } from '../utils/useAndroidBackButton';

export interface CommentThreadProps {
  donationId: string;
  currentUserId?: string;
  donation?: Donation | null;
  onClose?: () => void;
  title?: string;
}

export const CommentThread: React.FC<CommentThreadProps> = ({
  donationId,
  currentUserId,
  donation,
  onClose,
  title,
}) => {
  const [comments, setComments] = useState<DonationComment[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { showSuccess, showError } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchComments = async (isFirstLoad = false) => {
    if (isFirstLoad) {
      setLoading(true);
    }
    try {
      const pageResponse = await getDonationComments(donationId, 0, 100);
      setComments(pageResponse.content || []);
    } catch {
      // Ignore if unauthenticated or network drop
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset state when donationId changes
    setComments([]);
    setNewMessage('');
    fetchComments(true);

    const interval = setInterval(() => {
      fetchComments(false);
    }, 10000); // 10s polling for real-time chat

    return () => clearInterval(interval);
  }, [donationId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (!loading && comments.length > 0) {
      if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [comments.length, loading]);

  // Handle ESC key and Android back button to close modal
  useEffect(() => {
    if (!onClose) return;
    const cleanupBack = pushModalDismiss(onClose);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      cleanupBack();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newMessage.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      const created = await addDonationComment(donationId, trimmed);
      setComments((prev) => [...prev, created]);
      setNewMessage('');
      showSuccess('Message sent successfully');
    } catch {
      showError('Failed to post message');
    } finally {
      setSubmitting(false);
    }
  };

  const ngoName = donation?.ngo?.name || 'NGO Partner';
  const chatTitle = title || `Chat with ${ngoName}`;
  const donationShortId = donationId ? donationId.slice(0, 8) : '';
  const category = donation?.category;

  const content = (
    <div
      className="w-full max-w-lg sm:max-w-xl h-[88dvh] max-h-[88dvh] sm:h-[580px] sm:max-h-[85vh] bg-white rounded-t-2xl sm:rounded-2xl border border-[#E5E7EB] shadow-2xl flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom,0px)]"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3 sm:px-5 sm:py-3.5 bg-white shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#7567E8]/10 text-[#7567E8] flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3
              id="chat-modal-title"
              className="text-sm sm:text-base font-extrabold text-[#111827] truncate leading-snug"
              title={chatTitle}
            >
              {chatTitle}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-[#4B5563] truncate mt-0.5">
              <span>Donation #{donationShortId}</span>
              {category && (
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-purple-50 text-[#7567E8] border border-purple-200">
                  {category}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#4B5563] hidden xs:inline-block">
            {comments.length} {comments.length === 1 ? 'msg' : 'msgs'}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close chat"
              className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] active:scale-95 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Conversation Area */}
      <div
        data-testid="conversation-area"
        className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-5 space-y-3 bg-[#F9FAFB]/50"
      >
        {loading ? (
          <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-xs text-[#6B7280] gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#7567E8]" />
            <span>Loading messages...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center p-4">
            <div className="w-12 h-12 rounded-2xl bg-[#7567E8]/10 text-[#7567E8] flex items-center justify-center mb-2.5">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-[#111827]">No messages yet</p>
            <p className="text-xs text-[#6B7280] max-w-xs mt-1 leading-relaxed">
              Send a note to coordinate pickup timing, instructions, or ask questions.
            </p>
          </div>
        ) : (
          comments.map((comment) => {
            const isMe = currentUserId === comment.author.id;
            return (
              <div
                key={comment.id}
                data-testid={`comment-${comment.id}`}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[11px] text-[#6B7280]">
                  <span className="font-semibold text-[#374151]">{comment.author.fullName}</span>
                  <span className="text-[10px] bg-[#F3F4F6] text-[#7567E8] px-1.5 py-0.2 rounded font-mono font-bold">
                    {comment.author.role}
                  </span>
                  <span>
                    •{' '}
                    {new Date(comment.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div
                  className={`p-3 rounded-2xl text-xs sm:text-sm max-w-[85%] leading-relaxed break-words shadow-xs ${
                    isMe
                      ? 'bg-[#7567E8] text-white rounded-tr-xs'
                      : 'bg-white text-[#111827] border border-[#E5E7EB] rounded-tl-xs'
                  }`}
                >
                  {comment.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <div className="p-3 sm:p-4 bg-white border-t border-[#E5E7EB] shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message or pickup note..."
            className="flex-1 min-w-0 bg-[#F9FAFB] focus:bg-white border border-[#E5E7EB] focus:border-[#7567E8] rounded-xl px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm text-[#111827] placeholder-[#9CA3AF] transition-all outline-none"
            maxLength={1000}
            disabled={submitting}
            aria-label="Type message"
          />
          <button
            type="submit"
            disabled={submitting || !newMessage.trim()}
            className="min-h-[42px] sm:min-h-[46px] min-w-[72px] sm:min-w-[84px] px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-[#7567E8] hover:bg-[#6355d8] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shrink-0 transition-all shadow-xs active:scale-95"
            aria-label="Send message"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Send</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );

  if (onClose) {
    return (
      <div
        data-testid="chat-modal-backdrop"
        className="fixed inset-0 z-50 bg-[#111827]/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-modal-title"
      >
        {content}
      </div>
    );
  }

  return content;
};
