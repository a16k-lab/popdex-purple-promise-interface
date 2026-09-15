import type { EpochConfig, PresetWallet, WalletVolumeData } from '../types';
import { TARGET_VOLUME_USD } from '../config/epochConfig';

export const PRESET_WALLETS: PresetWallet[] = [
  {
    label: '🐋 Whale Trader',
    tag: 'Verified • $4.0M Live',
    address: '0xcfb9a2dedfac8198d67d7701781d2ed0a66e20d9',
    expectedVolume: '$3,999,525',
    eligible: true,
    color: '#10b981',
  },
  {
    label: '🦈 Pro Trader',
    tag: 'Verified • $14.0M Live',
    address: '0x563ce083cab911207a5253ae60d438fd88cf6455',
    expectedVolume: '$13,996,596',
    eligible: true,
    color: '#10b981',
  },
  {
    label: '🦐 Approaching Goal',
    tag: 'Ineligible • $32.2K Live',
    address: '0xa97f1bcaf2e93eab173ee006817d46c5f0f7299f',
    expectedVolume: '$32,216',
    eligible: false,
    color: '#ef4444',
  },
];

export type VolumeScope = 'live' | 'past';

export function emptyVolumeData(address: string): WalletVolumeData {
  return {
    address,
    totalLiveVolumeUsd: 0,
    totalPastVolumeUsd: 0,
    targetVolumeUsd: TARGET_VOLUME_USD,
    isEligible: false,
    remainingUsdNeeded: TARGET_VOLUME_USD,
    progressPercent: 0,
    pastPoints: [],
    livePoints: [],
    allPoints: [],
    tradeCount: 0,
    avgOrderSizeUsd: 0,
    lastActiveTs: Date.now(),
    complete: true,
    source: 'popdex_fills',
  };
}

/**
 * Streams one scope (live or past epoch) of a wallet's volume from /api/wallet-volume.
 * The API writes NDJSON: a full snapshot per finished slice, the last one being final.
 * `onUpdate` fires for every snapshot; the promise resolves with the final one.
 */
export async function streamWalletVolume(
  address: string,
  epochConfig: EpochConfig,
  scope: VolumeScope,
  onUpdate: (snapshot: WalletVolumeData) => void,
  signal?: AbortSignal,
): Promise<WalletVolumeData | null> {
  const cleanAddr = address.trim().toLowerCase();
  try {
    const resp = await fetch(
      `/api/wallet-volume?address=${cleanAddr}&startTs=${epochConfig.startTime}&endTs=${epochConfig.endTime}&scope=${scope}`,
      { signal },
    );
    if (!resp.ok || !resp.body) return null;

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let last: WalletVolumeData | null = null;
    const consume = (line: string) => {
      if (!line.trim()) return;
      try {
        const snap = JSON.parse(line) as WalletVolumeData;
        if (snap && Array.isArray(snap.allPoints)) {
          last = snap;
          onUpdate(snap);
        }
      } catch {
        /* partial line */
      }
    };
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      lines.forEach(consume);
    }
    consume(buffer);
    return last;
  } catch (err) {
    if ((err as Error)?.name !== 'AbortError') console.error(`Failed to stream ${scope} volume:`, err);
    return null;
  }
}
