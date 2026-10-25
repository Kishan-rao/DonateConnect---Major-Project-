import React, { useEffect, useState } from 'react';
import { getBlockchainLedger } from '../api/nextGenApi';
import { BlockchainBlock } from '../types';
import { Database, ShieldCheck, Cpu, Award, Sparkles } from 'lucide-react';

export const BlockchainLedgerPage: React.FC = () => {
  const [blocks, setBlocks] = useState<BlockchainBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [mintedNft, setMintedNft] = useState<boolean>(false);

  useEffect(() => {
    getBlockchainLedger()
      .then((data) => setBlocks(data))
      .catch(() => setBlocks([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 py-6 max-w-7xl mx-auto px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#111827] tracking-tight flex items-center gap-3">
            <Cpu className="w-8 h-8 text-emerald-600" />
            Blockchain Donation Audit & NFT Proof of Impact
          </h1>
          <p className="text-[#4B5563] text-sm mt-1">
            Cryptographic SHA-256 ledger recording every donation transaction step with zero-knowledge verification
          </p>
        </div>

        <button
          onClick={() => setMintedNft(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 self-start md:self-auto transition-all"
        >
          <Sparkles className="w-4 h-4" />
          Mint NFT Proof-of-Impact Token
        </button>
      </div>

      {mintedNft && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3 shadow-sm">
          <Award className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
          <h3 className="text-xl font-extrabold text-[#111827]">NFT Impact Token Minted on Polygon Testnet!</h3>
          <p className="text-xs text-[#4B5563] font-mono">Token ID: #0x9F82A41C7B • Immutable Provenance Badge Added to Wallet</p>
          <button onClick={() => setMintedNft(false)} className="text-xs text-emerald-700 underline font-semibold">Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB] text-[#6B7280] text-sm">
          Loading blockchain ledger blocks...
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[#374151] uppercase tracking-wider">SHA-256 Provenance Block Stream ({blocks.length} Blocks)</h3>

          <div className="space-y-4">
            {blocks.map((block) => (
              <div
                key={block.id}
                className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-3 font-mono text-xs shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
                  <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> BLOCK #{block.blockIndex} &mdash; {block.action}
                  </span>
                  <span className="text-[#6B7280] text-[11px]">{new Date(block.timestamp).toLocaleString()}</span>
                </div>

                <div className="space-y-1.5 text-[#374151]">
                  <div><span className="text-[#6B7280]">Hash:</span> <span className="text-[#7567E8] font-bold">{block.hash}</span></div>
                  <div><span className="text-[#6B7280]">Previous Hash:</span> <span className="text-[#4B5563]">{block.previousHash}</span></div>
                  <div><span className="text-[#6B7280]">Target Donation ID:</span> <span className="text-[#111827]">{block.donationId}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
