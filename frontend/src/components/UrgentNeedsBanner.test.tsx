import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { UrgentNeedsBanner } from './UrgentNeedsBanner';
import * as AuthContextModule from '../context/AuthContext';
import * as ngoApi from '../api/ngoApi';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../api/ngoApi', () => ({
  getActiveUrgentNeeds: vi.fn(),
}));

describe('UrgentNeedsBanner Component - Role Isolation & Donation Actions', () => {
  const sampleActiveNeeds = [
    {
      id: 'need-1',
      title: '100 Woolen Blankets',
      description: 'Severe winter relief for elderly shelters in Himachal',
      category: 'CLOTHES' as const,
      quantity: 100,
      fulfilledQuantity: 30,
      remainingQuantity: 70,
      status: 'ACTIVE' as const,
      active: true,
      ngoId: 'ngo-1',
      ngoName: 'HelpAge India',
      ngoCity: 'Shimla',
      ngoVerified: true,
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ngoApi.getActiveUrgentNeeds).mockResolvedValue(sampleActiveNeeds);
  });

  it('19. Urgent requirements appear for DONOR role with Donate Now action', async () => {
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: {
        id: 'donor-1',
        fullName: 'Jane Donor',
        email: 'donor@example.com',
        role: 'DONOR',
      },
      isAuthenticated: true,
      logout: vi.fn(),
    } as any);

    render(
      <MemoryRouter>
        <UrgentNeedsBanner />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('100 Woolen Blankets')).toBeInTheDocument();
    });

    expect(screen.getByText('HelpAge India')).toBeInTheDocument();
    expect(screen.getByText('Needed: 70')).toBeInTheDocument();

    const donateBtn = screen.getByRole('link', { name: /Donate Now/i });
    expect(donateBtn).toBeInTheDocument();
    expect(donateBtn).toHaveAttribute(
      'href',
      expect.stringContaining('/donate/new?urgentNeedId=need-1')
    );
  });

  it('20. Urgent requirements do NOT appear for NGO role', async () => {
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: {
        id: 'ngo-user-1',
        fullName: 'Relief NGO Admin',
        email: 'ngo@example.com',
        role: 'NGO',
      },
      isAuthenticated: true,
      logout: vi.fn(),
    } as any);

    const { container } = render(
      <MemoryRouter>
        <UrgentNeedsBanner />
      </MemoryRouter>
    );

    // NGO must never see the urgent requirement listing
    expect(container).toBeEmptyDOMElement();
    expect(ngoApi.getActiveUrgentNeeds).not.toHaveBeenCalled();
    expect(screen.queryByText('100 Woolen Blankets')).not.toBeInTheDocument();
  });

  it('21. Urgent requirements do NOT appear for Delivery Partner (VOLUNTEER) role', async () => {
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: {
        id: 'vol-user-1',
        fullName: 'Delivery Driver',
        email: 'driver@example.com',
        role: 'VOLUNTEER',
      },
      isAuthenticated: true,
      logout: vi.fn(),
    } as any);

    const { container } = render(
      <MemoryRouter>
        <UrgentNeedsBanner />
      </MemoryRouter>
    );

    // Delivery partner must never see the urgent requirement listing
    expect(container).toBeEmptyDOMElement();
    expect(ngoApi.getActiveUrgentNeeds).not.toHaveBeenCalled();
    expect(screen.queryByText('100 Woolen Blankets')).not.toBeInTheDocument();
  });

  it('22 & 23. Admin can view active requirements for monitoring, but CANNOT see a Donate Now action', async () => {
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: {
        id: 'admin-1',
        fullName: 'System Administrator',
        email: 'admin@donateconnect.com',
        role: 'ADMIN',
      },
      isAuthenticated: true,
      logout: vi.fn(),
    } as any);

    render(
      <MemoryRouter>
        <UrgentNeedsBanner />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('100 Woolen Blankets')).toBeInTheDocument();
    });

    // Admin should see Monitoring indicator and link to admin monitor
    expect(screen.getByText('Monitoring Mode')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Admin Monitor/i })).toHaveAttribute(
      'href',
      '/admin/urgent-needs'
    );

    // Admin must strictly NOT see any Donate Now button
    expect(screen.queryByRole('link', { name: /Donate Now/i })).not.toBeInTheDocument();
  });
});
