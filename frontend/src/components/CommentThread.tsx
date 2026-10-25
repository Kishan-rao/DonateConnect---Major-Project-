import React, { useEffect, useState } from 'react';
import { addDonationComment, getDonationComments } from '../api/donationApi';
import { DonationComment } from '../types';
import { useToast } from '../context/ToastContext';

interface CommentThreadProps {
  donationId: string;
  currentUserId?: string;
}

export const CommentThread: React.FC<CommentThreadProps> = ({ donationId, currentUserId }) => {
  const [comments, setComments] = useState<DonationComment[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { showSuccess, showError } = useToast();

  const fetchComments = async () => {
    try {
      const pageResponse = await getDonationComments(donationId, 0, 100);
      setComments(pageResponse.content);
    } catch {
      // Ignore if unauthenticated
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
    const interval = setInterval(fetchComments, 10000); // 10s polling for real-time chat
    return () => clearInterval(interval);
  }, [donationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSubmitting(true);
    try {
      const created = await addDonationComment(donationId, newMessage.trim());
      setComments((prev) => [...prev, created]);
      setNewMessage('');
      showSuccess('Comment sent successfully');
    } catch {
      showError('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex flex-col h-full min-h-[300px]">
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3 mb-3">
        <h4 className="text-sm font-bold text-[#111827] flex items-center gap-2">
          💬 Donation Direct Chat & Coordination Notes
        </h4>
        <span className="text-xs text-[#6B7280]">{comments.length} message(s)</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[260px] mb-4">
        {loading ? (
          <div className="text-xs text-[#6B7280] text-center py-6">Loading messages...</div>
        ) : comments.length === 0 ? (
          <div className="text-xs text-[#6B7280] text-center py-6">
            No direct messages yet. Send a note to coordinate pickup timing or instructions.
          </div>
        ) : (
          comments.map((comment) => {
            const isMe = currentUserId === comment.author.id;
            return (
              <div
                key={comment.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[11px] text-[#6B7280]">
                  <span className="font-semibold text-[#374151]">{comment.author.fullName}</span>
                  <span className="text-[10px] bg-[#F3F4F6] text-[#7567E8] px-1.5 py-0.2 rounded font-mono font-bold">
                    {comment.author.role}
                  </span>
                  <span>• {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div
                  className={`p-3 rounded-xl text-xs max-w-[85%] leading-relaxed ${
                    isMe
                      ? 'bg-[#7567E8] text-white rounded-tr-none shadow-xs'
                      : 'bg-[#F9FAFB] text-[#111827] border border-[#E5E7EB] rounded-tl-none'
                  }`}
                >
                  {comment.message}
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-2 border-t border-[#E5E7EB]">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message or pickup note..."
          className="flex-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#7567E8]"
          maxLength={1000}
          disabled={submitting}
        />
        <button
          type="submit"
          disabled={submitting || !newMessage.trim()}
          className="bg-[#7567E8] hover:bg-[#7567E8]/90 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-xs"
        >
          {submitting ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
};
