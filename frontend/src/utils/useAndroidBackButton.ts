import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

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

// Root entry routes where pressing back prompts to exit rather than navigate
const ROOT_ROUTES = new Set([
  '/',
  '/donations',
  '/ngo-dashboard',
  '/driver-dashboard',
  '/admin',
  '/csr-dashboard',
  '/login',
  '/register',
]);

export const useAndroidBackButton = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showSuccess } = useToast();
  const lastBackPressRef = useRef<number>(0);

  useEffect(() => {
    const handleBackButton = (e: Event) => {
      // 1. Priority 1: Dismiss open modal / drawer / sheet
      if (popAndDismissTopModal()) {
        e.preventDefault();
        return;
      }

      // 2. Priority 2: If on a sub-route, navigate back in history
      const currentPath = location.pathname;
      const isRootRoute = ROOT_ROUTES.has(currentPath);

      if (!isRootRoute) {
        e.preventDefault();
        navigate(-1);
        return;
      }

      // 3. Priority 3: On a root route, double-tap back within 2 seconds to exit
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        // Allow default native Android behavior (moveTaskToBack)
        return;
      }

      // First tap on root route: show exit warning and prevent exit
      e.preventDefault();
      lastBackPressRef.current = now;
      showSuccess('Press back again to exit DonateConnect');
    };

    window.addEventListener('androidBackButton', handleBackButton);
    return () => {
      window.removeEventListener('androidBackButton', handleBackButton);
    };
  }, [location.pathname, navigate, showSuccess]);
};

