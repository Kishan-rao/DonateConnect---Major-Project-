import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useAndroidBackButton,
  pushModalDismiss,
  hasActiveModal,
  popAndDismissTopModal,
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

describe('useAndroidBackButton & Modal Dismissal Stack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/';
    // Clear any residual modal handlers
    while (popAndDismissTopModal()) {}
  });

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
    renderHook(() => useAndroidBackButton());

    const dismissModal = vi.fn();
    pushModalDismiss(dismissModal);

    const event = new CustomEvent('androidBackButton', { cancelable: true });
    window.dispatchEvent(event);

    expect(dismissModal).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
    expect(mockedNavigate).not.toHaveBeenCalled();
  });

  it('navigates back (-1) when on a sub-route', () => {
    mockPathname = '/donations/donation-123/track';
    renderHook(() => useAndroidBackButton());

    const event = new CustomEvent('androidBackButton', { cancelable: true });
    window.dispatchEvent(event);

    expect(mockedNavigate).toHaveBeenCalledWith(-1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('shows exit toast on first back press on root dashboard and exits on second press within 2s', () => {
    mockPathname = '/driver-dashboard';
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
});

