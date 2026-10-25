import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DriverDashboardPage, isTaskActive } from './DriverDashboardPage';
import * as volunteerApi from '../api/volunteerApi';
import { ToastProvider } from '../context/ToastContext';
import { DeliveryTrackingProvider } from '../context/DeliveryTrackingContext';
import { VolunteerTask, Donation } from '../types';
import '@testing-library/jest-dom/vitest';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'vol-1', fullName: 'Driver Dave', email: 'dave@deliveries.org', role: 'VOLUNTEER' },
    token: 'mock-token',
  }),
}));

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

vi.mock('../api/volunteerApi', () => ({
  getMyVolunteerTasks: vi.fn(),
  getAvailablePickups: vi.fn(),
  claimVolunteerPickup: vi.fn(),
  updateVolunteerTaskStatus: vi.fn(),
}));

const mockDonation1: Donation = {
  id: 'donation-1',
  category: 'FOOD',
  description: 'Fresh vegetables and fruits for community kitchen',
  status: 'ACCEPTED',
  pickupAddress: '123 Market St',
  pickupDate: '2026-11-01',
  pickupTimeSlot: 'MORNING_10_TO_1',
  createdAt: '2026-10-25T10:00:00Z',
  ngo: {
    id: 'ngo-1',
    name: 'Helping Hands Hub',
    address: '456 Charity Lane',
    verified: true,
  },
};

const mockDonationCompleted: Donation = {
  id: 'donation-2',
  category: 'CLOTHES',
  description: 'Winter jackets',
  status: 'DELIVERED',
  pickupAddress: '789 Elm St',
  createdAt: '2026-10-24T10:00:00Z',
  ngo: {
    id: 'ngo-1',
    name: 'Helping Hands Hub',
    address: '456 Charity Lane',
    verified: true,
  },
};

const activeTask1: VolunteerTask = {
  id: 'task-1',
  donation: mockDonation1,
  volunteer: { id: 'vol-1', fullName: 'Driver Dave', email: 'dave@deliveries.org', role: 'VOLUNTEER' },
  deliveryId: 'del-1',
  deliveryStatus: 'ACCEPTED_BY_VOLUNTEER',
  status: 'CLAIMED',
  claimedAt: '2026-10-25T11:00:00Z',
};

const completedTask: VolunteerTask = {
  id: 'task-2',
  donation: mockDonationCompleted,
  volunteer: { id: 'vol-1', fullName: 'Driver Dave', email: 'dave@deliveries.org', role: 'VOLUNTEER' },
  deliveryId: 'del-2',
  deliveryStatus: 'DELIVERED',
  status: 'COMPLETED',
  claimedAt: '2026-10-24T11:00:00Z',
};

describe('DriverDashboardPage - Delivery Completion and Task Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (volunteerApi.getAvailablePickups as any).mockResolvedValue({
      content: [],
      totalPages: 1,
      totalElements: 0,
      number: 0,
    });
  });

  it('correctly filters active vs completed tasks via isTaskActive', () => {
    expect(isTaskActive(activeTask1)).toBe(true);
    expect(isTaskActive(completedTask)).toBe(false);

    // If task status is CLAIMED but underlying donation is DELIVERED, it is not active
    const desyncedTask: VolunteerTask = {
      ...activeTask1,
      donation: { ...mockDonation1, status: 'DELIVERED' },
    };
    expect(isTaskActive(desyncedTask)).toBe(false);

    // If task status is IN_TRANSIT and deliveryStatus is DELIVERED, it is not active
    const completedDeliveryTask: VolunteerTask = {
      ...activeTask1,
      status: 'IN_TRANSIT',
      deliveryStatus: 'DELIVERED',
    };
    expect(isTaskActive(completedDeliveryTask)).toBe(false);
  });

  it('renders only active tasks and excludes completed delivery cards', async () => {
    (volunteerApi.getMyVolunteerTasks as any).mockResolvedValue([activeTask1, completedTask]);

    render(
      <MemoryRouter>
        <ToastProvider>
          <DeliveryTrackingProvider>
            <DriverDashboardPage />
          </DeliveryTrackingProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('delivery-card-donation-1')).toBeInTheDocument();
    });

    // Completed task card should NOT be rendered
    expect(screen.queryByTestId('delivery-card-donation-2')).not.toBeInTheDocument();

    // Active task count badge should show 1, not 2
    const myTasksTab = screen.getByRole('button', { name: /my tasks/i });
    expect(myTasksTab).toHaveTextContent('1');
  });

  it('displays empty state and no badge when all tasks are completed', async () => {
    (volunteerApi.getMyVolunteerTasks as any).mockResolvedValue([completedTask]);

    render(
      <MemoryRouter>
        <ToastProvider>
          <DeliveryTrackingProvider>
            <DriverDashboardPage />
          </DeliveryTrackingProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No active pickup assignments')).toBeInTheDocument();
    });

    // Badge should not be shown when count is 0
    const myTasksTab = screen.getByRole('button', { name: /my tasks/i });
    expect(myTasksTab).toHaveTextContent('My Tasks');
    expect(myTasksTab).not.toHaveTextContent('0');
  });

  it('renders action buttons with responsive mobile classes and correct labels', async () => {
    (volunteerApi.getMyVolunteerTasks as any).mockResolvedValue([activeTask1]);

    render(
      <MemoryRouter>
        <ToastProvider>
          <DeliveryTrackingProvider>
            <DriverDashboardPage />
          </DeliveryTrackingProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('complete-button-donation-1')).toBeInTheDocument();
    });

    const completeBtn = screen.getByTestId('complete-button-donation-1');
    const transitBtn = screen.getByTestId('transit-button-donation-1');

    // Label should be "Complete via Tracking"
    expect(completeBtn).toHaveTextContent('Complete via Tracking');
    expect(transitBtn).toHaveTextContent('Mark In-Transit');

    // Responsive mobile touch targets: min-h-[44px]
    expect(completeBtn.className).toContain('min-h-[44px]');
    expect(transitBtn.className).toContain('min-h-[44px]');

    // Clicking Complete via Tracking navigates to tracking route
    await userEvent.click(completeBtn);
    expect(mockedNavigate).toHaveBeenCalledWith('/donations/donation-1/track');
  });

  it('updates task to IN_TRANSIT and remains active until delivered', async () => {
    (volunteerApi.getMyVolunteerTasks as any).mockResolvedValue([activeTask1]);
    const inTransitTask: VolunteerTask = { ...activeTask1, status: 'IN_TRANSIT' };
    (volunteerApi.updateVolunteerTaskStatus as any).mockResolvedValue(inTransitTask);

    render(
      <MemoryRouter>
        <ToastProvider>
          <DeliveryTrackingProvider>
            <DriverDashboardPage />
          </DeliveryTrackingProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('transit-button-donation-1')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('transit-button-donation-1'));
    expect(volunteerApi.updateVolunteerTaskStatus).toHaveBeenCalledWith('task-1', 'IN_TRANSIT');
  });
});
