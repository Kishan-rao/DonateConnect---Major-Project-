import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

// Global stack for dismissing active modals / drawers / bottom sheets
type DismissHandler = () => void;
const modalDismissStack: DismissHandler[] = [];

export const pushModalDismiss = (handler: DismissHandler): (() => void) => {
  modalDismissStack.push(handler);
  return () => {
    const idx = modalDismissStack.lastIndexOf(handler);
    if (idx !== -1) {
      modalDismissStack.splice(idx, 1);
    }
  };
};

export const hasActiveModal = (): boolean => modalDismissStack.length > 0;

export const popAndDismissTopModal = (): boolean => {
  if (modalDismissStack.length > 0) {
    const handler = modalDismissStack.pop();
    if (handler) {
      handler();
      return true;
    }
  }
  return false;
};

// Global session navigation history tracker
const sessionHistory: string[] = [];

export const getSessionHistory = (): string[] => [...sessionHistory];

export const resetSessionHistory = (): void => {
  sessionHistory.length = 0;
};

export const recordSessionPath = (path: string): void => {
  const currentTop = sessionHistory[sessionHistory.length - 1];
  if (currentTop === path) return;

  // If returning to the immediate previous route (back navigation), pop the top entry
  if (sessionHistory.length > 1 && sessionHistory[sessionHistory.length - 2] === path) {
    sessionHistory.pop();
    return;
  }

  // Forward navigation: push new path
  sessionHistory.push(path);
};

export const hasInAppNavigationHistory = (): boolean => {
  if (sessionHistory.length > 1) return true;
  if (typeof window !== 'undefined' && typeof window.history?.state?.idx === 'number') {
    return window.history.state.idx > 0;
  }
  return false;
};

export const getRoleRootPath = (role?: string | null): string => {
  const normalizedRole = (role || '').replace(/^ROLE_/, '');
  switch (normalizedRole) {
    case 'DONOR':
      return '/donations';
    case 'NGO':
      return '/ngo-dashboard';
    case 'VOLUNTEER':
      return '/driver-dashboard';
    case 'CORPORATE':
      return '/csr-dashboard';
    case 'ADMIN':
      return '/admin';
    default:
      return '/';
  }
};

export const isRootRouteForUser = (
  pathname: string,
  isAuthenticated: boolean,
  role?: string | null
): boolean => {
  if (!isAuthenticated) {
    return pathname === '/' || pathname === '/login';
  }
  const roleRoot = getRoleRootPath(role);
  return pathname === roleRoot || pathname === '/';
};

const useAuthSafe = () => {
  try {
    return useAuth();
  } catch {
    return null;
  }
};

export const useAndroidBackButton = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showSuccess } = useToast();
  const auth = useAuthSafe();
  const lastBackPressRef = useRef<number>(0);

  // Record path in session history
  useEffect(() => {
    recordSessionPath(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const handleBackButton = (e: Event) => {
      // Priority 1: Dismiss open modal / drawer / sheet / photo viewer
      if (popAndDismissTopModal()) {
        e.preventDefault();
        return;
      }

      const currentPath = location.pathname;
      const isAuthenticated = Boolean(auth?.isAuthenticated && auth?.user);
      const userRole = auth?.user?.role;
      const isRoot = isRootRouteForUser(currentPath, isAuthenticated, userRole);

      // Priority 2: On a root route, double-tap back within 2 seconds to exit
      if (isRoot) {
        const now = Date.now();
        if (lastBackPressRef.current > 0 && now - lastBackPressRef.current < 2000) {
          // Allow default native Android behavior (moveTaskToBack)
          return;
        }

        // First tap on root route: show exit toast and prevent exit
        e.preventDefault();
        lastBackPressRef.current = now;
        showSuccess('Press back again to exit DonateConnect');
        return;
      }

      // Priority 3: On a non-root screen (sub-route)
      e.preventDefault();

      // Check if valid in-app history exists
      if (hasInAppNavigationHistory()) {
        navigate(-1);
        return;
      }

      // Fallback when no prior in-app screen exists (e.g. direct link, cold start)
      if (isAuthenticated) {
        const fallback = getRoleRootPath(userRole);
        navigate(fallback, { replace: true });
      } else {
        const fallback = currentPath === '/register' ? '/login' : '/';
        navigate(fallback, { replace: true });
      }
    };

    window.addEventListener('androidBackButton', handleBackButton);
    return () => {
      window.removeEventListener('androidBackButton', handleBackButton);
    };
  }, [location.pathname, navigate, showSuccess, auth]);
};
