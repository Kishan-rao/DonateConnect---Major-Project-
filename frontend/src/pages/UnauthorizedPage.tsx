import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const UnauthorizedPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  const getAuthorizedPortal = () => {
    if (!user) return null;
    const role = (user.role || '').replace(/^ROLE_/, '');
    switch (role) {
      case 'NGO':
        return { label: 'Go to NGO Portal', path: '/ngo-dashboard' };
      case 'DONOR':
        return { label: 'Go to Donor Portal', path: '/donations' };
      case 'VOLUNTEER':
        return { label: 'Go to Delivery Partner Console', path: '/driver-dashboard' };
      case 'ADMIN':
        return { label: 'Go to Admin Portal', path: '/admin' };
      case 'CORPORATE':
        return { label: 'Go to CSR Hub', path: '/csr-dashboard' };
      default:
        return null;
    }
  };

  const portal = isAuthenticated ? getAuthorizedPortal() : null;

  return (
    <div className="max-w-md mx-auto py-16 text-center space-y-6">
      <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
        <ShieldAlert className="w-10 h-10" />
      </div>

      <h1 className="text-3xl font-extrabold text-[#111827]">403 - Access Denied</h1>

      <p className="text-[#4B5563] text-sm leading-relaxed">
        You do not have the required role or permissions to access this page. Please use your designated role portal or sign in with an authorized account.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        {portal && (
          <Link
            to={portal.path}
            className="px-5 py-2.5 rounded-xl bg-[#7567E8] hover:bg-[#7567E8]/90 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-xs"
          >
            <LayoutDashboard className="w-4 h-4" />
            {portal.label}
          </Link>
        )}
        <Link
          to="/"
          className="px-5 py-2.5 rounded-xl bg-white hover:bg-[#F4F2FA] text-[#374151] border border-[#E5E7EB] font-semibold text-xs transition-colors flex items-center gap-2 shadow-xs"
        >
          <Home className="w-4 h-4" />
          Home
        </Link>
        <Link
          to="/login"
          className="px-5 py-2.5 rounded-xl bg-white hover:bg-[#F4F2FA] text-[#374151] font-semibold text-xs border border-[#E5E7EB] transition-colors flex items-center gap-2 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          Switch Account
        </Link>
      </div>
    </div>
  );
};
