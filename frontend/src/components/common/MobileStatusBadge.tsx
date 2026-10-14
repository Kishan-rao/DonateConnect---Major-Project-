import React from 'react';
import { DonationStatus } from '../../types';

interface MobileStatusBadgeProps {
  status: DonationStatus | string;
  size?: 'sm' | 'md';
}

export const MobileStatusBadge: React.FC<MobileStatusBadgeProps> = ({
  status,
  size = 'md',
}) => {
  const getStyle = () => {
    switch (status) {
      case 'ACCEPTED':
        return 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]';
      case 'DELIVERED':
        return 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]';
      case 'REJECTED':
        return 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]';
      case 'PICKED_UP':
        return 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]';
      case 'REQUESTED':
      default:
        return 'bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]';
    }
  };

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px] tracking-wide'
      : 'px-2.5 py-1 text-xs tracking-wider';

  return (
    <span
      className={`inline-flex items-center font-bold uppercase rounded-lg border shadow-xs ${sizeClasses} ${getStyle()}`}
    >
      {status}
    </span>
  );
};
