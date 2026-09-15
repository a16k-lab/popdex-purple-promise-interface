import React from 'react';
import type { WalletVolumeData } from '../types';
import { BarChart2, History, Target, Layers } from 'lucide-react';

interface EpochStatsOverviewProps {
  data: WalletVolumeData;
  pastLoading?: boolean;
}

export const EpochStatsOverview: React.FC<EpochStatsOverviewProps> = ({ data, pastLoading }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 w-full">
      {/* Card 1: Live Volume */}
      <div className="glass-panel rounded-2xl p-5 group hover:!border-[#8077ff]/40 transition-colors duration-200">
        <div className="flex items-center justify-between mb-2">
          <span className="caption">Live Volume</span>
          <div className="p-1.5 rounded-lg bg-[#8077ff]/15 text-[#8077ff]">
            <BarChart2 size={15} />
          </div>
        </div>
        <div className="text-2xl font-bold font-mono text-white tracking-tight tabular-nums">
          ${data.totalLiveVolumeUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[#bdb9ff]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8077ff]" />
          <span>Cumulative this epoch</span>
        </div>
      </div>

      {/* Card 2: Past Baseline */}
      <div className="glass-panel rounded-2xl p-5 group hover:!border-[#8077ff]/40 transition-colors duration-200">
        <div className="flex items-center justify-between mb-2">
          <span className="caption">Past Baseline</span>
          <div className="p-1.5 rounded-lg bg-white/[0.06] text-[#a0a3a7]">
            <History size={15} />
          </div>
        </div>
        <div className="text-2xl font-bold font-mono text-[#c4c7ca] tracking-tight tabular-nums">
          {pastLoading ? <span className="inline-block h-7 w-36 rounded-md bg-white/10 animate-pulse align-middle" /> : `$${data.totalPastVolumeUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
        </div>
        <div className="mt-1.5 text-[12px] text-[#6c6f75]">
          <span>7-Day Prior Reference</span>
        </div>
      </div>

      {/* Card 3: Target Goal */}
      <div className="glass-panel rounded-2xl p-5 group hover:!border-[#17a781]/40 transition-colors duration-200">
        <div className="flex items-center justify-between mb-2">
          <span className="caption">Purple Promise Goal</span>
          <div className="p-1.5 rounded-lg bg-[#17a781]/15 text-[#17a781]">
            <Target size={15} />
          </div>
        </div>
        <div className="text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
          $100,000.00
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[12px]">
          <span className={data.isEligible ? 'text-[#17a781] font-bold' : 'text-[#f03277]'}>
            {data.isEligible ? '✓ 100% Achieved' : `${data.progressPercent}% Completed`}
          </span>
          <span className="text-[#6c6f75]">
            {data.isEligible ? 'Eligible' : `$${data.remainingUsdNeeded.toLocaleString()} left`}
          </span>
        </div>
      </div>

      {/* Card 4: Orders & Size */}
      <div className="glass-panel rounded-2xl p-5 group hover:!border-[#8077ff]/40 transition-colors duration-200">
        <div className="flex items-center justify-between mb-2">
          <span className="caption">Fills & Avg Size</span>
          <div className="p-1.5 rounded-lg bg-[#8077ff]/15 text-[#8077ff]">
            <Layers size={15} />
          </div>
        </div>
        <div className="text-2xl font-bold font-mono text-white tracking-tight tabular-nums">
          {data.tradeCount.toLocaleString()}{' '}
          <span className="text-xs font-normal text-[#6c6f75]">fills</span>
        </div>
        <div className="mt-1.5 text-[12px] text-[#bdb9ff]">
          <span>Avg: ${data.avgOrderSizeUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>
  );
};
