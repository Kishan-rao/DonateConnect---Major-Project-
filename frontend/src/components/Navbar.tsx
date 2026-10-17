import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HeartHandshake,
  Home,
  LogIn,
  UserPlus,
  Shield,
  Building2,
  BarChart3,
  MapPin,
  Truck,
  Lock,
  Cpu,
  Recycle,
  Mic,
  ChevronDown,
  Menu,
  X,
  PlusCircle,
  PackageSearch,
  PackageCheck,
  User,
  Settings,
  LogOut,
  FileText,
} from 'lucide-react';
import { HealthBadge } from './HealthBadge';
import { NotificationBell } from './NotificationBell';
import { VoiceAssistantModal } from './VoiceAssistantModal';
import { ProfileDropdown } from './ProfileDropdown';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isDonor = user?.role === 'DONOR';
  const isNgo = user?.role === 'NGO';
  const isAdmin = user?.role === 'ADMIN';
  const isVolunteer = user?.role === 'VOLUNTEER';
  const isCorporate = user?.role === 'CORPORATE';

  const showPrototypes = import.meta.env.VITE_SHOW_PROTOTYPES === 'true';

  // Close drawer and dropdown on route change
  useEffect(() => {
    setDrawerOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  // Close drawer on Escape key
  useEffect(() => {
    if (!drawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen]);

  const navLinkClass = (path: string) =>
    `flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all min-h-[36px] ${
      isActive(path)
        ? 'bg-[#7567E8] text-white shadow-xs font-bold'
        : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F4F2FA]'
    }`;

  const drawerLinkClass = (path: string) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px] active:scale-[0.98] ${
      isActive(path)
        ? 'bg-[#7567E8] text-white shadow-xs font-bold'
        : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F4F2FA]'
    }`;

  // Role-aware mobile bottom navigation items
  const getBottomNavItems = () => {
    if (!isAuthenticated || !user) {
      return [
        { path: '/', label: 'Home', icon: Home },
        { path: '/ngos', label: 'NGOs', icon: Building2 },
        { path: '/map', label: 'Map', icon: MapPin },
        { path: '/impact', label: 'Impact', icon: BarChart3 },
        { path: '/login', label: 'Sign In', icon: LogIn },
      ];
    }

    switch (user.role) {
      case 'DONOR':
        return [
          { path: '/', label: 'Home', icon: Home },
          { path: '/map', label: 'Map', icon: MapPin },
          { path: '/donate/new', label: 'Donate', icon: PlusCircle, isPrimary: true },
          { path: '/donations', label: 'Donations', icon: PackageSearch },
          { path: '/donor/profile', label: 'Profile', icon: User },
        ];
      case 'NGO':
        return [
          { path: '/ngo-dashboard', label: 'Assigned', icon: Building2 },
          { path: '/ngo-dashboard/inventory', label: 'Inventory', icon: PackageSearch },
          { path: '/map', label: 'Map', icon: MapPin },
          { path: '/ngo-dashboard/profile', label: 'Profile', icon: User },
        ];
      case 'VOLUNTEER':
        return [
          { path: '/driver-dashboard', label: 'Deliveries', icon: Truck },
          { path: '/map', label: 'Map', icon: MapPin },
          { path: '/impact', label: 'Impact', icon: BarChart3 },
          { path: '/settings', label: 'Settings', icon: Settings },
        ];
      case 'CORPORATE':
        return [
          { path: '/csr-dashboard', label: 'CSR Hub', icon: Building2 },
          { path: '/map', label: 'Map', icon: MapPin },
          { path: '/impact', label: 'Impact', icon: BarChart3 },
          { path: '/settings', label: 'Settings', icon: Settings },
        ];
      case 'ADMIN':
        return [
          { path: '/admin', label: 'Overview', icon: Shield },
          { path: '/admin/ngos', label: 'NGOs', icon: Building2 },
          { path: '/admin/donations', label: 'Audit', icon: PackageCheck },
          { path: '/admin/profile', label: 'Profile', icon: User },
        ];
      default:
        return [
          { path: '/', label: 'Home', icon: Home },
          { path: '/map', label: 'Map', icon: MapPin },
          { path: '/donations', label: 'Donations', icon: PackageSearch },
          { path: '/donor/profile', label: 'Profile', icon: User },
        ];
    }
  };

  const bottomNavItems = getBottomNavItems();

  return (
    <>
      {/* Android Top App Bar with safe-area top inset support */}
      <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#E5E7EB] safe-pt">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 sm:gap-4 h-14 sm:h-16">
            {/* Logo & Platform Label */}
            <Link to="/" className="flex items-center gap-2 sm:gap-2.5 group shrink-0 min-h-[44px]">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#7567E8] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-200">
                <HeartHandshake className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <span className="text-base sm:text-lg font-extrabold text-[#111827] tracking-tight">
                  DonateConnect
                </span>
                <span className="hidden xs:block text-[9px] uppercase tracking-wider font-bold text-[#7567E8] -mt-1">
                  {isAdmin
                    ? 'Admin Console'
                    : isNgo
                    ? 'NGO Portal'
                    : isVolunteer
                    ? 'Delivery Partner Console'
                    : isCorporate
                    ? 'CSR Console'
                    : 'Community Relief'}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 bg-[#F9FAFB] p-1.5 rounded-full border border-[#E5E7EB]">
              <Link to="/" className={navLinkClass('/')}>
                <Home className="w-3.5 h-3.5" /> Home
              </Link>
              <Link to="/ngos" className={navLinkClass('/ngos')}>
                <Building2 className="w-3.5 h-3.5" /> NGOs
              </Link>
              <Link to="/map" className={navLinkClass('/map')}>
                <MapPin className="w-3.5 h-3.5" /> Map
              </Link>
              <Link to="/impact" className={navLinkClass('/impact')}>
                <BarChart3 className="w-3.5 h-3.5" /> Impact
              </Link>

              {showPrototypes && (
                <>
                  <Link to="/lockers" className={navLinkClass('/lockers')}>
                    <Lock className="w-3.5 h-3.5" /> Lockers
                  </Link>
                  <Link to="/blockchain-ledger" className={navLinkClass('/blockchain-ledger')}>
                    <Cpu className="w-3.5 h-3.5" /> Blockchain
                  </Link>
                  <Link to="/circular-market" className={navLinkClass('/circular-market')}>
                    <Recycle className="w-3.5 h-3.5" /> Circular
                  </Link>
                </>
              )}

              {isDonor && (
                <Link to="/donations" className={navLinkClass('/donations')}>
                  <PackageSearch className="w-3.5 h-3.5" /> My Donations
                </Link>
              )}
              {isNgo && (
                <Link to="/ngo-dashboard" className={navLinkClass('/ngo-dashboard')}>
                  <Building2 className="w-3.5 h-3.5" /> NGO Portal
                </Link>
              )}
              {isVolunteer && (
                <Link to="/driver-dashboard" className={navLinkClass('/driver-dashboard')}>
                  <Truck className="w-3.5 h-3.5" /> Delivery Partner
                </Link>
              )}
              {isCorporate && (
                <Link to="/csr-dashboard" className={navLinkClass('/csr-dashboard')}>
                  <Building2 className="w-3.5 h-3.5" /> CSR
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin" className={navLinkClass('/admin')}>
                  <Shield className="w-3.5 h-3.5" /> Admin
                </Link>
              )}
            </nav>

            {/* Action Tools & Menu Triggers */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Voice AI Assistant Button */}
              <button
                onClick={() => setShowVoiceModal(true)}
                title="Voice AI Booking Assistant"
                aria-label="Voice AI Booking Assistant"
                className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-[#7567E8]/10 hover:bg-[#7567E8]/20 text-[#7567E8] border border-[#7567E8]/20 transition-all flex items-center justify-center active:scale-95"
              >
                <Mic className="w-4 h-4" />
              </button>

              {/* Notification Bell */}
              {isAuthenticated && <NotificationBell />}

              {/* Health Badge (Desktop & Tablet) */}
              <div className="hidden sm:block">
                <HealthBadge />
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px h-5 bg-[#E5E7EB] shrink-0" />

              {/* Desktop User Menu */}
              {isAuthenticated && user ? (
                <div className="relative hidden sm:block">
                  <button
                    onClick={() => setProfileOpen((prev) => !prev)}
                    aria-haspopup="true"
                    aria-expanded={profileOpen}
                    title="Account menu"
                    className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 hover:bg-[#F4F2FA] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7567E8] min-h-[44px]"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#7567E8] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                      {(user.fullName ? user.fullName : user.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <span className="block text-xs font-bold text-[#111827] leading-tight">
                        {user.fullName || 'User'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#7567E8] uppercase tracking-wider">
                        <Shield className="w-2.5 h-2.5" />
                        {user.role}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#4B5563] transition-transform duration-150 ${
                        profileOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Profile Dropdown */}
                  <ProfileDropdown
                    isOpen={profileOpen}
                    onClose={() => setProfileOpen(false)}
                  />
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <Link
                    to="/login"
                    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#F9FAFB] text-[#111827] font-semibold text-xs transition-colors border border-[#E5E7EB] flex items-center gap-1.5 shadow-xs min-h-[36px]"
                  >
                    <LogIn className="w-3.5 h-3.5 text-[#4B5563]" />
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="px-3.5 py-1.5 rounded-xl bg-[#7567E8] hover:bg-[#7567E8]/90 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs min-h-[36px]"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Register
                  </Link>
                </div>
              )}

              {/* Mobile Drawer Hamburger Trigger */}
              <button
                onClick={() => setDrawerOpen(true)}
                aria-label="Open mobile navigation menu"
                className="lg:hidden w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-white border border-[#E5E7EB] text-[#111827] flex items-center justify-center hover:bg-[#F4F2FA] transition-colors shadow-xs active:scale-95"
              >
                <Menu className="w-5 h-5 text-[#4B5563]" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer (Slide-in drawer with Android ergonomics) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-backdrop-fade">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-[#111827]/40 backdrop-blur-sm transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer Body */}
          <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl p-5 flex flex-col justify-between overflow-y-auto border-l border-[#E5E7EB] z-10 safe-pt safe-pb">
            <div className="space-y-5">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#7567E8] flex items-center justify-center text-white shadow-xs">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-base text-[#111827] leading-tight block">
                      DonateConnect
                    </span>
                    <span className="block text-[10px] font-bold text-[#7567E8] uppercase tracking-wider">
                      {user?.role ? `${user.role} Navigation` : 'Navigation'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl text-[#4B5563] hover:text-[#111827] hover:bg-[#F4F2FA] flex items-center justify-center"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <div className="space-y-1">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B7280] px-3 mb-1.5">
                  Discovery & Tools
                </div>
                <Link to="/" className={drawerLinkClass('/')}>
                  <Home className="w-4 h-4 text-[#7567E8]" /> Home
                </Link>
                <Link to="/ngos" className={drawerLinkClass('/ngos')}>
                  <Building2 className="w-4 h-4 text-[#7567E8]" /> Verified NGO Directory
                </Link>
                <Link to="/map" className={drawerLinkClass('/map')}>
                  <MapPin className="w-4 h-4 text-[#7567E8]" /> Interactive Hub Map
                </Link>
                <Link to="/impact" className={drawerLinkClass('/impact')}>
                  <BarChart3 className="w-4 h-4 text-[#7567E8]" /> Impact Analytics
                </Link>

                {showPrototypes && (
                  <>
                    <Link to="/lockers" className={drawerLinkClass('/lockers')}>
                      <Lock className="w-4 h-4 text-[#7567E8]" /> Smart Lockers
                    </Link>
                    <Link to="/blockchain-ledger" className={drawerLinkClass('/blockchain-ledger')}>
                      <Cpu className="w-4 h-4 text-[#7567E8]" /> Blockchain Audit Ledger
                    </Link>
                    <Link to="/circular-market" className={drawerLinkClass('/circular-market')}>
                      <Recycle className="w-4 h-4 text-[#7567E8]" /> Circular Exchange
                    </Link>
                  </>
                )}

                {/* Role Specific Navigation */}
                {isAuthenticated && (
                  <div className="pt-3 border-t border-[#E5E7EB] mt-3 space-y-1">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B7280] px-3 mb-1.5">
                      Your Workspace
                    </div>
                    {isDonor && (
                      <>
                        <Link to="/donate/new" className={drawerLinkClass('/donate/new')}>
                          <PlusCircle className="w-4 h-4 text-[#7567E8]" /> New Donation
                        </Link>
                        <Link to="/donations" className={drawerLinkClass('/donations')}>
                          <PackageSearch className="w-4 h-4 text-[#7567E8]" /> My Donations
                        </Link>
                        <Link to="/donor/profile" className={drawerLinkClass('/donor/profile')}>
                          <User className="w-4 h-4 text-[#7567E8]" /> Donor Profile
                        </Link>
                        <Link to="/settings" className={drawerLinkClass('/settings')}>
                          <Settings className="w-4 h-4 text-[#7567E8]" /> Account Settings
                        </Link>
                      </>
                    )}
                    {isNgo && (
                      <>
                        <Link to="/ngo-dashboard" className={drawerLinkClass('/ngo-dashboard')}>
                          <Building2 className="w-4 h-4 text-[#7567E8]" /> Assigned Requests
                        </Link>
                        <Link to="/ngo-dashboard/inventory" className={drawerLinkClass('/ngo-dashboard/inventory')}>
                          <PackageSearch className="w-4 h-4 text-[#7567E8]" /> Delivered Inventory
                        </Link>
                        <Link to="/ngo-dashboard/profile" className={drawerLinkClass('/ngo-dashboard/profile')}>
                          <User className="w-4 h-4 text-[#7567E8]" /> NGO Profile
                        </Link>
                        <Link to="/settings" className={drawerLinkClass('/settings')}>
                          <Settings className="w-4 h-4 text-[#7567E8]" /> Account Settings
                        </Link>
                      </>
                    )}
                    {isVolunteer && (
                      <>
                        <Link to="/driver-dashboard" className={drawerLinkClass('/driver-dashboard')}>
                          <Truck className="w-4 h-4 text-[#7567E8]" /> Delivery Partner Console
                        </Link>
                        <Link to="/settings" className={drawerLinkClass('/settings')}>
                          <Settings className="w-4 h-4 text-[#7567E8]" /> Account Settings
                        </Link>
                      </>
                    )}
                    {isCorporate && (
                      <>
                        <Link to="/csr-dashboard" className={drawerLinkClass('/csr-dashboard')}>
                          <Building2 className="w-4 h-4 text-[#7567E8]" /> Corporate CSR Console
                        </Link>
                        <Link to="/settings" className={drawerLinkClass('/settings')}>
                          <Settings className="w-4 h-4 text-[#7567E8]" /> Account Settings
                        </Link>
                      </>
                    )}
                    {isAdmin && (
                      <>
                        <Link to="/admin" className={drawerLinkClass('/admin')}>
                          <Shield className="w-4 h-4 text-[#7567E8]" /> Admin Overview
                        </Link>
                        <Link to="/admin/ngos" className={drawerLinkClass('/admin/ngos')}>
                          <Building2 className="w-4 h-4 text-[#7567E8]" /> Manage NGO Partners
                        </Link>
                        <Link to="/admin/donations" className={drawerLinkClass('/admin/donations')}>
                          <PackageCheck className="w-4 h-4 text-[#7567E8]" /> Audit Donations
                        </Link>
                        <Link to="/admin/audit" className={drawerLinkClass('/admin/audit')}>
                          <FileText className="w-4 h-4 text-[#7567E8]" /> System Audit Log
                        </Link>
                        <Link to="/admin/profile" className={drawerLinkClass('/admin/profile')}>
                          <User className="w-4 h-4 text-[#7567E8]" /> Admin Profile
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="pt-4 border-t border-[#E5E7EB]">
              {isAuthenticated && user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 px-2">
                    <div className="w-10 h-10 rounded-full bg-[#7567E8] flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {(user.fullName ? user.fullName : user.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-extrabold text-[#111827] truncate leading-tight">
                        {user.fullName || 'User'}
                      </p>
                      <p className="text-xs text-[#6B7280] truncate">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setDrawerOpen(false);
                      logout();
                      navigate('/');
                    }}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#FEE2E2] text-[#DC2626] font-bold text-xs hover:bg-[#FCA5A5]/40 transition-colors min-h-[48px] active:scale-[0.98]"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    className="py-3 rounded-xl bg-white border border-[#E5E7EB] text-[#111827] font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs min-h-[48px]"
                  >
                    <LogIn className="w-4 h-4 text-[#4B5563]" /> Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="py-3 rounded-xl bg-[#7567E8] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs min-h-[48px]"
                  >
                    <UserPlus className="w-4 h-4" /> Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Role-Aware Android Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Android Mobile Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-t border-[#E5E7EB] px-2 pt-1 safe-pb shadow-lg md:hidden"
      >
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {bottomNavItems.map((item) => {
            const ItemIcon = item.icon;
            const active = isActive(item.path);

            if (item.isPrimary) {
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex flex-col items-center justify-center relative -mt-5 focus:outline-none"
                  aria-label={item.label}
                >
                  <div className="w-12 h-12 rounded-full bg-[#7567E8] text-white flex items-center justify-center shadow-lg shadow-[#7567E8]/35 border-2 border-white transform active:scale-95 transition-transform">
                    <ItemIcon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-extrabold text-[#7567E8] mt-0.5">
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all min-w-[56px] min-h-[48px] active:scale-95 ${
                  active
                    ? 'text-[#7567E8] font-bold'
                    : 'text-[#4B5563] hover:text-[#111827]'
                }`}
              >
                <div
                  className={`flex items-center justify-center px-3 py-1 rounded-full transition-colors ${
                    active ? 'bg-[#7567E8]/15 text-[#7567E8]' : 'text-[#6B7280]'
                  }`}
                >
                  <ItemIcon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold mt-0.5 truncate max-w-[68px]">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {showVoiceModal && <VoiceAssistantModal onClose={() => setShowVoiceModal(false)} />}
    </>
  );
};

export default Navbar;
