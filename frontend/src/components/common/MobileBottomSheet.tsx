import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string; // desktop max width, e.g. 'max-w-xl'
}

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidthClass = 'max-w-xl',
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    // Prevent body scrolling when sheet is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-backdrop-fade">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#111827]/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Content: Anchored Bottom Sheet on Mobile, Centered Modal on Desktop */}
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        className={`relative z-10 w-full ${maxWidthClass} bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden border border-[#E5E7EB] animate-bottom-sheet sm:animate-none safe-pb sm:pb-0 mx-auto sm:my-6`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator Handle */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
          <div className="w-12 h-1.5 rounded-full bg-[#D1D5DB]" />
        </div>

        {/* Sheet Header */}
        {(title || icon) && (
          <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-[#E5E7EB] flex items-center justify-between gap-3 bg-[#FAF8F5]/80">
            <div className="flex items-center gap-3 min-w-0">
              {icon && <div className="shrink-0">{icon}</div>}
              <div className="min-w-0">
                {title && (
                  <h3 className="text-base sm:text-lg font-extrabold text-[#111827] truncate leading-tight">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-xs text-[#6B7280] truncate mt-0.5">{subtitle}</p>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center text-[#6B7280] hover:text-[#111827] hover:bg-[#F4F2FA] transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Sheet Scrollable Body */}
        <div className="px-5 sm:px-6 py-4 overflow-y-auto flex-1 overscroll-contain">
          {children}
        </div>

        {/* Sheet Footer (if present) */}
        {footer && (
          <div className="px-5 sm:px-6 py-3.5 border-t border-[#E5E7EB] bg-[#FAF8F5]/60 flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
