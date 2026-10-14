import { describe, it, expect } from 'vitest';
import { getPhotoUrl, getPrimaryPhotoUrl, getBackendBaseUrl } from './photoHelper';

describe('photoHelper', () => {
  it('returns empty string for empty input', () => {
    expect(getPhotoUrl('')).toBe('');
  });

  it('returns full absolute URLs as-is', () => {
    const httpsUrl = 'https://example.com/photos/item.jpg';
    expect(getPhotoUrl(httpsUrl)).toBe(httpsUrl);

    const httpUrl = 'http://example.com/photos/item.jpg';
    expect(getPhotoUrl(httpUrl)).toBe(httpUrl);
  });

  it('returns data URIs as-is', () => {
    const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY44YAAAAASUVORK5CYII=';
    expect(getPhotoUrl(dataUri)).toBe(dataUri);
  });

  it('prefixes relative /api/ paths with the resolved backend base URL', () => {
    const relativePath = '/api/donations/photo/abc-123.jpg';
    const resolved = getPhotoUrl(relativePath);
    const backendBase = getBackendBaseUrl();
    expect(resolved).toBe(`${backendBase}${relativePath}`);
  });

  it('handles getPrimaryPhotoUrl with empty or null list', () => {
    expect(getPrimaryPhotoUrl(null)).toBe('/placeholder-donation.svg');
    expect(getPrimaryPhotoUrl([])).toBe('/placeholder-donation.svg');
    expect(getPrimaryPhotoUrl(undefined, '/custom-fallback.png')).toBe('/custom-fallback.png');
  });

  it('returns first photo URL from array in getPrimaryPhotoUrl', () => {
    const urls = ['https://example.com/first.jpg', 'https://example.com/second.jpg'];
    expect(getPrimaryPhotoUrl(urls)).toBe('https://example.com/first.jpg');
  });
});
