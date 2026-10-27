import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { DonationDetailModal } from './DonationDetailModal';
import * as donationApi from '../api/donationApi';
import { Donation } from '../types';

vi.mock('../api/donationApi', () => ({
  getDonationById: vi.fn(),
}));

const mockDonation: Donation = {
  id: 'donation-123',
  donorId: 'donor-1',
  donor: { id: 'donor-1', fullName: 'Jane Donor', email: 'jane@example.com' } as any,
  ngoId: 'ngo-1',
  ngo: { id: 'ngo-1', name: 'Helping Hands', address: '123 Care St' } as any,
  category: 'CLOTHES',
  description: 'Warm winter clothes and jackets',
  photoUrls: [
    'https://example.com/clothes1.jpg',
    'https://example.com/clothes2.jpg',
  ],
  status: 'ACCEPTED',
  pickupDate: '2026-10-30',
  pickupAddress: '456 Donor Ave',
  createdAt: '2026-10-27T10:00:00Z',
  updatedAt: '2026-10-27T10:00:00Z',
};

describe('DonationDetailModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially and then shows donation details and photos', async () => {
    vi.mocked(donationApi.getDonationById).mockResolvedValueOnce(mockDonation);

    render(<DonationDetailModal donationId="donation-123" onClose={mockOnClose} />);

    expect(screen.getByText('Loading donation details from backend...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Warm winter clothes and jackets')).toBeInTheDocument();
    });

    expect(screen.getByText('Helping Hands')).toBeInTheDocument();
    expect(screen.getByText('456 Donor Ave')).toBeInTheDocument();

    // Verify photo thumbnails rendered
    const photoThumbnails = screen.getAllByRole('button', { name: /View photo \d+ full size/ });
    expect(photoThumbnails).toHaveLength(2);
  });

  it('opens PhotoViewerModal when a photo thumbnail is clicked, and closes it on dismiss', async () => {
    vi.mocked(donationApi.getDonationById).mockResolvedValueOnce(mockDonation);

    render(<DonationDetailModal donationId="donation-123" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Warm winter clothes and jackets')).toBeInTheDocument();
    });

    const photoThumbnails = screen.getAllByRole('button', { name: /View photo \d+ full size/ });
    
    // Click on second photo (index 1)
    fireEvent.click(photoThumbnails[1]);

    // Photo viewer dialog should be open
    expect(screen.getByRole('dialog', { name: /CLOTHES Donation Photo/i })).toBeInTheDocument();
    expect(screen.getByTestId('photo-viewer-counter')).toHaveTextContent('2 / 2');

    // Close photo viewer
    fireEvent.click(screen.getByTestId('photo-viewer-close'));

    // Viewer should be closed, detail modal still open
    expect(screen.queryByTestId('photo-viewer-counter')).not.toBeInTheDocument();
    expect(screen.getByText('Warm winter clothes and jackets')).toBeInTheDocument();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('handles empty photoUrls gracefully', async () => {
    const noPhotosDonation = { ...mockDonation, photoUrls: [] };
    vi.mocked(donationApi.getDonationById).mockResolvedValueOnce(noPhotosDonation);

    render(<DonationDetailModal donationId="donation-123" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('No photo attachments provided for this donation request.')).toBeInTheDocument();
    });
  });
});

