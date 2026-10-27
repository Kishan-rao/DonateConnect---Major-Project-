import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { DonationCard } from './DonationCard';
import { Donation, DonationStatus } from '../types';

const allStatuses: DonationStatus[] = ['REQUESTED', 'ACCEPTED', 'REJECTED', 'PICKED_UP', 'DELIVERED'];

const createMockDonation = (status: DonationStatus, photoUrls: string[]): Donation => ({
  id: `donation-${status.toLowerCase()}`,
  donorId: 'donor-1',
  donor: { id: 'donor-1', fullName: 'Alice Donor' } as any,
  ngoId: 'ngo-1',
  ngo: { id: 'ngo-1', name: 'Food Rescue' } as any,
  category: 'FOOD',
  description: `Food donation in ${status} status`,
  photoUrls,
  status,
  createdAt: '2026-10-27T10:00:00Z',
  updatedAt: '2026-10-27T10:00:00Z',
});

describe('DonationCard - Status-Independent Photo Viewing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  allStatuses.forEach((status) => {
    it(`renders thumbnails and opens PhotoViewerModal for ${status} donation (including historical filenames)`, () => {
      const donation = createMockDonation(status, [
        'legacy-photo.jpg',
        'https://example.com/bread.jpg',
      ]);
      render(<DonationCard donation={donation} />);

      expect(screen.getByText('FOOD Donation Request')).toBeInTheDocument();
      expect(screen.getByText(`Food donation in ${status} status`)).toBeInTheDocument();

      const thumbnails = screen.getAllByRole('button', { name: /View photo \d+ full size/ });
      expect(thumbnails).toHaveLength(2);

      // Click first thumbnail (historical bare filename)
      fireEvent.click(thumbnails[0]);

      // Viewer is open
      expect(screen.getByRole('dialog', { name: /FOOD Donation Photo/i })).toBeInTheDocument();
      expect(screen.getByTestId('photo-viewer-counter')).toHaveTextContent('1 / 2');

      // Close viewer
      fireEvent.click(screen.getByTestId('photo-viewer-close'));
      expect(screen.queryByTestId('photo-viewer-counter')).not.toBeInTheDocument();
    });
  });

  it('renders placeholder when donation has no attached photos', () => {
    const donation = createMockDonation('REJECTED', []);
    render(<DonationCard donation={donation} />);

    expect(screen.getByText('No photos attached')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /View photo \d+ full size/ })).not.toBeInTheDocument();
  });
});
