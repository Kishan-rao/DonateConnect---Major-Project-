import React, { useEffect, useState, useRef } from 'react';
import { X, Download, Award, Loader2, CheckCircle2 } from 'lucide-react';
import { Donation, DeliveryDto } from '../types';
import { getDeliveryByDonationId, getDeliveryProofPhoto } from '../api/donationApi';
import { formatDate } from '../utils/formatters';
import { pushModalDismiss } from '../utils/useAndroidBackButton';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface CertificateModalProps {
  donation: Donation;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({ donation, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [delivery, setDelivery] = useState<DeliveryDto | null>(null);
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const [proofPhotoError, setProofPhotoError] = useState(false);
  const [proofPhotoLoading, setProofPhotoLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return pushModalDismiss(onClose);
  }, [onClose]);

  useEffect(() => {
    const fetchDelivery = async () => {
      try {
        setDelivery(await getDeliveryByDonationId(donation.id));
      } catch (err) {
        console.warn('Could not fetch delivery details for certificate', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDelivery();
  }, [donation.id]);

  useEffect(() => {
    if (!delivery?.proofImageUrl) return;
    let active = true;
    setProofPhotoLoading(true);
    getDeliveryProofPhoto(delivery.id)
      .then((photo) => {
        if (active) setProofPhoto(photo);
      })
      .catch(() => {
        if (active) setProofPhotoError(true);
      })
      .finally(() => {
        if (active) setProofPhotoLoading(false);
      });
    return () => {
      active = false;
    };
  }, [delivery?.id, delivery?.proofImageUrl]);

  const handleDownloadPdf = async () => {
    if (!certificateRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Impact_Certificate_${donation.id.substring(0, 8)}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
      alert('Failed to generate PDF certificate.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Impact Certificate</h3>
              <p className="text-xs text-slate-500 mt-0.5">Donation #{donation.id.slice(0, 8)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPdf}
              disabled={loading || downloading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {downloading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              ) : (
                <><Download className="w-4 h-4" /> Download PDF</>
              )}
            </button>
            <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto bg-slate-100 flex-1 flex justify-center">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : (
            <div 
              className="bg-white border-[12px] border-double border-indigo-900/10 shadow-lg relative overflow-hidden" 
              style={{ width: '297mm', minHeight: '210mm', padding: '40px' }} // A4 Landscape
            >
              <div 
                ref={certificateRef}
                className="w-full h-full flex flex-col items-center justify-between p-12 bg-white"
                style={{ width: '100%', height: '100%' }}
              >
                {/* Certificate Content */}
                <div className="text-center space-y-6 w-full">
                  <div className="mx-auto w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                    <Award className="w-12 h-12 text-indigo-600" />
                  </div>
                  
                  <h1 className="text-5xl font-serif font-bold text-slate-800 tracking-wide uppercase">
                    Certificate of Impact
                  </h1>
                  
                  <p className="text-xl text-slate-500 uppercase tracking-widest mt-2">
                    Proudly presented to
                  </p>
                  
                  <h2 className="text-4xl font-bold text-indigo-600 border-b-2 border-indigo-100 pb-4 max-w-2xl mx-auto">
                    {donation.donor.fullName}
                  </h2>
                  
                  <div className="text-lg text-slate-600 max-w-3xl mx-auto space-y-4 pt-4 leading-relaxed">
                    <p>
                      In grateful recognition of your generous contribution to <strong>{donation.ngo.name}</strong>.
                    </p>
                    <p>
                      Your donation of <strong>{donation.description || donation.category}</strong> has successfully reached its destination and is making a tangible difference in the community.
                    </p>
                  </div>
                </div>

                {/* Footer Data */}
                <div className="w-full mt-16 flex items-end justify-between border-t border-slate-200 pt-8">
                  <div className="space-y-1 text-sm text-slate-500 text-left">
                    <p><strong className="text-slate-700">Donation ID:</strong> {donation.id}</p>
                    <p><strong className="text-slate-700">Category:</strong> {donation.category}</p>
                    <p><strong className="text-slate-700">Date Delivered:</strong> {delivery?.deliveredAt ? formatDate(delivery.deliveredAt) : formatDate(donation.createdAt)}</p>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <div className="w-40 h-px bg-slate-300 mb-2"></div>
                    <p className="text-sm font-bold text-slate-800">DonateConnect</p>
                    <p className="text-xs text-slate-500">Authorized Signature</p>
                  </div>
                  
                  {delivery?.proofImageUrl && proofPhoto ? (
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Proof of Delivery</p>
                      <img 
                        src={proofPhoto}
                        alt="Delivery Proof" 
                        className="w-24 h-24 object-cover rounded-lg border-2 border-slate-200" 
                      />
                    </div>
                  ) : delivery?.proofImageUrl && proofPhotoError ? (
                    <div className="text-center text-xs text-slate-500">Proof photo unavailable</div>
                  ) : delivery?.proofImageUrl && (proofPhotoLoading || (!proofPhoto && !proofPhotoError)) ? (
                    <div className="text-center text-xs text-slate-500">Loading proof photo...</div>
                  ) : (
                    <div className="text-center flex flex-col items-center justify-center w-24 h-24 bg-emerald-50 rounded-lg border-2 border-emerald-100">
                       <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-1" />
                       <span className="text-[10px] font-bold text-emerald-600">VERIFIED</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
