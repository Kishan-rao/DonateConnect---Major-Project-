/**
 * photoHelper.ts
 * Utility functions for resolving donation photo URLs across all historical and current formats.
 *
 * Donation photos are served via backend endpoint:
 *   GET /api/donations/photo/{filename}
 *
 * A donation's photoUrls array may contain strings in several forms:
 *   1. Full absolute URL: "https://..." or "http://..." → use as-is (cloud/CDN)
 *   2. Data URI: "data:image/..." → use as-is (legacy inline base64)
 *   3. Authoritative API path: "/api/donations/photo/uuid.jpg" → prefix with backend base URL
 *   4. Historical path without /api prefix: "/donations/photo/uuid.jpg" or "donations/photo/uuid.jpg"
 *   5. Historical bare filename: "uuid.jpg" or "photo1.jpg" → resolve to /api/donations/photo/{filename}
 *   6. Legacy path with /photo/: "/photo/uuid.jpg"
 */

import { getBaseUrl } from '../api/client';

export const getBackendBaseUrl = (): string => {
  const base = getBaseUrl();
  return base === '/api' ? '' : base.replace(/\/api$/, '');
};

/**
 * Resolve a photo URL for display, ensuring both current and historical records resolve correctly.
 */
export const getPhotoUrl = (url: string | null | undefined): string => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // 1. Absolute URL (http:// or https://) or Data URI
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  const backendBase = getBackendBaseUrl();

  // 2. Relative path starting with /api/
  if (trimmed.startsWith('/api/')) {
    return `${backendBase}${trimmed}`;
  }

  // 3. Historical path starting with /donations/photo/
  if (trimmed.startsWith('/donations/photo/')) {
    return `${backendBase}/api${trimmed}`;
  }

  // 4. Historical path starting with donations/photo/
  if (trimmed.startsWith('donations/photo/')) {
    return `${backendBase}/api/${trimmed}`;
  }

  // 5. Legacy path starting with /photo/
  if (trimmed.startsWith('/photo/')) {
    return `${backendBase}/api/donations${trimmed}`;
  }

  // 6. Bare filename without slashes (e.g. "photo1.jpg", "uuid.png")
  if (!trimmed.includes('/')) {
    return `${backendBase}/api/donations/photo/${trimmed}`;
  }

  // 7. General relative path starting with /
  if (trimmed.startsWith('/')) {
    return `${backendBase}${trimmed}`;
  }

  // 8. Fallback
  return `${backendBase}/${trimmed}`;
};

/**
 * Check if a donation contains at least one valid, non-empty photo URL.
 */
export const hasValidPhotos = (photoUrls: string[] | null | undefined): boolean => {
  if (!photoUrls || !Array.isArray(photoUrls) || photoUrls.length === 0) return false;
  return photoUrls.some((p) => p && typeof p === 'string' && p.trim().length > 0);
};

/**
 * Get the first valid photo from a donation's photoUrls array, with a fallback placeholder.
 */
export const getPrimaryPhotoUrl = (
  photoUrls: string[] | null | undefined,
  fallback = '/placeholder-donation.svg'
): string => {
  if (!hasValidPhotos(photoUrls)) return fallback;
  const validPhotos = photoUrls!.filter((p) => p && typeof p === 'string' && p.trim().length > 0);
  const firstUrl = getPhotoUrl(validPhotos[0]);
  return firstUrl || fallback;
};
