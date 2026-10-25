import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LiveLocationTracker } from './LiveLocationTracker';
import * as volunteerApi from '../api/volunteerApi';
import { ToastProvider } from '../context/ToastContext';
import { DeliveryTrackingProvider } from '../context/DeliveryTrackingContext';
import * as AuthContextModule from '../context/AuthContext';
import '@testing-library/jest-dom/vitest';

vi.mock('../api/volunteerApi', () => ({
  sendLocationUpdate: vi.fn().mockResolvedValue({ success: true }),
  getMyVolunteerTasks: vi.fn().mockResolvedValue([]),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('LiveLocationTracker Component & Persistent Tracking', () => {
  let mockGeolocation: any;

  beforeEach(() => {
    vi.clearAllMocks();
    (AuthContextModule.useAuth as any).mockReturnValue({
      user: { id: 'volunteer-1', role: 'VOLUNTEER' },
      isAuthenticated: true,
      token: 'mock-token',
    });

    mockGeolocation = {
      getCurrentPosition: vi.fn((success) => {
        success({
          coords: { latitude: 12.9716, longitude: 77.5946, speed: 10, heading: 90 },
          timestamp: Date.now(),
        });
      }),
      watchPosition: vi.fn((success) => {
        success({
          coords: { latitude: 12.9720, longitude: 77.5950, speed: 12, heading: 95 },
          timestamp: Date.now(),
        });
        return 123;
      }),
      clearWatch: vi.fn(),
    };

    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <ToastProvider>
        <DeliveryTrackingProvider>
          {ui}
        </DeliveryTrackingProvider>
      </ToastProvider>
    );
  };

  it('renders start button and triggers immediate GPS fix and transmission', async () => {
    renderWithProviders(<LiveLocationTracker deliveryId="delivery-123" status="IN_TRANSIT" />);

    const startBtn = screen.getByRole('button', { name: /start trip & share location/i });
    expect(startBtn).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(startBtn);

    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
    expect(mockGeolocation.watchPosition).toHaveBeenCalled();

    await waitFor(() => {
      expect(volunteerApi.sendLocationUpdate).toHaveBeenCalledWith(
        'delivery-123',
        expect.objectContaining({
          deliveryId: 'delivery-123',
          lat: expect.any(Number),
          lng: expect.any(Number),
        })
      );
    });

    expect(screen.getByRole('button', { name: /end trip/i })).toBeInTheDocument();
  });

  it('preserves active tracking session when component unmounts and remounts', async () => {
    const TestHost = () => {
      const [mounted, setMounted] = React.useState(true);
      return (
        <div>
          <button onClick={() => setMounted((m) => !m)}>Toggle Mount</button>
          {mounted && <LiveLocationTracker deliveryId="delivery-persistent" status="IN_TRANSIT" />}
        </div>
      );
    };

    renderWithProviders(<TestHost />);

    const startBtn = screen.getByRole('button', { name: /start trip & share location/i });
    const user = userEvent.setup();
    await user.click(startBtn);

    expect(screen.getByRole('button', { name: /end trip/i })).toBeInTheDocument();
    expect(mockGeolocation.clearWatch).not.toHaveBeenCalled();

    // Simulate navigation away: component unmounts
    await user.click(screen.getByRole('button', { name: /toggle mount/i }));
    expect(screen.queryByRole('button', { name: /end trip/i })).not.toBeInTheDocument();

    // The GPS watcher must NOT be cancelled by page unmount
    expect(mockGeolocation.clearWatch).not.toHaveBeenCalled();

    // Simulate navigating back: component remounts in the same app session
    await user.click(screen.getByRole('button', { name: /toggle mount/i }));

    // Should immediately display active state without needing user to click start again
    expect(screen.getByRole('button', { name: /end trip/i })).toBeInTheDocument();
    expect(screen.getByText(/Sharing Active/i)).toBeInTheDocument();
  });

  it('handles location permission denial gracefully', async () => {
    mockGeolocation.getCurrentPosition = vi.fn((_, error) => {
      error({ code: 1, PERMISSION_DENIED: 1, message: 'User denied geolocation' });
    });
    mockGeolocation.watchPosition = vi.fn((_, error) => {
      error({ code: 1, PERMISSION_DENIED: 1, message: 'User denied geolocation' });
      return 124;
    });

    renderWithProviders(<LiveLocationTracker deliveryId="delivery-123" status="IN_TRANSIT" />);

    const startBtn = screen.getByRole('button', { name: /start trip & share location/i });
    const user = userEvent.setup();
    await user.click(startBtn);

    await waitFor(() => {
      expect(screen.getByText(/Location permission denied/i)).toBeInTheDocument();
    });
  });

  it('handles GPS unavailable error gracefully', async () => {
    mockGeolocation.getCurrentPosition = vi.fn((_, error) => {
      error({ code: 2, POSITION_UNAVAILABLE: 2, message: 'GPS signal unavailable' });
    });
    mockGeolocation.watchPosition = vi.fn((_, error) => {
      error({ code: 2, POSITION_UNAVAILABLE: 2, message: 'GPS signal unavailable' });
      return 125;
    });

    renderWithProviders(<LiveLocationTracker deliveryId="delivery-123" status="IN_TRANSIT" />);

    const startBtn = screen.getByRole('button', { name: /start trip & share location/i });
    const user = userEvent.setup();
    await user.click(startBtn);

    await waitFor(() => {
      expect(screen.getByText(/GPS signal unavailable/i)).toBeInTheDocument();
    });
  });

  it('disables start trip button when status is DELIVERED or COMPLETED', () => {
    renderWithProviders(<LiveLocationTracker deliveryId="delivery-123" status="DELIVERED" />);

    const startBtn = screen.getByRole('button', { name: /start trip & share location/i });
    expect(startBtn).toBeDisabled();
  });
});
