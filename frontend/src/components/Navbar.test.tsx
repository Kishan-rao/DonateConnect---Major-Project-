import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Navbar } from './Navbar';
import * as AuthContextModule from '../context/AuthContext';
import '@testing-library/jest-dom/vitest';

// Mock matchMedia for Navbar
window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: any) => children,
}));

vi.mock('../hooks/useHealthCheck', () => ({
  useHealthCheck: vi.fn(() => ({
    health: { status: 'UP', service: 'DonateConnect Backend', timestamp: new Date().toISOString() },
    loading: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

describe('Navbar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (AuthContextModule.useAuth as any).mockReturnValue({
      user: null,
      isAuthenticated: false,
      logout: vi.fn(),
    });
  });

  const renderNavbar = () => {
    return render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );
  };

  it('hides prototype links when VITE_SHOW_PROTOTYPES is not true', () => {
    import.meta.env.VITE_SHOW_PROTOTYPES = 'false';
    renderNavbar();
    expect(screen.queryByText(/Lockers/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Blockchain/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Circular/i)).not.toBeInTheDocument();
  });

  it('shows prototype links when VITE_SHOW_PROTOTYPES is true', () => {
    import.meta.env.VITE_SHOW_PROTOTYPES = 'true';
    renderNavbar();
    expect(screen.getByText(/Lockers/i)).toBeInTheDocument();
    expect(screen.getByText(/Blockchain/i)).toBeInTheDocument();
    expect(screen.getByText(/Circular/i)).toBeInTheDocument();
  });

  it('renders "Admin Portal" subtitle beneath DonateConnect brand for ADMIN role', () => {
    (AuthContextModule.useAuth as any).mockReturnValue({
      user: {
        id: 'admin-1',
        fullName: 'System Administrator',
        email: 'admin@donateconnect.com',
        role: 'ADMIN',
      },
      isAuthenticated: true,
      logout: vi.fn(),
    });

    renderNavbar();

    // Verify DonateConnect brand is present
    expect(screen.getAllByText('DonateConnect').length).toBeGreaterThan(0);

    // Verify Admin Portal subtitle is displayed
    const adminPortalLabels = screen.getAllByText('Admin Portal');
    expect(adminPortalLabels.length).toBeGreaterThan(0);

    // Verify it doesn't display other role labels
    expect(screen.queryByText('NGO Portal')).not.toBeInTheDocument();
    expect(screen.queryByText('Community Relief')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin Console')).not.toBeInTheDocument();
  });

  it('does NOT render "Admin Portal" when authenticated as DONOR', () => {
    (AuthContextModule.useAuth as any).mockReturnValue({
      user: {
        id: 'donor-1',
        fullName: 'Jane Donor',
        email: 'jane@example.com',
        role: 'DONOR',
      },
      isAuthenticated: true,
      logout: vi.fn(),
    });

    renderNavbar();

    expect(screen.queryByText('Admin Portal')).not.toBeInTheDocument();
    expect(screen.getByText('Community Relief')).toBeInTheDocument();
  });

  it('does NOT render "Admin Portal" when authenticated as NGO', () => {
    (AuthContextModule.useAuth as any).mockReturnValue({
      user: {
        id: 'ngo-1',
        fullName: 'Food Rescue NGO',
        email: 'ngo@example.com',
        role: 'NGO',
      },
      isAuthenticated: true,
      logout: vi.fn(),
    });

    renderNavbar();

    expect(screen.queryByText('Admin Portal')).not.toBeInTheDocument();
    expect(screen.getAllByText('NGO Portal').length).toBeGreaterThan(0);
  });

  it('does NOT render "Admin Portal" when unauthenticated', () => {
    (AuthContextModule.useAuth as any).mockReturnValue({
      user: null,
      isAuthenticated: false,
      logout: vi.fn(),
    });

    renderNavbar();

    expect(screen.queryByText('Admin Portal')).not.toBeInTheDocument();
    expect(screen.getByText('Community Relief')).toBeInTheDocument();
  });

  it('renders Backend status indicator (HealthBadge) exclusively for ADMIN role', () => {
    (AuthContextModule.useAuth as any).mockReturnValue({
      user: {
        id: 'admin-1',
        fullName: 'System Administrator',
        email: 'admin@donateconnect.com',
        role: 'ADMIN',
      },
      isAuthenticated: true,
      logout: vi.fn(),
    });

    renderNavbar();

    expect(screen.getAllByText('Backend:').length).toBeGreaterThan(0);
    expect(screen.getAllByText('UP').length).toBeGreaterThan(0);
  });

  it('does NOT render Backend status indicator for DONOR role', () => {
    (AuthContextModule.useAuth as any).mockReturnValue({
      user: {
        id: 'donor-1',
        fullName: 'Jane Donor',
        email: 'jane@example.com',
        role: 'DONOR',
      },
      isAuthenticated: true,
      logout: vi.fn(),
    });

    renderNavbar();

    expect(screen.queryByText('Backend:')).not.toBeInTheDocument();
    expect(screen.queryByText('UP')).not.toBeInTheDocument();
  });

  it('does NOT render Backend status indicator for NGO role', () => {
    (AuthContextModule.useAuth as any).mockReturnValue({
      user: {
        id: 'ngo-1',
        fullName: 'Food Rescue NGO',
        email: 'ngo@example.com',
        role: 'NGO',
      },
      isAuthenticated: true,
      logout: vi.fn(),
    });

    renderNavbar();

    expect(screen.queryByText('Backend:')).not.toBeInTheDocument();
    expect(screen.queryByText('UP')).not.toBeInTheDocument();
  });

  it('does NOT render Backend status indicator for VOLUNTEER (Delivery Partner) role', () => {
    (AuthContextModule.useAuth as any).mockReturnValue({
      user: {
        id: 'vol-1',
        fullName: 'Express Driver',
        email: 'driver@example.com',
        role: 'VOLUNTEER',
      },
      isAuthenticated: true,
      logout: vi.fn(),
    });

    renderNavbar();

    expect(screen.queryByText('Backend:')).not.toBeInTheDocument();
    expect(screen.queryByText('UP')).not.toBeInTheDocument();
  });

  it('does NOT render Backend status indicator when unauthenticated (e.g. login/register pages)', () => {
    (AuthContextModule.useAuth as any).mockReturnValue({
      user: null,
      isAuthenticated: false,
      logout: vi.fn(),
    });

    renderNavbar();

    expect(screen.queryByText('Backend:')).not.toBeInTheDocument();
    expect(screen.queryByText('UP')).not.toBeInTheDocument();
  });
});
