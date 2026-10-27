import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NotificationsPage } from './NotificationsPage';
import * as notificationApi from '../api/notificationApi';
import * as AuthContext from '../context/AuthContext';
import * as ToastContext from '../context/ToastContext';
import { NotificationItem } from '../types';

vi.mock('../api/notificationApi');
vi.mock('../context/AuthContext');
vi.mock('../context/ToastContext');

describe('NotificationsPage Component Timestamp Accuracy', () => {
  const fixedNow = new Date('2026-10-27T12:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(fixedNow);

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

    vi.spyOn(ToastContext, 'useToast').mockReturnValue({
      showSuccess: vi.fn(),
      showError: vi.fn(),
      showInfo: vi.fn(),
      showWarning: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders accurate relative timestamps across various notifications', async () => {
    const mockNotifications: NotificationItem[] = [
      {
        id: 'p1',
        message: 'Notification just arrived',
        read: false,
        createdAt: '2026-10-27T11:59:50Z', // 10s ago -> Just now
      },
      {
        id: 'p2',
        message: 'Notification 5 mins ago',
        read: false,
        createdAt: '2026-10-27T11:55:00Z', // 5m ago
      },
      {
        id: 'p3',
        message: 'Notification 2 hours ago with offset',
        read: false,
        createdAt: '2026-10-27T15:30:00+05:30', // 10:00:00 UTC -> 2 hours ago
      },
      {
        id: 'p4',
        message: 'Notification yesterday',
        read: true,
        createdAt: '2026-10-26T10:00:00Z', // Yesterday
      },
      {
        id: 'p5',
        message: 'Notification older than yesterday',
        read: true,
        createdAt: '2026-10-24T12:00:00Z', // 3 days ago -> absolute date
      },
    ];

    vi.spyOn(notificationApi, 'getMyNotifications').mockResolvedValue(mockNotifications);

    render(
      <BrowserRouter>
        <NotificationsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Notification just arrived')).toBeInTheDocument();
    });

    expect(screen.getByText('Just now')).toBeInTheDocument();
    expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
    expect(screen.getByText('Oct 24, 2026')).toBeInTheDocument();
  });

  it('updates displayed relative time periodically while page is open', async () => {
    const mockNotifications: NotificationItem[] = [
      {
        id: 'p1',
        message: 'Tick test notification',
        read: false,
        createdAt: '2026-10-27T11:59:30Z', // 30s ago -> Just now
      },
    ];

    vi.spyOn(notificationApi, 'getMyNotifications').mockResolvedValue(mockNotifications);

    render(
      <BrowserRouter>
        <NotificationsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tick test notification')).toBeInTheDocument();
    });

    expect(screen.getByText('Just now')).toBeInTheDocument();

    // Advance 60 seconds
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    await waitFor(() => {
      expect(screen.getByText('1 minute ago')).toBeInTheDocument();
    });
  });
});
