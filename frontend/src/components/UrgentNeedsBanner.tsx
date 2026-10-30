import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getActiveUrgentNeeds } from '../api/ngoApi';
import { NgoUrgentNeed } from '../types';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, HeartHandshake } from 'lucide-react';

const useAuthSafe = () => {
  try {
    return useAuth();
  } catch {
    return null;
  }
};

export const UrgentNeedsBanner: React.FC = () => {
  const auth = useAuthSafe();
  const user = auth?.user;
  const [urgentNeeds, setUrgentNeeds] = useState<NgoUrgentNeed[]>([]);
  const [loading, setLoading] = useState(true);

  const normalizedRole = user?.role
    ? (user.role as string).replace(/^ROLE_/, '').toUpperCase()
    : null;

  // Critical rule: Urgent NGO requirements must NEVER appear in the NGO or Delivery Partner portals.
  const isRestrictedRole = normalizedRole === 'NGO' || normalizedRole === 'VOLUNTEER';
  const isDonor = normalizedRole === 'DONOR';
  const isAdmin = normalizedRole === 'ADMIN';

  useEffect(() => {
    if (isRestrictedRole) {
      setLoading(false);
      return;
    }

    getActiveUrgentNeeds()
      .then((data) => setUrgentNeeds(Array.isArray(data) ? data : []))
      .catch(() => setUrgentNeeds([]))
      .finally(() => setLoading(false));
  }, [isRestrictedRole]);

  if (isRestrictedRole || loading || !urgentNeeds || urgentNeeds.length === 0) {
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
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-rose-700 bg-rose-100 px-3 py-1 rounded-full border border-rose-200">
              {urgentNeeds.length} Active Urgent {urgentNeeds.length === 1 ? 'Campaign' : 'Campaigns'}
            </span>
            {isAdmin && (
              <Link
                to="/admin/urgent-needs"
                className="text-xs font-bold text-[#7567E8] bg-white px-3 py-1 rounded-full border border-[#7567E8]/30 hover:bg-[#7567E8]/10 transition-colors"
              >
                Admin Monitor &rarr;
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {urgentNeeds.map((need) => {
            const requested = need.quantity || 0;
            const fulfilled = need.fulfilledQuantity || 0;
            const remaining = need.remainingQuantity != null
              ? need.remainingQuantity
              : Math.max(0, requested - fulfilled);
            const percent = requested > 0 ? Math.min(100, Math.round((fulfilled / requested) * 100)) : 0;

            return (
              <div
                key={need.id}
                className="bg-white p-4 rounded-xl border border-rose-200 hover:border-rose-400 hover:shadow-md transition-all flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 px-2 py-0.5 rounded border border-rose-200">
                      {need.category}
                    </span>
                    <span className="text-xs text-[#4B5563] font-medium truncate flex items-center gap-1">
                      {need.ngoName || 'NGO Partner'}
                      {need.ngoVerified && (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline shrink-0" />
                      )}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-[#111827] mb-1 line-clamp-1">{need.title}</h4>
                  <p className="text-xs text-[#4B5563] mb-3 line-clamp-2 leading-relaxed">{need.description}</p>

                  {/* Quantity & Progress Tracker */}
                  <div className="mb-3 space-y-1 bg-[#F9FAFB] p-2.5 rounded-lg border border-[#E5E7EB]">
                    <div className="flex justify-between text-[11px] font-medium text-[#4B5563]">
                      <span>Progress: <strong className="text-[#111827]">{fulfilled}</strong> / {requested}</span>
                      <span className="text-rose-600 font-bold">Needed: {remaining}</span>
                    </div>
                    <div className="w-full bg-[#E5E7EB] rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-rose-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB]">
                  <span className="text-[11px] text-[#6B7280]">📍 {need.ngoCity || 'Verified NGO'}</span>
                  {isDonor && (
                    <Link
                      to={`/donate/new?urgentNeedId=${need.id}&ngoId=${need.ngoId}&category=${need.category}&item=${encodeURIComponent(need.title)}&remaining=${remaining}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200 transition-all"
                    >
                      <HeartHandshake className="w-3.5 h-3.5" />
                      Donate Now &rarr;
                    </Link>
                  )}
                  {isAdmin && (
                    <span className="text-[11px] text-[#7567E8] font-semibold bg-[#7567E8]/10 px-2.5 py-1 rounded border border-[#7567E8]/20">
                      Monitoring Mode
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
