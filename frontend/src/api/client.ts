import axios from 'axios';
import { Capacitor } from '@capacitor/core';

export interface ResolveApiBaseUrlOptions {
  envUrl?: string;
  isNative?: boolean;
  isProd?: boolean;
}

/**
 * Resolves and normalizes the backend API base URL based on platform and environment.
 * - In production native Android builds: requires an explicit HTTPS backend URL.
 * - In dev native Android builds: falls back to local LAN IP if unset.
 * - In browser dev/prod: falls back to /api (leveraging Vite dev proxy).
 * - Trims trailing slashes and ensures /api path suffix without duplication.
 */
export const resolveApiBaseUrl = (options?: ResolveApiBaseUrlOptions): string => {
  const isNative = options?.isNative ?? Capacitor.isNativePlatform();
  const isProd = options?.isProd ?? import.meta.env.PROD;
  const rawUrl = options?.envUrl !== undefined ? options.envUrl : import.meta.env.VITE_API_BASE_URL;

  let url = (rawUrl || '').trim();

  if (isNative) {
    if (isProd) {
      if (!url) {
        throw new Error(
          '[DonateConnect] Missing VITE_API_BASE_URL for production Android build. An explicit HTTPS URL is required (e.g., VITE_API_BASE_URL=https://YOUR-DEPLOYED-BACKEND.onrender.com/api).'
        );
      }
      if (!url.startsWith('https://')) {
        throw new Error(
          `[DonateConnect] Production Android builds require an explicit HTTPS backend URL (e.g., https://YOUR-DEPLOYED-BACKEND.onrender.com/api). Received: "${url}"`
        );
      }
    } else {
      // Native Android development fallback
      if (!url) {
        url = 'http://192.168.29.227:8080/api';
      }
    }
  } else {
    // Browser fallback
    if (!url) {
      url = '/api';
    }
  }

  // Normalize: trim trailing slashes
  url = url.replace(/\/+$/, '');

  // Ensure /api suffix exists so relative paths route correctly without duplicating
  if (!url.endsWith('/api') && url !== '/api') {
    url = `${url}/api`;
  }

  return url;
};

let cachedConfigError: Error | null = null;
let cachedBaseUrl = '/api';

try {
  cachedBaseUrl = resolveApiBaseUrl();
} catch (err: any) {
  cachedConfigError = err instanceof Error ? err : new Error(String(err));
  console.error('[DonateConnect API Configuration Error]', cachedConfigError);
}

export const getApiConfigError = (): Error | null => cachedConfigError;

export const getBaseUrl = (): string => cachedBaseUrl;

export const apiClient = axios.create({
  baseURL: cachedBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

const getSafeStoredToken = (): string | null => {
  try {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
      ? localStorage.getItem('dc-token')
      : null;
  } catch {
    return null;
  }
};

let inMemoryToken: string | null = getSafeStoredToken();
let logoutCallback: (() => void) | null = null;

export const setAuthTokenInMemory = (token: string | null) => {
  inMemoryToken = token;
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      if (token) {
        localStorage.setItem('dc-token', token);
      } else {
        localStorage.removeItem('dc-token');
      }
    }
  } catch (err) {
    console.warn('[client] Failed to update localStorage token:', err);
  }
};

export const registerLogoutCallback = (cb: () => void) => {
  logoutCallback = cb;
};

// Request Interceptor: Attach JWT Bearer token and check config errors
apiClient.interceptors.request.use((config) => {
  if (cachedConfigError) {
    return Promise.reject(cachedConfigError);
  }
  const requestUrl = config.url || '';
  const isPublicAuthEndpoint =
    requestUrl.includes('/auth/login') ||
    requestUrl.includes('/auth/register') ||
    requestUrl.includes('/auth/verify-otp') ||
    requestUrl.includes('/auth/resend-otp');

  const activeToken = inMemoryToken || getSafeStoredToken();
  if (activeToken && !isPublicAuthEndpoint) {
    config.headers.Authorization = `Bearer ${activeToken}`;
  }
  return config;
});

// Response Interceptor: Validate JSON content and catch 401 Unauthorized errors
apiClient.interceptors.response.use(
  (response) => {
    // If the server returns HTML (e.g. SPA fallback index.html for missing routes), reject as API error
    if (
      typeof response.data === 'string' &&
      (response.data.trim().startsWith('<!DOCTYPE') || response.data.trim().startsWith('<html'))
    ) {
      const err = new Error('Received HTML response instead of JSON. Check backend server and API URL configuration.') as any;
      err.response = response;
      return Promise.reject(err);
    }
    return response;
  },
  (error) => {
    const requestUrl = error.config?.url || '';
    const isPublicEndpoint = requestUrl.includes('/health') || requestUrl.includes('/auth/');
    const hasToken = inMemoryToken || getSafeStoredToken();

    if (error.response?.status === 401 && !isPublicEndpoint && hasToken && logoutCallback) {
      logoutCallback();
    }
    let message = error.response?.data?.message;
    if (!message) {
      if (error.code === 'ECONNABORTED' || (error.message && /timeout/i.test(error.message))) {
        message = 'Connection timed out. The server may be starting up—please wait a moment and try again.';
      } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        message = 'Unable to connect to the server. Please check your internet connection.';
      } else {
        message = error.message || 'An unexpected error occurred';
      }
    }

    const err = new Error(message) as any;
    err.code = error.code;
    err.response = error.response;
    err.status = error.response?.status;
    return Promise.reject(err);
  }
);
