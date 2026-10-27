import { describe, it, expect } from 'vitest';
import { getPhotoUrl, getPrimaryPhotoUrl, getBackendBaseUrl, hasValidPhotos } from './photoHelper';

describe('photoHelper', () => {
  it('returns empty string for empty input', () => {
    expect(getPhotoUrl('')).toBe('');
    expect(getPhotoUrl(null)).toBe('');
    expect(getPhotoUrl(undefined)).toBe('');
    expect(getPhotoUrl('   ')).toBe('');
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

  it('handles historical bare filenames by routing to /api/donations/photo/{filename}', () => {
    const filename = 'historical-donation-uuid.jpg';
    const resolved = getPhotoUrl(filename);
    const backendBase = getBackendBaseUrl();
    expect(resolved).toBe(`${backendBase}/api/donations/photo/${filename}`);
  });

  it('handles historical paths without /api prefix', () => {
    const backendBase = getBackendBaseUrl();
    expect(getPhotoUrl('/donations/photo/test.jpg')).toBe(`${backendBase}/api/donations/photo/test.jpg`);
    expect(getPhotoUrl('donations/photo/test.jpg')).toBe(`${backendBase}/api/donations/photo/test.jpg`);
    expect(getPhotoUrl('/photo/test.jpg')).toBe(`${backendBase}/api/donations/photo/test.jpg`);
  });

  it('checks hasValidPhotos correctly', () => {
    expect(hasValidPhotos(null)).toBe(false);
    expect(hasValidPhotos([])).toBe(false);
    expect(hasValidPhotos(['', '   '])).toBe(false);
    expect(hasValidPhotos(['photo.jpg'])).toBe(true);
    expect(hasValidPhotos(['https://example.com/item.png'])).toBe(true);
  });

  it('handles getPrimaryPhotoUrl with empty or null list', () => {
    expect(getPrimaryPhotoUrl(null)).toBe('/placeholder-donation.svg');
    expect(getPrimaryPhotoUrl([])).toBe('/placeholder-donation.svg');
    expect(getPrimaryPhotoUrl(undefined, '/custom-fallback.png')).toBe('/custom-fallback.png');
    expect(getPrimaryPhotoUrl(['', '   '])).toBe('/placeholder-donation.svg');
  });

  it('returns first photo URL from array in getPrimaryPhotoUrl', () => {
    const urls = ['https://example.com/first.jpg', 'https://example.com/second.jpg'];
    expect(getPrimaryPhotoUrl(urls)).toBe('https://example.com/first.jpg');

    const historicalUrls = ['first-photo.jpg', 'second-photo.jpg'];
    const backendBase = getBackendBaseUrl();
    expect(getPrimaryPhotoUrl(historicalUrls)).toBe(`${backendBase}/api/donations/photo/first-photo.jpg`);
  });
});
