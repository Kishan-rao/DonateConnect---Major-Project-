import { describe, it, expect } from 'vitest';
import { resolveApiBaseUrl, getBaseUrl, getApiConfigError, apiClient } from './client';

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

  describe('apiClient response interceptor error handling', () => {
    const getResponseErrorHandler = () => {
      // Find the response error rejection handler on apiClient
      const handlers = (apiClient.interceptors.response as any).handlers;
      const responseHandler = handlers[handlers.length - 1];
      return responseHandler.rejected;
    };

    it('transforms ECONNABORTED timeout errors into clear, actionable messages', async () => {
      const errorHandler = getResponseErrorHandler();
      const mockError = {
        code: 'ECONNABORTED',
        message: 'timeout of 60000ms exceeded',
        config: { url: '/auth/login' },
      };

      await expect(errorHandler(mockError)).rejects.toThrow(
        'Connection timed out. The server may be starting up—please wait a moment and try again.'
      );
    });

    it('transforms ERR_NETWORK and Network Error into clear connection messages', async () => {
      const errorHandler = getResponseErrorHandler();
      const mockError = {
        code: 'ERR_NETWORK',
        message: 'Network Error',
        config: { url: '/auth/login' },
      };

      await expect(errorHandler(mockError)).rejects.toThrow(
        'Unable to connect to the server. Please check your internet connection.'
      );
    });

    it('preserves server-provided error messages on 401 or 400 responses', async () => {
      const errorHandler = getResponseErrorHandler();
      const mockError = {
        response: {
          status: 401,
          data: {
            success: false,
            message: 'Invalid email or password',
          },
        },
        config: { url: '/auth/login' },
      };

      await expect(errorHandler(mockError)).rejects.toThrow('Invalid email or password');
    });

    it('rejects with descriptive error when server returns HTML instead of JSON', async () => {
      const handlers = (apiClient.interceptors.response as any).handlers;
      const successHandler = handlers[handlers.length - 1].fulfilled;
      const htmlResponse = {
        data: '<!DOCTYPE html><html><body>Error</body></html>',
      };

      await expect(successHandler(htmlResponse)).rejects.toThrow(
        'Received HTML response instead of JSON. Check backend server and API URL configuration.'
      );
    });
  });
});
