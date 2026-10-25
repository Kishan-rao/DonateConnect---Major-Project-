import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getMyVolunteerTasks, getAvailablePickups, claimVolunteerPickup, updateVolunteerTaskStatus } from '../api/volunteerApi';
import { Donation, PageResponse, VolunteerTask } from '../types';
import { useToast } from '../context/ToastContext';
import { Truck, CheckCircle2, MapPin, Calendar, Clock, RefreshCw, PackageSearch, ChevronRight } from 'lucide-react';
import { LiveLocationTracker } from '../components/LiveLocationTracker';
type DashboardTab = 'my-tasks' | 'available';

export const isTaskActive = (t: VolunteerTask): boolean => {
  if (t.status === 'COMPLETED' || t.status === 'CANCELLED') return false;
  if (t.deliveryStatus === 'DELIVERED' || t.deliveryStatus === 'CANCELLED') return false;
  if (t.donation && (t.donation.status === 'DELIVERED' || t.donation.status === 'REJECTED')) return false;
  return t.status === 'CLAIMED' || t.status === 'IN_TRANSIT';
};

export const DriverDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab: DashboardTab = searchParams.get('tab') === 'available' ? 'available' : 'my-tasks';
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);
  const [tasks, setTasks] = useState<VolunteerTask[]>([]);
  const [available, setAvailable] = useState<PageResponse<Donation> | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  const fetchMyTasks = async () => {
    try {
      const data = await getMyVolunteerTasks(true);
      setTasks(data.filter(isTaskActive));
    } catch {
      showError('Failed to load volunteer tasks');
    }
  };

  const fetchAvailable = async (page = 0) => {
    try {
      const data = await getAvailablePickups(page, 20);
      setAvailable(data);
    } catch {
      showError('Failed to load available pickups');
    }
  };

  // On mount: fetch both tasks and available pickups so tab counts are accurate immediately
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await Promise.all([fetchMyTasks(), fetchAvailable()]);
      setLoading(false);
    };
    loadInitialData();
  }, []);

  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'available' ? { tab: 'available' } : {});
    if (tab === 'my-tasks') {
      fetchMyTasks();
    } else {
      fetchAvailable();
    }
  };

  const handleStatusChange = async (taskId: string, status: VolunteerTask['status']) => {
    try {
      const updated = await updateVolunteerTaskStatus(taskId, status);
      setTasks((prev) =>
        prev
          .map((t) => (t.id === taskId ? updated : t))
          .filter(isTaskActive)
      );
      showSuccess(`Task updated to ${status}`);
    } catch (err: any) {
      showError(err.message || 'Failed to update task status');
    }
  };

  const handleClaim = async (donationId: string) => {
    setClaiming(donationId);
    try {
      await claimVolunteerPickup(donationId);
      showSuccess('Pickup claimed successfully!');
      await Promise.all([fetchMyTasks(), fetchAvailable()]);
      handleTabChange('my-tasks');
    } catch (err: any) {
      showError(err.message || 'Failed to claim pickup');
    } finally {
      setClaiming(null);
    }
  };

  const tabButtonClass = (tab: DashboardTab) =>
    `w-full sm:w-auto px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center ${
      activeTab === tab
        ? 'bg-[#7567E8] text-white shadow-sm'
        : 'bg-white text-[#4B5563] hover:text-[#111827] hover:bg-[#F4F2FA] border border-[#E5E7EB]'
    }`;

  return (
    <div className="space-y-6 py-6 max-w-7xl mx-auto px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#111827] tracking-tight flex items-center gap-3">
            <Truck className="w-8 h-8 text-amber-500" />
            Delivery Partner Console
          </h1>
          <p className="text-[#4B5563] text-sm mt-1">
            Claim and manage donation pickups from donors to NGO partners
          </p>
        </div>

        <button
          onClick={async () => {
            setLoading(true);
            await Promise.all([fetchMyTasks(), fetchAvailable()]);
            setLoading(false);
          }}
          disabled={loading}
          className="p-2.5 rounded-xl bg-white text-[#4B5563] hover:text-[#111827] hover:bg-[#F4F2FA] transition-colors border border-[#E5E7EB] self-start md:self-auto shadow-xs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
        <button onClick={() => handleTabChange('my-tasks')} className={tabButtonClass('my-tasks')}>
          <span>My Tasks</span>
          {tasks.length > 0 && <span className="ml-1.5 text-xs bg-black/10 px-1.5 py-0.5 rounded font-mono">{tasks.length}</span>}
        </button>
        <button onClick={() => handleTabChange('available')} className={tabButtonClass('available')}>
          <PackageSearch className="w-4 h-4 inline mr-1.5 shrink-0" />
          <span>Available Pickups</span>
          {available && <span className="ml-1.5 text-xs bg-black/10 px-1.5 py-0.5 rounded font-mono">{available.totalElements}</span>}
        </button>
      </div>

      {/* ---- MY TASKS TAB ---- */}
      {activeTab === 'my-tasks' && (
        <>
          {loading ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#E5E7EB] text-[#4B5563] text-sm shadow-xs">
              Loading your dispatch routes...
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#E5E7EB] space-y-3 shadow-xs">
              <Truck className="w-12 h-12 text-[#9CA3AF] mx-auto" />
              <h3 className="text-[#111827] font-semibold text-base">No active pickup assignments</h3>
              <p className="text-[#4B5563] text-xs max-w-sm mx-auto">
                Browse <button onClick={() => handleTabChange('available')} className="text-[#7567E8] font-semibold hover:underline">Available Pickups</button>{available && available.totalElements > 0 ? ` (${available.totalElements} waiting)` : ''} to claim your next delivery.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  data-testid={`delivery-card-${task.donation.id}`}
                  className="delivery-card bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-6 flex flex-col justify-between space-y-4 shadow-[0_10px_15px_-3px_rgba(17,24,39,0.04)]"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                        {task.donation.category}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                        {task.status}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[#111827] mb-1">
                      → {task.donation.ngo?.name}
                    </h3>
                    <p className="text-xs text-[#4B5563] mb-3">{task.donation.description || 'Standard packaged donation.'}</p>

                    <div className="bg-[#F9FAFB] p-3 rounded-xl border border-[#E5E7EB] text-xs text-[#4B5563] space-y-1.5">
                      <div className="flex items-start gap-1.5 text-[#374151]">
                        <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                        <span><strong>Pickup:</strong> {task.donation.pickupAddress || 'Address not provided'}</span>
                      </div>
                      <div className="flex items-start gap-1.5 text-[#374151]">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span><strong>Dropoff (NGO):</strong> {task.donation.ngo?.address}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#374151]">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                        <span><strong>Schedule:</strong> {task.donation.pickupDate || 'Flexible'} {task.donation.pickupTimeSlot ? `(${task.donation.pickupTimeSlot.replace(/_/g, ' ')})` : ''}</span>
                      </div>
                      {task.routeNotes && (
                        <div className="flex items-center gap-1.5 text-[#4B5563]">
                          <Clock className="w-3.5 h-3.5 text-[#6B7280]" />
                          <span><strong>Notes:</strong> {task.routeNotes}</span>
                        </div>
                      )}
                    </div>

                    {isTaskActive(task) && task.deliveryId && (
                      <LiveLocationTracker deliveryId={task.deliveryId} status={task.status} donation={task.donation} />
                    )}
                  </div>

                  {isTaskActive(task) && (
                    <div className="border-t border-[#E5E7EB] pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                      <button
                        data-testid={`transit-button-${task.donation.id}`}
                        onClick={() => handleStatusChange(task.id, 'IN_TRANSIT')}
                        disabled={task.status !== 'CLAIMED'}
                        className="w-full sm:flex-1 min-h-[44px] py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        🚚 Mark In-Transit
                      </button>
                      <button
                        data-testid={`complete-button-${task.donation.id}`}
                        onClick={() => navigate(`/donations/${task.donation.id}/track`)}
                        disabled={task.status !== 'CLAIMED' && task.status !== 'IN_TRANSIT'}
                        className="w-full sm:flex-1 min-h-[44px] py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Complete via Tracking</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ---- AVAILABLE PICKUPS TAB ---- */}
      {activeTab === 'available' && (
        <>
          {loading ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#E5E7EB] text-[#4B5563] text-sm shadow-xs">
              Loading available pickups...
            </div>
          ) : !available || available.content.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#E5E7EB] space-y-3 shadow-xs">
              <PackageSearch className="w-12 h-12 text-[#9CA3AF] mx-auto" />
              <h3 className="text-[#111827] font-semibold text-base">No available pickups right now</h3>
              <p className="text-[#4B5563] text-xs max-w-sm mx-auto">
                Check back later — new accepted donations appear here when NGOs approve them.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {available.content.map((donation) => (
                  <div
                    key={donation.id}
                    data-testid={`available-card-${donation.id}`}
                    className="delivery-card bg-white border border-[#E5E7EB] rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-[#7567E8] transition-colors shadow-[0_10px_15px_-3px_rgba(17,24,39,0.04)]"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                          {donation.category}
                        </span>
                        <span className="text-xs text-[#6B7280] font-mono">{donation.id.substring(0, 8)}...</span>
                      </div>
                      <h3 className="text-sm font-bold text-[#111827] mb-1">{donation.ngo?.name}</h3>
                      <p className="text-xs text-[#4B5563] line-clamp-2">{donation.description}</p>

                      <div className="flex flex-col gap-1.5 mt-3 text-xs text-[#4B5563]">
                        <span className="flex items-start gap-1">
                          <MapPin className="w-3 h-3 shrink-0 mt-0.5 text-[#6B7280]" />
                          Pickup: {donation.pickupAddress || 'Not provided'}
                        </span>
                        <span className="flex items-start gap-1">
                          <MapPin className="w-3 h-3 shrink-0 mt-0.5 text-emerald-600" />
                          NGO: {donation.ngo?.address || 'N/A'}
                        </span>
                        {donation.pickupDate && (
                          <span className="flex items-center gap-1 text-amber-700">
                            <Calendar className="w-3 h-3" />
                            {donation.pickupDate} {donation.pickupTimeSlot ? `(${donation.pickupTimeSlot.replace(/_/g, ' ')})` : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      data-testid="claim-pickup-btn"
                      onClick={() => handleClaim(donation.id)}
                      disabled={claiming === donation.id}
                      className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#7567E8] hover:bg-[#7567E8]/90 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
                    >
                      {claiming === donation.id ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Claiming...
                        </>
                      ) : (
                        <>
                          <ChevronRight className="w-3.5 h-3.5" />
                          Claim Pickup
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {available.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button
                    onClick={() => fetchAvailable(available.number - 1)}
                    disabled={available.number === 0}
                    className="px-4 py-2 rounded-xl bg-white border border-[#E5E7EB] text-[#374151] text-xs font-semibold disabled:opacity-40 hover:bg-[#F4F2FA] transition-colors shadow-xs"
                  >
                    ← Previous
                  </button>
                  <span className="text-xs text-[#4B5563]">
                    Page {available.number + 1} of {available.totalPages}
                  </span>
                  <button
                    onClick={() => fetchAvailable(available.number + 1)}
                    disabled={available.number >= available.totalPages - 1}
                    className="px-4 py-2 rounded-xl bg-white border border-[#E5E7EB] text-[#374151] text-xs font-semibold disabled:opacity-40 hover:bg-[#F4F2FA] transition-colors shadow-xs"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};
