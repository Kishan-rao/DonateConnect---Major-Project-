import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getVerifiedNgos } from '../api/ngoApi';
import { NGOProfile } from '../types';
import { Building2, Search, ShieldCheck, MapPin, Phone, ArrowRight, HeartHandshake, Filter, Navigation, Compass, Star } from 'lucide-react';

const CATEGORIES = [
  'FOOD', 'CLOTHING', 'MEDICAL', 'EDUCATION', 'FURNITURE', 'OTHER'
];

export const NgoListPage: React.FC = () => {
  const navigate = useNavigate();
  const [ngos, setNgos] = useState<NGOProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [categoryFilter, setCategoryFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [needsRightNowFilter, setNeedsRightNowFilter] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  const fetchNgos = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getVerifiedNgos({
        category: categoryFilter,
        city: cityFilter,
        needsRightNow: needsRightNowFilter,
        donorLat: userLoc?.lat,
        donorLng: userLoc?.lng
      });
      setNgos(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load NGO partners.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNgos();
  }, [categoryFilter, cityFilter, needsRightNowFilter, userLoc]);

  const requestLocation = () => {
    if (userLoc) {
      setUserLoc(null);
      return;
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          if (typeof lat === 'number' && !isNaN(lat) && typeof lng === 'number' && !isNaN(lng)) {
            setUserLoc({ lat, lng });
          }
        },
        (err) => console.error("Geolocation error:", err)
      );
    }
  };

  const filteredNgos = (ngos || []).filter(
    (ngo) =>
      (ngo.name && ngo.name.toLowerCase().includes(search.toLowerCase())) ||
      (ngo.description && ngo.description.toLowerCase().includes(search.toLowerCase())) ||
      (ngo.address && ngo.address.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#111827] tracking-tight flex items-center gap-3">
            <Building2 className="w-8 h-8 text-[#7567E8]" />
            Verified NGO Partners
          </h1>
          <p className="text-[#4B5563] text-sm mt-1">
            Browse verified non-profit organizations accepting community donations
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-[#E5E7EB] p-5 rounded-2xl flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by NGO name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#7567E8] transition-colors"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827] text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#7567E8] min-w-[140px]"
          >
            <option value="">Any Category</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          
          <input
            type="text"
            placeholder="City filter..."
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="w-32 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#7567E8]"
          />

          <label className="flex items-center gap-2 text-sm text-[#374151] cursor-pointer">
            <input 
              type="checkbox" 
              checked={needsRightNowFilter}
              onChange={(e) => setNeedsRightNowFilter(e.target.checked)}
              className="rounded bg-[#F9FAFB] border-[#E5E7EB] text-[#7567E8] focus:ring-[#7567E8]/20"
            />
            Needs Right Now
          </label>

          <button 
            onClick={requestLocation}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${userLoc ? 'bg-[#7567E8] text-white shadow-sm' : 'bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]'}`}
          >
            <Navigation className="w-4 h-4" />
            {userLoc ? 'Sorted by Distance' : 'Sort by Distance'}
          </button>
        </div>
      </div>

      {/* NGO Grid */}
      {loading ? (
        <div className="text-center py-16 bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB]">
          <div className="w-8 h-8 border-2 border-[#7567E8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#6B7280] text-sm">Fetching verified NGO profiles...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center text-rose-700 space-y-3">
          <p className="font-semibold">{error}</p>
          <button
            onClick={fetchNgos}
            className="px-4 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-semibold transition-colors"
          >
            Retry Loading
          </button>
        </div>
      ) : filteredNgos.length === 0 ? (
        <div className="text-center py-16 bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB] space-y-3">
          <Building2 className="w-12 h-12 text-[#9CA3AF] mx-auto" />
          <h3 className="text-[#111827] font-semibold text-lg">No verified NGOs found</h3>
          <p className="text-[#6B7280] text-sm max-w-sm mx-auto">
            {ngos.length === 0
              ? 'No verified NGO profiles are registered in the system yet.'
              : 'Try clearing or modifying your search filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNgos.map((ngo) => (
            <div
              key={ngo.id}
              onClick={() => navigate(`/ngos/${ngo.id}`)}
              className="group cursor-pointer bg-white border border-[#E5E7EB] hover:border-[#7567E8]/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-md flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified NGO
                  </span>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold text-[#111827] group-hover:text-[#7567E8] transition-colors">
                    {ngo.name}
                  </h2>
                  {typeof ngo.averageRating === 'number' && !isNaN(ngo.averageRating) && (ngo.ratingCount ?? 0) > 0 ? (
                    <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span className="text-amber-700 font-bold text-xs">{ngo.averageRating.toFixed(1)}</span>
                      <span className="text-amber-600 text-[10px]">({ngo.ratingCount})</span>
                    </div>
                  ) : (
                    <span className="text-xs text-[#9CA3AF]">No ratings yet</span>
                  )}
                </div>

                <p className="text-[#4B5563] text-sm mb-4 line-clamp-2 leading-relaxed">
                  {ngo.description || 'Verified non-profit partner committed to community support.'}
                </p>

                {ngo.urgentNeeds && ngo.urgentNeeds.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Urgent Needs:</span>
                    <div className="flex flex-wrap gap-2">
                      {ngo.urgentNeeds.slice(0, 3).map(need => (
                        <span key={need.id} className="text-xs bg-rose-50 text-rose-700 border border-rose-200 px-2 py-1 rounded-md flex items-center gap-1.5">
                          {need.title} <span className="text-[10px] bg-rose-100 text-rose-800 px-1 rounded font-semibold">{need.quantity || 'Any'}</span>
                        </span>
                      ))}
                      {ngo.urgentNeeds.length > 3 && (
                        <span className="text-xs bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB] px-2 py-1 rounded-md">
                          +{ngo.urgentNeeds.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-[#E5E7EB] pt-4 mt-2 space-y-3">
                <div className="space-y-1.5 text-xs text-[#6B7280]">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#7567E8] shrink-0" />
                    <span className="truncate">{ngo.address || 'Address not provided'} {ngo.city ? `(${ngo.city})` : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#7567E8] shrink-0" />
                    <span>{ngo.phone || 'Phone not provided'}</span>
                  </div>
                  {userLoc ? (
                    typeof ngo.distanceKm === 'number' && !isNaN(ngo.distanceKm) ? (
                      <div className="flex items-center gap-2 text-[#7567E8] font-medium">
                        <Compass className="w-3.5 h-3.5 shrink-0" />
                        <span>{ngo.distanceKm.toFixed(1)} km away</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[#9CA3AF]">
                        <Compass className="w-3.5 h-3.5 shrink-0" />
                        <span>Distance unavailable</span>
                      </div>
                    )
                  ) : typeof ngo.distanceKm === 'number' && !isNaN(ngo.distanceKm) ? (
                    <div className="flex items-center gap-2 text-[#7567E8] font-medium">
                      <Compass className="w-3.5 h-3.5 shrink-0" />
                      <span>{ngo.distanceKm.toFixed(1)} km away</span>
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-semibold text-[#7567E8] group-hover:underline flex items-center gap-1">
                    View Profile & Donate <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                  <Link
                    to={`/donate/new?ngoId=${ngo.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="px-3 py-1.5 rounded-lg bg-[#7567E8]/10 hover:bg-[#7567E8] text-[#7567E8] hover:text-white font-semibold text-xs transition-colors border border-[#7567E8]/20 flex items-center gap-1"
                  >
                    <HeartHandshake className="w-3.5 h-3.5" />
                    Donate
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
