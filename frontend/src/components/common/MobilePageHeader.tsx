import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface MobilePageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
}

export const MobilePageHeader: React.FC<MobilePageHeaderProps> = ({
  title,
  subtitle,
  badge,
  icon,
  showBack = false,
  onBack,
  actions,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-1">
      <div className="flex items-start gap-3 min-w-0">
        {showBack && (
          <button
            onClick={handleBack}
            aria-label="Go back"
            className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-white border border-[#E5E7EB] text-[#4B5563] hover:text-[#111827] hover:bg-[#F4F2FA] flex items-center justify-center transition-colors shadow-sm shrink-0 mt-0.5"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        {icon && !showBack && (
          <div className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-[#7567E8]/10 border border-[#7567E8]/20 text-[#7567E8] flex items-center justify-center shrink-0 mt-0.5">
            {icon}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#111827] tracking-tight truncate leading-tight">
              {title}
            </h1>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-[#4B5563] mt-0.5 line-clamp-2">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 w-full sm:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
};
