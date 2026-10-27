import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TrackDeliveryPage } from './TrackDeliveryPage';
import * as donationApi from '../api/donationApi';
import * as AuthContextModule from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { DeliveryTrackingProvider } from '../context/DeliveryTrackingContext';
import { RouteEtaDto } from '../types';
import '@testing-library/jest-dom/vitest';
import { Client } from '@stomp/stompjs';

vi.mock('../api/donationApi', () => ({
  getDonationById: vi.fn(),
  getDeliveryByDonationId: vi.fn(),
  getLiveLocation: vi.fn(),
  completeDelivery: vi.fn(),
  getDeliveryRouteEta: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock STOMP Client
const mockStompClient = {
  activate: vi.fn(),
  deactivate: vi.fn(),
  subscribe: vi.fn(),
  connected: false,
};

vi.mock('@stomp/stompjs', () => {
  return {
    Client: class {
      activate = mockStompClient.activate;
      deactivate = mockStompClient.deactivate;
      subscribe = mockStompClient.subscribe;
      get connected() { return mockStompClient.connected; }
      constructor(config: any) {
        if (config?.onConnect) {
          setTimeout(config.onConnect, 10);
        }
      }
    },
  };
});

// Mock Leaflet
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: any) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
  Polyline: ({ positions }: any) => <div data-testid="polyline" data-positions={JSON.stringify(positions)} />,
  useMap: () => ({ panTo: vi.fn(), setView: vi.fn() }),
}));

