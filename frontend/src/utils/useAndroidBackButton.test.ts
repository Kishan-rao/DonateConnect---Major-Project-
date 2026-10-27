import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useAndroidBackButton,
  pushModalDismiss,
  hasActiveModal,
  popAndDismissTopModal,
  resetSessionHistory,
  recordSessionPath,
  getSessionHistory,
  hasInAppNavigationHistory,
  getRoleRootPath,
  isRootRouteForUser,
} from './useAndroidBackButton';

const mockedNavigate = vi.fn();
let mockPathname = '/';

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockedNavigate,
  useLocation: () => ({ pathname: mockPathname }),
}));

const mockShowSuccess = vi.fn();
vi.mock('../context/ToastContext', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: vi.fn(),
  }),
}));

let mockAuthUser: any = null;
let mockIsAuthenticated = false;

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    isAuthenticated: mockIsAuthenticated,
  }),
}));

describe('useAndroidBackButton & Navigation Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/';
    mockAuthUser = null;
    mockIsAuthenticated = false;
    resetSessionHistory();
    while (popAndDismissTopModal()) {}
  });

  describe('Modal Dismissal Stack', () => {
    it('manages modal dismiss stack correctly', () => {
      expect(hasActiveModal()).toBe(false);

      const dismissFn = vi.fn();
      const unregister = pushModalDismiss(dismissFn);
      expect(hasActiveModal()).toBe(true);

      // Unregister removes it
      unregister();
      expect(hasActiveModal()).toBe(false);
    });

    it('dismisses active modal first before navigating or exiting', () => {
      mockPathname = '/donations/donation-123/track';
      recordSessionPath('/donations');
      recordSessionPath('/donations/donation-123/track');

      renderHook(() => useAndroidBackButton());

      const dismissModal = vi.fn();
      pushModalDismiss(dismissModal);

      const event = new CustomEvent('androidBackButton', { cancelable: true });
      window.dispatchEvent(event);

      expect(dismissModal).toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(true);
      expect(mockedNavigate).not.toHaveBeenCalled();
    });

    it('dismisses nested modals in correct LIFO order (e.g. photo viewer on top of detail modal)', () => {
      mockPathname = '/donations';
      renderHook(() => useAndroidBackButton());

      const dismissDetailModal = vi.fn();
      const dismissPhotoViewer = vi.fn();

      pushModalDismiss(dismissDetailModal); // Opened first
      pushModalDismiss(dismissPhotoViewer); // Opened second on top

      // First Back: dismisses photo viewer
      const firstEvent = new CustomEvent('androidBackButton', { cancelable: true });
      window.dispatchEvent(firstEvent);
      expect(dismissPhotoViewer).toHaveBeenCalledTimes(1);
      expect(dismissDetailModal).not.toHaveBeenCalled();
      expect(mockedNavigate).not.toHaveBeenCalled();

      // Second Back: dismisses detail modal
      const secondEvent = new CustomEvent('androidBackButton', { cancelable: true });
      window.dispatchEvent(secondEvent);
      expect(dismissDetailModal).toHaveBeenCalledTimes(1);
      expect(mockedNavigate).not.toHaveBeenCalled();
    });
  });

  describe('In-App Navigation & Sub-routes', () => {
    it('navigates back (-1) when in-app history exists', () => {
      mockPathname = '/donations/donation-123/track';
      recordSessionPath('/donations');
      recordSessionPath('/donations/donation-123/track');

      renderHook(() => useAndroidBackButton());

      const event = new CustomEvent('androidBackButton', { cancelable: true });
      window.dispatchEvent(event);

      expect(mockedNavigate).toHaveBeenCalledWith(-1);
      expect(event.defaultPrevented).toBe(true);
    });

    it('navigates back (-1) from settings, inventory, or profile screens when history exists', () => {
      mockPathname = '/settings';
      recordSessionPath('/ngo-dashboard');
      recordSessionPath('/settings');

      renderHook(() => useAndroidBackButton());

      const event = new CustomEvent('androidBackButton', { cancelable: true });
      window.dispatchEvent(event);

      expect(mockedNavigate).toHaveBeenCalledWith(-1);
      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe('Deep Links & Fallback Navigation (Empty in-app history)', () => {
    it('navigates DONOR to /donations fallback when opening deep link directly', () => {
      mockAuthUser = { id: 'u1', role: 'DONOR' };
      mockIsAuthenticated = true;
      mockPathname = '/donations/donation-123/track';
      // Only 1 item in session history (no prior in-app screens)
      recordSessionPath('/donations/donation-123/track');

      renderHook(() => useAndroidBackButton());

      const event = new CustomEvent('androidBackButton', { cancelable: true });
      window.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(mockedNavigate).toHaveBeenCalledWith('/donations', { replace: true });
    });

    it('navigates NGO to /ngo-dashboard fallback when opening inventory directly', () => {
      mockAuthUser = { id: 'u2', role: 'NGO' };
      mockIsAuthenticated = true;
      mockPathname = '/ngo-dashboard/inventory';
      recordSessionPath('/ngo-dashboard/inventory');

      renderHook(() => useAndroidBackButton());

      const event = new CustomEvent('androidBackButton', { cancelable: true });
      window.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(mockedNavigate).toHaveBeenCalledWith('/ngo-dashboard', { replace: true });
    });

    it('navigates VOLUNTEER to /driver-dashboard fallback when opening tracking directly', () => {
      mockAuthUser = { id: 'u3', role: 'VOLUNTEER' };
      mockIsAuthenticated = true;
      mockPathname = '/donations/donation-999/track';
      recordSessionPath('/donations/donation-999/track');

      renderHook(() => useAndroidBackButton());

      const event = new CustomEvent('androidBackButton', { cancelable: true });
      window.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(mockedNavigate).toHaveBeenCalledWith('/driver-dashboard', { replace: true });
    });

    it('navigates ADMIN to /admin fallback when opening audit directly', () => {
      mockAuthUser = { id: 'u4', role: 'ADMIN' };
      mockIsAuthenticated = true;
      mockPathname = '/admin/audit';
      recordSessionPath('/admin/audit');

      renderHook(() => useAndroidBackButton());

      const event = new CustomEvent('androidBackButton', { cancelable: true });
      window.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(mockedNavigate).toHaveBeenCalledWith('/admin', { replace: true });
    });

    it('navigates unauthenticated user on /register back to /login', () => {
      mockAuthUser = null;
      mockIsAuthenticated = false;
      mockPathname = '/register';
      recordSessionPath('/register');

      renderHook(() => useAndroidBackButton());

      const event = new CustomEvent('androidBackButton', { cancelable: true });
      window.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(mockedNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });

  describe('Root Dashboard & Double-Tap Exit', () => {
    it('shows exit toast on first back press on root dashboard and exits on second press within 2s', () => {
      mockAuthUser = { id: 'u3', role: 'VOLUNTEER' };
      mockIsAuthenticated = true;
      mockPathname = '/driver-dashboard';
      recordSessionPath('/driver-dashboard');

      renderHook(() => useAndroidBackButton());

      // First press: shows warning toast and prevents default exit
      const firstEvent = new CustomEvent('androidBackButton', { cancelable: true });
      window.dispatchEvent(firstEvent);

      expect(firstEvent.defaultPrevented).toBe(true);
      expect(mockShowSuccess).toHaveBeenCalledWith('Press back again to exit DonateConnect');
      expect(mockedNavigate).not.toHaveBeenCalled();

      // Second press immediately after: allows native Android exit (default not prevented)
      const secondEvent = new CustomEvent('androidBackButton', { cancelable: true });
      window.dispatchEvent(secondEvent);

      expect(secondEvent.defaultPrevented).toBe(false);
    });

    it('resets double-tap timer if second press occurs after 2 seconds', () => {
      mockAuthUser = { id: 'u1', role: 'DONOR' };
      mockIsAuthenticated = true;
      mockPathname = '/donations';
      recordSessionPath('/donations');

      const nowSpy = vi.spyOn(Date, 'now');
      nowSpy.mockReturnValue(1000);

      renderHook(() => useAndroidBackButton());

      // First press at t = 1000ms
      const firstEvent = new CustomEvent('androidBackButton', { cancelable: true });
      window.dispatchEvent(firstEvent);
      expect(firstEvent.defaultPrevented).toBe(true);

      // Second press at t = 3500ms (> 2000ms later): does not exit, shows toast again
      nowSpy.mockReturnValue(3500);
      const secondEvent = new CustomEvent('androidBackButton', { cancelable: true });
      window.dispatchEvent(secondEvent);
      expect(secondEvent.defaultPrevented).toBe(true);
      expect(mockShowSuccess).toHaveBeenCalledTimes(2);

      nowSpy.mockRestore();
    });
  });

  describe('Helper Functions & Role Resolution', () => {
    it('resolves role root paths correctly', () => {
      expect(getRoleRootPath('DONOR')).toBe('/donations');
      expect(getRoleRootPath('ROLE_DONOR')).toBe('/donations');
      expect(getRoleRootPath('NGO')).toBe('/ngo-dashboard');
      expect(getRoleRootPath('VOLUNTEER')).toBe('/driver-dashboard');
      expect(getRoleRootPath('ADMIN')).toBe('/admin');
      expect(getRoleRootPath('CORPORATE')).toBe('/csr-dashboard');
      expect(getRoleRootPath(null)).toBe('/');
    });

    it('correctly identifies root route for user', () => {
      // Unauthenticated
      expect(isRootRouteForUser('/', false)).toBe(true);
      expect(isRootRouteForUser('/login', false)).toBe(true);
      expect(isRootRouteForUser('/register', false)).toBe(false);

      // Authenticated Donor
      expect(isRootRouteForUser('/donations', true, 'DONOR')).toBe(true);
      expect(isRootRouteForUser('/', true, 'DONOR')).toBe(true);
      expect(isRootRouteForUser('/donations/123/track', true, 'DONOR')).toBe(false);
    });

    it('tracks session history stack and handles back-popping accurately', () => {
      resetSessionHistory();
      recordSessionPath('/donations');
      recordSessionPath('/donations/123/track');
      expect(getSessionHistory()).toEqual(['/donations', '/donations/123/track']);
      expect(hasInAppNavigationHistory()).toBe(true);

      // Simulating navigation back to /donations
      recordSessionPath('/donations');
      expect(getSessionHistory()).toEqual(['/donations']);
    });
  });
});
