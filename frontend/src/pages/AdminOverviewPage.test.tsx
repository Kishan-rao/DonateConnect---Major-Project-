import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AdminOverviewPage } from './AdminOverviewPage';
import * as adminApi from '../api/adminApi';
import '@testing-library/jest-dom/vitest';

vi.mock('../api/adminApi', () => ({
  getAdminStats: vi.fn(),
  getPendingUsers: vi.fn(),
  approveUser: vi.fn(),
}));

vi.mock('recharts', async () => {
  const actual = await vi.importActual<any>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div data-testid="mock-responsive-container" style={{ width: '100%', height: '100%' }}>
        {children}
      </div>
    ),
  };
});

describe('AdminOverviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockStats = {
    totalDonations: 42,
    verifiedNgos: 9,
    pendingRequests: 3,
    completedDeliveries: 35,
    deliverySuccessRate: 94.6,
    averageDeliveryTimeHours: 1.85,
    donationsByCategory: {
      COOKED_MEALS: 25,
      RAW_GRAINS: 10,
      PACKAGED_FOOD: 7,
    },
    donationsByDate: {
      '2026-10-25': 5,
      '2026-10-26': 12,
      '2026-10-27': 25,
    },
    donationsByCity: {
      Bengaluru: 20,
      Mumbai: 12,
      Delhi: 10,
    },
    topDonors: [
      { name: 'Alice Donor', donations: 15 },
      { name: 'Bob Donor', donations: 7 },
    ],
    topNgos: [
      { name: 'Akshaya Patra', donations: 22 },
      { name: 'Robin Hood Army', donations: 13 },
    ],
  };

  const mockPendingUsers = [
    {
      id: 'user-pending-1',
      fullName: 'Rahul Sharma',
      email: 'rahul@example.com',
      role: 'DONOR',
      createdAt: '2026-10-28T10:00:00Z',
    },
  ];

  const renderComponent = () =>
    render(
      <BrowserRouter>
        <AdminOverviewPage />
      </BrowserRouter>
    );

  it('renders loading skeleton while fetching data', () => {
    (adminApi.getAdminStats as any).mockReturnValue(new Promise(() => {}));
    (adminApi.getPendingUsers as any).mockReturnValue(new Promise(() => {}));

    renderComponent();

    expect(screen.getByText('Admin Overview & Analytics')).toBeInTheDocument();
  });

  it('renders stats, city charts, and delivery metrics when data is returned', async () => {
    (adminApi.getAdminStats as any).mockResolvedValue(mockStats);
    (adminApi.getPendingUsers as any).mockResolvedValue(mockPendingUsers);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument(); // Total donations
      expect(screen.getByText('9')).toBeInTheDocument(); // Verified NGOs
      expect(screen.getByText('35')).toBeInTheDocument(); // Completed Deliveries
    });

    // Check Delivery Performance Metrics
    expect(screen.getByText('94.6')).toBeInTheDocument();
    expect(screen.getByText('1.9')).toBeInTheDocument(); // 1.85 rounded to 1 decimal: 1.9

    // Check Top Donors & NGOs
    expect(screen.getByText(/1\. Alice Donor/)).toBeInTheDocument();
    expect(screen.getByText(/1\. Akshaya Patra/)).toBeInTheDocument();

    // Check City Chart container
    const cityContainer = screen.getByTestId('city-chart-container');
    expect(cityContainer).toBeInTheDocument();
    expect(cityContainer).toHaveTextContent('Donations by City');
    expect(screen.queryByText('No city donation data available')).not.toBeInTheDocument();

    // Check Pending user
    expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
    expect(screen.getByText(/rahul@example\.com/)).toBeInTheDocument();
  });

  it('renders empty states gracefully when stats have empty maps/lists', async () => {
    const emptyStats = {
      totalDonations: 0,
      verifiedNgos: 0,
      pendingRequests: 0,
      completedDeliveries: 0,
      deliverySuccessRate: 0.0,
      averageDeliveryTimeHours: 0.0,
      donationsByCategory: {},
      donationsByDate: {},
      donationsByCity: {},
      topDonors: [],
      topNgos: [],
    };

    (adminApi.getAdminStats as any).mockResolvedValue(emptyStats);
    (adminApi.getPendingUsers as any).mockResolvedValue([]);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No city donation data available')).toBeInTheDocument();
      expect(screen.getByText('No donation timeline data available')).toBeInTheDocument();
      expect(screen.getByText('No category donation data available')).toBeInTheDocument();
      expect(screen.getByText('No donor records')).toBeInTheDocument();
      expect(screen.getByText('No NGO records')).toBeInTheDocument();
      expect(screen.getByText('No pending approvals.')).toBeInTheDocument();
    });
  });

  it('renders error message and allows retry when API fails', async () => {
    (adminApi.getAdminStats as any).mockRejectedValue(new Error('Network error loading stats'));
    (adminApi.getPendingUsers as any).mockResolvedValue([]);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Network error loading stats')).toBeInTheDocument();
      expect(screen.getByText('Retry Connection')).toBeInTheDocument();
    });

    (adminApi.getAdminStats as any).mockResolvedValue(mockStats);
    fireEvent.click(screen.getByText('Retry Connection'));

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  it('approves a pending user when clicking Approve', async () => {
    (adminApi.getAdminStats as any).mockResolvedValue(mockStats);
    (adminApi.getPendingUsers as any).mockResolvedValue(mockPendingUsers);
    (adminApi.approveUser as any).mockResolvedValue({});

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
    });

    const approveButton = screen.getByRole('button', { name: /approve/i });
    fireEvent.click(approveButton);

    expect(adminApi.approveUser).toHaveBeenCalledWith('user-pending-1');

    await waitFor(() => {
      expect(screen.queryByText('Rahul Sharma')).not.toBeInTheDocument();
    });
  });

  it('triggers CSV export containing stats and city data', async () => {
    (adminApi.getAdminStats as any).mockResolvedValue(mockStats);
    (adminApi.getPendingUsers as any).mockResolvedValue([]);

    const createElementSpy = vi.spyOn(document, 'createElement');
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    const exportButton = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(exportButton);

    expect(createElementSpy).toHaveBeenCalledWith('a');
    createElementSpy.mockRestore();
  });
});
