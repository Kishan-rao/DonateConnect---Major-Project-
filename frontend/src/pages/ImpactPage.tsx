import React, { useEffect, useState } from 'react';
import { getImpactMetrics } from '../api/ngoApi';
import { ImpactMetrics } from '../types';

export const ImpactPage: React.FC = () => {
  const [metrics, setMetrics] = useState<ImpactMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Interactive Impact Calculator State
  const [calcCategory, setCalcCategory] = useState<'CLOTHES' | 'FOOD' | 'BOOKS'>('CLOTHES');
  const [calcQuantity, setCalcQuantity] = useState<number>(10);

  useEffect(() => {
    getImpactMetrics()
      .then((data) => setMetrics(data))
      .catch(() => setMetrics(null))
      .finally(() => setLoading(false));
  }, []);

  const calculateImpact = () => {
    switch (calcCategory) {
      case 'CLOTHES':
        return {
          co2: (calcQuantity * 3.6).toFixed(1),
          water: (calcQuantity * 2700).toLocaleString(),
          desc: `Donating ${calcQuantity} garments saves ${calcQuantity * 2700} liters of water and clothing manufacturing waste!`,
        };
      case 'FOOD':
        return {
          co2: (calcQuantity * 2.5).toFixed(1),
          water: (calcQuantity * 850).toLocaleString(),
          desc: `Providing ${calcQuantity} meals prevents ${calcQuantity * 0.4} kg of organic landfill methane emissions.`,
        };
      case 'BOOKS':
        return {
          co2: (calcQuantity * 1.8).toFixed(1),
          water: (calcQuantity * 300).toLocaleString(),
          desc: `Sharing ${calcQuantity} textbooks empowers ${calcQuantity} students with lifelong literacy.`,
        };
      default:
        return { co2: '0', water: '0', desc: '' };
    }
  };

  const calculated = calculateImpact();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-50 via-indigo-50 to-emerald-50 rounded-2xl border border-indigo-100 p-8 mb-10 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full border border-emerald-200 mb-3 inline-block">
            🌱 Environmental & Community Impact Report
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 text-[#111827]">
            DonateConnect Impact Analytics
          </h1>
          <p className="text-sm max-w-2xl leading-relaxed font-medium text-[#4B5563]">
            Real-time tracking of community donations, active NGO relief drives, and carbon footprint reduction achieved through item reuse and zero-waste logistics.
          </p>
        </div>
      </div>

      {/* Global Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        <div className="bg-white border border-[#E5E7EB] p-5 rounded-xl text-center shadow-sm">
          <div className="text-2xl font-extrabold text-[#7567E8] mb-1">
            {loading ? '...' : metrics?.totalDonations || 0}
          </div>
          <div className="text-xs text-[#6B7280] font-medium uppercase tracking-wider">Total Donations</div>
        </div>

        <div className="bg-white border border-[#E5E7EB] p-5 rounded-xl text-center shadow-sm">
          <div className="text-2xl font-extrabold text-emerald-700 mb-1">
            {loading ? '...' : metrics?.deliveredDonations || 0}
          </div>
          <div className="text-xs text-[#6B7280] font-medium uppercase tracking-wider">Items Delivered</div>
        </div>

        <div className="bg-white border border-[#E5E7EB] p-5 rounded-xl text-center shadow-sm">
          <div className="text-2xl font-extrabold text-purple-700 mb-1">
            {loading ? '...' : metrics?.totalNgosSupported || 0}
          </div>
          <div className="text-xs text-[#6B7280] font-medium uppercase tracking-wider">NGO Partners</div>
        </div>

        <div className="bg-white border border-[#E5E7EB] p-5 rounded-xl text-center shadow-sm">
          <div className="text-2xl font-extrabold text-amber-700 mb-1">
            {loading ? '...' : metrics?.totalActiveDonors || 0}
          </div>
          <div className="text-xs text-[#6B7280] font-medium uppercase tracking-wider">Active Donors</div>
        </div>

        <div className="bg-white border border-[#E5E7EB] p-5 rounded-xl text-center shadow-sm col-span-2 md:col-span-1">
          <div className="text-2xl font-extrabold text-rose-700 mb-1">
            {loading ? '...' : `${metrics?.estimatedCo2SavedKg || 0} kg`}
          </div>
          <div className="text-xs text-[#6B7280] font-medium uppercase tracking-wider">CO₂ Offset</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        {/* Category Distribution Chart */}
        <div className="bg-white border border-[#E5E7EB] p-6 rounded-2xl shadow-sm">
          <h3 className="text-lg font-bold text-[#111827] mb-1 flex items-center gap-2">
            📊 Donations by Category Breakdown
          </h3>
          <p className="text-xs text-[#6B7280] mb-6">Distribution of community contributions across relief categories</p>

          <div className="space-y-4">
            {metrics?.donationsByCategory &&
              Object.entries(metrics.donationsByCategory).map(([cat, count]) => {
                const total = metrics.totalDonations || 1;
                const percentage = Math.round((count / total) * 100);
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-[#374151]">{cat}</span>
                      <span className="text-[#7567E8] font-bold">{count} item(s) ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-[#F3F4F6] h-2.5 rounded-full overflow-hidden border border-[#E5E7EB]">
                      <div
                        className="bg-gradient-to-r from-[#7567E8] to-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Interactive Impact Calculator */}
        <div className="bg-white border border-[#E5E7EB] p-6 rounded-2xl shadow-sm">
          <h3 className="text-lg font-bold text-[#111827] mb-1 flex items-center gap-2">
            🧮 Interactive Impact Calculator
          </h3>
          <p className="text-xs text-[#6B7280] mb-6">Estimate your environmental & resource savings before donating</p>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">Select Donation Category</label>
              <select
                value={calcCategory}
                onChange={(e) => setCalcCategory(e.target.value as any)}
                className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#7567E8]"
              >
                <option value="CLOTHES">Clothes & Apparel</option>
                <option value="FOOD">Food & Groceries</option>
                <option value="BOOKS">Books & Learning Materials</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">Estimated Quantity (Items / Meals): {calcQuantity}</label>
              <input
                type="range"
                min="1"
                max="100"
                value={calcQuantity}
                onChange={(e) => setCalcQuantity(Number(e.target.value))}
                className="w-full accent-[#7567E8] cursor-pointer"
              />
            </div>
          </div>

          <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E7EB]">
            <div className="grid grid-cols-2 gap-3 mb-2 text-center">
              <div className="bg-white p-3 rounded-lg border border-[#E5E7EB] shadow-sm">
                <div className="text-xs text-[#6B7280]">CO₂ Emissions Saved</div>
                <div className="text-lg font-bold text-emerald-700">{calculated.co2} kg</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-[#E5E7EB] shadow-sm">
                <div className="text-xs text-[#6B7280]">Water Preserved</div>
                <div className="text-lg font-bold text-[#7567E8]">{calculated.water} Liters</div>
              </div>
            </div>
            <p className="text-xs text-[#4B5563] text-center italic">{calculated.desc}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
