import React, { useState, useEffect } from 'react';
import type { EpochConfig } from '../types';
import { getCountdown } from '../config/epochConfig';
import type { Countdown } from '../config/epochConfig';
import { Clock } from 'lucide-react';

interface HeaderProps {
  epochConfig: EpochConfig;
}

export const Header: React.FC<HeaderProps> = ({ epochConfig }) => {
  const [countdown, setCountdown] = useState<Countdown>(() =>
    getCountdown(epochConfig.endTime)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getCountdown(epochConfig.endTime));
    }, 1000);
    return () => clearInterval(timer);
  }, [epochConfig.endTime]);

  return (
    <header className="w-full border-b border-white/[0.08] bg-[#0b0b0d]/85 backdrop-blur-xl sticky top-0 z-50 px-4 sm:px-8 py-3.5 flex items-center justify-between">
      {/* Brand Identity - Official PopDEX Logo + /PurplePromise + Aligned 3P Badge */}
      <div className="flex items-center gap-2 sm:gap-2.5 select-none">
        {/* Official PopDEX Logo */}
        <img
          src="/logo.png"
          alt="PopDEX"
          className="h-6 sm:h-7 w-auto object-contain block drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]"
        />

        {/* /PurplePromise Text */}
        <span className="text-lg sm:text-xl font-bold tracking-tight text-[#8077ff] drop-shadow-[0_0_8px_rgba(128,119,255,0.4)] leading-none">
          /PurplePromise
        </span>

        {/* 3P Badge - Vertically aligned perfectly with flex items-center */}
        <span className="px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-[#8077ff]/15 text-[#bdb9ff] border border-[#8077ff]/30 leading-none inline-flex items-center justify-center">
          3P
        </span>
      </div>

      {/* Right Info Badges */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Epoch Number Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1b1c20] border border-white/[0.08] text-xs">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8077ff] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8077ff]"></span>
          </span>
          <span className="font-bold text-[#bdb9ff]">Epoch #{epochConfig.epochNumber}</span>
          <span className="text-white/30 hidden sm:inline">•</span>
          <span className="text-white/60 hidden sm:inline">Weekly Cycle</span>
        </div>

        {/* Live Countdown Timer */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#8077ff]/10 border border-[#8077ff]/25 text-xs font-mono text-[#bdb9ff]">
          <Clock size={13} className="text-[#8077ff]" />
          <span className="font-semibold">{countdown.formatted}</span>
        </div>
      </div>
    </header>
  );
};
