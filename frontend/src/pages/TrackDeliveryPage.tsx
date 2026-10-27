import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDonationById, getLiveLocation, getDeliveryByDonationId, completeDelivery, getDeliveryRouteEta } from '../api/donationApi';
import { Donation, DeliveryDto, RouteEtaDto } from '../types';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapControls } from '../components/MapControls';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDeliveryTracking } from '../context/DeliveryTrackingContext';
import { ArrowLeft, Navigation, Clock, ShieldCheck, MapPin, AlertTriangle, RefreshCw, Compass, CheckCircle, Upload, KeyRound } from 'lucide-react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { OtpInput } from '../components/OtpInput';
import { LiveLocationTracker } from '../components/LiveLocationTracker';
import { getWsUrl } from '../utils/urlUtils';
import { getBaseUrl } from '../api/client';

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const truckIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3233/3233967.png',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

/** Smoothly pan map viewport to follow driver's live GPS coordinates */
const MapPanController: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.panTo(center, { animate: true });
  }, [center[0], center[1], map]);
  return null;
};

export const TrackDeliveryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { showSuccess } = useToast();
  const { stopTracking } = useDeliveryTracking();
  
  const [donation, setDonation] = useState<Donation | null>(null);
  const [delivery, setDelivery] = useState<DeliveryDto | null>(null);
  const [currentLoc, setCurrentLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [path, setPath] = useState<[number, number][]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(true);

  // Backend Authoritative Route ETA State
  const [routeEta, setRouteEta] = useState<RouteEtaDto | null>(null);
  const [etaLoading, setEtaLoading] = useState(false);
  const [etaError, setEtaError] = useState<string | null>(null);
  const lastEtaFetchTime = useRef<number>(0);
  const lastEtaOrigin = useRef<{ lat: number; lng: number } | null>(null);
  const latestEtaRequestId = useRef<number>(0);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  // Proof of delivery state
  const [otp, setOtp] = useState('');
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);

  // Poll fallback interval
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!id) return;
    
    // Fetch Donation to get NGO/Donor info
    getDonationById(id).then((d) => setDonation(d)).catch(console.error);
    getDeliveryByDonationId(id).then((d) => {
      setDelivery(d);
      if (d.lastLat && d.lastLng) {
        setCurrentLoc((prev) => prev || { lat: d.lastLat!, lng: d.lastLng! });
        setPath((prev) => prev.length === 0 ? [[d.lastLat!, d.lastLng!]] : prev);
        if (d.lastLocationAt) {
          setLastUpdated((prev) => prev || new Date(d.lastLocationAt!));
        }
      }
    }).catch(console.error);

    // Initial Location fetch
    const fetchLoc = async () => {
      try {
        const loc = await getLiveLocation(id);
        if (loc && loc.lat && loc.lng) {
          setCurrentLoc({ lat: loc.lat, lng: loc.lng });
          setPath((prev) => [...prev, [loc.lat, loc.lng]]);
          setLastUpdated(new Date());
        }
      } catch (err: any) {
        console.warn('Initial live location fetch deferred to delivery state:', err?.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLoc();

    // Setup STOMP WebSocket
    const client = new Client({
      webSocketFactory: () => {
        const baseUrl = getBaseUrl();
        return new SockJS(getWsUrl(baseUrl));
      },
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: () => {},
      onConnect: () => {
        // Refetch latest delivery state on connect/reconnect
        getDeliveryByDonationId(id).then((d) => {
          setDelivery(d);
          if (d.lastLat && d.lastLng) {
            setCurrentLoc((prev) => prev || { lat: d.lastLat!, lng: d.lastLng! });
          }
        }).catch(() => {});

        client.subscribe(`/topic/donation/${id}`, (msg) => {
          try {
            const loc = JSON.parse(msg.body);
            if (loc.lat && loc.lng) {
              setCurrentLoc({ lat: loc.lat, lng: loc.lng });
              setPath((prev) => {
                const last = prev[prev.length - 1];
                if (last && last[0] === loc.lat && last[1] === loc.lng) return prev;
                return [...prev, [loc.lat, loc.lng]];
              });
              setLastUpdated(new Date());
              setIsOffline(false);
              // Recalculate ETA if driver moved meaningfully or recovered from offline
              triggerLocationBasedEtaRefresh(loc);
            }
          } catch (e) {
            console.error('Failed to parse incoming location update', e);
          }
        });
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
      },
    });

    client.activate();

    // Fallback polling
    pollInterval.current = setInterval(async () => {
      if (!client.connected) {
        if (donation?.status === 'DELIVERED' || donation?.status === 'REJECTED') {
          if (pollInterval.current) clearInterval(pollInterval.current);
          return;
        }
        try {
          const loc = await getLiveLocation(id);
          if (loc && loc.lat && loc.lng) {
            setCurrentLoc({ lat: loc.lat, lng: loc.lng });
            setPath((prev) => {
              const last = prev[prev.length - 1];
              if (last && last[0] === loc.lat && last[1] === loc.lng) return prev;
              return [...prev, [loc.lat, loc.lng]];
            });
            setLastUpdated(new Date());
            triggerLocationBasedEtaRefresh(loc);
          }
        } catch (e: any) {
          if (e.response?.status === 400) {
            // Live tracking closed by backend
            if (pollInterval.current) clearInterval(pollInterval.current);
          } else {
            console.error('Polling failed', e);
          }
        }
      }
    }, 10000);

    return () => {
      client.deactivate();
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [id, token]);

  // Offline checker
  useEffect(() => {
    const checkOffline = setInterval(() => {
      setLastUpdated(prev => {
        if (prev) {
          const diff = (Date.now() - prev.getTime()) / 1000;
          setIsOffline(diff > 30);
        }
        return prev;
      });
    }, 5000);
    return () => clearInterval(checkOffline);
  }, []);

  // Calculate haversine distance in meters to detect meaningful driver movement
  const getDriftDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const rad = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * rad;
  };

  // Backend Authoritative Route ETA fetch with out-of-order response guard
  const fetchRouteEta = useCallback(async () => {
    if (!id) return;
    if (donation?.status === 'DELIVERED' || donation?.status === 'REJECTED') return;

    const reqId = ++latestEtaRequestId.current;
    try {
      setEtaLoading(true);
      setEtaError(null);
      const data = await getDeliveryRouteEta(id);
      // Discard older asynchronous responses if a newer request was dispatched
      if (reqId === latestEtaRequestId.current) {
        setRouteEta(data);
        lastEtaFetchTime.current = Date.now();
        if (data.originLat && data.originLng) {
          lastEtaOrigin.current = { lat: data.originLat, lng: data.originLng };
        }
      }
    } catch (err: any) {
      if (reqId === latestEtaRequestId.current) {
        console.warn('Failed to fetch authoritative route ETA:', err?.message);
        setEtaError(err.message || 'Route ETA unavailable');
      }
    } finally {
      if (reqId === latestEtaRequestId.current) {
        setEtaLoading(false);
      }
    }
  }, [id, donation?.status]);

  const fetchRouteEtaRef = useRef(fetchRouteEta);
  useEffect(() => {
    fetchRouteEtaRef.current = fetchRouteEta;
  }, [fetchRouteEta]);

  // Recalculate ETA when fresh location arrives and driver has moved meaningfully
  const triggerLocationBasedEtaRefresh = useCallback((loc: { lat: number; lng: number }) => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastEtaFetchTime.current;

    // 1. Initial fix or recovery from offline/missing coordinates: refresh immediately (min 2s throttle)
    const isOfflineOrMissing = !routeEta || routeEta.routingStatus === 'DRIVER_OFFLINE' || routeEta.routingStatus === 'MISSING_COORDINATES';
    if (isOfflineOrMissing && timeSinceLastFetch > 2000) {
      fetchRouteEtaRef.current();
      return;
    }

    // 2. Driver moved meaningfully (>= 30 meters drift): recalculate ETA (min 5s throttle)
    const movedSignificantly = lastEtaOrigin.current
      ? getDriftDistanceMeters(loc.lat, loc.lng, lastEtaOrigin.current.lat, lastEtaOrigin.current.lng) >= 30
      : true;

    if (movedSignificantly && timeSinceLastFetch > 5000) {
      fetchRouteEtaRef.current();
      return;
    }

    // 3. Fallback periodic refresh if 30s elapsed
    if (timeSinceLastFetch > 30000) {
      fetchRouteEtaRef.current();
    }
  }, [routeEta]);

  useEffect(() => {
    if (!id) return;
    if (donation?.status === 'DELIVERED' || donation?.status === 'REJECTED') return;

    fetchRouteEta();

    // Auto-refresh every 30 seconds (matching backend 30s cache TTL)
    const interval = setInterval(fetchRouteEta, 30000);
    return () => clearInterval(interval);
  }, [id, fetchRouteEta, donation?.status]);

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
        <Navigation className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-slate-600 font-medium">Initializing live map tracker...</p>
      </div>
    );
  }

  const pickupPoint: [number, number] | null = donation?.pickupLat && donation?.pickupLng
    ? [donation.pickupLat, donation.pickupLng]
    : path.length > 0 ? path[0] : null;
  const ngoPoint: [number, number] | null = donation?.ngo?.latitude && donation?.ngo?.longitude
    ? [donation.ngo.latitude, donation.ngo.longitude]
    : null;
  const isRoutingToPickup = routeEta
    ? routeEta.destinationType === 'PICKUP'
    : (delivery?.status === 'ASSIGNED' || delivery?.status === 'ACCEPTED_BY_VOLUNTEER' || delivery?.status === 'EN_ROUTE_TO_PICKUP');

  const handleCompleteDelivery = async () => {
    if (!delivery || !otp || !proofImage) {
      setProofError('OTP and Proof Image are required');
      return;
    }
    if (otp.length !== 6) {
      setProofError('OTP must be 6 digits');
      return;
    }
    try {
      setSubmittingProof(true);
      setProofError(null);
      await completeDelivery(delivery.id, otp, proofImage);
      // Immediately stop live GPS broadcast
      stopTracking();
      // Refresh page data
      const updatedDonation = await getDonationById(id as string);
      setDonation(updatedDonation);
      setDelivery((prev) => (prev ? { ...prev, status: 'DELIVERED' } : null));
      if (pollInterval.current) clearInterval(pollInterval.current);
      showSuccess('Delivery completed and verified successfully! Returning to task list...');
      setTimeout(() => {
        navigate('/driver-dashboard?tab=my-tasks');
      }, 1500);
    } catch (err: any) {
      setProofError(err.response?.data?.message || err.message || 'Failed to complete delivery');
    } finally {
      setSubmittingProof(false);
    }
  };

  const isVolunteer = user?.role === 'VOLUNTEER';
  const showProofForm = isVolunteer && (donation?.status === 'PICKED_UP' || delivery?.status === 'PICKED_UP' || delivery?.status === 'EN_ROUTE_TO_NGO') && donation?.status !== 'DELIVERED';

  return (
    <div className="py-6 space-y-6 max-w-5xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <Navigation className="w-6 h-6 text-indigo-600" />
              Live Delivery Tracking
            </h1>
            <p className="text-sm text-slate-500">
              Donation Category: <span className="font-semibold text-slate-700">{donation?.category}</span>
            </p>
          </div>
        </div>

        {/* Route ETA Sync Indicator */}
        <div className="hidden sm:flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full text-xs font-medium text-indigo-700">
          <RefreshCw className={`w-3.5 h-3.5 ${etaLoading ? 'animate-spin' : ''}`} />
          Route ETA auto-refreshed (30s cache)
        </div>
      </div>

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Road distance remaining</p>
            <p className="text-xl font-black text-slate-900">
              {routeEta?.roadDistanceKm !== undefined && routeEta?.roadDistanceKm !== null
                ? `${routeEta.roadDistanceKm} km`
                : etaLoading ? 'Calculating...' : '—'}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Estimated arrival</p>
            <p className="text-xl font-black text-slate-900">
              {donation?.status === 'DELIVERED' || delivery?.status === 'DELIVERED' || routeEta?.routingStatus === 'DELIVERY_COMPLETED'
                ? 'Delivered'
                : routeEta?.routingStatus === 'DRIVER_OFFLINE'
                ? '—'
                : routeEta?.durationMinutes !== undefined && routeEta?.durationMinutes !== null
                ? `${routeEta.durationMinutes} min`
                : etaLoading ? 'Calculating...' : '—'}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Destination</p>
            <p className="text-sm font-bold text-slate-900 truncate">
              {routeEta?.destinationType === 'PICKUP' ? 'Pickup Location' : (donation?.ngo?.name || 'NGO Hub')}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {routeEta?.destinationAddress || (routeEta?.destinationType === 'PICKUP' ? donation?.pickupAddress : donation?.ngo?.address) || 'Address not provided'}
            </p>
          </div>
        </div>
      </div>

      {/* ETA Disclaimer / Traffic Awareness Banner */}
      {routeEta && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-indigo-600 shrink-0" />
            <div className="flex flex-wrap items-center gap-2">
              <span>
                {routeEta.routingStatus === 'FALLBACK_ESTIMATE'
                  ? 'Estimated distance based on urban road network factor (OSRM route unavailable)'
                  : routeEta.routingStatus === 'DRIVER_OFFLINE'
                  ? 'Waiting for driver GPS location...'
                  : routeEta.routingStatus === 'MISSING_COORDINATES'
                  ? 'Destination coordinates unavailable for road routing'
                  : routeEta.routingStatus === 'DELIVERY_COMPLETED'
                  ? 'Delivery completed'
                  : routeEta.statusMessage || 'Road routing active'}
              </span>
              {!routeEta.trafficAware && (
                <span className="text-slate-500 font-normal">
                  &bull; ETA based on road routing — live traffic not available
                </span>
              )}
            </div>
          </div>
          {routeEta.calculatedAt && (
            <span className="text-[11px] text-slate-400 font-mono">
              Updated: {new Date(routeEta.calculatedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {/* Stale GPS Warning Banner */}
      {(routeEta?.staleGps || isOffline) && donation?.status !== 'DELIVERED' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-2xl text-xs flex items-center gap-2.5 shadow-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="font-medium">
            Warning: Location update is delayed (Driver offline). Displayed position and ETA may not reflect real-time conditions.
          </span>
        </div>
      )}

      {/* Volunteer Live Tracking Controller */}
      {isVolunteer && delivery && donation?.status !== 'DELIVERED' && donation?.status !== 'REJECTED' && (
        <div className="bg-white rounded-3xl p-5 border border-[#E5E7EB] shadow-[0_10px_15px_-3px_rgba(17,24,39,0.04)]">
          <LiveLocationTracker deliveryId={delivery.id} status={delivery.status} donation={donation || undefined} />
        </div>
      )}

      {/* Delivery Completed Banner */}
      {(donation?.status === 'DELIVERED' || delivery?.status === 'DELIVERED') && (
        <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-emerald-900">Delivery Completed & Verified</h3>
              <p className="text-xs text-emerald-700">This donation pickup and dropoff has been finalized and verified by the recipient NGO.</p>
            </div>
          </div>
          {isVolunteer && (
            <button
              onClick={() => navigate('/driver-dashboard?tab=my-tasks')}
              className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0"
            >
              Back to My Tasks
            </button>
          )}
        </div>
      )}

      {/* Proof of Delivery Panel */}
      {showProofForm && (
        <div className="bg-white rounded-3xl p-6 text-[#111827] shadow-[0_10px_15px_-3px_rgba(17,24,39,0.04)] border border-[#E5E7EB]">
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
            <div className="space-y-2 flex-1">
              <h2 className="text-xl font-bold flex items-center gap-2 text-[#111827]">
                <CheckCircle className="text-emerald-600 w-6 h-6" />
                Complete Delivery
              </h2>
              <p className="text-[#4B5563] text-sm">
                You have reached the NGO! To finalize this delivery, ask the NGO receiver to enter the OTP shown below, and upload a photo of the handed-over items.
              </p>
            </div>

            <div className="bg-[#F9FAFB] rounded-2xl p-5 border border-[#E5E7EB] shadow-sm w-full md:w-[400px] text-[#111827]">
              <h3 className="font-bold mb-4 text-[#111827] border-b border-[#E5E7EB] pb-2">Verification Form</h3>
              
              {proofError && (
                <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-sm rounded-xl border border-rose-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{proofError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#4B5563] uppercase tracking-wider mb-2">Enter NGO OTP</label>
                  <div className="flex justify-center bg-white rounded-xl p-3 border border-[#E5E7EB] shadow-xs">
                    <OtpInput value={otp} onChange={setOtp} length={6} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4B5563] uppercase tracking-wider mb-1">Delivery Photo</label>
                  <label className="flex items-center justify-center w-full h-24 border-2 border-[#E5E7EB] border-dashed rounded-xl cursor-pointer hover:bg-[#F4F2FA] hover:border-[#7567E8] transition-colors bg-white">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-[#6B7280]">
                      <Upload className="w-6 h-6 mb-2 text-[#7567E8]" />
                      <p className="text-sm font-semibold">{proofImage ? proofImage.name : 'Tap to upload photo'}</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => setProofImage(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>

                <button
                  onClick={handleCompleteDelivery}
                  disabled={submittingProof || !otp || !proofImage || otp.length !== 6}
                  className="w-full py-3 bg-[#7567E8] hover:bg-[#7567E8]/90 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-bold shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  {submittingProof ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  {submittingProof ? 'Verifying...' : 'Complete Delivery'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
        {/* Status Bar */}
        <div className="bg-white border-b border-[#E5E7EB] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
              <img src="https://cdn-icons-png.flaticon.com/512/3233/3233967.png" alt="truck" className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-[#111827] flex items-center gap-2">
                {donation?.status === 'DELIVERED' ? (
                  <span className="text-emerald-700">Delivery Completed</span>
                ) : donation?.status === 'REJECTED' ? (
                  <span className="text-rose-700">Delivery Cancelled</span>
                ) : delivery?.status === 'ASSIGNED' ? (
                  <span className="text-amber-700">Awaiting Volunteer Assignment</span>
                ) : delivery?.status === 'ACCEPTED_BY_VOLUNTEER' ? (
                  <span className="text-indigo-700">Volunteer Assigned (Pre-Trip)</span>
                ) : (
                  'Volunteer En Route'
                )}
                {donation?.status === 'DELIVERED' ? (
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Delivered
                  </span>
                ) : isOffline ? (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Offline (Signal Inactive)
                  </span>
                ) : currentLoc ? (
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" /> Live GPS
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Pending Signal
                  </span>
                )}
              </h3>
              <p className="text-xs text-[#6B7280] font-mono mt-1">
                {donation?.status === 'DELIVERED'
                  ? 'Delivery completed and verified.'
                  : currentLoc && lastUpdated
                  ? `Last GPS Signal: ${lastUpdated.toLocaleTimeString()}`
                  : delivery?.status === 'ASSIGNED'
                  ? 'Accepted by NGO. Pickup open for volunteer claiming.'
                  : 'Waiting for driver to initiate GPS broadcast...'}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1 text-xs font-semibold text-[#4B5563]">
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-rose-500" /> Pickup Location</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-600" /> {donation?.ngo?.name || 'NGO Hub'}</span>
          </div>
        </div>

        {/* Map Container */}
        <div
          ref={mapContainerRef}
          data-testid="track-map-wrapper"
          className={
            isMapFullscreen
              ? "fixed inset-0 z-[9999] w-screen h-screen m-0 p-0 bg-slate-100 flex flex-col pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]"
              : "h-[520px] w-full z-0 relative bg-slate-100"
          }
        >
          {isMapFullscreen && (
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-[1000] bg-white/95 backdrop-blur-md border border-[#E5E7EB] rounded-2xl p-2.5 sm:p-3 shadow-xl max-w-[280px] sm:max-w-sm flex flex-col gap-1 pointer-events-auto">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#111827] truncate">
                  {donation?.category ? `${donation.category} Donation` : 'Live Delivery'}
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#7567E8] text-white shrink-0">
                  {donation?.status === 'DELIVERED'
                    ? 'Delivered'
                    : routeEta && routeEta.durationMinutes !== null && routeEta.durationMinutes !== undefined
                    ? `ETA: ${routeEta.durationMinutes}m`
                    : 'Tracking'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[#4B5563]">
                <span className="font-semibold text-[#7567E8]">
                  {routeEta?.destinationType === 'NGO_HUB'
                    ? 'NGO Hub'
                    : routeEta?.destinationType === 'PICKUP'
                    ? 'Pickup'
                    : donation?.status === 'PICKED_UP'
                    ? 'NGO Hub'
                    : 'Pickup'}
                </span>
                {routeEta?.roadDistanceKm !== null && routeEta?.roadDistanceKm !== undefined ? (
                  <span>• {routeEta.roadDistanceKm.toFixed(1)} km</span>
                ) : null}
                <span>• {currentLoc ? 'Live GPS' : 'Signal pending'}</span>
              </div>
            </div>
          )}
          <MapContainer
            center={currentLoc ? [currentLoc.lat, currentLoc.lng] : (pickupPoint || ngoPoint || [12.9716, 77.5946])}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <MapControls
              containerRef={mapContainerRef}
              isFullscreen={isMapFullscreen}
              onFullscreenChange={setIsMapFullscreen}
            />
            {currentLoc && <MapPanController center={[currentLoc.lat, currentLoc.lng]} />}
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {/* Pickup Marker */}
            {pickupPoint && (
              <Marker position={pickupPoint}>
                <Popup>
                  <div className="p-1">
                    <p className="font-bold text-slate-900">Pickup Location</p>
                    <p className="text-xs text-slate-600">{donation?.pickupAddress || 'No exact address'}</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Destination NGO Marker */}
            {ngoPoint && (
              <Marker position={ngoPoint}>
                <Popup>
                  <div className="p-1">
                    <p className="font-bold text-slate-900">{donation?.ngo?.name || 'NGO Hub'}</p>
                    <p className="text-xs text-slate-600">{donation?.ngo?.address || 'Address not provided'}</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Authoritative Route Polyline */}
            {routeEta?.routeCoordinates && routeEta.routeCoordinates.length > 0 && (
              <Polyline
                positions={routeEta.routeCoordinates}
                color="#6366f1"
                weight={6}
                opacity={0.85}
                dashArray={routeEta.routingStatus === 'FALLBACK_ESTIMATE' ? '8, 8' : undefined}
              />
            )}

            {/* Traveled GPS History Path Polyline */}
            {path.length > 1 && (
              <Polyline positions={path} color="#10b981" weight={4} opacity={0.9} />
            )}

            {/* Driver Truck Marker */}
            {currentLoc && (
              <Marker position={[currentLoc.lat, currentLoc.lng]} icon={truckIcon}>
                <Popup>Volunteer Current Location</Popup>
              </Marker>
            )}
          </MapContainer>

          {!currentLoc && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur-sm border border-[#E5E7EB] text-[#111827] px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg">
              <Navigation className="w-4 h-4 text-amber-500 animate-pulse" />
              <span>
                {delivery?.status === 'ASSIGNED'
                  ? 'Pickup open — Waiting for a volunteer delivery partner to claim.'
                  : delivery?.status === 'ACCEPTED_BY_VOLUNTEER'
                  ? 'Delivery partner assigned — Waiting for trip to begin.'
                  : donation?.status === 'DELIVERED'
                  ? 'Delivery complete — Route saved.'
                  : 'Waiting for live GPS coordinates from delivery partner...'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
