import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAllNgosAdmin } from './ngoApi';
import { apiClient } from './client';

vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ngoApi - getAllNgosAdmin normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockNgo1 = {
    id: 'ngo-1',
    name: 'Food For All',
    address: '123 Main St',
    phone: '555-0101',
    verified: true,
    user: { id: 'u1', email: 'food@all.org', fullName: 'Food Admin', role: 'NGO', createdAt: '2026-01-01' },
    createdAt: '2026-01-01',
  };

  const mockNgo2 = {
    id: 'ngo-2',
    name: 'Shelter Now',
    address: '456 Side St',
    phone: '555-0102',
    verified: false,
    user: { id: 'u2', email: 'shelter@now.org', fullName: 'Shelter Admin', role: 'NGO', createdAt: '2026-01-02' },
    createdAt: '2026-01-02',
  };

  it('normalizes Spring Data Page object inside ApiResponse wrapper (actual backend contract)', async () => {
    // Backend returns ApiResponse<Page<NGOProfileDto>>
    (apiClient.get as any).mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Fetched all NGO profiles for admin',
        data: {
          content: [mockNgo1, mockNgo2],
          totalElements: 2,
          totalPages: 1,
          size: 10,
          number: 0,
        },
        timestamp: '2026-10-11T20:00:00',
      },
    });

    const result = await getAllNgosAdmin();

    expect(apiClient.get).toHaveBeenCalledWith('/admin/ngo', {
      params: { page: 0, size: 100 },
    });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Food For All');
    expect(result[1].name).toBe('Shelter Now');
  });

  it('normalizes direct array inside ApiResponse wrapper', async () => {
    (apiClient.get as any).mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Fetched all NGOs',
        data: [mockNgo1],
      },
    });

    const result = await getAllNgosAdmin();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('ngo-1');
  });

  it('normalizes payload with ngos array property', async () => {
    (apiClient.get as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          ngos: [mockNgo2],
        },
      },
    });

    const result = await getAllNgosAdmin();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Shelter Now');
  });

  it('handles empty Page content gracefully as an empty array', async () => {
    (apiClient.get as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          content: [],
          totalElements: 0,
          totalPages: 0,
        },
      },
    });

    const result = await getAllNgosAdmin();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([]);
  });

  it('handles unexpected data shape safely by returning empty array', async () => {
    (apiClient.get as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: null,
      },
    });

    const result = await getAllNgosAdmin();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([]);
  });

  it('propagates API errors without masking them as empty arrays', async () => {
    (apiClient.get as any).mockRejectedValueOnce(new Error('Forbidden: Admin access required'));

    await expect(getAllNgosAdmin()).rejects.toThrow('Forbidden: Admin access required');
  });
});
