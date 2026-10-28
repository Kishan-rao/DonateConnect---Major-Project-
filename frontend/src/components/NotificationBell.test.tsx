import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';
import * as notificationApi from '../api/notificationApi';
import * as AuthContext from '../context/AuthContext';
import { NotificationItem } from '../types';

vi.mock('../api/notificationApi');
vi.mock('../context/AuthContext');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('NotificationBell Component - Timestamp Removal & Core Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: {
        id: 'u1',
        email: 'donor@example.com',
        fullName: 'Donor User',
        role: 'DONOR',
        createdAt: '2026-01-01T00:00:00Z',
      },
      token: 'jwt-token',
      login: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders notifications without any visible timestamp labels across recent, old, future, invalid, and missing dates', async () => {
    const mockNotifications: NotificationItem[] = [
      {
        id: 'n1',
        message: 'Recent donation received',
        read: false,
        createdAt: new Date().toISOString(), // Recent
      },
      {
        id: 'n2',
        message: 'Scheduled pickup in progress',
        read: false,
        createdAt: '2026-10-28T11:55:00Z', // Minutes ago
      },
      {
        id: 'n3',
        message: 'Volunteer matched with item',
        read: false,
        createdAt: '2026-10-28T10:00:00Z', // Hours ago
      },
      {
        id: 'n4',
        message: 'Drop-off acknowledged at center',
        read: true,
        createdAt: '2026-10-27T10:00:00Z', // 24 hours ago
      },
      {
        id: 'n5',
        message: 'Monthly distribution report ready',
        read: true,
        createdAt: '2026-09-15T08:00:00Z', // Past month date
      },
      {
        id: 'n6',
        message: 'Holiday drive announcement',
        read: false,
        createdAt: '2026-12-31T23:59:59Z', // Future date
      },
      {
        id: 'n7',
        message: 'System maintenance alert',
        read: true,
        createdAt: 'corrupted-timestamp', // Invalid string
      },
      {
        id: 'n8',
        message: 'Welcome to DonateConnect community',
        read: true,
        createdAt: (null as unknown as string), // Null / missing
      },
    ];

    vi.spyOn(notificationApi, 'getMyNotifications').mockResolvedValue(mockNotifications);

    render(
      <BrowserRouter>
        <NotificationBell />
      </BrowserRouter>
    );

    // Open dropdown
    const bellBtn = screen.getByTitle('Notifications');
    fireEvent.click(bellBtn);

    // Verify all notification messages are rendered
    await waitFor(() => {
      expect(screen.getByText('Recent donation received')).toBeInTheDocument();
      expect(screen.getByText('Scheduled pickup in progress')).toBeInTheDocument();
      expect(screen.getByText('Volunteer matched with item')).toBeInTheDocument();
      expect(screen.getByText('Drop-off acknowledged at center')).toBeInTheDocument();
      expect(screen.getByText('Monthly distribution report ready')).toBeInTheDocument();
      expect(screen.getByText('Holiday drive announcement')).toBeInTheDocument();
      expect(screen.getByText('System maintenance alert')).toBeInTheDocument();
      expect(screen.getByText('Welcome to DonateConnect community')).toBeInTheDocument();
    });

    // Verify unread badge shows correct count
    expect(screen.getByText('4 new')).toBeInTheDocument();

    // Verify NO relative or absolute date/time strings appear anywhere in the dropdown
    expect(screen.queryByText(/just now/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\b\d+\s*(second|sec|minute|min|hour|hr|day|week|month|year)s?\s*ago\b/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/yesterday/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\d{1,2}:\d{2}/i)).not.toBeInTheDocument();

    // Verify no semantic time elements exist
    const timeElements = document.querySelectorAll('time');
    expect(timeElements.length).toBe(0);
  });

  it('handles clicking notification: marks as read and navigates without timestamp elements', async () => {
    const mockNotifications: NotificationItem[] = [
      {
        id: 'n1',
        message: 'Donation status updated',
        read: false,
        createdAt: '2026-10-28T10:00:00Z',
      },
    ];

    vi.spyOn(notificationApi, 'getMyNotifications').mockResolvedValue(mockNotifications);
    vi.spyOn(notificationApi, 'markNotificationRead').mockResolvedValue(undefined);

    render(
      <BrowserRouter>
        <NotificationBell />
      </BrowserRouter>
    );

    const bellBtn = screen.getByTitle('Notifications');
    fireEvent.click(bellBtn);

    await waitFor(() => {
      expect(screen.getByText('Donation status updated')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Donation status updated'));

    await waitFor(() => {
      expect(notificationApi.markNotificationRead).toHaveBeenCalledWith('n1');
      expect(mockNavigate).toHaveBeenCalledWith('/donations');
    });
  });

  it('marks all as read and clears unread count badge', async () => {
    const mockNotifications: NotificationItem[] = [
      {
        id: 'n1',
        message: 'Unread 1',
        read: false,
        createdAt: '2026-10-28T10:00:00Z',
      },
      {
        id: 'n2',
        message: 'Unread 2',
        read: false,
        createdAt: '2026-10-28T09:00:00Z',
      },
    ];

    vi.spyOn(notificationApi, 'getMyNotifications').mockResolvedValue(mockNotifications);
    vi.spyOn(notificationApi, 'markNotificationRead').mockResolvedValue(undefined);

    render(
      <BrowserRouter>
        <NotificationBell />
      </BrowserRouter>
    );

    const bellBtn = screen.getByTitle('Notifications');
    fireEvent.click(bellBtn);

    await waitFor(() => {
      expect(screen.getByText('Mark all read')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Mark all read'));

    await waitFor(() => {
      expect(notificationApi.markNotificationRead).toHaveBeenCalledTimes(2);
      expect(screen.queryByText('Mark all read')).not.toBeInTheDocument();
      expect(screen.queryByText(/new/i)).not.toBeInTheDocument();
    });
  });

  it('polls notifications periodically every 30 seconds', async () => {
    vi.useFakeTimers();
    try {
      const getNotificationsSpy = vi.spyOn(notificationApi, 'getMyNotifications').mockResolvedValue([]);

      render(
        <BrowserRouter>
          <NotificationBell />
        </BrowserRouter>
      );

      expect(getNotificationsSpy).toHaveBeenCalledTimes(1);

      act(() => {
        vi.advanceTimersByTime(30000);
      });

      expect(getNotificationsSpy).toHaveBeenCalledTimes(2);

      act(() => {
        vi.advanceTimersByTime(30000);
      });

      expect(getNotificationsSpy).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders empty state cleanly when there are no notifications', async () => {
    vi.spyOn(notificationApi, 'getMyNotifications').mockResolvedValue([]);

    render(
      <BrowserRouter>
        <NotificationBell />
      </BrowserRouter>
    );

    const bellBtn = screen.getByTitle('Notifications');
    fireEvent.click(bellBtn);

    await waitFor(() => {
      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    });
  });
});
