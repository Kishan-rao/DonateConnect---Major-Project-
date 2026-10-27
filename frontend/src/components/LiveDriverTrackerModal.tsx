import React, { useEffect, useState } from 'react';
import { Truck, Navigation, Phone, ShieldCheck, MapPin, X, CheckCircle2, Clock } from 'lucide-react';
import { pushModalDismiss } from '../utils/useAndroidBackButton';

interface LiveDriverTrackerModalProps {
  donationTitle: string;
  driverName: string;
  driverPhone: string;
  onClose: () => void;
}

export const LiveDriverTrackerModal: React.FC<LiveDriverTrackerModalProps> = ({
  donationTitle,
  driverName,
  driverPhone,
  onClose,
}) => {
  // Simulated GPS Coordinates animating towards destination
  const [progress, setProgress] = useState(25); // Percentage completed along route
  const [etaMinutes, setEtaMinutes] = useState(8);
  const [driverSpeed, setDriverSpeed] = useState(32); // km/h

  useEffect(() => {
    return pushModalDismiss(onClose);
  }, [onClose]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });

      setEtaMinutes((prev) => (prev > 1 ? prev - 1 : 1));
      setDriverSpeed(Math.floor(28 + Math.random() * 10));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#E5E7EB] rounded-3xl max-w-lg w-full p-6 space-y-6 relative shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-[#7567E8] flex items-center justify-center">
              <Truck className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#111827]">Live Uber-Style GPS Driver Tracker</h3>
              <p className="text-xs text-[#4B5563]">Real-time driver location stream for NGO & Donor</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-[#F9FAFB] text-[#4B5563] hover:text-[#111827]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Simulated GPS Radar Map Canvas */}
        <div className="relative bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl h-56 overflow-hidden p-4 flex flex-col justify-between">
          {/* Grid pattern background */}
          <div className="absolute inset-0 bg-[radial-gradient(#E5E7EB_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          {/* Top Status Overlay */}
          <div className="relative z-10 flex items-center justify-between bg-white/95 p-2.5 rounded-xl border border-[#E5E7EB] text-xs shadow-xs">
            <div className="flex items-center gap-2 text-emerald-700 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              LIVE GPS STREAMING &bull; {driverSpeed} km/h
            </div>
            <div className="text-[#4B5563] font-mono flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#7567E8]" /> ETA: <span className="text-[#111827] font-bold">{progress >= 100 ? 'ARRIVED!' : `${etaMinutes} Mins`}</span>
            </div>
          </div>

          {/* Animated Route Line & Moving Driver Pin */}
          <div className="relative z-10 my-auto py-4">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#6B7280] mb-2">
              <span className="flex items-center gap-1 text-[#374151]"><MapPin className="w-3.5 h-3.5 text-rose-500" /> Pickup Point</span>
              <span className="flex items-center gap-1 text-emerald-700"><ShieldCheck className="w-3.5 h-3.5" /> NGO Hub Destination</span>
            </div>

            {/* Progress Bar Track */}
            <div className="w-full h-3 bg-gray-200 rounded-full relative overflow-hidden border border-[#E5E7EB]">
              <div
                className="h-full bg-gradient-to-r from-rose-500 via-[#7567E8] to-emerald-500 transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Live Moving Vehicle Icon */}
            <div
              className="relative -mt-6 transition-all duration-700 ease-out flex flex-col items-center"
              style={{ left: `calc(${Math.min(progress, 92)}% - 16px)` }}
            >
              <div className="w-8 h-8 rounded-full bg-[#7567E8] border-2 border-white text-white flex items-center justify-center shadow-md">
                <Truck className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-bold text-[#7567E8] bg-white px-1.5 py-0.5 rounded border border-[#E5E7EB] shadow-xs mt-0.5 whitespace-nowrap">
                {driverName.split(' ')[0]} (Live)
              </span>
            </div>
          </div>

          {/* Bottom GPS Coordinates readout */}
          <div className="relative z-10 flex items-center justify-between text-[10px] text-[#6B7280] font-mono border-t border-[#E5E7EB] pt-2">
            <span>Lat: 12.9716° N, Long: 77.5946° E</span>
            <span className="text-[#7567E8] font-semibold">{progress}% Route Completed</span>
          </div>
        </div>

        {/* Driver Info Card */}
        <div className="bg-[#F9FAFB] p-4 rounded-2xl border border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 text-[#7567E8] flex items-center justify-center font-bold text-sm">
              {driverName.charAt(0)}
            </div>
            <div>
              <div className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
                {driverName}
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200">Verified Driver</span>
              </div>
              <p className="text-[11px] text-[#6B7280] mt-0.5">Assigned to: {donationTitle}</p>
            </div>
          </div>

          <a
            href={`tel:${driverPhone}`}
            className="px-3.5 py-2 rounded-xl bg-[#7567E8] hover:bg-[#7567E8]/90 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Phone className="w-3.5 h-3.5" /> Call Driver
          </a>
        </div>
      </div>
    </div>
  );
};
