import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getVerifiedNgos } from '../api/ngoApi';
import { NGOProfile } from '../types';
import { MapPin, Phone, Building2, ShieldCheck, HeartHandshake, Navigation } from 'lucide-react';

export const MapViewPage: React.FC = () => {
  const [ngos, setNgos] = useState<NGOProfile[]>([]);
  const [selectedNgo, setSelectedNgo] = useState<NGOProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVerifiedNgos()
      .then((data) => {
        const safeData = Array.isArray(data) ? data : [];
        setNgos(safeData);
        if (safeData.length > 0) setSelectedNgo(safeData[0]);
      })
      .catch(() => setNgos([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 py-6 max-w-7xl mx-auto px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#111827] tracking-tight flex items-center gap-3">
            <MapPin className="w-8 h-8 text-[#7567E8]" />
            Interactive Indian NGO & Pickup Hub Map
          </h1>
          <p className="text-[#4B5563] text-sm mt-1">
            Discover verified Indian non-profit partners and collection centers across Bengaluru, Mumbai, Delhi, and Chennai
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* NGO Directory Sidebar */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex flex-col h-[520px] shadow-sm">
          <h3 className="text-sm font-bold text-[#111827] mb-3 flex items-center justify-between">
            <span>Verified Indian NGO Partners ({ngos.length})</span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-semibold">Live</span>
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {loading ? (
              <div className="text-center py-10 text-xs text-[#6B7280]">Loading map markers...</div>
            ) : ngos.length === 0 ? (
              <div className="text-center py-10 text-xs text-[#6B7280]">No verified NGOs found.</div>
            ) : (
              ngos.map((ngo) => (
                <div
                  key={ngo.id}
                  onClick={() => setSelectedNgo(ngo)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    selectedNgo?.id === ngo.id
                      ? 'bg-[#7567E8]/10 border-[#7567E8] shadow-sm'
                      : 'bg-[#F9FAFB] border-[#E5E7EB] hover:border-[#7567E8]/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-bold text-[#111827] truncate">{ngo.name}</h4>
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  </div>
                  <p className="text-xs text-[#6B7280] line-clamp-1 mb-2">{ngo.address}</p>
                  <div className="flex items-center justify-between text-[11px] text-[#7567E8]">
                    <span className="flex items-center gap-1 font-medium"><Phone className="w-3 h-3" /> {ngo.phone}</span>
                    <span className="font-semibold text-emerald-700">Verified Hub &rarr;</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Visual Simulated Map Display */}
        <div className="lg:col-span-2 bg-[#FAF8F5] border border-[#E5E7EB] rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[520px] shadow-sm">
          {/* Simulated Map Canvas */}
          <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:16px_16px] opacity-60 pointer-events-none" />

          {/* Top Info Header */}
          <div className="relative z-10 flex items-center justify-between bg-white/90 p-3 rounded-xl border border-[#E5E7EB] shadow-sm backdrop-blur-md mb-4">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-[#7567E8] animate-pulse" />
              <span className="text-xs font-semibold text-[#111827]">
                {selectedNgo ? `Active Pin: ${selectedNgo.name}` : 'Select an NGO from directory'}
              </span>
            </div>
            <span className="text-[11px] text-[#6B7280] font-mono">GPS Grid: 12.9716° N, 77.5946° E (India Metro Grid)</span>
          </div>

          {/* Interactive Pin Showcase Canvas */}
          <div className="relative z-10 flex-1 bg-white/80 rounded-xl border border-[#E5E7EB] p-6 flex flex-col justify-center items-center text-center space-y-4 shadow-inner">
            {selectedNgo ? (
              <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xl space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#7567E8]/10 text-[#7567E8] border border-[#7567E8]/20 flex items-center justify-center mx-auto">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Verified Relief Center
                  </span>
                  <h3 className="text-xl font-extrabold text-[#111827] mt-2 mb-1">{selectedNgo.name}</h3>
                  <p className="text-xs text-[#4B5563] leading-relaxed line-clamp-3">{selectedNgo.description}</p>
                </div>

                <div className="bg-[#F9FAFB] p-3 rounded-xl border border-[#E5E7EB] text-xs text-[#4B5563] text-left space-y-1">
                  <div>📍 <strong>Address:</strong> {selectedNgo.address}</div>
                  <div>📞 <strong>Phone:</strong> {selectedNgo.phone}</div>
                </div>

                <Link
                  to={`/donate/new?ngoId=${selectedNgo.id}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#7567E8] hover:bg-[#6355d8] text-white font-bold text-xs shadow-md shadow-[#7567E8]/20 hover:scale-[1.02] transition-all"
                >
                  <HeartHandshake className="w-4 h-4" />
                  Schedule Direct Donation Pickup &rarr;
                </Link>
              </div>
            ) : (
              <div className="text-[#6B7280] text-sm">Select an NGO pin on the left to view details</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