describe('TrackDeliveryPage', () => {
  const mockDonation = {
    id: 'test-id',
    category: 'CLOTHES',
    status: 'PICKED_UP',
    pickupLat: 28.1,
    pickupLng: 77.1,
    pickupAddress: '100 Main St, New Delhi',
    ngo: { name: 'Test NGO', latitude: 28.2, longitude: 77.2, address: 'Test Address' },
  };

  const mockDelivery = {
    id: 'delivery-1',
    status: 'PICKED_UP',
    lastLat: 28.15,
    lastLng: 77.15,
    lastLocationAt: new Date().toISOString(),
  };

  const mockRouteEta: RouteEtaDto = {
    deliveryId: 'delivery-1',
    donationId: 'test-id',
    deliveryStatus: 'PICKED_UP',
    destinationType: 'NGO_HUB',
    destinationAddress: 'Test Address',
    originLat: 28.15,
    originLng: 77.15,
    driverLastLocationAt: new Date().toISOString(),
    staleGps: false,
    destinationLat: 28.2,
    destinationLng: 77.2,
    roadDistanceKm: 7.6,
    roadDistanceMeters: 7600,
    durationMinutes: 28,
    durationSeconds: 1680,
    calculatedAt: new Date().toISOString(),
    trafficAware: false,
    provider: 'OSRM',
    routingStatus: 'SUCCESS',
    statusMessage: 'Route calculated via OpenStreetMap road routing.',
    routeCoordinates: [[28.15, 77.15], [28.2, 77.2]],
  };

  let mockLoc: any;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 9, 5, 12, 0, 0));
    mockLoc = { lat: 28.15, lng: 77.15, timestamp: new Date().toISOString() };
    vi.clearAllMocks();

    vi.mocked(donationApi.getDonationById).mockResolvedValue(mockDonation as any);
    vi.mocked(donationApi.getDeliveryByDonationId).mockResolvedValue(mockDelivery as any);
    vi.mocked(donationApi.getLiveLocation).mockResolvedValue(mockLoc);
    vi.mocked(donationApi.getDeliveryRouteEta).mockResolvedValue(mockRouteEta);

    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      token: 'test-token',
      user: { role: 'VOLUNTEER' },
    } as any);

    mockStompClient.connected = false;
    mockStompClient.activate.mockClear();
    mockStompClient.deactivate.mockClear();
    mockStompClient.subscribe.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderPage = () => {
    return render(
      <ToastProvider>
        <DeliveryTrackingProvider>
          <MemoryRouter initialEntries={['/track/test-id']}>
            <Routes>
              <Route path="/track/:id" element={<TrackDeliveryPage />} />
            </Routes>
          </MemoryRouter>
        </DeliveryTrackingProvider>
      </ToastProvider>
    );
  };

  it('1. renders and fetches initial donation, location, and backend route ETA', async () => {
    renderPage();

    expect(screen.getByText('Initializing live map tracker...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Initializing live map tracker...')).not.toBeInTheDocument();
    });

    expect(donationApi.getDonationById).toHaveBeenCalledWith('test-id');
    expect(donationApi.getLiveLocation).toHaveBeenCalledWith('test-id');
    expect(donationApi.getDeliveryRouteEta).toHaveBeenCalledWith('test-id');

    expect(screen.getByText(/Live Delivery Tracking/i)).toBeInTheDocument();
    expect(screen.getByText(/CLOTHES/i)).toBeInTheDocument();
  });

  it('2. displays authoritative road distance, arrival duration, and non-traffic notice', async () => {
    renderPage();

    await waitFor(() => expect(screen.queryByText('Initializing live map tracker...')).not.toBeInTheDocument());

    // Distance remaining
    await waitFor(() => {
      expect(screen.getByText('7.6 km')).toBeInTheDocument();
    });
    expect(screen.getByText(/Road distance remaining/i)).toBeInTheDocument();

    // Estimated arrival duration
    expect(screen.getByText('28 min')).toBeInTheDocument();
    expect(screen.getByText(/Estimated arrival/i)).toBeInTheDocument();

    // Traffic awareness disclaimer
    expect(screen.getByText(/ETA based on road routing — live traffic not available/i)).toBeInTheDocument();

    // Map polyline rendered from backend coordinates
    const polylines = screen.getAllByTestId('polyline');
    const routePolyline = polylines.find(p => p.getAttribute('data-positions')?.includes('28.15'));
    expect(routePolyline).toBeDefined();
  });

  it('3. displays warning banner when driver GPS is marked stale by backend', async () => {
    vi.mocked(donationApi.getDeliveryRouteEta).mockResolvedValue({
      ...mockRouteEta,
      staleGps: true,
      driverLastLocationAt: new Date(2026, 9, 5, 11, 55, 0).toISOString(),
    });

    renderPage();

    await waitFor(() => expect(screen.queryByText('Initializing live map tracker...')).not.toBeInTheDocument());

    await waitFor(() => {
      expect(screen.getByText(/Warning: Location update is delayed \(Driver offline\)/i)).toBeInTheDocument();
    });
  });

  it('4. displays fallback notice when routingStatus is FALLBACK_ESTIMATE', async () => {
    vi.mocked(donationApi.getDeliveryRouteEta).mockResolvedValue({
      ...mockRouteEta,
      routingStatus: 'FALLBACK_ESTIMATE',
      provider: 'ESTIMATED_FALLBACK',
      roadDistanceKm: 8.5,
      durationMinutes: 20,
    });

    renderPage();

    await waitFor(() => expect(screen.queryByText('Initializing live map tracker...')).not.toBeInTheDocument());

    await waitFor(() => {
      expect(screen.getByText(/Estimated distance based on urban road network factor \(OSRM route unavailable\)/i)).toBeInTheDocument();
    });
    expect(screen.getByText('8.5 km')).toBeInTheDocument();
    expect(screen.getByText('20 min')).toBeInTheDocument();
  });

  it('5. displays missing destination coordinates message without crashing or inventing a route', async () => {
    vi.mocked(donationApi.getDeliveryRouteEta).mockResolvedValue({
      ...mockRouteEta,
      routingStatus: 'MISSING_COORDINATES',
      roadDistanceKm: null,
      durationMinutes: null,
      routeCoordinates: [],
    });

    renderPage();

    await waitFor(() => expect(screen.queryByText('Initializing live map tracker...')).not.toBeInTheDocument());

    await waitFor(() => {
      expect(screen.getByText(/Destination coordinates unavailable for road routing/i)).toBeInTheDocument();
    });
  });

  it('6. shows Mark Delivered modal (Verification Form) for volunteer on PICKED_UP delivery and handles submit', async () => {
    renderPage();

    await waitFor(() => expect(screen.queryByText('Initializing live map tracker...')).not.toBeInTheDocument());

    expect(screen.getByText('Verification Form')).toBeInTheDocument();

    const completeBtn = screen.getByRole('button', { name: /Complete Delivery/i });
    expect(completeBtn).toBeDisabled();

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    // Fill OTP
    const otpInputs = screen.getAllByRole('textbox');
    for (let i = 0; i < 6; i++) {
      await user.type(otpInputs[i], '1');
    }

    // Upload image
    const file = new File(['dummy'], 'test.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    expect(completeBtn).not.toBeDisabled();

    vi.mocked(donationApi.completeDelivery).mockResolvedValueOnce({});

    await user.click(completeBtn);

    expect(donationApi.completeDelivery).toHaveBeenCalledWith('delivery-1', '111111', file);
  });

  it('7. displays Delivery Completed and stops tracking when donation is marked DELIVERED', async () => {
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      token: 'ngo-token',
      user: { role: 'NGO', id: 'ngo-user-1' },
    } as any);

    vi.mocked(donationApi.getDonationById).mockResolvedValue({
      ...mockDonation,
      status: 'DELIVERED',
    } as any);

    vi.mocked(donationApi.getDeliveryByDonationId).mockResolvedValue({
      id: 'delivery-done',
      donationId: 'test-id',
      status: 'DELIVERED',
      lastLat: 28.15,
      lastLng: 77.15,
    } as any);

    renderPage();

    await waitFor(() => expect(screen.queryByText('Initializing live map tracker...')).not.toBeInTheDocument());

    expect(screen.getAllByText(/Delivery Completed/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });
  it('8. displays dash for ETA when driver is offline without fabricating a countdown or fake minutes', async () => {
    vi.mocked(donationApi.getDeliveryRouteEta).mockResolvedValue({
      ...mockRouteEta,
      routingStatus: 'DRIVER_OFFLINE',
      durationMinutes: null,
      roadDistanceKm: null,
      routeCoordinates: [],
    });

    renderPage();

    await waitFor(() => expect(screen.queryByText('Initializing live map tracker...')).not.toBeInTheDocument());

    await waitFor(() => {
      expect(screen.getByText('Waiting for driver GPS location...')).toBeInTheDocument();
    });

    // ETA stat displays dash, never a hardcoded fake countdown
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('9. prevents older asynchronous ETA response from overwriting newer response', async () => {
    let resolveFirst: (val: any) => void;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    const secondResponse = {
      ...mockRouteEta,
      durationMinutes: 12,
      roadDistanceKm: 3.5,
    };

    // First call hangs, second call resolves immediately with 12 min
    vi.mocked(donationApi.getDeliveryRouteEta)
      .mockReturnValueOnce(firstPromise as any)
      .mockResolvedValueOnce(secondResponse);

    renderPage();

    await waitFor(() => expect(screen.queryByText('Initializing live map tracker...')).not.toBeInTheDocument());

    // Second call resolves
    await waitFor(() => {
      expect(screen.getByText('12 min')).toBeInTheDocument();
    });

    // Now first (older) call resolves with 28 min
    resolveFirst!({
      ...mockRouteEta,
      durationMinutes: 28,
      roadDistanceKm: 7.6,
    });

    // Wait a tick and verify 12 min is preserved, not overwritten by older 28 min response
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText('12 min')).toBeInTheDocument();
    expect(screen.queryByText('28 min')).not.toBeInTheDocument();
  });

  it('10. renders zoom and full-screen controls on delivery tracking map', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText('Initializing live map tracker...')).not.toBeInTheDocument());

    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enter full screen' })).toBeInTheDocument();
  });

  it('11. toggles full-screen mode on tracking map and displays full-screen HUD', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText('Initializing live map tracker...')).not.toBeInTheDocument());

    const toggleBtn = screen.getByRole('button', { name: 'Enter full screen' });
    fireEvent.click(toggleBtn);

    const mapWrapper = screen.getByTestId('track-map-wrapper');
    expect(mapWrapper.className).toContain('fixed inset-0');

    expect(screen.getByRole('button', { name: 'Exit full screen' })).toBeInTheDocument();
    expect(screen.getByText('CLOTHES Donation')).toBeInTheDocument();

    // Exit full screen
    fireEvent.click(screen.getByRole('button', { name: 'Exit full screen' }));
    expect(mapWrapper.className).toContain('h-[520px]');
    expect(screen.getByRole('button', { name: 'Enter full screen' })).toBeInTheDocument();
  });
});
