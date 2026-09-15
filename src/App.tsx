import React, { useState, useCallback } from 'react';
import { getEpochConfig, TARGET_VOLUME_USD, formatDuration } from './config/epochConfig';
import { streamWalletVolume, emptyVolumeData } from './services/volumeService';
import type { EpochConfig, WalletVolumeData } from './types';
import { AmbientBackground } from './components/AmbientBackground';
import { Header } from './components/Header';
import { WalletInput } from './components/WalletInput';
import { DualEpochChart } from './components/DualEpochChart';
import { EligibilityCard } from './components/EligibilityCard';
import { EpochStatsOverview } from './components/EpochStatsOverview';
import { EpochProgress } from './components/EpochProgress';
import { ExternalLink, ArrowLeft, Check, Copy } from 'lucide-react';
import { Bokeh } from './components/Bokeh';
import { JOIN_URL } from './config/links';

const formatTarget = (v: number) => `$${v.toLocaleString('en-US')}`;
const formatTargetShort = (v: number) =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(v % 1_000_000 ? 1 : 0)}M` : v >= 1_000 ? `$${Math.round(v / 1_000)}K` : `$${v}`;

export const App: React.FC = () => {
  const [epochConfig] = useState<EpochConfig>(() => getEpochConfig());
  // Do NOT pre-fill on page load or refresh: start clean and empty
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [volumeData, setVolumeData] = useState<WalletVolumeData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Progress of the streamed fetch, per epoch. `past` stays pending while the live epoch loads.
  const [phase, setPhase] = useState<{ scope: 'live' | 'past'; done: number; total: number } | null>(null);
  const [pastPending, setPastPending] = useState(false);

  const fetchWallet = useCallback(
    async (addr: string) => {
      setIsLoading(true);
      setWalletAddress(addr);
      setVolumeData(null);
      setPastPending(true);
      setPhase({ scope: 'live', done: 0, total: 0 });

      // 1) Live epoch — the eligibility answer. Show it as soon as it lands.
      const live = await streamWalletVolume(addr, epochConfig, 'live', (snap) => {
        setPhase({ scope: 'live', done: snap.progress?.done ?? 0, total: snap.progress?.total ?? 0 });
      });
      const base: WalletVolumeData = live
        ? { ...live, pastPoints: [], allPoints: live.livePoints }
        : { ...emptyVolumeData(addr), complete: false };
      setVolumeData(base);
      setIsLoading(false);

      // 2) Past epoch — streams into the left half of the chart while the user reads the result.
      setPhase({ scope: 'past', done: 0, total: 0 });
      const past = await streamWalletVolume(addr, epochConfig, 'past', (snap) => {
        setPhase({ scope: 'past', done: snap.progress?.done ?? 0, total: snap.progress?.total ?? 0 });
        setVolumeData((cur) =>
          cur
            ? { ...cur, totalPastVolumeUsd: snap.totalPastVolumeUsd, pastPoints: snap.pastPoints, allPoints: [...snap.pastPoints, ...cur.livePoints] }
            : cur,
        );
      });
      setVolumeData((cur) =>
        cur
          ? {
              ...cur,
              totalPastVolumeUsd: past?.totalPastVolumeUsd ?? cur.totalPastVolumeUsd,
              pastPoints: past?.pastPoints ?? cur.pastPoints,
              allPoints: [...(past?.pastPoints ?? cur.pastPoints), ...cur.livePoints],
              complete: (cur.complete ?? true) && (past?.complete ?? false),
            }
          : cur,
      );
      setPastPending(false);
      setPhase(null);
    },
    [epochConfig]
  );

  // Full page reload so the app starts from a clean state (like the browser refresh button).
  const handleReset = () => {
    window.location.reload();
  };

  const handleCopy = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen relative flex flex-col bg-[#0b0b0d] text-[#f4f4f6]">
      {/* Dynamic Cyberpunk Ambient Background */}
      <AmbientBackground />

      {/* Sticky PopDEX /Purple Promise Header */}
      <Header epochConfig={epochConfig} />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 relative z-10">
        {/* INITIAL STATE: When no wallet has been entered yet */}
        {!volumeData && !isLoading && (
          <div className="space-y-8 animate-fadeIn">
            {/* Hero */}
            <section className="text-center space-y-4 max-w-2xl mx-auto pt-6 sm:pt-12">
              <span className="pill">01 · Epoch volume tracker</span>
              <h1 className="text-[28px] sm:text-4xl md:text-[44px] font-bold tracking-[-0.015em] text-white leading-[1.15]">
                Trade volume &amp; <br className="hidden sm:inline" />
                <span className="text-[#8077ff]">Purple Promise</span> eligibility
              </h1>
              <p className="text-[15px] sm:text-base text-[#a0a3a7] leading-relaxed">
                Inspect any EVM wallet to see its volume this epoch and whether it qualifies for rewards.
              </p>
            </section>

            {/* Wallet Search Input */}
            <section className="pt-1">
              <WalletInput
                currentAddress={walletAddress}
                onSearch={fetchWallet}
                isLoading={isLoading}
              />
              <div className="flex justify-center mt-4">
                <a
                  href={JOIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="join-cta"
                >
                  <span className="text-[#a0a3a7]">Not joined yet?</span>
                  <span className="text-white font-bold">Join PopDex</span>
                  <ExternalLink size={13} className="text-[#bdb9ff]" />
                </a>
              </div>
            </section>

            {/* Rule card — green: this is the line you need to cross */}
            <section className="pt-2">
              <div className="w-full max-w-2xl mx-auto glass-panel rule-card rounded-2xl p-6 sm:p-7">
                <Bokeh />
                <div className="flex items-center gap-3 mb-2">
                  <span className="pill !text-[#17a781] !bg-[#17a781]/12 !border-[#17a781]/35">Rule</span>
                  <h3 className="text-[19px] font-bold tracking-[-0.015em] text-white">
                    <span className="text-[#17a781]">{formatTarget(TARGET_VOLUME_USD)}</span> volume threshold
                  </h3>
                </div>
                <p className="text-[15px] text-[#a0a3a7] leading-relaxed">
                  Generate <code className="code code-green">{formatTargetShort(TARGET_VOLUME_USD)}+</code> volume in the active {formatDuration(epochConfig.durationMs)} epoch to earn{' '}
                  <strong className="text-[#17a781] font-semibold">Purple Promise Verified</strong> status and protocol rewards.
                </p>
              </div>
              <EpochProgress epochConfig={epochConfig} />
            </section>
          </div>
        )}

        {/* Loading — live epoch */}
        {isLoading && (
          <div className="w-full py-24 flex flex-col items-center justify-center gap-5 animate-fadeIn">
            <div className="relative flex items-center justify-center w-16 h-16">
              <div className="w-16 h-16 rounded-full border border-[#8077ff]/20 animate-ping absolute pointer-events-none" />
              <div className="w-14 h-14 rounded-full border-[3px] border-white/10 border-t-[#8077ff] animate-spin shadow-[0_0_30px_rgba(128,119,255,0.5)]" />
            </div>
            <div className="text-center space-y-2 w-full max-w-xs">
              <p className="text-[15px] font-semibold text-white">Reading this epoch's fills…</p>
              <div className="epoch-track !bg-white/10">
                <div
                  className="epoch-fill !bg-none !bg-[#8077ff] !shadow-[0_0_12px_rgba(128,119,255,0.7)]"
                  style={{ width: `${phase && phase.total ? Math.max(4, (phase.done / phase.total) * 100) : 4}%` }}
                />
              </div>
              <p className="caption">
                {phase && phase.total ? `${Math.round((phase.done / phase.total) * 100)}% · ${phase.done}/${phase.total} slices` : 'Connecting to PopDex'}
              </p>
            </div>
          </div>
        )}

        {/* SUBMITTED STATE: Only show the data, hiding the search inputs! */}
        {!isLoading && volumeData && (
          <div className="space-y-6 animate-fadeIn">
            {/* Inspected account */}
            <div className="glass-panel rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <Bokeh />
              <div className="min-w-0">
                <span className="caption block mb-1.5">Inspected wallet</span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-[15px] sm:text-base font-semibold text-white truncate">{walletAddress}</span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="shrink-0 p-1.5 rounded-md text-[#6c6f75] hover:text-white hover:bg-white/10 transition-colors"
                    title="Copy address"
                  >
                    {copied ? <Check size={14} className="text-[#17a781]" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
              <button type="button" onClick={handleReset} className="btn btn-ghost btn-sm shrink-0">
                <ArrowLeft size={14} />
                Change wallet
              </button>
            </div>

            {volumeData.complete === false && !pastPending && (
              <div className="flex items-start gap-2.5 text-[13px] text-[#f5c46b] bg-[#f5c46b]/10 border border-[#f5c46b]/30 rounded-xl px-4 py-3">
                <span aria-hidden>⚠️</span>
                <span>
                  PopDex returned this wallet's fills slower than our time budget, so the totals below are a <b>lower bound</b>.
                  Hit <b>Change wallet</b> and inspect again — the finished epoch is cached, so the retry is faster.
                </span>
              </div>
            )}

            {/* 1. Eligibility State Card */}
            <EligibilityCard data={volumeData} />

            {/* 2. Seamless Connected Dual-Epoch Chart */}
            <DualEpochChart data={volumeData} epochConfig={epochConfig} pastLoading={pastPending ? { done: phase?.scope === 'past' ? phase.done : 0, total: phase?.scope === 'past' ? phase.total : 0 } : null} />

            {/* 3. Overview Stats Cards */}
            <EpochStatsOverview data={volumeData} epochConfig={epochConfig} pastLoading={pastPending} />
          </div>
        )}
      </main>

      {/* Footer — quiet caption row, like the Creators form */}
      <footer className="w-full px-5 sm:px-9 py-7 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="caption">PopDex Purple Promise · 3P</span>
          <div className="flex items-center gap-5 caption">
            <a href={JOIN_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors inline-flex items-center gap-1">
              PopDex App <ExternalLink size={10} />
            </a>
            <a href="https://scan.pinsider.org" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors inline-flex items-center gap-1">
              Pinsider Explorer <ExternalLink size={10} />
            </a>
            <a href="https://creators.pinsider.org" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors inline-flex items-center gap-1">
              Creators <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
