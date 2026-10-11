import React from 'react';

interface StatusToggleProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

export const StatusToggle: React.FC<StatusToggleProps> = ({
  id,
  label,
  description,
  checked,
  disabled = false,
  onChange,
}) => {
  return (
    <div className="flex items-center justify-between py-3 px-1 border-b border-gray-100 last:border-0">
      <div className="flex-1 pr-4">
        <label
          htmlFor={id}
          className="text-sm font-medium text-gray-900 cursor-pointer block"
        >
          {label}
        </label>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <span
          className={`text-xs font-semibold uppercase tracking-wider w-8 text-right select-none ${
            checked ? 'text-emerald-600' : 'text-rose-600'
          }`}
        >
          {checked ? 'ON' : 'OFF'}
        </span>

        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          } ${checked ? 'bg-emerald-600' : 'bg-rose-500'}`}
        >
          <span className="sr-only">{label}</span>
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              checked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
};
