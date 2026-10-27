import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NgoDashboardPage } from './NgoDashboardPage';
import * as donationApi from '../api/donationApi';
import { Donation, DonationStatus } from '../types';

vi.mock('../api/donationApi', () => ({
  getNgoAssignedDonations: vi.fn(),
  updateDonationStatusByNgo: vi.fn(),
  getDeliveryOtp: vi.fn(),
  regenerateDeliveryOtp: vi.fn(),
}));

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

const allStatuses: DonationStatus[] = ['REQUESTED', 'ACCEPTED', 'REJECTED', 'PICKED_UP', 'DELIVERED'];

const createMockDonation = (id: string, status: DonationStatus, photoUrls: string[]): Donation => ({
  id,
  donor: { id: 'donor-1', fullName: 'Alice Donor', email: 'alice@example.com' } as any,
  ngo: { id: 'ngo-1', name: 'Community Care', address: '456 Charity Lane' } as any,
  category: 'FOOD',
  description: `NGO donation in ${status} status`,
  photoUrls,
  status,
  pickupDate: '2026-11-02',
  createdAt: '2026-10-26T12:00:00Z',
});

describe('NgoDashboardPage - Status-Independent Photo Viewing for NGOs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  allStatuses.forEach((status) => {
    it(`renders clickable photo thumbnails and opens full-size viewer for NGO on ${status} donation`, async () => {
      const mockDonations: Donation[] = [
        createMockDonation(
          `ngo-donation-${status.toLowerCase()}`,
          status,
          ['/api/donations/photo/meal.jpg', 'bare-filename.jpg']
        ),
      ];

      vi.mocked(donationApi.getNgoAssignedDonations).mockResolvedValueOnce({
        content: mockDonations,
        totalElements: 1,
      } as any);

      render(
        <MemoryRouter>
          <NgoDashboardPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(`NGO donation in ${status} status`)).toBeInTheDocument();
      });

      // Find photo thumbnail button
      const photoBtn = screen.getByTestId(`ngo-card-photo-ngo-donation-${status.toLowerCase()}-0`);
      expect(photoBtn).toBeInTheDocument();

      // Click thumbnail to open photo viewer
      fireEvent.click(photoBtn);

      // Verify PhotoViewerModal opens
      expect(screen.getByRole('dialog', { name: /FOOD Donation Photo/i })).toBeInTheDocument();
      expect(screen.getByTestId('photo-viewer-counter')).toHaveTextContent('1 / 2');

      // Navigate to next photo (testing historical bare-filename)
      fireEvent.click(screen.getByTestId('photo-viewer-next'));
      expect(screen.getByTestId('photo-viewer-counter')).toHaveTextContent('2 / 2');

      // Close modal
      fireEvent.click(screen.getByTestId('photo-viewer-close'));
      expect(screen.queryByTestId('photo-viewer-counter')).not.toBeInTheDocument();
    });
  });

  it('renders placeholder when donation has no photo attachments', async () => {
    const mockDonations: Donation[] = [
      createMockDonation('ngo-no-photo', 'REJECTED', []),
    ];

    vi.mocked(donationApi.getNgoAssignedDonations).mockResolvedValueOnce({
      content: mockDonations,
      totalElements: 1,
    } as any);

    render(
      <MemoryRouter>
        <NgoDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No photos attached for this request')).toBeInTheDocument();
    });
  });
});

