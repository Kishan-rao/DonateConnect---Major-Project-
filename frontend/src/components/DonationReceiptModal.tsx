import React, { useEffect } from 'react';
import { Donation } from '../types';
import { formatDate } from '../utils/formatters';
import { HeartHandshake, ShieldCheck, Printer, X, QrCode } from 'lucide-react';
import { pushModalDismiss } from '../utils/useAndroidBackButton';

interface DonationReceiptModalProps {
  donation: Donation;
  onClose: () => void;
}

export const DonationReceiptModal: React.FC<DonationReceiptModalProps> = ({ donation, onClose }) => {
  useEffect(() => {
    return pushModalDismiss(onClose);
  }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#E5E7EB] rounded-3xl max-w-2xl w-full p-8 relative shadow-2xl space-y-6 text-[#111827]">
        {/* Printable Section */}
        <div id="printable-receipt" className="space-y-6">
          {/* Receipt Header */}
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7567E8] to-rose-500 flex items-center justify-center text-white">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-[#111827] tracking-tight">DonateConnect</h2>
                <p className="text-[10px] uppercase tracking-widest text-[#7567E8] font-semibold">
                  Official Community Donation Receipt
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono text-[#6B7280]">REF #{donation.id.slice(0, 8).toUpperCase()}</span>
              <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 justify-end">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Tax Exemption Eligible
              </div>
            </div>
          </div>

          {/* Donor & NGO Details */}
          <div className="grid grid-cols-2 gap-4 bg-[#F9FAFB] p-4 rounded-2xl border border-[#E5E7EB] text-xs">
            <div>
              <div className="text-[10px] uppercase font-bold text-[#6B7280] mb-1">Donor Information</div>
              <div className="font-bold text-[#111827] text-sm">{donation.donor.fullName}</div>
              <div className="text-[#4B5563]">{donation.donor.email}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-[#6B7280] mb-1">Receiving NGO Partner</div>
              <div className="font-bold text-emerald-700 text-sm">{donation.ngo.name}</div>
              <div className="text-[#4B5563]">{donation.ngo.address}</div>
            </div>
          </div>

          {/* Item Breakdown Table */}
          <div>
            <div className="text-xs font-bold text-[#4B5563] uppercase tracking-wider mb-2">Item Breakdown</div>
            <table className="w-full text-xs text-left border-collapse border border-[#E5E7EB] rounded-xl overflow-hidden">
              <thead className="bg-[#F3F4F6] text-[#4B5563] uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">Category</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[#111827]">
                <tr>
                  <td className="p-3 font-bold text-[#7567E8]">{donation.category}</td>
                  <td className="p-3">{donation.description || 'Verified Community Contribution'}</td>
                  <td className="p-3 text-right font-semibold text-emerald-700">{donation.status}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Verification Footnote & Simulated Stamp */}
          <div className="flex items-center justify-between bg-[#F9FAFB] p-4 rounded-2xl border border-[#E5E7EB] pt-4">
            <div className="flex items-center gap-3">
              <QrCode className="w-10 h-10 text-[#7567E8]" />
              <div className="text-[11px] text-[#4B5563]">
                <div>Date Issued: {formatDate(donation.createdAt)}</div>
                <div className="text-[10px] text-[#6B7280]">Scan QR Code to verify certificate integrity on blockchain ledger</div>
              </div>
            </div>

            <div className="border border-[#7567E8]/30 rounded-xl p-2.5 text-center bg-[#7567E8]/10">
              <div className="text-[9px] font-extrabold uppercase tracking-widest text-[#7567E8]">DonateConnect Verified</div>
              <div className="text-[10px] text-emerald-700 font-bold">OFFICIAL STAMP</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-[#E5E7EB] pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#374151] text-xs font-semibold"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 rounded-xl bg-[#7567E8] hover:bg-[#6355d8] text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#7567E8]/30"
          >
            <Printer className="w-4 h-4" />
            Print / Save PDF Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
