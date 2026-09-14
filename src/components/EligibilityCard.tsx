import React, { useEffect } from 'react';
import type { WalletVolumeData } from '../types';
import confetti from 'canvas-confetti';
import { CheckCircle2, AlertTriangle, Sparkles, ArrowUpRight } from 'lucide-react';

interface EligibilityCardProps {
  data: WalletVolumeData;
}

export const EligibilityCard: React.FC<EligibilityCardProps> = ({ data }) => {
  const { isEligible, totalLiveVolumeUsd, remainingUsdNeeded, progressPercent } = data;

  // Trigger celebration confetti when eligible
  useEffect(() => {
    if (isEligible) {
      const end = Date.now() + 1.2 * 1000;
      const colors = ['#10b981', '#8077ff', '#ffffff', '#7efb90'];

      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    }
  }, [isEligible, data.address]);

  if (isEligible) {
    return (
      <div className="w-full rounded-2xl p-5 sm:p-6 bg-gradient-to-b from-emerald-500/15 via-emerald-500/[0.05] to-transparent border border-emerald-500/35 shadow-[0_0_40px_rgba(16,185,129,0.2)] backdrop-blur-xl relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold uppercase tracking-wider">
              <Sparkles size={12} className="text-emerald-400" />
              <span>PurplePromise Verified</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              🎉 <span className="text-emerald-400">PurplePromise Verified</span>: Reward Eligible
            </h2>

            <p className="text-xs sm:text-sm text-emerald-100/70 font-medium">
              Volume threshold satisfied ($100K). Allocation will distribute upon epoch conclusion.
            </p>
          </div>

          <div className="w-full md:w-auto">
            <div className="bg-[#141518]/90 border border-emerald-500/30 rounded-xl p-3.5 text-left sm:text-right min-w-[200px] shadow-lg">
              <span className="text-[11px] text-white/50 block font-mono">Epoch Volume</span>
              <span className="text-2xl font-black font-mono text-emerald-400">
                ${totalLiveVolumeUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <div className="mt-1 flex items-center justify-start sm:justify-end gap-1.5 text-[11px] text-emerald-300 font-semibold">
                <CheckCircle2 size={13} />
                <span>100% Goal Met</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not Eligible State (< $100K)
  return (
    <div className="w-full rounded-2xl p-5 sm:p-6 bg-gradient-to-b from-rose-500/15 via-rose-500/[0.05] to-transparent border border-rose-500/30 shadow-[0_0_35px_rgba(244,63,94,0.15)] backdrop-blur-xl relative overflow-hidden transition-all duration-300">
      <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
        <div className="space-y-2.5 flex-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-bold uppercase tracking-wider">
            <AlertTriangle size={12} className="text-rose-400" />
            <span>Target Shortfall</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            ⚠️ <span className="text-rose-400">Below $100K Threshold</span>
          </h2>

          <p className="text-xs sm:text-sm text-rose-100/75 font-medium">
            Generated <strong className="text-white font-mono">${totalLiveVolumeUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> so far. Trade <strong className="text-rose-300 font-mono underline decoration-rose-400/50">${remainingUsdNeeded.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> more to qualify.
          </p>

          <div className="space-y-1 pt-1 max-w-lg">
            <div className="flex justify-between text-[11px] font-mono text-white/50">
              <span>Progress: <strong className="text-white">{progressPercent}%</strong></span>
              <span>Target: <strong className="text-white">$100,000</strong></span>
            </div>
            <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/10 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-500 to-[#8077ff] transition-all duration-700 shadow-[0_0_10px_rgba(244,63,94,0.6)]"
                style={{ width: `${Math.max(3, progressPercent)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="w-full md:w-auto">
          <div className="bg-[#141518]/90 border border-rose-500/25 rounded-xl p-3.5 text-left sm:text-right min-w-[200px] shadow-lg space-y-2">
            <div>
              <span className="text-[11px] text-white/50 block font-mono">Needed to Qualify</span>
              <span className="text-2xl font-black font-mono text-rose-400">
                ${remainingUsdNeeded.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <a
              href="https://app.popdex.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-bold transition-all border border-white/10"
            >
              <span>Trade on PopDEX</span>
              <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
