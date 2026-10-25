import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyDonations, getNgoAssignedDonations, updateDonationStatusByNgo } from '../api/donationApi';
import { Donation, DonationStatus } from '../types';
import { DonationCard } from '../components/DonationCard';
import { PlusCircle, Search, Filter, RefreshCw, HeartHandshake, ShieldCheck } from 'lucide-react';

export const DonationsPage: React.FC = () => {
  const { user } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const isNgo = user?.role === 'NGO';
  const isDonor = user?.role === 'DONOR';

  const fetchDonations = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isNgo) {
        const pageResponse = await getNgoAssignedDonations(0, 100);
        setDonations(pageResponse.content);
      } else {
        const pageResponse = await getMyDonations(0, 100);
        setDonations(pageResponse.content);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load donations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, [user]);

  const handleStatusChange = async (id: string, newStatus: DonationStatus) => {
    try {
      const updated = await updateDonationStatusByNgo(id, newStatus);
      setDonations((prev) => prev.map((d) => (d.id === id ? updated : d)));
    } catch (err: any) {
      alert('Status update failed: ' + err.message);
    }
  };

  const categories = ['ALL', ...Array.from(new Set(donations.map((d) => d.category)))];

  const filteredDonations = donations.filter((d) => {
    const matchesSearch =
      d.category.toLowerCase().includes(search.toLowerCase()) ||
      (d.description && d.description.toLowerCase().includes(search.toLowerCase())) ||
      (d.donor?.fullName && d.donor.fullName.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      categoryFilter === 'ALL' || d.category.toLowerCase() === categoryFilter.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-[#111827] tracking-tight">
              {isNgo ? 'NGO Assigned Donations' : 'My Donation History'}
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-[#7567E8]/10 text-[#7567E8] border border-[#7567E8]/20 flex items-center gap-1 font-mono">
              <ShieldCheck className="w-3 h-3" />
              Role: {user?.role}
            </span>
          </div>
          <p className="text-[#4B5563] text-sm mt-1">
            {isNgo
              ? 'Role-isolated view showing donations assigned exclusively to your NGO'
              : 'Donations submitted under your donor account'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDonations}
            disabled={loading}
            className="p-2.5 rounded-xl bg-[#F3F4F6] text-[#374151] hover:text-[#111827] hover:bg-[#E5E7EB] transition-colors border border-[#E5E7EB]"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {isDonor && (
            <Link
              to="/donations/new"
              className="px-4 py-2.5 rounded-xl bg-[#7567E8] hover:bg-[#6355d8] text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-md shadow-[#7567E8]/20"
            >
              <PlusCircle className="w-4 h-4" />
              New Donation
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by category, description, or donor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl pl-10 pr-4 py-2 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#7567E8] transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[#6B7280]" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#7567E8] transition-colors"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                Category: {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB]">
          <div className="w-8 h-8 border-2 border-[#7567E8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#6B7280] text-sm">Loading role-isolated donations...</p>
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
        <div className="text-center py-16 bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB] space-y-3">
          <HeartHandshake className="w-12 h-12 text-[#9CA3AF] mx-auto" />
          <h3 className="text-[#111827] font-semibold text-lg">No donations found</h3>
          <p className="text-[#6B7280] text-sm max-w-sm mx-auto">
            {isNgo
              ? 'No donors have assigned donation requests to your NGO profile yet.'
              : 'You have not submitted any donation requests yet.'}
          </p>
          {isDonor && (
            <Link
              to="/donations/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7567E8] hover:bg-[#6355d8] text-white font-medium text-xs transition-colors shadow-sm"
            >
              Create Donation
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDonations.map((donation) => (
            <DonationCard
              key={donation.id}
              donation={donation}
              isNgoView={isNgo}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
};
