import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommentThread } from './CommentThread';
import * as donationApi from '../api/donationApi';
import { Donation, DonationComment } from '../types';
import '@testing-library/jest-dom/vitest';

const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }),
}));

vi.mock('../api/donationApi', () => ({
  getDonationComments: vi.fn(),
  addDonationComment: vi.fn(),
}));

const mockDonation: Donation = {
  id: 'donation-12345678-abcd',
  category: 'FOOD',
  description: 'Packaged groceries',
  status: 'ACCEPTED',
  pickupAddress: '100 Main St',
  pickupDate: '2026-11-01',
  pickupTimeSlot: 'MORNING_10_TO_1',
  createdAt: '2026-10-25T10:00:00Z',
  ngo: {
    id: 'ngo-99',
    name: 'Food Relief Network of Greater Metropolitan Area',
    address: '456 Charity Blvd',
    verified: true,
  },
};

const mockComment1: DonationComment = {
  id: 'c-1',
  donationId: 'donation-12345678-abcd',
  author: {
    id: 'user-donor',
    fullName: 'Jane Donor',
    email: 'jane@donor.org',
    role: 'DONOR',
    createdAt: '2026-01-01T00:00:00Z',
  },
  message: 'Hi, the packages are sealed and ready at the front porch.',
  createdAt: '2026-10-26T10:15:00Z',
};

const mockComment2: DonationComment = {
  id: 'c-2',
  donationId: 'donation-12345678-abcd',
  author: {
    id: 'user-ngo',
    fullName: 'David NGO',
    email: 'david@ngo.org',
    role: 'NGO',
    createdAt: '2026-01-01T00:00:00Z',
  },
  message: 'Thank you! Our volunteer driver will arrive at 11:30 AM.',
  createdAt: '2026-10-26T10:18:00Z',
};

