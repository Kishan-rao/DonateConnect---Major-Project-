import { describe, it, expect } from 'vitest';
import { resolveApiBaseUrl, getBaseUrl, getApiConfigError } from './client';

describe('API client base URL resolution', () => {
  describe('resolveApiBaseUrl', () => {
    describe('Browser environment (isNative: false)', () => {
      it('falls back to /api when envUrl is undefined', () => {
        const url = resolveApiBaseUrl({ envUrl: undefined, isNative: false, isProd: false });
        expect(url).toBe('/api');
      });

      it('falls back to /api when envUrl is empty or whitespace', () => {
        const url = resolveApiBaseUrl({ envUrl: '   ', isNative: false, isProd: false });
        expect(url).toBe('/api');
      });

      it('uses configured envUrl and appends /api if missing', () => {
        const url = resolveApiBaseUrl({ envUrl: 'http://localhost:8080', isNative: false, isProd: false });
        expect(url).toBe('http://localhost:8080/api');
      });

      it('preserves /api if already present in envUrl', () => {
        const url = resolveApiBaseUrl({ envUrl: 'http://localhost:8080/api', isNative: false, isProd: false });
        expect(url).toBe('http://localhost:8080/api');
      });

      it('trims trailing slashes without creating duplicate /api segments', () => {
        const url = resolveApiBaseUrl({ envUrl: 'http://localhost:8080/api///', isNative: false, isProd: false });
        expect(url).toBe('http://localhost:8080/api');
      });
    });

    describe('Native Android Dev environment (isNative: true, isProd: false)', () => {
      it('falls back to local LAN IP when envUrl is undefined', () => {
        const url = resolveApiBaseUrl({ envUrl: undefined, isNative: true, isProd: false });
        expect(url).toBe('http://192.168.29.227:8080/api');
      });

      it('falls back to local LAN IP when envUrl is empty', () => {
        const url = resolveApiBaseUrl({ envUrl: '', isNative: true, isProd: false });
        expect(url).toBe('http://192.168.29.227:8080/api');
      });

      it('uses custom LAN IP if configured', () => {
        const url = resolveApiBaseUrl({ envUrl: 'http://192.168.1.150:8080', isNative: true, isProd: false });
        expect(url).toBe('http://192.168.1.150:8080/api');
      });
    });

    describe('Native Android Production environment (isNative: true, isProd: true)', () => {
      it('accepts and normalizes valid HTTPS Render URL', () => {
        const url = resolveApiBaseUrl({
          envUrl: 'https://donateconnect-backend.onrender.com',
          isNative: true,
          isProd: true,
        });
        expect(url).toBe('https://donateconnect-backend.onrender.com/api');
      });

      it('accepts HTTPS Render URL that already includes /api', () => {
        const url = resolveApiBaseUrl({
          envUrl: 'https://donateconnect-backend.onrender.com/api',
          isNative: true,
          isProd: true,
        });
        expect(url).toBe('https://donateconnect-backend.onrender.com/api');
      });

      it('strips trailing slashes from HTTPS Render URL', () => {
        const url = resolveApiBaseUrl({
          envUrl: 'https://donateconnect-backend.onrender.com/api/',
          isNative: true,
          isProd: true,
        });
        expect(url).toBe('https://donateconnect-backend.onrender.com/api');
      });

      it('throws actionable error when VITE_API_BASE_URL is missing', () => {
        expect(() => {
          resolveApiBaseUrl({
            envUrl: undefined,
            isNative: true,
            isProd: true,
          });
        }).toThrow(/Missing VITE_API_BASE_URL for production Android build/);
      });

      it('throws actionable error when VITE_API_BASE_URL is empty', () => {
        expect(() => {
          resolveApiBaseUrl({
            envUrl: '   ',
            isNative: true,
            isProd: true,
          });
        }).toThrow(/Missing VITE_API_BASE_URL for production Android build/);
      });

      it('throws actionable error when URL uses insecure http:// protocol', () => {
        expect(() => {
          resolveApiBaseUrl({
            envUrl: 'http://insecure-backend.onrender.com/api',
            isNative: true,
            isProd: true,
          });
        }).toThrow(/Production Android builds require an explicit HTTPS backend URL/);
      });
    });
  });

  describe('Module exports', () => {
    it('getBaseUrl returns a non-empty string', () => {
      const base = getBaseUrl();
      expect(typeof base).toBe('string');
      expect(base.length).toBeGreaterThan(0);
    });

    it('getApiConfigError returns null or Error instance', () => {
      const err = getApiConfigError();
      expect(err === null || err instanceof Error).toBe(true);
    });
  });
});
