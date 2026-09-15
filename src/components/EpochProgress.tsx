import React, { useEffect, useState } from 'react';
import type { EpochConfig } from '../types';
import { formatShortDate } from '../config/epochConfig';

/** Thin green bar showing how far the live epoch has run, with its start/end dates. */
export const EpochProgress: React.FC<{ epochConfig: EpochConfig }> = ({ epochConfig }) => {
  const { startTime, endTime, durationMs } = epochConfig;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const pct = Math.min(100, Math.max(0, ((now - startTime) / durationMs) * 100));
  const fmt = formatShortDate;

  return (
    <div className="w-full max-w-2xl mx-auto mt-3 px-1" aria-label="Epoch progress">
      <div className="flex items-center gap-3">
        <span className="text-[12px] font-semibold text-[#a0a3a7] tracking-[0.04em] tabular-nums shrink-0">{fmt(startTime)}</span>
        <div className="epoch-track flex-1" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
          <div className="epoch-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[12px] font-semibold text-[#a0a3a7] tracking-[0.04em] tabular-nums shrink-0">{fmt(endTime)}</span>
      </div>
    </div>
  );
};
