import React, { useState, forwardRef } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  leftIcon?: React.ReactNode;
  showAriaLabel?: string;
  hideAriaLabel?: string;
  containerClassName?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      leftIcon,
      showAriaLabel = 'Show password',
      hideAriaLabel = 'Hide password',
      containerClassName = '',
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);

    const toggleVisibility = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setShowPassword((prev) => !prev);
    };

    const hasLeftIcon = leftIcon !== null;
    const defaultLeftIcon = (
      <Lock className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    );

    return (
      <div className={`relative ${containerClassName}`}>
        {hasLeftIcon && (leftIcon ?? defaultLeftIcon)}
        <input
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          disabled={disabled}
          className={`w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl ${
            hasLeftIcon ? 'pl-10' : 'pl-4'
          } pr-11 py-2.5 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#7567E8] transition-colors ${className}`}
          {...props}
        />
        <button
          type="button"
          aria-label={showPassword ? hideAriaLabel : showAriaLabel}
          title={showPassword ? hideAriaLabel : showAriaLabel}
          onClick={toggleVisibility}
          disabled={disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#4B5563] focus:outline-none focus:ring-2 focus:ring-[#7567E8]/40 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Eye className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

