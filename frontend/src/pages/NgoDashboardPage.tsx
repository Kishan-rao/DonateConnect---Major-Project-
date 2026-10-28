import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNgoAssignedDonations, updateDonationStatusByNgo, getDeliveryOtp, regenerateDeliveryOtp } from '../api/donationApi';
import { Donation, DonationStatus } from '../types';
import { formatDate } from '../utils/formatters';
import { getPhotoUrl, hasValidPhotos } from '../utils/photoHelper';
import { PhotoViewerModal } from '../components/PhotoViewerModal';
import {
  Building2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Truck,
  PackageCheck,
  User,
  Calendar,
  Tag,
  Filter,
  Inbox,
  Navigation,
  KeyRound,
  Eye,
  EyeOff,
  RotateCcw,
  Image as ImageIcon,
  MessageSquare
} from 'lucide-react';

import { useToast } from '../context/ToastContext';

export const NgoDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Photo viewer modal state
  const [viewerPhotos, setViewerPhotos] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number>(0);
  const [viewerTitle, setViewerTitle] = useState<string | undefined>(undefined);
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);
  const [otpLoadingId, setOtpLoadingId] = useState<string | null>(null);
  const [otpData, setOtpData] = useState<Record<string, string>>({});

  const fetchDonations = async () => {
    setLoading(true);
    setError(null);
    try {
      const pageResponse = await getNgoAssignedDonations(0, 100);
      const data = pageResponse.content;
      // Sort newest first
      const sorted = [...data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setDonations(sorted);
    } catch (err: any) {
      setError(err.message || 'Failed to load assigned donations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  const handleStatusUpdate = async (id: string, newStatus: DonationStatus) => {
    setActionLoadingId(id);
    try {
      const updated = await updateDonationStatusByNgo(id, newStatus);
      setDonations((prev) => prev.map((d) => (d.id === id ? updated : d)));
      showSuccess(`Donation status updated to ${newStatus}`);
    } catch (err: any) {
      showError('Status update failed: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleFetchOtp = async (id: string) => {
    if (otpData[id]) {
      // Toggle off if already fetched
      const newData = { ...otpData };
      delete newData[id];
      setOtpData(newData);
      return;
    }

    setOtpLoadingId(id);
    try {
      const otp = await getDeliveryOtp(id);
      setOtpData((prev) => ({ ...prev, [id]: otp }));
    } catch (err: any) {
      showError('Failed to fetch OTP: ' + (err.response?.data?.message || err.message));
    } finally {
      setOtpLoadingId(null);
    }
  };

  const handleRegenerateOtp = async (id: string) => {
    setOtpLoadingId(id);
    try {
      const otp = await regenerateDeliveryOtp(id);
      setOtpData((prev) => ({ ...prev, [id]: otp }));
      showSuccess('OTP regenerated successfully');
    } catch (err: any) {
      showError('Failed to regenerate OTP: ' + (err.response?.data?.message || err.message));
    } finally {
      setOtpLoadingId(null);
    }
  };

  const getStatusBadgeStyle = (status: DonationStatus) => {
    switch (status) {
      case 'ACCEPTED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'REJECTED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'PICKED_UP':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'DELIVERED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'REQUESTED':
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filteredDonations = donations.filter(
    (d) => statusFilter === 'ALL' || d.status === statusFilter
  );

  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#111827] tracking-tight flex items-center gap-3">
            <Building2 className="w-8 h-8 text-[#7567E8]" />
            NGO Assigned Donations
          </h1>
          <p className="text-[#4B5563] text-sm mt-1">
            Manage incoming donation requests and update pickup & delivery status
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            data-testid="ngo-header-messages-btn"
            onClick={() => navigate('/messages')}
            className="p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#7567E8] border border-[#7567E8]/30 transition-colors flex items-center gap-2 text-xs font-bold shadow-xs"
            title="Open Donor Messages"
          >
            <MessageSquare className="w-4 h-4 text-[#7567E8]" />
            <span>Messages</span>
          </button>

          <button
            onClick={fetchDonations}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white text-[#4B5563] hover:text-[#111827] hover:bg-[#F4F2FA] transition-colors border border-[#E5E7EB] flex items-center gap-2 text-xs font-semibold shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh List
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <Filter className="w-4 h-4 text-[#6B7280] shrink-0 mr-1" />
        {['ALL', 'REQUESTED', 'ACCEPTED', 'PICKED_UP', 'DELIVERED', 'REJECTED'].map((status) => {
          const count =
            status === 'ALL'
              ? donations.length
              : donations.filter((d) => d.status === status).length;

          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-2 ${
                statusFilter === status
                  ? 'bg-[#7567E8] text-white border-[#7567E8] shadow-sm'
                  : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:bg-[#F4F2FA] hover:text-[#111827]'
              }`}
            >
              <span>{status}</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                statusFilter === status ? 'bg-white/20 text-white' : 'bg-[#F3F4F6] text-[#4B5563]'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content Section: Skeletons, Error, Empty State, or List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border border-[#E5E7EB] rounded-2xl p-6 space-y-4 animate-pulse shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="w-20 h-5 bg-[#F3F4F6] rounded-full" />
                <div className="w-16 h-5 bg-[#F3F4F6] rounded" />
              </div>
              <div className="w-3/4 h-6 bg-[#F3F4F6] rounded" />
              <div className="w-full h-12 bg-[#F3F4F6] rounded" />
              <div className="border-t border-[#E5E7EB] pt-4 flex justify-between">
                <div className="w-24 h-4 bg-[#F3F4F6] rounded" />
                <div className="w-24 h-4 bg-[#F3F4F6] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center text-rose-700 space-y-3">
          <p className="font-semibold">{error}</p>
          <button
            onClick={fetchDonations}
            className="px-4 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-semibold transition-colors"
          >
            Retry Connection
          </button>
        </div>
      ) : filteredDonations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#E5E7EB] space-y-3 shadow-xs">
          <Inbox className="w-12 h-12 text-[#9CA3AF] mx-auto" />
          <h3 className="text-[#111827] font-semibold text-lg">No assigned donations</h3>
          <p className="text-[#4B5563] text-sm max-w-sm mx-auto">
            {donations.length === 0
              ? 'No donors have assigned donation requests to your NGO profile yet.'
              : `No donations matching status "${statusFilter}".`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDonations.map((donation) => (
            <div
              key={donation.id}
              data-testid={`donation-card-${donation.id}`}
              className="donation-card bg-white border border-[#E5E7EB] hover:border-[#7567E8] rounded-2xl p-6 transition-all flex flex-col justify-between shadow-[0_10px_15px_-3px_rgba(17,24,39,0.04)]"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#7567E8]/10 text-[#7567E8] border border-[#7567E8]/20 flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {donation.category}
                  </span>
                  <span
                    className={`text-[11px] font-bold tracking-wider px-2.5 py-0.5 rounded border ${getStatusBadgeStyle(
                      donation.status
                    )}`}
                  >
                    {donation.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-2 text-[#111827] font-semibold text-sm">
                  <User className="w-4 h-4 text-[#7567E8] shrink-0" />
                  <span>Donor: {donation.donor?.fullName || 'Anonymous'}</span>
                </div>

                <p className="text-[#4B5563] text-sm mb-4 line-clamp-3 leading-relaxed">
                  {donation.description || 'No item description provided.'}
                </p>

                 {hasValidPhotos(donation.photoUrls) ? (
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                    {donation.photoUrls.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewerPhotos(donation.photoUrls);
                          setViewerIndex(idx);
                          setViewerTitle(`${donation.category} Donation Photo`);
                          setIsViewerOpen(true);
                        }}
                        className="group relative rounded-lg overflow-hidden border border-[#E5E7EB] hover:border-[#7567E8] transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-[#7567E8]"
                        aria-label={`View photo ${idx + 1} full size`}
                        data-testid={`ngo-card-photo-${donation.id}-${idx}`}
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
                    <span>No photos attached for this request</span>
                  </div>
                )}
              </div>

              <div className="border-t border-[#E5E7EB] pt-4 mt-2 space-y-3">
                <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#7567E8]" />
                    <span>Requested: {formatDate(donation.createdAt)}</span>
                  </div>
                  {donation.pickupDate && (
                    <span className="text-[#7567E8] font-medium">Pickup: {donation.pickupDate}</span>
                  )}
                </div>

                {/* Live GPS Driver Tracking Button */}
                {(donation.status === 'ACCEPTED' || donation.status === 'PICKED_UP' || donation.status === 'DELIVERED') && (
                  <button
                    data-testid={`ngo-track-delivery-${donation.id}`}
                    onClick={() => navigate(`/donations/${donation.id}/track`)}
                    className="w-full py-2 px-3 rounded-xl bg-[#7567E8]/10 hover:bg-[#7567E8]/20 text-[#7567E8] text-xs font-bold border border-[#7567E8]/30 transition-all flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Navigation className="w-3.5 h-3.5 text-[#7567E8] animate-pulse" />
                    {donation.status === 'DELIVERED' ? 'View Completed Delivery Route' : 'Track Delivery & Driver Live GPS'} &rarr;
                  </button>
                )}

                {/* Chat with Donor Button */}
                {donation.donor?.id && (
                  <button
                    data-testid={`ngo-chat-donor-${donation.id}`}
                    onClick={() => {
                      const donorId = donation.donor.id;
                      navigate(`/messages?donorId=${donorId}&donationId=${donation.id}`);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#7567E8] text-xs font-bold border border-[#7567E8]/30 transition-all flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#7567E8]" />
                    Chat with Donor
                  </button>
                )}

                {/* OTP Viewer */}
                {donation.status === 'PICKED_UP' && (
                  <div className="bg-[#F9FAFB] p-3 rounded-xl border border-[#E5E7EB] flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#111827] text-xs font-medium">
                      <KeyRound className="w-4 h-4 text-amber-600" />
                      Verification OTP for Volunteer:
                    </div>
                    {otpLoadingId === donation.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-[#6B7280]" />
                    ) : otpData[donation.id] ? (
                      <div className="flex items-center gap-2">
                        <span data-testid="delivery-otp" className="font-mono text-lg font-bold text-amber-700 tracking-widest">{otpData[donation.id]}</span>
                        <button onClick={() => handleRegenerateOtp(donation.id)} title="Regenerate OTP" className="text-amber-600 hover:text-amber-700">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleFetchOtp(donation.id)} className="text-[#6B7280] hover:text-[#111827]">
                          <EyeOff className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => handleFetchOtp(donation.id)} className="text-xs font-semibold text-[#7567E8] hover:text-[#7567E8]/80 flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        Show OTP
                      </button>
                    )}
                  </div>
                )}

                {/* Workflow Actions */}
                <div className="pt-2 border-t border-[#E5E7EB] flex items-center gap-2">
                  {actionLoadingId === donation.id ? (
                    <div className="w-full py-2 text-center text-xs text-[#7567E8] font-semibold flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#7567E8] border-t-transparent rounded-full animate-spin" />
                      Updating status...
                    </div>
                  ) : donation.status === 'REQUESTED' ? (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(donation.id, 'ACCEPTED')}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Accept
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(donation.id, 'REJECTED')}
                        className="flex-1 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </>
                  ) : donation.status === 'ACCEPTED' ? (
                    <button
                      onClick={() => handleStatusUpdate(donation.id, 'PICKED_UP')}
                      className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
                    >
                      <Truck className="w-4 h-4" />
                      Mark Picked Up
                    </button>
                  ) : donation.status === 'PICKED_UP' ? (
                    <div className="w-full py-1.5 text-center text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-xl border border-indigo-200">
                      In Transit - Awaiting Volunteer Delivery
                    </div>
                  ) : donation.status === 'DELIVERED' ? (
                    <div className="w-full py-1.5 text-center text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200">
                      ✓ Complete & Delivered
                    </div>
                  ) : (
                    <div className="w-full py-1.5 text-center text-xs font-semibold text-rose-700 bg-rose-50 rounded-xl border border-rose-200">
                      ✗ Donation Rejected
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full-size Photo Viewer Modal */}
      <PhotoViewerModal
        isOpen={isViewerOpen}
        photos={viewerPhotos}
        initialIndex={viewerIndex}
        title={viewerTitle}
        onClose={() => setIsViewerOpen(false)}
      />
    </div>
  );
};
