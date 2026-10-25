import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getVerifiedNgos } from '../api/ngoApi';
import { NGOProfile } from '../types';
import { UrgentNeedsBanner } from '../components/UrgentNeedsBanner';
import {
  HeartHandshake,
  ArrowRight,
  Zap,
  Building2,
  ShieldCheck,
  MapPin,
  Phone
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const [ngos, setNgos] = useState<NGOProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVerifiedNgos()
      .then((data: NGOProfile[]) => {
        if (Array.isArray(data)) {
          setNgos(data.slice(0, 3));
        } else {
          setNgos([]);
        }
      })
      .catch(() => setNgos([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-12 py-8">
      {/* Urgent Appeal Campaigns Banner */}
      <UrgentNeedsBanner />

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FAF8F5] via-[#F4F2FA] to-[#EBE7F9] border border-[#E5E7EB] p-8 sm:p-12 lg:p-16 shadow-sm">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#7567E8]/10 border border-[#7567E8]/20 text-xs font-bold text-[#7567E8]">
            <Zap className="w-3.5 h-3.5 text-[#7567E8]" />
            <span>Verified NGO & Community Relief Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-[#111827]">
            Connecting Generosity With{' '}
            <span className="bg-gradient-to-r from-[#7567E8] to-[#5844e0] bg-clip-text text-transparent">
              Verified NGOs
            </span>
          </h1>

          <p className="text-base sm:text-lg leading-relaxed max-w-2xl mx-auto font-medium text-[#4B5563]">
            DonateConnect helps donors share essential items with verified NGO partners, track requests, and support community needs with confidence.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              to="/donate/new"
              className="px-6 py-3.5 rounded-xl bg-[#7567E8] hover:bg-[#6355d8] text-white font-bold text-sm shadow-md shadow-[#7567E8]/20 hover:scale-[1.02] transition-all flex items-center gap-2"
            >
              <HeartHandshake className="w-5 h-5 text-white" />
              Donate Now
            </Link>
            <Link
              to="/impact"
              className="px-6 py-3.5 rounded-xl bg-white text-[#111827] border border-[#E5E7EB] hover:bg-[#F9FAFB] font-bold text-sm transition-colors flex items-center gap-2 shadow-sm"
            >
              View Impact Analytics <ArrowRight className="w-4 h-4 text-[#111827]" />
            </Link>
          </div>
        </div>
      </section>

      {/* Verified NGOs Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#111827] flex items-center gap-2">
              <Building2 className="w-6 h-6 text-[#7567E8]" />
              Verified NGO Partners
            </h2>
            <p className="text-[#4B5563] text-sm">Public verified organizations accepting donations</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB]">
            <div className="w-8 h-8 border-2 border-[#7567E8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[#6B7280] text-sm">Loading verified NGOs...</p>
          </div>
        ) : !ngos || ngos.length === 0 ? (
          <div className="text-center py-12 bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB] space-y-3">
            <Building2 className="w-10 h-10 text-[#9CA3AF] mx-auto" />
            <h3 className="text-[#111827] font-semibold">No verified NGOs registered yet</h3>
            <p className="text-[#6B7280] text-xs max-w-sm mx-auto">
              Admins can register and verify NGO partners from the admin dashboard.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ngos.map((ngo) => (
              <div key={ngo.id} className="bg-white border border-[#E5E7EB] rounded-2xl p-6 hover:border-[#7567E8]/50 hover:shadow-md transition-all flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified NGO
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#111827] mb-2">{ngo.name}</h3>
                  <p className="text-[#4B5563] text-sm mb-4 line-clamp-3">
                    {ngo.description || 'Verified non-governmental partner organization.'}
                  </p>
                </div>
                <div className="border-t border-[#E5E7EB] pt-3 space-y-1.5 text-xs text-[#6B7280]">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#7567E8]" />
                    <span>{ngo.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#7567E8]" />
                    <span>{ngo.phone}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
