import React, { useState, useEffect } from 'react';
import type { EpochConfig } from '../types';
import { getCountdown } from '../config/epochConfig';
import type { Countdown } from '../config/epochConfig';

interface HeaderProps {
  epochConfig: EpochConfig;
}

/** Top bar — same layout as the Creators form: Pinsider mark + "/Section" left, quiet counters right. */
export const Header: React.FC<HeaderProps> = ({ epochConfig }) => {
  const [countdown, setCountdown] = useState<Countdown>(() => getCountdown(epochConfig.endTime));

  useEffect(() => {
    const timer = setInterval(() => setCountdown(getCountdown(epochConfig.endTime)), 1000);
    return () => clearInterval(timer);
  }, [epochConfig.endTime]);

  return (
    <header className="sticky top-0 z-50 w-full px-5 sm:px-9 pt-6 pb-3 flex items-center justify-between bg-gradient-to-b from-[#0b0b0d] via-[#0b0b0d]/80 to-transparent">
      <div className="flex items-center gap-2.5 select-none">
        <svg viewBox="118.33 19.91 787.35 984.18" aria-hidden="true" focusable="false" className="h-[18px] sm:h-[21px] w-auto block text-white shrink-0">
          <path fill="currentColor" d="M315.16 610.42h393.67v196.84H315.16zM708.84 216.74h196.84v393.67H708.84zM315.16 19.91h393.67v196.84H315.16zM118.33 216.74h196.84v787.35H118.33z" />
        </svg>
        <span className="text-[17px] sm:text-[20px] font-extrabold text-white leading-none tracking-[-0.022em] -ml-px">Pinsider</span>
        <span className="text-[13px] sm:text-[15px] font-semibold text-[#8077ff] pt-0.5 tracking-[0.01em]">
          /Purple Promise
        </span>
        <span className="pill hidden sm:inline-flex">3P</span>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3 text-[12px] tracking-[0.06em] text-[#6c6f75]">
        <span className="pill">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8077ff] opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#8077ff]" />
          </span>
          Epoch {String(epochConfig.epochNumber).padStart(2, '0')}
        </span>
        <span>
          <b className="text-[#f4f4f6] font-bold tabular-nums">{countdown.formatted}</b>
          <span className="ml-1.5 hidden sm:inline">left</span>
        </span>
      </div>
    </header>
  );
};
