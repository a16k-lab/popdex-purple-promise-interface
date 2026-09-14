import React, { useEffect } from 'react';
import type { WalletVolumeData } from '../types';
import confetti from 'canvas-confetti';
import { CheckCircle2, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { Bokeh } from './Bokeh';

interface EligibilityCardProps {
  data: WalletVolumeData;
}

export const EligibilityCard: React.FC<EligibilityCardProps> = ({ data }) => {
  const { isEligible, totalLiveVolumeUsd, remainingUsdNeeded, progressPercent } = data;

  // Trigger celebration confetti when eligible
  useEffect(() => {
    if (isEligible) {
      const end = Date.now() + 1.2 * 1000;
      const colors = ['#17a781', '#8077ff', '#bdb9ff', '#ffffff'];

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
      <div className="w-full glass-panel rounded-2xl p-6 sm:p-7 !border-[#17a781]/40 !shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_30px_90px_-30px_rgba(23,167,129,0.35),0_24px_48px_-24px_rgba(0,0,0,0.7)]">
        <Bokeh />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2">
            <span className="pill !text-[#17a781] !bg-[#17a781]/12 !border-[#17a781]/35">
              <CheckCircle2 size={11} strokeWidth={2.6} />
              Verified
            </span>

            <h2 className="text-[22px] sm:text-[25px] font-bold text-white tracking-[-0.015em] leading-tight">
              <span className="text-[#17a781]">Purple Promise Verified</span> — reward eligible
            </h2>

            <p className="text-[15px] text-[#a0a3a7] leading-relaxed">
              Volume threshold met ($100K). Allocation is distributed when the epoch closes.
            </p>
          </div>

          <div className="w-full md:w-auto">
            <div className="bg-[#0e0e12]/60 border border-[#17a781]/30 rounded-xl p-4 text-left sm:text-right min-w-[210px]">
              <span className="caption block mb-1">Epoch volume</span>
              <span className="text-2xl font-bold font-mono text-[#17a781] tabular-nums">
                ${totalLiveVolumeUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <div className="mt-1 flex items-center justify-start sm:justify-end gap-1.5 text-[12px] text-[#17a781] font-semibold">
                <CheckCircle2 size={13} />
                <span>100% of goal</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not Eligible State (< $100K)
  return (
    <div className="w-full glass-panel rounded-2xl p-6 sm:p-7 !border-[#f03277]/35 !shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_30px_90px_-30px_rgba(240,50,119,0.3),0_24px_48px_-24px_rgba(0,0,0,0.7)]">
      <Bokeh />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
        <div className="space-y-2.5 flex-1">
          <span className="pill !text-[#f03277] !bg-[#f03277]/12 !border-[#f03277]/35">
            <AlertTriangle size={11} strokeWidth={2.6} />
            Below target
          </span>

          <h2 className="text-[22px] sm:text-[25px] font-bold text-white tracking-[-0.015em] leading-tight">
            Below the <span className="text-[#f03277]">$100K</span> threshold
          </h2>

          <p className="text-[15px] text-[#a0a3a7] leading-relaxed">
            <strong className="text-white font-mono font-semibold">${totalLiveVolumeUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> so far — trade{' '}
            <strong className="text-white font-mono font-semibold">${remainingUsdNeeded.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> more to qualify.
          </p>

          <div className="space-y-1.5 pt-1 max-w-lg">
            <div className="flex justify-between caption">
              <span>Progress <b className="text-white font-bold">{progressPercent}%</b></span>
              <span>Target <b className="text-white font-bold">$100,000</b></span>
            </div>
            <div className="w-full h-2 bg-[#26272c] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#4d42fc] to-[#8077ff] transition-all duration-700 shadow-[0_0_12px_rgba(128,119,255,0.8)]"
                style={{ width: `${Math.max(2, progressPercent)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="w-full md:w-auto">
          <div className="bg-[#0e0e12]/60 border border-[#f03277]/25 rounded-xl p-4 text-left sm:text-right min-w-[210px] space-y-3">
            <div>
              <span className="caption block mb-1">Needed to qualify</span>
              <span className="text-2xl font-bold font-mono text-[#f03277] tabular-nums">
                ${remainingUsdNeeded.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <a href="https://app.popdex.xyz" target="_blank" rel="noopener noreferrer" className="btn btn-sm w-full justify-center">
              Trade on PopDex
              <ArrowUpRight size={13} strokeWidth={2.6} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
