import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateDonationPage } from './CreateDonationPage';
import * as ngoApi from '../api/ngoApi';
import * as donationApi from '../api/donationApi';
import * as cameraService from '../utils/cameraService';
import { ToastProvider } from '../context/ToastContext';

vi.mock('../api/ngoApi', () => ({
  getVerifiedNgos: vi.fn(),
}));

vi.mock('../api/donationApi', () => ({
  createDonation: vi.fn(),
  uploadDonationPhoto: vi.fn(),
}));

vi.mock('../utils/cameraService', () => ({
  capturePhotoWithCamera: vi.fn(),
}));

// Mock map components to avoid Leaflet errors in jsdom
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: () => <div data-testid="marker" />,
  useMap: () => ({
    setView: vi.fn(),
    getZoom: () => 13,
  }),
  useMapEvents: () => null,
}));


describe('CreateDonationPage Form Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(ngoApi.getVerifiedNgos).mockResolvedValue([
      {
        id: 'ngo1',
        user: {
          id: 'user1',
          email: 'ngo@test.com',
          fullName: 'Test NGO',
          role: 'NGO',
          createdAt: '2023-01-01',
        },
        name: 'Test NGO',
        phone: '1234567890',
        address: '123 Main St',
        verified: true,
        createdAt: '2023-01-01',
      },
    ]);
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <ToastProvider>
          <CreateDonationPage />
        </ToastProvider>
      </MemoryRouter>
    );
  };

  it('shows required field errors on empty submit', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Submit Donation Request/i })).not.toBeDisabled();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Submit Donation Request/i }));

    await waitFor(() => {
      expect(screen.getByText('Please select an NGO')).toBeInTheDocument();
      expect(screen.getByText('Pickup address is required')).toBeInTheDocument();
      expect(screen.getByText('Item description is required')).toBeInTheDocument();
      expect(screen.getByText('Preferred pickup date is required')).toBeInTheDocument();
      expect(screen.getByText('Time slot is required')).toBeInTheDocument();
    });
  });

  it('clears the pending suggestion timeout when unmounted', () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    try {
      const { unmount } = renderPage();
      fireEvent.blur(screen.getByPlaceholderText(/Enter complete pickup address/i));

      const timeoutIndex = setTimeoutSpy.mock.calls.findIndex(([, delay]) => delay === 200);
      expect(timeoutIndex).toBeGreaterThanOrEqual(0);
      const timeoutHandle = setTimeoutSpy.mock.results[timeoutIndex].value;

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalledWith(timeoutHandle);
    } finally {
      setTimeoutSpy.mockRestore();
      clearTimeoutSpy.mockRestore();
    }
  });

  it('validates description length (too short)', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: /Submit Donation Request/i })).not.toBeDisabled());

    const user = userEvent.setup();
    const descriptionInput = screen.getByPlaceholderText(/Describe the items being donated/i);
    await user.type(descriptionInput, 'Too short');
    
    await user.click(screen.getByRole('button', { name: /Submit Donation Request/i }));

    await waitFor(() => {
      expect(screen.getByText('Description must be at least 20 characters')).toBeInTheDocument();
    });
  });

  it('shows error if no photos are uploaded and map is not pinned (even if fields are valid)', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: /Submit Donation Request/i })).not.toBeDisabled());

    const user = userEvent.setup();
    
    await user.selectOptions(screen.getByRole('combobox', { name: /Select NGO Partner \*/i }), 'ngo1');
    
    // Valid date (future)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    if (dateInput) {
      dateInput.removeAttribute('min');
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(dateInput, dateStr);
      } else {
        dateInput.value = dateStr;
      }
      fireEvent.change(dateInput);
      fireEvent.blur(dateInput);
    }
    
    await user.selectOptions(screen.getByRole('combobox', { name: /Preferred Time Slot/i }), 'MORNING_9_12');
    
    await user.type(screen.getByPlaceholderText(/Enter complete pickup address/i), '123 Main St, Apt 4B');
    await user.type(screen.getByPlaceholderText(/Describe the items being donated/i), 'These are some items in very good condition with lots of details.');

    await user.click(screen.getByRole('button', { name: /Submit Donation Request/i }));

    await waitFor(() => {
      // Because we didn't mock file uploads in UI flow to actually have photos
      expect(screen.getByText('Please upload at least one clear photo of the items.')).toBeInTheDocument();
    });
  });

  it('shows error for past pickup date', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: /Submit Donation Request/i })).not.toBeDisabled());

    const user = userEvent.setup();
    
    // Past date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    if (dateInput) {
      dateInput.removeAttribute('min');
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(dateInput, dateStr);
      } else {
        dateInput.value = dateStr;
      }
      fireEvent.change(dateInput);
      fireEvent.blur(dateInput);
    }
    
    await user.click(screen.getByRole('button', { name: /Submit Donation Request/i }));

    await waitFor(() => {
      expect(screen.getByText('Pickup date cannot be in the past')).toBeInTheDocument();
    });
  });

  it('renders zoom and full-screen controls on pickup pin map', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: /Submit Donation Request/i })).not.toBeDisabled());

    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enter full screen' })).toBeInTheDocument();
  });

  it('toggles full-screen mode on donor pickup map', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: /Submit Donation Request/i })).not.toBeDisabled());

    const toggleBtn = screen.getByRole('button', { name: 'Enter full screen' });
    fireEvent.click(toggleBtn);

    const mapWrapper = screen.getByTestId('create-donation-map-wrapper');
    expect(mapWrapper.className).toContain('fixed inset-0');
    expect(screen.getByText('Tap map to pin exact pickup location')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exit full screen' })).toBeInTheDocument();

    // Exit full screen
    fireEvent.click(screen.getByRole('button', { name: 'Exit full screen' }));
    expect(mapWrapper.className).toContain('h-[250px]');
    expect(screen.getByRole('button', { name: 'Enter full screen' })).toBeInTheDocument();
  });

  it('provides camera-only photo capture and completely removes gallery file picker', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: /Submit Donation Request/i })).not.toBeDisabled());

    // 1. Confirm NO file input exists on the page
    expect(document.querySelector('input[type="file"]')).toBeNull();

    // 2. Camera capture button is present
    const takePhotoButton = screen.getByTestId('take-photo-btn');
    expect(takePhotoButton).toBeInTheDocument();
    expect(screen.getByText('Take Photo with Camera')).toBeInTheDocument();
    expect(screen.getByText('Camera capture only')).toBeInTheDocument();

    // 3. Mock camera capture
    const dummyFile = new File(['content'], 'captured-item.jpg', { type: 'image/jpeg' });
    vi.mocked(cameraService.capturePhotoWithCamera).mockResolvedValueOnce({
      file: dummyFile,
      previewUrl: 'blob:http://localhost/preview-1',
    });
    vi.mocked(donationApi.uploadDonationPhoto).mockResolvedValueOnce('/api/donations/photo/server-1.jpg');

    // Click take photo
    fireEvent.click(takePhotoButton);

    await waitFor(() => {
      expect(cameraService.capturePhotoWithCamera).toHaveBeenCalledWith('donation-item');
      expect(donationApi.uploadDonationPhoto).toHaveBeenCalledWith(dummyFile);
      expect(screen.getByAltText('Captured item 1')).toBeInTheDocument();
    });

    // 4. Removing the photo
    const removeBtn = screen.getByTestId('remove-photo-0');
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(screen.queryByAltText('Captured item 1')).not.toBeInTheDocument();
    });
  });

  it('preserves form state when camera capture is cancelled', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: /Submit Donation Request/i })).not.toBeDisabled());

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/Describe the items being donated/i), 'Books for kids');

    // Mock cancellation (returns null)
    vi.mocked(cameraService.capturePhotoWithCamera).mockResolvedValueOnce(null);

    const takePhotoButton = screen.getByTestId('take-photo-btn');
    fireEvent.click(takePhotoButton);

    await waitFor(() => {
      expect(cameraService.capturePhotoWithCamera).toHaveBeenCalled();
    });

    // Description is intact and no error is thrown
    expect(screen.getByPlaceholderText(/Describe the items being donated/i)).toHaveValue('Books for kids');
    expect(screen.queryByText(/Failed/i)).not.toBeInTheDocument();
  });
});
