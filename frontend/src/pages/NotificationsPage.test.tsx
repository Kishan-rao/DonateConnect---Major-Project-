import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NotificationsPage } from './NotificationsPage';
import * as notificationApi from '../api/notificationApi';
import * as AuthContext from '../context/AuthContext';
import * as ToastContext from '../context/ToastContext';
import { NotificationItem } from '../types';

vi.mock('../api/notificationApi');
vi.mock('../context/AuthContext');
vi.mock('../context/ToastContext');

describe('NotificationsPage Component - Timestamp Removal & Core Functionality', () => {
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

    vi.spyOn(ToastContext, 'useToast').mockReturnValue({
      showSuccess: vi.fn(),
      showError: vi.fn(),
      showInfo: vi.fn(),
      showWarning: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders notifications page without any visible timestamp labels across recent, old, future, invalid, and missing dates', async () => {
    const mockNotifications: NotificationItem[] = [
      {
        id: 'p1',
        message: 'Notification just arrived',
        read: false,
        createdAt: new Date().toISOString(), // Recent
      },
      {
        id: 'p2',
        message: 'Notification five minutes ago',
        read: false,
        createdAt: '2026-10-28T11:55:00Z', // 5m ago
      },
      {
        id: 'p3',
        message: 'Notification two hours ago with timezone offset',
        read: false,
        createdAt: '2026-10-28T15:30:00+05:30', // Offset
      },
      {
        id: 'p4',
        message: 'Previous day delivery confirmation',
        read: true,
        createdAt: '2026-10-27T10:00:00Z', // 24 hours ago
      },
      {
        id: 'p5',
        message: 'Notification older than previous day from last month',
        read: true,
        createdAt: '2026-09-24T12:00:00Z', // Past date
      },
      {
        id: 'p6',
        message: 'Future scheduled alert',
        read: false,
        createdAt: '2026-12-31T23:59:59Z', // Future date
      },
      {
        id: 'p7',
        message: 'Corrupted timestamp alert',
        read: true,
        createdAt: 'corrupted-iso-string', // Invalid
      },
      {
        id: 'p8',
        message: 'Missing timestamp alert',
        read: true,
        createdAt: (null as unknown as string), // Null / missing
      },
    ];

    vi.spyOn(notificationApi, 'getMyNotifications').mockResolvedValue(mockNotifications);

    render(
      <BrowserRouter>
        <NotificationsPage />
      </BrowserRouter>
    );

    // Verify all notification messages are rendered
    await waitFor(() => {
      expect(screen.getByText('Notification just arrived')).toBeInTheDocument();
      expect(screen.getByText('Notification five minutes ago')).toBeInTheDocument();
      expect(screen.getByText('Notification two hours ago with timezone offset')).toBeInTheDocument();
      expect(screen.getByText('Previous day delivery confirmation')).toBeInTheDocument();
      expect(screen.getByText('Notification older than previous day from last month')).toBeInTheDocument();
      expect(screen.getByText('Future scheduled alert')).toBeInTheDocument();
      expect(screen.getByText('Corrupted timestamp alert')).toBeInTheDocument();
      expect(screen.getByText('Missing timestamp alert')).toBeInTheDocument();
    });

    // Verify unread notifications have "Mark as read" buttons
    const markReadButtons = screen.getAllByRole('button', { name: /mark as read/i });
    expect(markReadButtons.length).toBe(4); // p1, p2, p3, p6 are unread

    // Verify NO relative or absolute date/time strings appear anywhere on the page
    expect(screen.queryByText(/just now/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\b\d+\s*(second|sec|minute|min|hour|hr|day|week|month|year)s?\s*ago\b/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/yesterday/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\d{1,2}:\d{2}/i)).not.toBeInTheDocument();

    // Verify no semantic time elements exist
    const timeElements = document.querySelectorAll('time');
    expect(timeElements.length).toBe(0);
  });

  it('marks a single notification as read without rendering timestamp', async () => {
    const mockNotifications: NotificationItem[] = [
      {
        id: 'p1',
        message: 'Unread item to be acknowledged',
        read: false,
        createdAt: '2026-10-28T11:00:00Z',
      },
    ];

    vi.spyOn(notificationApi, 'getMyNotifications').mockResolvedValue(mockNotifications);
    vi.spyOn(notificationApi, 'markNotificationRead').mockResolvedValue(undefined);

    render(
      <BrowserRouter>
        <NotificationsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Unread item to be acknowledged')).toBeInTheDocument();
    });

    const markBtn = screen.getByRole('button', { name: /mark as read/i });
    fireEvent.click(markBtn);

    await waitFor(() => {
      expect(notificationApi.markNotificationRead).toHaveBeenCalledWith('p1');
      expect(screen.queryByRole('button', { name: /mark as read/i })).not.toBeInTheDocument();
    });
  });

  it('marks all notifications as read and shows toast confirmation', async () => {
    const mockNotifications: NotificationItem[] = [
      {
        id: 'p1',
        message: 'First unread',
        read: false,
        createdAt: '2026-10-28T11:00:00Z',
      },
      {
        id: 'p2',
        message: 'Second unread',
        read: false,
        createdAt: '2026-10-28T10:00:00Z',
      },
    ];

    vi.spyOn(notificationApi, 'getMyNotifications').mockResolvedValue(mockNotifications);
    vi.spyOn(notificationApi, 'markNotificationRead').mockResolvedValue(undefined);

    render(
      <BrowserRouter>
        <NotificationsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('First unread')).toBeInTheDocument();
    });

    const markAllBtn = screen.getByRole('button', { name: /mark all as read/i });
    fireEvent.click(markAllBtn);

    await waitFor(() => {
      expect(notificationApi.markNotificationRead).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole('button', { name: /mark as read/i })).not.toBeInTheDocument();
    });
  });

  it('renders empty state cleanly when there are no notifications', async () => {
    vi.spyOn(notificationApi, 'getMyNotifications').mockResolvedValue([]);

    render(
      <BrowserRouter>
        <NotificationsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
      expect(screen.getByText(/You're all caught up!/i)).toBeInTheDocument();
    });
  });

  it('handles error state gracefully when fetching notifications fails', async () => {
    vi.spyOn(notificationApi, 'getMyNotifications').mockRejectedValue(new Error('Network error'));

    render(
      <BrowserRouter>
        <NotificationsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    });
  });
});
