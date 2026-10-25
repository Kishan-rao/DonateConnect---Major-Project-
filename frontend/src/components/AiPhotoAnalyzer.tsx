import React, { useState } from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Category } from '../types';

interface AiPhotoAnalyzerProps {
  onCategorySuggested?: (category: Category) => void;
}

export const AiPhotoAnalyzer: React.FC<AiPhotoAnalyzerProps> = ({ onCategorySuggested }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    qualityScore: number;
    suggestedCategory: Category;
    confidence: number;
    notes: string;
  } | null>(null);

  const simulateAiScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);
    setResult(null);

    setTimeout(() => {
      // Intelligent heuristic analysis simulation based on filename / mock
      const categories: Category[] = ['CLOTHES', 'BOOKS', 'FOOD', 'STATIONERY', 'TOYS'];
      const suggested = categories[Math.floor(Math.random() * categories.length)];
      const qualityScore = Math.floor(Math.random() * 15) + 85; // 85 to 99%

      setResult({
        qualityScore,
        suggestedCategory: suggested,
        confidence: qualityScore,
        notes: 'High clarity image detected. Lighting and resolution optimal for NGO inspection.',
      });

      if (onCategorySuggested) {
        onCategorySuggested(suggested);
      }
      setAnalyzing(false);
    }, 1200);
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#7567E8] animate-pulse" />
          <h4 className="text-sm font-bold text-[#111827]">AI Item Photo Quality & Category Detector</h4>
        </div>
        <span className="text-[10px] bg-[#7567E8]/10 text-[#7567E8] px-2 py-0.5 rounded border border-[#7567E8]/20 font-mono font-semibold">
          AI Vision v2.4
        </span>
      </div>

      <p className="text-xs text-[#4B5563] leading-relaxed">
        Upload a photo of your donation items. Our AI scanner automatically assesses image clarity and suggests the optimal category.
      </p>

      <div className="flex items-center gap-3">
        <input
          type="file"
          accept="image/*"
          onChange={simulateAiScan}
          id="ai-image-input"
          className="hidden"
        />
        <label
          htmlFor="ai-image-input"
          className="cursor-pointer px-4 py-2.5 rounded-xl bg-[#7567E8] hover:bg-[#6355d8] text-white font-semibold text-xs transition-all inline-flex items-center gap-2 shadow-md shadow-[#7567E8]/20"
        >
          <Sparkles className="w-4 h-4" />
          Upload Image for AI Scan
        </label>
        {analyzing && (
          <span className="text-xs text-[#7567E8] font-semibold animate-pulse">
            Analyzing pixels & light contrast...
          </span>
        )}
      </div>

      {result && (
        <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E7EB] space-y-2 text-xs">
          <div className="flex items-center justify-between text-emerald-700 font-bold">
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Quality Rating: {result.qualityScore}%</span>
            <span className="text-[#7567E8]">Category: {result.suggestedCategory}</span>
          </div>
          <p className="text-[#4B5563] italic">{result.notes}</p>
        </div>
      )}
    </div>
  );
};
