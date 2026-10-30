import React, { useEffect, useState } from 'react';
import { getAdminUrgentNeeds } from '../api/ngoApi';
import { AdminUrgentNeedTracking } from '../types';
import {
  Shield,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Building2,
  PackageCheck,
  Truck,
  MapPin,
  ChevronDown,
  ChevronUp,
  User,
  Search,
  Filter,
} from 'lucide-react';
import { formatDate } from '../utils/formatters';

export const AdminUrgentNeedsPage: React.FC = () => {
  const [requirements, setRequirements] = useState<AdminUrgentNeedTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchRequirements = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminUrgentNeeds();
      setRequirements(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch urgent requirements for admin.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, []);

  const totalActive = requirements.filter((r) => r.status === 'ACTIVE').length;
  const totalCompleted = requirements.filter((r) => r.status === 'COMPLETED').length;

  const filteredRequirements = requirements.filter((r) => {
    if (filterStatus === 'ACTIVE' && r.status !== 'ACTIVE') return false;
    if (filterStatus === 'COMPLETED' && r.status !== 'COMPLETED') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchNgo = r.ngoName.toLowerCase().includes(q);
      const matchCat = r.category.toLowerCase().includes(q);
      const matchId = r.id.toLowerCase().includes(q);
      return matchTitle || matchNgo || matchCat || matchId;
    }
    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6 py-6 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-rose-600" />
            Urgent Requirements Monitoring
          </h1>
          <p className="text-[#4B5563] text-sm mt-1">
            Real-time lifecycle tracking of NGO urgent appeals, donor fulfillment progress, and verified delivery completion.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRequirements}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white text-[#4B5563] hover:text-[#111827] hover:bg-[#F4F2FA] transition-colors border border-[#E5E7EB] flex items-center gap-2 text-xs font-semibold shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Total Requirements</span>
            <div className="text-2xl font-extrabold text-[#111827] mt-1">{requirements.length}</div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 text-[#7567E8]">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Active Appeals</span>
            <div className="text-2xl font-extrabold text-rose-700 mt-1">{totalActive}</div>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Completed / Fulfilled</span>
            <div className="text-2xl font-extrabold text-emerald-700 mt-1">{totalCompleted}</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto shrink-0">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap min-h-[36px] ${
              filterStatus === 'ALL'
                ? 'bg-[#111827] text-white'
                : 'bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB]'
            }`}
          >
            All ({requirements.length})
          </button>
          <button
            onClick={() => setFilterStatus('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap min-h-[36px] ${
              filterStatus === 'ACTIVE'
                ? 'bg-rose-600 text-white'
                : 'bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB]'
            }`}
          >
            Active ({totalActive})
          </button>
          <button
            onClick={() => setFilterStatus('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap min-h-[36px] ${
              filterStatus === 'COMPLETED'
                ? 'bg-emerald-600 text-white'
                : 'bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB]'
            }`}
          >
            Completed ({totalCompleted})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by item, NGO, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-xs text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#7567E8]"
          />
        </div>
      </div>

      {/* Requirements List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-[#E5E7EB] rounded-2xl p-6 h-40 animate-pulse shadow-xs" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-rose-50 border border-rose-200 text-center text-rose-700 space-y-3">
          <p className="font-semibold">{error}</p>
          <button
            onClick={fetchRequirements}
            className="px-4 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold transition-colors"
          >
            Retry Fetch
          </button>
        </div>
      ) : filteredRequirements.length === 0 ? (
        <div className="p-12 text-center bg-white border border-dashed border-[#E5E7EB] rounded-3xl space-y-2">
          <AlertCircle className="w-10 h-10 text-[#9CA3AF] mx-auto" />
          <h3 className="text-base font-bold text-[#111827]">No Urgent Requirements Found</h3>
          <p className="text-xs text-[#6B7280]">
            {searchQuery ? 'No requirements match your current search.' : 'There are currently no urgent requirements in this category.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequirements.map((req) => {
            const isCompleted = req.status === 'COMPLETED';
            const percent = req.requestedQuantity > 0
              ? Math.min(100, Math.round((req.fulfilledQuantity / req.requestedQuantity) * 100))
              : 0;
            const isExpanded = expandedId === req.id;

            return (
              <div
                key={req.id}
                className={`bg-white border rounded-2xl transition-all shadow-xs overflow-hidden ${
                  isCompleted ? 'border-emerald-200' : 'border-rose-200'
                }`}
              >
                {/* Main Card Header */}
                <div className="p-4 sm:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {req.status}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-[#7567E8] border border-indigo-200 px-2 py-0.5 rounded-md">
                          {req.category}
                        </span>
                        <span className="text-xs text-[#6B7280] font-mono">
                          ID: {req.id.substring(0, 8)}...
                        </span>
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-[#111827] break-words">
                        {req.title}
                      </h2>
                      <p className="text-xs text-[#4B5563] line-clamp-2 leading-relaxed">
                        {req.description}
                      </p>
                    </div>

                    <div className="flex flex-col sm:items-end justify-start gap-1 shrink-0 text-left sm:text-right pt-2 sm:pt-0 border-t sm:border-0 border-[#F3F4F6]">
                      <div className="text-xs">
                        <span className="text-[#6B7280] font-medium">NGO: </span>
                        <strong className="text-[#111827]">{req.ngoName}</strong>
                        {req.ngoCity && (
                          <span className="text-[11px] text-[#6B7280]"> ({req.ngoCity})</span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#9CA3AF]">
                        Created: {formatDate(req.createdAt)}
                      </span>
                      {req.completedAt && (
                        <span className="text-[11px] text-emerald-700 font-semibold">
                          Completed: {formatDate(req.completedAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fulfillment Metric Bar */}
                  <div className="bg-[#F9FAFB] p-3.5 sm:p-4 rounded-xl border border-[#E5E7EB] space-y-2">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-4 text-xs">
                        <div className="bg-white sm:bg-transparent px-2 py-1 sm:p-0 rounded-md border sm:border-0 border-[#E5E7EB] text-center sm:text-left">
                          <span className="text-[#6B7280]">Req: </span>
                          <strong className="text-[#111827]">{req.requestedQuantity}</strong>
                        </div>
                        <div className="bg-white sm:bg-transparent px-2 py-1 sm:p-0 rounded-md border sm:border-0 border-[#E5E7EB] text-center sm:text-left">
                          <span className="text-[#6B7280]">Done: </span>
                          <strong className="text-emerald-700">{req.fulfilledQuantity}</strong>
                        </div>
                        <div className="bg-white sm:bg-transparent px-2 py-1 sm:p-0 rounded-md border sm:border-0 border-[#E5E7EB] text-center sm:text-left">
                          <span className="text-[#6B7280]">Left: </span>
                          <strong className="text-rose-700">{req.remainingQuantity}</strong>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
                        <span className="text-[#6B7280] sm:hidden">Fulfillment:</span>
                        <span className="font-bold text-[#111827]">{percent}% Fulfilled</span>
                      </div>
                    </div>
                    <div className="w-full bg-[#E5E7EB] rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isCompleted ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Associated Donations Expand Toggle */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB]">
                    <span className="text-xs font-semibold text-[#4B5563] flex items-center gap-1.5">
                      <PackageCheck className="w-4 h-4 text-[#7567E8]" />
                      Associated Donations ({req.associatedDonations.length})
                    </span>
                    <button
                      onClick={() => toggleExpand(req.id)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#7567E8] hover:text-[#5844e0] px-3 py-1.5 rounded-lg hover:bg-[#F4F2FA] transition-colors min-h-[36px]"
                    >
                      {isExpanded ? (
                        <>Hide Donations <ChevronUp className="w-4 h-4" /></>
                      ) : (
                        <>View Donations ({req.associatedDonations.length}) <ChevronDown className="w-4 h-4" /></>
                      )}
                    </button>
                  </div>
                </div>

                {/* Collapsible Donations Sub-Table */}
                {isExpanded && (
                  <div className="bg-[#FAF8F5] border-t border-[#E5E7EB] p-3.5 sm:p-5 space-y-3">
                    <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
                      Fulfillment Donations Log
                    </h4>

                    {req.associatedDonations.length === 0 ? (
                      <p className="text-xs text-[#6B7280] italic py-2">
                        No donations have been submitted for this requirement yet.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {req.associatedDonations.map((d) => (
                          <div
                            key={d.donationId}
                            className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#E5E7EB] space-y-2.5 shadow-xs"
                          >
                            {/* Top Row: Donor Name + Qty Badge */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs sm:text-sm font-bold text-[#111827]">
                                    {d.donorName}
                                  </span>
                                  {d.donorEmail && (
                                    <span className="text-[11px] text-[#6B7280] truncate max-w-[200px] sm:max-w-none">
                                      ({d.donorEmail})
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1 text-[11px] text-[#6B7280]">
                                  <span className="font-mono bg-[#F9FAFB] px-1.5 py-0.5 rounded border border-[#E5E7EB] w-fit">
                                    ID: {d.donationId.substring(0, 8)}...
                                  </span>
                                  {d.pickupAddress && (
                                    <span className="flex items-start gap-1 break-words line-clamp-2 text-[#4B5563]">
                                      <MapPin className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0 mt-0.5" />
                                      <span>{d.pickupAddress}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="shrink-0 text-[11px] font-bold bg-[#F3F4F6] text-[#374151] px-2.5 py-1 rounded-lg border border-[#E5E7EB]">
                                Qty: {d.quantity}
                              </span>
                            </div>

                            {/* Status Badges Row */}
                            <div className="pt-2 border-t border-[#F3F4F6] flex flex-wrap items-center gap-1.5 sm:gap-2">
                              {/* Donation Status */}
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                  d.donationStatus === 'DELIVERED'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : d.donationStatus === 'REJECTED'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                Donation: {d.donationStatus}
                              </span>

                              {/* Delivery Status */}
                              {d.deliveryStatus ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-[#7567E8] border border-indigo-200 px-2 py-0.5 rounded flex items-center gap-1">
                                  <Truck className="w-3 h-3 shrink-0" />
                                  {d.deliveryStatus}
                                </span>
                              ) : (
                                <span className="text-[10px] text-[#9CA3AF] bg-[#F9FAFB] px-2 py-0.5 rounded border border-[#E5E7EB]">
                                  No courier assigned
                                </span>
                              )}

                              {/* Verified indicator */}
                              {d.deliveredAt && (
                                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                                  Verified OTP: {formatDate(d.deliveredAt)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
