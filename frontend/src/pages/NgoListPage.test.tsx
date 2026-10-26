import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NgoListPage } from './NgoListPage';
import * as ngoApi from '../api/ngoApi';
import { NGOProfile } from '../types';
import '@testing-library/jest-dom/vitest';

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

vi.mock('../api/ngoApi', () => ({
  getVerifiedNgos: vi.fn(),
}));

const mockFullNgo: NGOProfile = {
  id: 'ngo-full-1',
  name: 'Hope Sanctuary',
  description: 'Community food pantry and medical relief',
  address: '100 Broadway, New York',
  city: 'New York',
  phone: '555-0199',
  latitude: 40.7128,
  longitude: -74.006,
  distanceKm: 3.42,
  verified: true,
  averageRating: 4.85,
  ratingCount: 24,
  createdAt: '2026-01-01T00:00:00Z',
  user: {
    id: 'u-1',
    email: 'hope@sanctuary.org',
    fullName: 'Hope Admin',
    role: 'NGO',
    createdAt: '2026-01-01T00:00:00Z',
  },
};

const mockNullNgo: NGOProfile = {
  id: 'ngo-null-2',
  name: 'Grace Community',
  description: undefined,
  address: '200 Elm St',
  city: undefined,
  phone: '555-0200',
  latitude: null,
  longitude: null,
  distanceKm: null, // Critical: Backend returns null when donor coordinates are absent
  verified: true,
  averageRating: null,
  ratingCount: null,
  createdAt: '2026-01-02T00:00:00Z',
  user: {
    id: 'u-2',
    email: 'grace@community.org',
    fullName: 'Grace Admin',
    role: 'NGO',
    createdAt: '2026-01-02T00:00:00Z',
  },
};

const mockZeroNgo: NGOProfile = {
  id: 'ngo-zero-3',
  name: 'Zero Mile Aid',
  description: 'Stationed right at headquarters',
  address: '0 Ground Zero',
  city: 'Metro City',
  phone: '555-0300',
  latitude: 0.0,
  longitude: 0.0,
  distanceKm: 0.0,
  verified: true,
  averageRating: 0.0,
  ratingCount: 3,
  createdAt: '2026-01-03T00:00:00Z',
  user: {
    id: 'u-3',
    email: 'zero@aid.org',
    fullName: 'Zero Admin',
    role: 'NGO',
    createdAt: '2026-01-03T00:00:00Z',
  },
};

