import React, { useEffect, useState } from 'react';
import { getActiveResourceTrades } from '../api/nextGenApi';
import { NgoResourceTrade } from '../types';
import { RefreshCw, Repeat, Building2, Recycle, CheckCircle2 } from 'lucide-react';

export const CircularMarketplacePage: React.FC = () => {
  const [trades, setTrades] = useState<NgoResourceTrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActiveResourceTrades()
      .then((data) => setTrades(data))
      .catch(() => setTrades([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 py-6 max-w-7xl mx-auto px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#111827] tracking-tight flex items-center gap-3">
            <Recycle className="w-8 h-8 text-emerald-600" />
            Zero-Waste Circular Exchange & Inter-NGO Trade Board
          </h1>
          <p className="text-[#4B5563] text-sm mt-1">
            B2B resource exchange board for NGOs to swap surplus items and divert textile/e-waste from landfills
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-[#E5E7EB] p-4 rounded-xl text-center shadow-sm">
          <div className="text-xl font-extrabold text-emerald-700">1,240 kg</div>
          <div className="text-xs text-[#6B7280]">Textiles Diverted from Landfill</div>
        </div>
        <div className="bg-white border border-[#E5E7EB] p-4 rounded-xl text-center shadow-sm">
          <div className="text-xl font-extrabold text-[#7567E8]">450 Units</div>
          <div className="text-xs text-[#6B7280]">E-Waste Upcycled</div>
        </div>
        <div className="bg-white border border-[#E5E7EB] p-4 rounded-xl text-center shadow-sm">
          <div className="text-xl font-extrabold text-purple-700">12 Active</div>
          <div className="text-xs text-[#6B7280]">Inter-NGO Surplus Trades</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB] text-[#6B7280] text-sm">
          Loading inter-NGO trade listings...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {trades.map((t) => (
            <div key={t.id} className="bg-white border border-[#E5E7EB] rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <span className="text-xs font-bold text-[#111827] flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#7567E8]" />
                  {t.ngoName}
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Active Trade Offer
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E7EB] text-xs">
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-bold text-[#6B7280]">Offering Surplus</div>
                  <div className="text-sm font-bold text-[#7567E8]">{t.offeredQuantity}x {t.offeredCategory}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-bold text-[#6B7280]">Requesting in Exchange</div>
                  <div className="text-sm font-bold text-purple-700">{t.requestedQuantity}x {t.requestedCategory}</div>
                </div>
              </div>

              {import.meta.env.VITE_SHOW_PROTOTYPES === 'true' && (
                <button
                  onClick={() => alert(`Initiated trade request with ${t.ngoName}!`)}
                  className="w-full py-2.5 rounded-xl bg-[#7567E8] hover:bg-[#6355d8] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#7567E8]/20 transition-all"
                >
                  <Repeat className="w-4 h-4" /> Propose Resource Exchange &rarr;
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
