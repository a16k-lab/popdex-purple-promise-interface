import React, { useState, useEffect } from 'react';
import type { EpochConfig } from '../types';
import { getCountdown } from '../config/epochConfig';
import type { Countdown } from '../config/epochConfig';

interface HeaderProps {
  epochConfig: EpochConfig;
}

/** Top bar — same layout as the Creators form: logo + "/Section" left, quiet counters right. */
export const Header: React.FC<HeaderProps> = ({ epochConfig }) => {
  const [countdown, setCountdown] = useState<Countdown>(() => getCountdown(epochConfig.endTime));

  useEffect(() => {
    const timer = setInterval(() => setCountdown(getCountdown(epochConfig.endTime)), 1000);
    return () => clearInterval(timer);
  }, [epochConfig.endTime]);

  return (
    <header className="sticky top-0 z-50 w-full px-5 sm:px-9 pt-6 pb-3 flex items-center justify-between bg-gradient-to-b from-[#0b0b0d] via-[#0b0b0d]/80 to-transparent">
      <div className="flex items-center gap-2.5 select-none">
        <img src="/logo.png" alt="PopDEX" className="h-5 sm:h-6 w-auto block" />
        <span className="text-[13px] sm:text-[15px] font-semibold text-[#8077ff] pt-0.5 tracking-[0.01em]">
          /PurplePromise
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