describe('NgoListPage - Runtime Crash Prevention & Numeric Safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. renders NGO profiles with valid numeric values correctly', async () => {
    vi.mocked(ngoApi.getVerifiedNgos).mockResolvedValueOnce([mockFullNgo]);

    render(
      <MemoryRouter>
        <NgoListPage />
      </MemoryRouter>
    );

    // Initial loading indicator
    expect(screen.getByText('Fetching verified NGO profiles...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Hope Sanctuary')).toBeInTheDocument();
    });

    // Rating formatted to 1 decimal place: 4.85 -> 4.9 or 4.8
    expect(screen.getByText('4.8' || '4.9')).toBeInTheDocument();
    expect(screen.getByText('(24)')).toBeInTheDocument();

    // Distance formatted: 3.42 -> 3.4 km away
    expect(screen.getByText('3.4 km away')).toBeInTheDocument();
  });

  it('2. does NOT crash when distanceKm, averageRating, and other numeric fields are null (reproducing reported crash scenario)', async () => {
    // When backend returns distanceKm: null, previous code crashed with Cannot read properties of null (reading 'toFixed')
    vi.mocked(ngoApi.getVerifiedNgos).mockResolvedValueOnce([mockNullNgo]);

    render(
      <MemoryRouter>
        <NgoListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Grace Community')).toBeInTheDocument();
    });

    // Verify fallback for missing rating
    expect(screen.getByText('No ratings yet')).toBeInTheDocument();

    // Verify distance is omitted cleanly without crashing
    expect(screen.queryByText(/km away/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Distance unavailable/i)).not.toBeInTheDocument();
  });

  it('3. preserves legitimate zero as a valid numeric value for rating and distance', async () => {
    vi.mocked(ngoApi.getVerifiedNgos).mockResolvedValueOnce([mockZeroNgo]);

    render(
      <MemoryRouter>
        <NgoListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Zero Mile Aid')).toBeInTheDocument();
    });

    // 0.0 rating with 3 reviews should render "0.0" and "(3)", not "No ratings yet"
    expect(screen.getByText('0.0')).toBeInTheDocument();
    expect(screen.getByText('(3)')).toBeInTheDocument();

    // 0.0 distance should render "0.0 km away"
    expect(screen.getByText('0.0 km away')).toBeInTheDocument();
  });

  it('4. displays "Distance unavailable" when user requested distance sort but coordinates are missing', async () => {
    vi.mocked(ngoApi.getVerifiedNgos).mockResolvedValue([mockNullNgo]);

    // Mock navigator.geolocation
    const mockGeolocation = {
      getCurrentPosition: vi.fn((success) =>
        success({
          coords: {
            latitude: 40.7128,
            longitude: -74.006,
          },
        })
      ),
    };
    vi.stubGlobal('navigator', { geolocation: mockGeolocation });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <NgoListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Grace Community')).toBeInTheDocument();
    });

    // Click "Sort by Distance"
    const sortBtn = screen.getByRole('button', { name: /Sort by Distance/i });
    await user.click(sortBtn);

    // After location is active, the NGO with null distance displays "Distance unavailable"
    await waitFor(() => {
      expect(screen.getByText('Distance unavailable')).toBeInTheDocument();
    });

    vi.unstubAllGlobals();
  });

  it('5. displays appropriate empty state when no NGOs are returned', async () => {
    vi.mocked(ngoApi.getVerifiedNgos).mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <NgoListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No verified NGOs found')).toBeInTheDocument();
    });
    expect(
      screen.getByText('No verified NGO profiles are registered in the system yet.')
    ).toBeInTheDocument();
  });

  it('6. displays recoverable error state with Retry button on API failure', async () => {
    vi.mocked(ngoApi.getVerifiedNgos).mockRejectedValueOnce(new Error('Network error on Render'));

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <NgoListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Network error on Render')).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /Retry Loading/i });
    expect(retryBtn).toBeInTheDocument();

    // Mock recovery on retry
    vi.mocked(ngoApi.getVerifiedNgos).mockResolvedValueOnce([mockFullNgo]);
    await user.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Hope Sanctuary')).toBeInTheDocument();
    });
  });

  it('7. allows searching by NGO name and description without crashing on incomplete profiles', async () => {
    vi.mocked(ngoApi.getVerifiedNgos).mockResolvedValueOnce([mockFullNgo, mockNullNgo]);

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <NgoListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Hope Sanctuary')).toBeInTheDocument();
      expect(screen.getByText('Grace Community')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by NGO name or description/i);
    await user.type(searchInput, 'Grace');

    expect(screen.queryByText('Hope Sanctuary')).not.toBeInTheDocument();
    expect(screen.getByText('Grace Community')).toBeInTheDocument();
  });

  it('8. card navigation and donate button links function properly', async () => {
    vi.mocked(ngoApi.getVerifiedNgos).mockResolvedValueOnce([mockFullNgo]);

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <NgoListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Hope Sanctuary')).toBeInTheDocument();
    });

    // Clicking card triggers navigate to /ngos/ngo-full-1
    await user.click(screen.getByText('Hope Sanctuary'));
    expect(mockedNavigate).toHaveBeenCalledWith('/ngos/ngo-full-1');

    // Donate button has correct href
    const donateLink = screen.getByRole('link', { name: /Donate/i });
    expect(donateLink).toHaveAttribute('href', '/donate/new?ngoId=ngo-full-1');
  });
});

