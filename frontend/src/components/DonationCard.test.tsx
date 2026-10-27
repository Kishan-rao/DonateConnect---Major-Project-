import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { DonationCard } from './DonationCard';
import { Donation } from '../types';

const mockDonation: Donation = {
  id: 'donation-card-1',
  donorId: 'donor-1',
  donor: { id: 'donor-1', fullName: 'Alice Donor' } as any,
  ngoId: 'ngo-1',
  ngo: { id: 'ngo-1', name: 'Food Rescue' } as any,
  category: 'FOOD',
  description: 'Fresh apples and bread',
  photoUrls: [
    'https://example.com/apples.jpg',
    'https://example.com/bread.jpg',
  ],
  status: 'REQUESTED',
  createdAt: '2026-10-27T10:00:00Z',
  updatedAt: '2026-10-27T10:00:00Z',
};

describe('DonationCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders card with category, description, and photo thumbnails', () => {
    render(<DonationCard donation={mockDonation} />);

    expect(screen.getByText('FOOD Donation Request')).toBeInTheDocument();
    expect(screen.getByText('Fresh apples and bread')).toBeInTheDocument();

    const thumbnails = screen.getAllByRole('button', { name: /View photo \d+ full size/ });
    expect(thumbnails).toHaveLength(2);
  });

  it('opens PhotoViewerModal at clicked photo index and closes on dismiss', () => {
    render(<DonationCard donation={mockDonation} />);

    const thumbnails = screen.getAllByRole('button', { name: /View photo \d+ full size/ });

    // Click first photo
    fireEvent.click(thumbnails[0]);

    // Viewer is open
    expect(screen.getByRole('dialog', { name: /FOOD Donation Photo/i })).toBeInTheDocument();
    expect(screen.getByTestId('photo-viewer-counter')).toHaveTextContent('1 / 2');

    // Close viewer
    fireEvent.click(screen.getByTestId('photo-viewer-close'));
    expect(screen.queryByTestId('photo-viewer-counter')).not.toBeInTheDocument();
  });
});

