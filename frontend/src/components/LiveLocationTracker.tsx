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
    <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
      <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
        <Navigation className="w-4 h-4 text-indigo-400" />
        Live Location Tracker
      </h4>

      {permissionError && (
        <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{permissionError}</span>
        </div>
      )}

      {isBackground && isThisDeliverySharing && (
        <div className="mb-3 p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Warning: Tracking might be paused by your browser while in the background.</span>
        </div>
      )}

      {!isThisDeliverySharing ? (
        <div className="space-y-2">
          <button
            onClick={handleStartTracking}
            disabled={status === 'COMPLETED' || status === 'DELIVERED' || status === 'CANCELLED' || status === 'REJECTED'}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white text-sm font-bold rounded-xl transition-all flex justify-center items-center gap-2 active:scale-95 shadow-lg shadow-indigo-600/20"
          >
            <Navigation className="w-4 h-4" />
            Start Trip & Share Location
          </button>
          <button
            onClick={handleSimulateRoute}
            disabled={status === 'COMPLETED' || status === 'DELIVERED'}
            className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-white text-sm font-bold rounded-xl transition-all"
          >
            Simulate Route (Demo)
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-full border border-emerald-500/20">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              {isSimulating ? 'Simulating' : 'Sharing Active'}
            </span>
            {lastShared && (
              <span className="text-xs text-slate-400 font-mono">
                Sync: {lastShared.toLocaleTimeString()}
              </span>
            )}
          </div>

          <button
            onClick={stopTracking}
            className="w-full py-3 bg-red-600/80 hover:bg-red-500 text-white text-sm font-bold rounded-xl transition-all flex justify-center items-center gap-2 active:scale-95"
          >
            <StopCircle className="w-4 h-4" />
            End Trip
          </button>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-start gap-2 text-[11px] text-slate-400 leading-relaxed">
        <Lock className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
        <span>
          <strong className="text-slate-300 font-semibold">Privacy Notice:</strong> Your location is strictly shared in real-time only with the assigned donor and destination NGO during an active trip. Sharing automatically turns off when delivered or ended.
        </span>
      </div>
    </div>
  );
};
