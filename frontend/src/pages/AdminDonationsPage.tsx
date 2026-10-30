import React, { useEffect, useState } from 'react';
import { getAdminDonations } from '../api/donationApi';
import { getVerifiedNgos } from '../api/ngoApi';
import { Donation, DonationStatus, NGOProfile, PageResponse } from '../types';
import { formatDate } from '../utils/formatters';
import { PackageCheck, RefreshCw, ChevronLeft, ChevronRight, User, Building2, Tag } from 'lucide-react';

export const AdminDonationsPage: React.FC = () => {
  const [pageData, setPageData] = useState<PageResponse<Donation> | null>(null);
  const [ngos, setNgos] = useState<NGOProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedNgoId, setSelectedNgoId] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const pageSize = 10;

  const fetchDonations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminDonations(
        selectedCategory || undefined,
        selectedStatus || undefined,
        selectedNgoId || undefined,
        page,
        pageSize
      );
      setPageData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load donations audit table.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getVerifiedNgos().then(setNgos).catch(() => setNgos([]));
  }, []);

  useEffect(() => {
    fetchDonations();
  }, [selectedCategory, selectedStatus, selectedNgoId, page]);

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

  return (
    <div className="space-y-6 sm:space-y-8 py-6 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight flex items-center gap-3">
            <PackageCheck className="w-8 h-8 text-[#7567E8]" />
            All Donations Audit
          </h1>
          <p className="text-[#4B5563] text-sm mt-1">
            Audit system-wide donation requests across all NGO partners with server-side pagination
          </p>
        </div>

        <button
          onClick={fetchDonations}
          disabled={loading}
          className="p-2.5 rounded-xl bg-white text-[#4B5563] hover:text-[#111827] hover:bg-[#F4F2FA] transition-colors border border-[#E5E7EB] flex items-center gap-2 text-xs font-semibold self-start md:self-auto shadow-xs min-h-[40px]"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Table
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs">
        {/* Status Filter */}
        <div>
          <label className="block text-[10px] font-bold uppercase text-[#4B5563] mb-1">Status Filter</label>
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(0);
            }}
            className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#7567E8] min-h-[38px]"
          >
            <option value="">All Statuses</option>
            <option value="REQUESTED">REQUESTED</option>
            <option value="ACCEPTED">ACCEPTED</option>
            <option value="PICKED_UP">PICKED_UP</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-[10px] font-bold uppercase text-[#4B5563] mb-1">Category Filter</label>
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(0);
            }}
            className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#7567E8] min-h-[38px]"
          >
            <option value="">All Categories</option>
            <option value="CLOTHES">CLOTHES</option>
            <option value="FOOD">FOOD</option>
            <option value="BOOKS">BOOKS</option>
            <option value="STATIONERY">STATIONERY</option>
            <option value="TOYS">TOYS</option>
            <option value="OTHER">OTHER</option>
          </select>
        </div>

        {/* NGO Filter */}
        <div>
          <label className="block text-[10px] font-bold uppercase text-[#4B5563] mb-1">NGO Filter</label>
          <select
            value={selectedNgoId}
            onChange={(e) => {
              setSelectedNgoId(e.target.value);
              setPage(0);
            }}
            className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#7567E8] min-h-[38px]"
          >
            <option value="">All NGOs</option>
            {ngos.map((ngo) => (
              <option key={ngo.id} value={ngo.id}>
                {ngo.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Table */}
      {loading ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#E5E7EB] shadow-xs">
          <div className="w-8 h-8 border-2 border-[#7567E8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#4B5563] text-sm">Fetching audit records...</p>
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
      ) : !pageData || pageData.content.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#E5E7EB] space-y-3 shadow-xs">
          <PackageCheck className="w-12 h-12 text-[#9CA3AF] mx-auto" />
          <h3 className="text-[#111827] font-semibold text-lg">No audit records match your filters</h3>
          <p className="text-[#4B5563] text-sm max-w-sm mx-auto">
            Try clearing or adjusting your status, category, or NGO dropdown filters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile Card Layout */}
          <div className="block md:hidden space-y-3">
            {pageData.content.map((donation) => (
              <div
                key={donation.id}
                className="bg-white border border-[#E5E7EB] rounded-2xl p-4 space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#7567E8]/10 text-[#7567E8] border border-[#7567E8]/20">
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

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-[#111827] font-semibold min-w-0">
                    <User className="w-3.5 h-3.5 text-[#7567E8] shrink-0" />
                    <span className="truncate">Donor: {donation.donor?.fullName || 'Anonymous'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#4B5563] min-w-0">
                    <Building2 className="w-3.5 h-3.5 text-[#7567E8] shrink-0" />
                    <span className="truncate">Target NGO: {donation.ngo?.name || 'NGO Partner'}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#F3F4F6] flex items-center justify-between text-[11px] text-[#6B7280]">
                  <span>Pickup: {donation.pickupDate || 'N/A'}</span>
                  <span>Created: {formatDate(donation.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[#374151]">
                <thead className="bg-[#F9FAFB] text-xs font-bold text-[#4B5563] uppercase tracking-wider border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-6 py-4">Donor Name</th>
                    <th className="px-6 py-4">Target NGO</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Pickup Date</th>
                    <th className="px-6 py-4">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {pageData.content.map((donation) => (
                    <tr key={donation.id} className="hover:bg-[#F4F2FA] transition-colors">
                      <td className="px-6 py-4 font-semibold text-[#111827]">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-[#7567E8]" />
                          <span>{donation.donor?.fullName || 'Anonymous'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#374151] font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-[#7567E8]" />
                          <span>{donation.ngo?.name || 'NGO Partner'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#7567E8]/10 text-[#7567E8] border border-[#7567E8]/20">
                          <Tag className="w-3 h-3" />
                          {donation.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-[11px] font-bold tracking-wider px-2.5 py-0.5 rounded border ${getStatusBadgeStyle(
                            donation.status
                          )}`}
                        >
                          {donation.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-[#6B7280] font-mono">
                        {donation.pickupDate || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-xs text-[#6B7280] font-mono">
                        {formatDate(donation.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 text-xs text-[#4B5563]">
            <div>
              Showing Page <span className="font-semibold text-[#111827]">{pageData.number + 1}</span> of{' '}
              <span className="font-semibold text-[#111827]">{pageData.totalPages}</span> ({pageData.totalElements} total entries)
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                disabled={pageData.number === 0}
                className="px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EB] text-[#374151] hover:bg-[#F4F2FA] hover:text-[#111827] disabled:opacity-40 transition-colors flex items-center gap-1 shadow-xs min-h-[36px]"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button
                onClick={() => setPage((prev) => Math.min(pageData.totalPages - 1, prev + 1))}
                disabled={pageData.number >= pageData.totalPages - 1}
                className="px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EB] text-[#374151] hover:bg-[#F4F2FA] hover:text-[#111827] disabled:opacity-40 transition-colors flex items-center gap-1 shadow-xs min-h-[36px]"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
