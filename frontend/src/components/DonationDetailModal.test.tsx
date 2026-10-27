import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { DonationDetailModal } from './DonationDetailModal';
import * as donationApi from '../api/donationApi';
import { Donation, DonationStatus } from '../types';

vi.mock('../api/donationApi', () => ({
  getDonationById: vi.fn(),
}));

const allStatuses: DonationStatus[] = ['REQUESTED', 'ACCEPTED', 'REJECTED', 'PICKED_UP', 'DELIVERED'];

const createMockDonation = (status: DonationStatus, photoUrls: string[]): Donation => ({
  id: `donation-${status.toLowerCase()}`,
  donorId: 'donor-1',
  donor: { id: 'donor-1', fullName: 'Jane Donor', email: 'jane@example.com' } as any,
  ngoId: 'ngo-1',
  ngo: { id: 'ngo-1', name: 'Helping Hands', address: '123 Care St' } as any,
  category: 'CLOTHES',
  description: `Warm winter clothes in ${status} status`,
  photoUrls,
  status,
  pickupDate: '2026-10-30',
  pickupAddress: '456 Donor Ave',
  createdAt: '2026-10-27T10:00:00Z',
  updatedAt: '2026-10-27T10:00:00Z',
});

describe('DonationDetailModal - Status-Independent Photo Inspection', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  allStatuses.forEach((status) => {
    it(`renders attached photos and opens PhotoViewerModal for ${status} donation (including historical bare filenames)`, async () => {
      const donation = createMockDonation(status, [
        'historical-winter-coat.jpg',
        'https://example.com/jacket.jpg',
      ]);
      vi.mocked(donationApi.getDonationById).mockResolvedValueOnce(donation);

      render(<DonationDetailModal donationId={donation.id} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText(`Warm winter clothes in ${status} status`)).toBeInTheDocument();
      });

      expect(screen.getByText('Helping Hands')).toBeInTheDocument();
      expect(screen.getByText('456 Donor Ave')).toBeInTheDocument();

      // Verify photo thumbnails rendered
      const photoThumbnails = screen.getAllByRole('button', { name: /View photo \d+ full size/ });
      expect(photoThumbnails).toHaveLength(2);

      // Click second thumbnail
      fireEvent.click(photoThumbnails[1]);

      // Photo viewer dialog should be open regardless of status
      expect(screen.getByRole('dialog', { name: /CLOTHES Donation Photo/i })).toBeInTheDocument();
      expect(screen.getByTestId('photo-viewer-counter')).toHaveTextContent('2 / 2');

      // Close photo viewer
      fireEvent.click(screen.getByTestId('photo-viewer-close'));

      // Viewer should be closed, detail modal still open
      expect(screen.queryByTestId('photo-viewer-counter')).not.toBeInTheDocument();
      expect(screen.getByText(`Warm winter clothes in ${status} status`)).toBeInTheDocument();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  it('handles empty photoUrls gracefully with placeholder text', async () => {
    const noPhotosDonation = createMockDonation('REJECTED', []);
    vi.mocked(donationApi.getDonationById).mockResolvedValueOnce(noPhotosDonation);

    render(<DonationDetailModal donationId="donation-rejected" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('No photo attachments provided for this donation request.')).toBeInTheDocument();
    });
  });
});
