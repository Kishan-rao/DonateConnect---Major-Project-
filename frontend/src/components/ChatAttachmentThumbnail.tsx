import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { getChatAttachmentBlobUrl } from '../api/chatApi';

interface ChatAttachmentThumbnailProps {
  attachmentUrl: string;
  onOpenViewer: (url: string) => void;
}

export const ChatAttachmentThumbnail: React.FC<ChatAttachmentThumbnailProps> = ({
  attachmentUrl,
  onOpenViewer,
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const fetchImage = async () => {
    if (!attachmentUrl) return;
    setLoading(true);
    setError(false);
    try {
      const url = await getChatAttachmentBlobUrl(attachmentUrl);
      setDataUrl(url);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const url = await getChatAttachmentBlobUrl(attachmentUrl);
        if (isMounted) {
          setDataUrl(url);
          setLoading(false);
        }
      } catch {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [attachmentUrl]);

  if (loading) {
    return (
      <div className="w-48 h-36 rounded-xl bg-slate-100 flex flex-col items-center justify-center gap-1.5 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin text-[#7567E8]" />
        <span className="text-[11px] font-medium">Loading photo...</span>
      </div>
    );
  }

  if (error || !dataUrl) {
    return (
      <div className="w-48 h-36 rounded-xl bg-rose-50 border border-rose-200 flex flex-col items-center justify-center p-2 text-center text-rose-600 gap-1.5">
        <AlertCircle className="w-5 h-5" />
        <span className="text-[11px] font-semibold">Failed to load photo</span>
        <button
          onClick={fetchImage}
          className="text-[10px] font-bold text-[#7567E8] hover:underline flex items-center gap-1 mt-0.5"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => onOpenViewer(dataUrl)}
      className="relative group cursor-pointer overflow-hidden rounded-xl border border-slate-200/60 shadow-xs hover:shadow-md transition-all max-w-[240px]"
    >
      <img
        src={dataUrl}
        alt="Photo attachment"
        className="w-full h-auto max-h-56 object-cover rounded-xl transition-transform duration-200 group-hover:scale-102"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center">
        <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs">
          Tap to view
        </span>
      </div>
    </div>
  );
};
