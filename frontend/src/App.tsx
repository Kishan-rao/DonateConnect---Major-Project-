import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { NgoListPage } from './pages/NgoListPage';
import { NgoDetailPage } from './pages/NgoDetailPage';
import { ImpactPage } from './pages/ImpactPage';
import { MapViewPage } from './pages/MapViewPage';
import { SmartLockersPage } from './pages/SmartLockersPage';
import { BlockchainLedgerPage } from './pages/BlockchainLedgerPage';
import { CircularMarketplacePage } from './pages/CircularMarketplacePage';
import { DriverDashboardPage } from './pages/DriverDashboardPage';
import { CorporateDashboardPage } from './pages/CorporateDashboardPage';
import { CreateDonationPage } from './pages/CreateDonationPage';
import { MyDonationsPage } from './pages/MyDonationsPage';
import { NgoDashboardPage } from './pages/NgoDashboardPage';
import { NgoInventoryPage } from './pages/NgoInventoryPage';
import { NgoProfilePage } from './pages/NgoProfilePage';
import { AdminOverviewPage } from './pages/AdminOverviewPage';
import { AdminNgosPage } from './pages/AdminNgosPage';
import { AdminDonationsPage } from './pages/AdminDonationsPage';
import { AdminProfilePage } from './pages/AdminProfilePage';
import { AdminAuditLogPage } from './pages/AdminAuditLogPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DonorProfilePage } from './pages/DonorProfilePage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { TrackDeliveryPage } from './pages/TrackDeliveryPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { EmergencySosBanner } from './components/EmergencySosBanner';
import { getApiConfigError } from './api/client';
import { AlertTriangle } from 'lucide-react';

const AppShell: React.FC = () => {
  const apiConfigError = getApiConfigError();

  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#111827] selection:bg-[#7567E8] selection:text-white safe-pl safe-pr">
            {apiConfigError && (
              <div
                role="alert"
                className="bg-rose-50 border-b border-rose-200 px-4 py-3 text-rose-800 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 text-center safe-pt"
              >
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{apiConfigError.message}</span>
              </div>
            )}
            <EmergencySosBanner />
            <Navbar />
            <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 page-bottom-spacing">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/ngos" element={<NgoListPage />} />
              <Route path="/ngos/:id" element={<NgoDetailPage />} />
              <Route path="/impact" element={<ImpactPage />} />
              <Route path="/map" element={<MapViewPage />} />
              {import.meta.env.VITE_SHOW_PROTOTYPES === 'true' && (
                <>
                  <Route path="/lockers" element={<SmartLockersPage />} />
                  <Route path="/blockchain-ledger" element={<BlockchainLedgerPage />} />
                  <Route path="/circular-market" element={<CircularMarketplacePage />} />
                </>
              )}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />

              {/* Protected Routes (Shared) */}
              <Route element={<ProtectedRoute allowedRoles={['DONOR', 'NGO', 'VOLUNTEER', 'ADMIN', 'CORPORATE']} />}>
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/donations/:id/track" element={<TrackDeliveryPage />} />
              </Route>

              {/* Protected Donor Routes */}
              <Route element={<ProtectedRoute allowedRoles={['DONOR', 'ADMIN']} />}>
                <Route path="/donor/profile" element={<DonorProfilePage />} />
                <Route path="/donate/new" element={<CreateDonationPage />} />
                <Route path="/donations/new" element={<Navigate to="/donate/new" replace />} />
                <Route path="/donations" element={<MyDonationsPage />} />
                <Route path="/my-donations" element={<Navigate to="/donations" replace />} />
              </Route>

              {/* Protected NGO Routes */}
              <Route element={<ProtectedRoute allowedRoles={['NGO', 'ADMIN']} />}>
                <Route path="/ngo-dashboard" element={<NgoDashboardPage />} />
                <Route path="/ngo-dashboard/inventory" element={<NgoInventoryPage />} />
                <Route path="/ngo-dashboard/profile" element={<NgoProfilePage />} />
              </Route>

              {/* Protected Volunteer Driver Routes */}
              <Route element={<ProtectedRoute allowedRoles={['VOLUNTEER', 'ADMIN']} />}>
                <Route path="/driver-dashboard" element={<DriverDashboardPage />} />
                <Route path="/delivery-dashboard" element={<Navigate to="/driver-dashboard" replace />} />
                <Route path="/volunteer-dashboard" element={<Navigate to="/driver-dashboard" replace />} />
              </Route>

              {/* Protected Corporate CSR Routes */}
              <Route element={<ProtectedRoute allowedRoles={['CORPORATE', 'ADMIN']} />}>
                <Route path="/csr-dashboard" element={<CorporateDashboardPage />} />
              </Route>

              {/* Protected Admin Routes */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="/admin" element={<AdminOverviewPage />} />
                <Route path="/admin/profile" element={<AdminProfilePage />} />
                <Route path="/admin/ngos" element={<AdminNgosPage />} />
                <Route path="/admin/donations" element={<AdminDonationsPage />} />
                <Route path="/admin/audit" element={<AdminAuditLogPage />} />
              </Route>
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </ToastProvider>
  </AuthProvider>
  );
};

export const App: React.FC = () => <AppShell />;

export default App;
