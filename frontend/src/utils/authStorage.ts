import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { User } from '../types';

const TOKEN_KEY = 'dc-token';
const USER_KEY = 'dc-user';

const isNative = Capacitor.isNativePlatform();

/**
 * Normalizes user object ensuring role string does not have duplicate prefixes.
 */
export const normalizeUser = (user: User | null): User | null => {
  if (!user) return null;
  return {
    ...user,
    role: (user.role ? (user.role as string).replace(/^ROLE_/, '') : 'DONOR') as any,
  };
};

/**
 * Synchronous fallback reading from localStorage for initial React state initialization.
 */
export const getSyncStoredToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const getSyncStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? normalizeUser(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};

/**
 * Asynchronously retrieves the stored JWT access token.
 * Reads from native Capacitor Preferences on mobile devices, falling back to localStorage.
 */
export const getStoredToken = async (): Promise<string | null> => {
  try {
    if (isNative) {
      const { value } = await Preferences.get({ key: TOKEN_KEY });
      if (value) {
        // Keep localStorage mirrored for fast synchronous read
        localStorage.setItem(TOKEN_KEY, value);
        return value;
      }
    }
  } catch (err) {
    console.warn('[authStorage] Failed reading token from Preferences, falling back to localStorage:', err);
  }
  return getSyncStoredToken();
};

/**
 * Asynchronously retrieves the stored User profile.
 */
export const getStoredUser = async (): Promise<User | null> => {
  try {
    if (isNative) {
      const { value } = await Preferences.get({ key: USER_KEY });
      if (value) {
        const parsed = normalizeUser(JSON.parse(value));
        localStorage.setItem(USER_KEY, JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[authStorage] Failed reading user from Preferences, falling back to localStorage:', err);
  }
  return getSyncStoredUser();
};

/**
 * Persists token and user profile across both native Capacitor Preferences and localStorage.
 */
export const setStoredAuth = async (token: string, user: User): Promise<void> => {
  const normalized = normalizeUser(user);
  const serializedUser = JSON.stringify(normalized);

  // Synchronous web storage
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, serializedUser);
  } catch (err) {
    console.warn('[authStorage] Failed writing to localStorage:', err);
  }

  // Native Capacitor Preferences storage for persistent Android retention
  try {
    if (isNative) {
      await Preferences.set({ key: TOKEN_KEY, value: token });
      await Preferences.set({ key: USER_KEY, value: serializedUser });
    }
  } catch (err) {
    console.warn('[authStorage] Failed writing to Preferences:', err);
  }
};

/**
 * Clears stored authentication credentials on logout or account deletion.
 */
export const clearStoredAuth = async (): Promise<void> => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (err) {
    console.warn('[authStorage] Failed clearing localStorage:', err);
  }

  try {
    if (isNative) {
      await Preferences.remove({ key: TOKEN_KEY });
      await Preferences.remove({ key: USER_KEY });
    }
  } catch (err) {
    console.warn('[authStorage] Failed clearing Preferences:', err);
  }
};

/**
 * Generic persistent storage helpers across Capacitor Preferences and localStorage
 */
export const getStoredItem = async (key: string): Promise<string | null> => {
  try {
    if (isNative) {
      const { value } = await Preferences.get({ key });
      if (value) return value;
    }
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const setStoredItem = async (key: string, value: string): Promise<void> => {
  try {
    localStorage.setItem(key, value);
    if (isNative) {
      await Preferences.set({ key, value });
    }
  } catch (err) {
    console.warn(`[authStorage] Failed storing ${key}:`, err);
  }
};

export const removeStoredItem = async (key: string): Promise<void> => {
  try {
    localStorage.removeItem(key);
    if (isNative) {
      await Preferences.remove({ key });
    }
  } catch (err) {
    console.warn(`[authStorage] Failed removing ${key}:`, err);
  }
};

