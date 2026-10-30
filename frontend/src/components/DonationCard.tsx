import React, { useState } from 'react';
import { Donation, DonationStatus } from '../types';
import { formatDate, getCategoryBadgeColor } from '../utils/formatters';
import { Tag, User, Building2, Image as ImageIcon } from 'lucide-react';
import { getPhotoUrl, hasValidPhotos } from '../utils/photoHelper';
import { PhotoViewerModal } from './PhotoViewerModal';

interface DonationCardProps {
  donation: Donation;
  onStatusChange?: (id: string, newStatus: DonationStatus) => void;
  isNgoView?: boolean;
}

export const DonationCard: React.FC<DonationCardProps> = ({ donation, onStatusChange, isNgoView }) => {
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const getStatusBadgeStyle = (status: DonationStatus) => {
    switch (status) {
      case 'ACCEPTED':
      case 'DELIVERED':
        return 'bg-[#E6F4EA] text-[#047857] border-[#A7F3D0]';
      case 'REJECTED':
        return 'bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]';
      case 'PICKED_UP':
      case 'REQUESTED':
      default:
        return 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]';
    }
  };

  return (
    <div className="group bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 hover:bg-[#F4F2FA] hover:border-[#7567E8] transition-all duration-300 shadow-[0_10px_15px_-3px_rgba(17,24,39,0.04)] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1 shrink-0 ${getCategoryBadgeColor(
              donation.category
            )}`}
          >
            <Tag className="w-3 h-3" />
            {donation.category}
          </span>
          <span className={`text-[11px] font-bold tracking-wider px-2.5 py-0.5 rounded border shrink-0 ${getStatusBadgeStyle(donation.status)}`}>
            {donation.status}
          </span>
        </div>

        <h3 className="text-base sm:text-lg font-extrabold text-[#111827] mb-1 group-hover:text-[#7567E8] transition-colors break-words">
          {donation.category} Donation Request
        </h3>

        <p className="text-[#4B5563] text-sm mb-4 line-clamp-3 leading-relaxed">
          {donation.description || 'No detailed description provided.'}
        </p>

        {hasValidPhotos(donation.photoUrls) ? (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
            {donation.photoUrls.map((url, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPhotoIndex(idx);
                  setPhotoViewerOpen(true);
                }}
                className="group relative rounded-lg overflow-hidden border border-[#E5E7EB] hover:border-[#7567E8] transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-[#7567E8]"
                aria-label={`View photo ${idx + 1} full size`}
              >
                <img
                  src={getPhotoUrl(url)}
                  alt="Donation attachment"
                  className="w-14 h-14 object-cover group-hover:scale-105 transition-transform"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (!target.src.endsWith('/placeholder-donation.svg')) {
                      target.src = '/placeholder-donation.svg';
                    }
                  }}
                />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280] italic py-1 mb-3">
            <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
            <span>No photos attached</span>
          </div>
        )}
      </div>

      <div className="border-t border-[#E5E7EB] pt-3.5 mt-2 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
          <div className="flex items-center gap-1.5 text-[#111827] min-w-0">
            <Building2 className="w-3.5 h-3.5 text-[#7567E8] shrink-0" />
            <span className="font-extrabold truncate">{donation.ngo?.name || 'NGO Partner'}</span>
          </div>

          <div className="flex items-center gap-1 text-[#4B5563] min-w-0">
            <User className="w-3.5 h-3.5 text-[#7567E8] shrink-0" />
            <span className="truncate">{donation.donor?.fullName}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-[#6B7280]">
          <span>Created: {formatDate(donation.createdAt)}</span>
          {donation.pickupDate && <span>Pickup: {donation.pickupDate}</span>}
        </div>

        {isNgoView && onStatusChange && (
          <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-[#F3F4F6]">
            <span className="text-[10px] font-bold text-[#4B5563] uppercase">Update Status:</span>
            <select
              value={donation.status}
              onChange={(e) => onStatusChange(donation.id, e.target.value as DonationStatus)}
              className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-xs text-[#7567E8] font-bold focus:outline-none focus:border-[#7567E8] min-h-[36px]"
            >
              <option value="REQUESTED">REQUESTED</option>
              <option value="ACCEPTED">ACCEPTED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="PICKED_UP">PICKED_UP</option>
              <option value="DELIVERED">DELIVERED</option>
            </select>
          </div>
        )}
      </div>

      <PhotoViewerModal
        isOpen={photoViewerOpen}
        photos={donation.photoUrls || []}
        initialIndex={selectedPhotoIndex}
        onClose={() => setPhotoViewerOpen(false)}
        title={`${donation.category} Donation Photo`}
      />
    </div>
  );
};
