import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { useDeliveryTracking } from '../context/DeliveryTrackingContext';
import { Navigation, AlertTriangle, StopCircle, Lock } from 'lucide-react';
import { Donation } from '../types';

interface Props {
  deliveryId: string;
  status: string;
  donation?: Donation;
}

export const LiveLocationTracker: React.FC<Props> = ({ deliveryId, status, donation }) => {
  const { showError } = useToast();
  const {
    activeDeliveryId,
    isTracking,
    isSimulating,
    lastShared,
    permissionError,
    startTracking,
    stopTracking,
    simulateRoute,
  } = useDeliveryTracking();

  const [isBackground, setIsBackground] = useState(false);

  // Check visibility state for user warning
  useEffect(() => {
    const handleVisibility = () => {
      setIsBackground(document.visibilityState === 'hidden');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const isThisDeliverySharing = isTracking && activeDeliveryId === deliveryId;

  // Stop tracking automatically if delivered, completed, or cancelled
  useEffect(() => {
    if (isThisDeliverySharing && (status === 'COMPLETED' || status === 'DELIVERED' || status === 'CANCELLED' || status === 'REJECTED')) {
      stopTracking();
    }
  }, [isThisDeliverySharing, status, stopTracking]);

  const handleStartTracking = () => {
    if (status === 'COMPLETED' || status === 'DELIVERED' || status === 'CANCELLED' || status === 'REJECTED') {
      showError('Location sharing is disabled for inactive deliveries');
      return;
    }
    startTracking(deliveryId, donation);
  };

  const handleSimulateRoute = () => {
    if (status === 'COMPLETED' || status === 'DELIVERED') {
      showError('Simulation is disabled for inactive deliveries');
      return;
    }
    simulateRoute(deliveryId, donation);
  };

  return (
    <div className="mt-4 p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
      <h4 className="text-sm font-bold text-[#111827] mb-2 flex items-center gap-2">
        <Navigation className="w-4 h-4 text-[#7567E8]" />
        Live Location Tracker
      </h4>

      {permissionError && (
        <div className="mb-3 p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{permissionError}</span>
        </div>
      )}

      {isBackground && isThisDeliverySharing && (
        <div className="mb-3 p-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Warning: Tracking might be paused by your browser while in the background.</span>
        </div>
      )}

      {!isThisDeliverySharing ? (
        <div className="space-y-2">
          <button
            onClick={handleStartTracking}
            disabled={status === 'COMPLETED' || status === 'DELIVERED' || status === 'CANCELLED' || status === 'REJECTED'}
            className="w-full py-3 bg-[#7567E8] hover:bg-[#7567E8]/90 disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF] text-white text-sm font-bold rounded-xl transition-all flex justify-center items-center gap-2 active:scale-95 shadow-xs"
          >
            <Navigation className="w-4 h-4" />
            Start Trip & Share Location
          </button>
          <button
            onClick={handleSimulateRoute}
            disabled={status === 'COMPLETED' || status === 'DELIVERED'}
            className="w-full py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-xs"
          >
            Simulate Route (Demo)
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-full border border-emerald-200">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              {isSimulating ? 'Simulating' : 'Sharing Active'}
            </span>
            {lastShared && (
              <span className="text-xs text-[#6B7280] font-mono">
                Sync: {lastShared.toLocaleTimeString()}
              </span>
            )}
          </div>

          <button
            onClick={stopTracking}
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition-all flex justify-center items-center gap-2 active:scale-95 shadow-xs"
          >
            <StopCircle className="w-4 h-4" />
            End Trip
          </button>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="mt-3 pt-3 border-t border-[#E5E7EB] flex items-start gap-2 text-[11px] text-[#6B7280] leading-relaxed">
        <Lock className="w-3.5 h-3.5 text-[#7567E8] shrink-0 mt-0.5" />
        <span>
          <strong className="text-[#111827] font-semibold">Privacy Notice:</strong> Your location is strictly shared in real-time only with the assigned donor and destination NGO during an active trip. Sharing automatically turns off when delivered or ended.
        </span>
      </div>
    </div>
  );
};