describe('CommentThread - Responsive Direct Chat Modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. renders header with NGO name, donation ID, category, and close button without overlapping', async () => {
    vi.mocked(donationApi.getDonationComments).mockResolvedValueOnce({
      content: [mockComment1],
      totalElements: 1,
      totalPages: 1,
      size: 100,
      number: 0,
    });

    const handleClose = vi.fn();
    render(
      <CommentThread
        donationId={mockDonation.id}
        donation={mockDonation}
        currentUserId="user-donor"
        onClose={handleClose}
      />
    );

    // Initial loading
    expect(screen.getByText('Loading messages...')).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText('Chat with Food Relief Network of Greater Metropolitan Area')
      ).toBeInTheDocument();
    });

    // Check donation ID short-code and category tag
    expect(screen.getByText('Donation #donation')).toBeInTheDocument();
    expect(screen.getByText('FOOD')).toBeInTheDocument();

    // Check message count badge
    await waitFor(() => {
      expect(screen.getByText('1 msg')).toBeInTheDocument();
    });

    // Close button has accessible aria-label and triggers onClose
    const closeBtn = screen.getByRole('button', { name: /Close chat/i });
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('2. renders empty conversation state with friendly prompt and compact spacing', async () => {
    vi.mocked(donationApi.getDonationComments).mockResolvedValueOnce({
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 100,
      number: 0,
    });

    render(
      <CommentThread
        donationId={mockDonation.id}
        donation={mockDonation}
        currentUserId="user-donor"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No messages yet')).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Send a note to coordinate pickup timing, instructions, or ask questions/i)
    ).toBeInTheDocument();
    expect(screen.getByText('0 msgs')).toBeInTheDocument();
  });

  it('3. renders populated conversation with author name, role badge, timestamp, and distinct bubble alignment', async () => {
    vi.mocked(donationApi.getDonationComments).mockResolvedValueOnce({
      content: [mockComment1, mockComment2],
      totalElements: 2,
      totalPages: 1,
      size: 100,
      number: 0,
    });

    render(
      <CommentThread
        donationId={mockDonation.id}
        donation={mockDonation}
        currentUserId="user-donor"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(mockComment1.message)).toBeInTheDocument();
      expect(screen.getByText(mockComment2.message)).toBeInTheDocument();
    });

    // Author names and roles
    expect(screen.getByText('Jane Donor')).toBeInTheDocument();
    expect(screen.getByText('DONOR')).toBeInTheDocument();
    expect(screen.getByText('David NGO')).toBeInTheDocument();
    expect(screen.getByText('NGO')).toBeInTheDocument();

    // Alignments: mockComment1 is authored by currentUserId -> items-end, mockComment2 -> items-start
    const card1 = screen.getByTestId('comment-c-1');
    const card2 = screen.getByTestId('comment-c-2');
    expect(card1).toHaveClass('items-end');
    expect(card2).toHaveClass('items-start');
  });

  it('4. message composer has readable placeholder, input is not clipped, and Send button is aligned', async () => {
    vi.mocked(donationApi.getDonationComments).mockResolvedValueOnce({
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 100,
      number: 0,
    });

    render(
      <CommentThread
        donationId={mockDonation.id}
        donation={mockDonation}
        currentUserId="user-donor"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No messages yet')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Type a message or pickup note...');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('flex-1');
    expect(input).toHaveClass('min-w-0');

    const sendBtn = screen.getByRole('button', { name: /Send message/i });
    expect(sendBtn).toBeInTheDocument();
    // Initially disabled because input is empty
    expect(sendBtn).toBeDisabled();
  });

  it('5. handles typing and sending message successfully, appending to chat and clearing input', async () => {
    vi.mocked(donationApi.getDonationComments).mockResolvedValueOnce({
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 100,
      number: 0,
    });

    const newComment: DonationComment = {
      id: 'c-new',
      donationId: mockDonation.id,
      author: {
        id: 'user-donor',
        fullName: 'Jane Donor',
        email: 'jane@donor.org',
        role: 'DONOR',
        createdAt: '2026-01-01T00:00:00Z',
      },
      message: 'Gate code is 4321',
      createdAt: '2026-10-26T10:30:00Z',
    };

    vi.mocked(donationApi.addDonationComment).mockResolvedValueOnce(newComment);

    const user = userEvent.setup();
    render(
      <CommentThread
        donationId={mockDonation.id}
        donation={mockDonation}
        currentUserId="user-donor"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No messages yet')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Type a message or pickup note...');
    await user.type(input, 'Gate code is 4321');

    const sendBtn = screen.getByRole('button', { name: /Send message/i });
    expect(sendBtn).not.toBeDisabled();

    await user.click(sendBtn);

    expect(donationApi.addDonationComment).toHaveBeenCalledWith(
      mockDonation.id,
      'Gate code is 4321'
    );

    await waitFor(() => {
      expect(screen.getByText('Gate code is 4321')).toBeInTheDocument();
    });

    // Input cleared
    expect(input).toHaveValue('');
    expect(mockShowSuccess).toHaveBeenCalledWith('Message sent successfully');
  });

  it('6. handles message submission failure gracefully with error toast', async () => {
    vi.mocked(donationApi.getDonationComments).mockResolvedValueOnce({
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 100,
      number: 0,
    });

    vi.mocked(donationApi.addDonationComment).mockRejectedValueOnce(new Error('Network failure'));

    const user = userEvent.setup();
    render(
      <CommentThread
        donationId={mockDonation.id}
        donation={mockDonation}
        currentUserId="user-donor"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No messages yet')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Type a message or pickup note...');
    await user.type(input, 'Will I need to sign?');

    const sendBtn = screen.getByRole('button', { name: /Send message/i });
    await user.click(sendBtn);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Failed to post message');
    });

    // Input retains unsent message so user doesn't lose text
    expect(input).toHaveValue('Will I need to sign?');
    expect(sendBtn).not.toBeDisabled();
  });

  it('7. clears comments and shows loading when switching donationId', async () => {
    vi.mocked(donationApi.getDonationComments).mockResolvedValueOnce({
      content: [mockComment1],
      totalElements: 1,
      totalPages: 1,
      size: 100,
      number: 0,
    });

    const { rerender } = render(
      <CommentThread
        donationId="donation-A"
        donation={{ ...mockDonation, id: 'donation-A' }}
        currentUserId="user-donor"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(mockComment1.message)).toBeInTheDocument();
    });

    // Switch to donation-B
    const donationBComment: DonationComment = {
      id: 'c-b',
      donationId: 'donation-B',
      author: {
        id: 'user-ngo',
        fullName: 'Relief Hub',
        email: 'hub@ngo.org',
        role: 'NGO',
        createdAt: '2026-01-01T00:00:00Z',
      },
      message: 'Different donation message for B',
      createdAt: '2026-10-26T11:00:00Z',
    };

    vi.mocked(donationApi.getDonationComments).mockResolvedValueOnce({
      content: [donationBComment],
      totalElements: 1,
      totalPages: 1,
      size: 100,
      number: 0,
    });

    rerender(
      <CommentThread
        donationId="donation-B"
        donation={{ ...mockDonation, id: 'donation-B' }}
        currentUserId="user-donor"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Different donation message for B')).toBeInTheDocument();
    });
    // Old comment is gone
    expect(screen.queryByText(mockComment1.message)).not.toBeInTheDocument();
  });

  it('8. closes modal when Escape key is pressed or backdrop is clicked', async () => {
    vi.mocked(donationApi.getDonationComments).mockResolvedValueOnce({
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 100,
      number: 0,
    });

    const handleClose = vi.fn();
    render(
      <CommentThread
        donationId={mockDonation.id}
        donation={mockDonation}
        currentUserId="user-donor"
        onClose={handleClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No messages yet')).toBeInTheDocument();
    });

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Click backdrop
    const backdrop = screen.getByTestId('chat-modal-backdrop');
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});

