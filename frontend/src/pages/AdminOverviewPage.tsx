import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminStats, getPendingUsers, approveUser } from '../api/adminApi';
import { AdminStats, User } from '../types';
import { Shield, Building2, PackageCheck, Clock, CheckCircle2, RefreshCw, ArrowRight, Layers, UserCheck, Download, BarChart2, TrendingUp, PieChart as PieChartIcon } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

export const AdminOverviewPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, pendingData] = await Promise.all([
        getAdminStats(),
        getPendingUsers()
      ]);
      setStats(statsData);
      setPendingUsers(pendingData);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin statistics.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    setActionLoading(userId);
    try {
      await approveUser(userId);
      setPendingUsers(pendingUsers.filter(u => u.id !== userId));
    } catch (err: any) {
      alert(err.message || 'Failed to approve user');
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const downloadCSV = () => {
    if (!stats) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Overview
    csvContent += "Overview\nMetric,Value\n";
    csvContent += `Total Donations,${stats.totalDonations}\n`;
    csvContent += `Verified NGOs,${stats.verifiedNgos}\n`;
    csvContent += `Pending Requests,${stats.pendingRequests}\n`;
    csvContent += `Completed Deliveries,${stats.completedDeliveries}\n`;
    csvContent += `Delivery Success Rate (%),${stats.deliverySuccessRate?.toFixed(2) || 0}\n`;
    csvContent += `Avg Delivery Time (Hours),${stats.averageDeliveryTimeHours?.toFixed(2) || 0}\n\n`;

    // Donations By Category
    csvContent += "Donations By Category\nCategory,Count\n";
    if (stats.donationsByCategory) {
      Object.entries(stats.donationsByCategory).forEach(([category, count]) => {
        csvContent += `${category},${count}\n`;
      });
    }
    
    // Top Donors
    csvContent += "\nTop Donors\nName,Donation Count\n";
    if (stats.topDonors) {
      stats.topDonors.forEach(donor => {
        csvContent += `${donor.name},${donor.donations}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `admin_stats_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const chartDataByDate = stats?.donationsByDate 
    ? Object.keys(stats.donationsByDate).map(key => ({ date: key, count: stats.donationsByDate![key] }))
    : [];

  const chartDataByCategory = stats?.donationsByCategory 
    ? Object.keys(stats.donationsByCategory).map(key => ({ name: key, count: stats.donationsByCategory![key] }))
    : [];

  const chartDataByCity = stats?.donationsByCity 
    ? Object.keys(stats.donationsByCity).map(key => ({ name: key, count: stats.donationsByCity![key] }))
    : [];

  const COLORS = ['#7567E8', '#059669', '#F59E0B', '#DC2626', '#3B82F6', '#8B5CF6'];

  return (
    <div className="space-y-8 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#111827] tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-rose-600" />
            Admin Overview & Analytics
          </h1>
          <p className="text-[#4B5563] text-sm mt-1">
            System-wide donation, partner, and fulfillment statistics
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={downloadCSV}
            disabled={loading || !stats}
            className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200 flex items-center gap-2 text-xs font-semibold shadow-xs"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white text-[#4B5563] hover:text-[#111827] hover:bg-[#F4F2FA] transition-colors border border-[#E5E7EB] flex items-center gap-2 text-xs font-semibold shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Stats
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-[#E5E7EB] rounded-2xl p-6 h-36 animate-pulse shadow-xs" />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center text-rose-700 space-y-3">
          <p className="font-semibold">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-semibold transition-colors"
          >
            Retry Connection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Donations */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 hover:border-[#7567E8] transition-all flex flex-col justify-between space-y-4 shadow-[0_10px_15px_-3px_rgba(17,24,39,0.04)]">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-[#7567E8]/10 text-[#7567E8] border border-[#7567E8]/20">
                <Layers className="w-6 h-6" />
              </div>
              <span className="text-3xl font-extrabold text-[#111827]">{stats?.totalDonations || 0}</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Total Donations</h3>
              <p className="text-xs text-[#6B7280] mt-0.5">All submitted requests across platform</p>
            </div>
          </div>

          {/* Active/Verified NGOs */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 hover:border-emerald-500 transition-all flex flex-col justify-between space-y-4 shadow-[0_10px_15px_-3px_rgba(17,24,39,0.04)]">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <Building2 className="w-6 h-6" />
              </div>
              <span className="text-3xl font-extrabold text-[#111827]">{stats?.verifiedNgos || 0}</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Verified NGOs</h3>
              <p className="text-xs text-[#6B7280] mt-0.5">Active non-profit organization partners</p>
            </div>
          </div>

          {/* Pending Requests */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 hover:border-amber-500 transition-all flex flex-col justify-between space-y-4 shadow-[0_10px_15px_-3px_rgba(17,24,39,0.04)]">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                <Clock className="w-6 h-6" />
              </div>
              <span className="text-3xl font-extrabold text-[#111827]">{stats?.pendingRequests || 0}</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Pending Requests</h3>
              <p className="text-xs text-[#6B7280] mt-0.5">Donation requests awaiting NGO response</p>
            </div>
          </div>

          {/* Completed Deliveries */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 hover:border-blue-500 transition-all flex flex-col justify-between space-y-4 shadow-[0_10px_15px_-3px_rgba(17,24,39,0.04)]">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <span className="text-3xl font-extrabold text-[#111827]">{stats?.completedDeliveries || 0}</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Completed Deliveries</h3>
              <p className="text-xs text-[#6B7280] mt-0.5">Fully fulfilled and delivered donations</p>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Charts */}
      {!loading && stats && (
        <div className="space-y-6 pt-4">
          
          {/* Top Line Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-[#111827] mb-6 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#7567E8]" />
                Donations Over Time
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartDataByDate}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="date" stroke="#6B7280" fontSize={12} tickFormatter={(val) => val.substring(5)} />
                    <YAxis stroke="#6B7280" fontSize={12} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                    <Line type="monotone" dataKey="count" stroke="#7567E8" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-[#111827] mb-6 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-emerald-600" />
                Donations By Category
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartDataByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                    >
                      {chartDataByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-[#111827] mb-6 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-amber-600" />
                Donations by City
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataByCity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
                    <YAxis stroke="#6B7280" fontSize={12} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-6">
              <h3 className="text-sm font-bold text-[#111827] mb-4 flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-rose-500" />
                Delivery Performance Metrics
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E7EB]">
                  <p className="text-xs text-[#6B7280] mb-1">Success Rate</p>
                  <p className="text-3xl font-extrabold text-emerald-600">{stats.deliverySuccessRate?.toFixed(1)}<span className="text-xl">%</span></p>
                </div>
                <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E7EB]">
                  <p className="text-xs text-[#6B7280] mb-1">Avg Delivery Time</p>
                  <p className="text-3xl font-extrabold text-[#7567E8]">{stats.averageDeliveryTimeHours?.toFixed(1)}<span className="text-sm font-normal text-[#6B7280] ml-1">hrs</span></p>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E5E7EB] grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#6B7280] mb-2 font-semibold">Top Donors</p>
                  <ul className="space-y-1">
                    {stats.topDonors?.map((d, i) => (
                      <li key={i} className="text-xs text-[#374151] flex justify-between">
                        <span className="truncate pr-2">{i+1}. {d.name}</span>
                        <span className="font-bold text-[#7567E8]">{d.donations}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-2 font-semibold">Top NGOs</p>
                  <ul className="space-y-1">
                    {stats.topNgos?.map((n, i) => (
                      <li key={i} className="text-xs text-[#374151] flex justify-between">
                        <span className="truncate pr-2">{i+1}. {n.name}</span>
                        <span className="font-bold text-emerald-600">{n.donations}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
        <Link
          to="/admin/ngos"
          className="group bg-white border border-[#E5E7EB] hover:border-[#7567E8] rounded-2xl p-6 transition-all flex items-center justify-between shadow-xs"
        >
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#111827] group-hover:text-[#7567E8] transition-colors flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#7567E8]" />
              Manage NGO Partners
            </h3>
            <p className="text-xs text-[#4B5563]">
              Create new NGO accounts, toggle verified status, and manage partner accounts.
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-[#9CA3AF] group-hover:text-[#7567E8] group-hover:translate-x-1 transition-all shrink-0 ml-4" />
        </Link>

        <Link
          to="/admin/donations"
          className="group bg-white border border-[#E5E7EB] hover:border-[#7567E8] rounded-2xl p-6 transition-all flex items-center justify-between shadow-xs"
        >
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#111827] group-hover:text-[#7567E8] transition-colors flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-[#7567E8]" />
              Audit All Donations
            </h3>
            <p className="text-xs text-[#4B5563]">
              View paginated table of all donations with filters for status, category, and NGO.
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-[#9CA3AF] group-hover:text-[#7567E8] group-hover:translate-x-1 transition-all shrink-0 ml-4" />
        </Link>

        <Link
          to="/admin/audit"
          className="group bg-white border border-[#E5E7EB] hover:border-rose-500 rounded-2xl p-6 transition-all flex items-center justify-between md:col-span-2 shadow-xs"
        >
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#111827] group-hover:text-rose-600 transition-colors flex items-center gap-2">
              <Shield className="w-5 h-5 text-rose-600" />
              Security & Audit Logs
            </h3>
            <p className="text-xs text-[#4B5563]">
              Monitor sensitive system events like verification, delivery updates, and role changes.
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-[#9CA3AF] group-hover:text-rose-600 group-hover:translate-x-1 transition-all shrink-0 ml-4" />
        </Link>
      </div>

      {/* Pending Approvals Section */}
      <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 md:p-8 mt-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-[#7567E8]/10 text-[#7567E8] border border-[#7567E8]/20">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#111827]">Pending User Approvals</h2>
            <p className="text-sm text-[#4B5563]">Approve new Donors, NGOs, and Delivery drivers.</p>
          </div>
        </div>

        {loading ? (
          <div className="h-24 bg-[#F3F4F6] rounded-xl animate-pulse" />
        ) : pendingUsers.length === 0 ? (
          <div className="text-center py-12 bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB]">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-60" />
            <p className="text-[#4B5563] font-medium">No pending approvals.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingUsers.map(user => (
              <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] hover:border-[#7567E8] transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-[#111827]">{user.fullName}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-white text-[#4B5563] border border-[#E5E7EB]">
                      {user.role}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B7280]">{user.email} • Joined {new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => handleApprove(user.id)}
                  disabled={actionLoading === user.id}
                  className="px-4 py-2 rounded-xl bg-[#7567E8] hover:bg-[#7567E8]/90 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 min-w-[120px]"
                >
                  {actionLoading === user.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Approve
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
