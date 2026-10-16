import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  User,
  HeartHandshake,
  PackageSearch,
  Settings,
  LogOut,
  Shield,
  Building2,
  Truck,
  PlusCircle,
} from 'lucide-react';

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const initial = user.fullName
    ? user.fullName.charAt(0).toUpperCase()
    : user.email.charAt(0).toUpperCase();

  const handleLogout = () => {
    onClose();
    logout();
    navigate('/');
  };

  const getProfilePath = () => {
    switch (user?.role) {
      case 'ADMIN': return '/admin/profile';
      case 'NGO': return '/ngo-dashboard/profile';
      default: return '/donor/profile';
    }
  };

  const handleNavigation = (path: string) => {
    onClose();
    navigate(path);
  };

  const menuItemClass =
    'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-[#4B5563] hover:bg-[#F4F2FA] hover:text-[#111827] transition-colors';

  const iconClass = 'w-4 h-4 text-[#6B7280]';

  return (
    <div
      ref={dropdownRef}
      role="menu"
      aria-label="User menu"
      className="absolute top-full right-0 mt-2 w-56 rounded-2xl shadow-xl bg-white border border-[#E5E7EB] z-50 overflow-hidden"
    >
      {/* Header — user identity */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="w-9 h-9 rounded-full bg-[#7567E8] flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-extrabold truncate leading-tight text-[#111827]">
            {user.fullName}
          </p>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mt-0.5 text-[#7567E8]">
            <Shield className="w-2.5 h-2.5" />
            {user.role}
          </span>
        </div>
      </div>

      {/* Menu items */}
      <div className="p-1.5 space-y-0.5">
        {user.role === 'NGO' && (
          <>
            <button
              role="menuitem"
              onClick={() => handleNavigation('/ngo-dashboard')}
              className={menuItemClass}
            >
              <Building2 className={iconClass} />
              Assigned Requests
            </button>
            <button
              role="menuitem"
              onClick={() => handleNavigation('/ngo-dashboard/inventory')}
              className={menuItemClass}
            >
              <PackageSearch className={iconClass} />
              Delivered Inventory
            </button>
            <button
              role="menuitem"
              onClick={() => handleNavigation('/ngo-dashboard/profile')}
              className={menuItemClass}
            >
              <User className={iconClass} />
              NGO Profile
            </button>
          </>
        )}

        {user.role === 'DONOR' && (
          <>
            <button
              role="menuitem"
              onClick={() => handleNavigation('/donations')}
              className={menuItemClass}
            >
              <HeartHandshake className={iconClass} />
              My Donations
            </button>
            <button
              role="menuitem"
              onClick={() => handleNavigation('/donate/new')}
              className={menuItemClass}
            >
              <PlusCircle className={iconClass} />
              New Donation
            </button>
            <button
              role="menuitem"
              onClick={() => handleNavigation('/donor/profile')}
              className={menuItemClass}
            >
              <User className={iconClass} />
              Donor Profile
            </button>
          </>
        )}

        {user.role === 'VOLUNTEER' && (
          <>
            <button
              role="menuitem"
              onClick={() => handleNavigation('/driver-dashboard')}
              className={menuItemClass}
            >
              <Truck className={iconClass} />
              Delivery Console
            </button>
          </>
        )}

        {user.role === 'ADMIN' && (
          <>
            <button
              role="menuitem"
              onClick={() => handleNavigation('/admin')}
              className={menuItemClass}
            >
              <Shield className={iconClass} />
              Admin Portal
            </button>
            <button
              role="menuitem"
              onClick={() => handleNavigation('/admin/ngos')}
              className={menuItemClass}
            >
              <Building2 className={iconClass} />
              Manage NGOs
            </button>
            <button
              role="menuitem"
              onClick={() => handleNavigation('/admin/profile')}
              className={menuItemClass}
            >
              <User className={iconClass} />
              Admin Profile
            </button>
          </>
        )}

        {user.role === 'CORPORATE' && (
          <>
            <button
              role="menuitem"
              onClick={() => handleNavigation('/csr-dashboard')}
              className={menuItemClass}
            >
              <Building2 className={iconClass} />
              CSR Hub
            </button>
          </>
        )}

        <button
          role="menuitem"
          onClick={() => handleNavigation('/settings')}
          className={menuItemClass}
        >
          <Settings className={iconClass} />
          Settings
        </button>
      </div>

      {/* Divider + Logout */}
      <div className="border-t border-[#E5E7EB] p-1.5">
        <button
          role="menuitem"
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-[#DC2626] hover:bg-[#FEE2E2] transition-colors font-bold"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
};
