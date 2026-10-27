import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MyDonationsPage } from './MyDonationsPage';
import * as donationApi from '../api/donationApi';
import * as AuthContextModule from '../context/AuthContext';
import { Donation, DonationStatus } from '../types';

vi.mock('../api/donationApi', () => ({
  getMyDonations: vi.fn(),
  getDonationById: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const allStatuses: DonationStatus[] = ['REQUESTED', 'ACCEPTED', 'REJECTED', 'PICKED_UP', 'DELIVERED'];

const createMockDonation = (id: string, status: DonationStatus, photoUrls: string[]): Donation => ({
  id,
  donor: { id: 'donor-1', fullName: 'John Doe', email: 'donor@example.com' } as any,
  ngo: { id: 'ngo-1', name: 'Shelter Hope', address: '123 Hope Way' } as any,
  category: 'CLOTHES',
  description: `Donation in ${status} status`,
  photoUrls,
  status,
  pickupDate: '2026-11-01',
  createdAt: '2026-10-25T10:00:00Z',
});

describe('MyDonationsPage - Status-Independent Photo Viewing for Donors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: { id: 'donor-1', fullName: 'John Doe', role: 'DONOR' },
      token: 'donor-token',
    } as any);
  });

  allStatuses.forEach((status) => {
    it(`displays photo thumbnail and opens full-size viewer for ${status} donation (historical & current)`, async () => {
      const mockDonations: Donation[] = [
        createMockDonation(
          `donation-${status.toLowerCase()}`,
          status,
          ['historical-photo.jpg', 'https://example.com/photo2.jpg']
        ),
      ];

      vi.mocked(donationApi.getMyDonations).mockResolvedValueOnce({
        content: mockDonations,
        totalElements: 1,
        totalPages: 1,
        size: 10,
        number: 0,
      } as any);

      render(
        <MemoryRouter>
          <MyDonationsPage />
        </MemoryRouter>
      );

      // Wait for table to load
      await waitFor(() => {
        expect(screen.getAllByText(`Donation in ${status} status`).length).toBeGreaterThanOrEqual(1);
      });

      // Verify desktop table thumbnail exists
      const tablePhotoBtn = screen.getByTestId(`donor-table-photo-donation-${status.toLowerCase()}`);
      expect(tablePhotoBtn).toBeInTheDocument();

      // Click thumbnail to open full-size PhotoViewerModal
      fireEvent.click(tablePhotoBtn);

      // Full-size modal is open regardless of status
      expect(screen.getByRole('dialog', { name: /CLOTHES Donation Photo/i })).toBeInTheDocument();
      expect(screen.getByTestId('photo-viewer-counter')).toHaveTextContent('1 / 2');

      // Close modal
      fireEvent.click(screen.getByTestId('photo-viewer-close'));
      expect(screen.queryByTestId('photo-viewer-counter')).not.toBeInTheDocument();

      // Also test mobile card thumbnail
      const mobileCardPhotoBtn = screen.getByTestId(`donor-card-photo-donation-${status.toLowerCase()}-0`);
      fireEvent.click(mobileCardPhotoBtn);
      expect(screen.getByRole('dialog', { name: /CLOTHES Donation Photo/i })).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('photo-viewer-close'));
    });
  });

  it('displays placeholder indicator when donation has no photos across statuses', async () => {
    const mockDonations: Donation[] = [
      createMockDonation('donation-no-photo-1', 'REJECTED', []),
      createMockDonation('donation-no-photo-2', 'DELIVERED', ['   ']),
    ];

    vi.mocked(donationApi.getMyDonations).mockResolvedValueOnce({
      content: mockDonations,
      totalElements: 2,
      totalPages: 1,
      size: 10,
      number: 0,
    } as any);

    render(
      <MemoryRouter>
        <MyDonationsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Donation in REJECTED status').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Donation in DELIVERED status').length).toBeGreaterThanOrEqual(1);
    });

    // Placeholders are rendered
    const placeholders = screen.getAllByTitle('No photo attached');
    expect(placeholders.length).toBeGreaterThanOrEqual(2);
  });
});

