import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getActiveUrgentNeeds } from '../api/ngoApi';
import { NgoUrgentNeed } from '../types';

export const UrgentNeedsBanner: React.FC = () => {
  const [urgentNeeds, setUrgentNeeds] = useState<NgoUrgentNeed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActiveUrgentNeeds()
      .then((data) => setUrgentNeeds(Array.isArray(data) ? data : []))
      .catch(() => setUrgentNeeds([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !urgentNeeds || urgentNeeds.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-gradient-to-r from-rose-50 via-amber-50 to-purple-50 border-y border-rose-200 py-6 px-4 mb-8 shadow-sm">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <h3 className="text-lg font-bold text-[#111827] tracking-wide flex items-center gap-2">
              🚨 Urgent NGO Appeal Drives
            </h3>
          </div>
          <span className="text-xs font-semibold text-rose-700 bg-rose-100 px-3 py-1 rounded-full border border-rose-200">
            {urgentNeeds.length} Active Urgent Campaigns
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {urgentNeeds.map((need) => (
            <div
              key={need.id}
              className="bg-white p-4 rounded-xl border border-rose-200 hover:border-rose-400 hover:shadow-md transition-all flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 px-2 py-0.5 rounded border border-rose-200">
                    {need.category}
                  </span>
                  <span className="text-xs text-[#4B5563] font-medium truncate">
                    {need.ngoName || 'NGO Partner'}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-[#111827] mb-1 line-clamp-1">{need.title}</h4>
                <p className="text-xs text-[#4B5563] mb-3 line-clamp-2 leading-relaxed">{need.description}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB]">
                <span className="text-[11px] text-[#6B7280]">📍 {need.ngoCity || 'Verified NGO'}</span>
                <Link
                  to={`/donate/new?ngoId=${need.ngoId}&category=${need.category}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200 transition-all"
                >
                  Donate Now &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
