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

function calculateHaversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const DeliveryTrackingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { showError } = useToast();

  const [activeDeliveryId, setActiveDeliveryId] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isSimulating] = useState(false);
  const [lastShared, setLastShared] = useState<Date | null>(null);
  const [permissionError, setPermissionError] = useState('');

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simulationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestPosRef = useRef<GeolocationPosition | null>(null);
  const lastSharedRef = useRef<Date | null>(null);
  const lastTransmittedPosRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
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
    lastTransmittedPosRef.current = null;
  }, []);

  const stopTracking = useCallback(() => {
    clearTrackingWatchers();
    setIsTracking(false);
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

    const { latitude, longitude, speed, heading, accuracy } = pos.coords;

    // Coordinate validation before submitting
    if (
      typeof latitude !== 'number' || typeof longitude !== 'number' ||
      isNaN(latitude) || isNaN(longitude) ||
      !isFinite(latitude) || !isFinite(longitude) ||
      latitude < -90 || latitude > 90 ||
      longitude < -180 || longitude > 180 ||
      (Math.abs(latitude) < 1e-6 && Math.abs(longitude) < 1e-6)
    ) {
      console.warn('[GPS] Discarding invalid GPS coordinates:', latitude, longitude);
      return;
    }

    const now = new Date();
    const nowTime = now.getTime();

    // Client-side rate throttle: avoid bursting within 2.5 seconds (prevents 429)
    if (lastSharedRef.current && nowTime - lastSharedRef.current.getTime() < 2500) {
      return;
    }

    // Movement threshold and duplicate avoidance:
    // If user has not moved >= 5m AND < 15 seconds have passed, skip redundant transmission
    if (lastTransmittedPosRef.current) {
      const movedMeters = calculateHaversineMeters(
        latitude,
        longitude,
        lastTransmittedPosRef.current.lat,
        lastTransmittedPosRef.current.lng
      );
      const elapsedMs = nowTime - lastTransmittedPosRef.current.time;
      if (movedMeters < 5 && elapsedMs < 15000) {
        return;
      }
    }

    lastSharedRef.current = now;

    sendLocationUpdate(deliveryId, {
      deliveryId,
      lat: latitude,
      lng: longitude,
      accuracy: accuracy && !isNaN(accuracy) ? accuracy : null,
      speed: speed && !isNaN(speed) ? speed : 0,
      heading: heading && !isNaN(heading) ? heading : 0,
      timestamp: new Date(pos.timestamp || Date.now()).toISOString(),
    })
      .then(() => {
        lastTransmittedPosRef.current = { lat: latitude, lng: longitude, time: nowTime };
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

    // Heartbeat: periodic refresh every 15 seconds to ensure presence without bursting
    intervalRef.current = setInterval(() => {
      if (latestPosRef.current) {
        transmitLocation(deliveryId, latestPosRef.current);
      }
    }, 15000);
  }, [clearTrackingWatchers, showError, stopTracking, transmitLocation]);

  // Deprecated stub: simulation is disabled to enforce real GPS coordinates
  const simulateRoute = useCallback(async () => {
    console.warn('[GPS] Route simulation disabled. Only genuine device GPS coordinates are accepted.');
  }, []);

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

