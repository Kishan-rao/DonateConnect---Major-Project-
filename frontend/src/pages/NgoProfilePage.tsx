import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { getOwnNgoProfile, updateOwnNgoProfile, createUrgentNeed } from '../api/ngoApi';
import { NGOProfile, UpdateNgoProfileDto, CreateUrgentNeedRequest, Category } from '../types';
import { Building2, ShieldCheck, MapPin, Phone, Save, CheckCircle2, Plus, AlertCircle, Info } from 'lucide-react';
import { formatDate } from '../utils/formatters';

const CATEGORIES: Category[] = ['FOOD', 'CLOTHES', 'BOOKS', 'STATIONERY', 'TOYS', 'OTHER'];

export const NgoProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<NGOProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [newNeedTitle, setNewNeedTitle] = useState('');
  const [newNeedDesc, setNewNeedDesc] = useState('');
  const [newNeedCategory, setNewNeedCategory] = useState<Category>('FOOD');
  const [newNeedQty, setNewNeedQty] = useState('');
  const [addingNeed, setAddingNeed] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UpdateNgoProfileDto>();

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOwnNgoProfile();
      setProfile(data);
      setValue('name', data.name);
      setValue('description', data.description || '');
      setValue('address', data.address);
      setValue('phone', data.phone);
    } catch (err: any) {
      setError(err.message || 'Failed to load NGO profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const onSubmit = async (data: UpdateNgoProfileDto) => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const updated = await updateOwnNgoProfile(data);
      setProfile(updated);
      setSuccessMessage('Organization profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNeedTitle) return;
    
    setAddingNeed(true);
    setError(null);
    try {
      const dto: CreateUrgentNeedRequest = {
        title: newNeedTitle,
        description: newNeedDesc || newNeedTitle,
        category: newNeedCategory,
        quantity: newNeedQty ? parseInt(newNeedQty, 10) : undefined
      };
      await createUrgentNeed(dto);
      setNewNeedTitle('');
      setNewNeedDesc('');
      setNewNeedQty('');
      setSuccessMessage('Urgent donation requirement published successfully! Active requirements are published directly to Donors and Administrators.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to publish urgent requirement');
    } finally {
      setAddingNeed(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Loading your NGO profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 sm:p-10 shadow-sm space-y-8">
        {/* Profile Header */}
        <div className="flex items-center justify-between pb-6 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#7567E8]/10 text-[#7567E8] border border-[#7567E8]/20 flex items-center justify-center font-bold text-xl">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-[#111827]">{profile?.name}</h1>
                {profile?.verified && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified
                  </span>
                )}
              </div>
              <p className="text-[#4B5563] text-xs mt-1">
                Account Email: {profile?.user?.email} &bull; Joined {formatDate(profile?.createdAt || '')}
              </p>
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[#4B5563] uppercase tracking-wider mb-2">
              Organization Name *
            </label>
            <input
              type="text"
              {...register('name', { required: 'NGO Name is required' })}
              className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#7567E8] transition-colors"
            />
            {errors.name && (
              <p className="text-rose-600 text-xs mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4B5563] uppercase tracking-wider mb-2">
              Address / Primary Location *
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                {...register('address', { required: 'Address is required' })}
                className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#111827] focus:outline-none focus:border-[#7567E8] transition-colors"
              />
            </div>
            {errors.address && (
              <p className="text-rose-600 text-xs mt-1">{errors.address.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4B5563] uppercase tracking-wider mb-2">
              Contact Phone Number *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                {...register('phone', { required: 'Phone is required' })}
                className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#111827] focus:outline-none focus:border-[#7567E8] transition-colors"
              />
            </div>
            {errors.phone && (
              <p className="text-rose-600 text-xs mt-1">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4B5563] uppercase tracking-wider mb-2">
              Organization Description & Mission
            </label>
            <textarea
              rows={4}
              {...register('description')}
              className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#7567E8] transition-colors"
            />
          </div>

          <div className="pt-4 border-t border-[#E5E7EB]">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#7567E8] hover:bg-[#7567E8]/90 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Profile Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Publish Urgent Needs Section */}
      <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 sm:p-10 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-[#111827] flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-500" />
            Publish Urgent Donation Requirement
          </h2>
          <p className="text-sm text-[#4B5563] mt-1">
            Specify critical relief items and quantities needed immediately. Published requirements are broadcasted across the donor portal and monitored by administrators until fulfilled.
          </p>
        </div>

        <form onSubmit={handleAddNeed} className="bg-[#F9FAFB] p-5 rounded-2xl border border-[#E5E7EB] flex flex-col md:flex-row gap-4">
          <div className="flex-1 space-y-3">
            <input
              type="text"
              placeholder="What do you urgently need? (e.g., 100 Blankets, 50 kg Rice)"
              value={newNeedTitle}
              onChange={e => setNewNeedTitle(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#7567E8]"
              required
            />
            <input
              type="text"
              placeholder="Detailed description / notes (optional)"
              value={newNeedDesc}
              onChange={e => setNewNeedDesc(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#7567E8]"
            />
            <div className="flex gap-3">
              <select
                value={newNeedCategory}
                onChange={e => setNewNeedCategory(e.target.value as Category)}
                className="bg-white border border-[#E5E7EB] text-[#111827] text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-[#7567E8] flex-1"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                type="number"
                min="1"
                placeholder="Requested Qty"
                value={newNeedQty}
                onChange={e => setNewNeedQty(e.target.value)}
                className="w-36 bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#7567E8]"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={addingNeed || !newNeedTitle}
            className="md:self-start px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition-all shadow-xs flex items-center gap-2 disabled:opacity-50 shrink-0"
          >
            {addingNeed ? 'Publishing...' : <><Plus className="w-4 h-4" /> Publish Requirement</>}
          </button>
        </form>

        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-800 text-xs leading-relaxed">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            <strong>Note on Urgent Requirements:</strong> Once published, requirements appear in the Donor Portal and Admin Monitoring Dashboard. Donors donate directly toward the required quantity through the standard verified delivery and OTP receipt workflow.
          </p>
        </div>
      </div>
    </div>
  );
};
