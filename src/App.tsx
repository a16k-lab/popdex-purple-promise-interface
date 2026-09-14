import React, { useState, useCallback } from 'react';
import { getEpochConfig } from './config/epochConfig';
import { getWalletVolumeData } from './services/volumeService';
import type { EpochConfig, WalletVolumeData } from './types';
import { AmbientBackground } from './components/AmbientBackground';
import { Header } from './components/Header';
import { WalletInput } from './components/WalletInput';
import { DualEpochChart } from './components/DualEpochChart';
import { EligibilityCard } from './components/EligibilityCard';
import { EpochStatsOverview } from './components/EpochStatsOverview';
import { Sparkles, Shield, ExternalLink, ArrowLeft, Wallet, Check, Copy } from 'lucide-react';

export const App: React.FC = () => {
  const [epochConfig] = useState<EpochConfig>(() => getEpochConfig());
  // Do NOT pre-fill on page load or refresh: start clean and empty
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [volumeData, setVolumeData] = useState<WalletVolumeData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchWallet = useCallback(
    async (addr: string) => {
      setIsLoading(true);
      setWalletAddress(addr);
      try {
        const result = await getWalletVolumeData(addr, epochConfig);
        setVolumeData(result);
      } catch (err) {
        console.error('Error fetching volume data:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [epochConfig]
  );

  const handleReset = () => {
    setVolumeData(null);
    setWalletAddress('');
    setIsLoading(false);
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

      {/* Sticky PopDEX /PurplePromise Header */}
      <Header epochConfig={epochConfig} />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 relative z-10">
        {/* INITIAL STATE: When no wallet has been entered yet */}
        {!volumeData && !isLoading && (
          <div className="space-y-8 animate-fadeIn">
            {/* Hero Header */}
            <section className="text-center space-y-3 max-w-2xl mx-auto pt-4 sm:pt-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8077ff]/10 border border-[#8077ff]/25 text-[#bdb9ff] text-xs font-semibold shadow-[0_0_15px_rgba(128,119,255,0.15)]">
                <Sparkles size={12} className="text-[#8077ff]" />
                <span>PopDEX 3P: Weekly Volume Tracker</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
                Trade Volume & <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-white via-[#bdb9ff] to-[#8077ff] bg-clip-text text-transparent">
                  Purple Promise Eligibility
                </span>
              </h1>

              <p className="text-sm sm:text-base text-white/60 font-medium">
                Inspect any EVM wallet to evaluate weekly volume and verify reward qualification.
              </p>
            </section>

            {/* Wallet Search Input */}
            <section className="pt-1">
              <WalletInput
                currentAddress={walletAddress}
                onSearch={fetchWallet}
                isLoading={isLoading}
              />
            </section>

            {/* Compact Minimal Hint Card */}
            <section className="pt-4">
              <div className="w-full max-w-2xl mx-auto glass-panel rounded-2xl p-4 sm:p-5 border border-white/[0.08] bg-[#141518]/80 backdrop-blur-xl">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-[#8077ff]/15 text-[#8077ff] border border-[#8077ff]/30 shrink-0">
                    <Shield size={18} />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white tracking-tight">
                        $100,000 Volume Threshold
                      </h3>
                      <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold uppercase rounded bg-[#8077ff]/20 text-[#bdb9ff] border border-[#8077ff]/30">
                        Rule
                      </span>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed">
                      Generate <strong className="text-white font-mono">$100K+</strong> volume in the active 7-day epoch to earn <strong className="text-emerald-400">PurplePromise Verified</strong> status and protocol rewards.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* HIGH-TECH VISIBLE LOADER STATE */}
        {isLoading && (
          <div className="w-full py-28 flex flex-col items-center justify-center gap-4 animate-fadeIn">
            <div className="relative flex items-center justify-center w-16 h-16">
              <div className="w-16 h-16 rounded-full border border-[#8077ff]/20 animate-ping absolute pointer-events-none" />
              <div className="w-14 h-14 rounded-full border-[3px] border-white/10 border-t-[#8077ff] border-r-[#8077ff]/60 animate-spin shadow-[0_0_30px_rgba(128,119,255,0.7)]" />
              <div className="w-3 h-3 rounded-full bg-[#8077ff] absolute shadow-[0_0_14px_#8077ff]" />
            </div>

            <div className="text-center space-y-1">
              <p className="text-sm font-mono font-semibold text-white tracking-wide">
                Computing Volume Integral...
              </p>
              <p className="text-xs text-white/40 font-mono">
                Querying PopDEX UTA positions
              </p>
            </div>
          </div>
        )}

        {/* SUBMITTED STATE: Only show the data, hiding the search inputs! */}
        {!isLoading && volumeData && (
          <div className="space-y-6 animate-fadeIn">
            {/* Active Inspected Account Bar with Back Action */}
            <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#8077ff]/15 text-[#8077ff] border border-[#8077ff]/30">
                  <Wallet size={18} />
                </div>
                <div>
                  <span className="text-[11px] text-white/40 uppercase font-mono block">
                    Active Account
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm sm:text-base font-mono font-bold text-white">
                      {walletAddress}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                      title="Copy Address"
                    >
                      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Inspect Another Button */}
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/80 hover:text-white text-xs sm:text-sm font-semibold border border-white/10 transition-all duration-200 active:scale-95"
              >
                <ArrowLeft size={14} />
                <span>Change Wallet</span>
              </button>
            </div>

            {/* 1. Eligibility State Card */}
            <EligibilityCard data={volumeData} />

            {/* 2. Seamless Connected Dual-Epoch Chart */}
            <DualEpochChart data={volumeData} epochConfig={epochConfig} />

            {/* 3. Overview Stats Cards */}
            <EpochStatsOverview data={volumeData} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/[0.08] bg-[#0b0b0d]/90 backdrop-blur-xl py-6 px-4 sm:px-8 text-xs text-white/40 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="PopDEX" className="h-4 w-auto object-contain opacity-75" />
            <span className="font-semibold text-white/70">/PurplePromise (3P)</span>
          </div>

          <div className="flex items-center gap-4 text-white/60">
            <a
              href="https://app.popdex.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <span>PopDEX App</span>
              <ExternalLink size={11} />
            </a>
            <a
              href="https://scan.pinsider.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <span>Pinsider Explorer</span>
              <ExternalLink size={11} />
            </a>
            <a
              href="https://creators.pinsider.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <span>Creators</span>
              <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
