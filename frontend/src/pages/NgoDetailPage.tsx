import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getNgoById } from '../api/ngoApi';
import { NGOProfile } from '../types';
import { Building2, ShieldCheck, MapPin, Phone, Mail, ArrowLeft, HeartHandshake, Calendar, Star } from 'lucide-react';
import { formatDate } from '../utils/formatters';

export const NgoDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ngo, setNgo] = useState<NGOProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getNgoById(id)
      .then(setNgo)
      .catch((err) => setError(err.message || 'Failed to load NGO profile.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-8 h-8 border-2 border-[#7567E8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[#6B7280] text-sm">Loading NGO profile...</p>
      </div>
    );
  }

  if (error || !ngo) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center text-rose-700 space-y-4">
        <p className="font-semibold">{error || 'NGO profile not found.'}</p>
        <button
          onClick={() => navigate('/ngos')}
          className="px-4 py-2 rounded-xl bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] text-xs font-semibold transition-colors"
        >
          Back to All NGOs
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      <button
        onClick={() => navigate('/ngos')}
        className="inline-flex items-center gap-2 text-xs font-semibold text-[#6B7280] hover:text-[#111827] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to NGO Directory
      </button>

      {/* Main Profile Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 sm:p-10 shadow-sm space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-[#E5E7EB]">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#7567E8] to-rose-500 flex items-center justify-center text-white font-bold text-2xl shadow-md shadow-[#7567E8]/20 shrink-0">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827]">{ngo.name}</h1>
                {ngo.verified && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified
                  </span>
                )}
              </div>
              <p className="text-[#4B5563] text-xs mt-1">
                Registered Partner &bull; Member since {formatDate(ngo.createdAt)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                {typeof ngo.averageRating === 'number' && !isNaN(ngo.averageRating) && (ngo.ratingCount ?? 0) > 0 ? (
                  <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-amber-700 font-bold text-sm">{ngo.averageRating.toFixed(1)}</span>
                    <span className="text-amber-600 text-xs">({ngo.ratingCount} reviews)</span>
                  </div>
                ) : (
                  <div className="text-xs text-[#6B7280] bg-[#F9FAFB] border border-[#E5E7EB] px-2 py-1 rounded-lg">No reviews yet</div>
                )}
              </div>
            </div>
          </div>

          <Link
            to={`/donate/new?ngoId=${ngo.id}`}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#7567E8] hover:bg-[#6355d8] text-white font-bold text-sm shadow-md shadow-[#7567E8]/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
          >
            <HeartHandshake className="w-5 h-5" />
            Donate to this NGO
          </Link>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-[#111827] uppercase tracking-wider text-xs">About the NGO</h2>
            <p className="text-[#4B5563] text-sm leading-relaxed whitespace-pre-line">
              {ngo.description || 'This organization has not provided a detailed description yet.'}
            </p>
          </div>

          <div className="bg-[#F9FAFB] p-6 rounded-2xl border border-[#E5E7EB] space-y-4">
            <h2 className="text-xs font-bold text-[#374151] uppercase tracking-wider">Contact & Location</h2>

            <div className="space-y-3 text-xs text-[#111827]">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#7567E8] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[10px] text-[#6B7280] uppercase font-semibold">Address</span>
                  <span>{ngo.address}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-[#7567E8] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[10px] text-[#6B7280] uppercase font-semibold">Phone</span>
                  <span>{ngo.phone}</span>
                </div>
              </div>

              {ngo.user?.email && (
                <div className="flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-[#7567E8] shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[10px] text-[#6B7280] uppercase font-semibold">Email</span>
                    <span>{ngo.user.email}</span>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2.5 pt-2 border-t border-[#E5E7EB]">
                <Calendar className="w-4 h-4 text-[#7567E8] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[10px] text-[#6B7280] uppercase font-semibold">Joined</span>
                  <span>{formatDate(ngo.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
