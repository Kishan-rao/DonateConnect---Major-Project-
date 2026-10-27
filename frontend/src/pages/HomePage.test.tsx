import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HomePage } from './HomePage';
import * as AuthContextModule from '../context/AuthContext';
import * as ngoApi from '../api/ngoApi';

vi.mock('../api/ngoApi', () => ({
  getVerifiedNgos: vi.fn(),
  getActiveUrgentNeeds: vi.fn(),
}));

describe('HomePage Role-Based Actions', () => {
  const mockNgos = [
    {
      id: 'ngo-1',
      name: 'Goonj Relief',
      description: 'Disaster and clothing relief',
      address: 'Koramangala, Bengaluru',
      phone: '+91 9876543210',
      category: 'CLOTHES',
      verified: true,
      createdAt: '2026-10-01',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ngoApi.getVerifiedNgos).mockResolvedValue(mockNgos as any);
    vi.mocked(ngoApi.getActiveUrgentNeeds).mockResolvedValue([]);
  });

  const setupAuth = (user: any) => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user,
      token: user ? 'mock-token' : null,
      isAuthenticated: Boolean(user),
      loading: false,
      login: vi.fn(),
      verifyOtp: vi.fn(),
      register: vi.fn(),
      registerDonor: vi.fn(),
      logout: vi.fn(),
      refetchUser: vi.fn(),
    });
  };

  it('renders "Donate Now" button for DONOR users', async () => {
    setupAuth({ id: 'donor-1', fullName: 'Priya Donor', email: 'priya@example.com', role: 'DONOR' });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /view impact analytics/i })).toBeInTheDocument();
    });

    const donateBtn = screen.getByRole('link', { name: /donate now/i });
    expect(donateBtn).toBeInTheDocument();
    expect(donateBtn).toHaveAttribute('href', '/donate/new');

    const impactBtn = screen.getByRole('link', { name: /view impact analytics/i });
    expect(impactBtn).toBeInTheDocument();
    expect(impactBtn).toHaveAttribute('href', '/impact');

    await waitFor(() => {
      expect(screen.getByText('Goonj Relief')).toBeInTheDocument();
    });
  });

  it('supports Spring Security "ROLE_DONOR" prefix and renders "Donate Now"', async () => {
    setupAuth({ id: 'donor-2', fullName: 'Rahul Donor', email: 'rahul@example.com', role: 'ROLE_DONOR' });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /view impact analytics/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: /donate now/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view impact analytics/i })).toBeInTheDocument();
  });

  it('does NOT render "Donate Now" button for NGO users', async () => {
    setupAuth({ id: 'ngo-user-1', fullName: 'Akshaya Patra', email: 'contact@akshaya.org', role: 'NGO' });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /view impact analytics/i })).toBeInTheDocument();
    });

    // "Donate Now" must be absent from the DOM
    expect(screen.queryByRole('link', { name: /donate now/i })).not.toBeInTheDocument();

    // "View Impact Analytics" remains visible and functional
    const impactBtn = screen.getByRole('link', { name: /view impact analytics/i });
    expect(impactBtn).toBeInTheDocument();
    expect(impactBtn).toHaveAttribute('href', '/impact');

    await waitFor(() => {
      expect(screen.getByText('Goonj Relief')).toBeInTheDocument();
    });
  });

  it('does NOT render "Donate Now" button for DELIVERY_PARTNER / VOLUNTEER users', async () => {
    // Test with DELIVERY_PARTNER role convention
    setupAuth({ id: 'driver-1', fullName: 'Ravi Driver', email: 'driver@example.com', role: 'DELIVERY_PARTNER' });

    const { unmount } = render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /view impact analytics/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole('link', { name: /donate now/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view impact analytics/i })).toBeInTheDocument();
    unmount();

    // Test with VOLUNTEER role convention
    setupAuth({ id: 'driver-2', fullName: 'Amit Volunteer', email: 'amit@example.com', role: 'VOLUNTEER' });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /view impact analytics/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole('link', { name: /donate now/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view impact analytics/i })).toBeInTheDocument();
  });

  it('does NOT render "Donate Now" button for ADMIN users', async () => {
    setupAuth({ id: 'admin-1', fullName: 'System Admin', email: 'admin@donateconnect.in', role: 'ADMIN' });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /view impact analytics/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole('link', { name: /donate now/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view impact analytics/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Goonj Relief')).toBeInTheDocument();
    });
  });

  it('does NOT render "Donate Now" button for unauthenticated visitors', async () => {
    setupAuth(null);

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /view impact analytics/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole('link', { name: /donate now/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view impact analytics/i })).toBeInTheDocument();
  });
});
