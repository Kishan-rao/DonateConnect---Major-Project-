import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { sendLocationUpdate, getMyVolunteerTasks } from '../api/volunteerApi';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { Donation } from '../types';
import { getStoredItem, setStoredItem, removeStoredItem } from '../utils/authStorage';

interface DeliveryTrackingContextType {
  activeDeliveryId: string | null;
  isTracking: boolean;
  isSimulating: boolean;
  lastShared: Date | null;
  permissionError: string;
  startTracking: (deliveryId: string, donation?: Donation) => void;
  stopTracking: () => void;
  simulateRoute: (deliveryId: string, donation?: Donation) => Promise<void>;
}

const DeliveryTrackingContext = createContext<DeliveryTrackingContextType | undefined>(undefined);

const TRACKING_DELIVERY_KEY = 'active_tracking_delivery_id';
const TRACKING_DONATION_KEY = 'active_tracking_donation_id';

export const DeliveryTrackingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { showError } = useToast();

  const [activeDeliveryId, setActiveDeliveryId] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [lastShared, setLastShared] = useState<Date | null>(null);
  const [permissionError, setPermissionError] = useState('');

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simulationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestPosRef = useRef<GeolocationPosition | null>(null);
  const lastSharedRef = useRef<Date | null>(null);
  const isTrackingRef = useRef(false);
  const activeDeliveryIdRef = useRef<string | null>(null);

  // Synchronize ref with state
  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);

  useEffect(() => {
    activeDeliveryIdRef.current = activeDeliveryId;
  }, [activeDeliveryId]);

  const clearTrackingWatchers = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    latestPosRef.current = null;
    lastSharedRef.current = null;
  }, []);

  const stopTracking = useCallback(() => {
    clearTrackingWatchers();
    setIsTracking(false);
    setIsSimulating(false);
    setActiveDeliveryId(null);
    removeStoredItem(TRACKING_DELIVERY_KEY);
    removeStoredItem(TRACKING_DONATION_KEY);
  }, [clearTrackingWatchers]);

  const transmitLocation = useCallback((deliveryId: string, pos: GeolocationPosition) => {
    const ageMs = Date.now() - pos.timestamp;
    if (ageMs > 120000) {
      console.warn(`[GPS] Skipping stale coordinate (${Math.round(ageMs / 1000)}s old)`);
      return;
    }

    const now = new Date();
    // Client-side rate throttle: avoid bursting within 2 seconds
    if (lastSharedRef.current && now.getTime() - lastSharedRef.current.getTime() < 2000) {
      return;
    }
    lastSharedRef.current = now;

    const { latitude, longitude, speed, heading } = pos.coords;
    sendLocationUpdate(deliveryId, {
      deliveryId,
      lat: latitude,
      lng: longitude,
      speed: speed || 0,
      heading: heading || 0,
      timestamp: now.toISOString(),
    })
      .then(() => {
        setLastShared(now);
        setPermissionError('');
      })
      .catch((e: any) => {
        if (e.response?.status === 400) {
          // Backend reports delivery is completed or cancelled
          stopTracking();
        } else if (e.response?.status === 403) {
          showError('Unauthorized to update location for this delivery.');
          stopTracking();
        } else if (e.response?.status !== 429) {
          console.error('[GPS] Failed to send location update', e);
        }
      });
  }, [showError, stopTracking]);

  const startTracking = useCallback((deliveryId: string, donation?: Donation) => {
    if (!navigator.geolocation) {
      setPermissionError('Geolocation is not supported by this device.');
      return;
    }

    // Stop any previous session cleanly
    clearTrackingWatchers();

    setPermissionError('');
    setActiveDeliveryId(deliveryId);
    setIsTracking(true);
    setIsSimulating(false);

    // Persist active tracking session across navigation and app restarts
    setStoredItem(TRACKING_DELIVERY_KEY, deliveryId);
    if (donation?.id) {
      setStoredItem(TRACKING_DONATION_KEY, donation.id);
    }

    // Immediate position acquisition on mobile devices to trigger runtime permission prompt and instant fix
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        latestPosRef.current = pos;
        transmitLocation(deliveryId, pos);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionError('Location permission denied. Please enable location access in App Settings.');
          stopTracking();
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setPermissionError('GPS signal unavailable. Please ensure device location (GPS) is turned on.');
        } else {
          console.warn('[GPS] Initial getCurrentPosition acquisition deferred to watchPosition:', err.message);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        latestPosRef.current = pos;
        transmitLocation(deliveryId, pos);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionError('Location permission denied. Please enable location access in App Settings.');
          stopTracking();
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setPermissionError('GPS signal unavailable. Please ensure device location (GPS) is turned on.');
        } else if (err.code === err.TIMEOUT) {
          console.warn('[GPS] Position acquisition timed out, retrying...');
        } else {
          showError('GPS error: ' + err.message);
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    intervalRef.current = setInterval(() => {
      if (latestPosRef.current) {
        transmitLocation(deliveryId, latestPosRef.current);
      }
    }, 5000);
  }, [clearTrackingWatchers, showError, stopTracking, transmitLocation]);

  const simulateRoute = useCallback(async (deliveryId: string, donation?: Donation) => {
    if (!donation) return;
    clearTrackingWatchers();

    setActiveDeliveryId(deliveryId);
    setIsSimulating(true);
    setIsTracking(true);
    setStoredItem(TRACKING_DELIVERY_KEY, deliveryId);
    setStoredItem(TRACKING_DONATION_KEY, donation.id);

    const startLat = donation.pickupLat || 12.9716;
    const startLng = donation.pickupLng || 77.5946;
    const endLat = donation.ngo?.latitude || 28.6439;
    const endLng = donation.ngo?.longitude || 77.2390;

    const generateFallbackRoute = (sLat: number, sLng: number, eLat: number, eLng: number, steps = 50): [number, number][] => {
      const route: [number, number][] = [];
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        route.push([sLng + (eLng - sLng) * t, sLat + (eLat - sLat) * t]);
      }
      return route;
    };

    let coords: [number, number][];
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(osrmUrl, { signal: controller.signal });
      clearTimeout(timeout);
      const data = await res.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        coords = data.routes[0].geometry.coordinates;
      } else {
        coords = generateFallbackRoute(startLat, startLng, endLat, endLng);
      }
    } catch (e) {
      coords = generateFallbackRoute(startLat, startLng, endLat, endLng);
    }

    let i = 0;
    simulationIntervalRef.current = setInterval(() => {
      if (i >= coords.length) {
        stopTracking();
        return;
      }
      const [lng, lat] = coords[i];
      let heading = 0;
      if (i < coords.length - 1) {
        const [nLng, nLat] = coords[i + 1];
        heading = Math.atan2(nLng - lng, nLat - lat) * (180 / Math.PI);
      }

      const now = new Date();
      sendLocationUpdate(deliveryId, {
        deliveryId,
        lat,
        lng,
        speed: 30,
        heading,
        timestamp: now.toISOString(),
      })
        .then(() => {
          setLastShared(now);
        })
        .catch((e: any) => {
          if (e.response?.status !== 429) {
            console.error('Failed to send simulated location', e);
          }
        });

      i += Math.max(1, Math.floor(coords.length / 50));
    }, 2000);
  }, [clearTrackingWatchers, stopTracking]);

  // Restore tracking session on startup / authentication
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'VOLUNTEER') {
      if (isTrackingRef.current) {
        stopTracking();
      }
      return;
    }

    const restoreActiveSession = async () => {
      try {
        const savedDeliveryId = await getStoredItem(TRACKING_DELIVERY_KEY);
        if (!savedDeliveryId) return;

        // Verify with backend that this delivery task is still active and assigned to this volunteer
        const myTasks = await getMyVolunteerTasks();
        const activeTask = myTasks.find(
          (t) => (t.deliveryId === savedDeliveryId || t.donation?.id === savedDeliveryId) &&
                 (t.status === 'CLAIMED' || t.status === 'IN_TRANSIT')
        );

        if (activeTask && activeTask.deliveryId) {
          console.log(`[Tracking] Restoring active delivery tracking session for delivery: ${activeTask.deliveryId}`);
          startTracking(activeTask.deliveryId, activeTask.donation);
        } else {
          // Delivery is completed, cancelled, or not assigned; clear stored session
          removeStoredItem(TRACKING_DELIVERY_KEY);
          removeStoredItem(TRACKING_DONATION_KEY);
        }
      } catch (err) {
        console.warn('[Tracking] Failed to restore active delivery tracking session:', err);
      }
    };

    restoreActiveSession();
  }, [isAuthenticated, user?.role, startTracking, stopTracking]);

  // Clean up on component unmount (app shutdown)
  useEffect(() => {
    return () => {
      clearTrackingWatchers();
    };
  }, [clearTrackingWatchers]);

  return (
    <DeliveryTrackingContext.Provider
      value={{
        activeDeliveryId,
        isTracking,
        isSimulating,
        lastShared,
        permissionError,
        startTracking,
        stopTracking,
        simulateRoute,
      }}
    >
      {children}
    </DeliveryTrackingContext.Provider>
  );
};

const defaultTrackingContext: DeliveryTrackingContextType = {
  activeDeliveryId: null,
  isTracking: false,
  isSimulating: false,
  lastShared: null,
  permissionError: '',
  startTracking: () => {},
  stopTracking: () => {},
  simulateRoute: async () => {},
};

export const useDeliveryTracking = (): DeliveryTrackingContextType => {
  const context = useContext(DeliveryTrackingContext);
  return context || defaultTrackingContext;
};

