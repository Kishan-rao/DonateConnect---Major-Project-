import React, { useEffect, useState } from 'react';
import { getSmartLockers } from '../api/nextGenApi';
import { SmartLocker } from '../types';
import { Lock, MapPin, KeyRound, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

export const SmartLockersPage: React.FC = () => {
  const [lockers, setLockers] = useState<SmartLocker[]>([]);
  const [selectedLocker, setSelectedLocker] = useState<SmartLocker | null>(null);
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSmartLockers()
      .then((data) => {
        const safeData = Array.isArray(data) ? data : [];
        setLockers(safeData);
        if (safeData.length > 0) setSelectedLocker(safeData[0]);
      })
      .catch(() => setLockers([]))
      .finally(() => setLoading(false));
  }, []);

  const handleGenerateOtp = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);
  };

  return (
    <div className="space-y-6 py-6 max-w-7xl mx-auto px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#111827] tracking-tight flex items-center gap-3">
            <Lock className="w-8 h-8 text-[#7567E8]" />
            24/7 Contactless Smart Locker Hubs
          </h1>
          <p className="text-[#4B5563] text-sm mt-1">
            Drop off donation items anytime at automated metro & hub locker stations using a secure 6-digit OTP code
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Locker Station List */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 space-y-3 shadow-sm">
          <h3 className="text-sm font-bold text-[#111827] mb-2 flex items-center justify-between">
            <span>Available Locker Stations ({lockers.length})</span>
            <span className="text-[10px] bg-[#7567E8]/10 text-[#7567E8] px-2 py-0.5 rounded border border-[#7567E8]/20 font-semibold">24/7 Access</span>
          </h3>

          {loading ? (
            <div className="text-center py-8 text-xs text-[#6B7280]">Loading locker stations...</div>
          ) : (
            lockers.map((locker) => (
              <div
                key={locker.id}
                onClick={() => {
                  setSelectedLocker(locker);
                  setGeneratedOtp(null);
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedLocker?.id === locker.id
                    ? 'bg-[#7567E8]/10 border-[#7567E8] shadow-sm'
                    : 'bg-[#F9FAFB] border-[#E5E7EB] hover:border-[#7567E8]/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold text-[#111827] truncate">{locker.name}</h4>
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                </div>
                <p className="text-xs text-[#6B7280] line-clamp-1 mb-2">{locker.address}</p>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#7567E8] font-semibold">{locker.availableLockers} / {locker.totalLockers} Lockers Free</span>
                  <span className="text-emerald-700 font-bold">Select Hub &rarr;</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Locker Control Panel & OTP Generator */}
        <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-sm">
          {selectedLocker ? (
            <div className="space-y-6">
              <div className="border-b border-[#E5E7EB] pb-4">
                <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                  Station Status: ONLINE
                </span>
                <h2 className="text-2xl font-black text-[#111827] mt-2">{selectedLocker.name}</h2>
                <p className="text-xs text-[#6B7280] flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-[#7567E8]" /> {selectedLocker.address}
                </p>
              </div>

              {/* OTP Generation Box */}
              <div className="bg-[#F9FAFB] p-6 rounded-2xl border border-[#E5E7EB] text-center space-y-4">
                <KeyRound className="w-10 h-10 text-[#7567E8] mx-auto" />
                <div>
                  <h3 className="text-lg font-bold text-[#111827] mb-1">Generate Drop-off Access PIN</h3>
                  <p className="text-xs text-[#4B5563] max-w-sm mx-auto">
                    Click below to reserve an automated locker compartment and receive your 6-digit drop-off PIN code.
                  </p>
                </div>

                {generatedOtp ? (
                  <div className="bg-white border border-emerald-300 p-4 rounded-xl max-w-xs mx-auto space-y-2 shadow-sm">
                    <div className="text-[10px] uppercase font-bold tracking-widest text-emerald-700">Reserved Locker #08 PIN</div>
                    <div className="text-3xl font-black tracking-widest text-[#111827] font-mono">{generatedOtp}</div>
                    <div className="text-[10px] text-[#6B7280]">Valid for 24 Hours • NGO Dispatch Notified</div>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateOtp}
                    className="px-6 py-3 rounded-xl bg-[#7567E8] hover:bg-[#6355d8] text-white font-bold text-xs shadow-md shadow-[#7567E8]/20 hover:scale-[1.02] transition-all inline-flex items-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    Reserve Locker & Generate OTP Code
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-[#6B7280] text-sm">Select a locker hub to generate a drop-off PIN</div>
          )}
        </div>
      </div>
    </div>
  );
};
