import React from 'react';
import type { WalletVolumeData } from '../types';
import { BarChart2, History, Target, Layers } from 'lucide-react';

interface EpochStatsOverviewProps {
  data: WalletVolumeData;
}

export const EpochStatsOverview: React.FC<EpochStatsOverviewProps> = ({ data }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 w-full">
      {/* Card 1: Live Volume */}
      <div className="glass-panel rounded-xl p-4 border border-white/[0.08] relative overflow-hidden group hover:border-[#8077ff]/40 transition-all duration-200">
        <div className="flex items-center justify-between text-white/50 mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider">Live Volume</span>
          <div className="p-1.5 rounded-lg bg-[#8077ff]/15 text-[#8077ff]">
            <BarChart2 size={15} />
          </div>
        </div>
        <div className="text-2xl font-black font-mono text-white tracking-tight">
          ${data.totalLiveVolumeUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#bdb9ff] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8077ff] animate-ping" />
          <span>Area Integral</span>
        </div>
      </div>

      {/* Card 2: Past Baseline */}
      <div className="glass-panel rounded-xl p-4 border border-white/[0.08] relative overflow-hidden group hover:border-slate-500/40 transition-all duration-200">
        <div className="flex items-center justify-between text-white/50 mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider">Past Baseline</span>
          <div className="p-1.5 rounded-lg bg-slate-500/15 text-slate-400">
            <History size={15} />
          </div>
        </div>
        <div className="text-2xl font-black font-mono text-slate-300 tracking-tight">
          ${data.totalPastVolumeUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
        <div className="mt-1.5 text-[11px] text-slate-400 font-mono">
          <span>7-Day Prior Reference</span>
        </div>
      </div>

      {/* Card 3: Target Goal */}
      <div className="glass-panel rounded-xl p-4 border border-white/[0.08] relative overflow-hidden group hover:border-emerald-500/40 transition-all duration-200">
        <div className="flex items-center justify-between text-white/50 mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider">Purple Promise Goal</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
            <Target size={15} />
          </div>
        </div>
        <div className="text-2xl font-black font-mono tracking-tight text-white">
          $100,000.00
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono">
          <span className={data.isEligible ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
            {data.isEligible ? '✓ 100% Achieved' : `${data.progressPercent}% Completed`}
          </span>
          <span className="text-white/40">
            {data.isEligible ? 'Eligible' : `$${data.remainingUsdNeeded.toLocaleString()} left`}
          </span>
        </div>
      </div>

      {/* Card 4: Orders & Size */}
      <div className="glass-panel rounded-xl p-4 border border-white/[0.08] relative overflow-hidden group hover:border-cyan-500/40 transition-all duration-200">
        <div className="flex items-center justify-between text-white/50 mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider">Orders & Avg Size</span>
          <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400">
            <Layers size={15} />
          </div>
        </div>
        <div className="text-2xl font-black font-mono text-white tracking-tight">
          {data.tradeCount.toLocaleString()}{' '}
          <span className="text-xs font-normal text-white/40">orders</span>
        </div>
        <div className="mt-1.5 text-[11px] text-cyan-300/80 font-mono">
          <span>Avg: ${data.avgOrderSizeUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>
  );
};
