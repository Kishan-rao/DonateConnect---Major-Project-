import React, { useState } from 'react';
import { Award, Share2, Sparkles, CheckCircle, ShieldCheck } from 'lucide-react';

export const GamificationBadges: React.FC = () => {
  const [showShareModal, setShowShareModal] = useState(false);

  const badges = [
    { id: 'b1', title: 'First Gift Pioneer', desc: 'Submitted first verified donation request', icon: '🎁', unlocked: true },
    { id: 'b2', title: 'Green Earth Hero', desc: 'Prevented 50+ kg CO2 emissions through reuse', icon: '🌱', unlocked: true },
    { id: 'b3', title: 'Multi-NGO Supporter', desc: 'Donated to 3 or more verified NGO partners', icon: '🏛️', unlocked: true },
    { id: 'b4', title: '5-Star Champion', desc: 'Received 5-star rating from partner organization', icon: '⭐', unlocked: true },
  ];

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-[#111827] flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          Donor Impact Badges & Achievements
        </h3>
        <button
          onClick={() => setShowShareModal(true)}
          className="px-3.5 py-1.5 rounded-xl bg-[#7567E8] hover:bg-[#6355d8] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#7567E8]/20"
        >
          <Share2 className="w-3.5 h-3.5" />
          Share Social Impact Card
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {badges.map((b) => (
          <div key={b.id} className="bg-[#F9FAFB] p-3.5 rounded-xl border border-[#E5E7EB] flex items-center gap-3">
            <span className="text-2xl">{b.icon}</span>
            <div>
              <div className="text-xs font-bold text-[#111827] flex items-center gap-1">
                {b.title}
                <CheckCircle className="w-3 h-3 text-emerald-600" />
              </div>
              <div className="text-[10px] text-[#6B7280] line-clamp-1">{b.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl max-w-md w-full p-6 text-center space-y-6 shadow-2xl relative text-[#111827]">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                🌱 Verified Impact Milestone Card
              </span>
              <h3 className="text-2xl font-black text-[#111827] tracking-tight">I Just Made a Difference on DonateConnect!</h3>
              <p className="text-xs text-[#4B5563]">
                "Donated essential clothes & books to verified NGOs. Saved 45 kg of CO₂ emissions and supported local communities!"
              </p>
            </div>

            <div className="bg-[#F9FAFB] p-4 rounded-2xl border border-[#E5E7EB] text-xs text-[#374151] space-y-1">
              <div>🏆 <strong>Badges Earned:</strong> Green Earth Hero, Multi-NGO Supporter</div>
              <div>📍 <strong>Platform:</strong> DonateConnect Verified Directory</div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowShareModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] text-xs font-semibold transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  alert('Impact card copied to clipboard for social sharing!');
                  setShowShareModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#7567E8] hover:bg-[#6355d8] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#7567E8]/20"
              >
                <Share2 className="w-4 h-4" /> Copy Share Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
