import React, { useEffect, useState } from 'react';
import { getCorporateDrives, createCorporateDrive } from '../api/corporateApi';
import { CorporateDrive } from '../types';
import { Building2, Calendar, Target, Award, Download, CheckCircle2, Plus, X, Users, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const CorporateDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [drives, setDrives] = useState<CorporateDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Form states
  const [companyName, setCompanyName] = useState(user?.fullName || '');
  const [campaignTitle, setCampaignTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetItemCount, setTargetItemCount] = useState<number>(500);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchDrives = () => {
    getCorporateDrives()
      .then((data) => setDrives(data))
      .catch(() => setDrives([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDrives();
  }, []);

  const handleCreateDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await createCorporateDrive({
        companyName,
        campaignTitle,
        description,
        targetItemCount,
        startDate,
        endDate
      });
      setIsAddModalOpen(false);
      setCampaignTitle('');
      setDescription('');
      fetchDrives();
    } catch (err: any) {
      alert(err.message || 'Failed to create drive');
    } finally {
      setCreateLoading(false);
    }
  };

  const exportCSRReport = () => {
    if (drives.length === 0) {
      alert("No active drives to export.");
      return;
    }

    let csv = "Company Name,Campaign Title,Description,Start Date,End Date,Target Items,Collected Items,CO2 Offset (kg)\n";
    let totalItems = 0;
    
    drives.forEach(d => {
      totalItems += d.collectedItemCount;
      const co2 = d.collectedItemCount * 4.2;
      csv += `"${d.companyName}","${d.campaignTitle}","${(d.description || '').replace(/"/g, '""')}","${d.startDate}","${d.endDate}",${d.targetItemCount},${d.collectedItemCount},${co2.toFixed(1)}\n`;
    });

    csv += `\nTOTAL COLLECTED,${totalItems}\n`;
    csv += `TOTAL CO2 OFFSET (kg),${(totalItems * 4.2).toFixed(1)}\n`;

    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CSR_Impact_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalCollected = drives.reduce((sum, drive) => sum + drive.collectedItemCount, 0);
  const activeDrivesCount = drives.length;

  return (
    <div className="space-y-8 py-6 max-w-7xl mx-auto px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#111827] tracking-tight flex items-center gap-3">
            <Building2 className="w-8 h-8 text-purple-600" />
            Corporate CSR & Sustainability Console
          </h1>
          <p className="text-[#4B5563] text-sm mt-1">
            Enterprise CSR dashboard for corporate donation drives, employee involvement, and ESG compliance reports
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#374151] text-xs font-bold flex items-center gap-2 border border-[#E5E7EB] transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
          <button
            onClick={exportCSRReport}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-purple-600/20 transition-all"
          >
            <Download className="w-4 h-4" />
            Export CSR Report
          </button>
        </div>
      </div>

      {/* Team Contribution Summary */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-[#6B7280] font-semibold mb-1">Active Campaigns</p>
              <h3 className="text-2xl font-bold text-[#111827]">{activeDrivesCount}</h3>
            </div>
          </div>
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-[#6B7280] font-semibold mb-1">Total Items Donated</p>
              <h3 className="text-2xl font-bold text-[#111827]">{totalCollected}</h3>
            </div>
          </div>
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-[#7567E8] border border-indigo-200 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-[#6B7280] font-semibold mb-1">CO₂ Offset Estimate</p>
              <h3 className="text-2xl font-bold text-[#111827]">{(totalCollected * 4.2).toFixed(1)} kg</h3>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB] text-[#6B7280] text-sm">
          Loading corporate CSR campaign drives...
        </div>
      ) : drives.length === 0 ? (
        <div className="text-center py-16 bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB] space-y-3">
          <Building2 className="w-12 h-12 text-[#9CA3AF] mx-auto" />
          <h3 className="text-[#111827] font-semibold text-base">No active corporate CSR drives</h3>
          <p className="text-[#6B7280] text-xs max-w-sm mx-auto">
            Corporate accounts can create company-wide donation goals for employees.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {drives.map((drive) => {
            const progress = Math.min(100, Math.round((drive.collectedItemCount / drive.targetItemCount) * 100));
            return (
              <div
                key={drive.id}
                className="bg-white border border-[#E5E7EB] rounded-2xl p-6 space-y-4 shadow-sm"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#E5E7EB] pb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200">
                      {drive.companyName}
                    </span>
                    <h3 className="text-xl font-extrabold text-[#111827] mt-1">{drive.campaignTitle}</h3>
                  </div>
                  <div className="text-xs text-[#6B7280] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span>{drive.startDate} &mdash; {drive.endDate}</span>
                  </div>
                </div>

                <p className="text-xs text-[#4B5563] leading-relaxed">{drive.description}</p>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-[#6B7280]">Campaign Target Progress</span>
                    <span className="text-purple-700 font-bold">
                      {drive.collectedItemCount} / {drive.targetItemCount} Items ({progress}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#F3F4F6] h-3 rounded-full overflow-hidden border border-[#E5E7EB]">
                    <div
                      className="bg-gradient-to-r from-purple-600 via-[#7567E8] to-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-2 text-center text-xs">
                  <div className="bg-[#F9FAFB] p-3 rounded-xl border border-[#E5E7EB]">
                    <div className="text-[#6B7280]">Items Donated</div>
                    <div className="text-lg font-bold text-[#111827]">{drive.collectedItemCount}</div>
                  </div>
                  <div className="bg-[#F9FAFB] p-3 rounded-xl border border-[#E5E7EB]">
                    <div className="text-[#6B7280]">CO₂ Offset</div>
                    <div className="text-lg font-bold text-emerald-700">{drive.collectedItemCount * 4.2} kg</div>
                  </div>
                  <div className="bg-[#F9FAFB] p-3 rounded-xl border border-[#E5E7EB]">
                    <div className="text-[#6B7280]">Status</div>
                    <div className="text-lg font-bold text-purple-700">ACTIVE DRIVE</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE DRIVE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto text-[#111827]">
            <div className="flex items-center justify-between sticky top-0 bg-white pt-2 pb-4 z-10 border-b border-[#E5E7EB]">
              <h2 className="text-xl font-bold text-[#111827] flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Launch CSR Campaign
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-[#6B7280] hover:text-[#111827] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDrive} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#374151] uppercase mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-sm text-[#111827] focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] uppercase mb-1">Campaign Title</label>
                <input
                  type="text"
                  required
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  placeholder="e.g. Winter Tech Drive 2026"
                  className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-sm text-[#111827] focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] uppercase mb-1">Description</label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Campaign objectives and details..."
                  rows={3}
                  className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-sm text-[#111827] focus:outline-none focus:border-purple-600 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#374151] uppercase mb-1">Target Items</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={targetItemCount}
                    onChange={(e) => setTargetItemCount(parseInt(e.target.value))}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-sm text-[#111827] focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#374151] uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-sm text-[#111827] focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#374151] uppercase mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-sm text-[#111827] focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-colors shadow-md shadow-purple-600/20 disabled:opacity-50"
                >
                  {createLoading ? 'Launching...' : 'Launch Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
