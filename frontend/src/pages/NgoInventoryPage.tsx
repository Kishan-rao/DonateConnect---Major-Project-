import React, { useEffect, useState } from 'react';
import { getNgoAssignedDonations } from '../api/donationApi';
import { Category, Donation } from '../types';
import { PackageCheck, Shirt, Utensils, BookOpen, PenTool, Gamepad2, Box, RefreshCw, BarChart3 } from 'lucide-react';

export const NgoInventoryPage: React.FC = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const pageResponse = await getNgoAssignedDonations(0, 100);
      const data = pageResponse.content;
      // Filter strictly for DELIVERED items
      setDonations(data.filter((d) => d.status === 'DELIVERED'));
    } catch (err: any) {
      setError(err.message || 'Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const categoriesList: { category: Category; label: string; icon: React.FC<{ className?: string }> }[] = [
    { category: 'CLOTHES', label: 'Clothes & Apparel', icon: Shirt },
    { category: 'FOOD', label: 'Food & Groceries', icon: Utensils },
    { category: 'BOOKS', label: 'Books & Educational Material', icon: BookOpen },
    { category: 'STATIONERY', label: 'School & Office Supplies', icon: PenTool },
    { category: 'TOYS', label: 'Toys & Children Items', icon: Gamepad2 },
    { category: 'OTHER', label: 'Other Contributions', icon: Box },
  ];

  const getCountByCategory = (cat: Category) => {
    return donations.filter((d) => d.category === cat).length;
  };

  const totalDelivered = donations.length;

  return (
    <div className="space-y-8 py-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#111827] tracking-tight flex items-center gap-3">
            <PackageCheck className="w-8 h-8 text-emerald-600" />
            Delivered Inventory Summary
          </h1>
          <p className="text-[#4B5563] text-sm mt-1">
            Overview of all delivered items received by your NGO, grouped by category
          </p>
        </div>

        <button
          onClick={fetchInventory}
          disabled={loading}
          className="p-2.5 rounded-xl bg-white text-[#4B5563] hover:text-[#111827] hover:bg-[#F4F2FA] transition-colors border border-[#E5E7EB] flex items-center gap-2 text-xs font-semibold self-start md:self-auto shadow-xs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Overview Banner */}
      <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-[0_10px_15px_-3px_rgba(17,24,39,0.04)]">
        <div className="space-y-1 text-center sm:text-left">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#7567E8]">Total Items Received</span>
          <div className="text-4xl font-extrabold text-[#111827]">{totalDelivered}</div>
          <p className="text-xs text-[#6B7280]">Completed & verified donations</p>
        </div>

        <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB] flex items-center gap-3 text-xs text-[#4B5563]">
          <BarChart3 className="w-8 h-8 text-emerald-600 shrink-0" />
          <span>Real-time category breakdown based on verified delivered donations</span>
        </div>
      </div>

      {/* Loading / Error / Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white border border-[#E5E7EB] rounded-2xl p-6 h-32 animate-pulse shadow-xs" />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center text-rose-700 space-y-3">
          <p className="font-semibold">{error}</p>
          <button
            onClick={fetchInventory}
            className="px-4 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-semibold transition-colors"
          >
            Retry Loading
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {categoriesList.map(({ category, label, icon: Icon }) => {
            const count = getCountByCategory(category);
            const percentage = totalDelivered > 0 ? Math.round((count / totalDelivered) * 100) : 0;

            return (
              <div
                key={category}
                className="bg-white border border-[#E5E7EB] rounded-2xl p-6 hover:border-[#7567E8] transition-all space-y-4 flex flex-col justify-between shadow-[0_10px_15px_-3px_rgba(17,24,39,0.04)]"
              >
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-xl bg-[#7567E8]/10 border border-[#7567E8]/20 text-[#7567E8]">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-2xl font-bold text-[#111827]">{count}</span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[#111827]">{label}</h3>
                  <p className="text-xs text-[#6B7280] mt-0.5">{category}</p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-[#6B7280] font-mono">
                    <span>Share</span>
                    <span>{percentage}%</span>
                  </div>
                  <div className="w-full bg-[#F3F4F6] rounded-full h-2 overflow-hidden border border-[#E5E7EB]">
                    <div
                      className="bg-gradient-to-r from-[#7567E8] to-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
