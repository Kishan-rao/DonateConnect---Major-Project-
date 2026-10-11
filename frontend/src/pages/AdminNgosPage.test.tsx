import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminNgosPage } from './AdminNgosPage';
import * as ngoApi from '../api/ngoApi';
import '@testing-library/jest-dom/vitest';

vi.mock('../api/ngoApi', () => ({
  getAllNgosAdmin: vi.fn(),
  verifyNgoByAdmin: vi.fn(),
  createNgoByAdmin: vi.fn(),
  deleteNgoByAdmin: vi.fn(),
}));

describe('AdminNgosPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockNgos = [
    {
      id: 'ngo-uuid-1',
      name: 'Hope Foundation',
      description: 'Helping children and families',
      address: '100 Hope St',
      phone: '555-1111',
      verified: true,
      user: {
        id: 'user-1',
        email: 'contact@hope.org',
        fullName: 'Hope Admin',
        role: 'NGO',
        createdAt: '2026-01-01',
      },
      createdAt: '2026-01-01',
    },
    {
      id: 'ngo-uuid-2',
      name: 'Community Food Bank',
      description: 'Food distribution service',
      address: '200 Market St',
      phone: '555-2222',
      verified: false,
      user: {
        id: 'user-2',
        email: 'info@foodbank.org',
        fullName: 'Food Admin',
        role: 'NGO',
        createdAt: '2026-01-02',
      },
      createdAt: '2026-01-02',
    },
  ];

  it('renders loading state initially', () => {
    (ngoApi.getAllNgosAdmin as any).mockReturnValue(new Promise(() => {})); // pending promise

    render(<AdminNgosPage />);

    expect(screen.getByText('Loading all NGO profiles...')).toBeInTheDocument();
  });

  it('renders NGO list when API returns normalized array', async () => {
    (ngoApi.getAllNgosAdmin as any).mockResolvedValueOnce(mockNgos);

    render(<AdminNgosPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading all NGO profiles...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Hope Foundation')).toBeInTheDocument();
    expect(screen.getByText('contact@hope.org')).toBeInTheDocument();
    expect(screen.getByText('Community Food Bank')).toBeInTheDocument();
    expect(screen.getByText('info@foodbank.org')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Unverified')).toBeInTheDocument();
  });

  it('handles backend Spring Data Page object defensively without map error', async () => {
    // Even if an API mock returns raw PageResponse object instead of array
    (ngoApi.getAllNgosAdmin as any).mockResolvedValueOnce({
      content: mockNgos,
      totalElements: 2,
    });

    render(<AdminNgosPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading all NGO profiles...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Hope Foundation')).toBeInTheDocument();
    expect(screen.getByText('Community Food Bank')).toBeInTheDocument();
  });

  it('renders empty state when no NGOs are returned', async () => {
    (ngoApi.getAllNgosAdmin as any).mockResolvedValueOnce([]);

    render(<AdminNgosPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading all NGO profiles...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('No NGO profiles created yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add First NGO/i })).toBeInTheDocument();
  });

  it('renders error state when API request fails and allows Retry', async () => {
    (ngoApi.getAllNgosAdmin as any).mockRejectedValueOnce(new Error('Network error: failed to fetch'));

    render(<AdminNgosPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading all NGO profiles...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Network error: failed to fetch')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /Retry Loading/i });
    expect(retryBtn).toBeInTheDocument();

    // Now mock success on retry
    (ngoApi.getAllNgosAdmin as any).mockResolvedValueOnce(mockNgos);

    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.queryByText('Network error: failed to fetch')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Hope Foundation')).toBeInTheDocument();
    expect(screen.getByText('Community Food Bank')).toBeInTheDocument();
  });

  it('handles verification toggle successfully', async () => {
    (ngoApi.getAllNgosAdmin as any).mockResolvedValueOnce(mockNgos);
    (ngoApi.verifyNgoByAdmin as any).mockResolvedValueOnce({
      ...mockNgos[1],
      verified: true,
    });

    render(<AdminNgosPage />);

    await waitFor(() => {
      expect(screen.getByText('Community Food Bank')).toBeInTheDocument();
    });

    // The second NGO is Unverified, button text says "Verify"
    const verifyButtons = screen.getAllByRole('button', { name: /Verify/i });
    const verifyButton = verifyButtons.find((btn) => btn.textContent?.trim() === 'Verify');
    expect(verifyButton).toBeDefined();

    fireEvent.click(verifyButton!);

    await waitFor(() => {
      expect(ngoApi.verifyNgoByAdmin).toHaveBeenCalledWith('ngo-uuid-2', true);
    });
  });

  it('opens and submits Add NGO Partner modal', async () => {
    const user = userEvent.setup();
    (ngoApi.getAllNgosAdmin as any).mockResolvedValueOnce([]);

    const newNgo = {
      id: 'new-ngo-uuid',
      name: 'Green Earth Foundation',
      address: '789 Green Rd',
      phone: '555-9999',
      verified: false,
      user: {
        id: 'new-u',
        email: 'green@earth.org',
        fullName: 'Green Admin',
        role: 'NGO',
        createdAt: '2026-01-03',
      },
      createdAt: '2026-01-03',
    };

    (ngoApi.createNgoByAdmin as any).mockResolvedValueOnce(newNgo);

    render(<AdminNgosPage />);

    await waitFor(() => {
      expect(screen.getByText('No NGO profiles created yet')).toBeInTheDocument();
    });

    // Click "Add NGO Partner" in header
    const addBtn = screen.getByRole('button', { name: /Add NGO Partner/i });
    await user.click(addBtn);

    expect(screen.getByText('Register New NGO Partner')).toBeInTheDocument();

    // Fill form
    await user.type(screen.getByPlaceholderText(/e\.g\. Hope Foundation/i), 'Green Earth Foundation');
    await user.type(screen.getByPlaceholderText(/contact@ngo\.org/i), 'green@earth.org');
    await user.type(screen.getByPlaceholderText(/Minimum 6 characters/i), 'securepassword123');
    await user.type(screen.getByPlaceholderText(/123 Community St, City/i), '789 Green Rd');
    await user.type(screen.getByPlaceholderText(/\+1 \(555\) 000-0000/i), '555-9999');

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Create NGO User/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(ngoApi.createNgoByAdmin).toHaveBeenCalledWith({
        name: 'Green Earth Foundation',
        email: 'green@earth.org',
        password: 'securepassword123',
        address: '789 Green Rd',
        phone: '555-9999',
      });
    });

    // The newly created NGO should appear in the table
    await waitFor(() => {
      expect(screen.getByText('Green Earth Foundation')).toBeInTheDocument();
    });
  });

  it('handles NGO delete confirmation', async () => {
    (ngoApi.getAllNgosAdmin as any).mockResolvedValueOnce(mockNgos);
    (ngoApi.deleteNgoByAdmin as any).mockResolvedValueOnce(undefined);

    render(<AdminNgosPage />);

    await waitFor(() => {
      expect(screen.getByText('Hope Foundation')).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByTitle('Remove NGO');
    fireEvent.click(removeButtons[0]);

    // Modal appears
    expect(screen.getByText('Confirm Removal')).toBeInTheDocument();
    expect(screen.getByText(/permanently delete/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Confirm Remove/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(ngoApi.deleteNgoByAdmin).toHaveBeenCalledWith('ngo-uuid-1');
    });

    await waitFor(() => {
      expect(screen.queryByText('Hope Foundation')).not.toBeInTheDocument();
    });
  });
});
