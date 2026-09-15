export type EpochType = 'past' | 'live';

export interface ChartPoint {
  timestamp: number;
  timeLabel: string;
  isoString: string;
  intervalVolume: number; // Volume in this time bucket
  cumulativeVolume: number; // Integral volume up to this point in epoch
  epochType: EpochType;
  percentAlongEpoch: number; // 0 to 1 within its epoch
}

export interface EpochConfig {
  startTime: number; // Current live epoch start (ms)
  endTime: number; // Current live epoch end (ms)
  durationMs: number;
  pastStartTime: number; // Past epoch start (ms)
  pastEndTime: number; // Past epoch end (ms) - identical to startTime
  epochNumber: number;
  isConfiguredViaEnv: boolean;
}

export interface WalletVolumeData {
  address: string;
  totalLiveVolumeUsd: number;
  totalPastVolumeUsd: number;
  targetVolumeUsd: number;
  isEligible: boolean;
  remainingUsdNeeded: number;
  progressPercent: number;
  pastPoints: ChartPoint[];
  livePoints: ChartPoint[];
  allPoints: ChartPoint[];
  tradeCount: number;
  avgOrderSizeUsd: number;
  lastActiveTs: number;
  complete?: boolean; // false when the API hit its time budget — totals are a lower bound
  progress?: { done: number; total: number }; // fetch progress of the streamed response
  scope?: 'live' | 'past' | 'both';
  source: 'popdex_fills' | 'popdex_uta_positions' | 'popdex_onchain' | 'live_api' | 'simulated';
}

export interface PresetWallet {
  label: string;
  tag: string;
  address: string;
  expectedVolume: string;
  eligible: boolean;
  color: string;
}
