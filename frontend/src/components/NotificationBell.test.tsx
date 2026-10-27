import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';
import * as notificationApi from '../api/notificationApi';
import * as AuthContext from '../context/AuthContext';
import { NotificationItem } from '../types';

vi.mock('../api/notificationApi');
vi.mock('../context/AuthContext');

describe('NotificationBell Component Timestamp Accuracy', () => {
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
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders accurate relative timestamps across various past intervals and timezone formats', async () => {
    const mockNotifications: NotificationItem[] = [
      {
        id: 'n1',
        message: 'Recent notification',
        read: false,
        createdAt: '2026-10-27T11:59:40Z', // 20 seconds ago -> Just now
      },
      {
        id: 'n2',
        message: 'Five minutes notification',
        read: false,
        createdAt: '2026-10-27T11:55:00Z', // 5 minutes ago
      },
      {
        id: 'n3',
        message: 'Two hours notification',
        read: false,
        createdAt: '2026-10-27T10:00:00', // Server ISO without Z -> UTC 10:00:00 -> 2 hours ago
      },
      {
        id: 'n4',
        message: 'Yesterday notification',
        read: true,
        createdAt: '2026-10-26T10:00:00Z', // 26 hours ago -> Yesterday
      },
      {
        id: 'n5',
        message: 'Invalid timestamp notification',
        read: true,
        createdAt: 'invalid-date', // Invalid -> fallback safely to Just now
      },
    ];

    vi.spyOn(notificationApi, 'getMyNotifications').mockResolvedValue(mockNotifications);

    render(
      <BrowserRouter>
        <NotificationBell />
      </BrowserRouter>
    );

    // Click the bell button to open dropdown
    const bellBtn = screen.getByTitle('Notifications');
    fireEvent.click(bellBtn);

    await waitFor(() => {
      expect(screen.getByText('Recent notification')).toBeInTheDocument();
    });

    // Check displayed timestamps
    expect(screen.getAllByText('Just now').length).toBeGreaterThanOrEqual(2); // n1 and n5
    expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
  });

  it('updates displayed relative time while open when time advances', async () => {
    const mockNotifications: NotificationItem[] = [
      {
        id: 'n1',
        message: 'Live updating notification',
        read: false,
        createdAt: '2026-10-27T11:59:30Z', // 30s ago -> Just now
      },
    ];

    vi.spyOn(notificationApi, 'getMyNotifications').mockResolvedValue(mockNotifications);

    render(
      <BrowserRouter>
        <NotificationBell />
      </BrowserRouter>
    );

    const bellBtn = screen.getByTitle('Notifications');
    fireEvent.click(bellBtn);

    await waitFor(() => {
      expect(screen.getByText('Live updating notification')).toBeInTheDocument();
    });

    expect(screen.getByText('Just now')).toBeInTheDocument();

    // Advance time by 60 seconds inside act
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    await waitFor(() => {
      expect(screen.getByText('1 minute ago')).toBeInTheDocument();
    });
  });
});
