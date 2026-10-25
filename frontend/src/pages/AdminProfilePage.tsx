import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Mail, LayoutDashboard, Users, LogOut, Database } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminProfilePage: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const initial = user.fullName ? user.fullName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase();

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 sm:p-10 shadow-sm space-y-8 relative overflow-hidden">
        
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <Shield className="w-64 h-64 text-[#7567E8]" />
        </div>

        {/* Profile Header */}
        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-8 border-b border-[#E5E7EB]">
          <div className="w-24 h-24 rounded-full bg-[#7567E8] flex items-center justify-center text-white font-bold text-4xl shadow-md shrink-0 border-4 border-white">
            {initial}
          </div>
          <div className="text-center sm:text-left pt-2">
            <h1 className="text-3xl font-extrabold text-[#111827] mb-2">{user.fullName || 'System Administrator'}</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7567E8]/10 text-[#7567E8] font-bold text-xs uppercase tracking-wider border border-[#7567E8]/20">
              <Shield className="w-3.5 h-3.5" />
              {user.role}
            </span>
          </div>
        </div>

        {/* Profile Details */}
        <div className="relative grid sm:grid-cols-2 gap-6">
          <div className="bg-[#F9FAFB] p-5 rounded-2xl border border-[#E5E7EB]">
            <div className="flex items-center gap-3 text-[#4B5563] mb-1">
              <User className="w-5 h-5 text-[#7567E8]" />
              <span className="text-sm font-semibold uppercase tracking-wider">Full Name</span>
            </div>
            <p className="text-lg font-bold text-[#111827] pl-8">{user.fullName || 'Not provided'}</p>
          </div>

          <div className="bg-[#F9FAFB] p-5 rounded-2xl border border-[#E5E7EB]">
            <div className="flex items-center gap-3 text-[#4B5563] mb-1">
              <Mail className="w-5 h-5 text-[#7567E8]" />
              <span className="text-sm font-semibold uppercase tracking-wider">Email Address</span>
            </div>
            <p className="text-lg font-bold text-[#111827] pl-8">{user.email}</p>
          </div>
        </div>

        {/* Quick Links / Actions */}
        <div className="relative pt-6 border-t border-[#E5E7EB]">
          <h2 className="text-lg font-bold text-[#111827] mb-4">Administration Links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link 
              to="/admin" 
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[#F4F2FA] hover:bg-[#EAE6F5] text-[#7567E8] font-bold rounded-xl transition-colors border border-[#7567E8]/20 shadow-xs"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            
            <Link 
              to="/admin/ngos" 
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[#F4F2FA] hover:bg-[#EAE6F5] text-[#7567E8] font-bold rounded-xl transition-colors border border-[#7567E8]/20 shadow-xs"
            >
              <Users className="w-4 h-4" />
              Manage NGOs
            </Link>
            
            <Link 
              to="/admin/donations" 
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[#F4F2FA] hover:bg-[#EAE6F5] text-[#7567E8] font-bold rounded-xl transition-colors border border-[#7567E8]/20 shadow-xs"
            >
              <Database className="w-4 h-4" />
              All Donations
            </Link>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button 
              onClick={() => logout()}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-rose-50 text-rose-600 font-bold rounded-xl transition-colors border border-rose-200 shadow-xs w-full sm:w-auto"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
