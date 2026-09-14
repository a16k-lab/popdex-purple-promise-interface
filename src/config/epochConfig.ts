import type { EpochConfig } from '../types';

export const TARGET_VOLUME_USD = Number(import.meta.env.VITE_TARGET_VOLUME_USD) || 100_000;

/**
 * Returns the Monday 00:00:00 UTC for a given timestamp
 */
function getMondayUtc(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Parses a Unix timestamp (seconds or milliseconds) or ISO string to milliseconds
 */
export function parseTimestampToMs(input?: string): number | null {
  if (!input) return null;
  const trimmed = input.trim();
  const num = Number(trimmed);

  // If it's a numeric Unix timestamp
  if (!isNaN(num) && num > 0) {
    // If provided in seconds (e.g. 10 digits < 100 billion), convert to milliseconds
    if (num < 100_000_000_000) {
      return num * 1000;
    }
    return num;
  }

  // Fallback if provided as ISO date string
  const parsed = new Date(trimmed).getTime();
  if (!isNaN(parsed) && parsed > 0) {
    return parsed;
  }

  return null;
}

export function getEpochConfig(): EpochConfig {
  const envStart = import.meta.env.VITE_EPOCH_START;
  const envEnd = import.meta.env.VITE_EPOCH_END;
  const envEpochNumber = import.meta.env.VITE_EPOCH_NUMBER;

  let startTime: number;
  let endTime: number;
  let isConfiguredViaEnv = false;

  const parsedStart = parseTimestampToMs(envStart);
  const parsedEnd = parseTimestampToMs(envEnd);

  if (parsedStart && parsedEnd && parsedEnd > parsedStart) {
    startTime = parsedStart;
    endTime = parsedEnd;
    isConfiguredViaEnv = true;
  } else {
    // Default fallback: current 7-day week (Monday to Monday)
    const monday = getMondayUtc(new Date());
    startTime = monday.getTime();
    endTime = startTime + 7 * 24 * 60 * 60 * 1000;
  }

  const durationMs = endTime - startTime;
  const pastStartTime = startTime - durationMs;
  const pastEndTime = startTime;

  // Epoch number: configurable via VITE_EPOCH_NUMBER, with fallback calculation
  let epochNumber: number;
  if (envEpochNumber && !isNaN(Number(envEpochNumber)) && Number(envEpochNumber) > 0) {
    epochNumber = Math.floor(Number(envEpochNumber));
  } else {
    const genesisEpoch = new Date('2026-09-07T00:00:00Z').getTime();
    epochNumber = Math.max(1, Math.floor((startTime - genesisEpoch) / (7 * 24 * 3600 * 1000)) + 1);
  }

  return {
    startTime,
    endTime,
    durationMs,
    pastStartTime,
    pastEndTime,
    epochNumber,
    isConfiguredViaEnv,
  };
}

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  formatted: string;
}

export function getCountdown(endTimeMs: number): Countdown {
  const now = Date.now();
  const diff = endTimeMs - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, formatted: 'Epoch Ended' };
  }

  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (days > 0 || hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);

  return {
    days,
    hours,
    minutes,
    seconds,
    isExpired: false,
    formatted: parts.length > 0 ? parts.join(' ') : '< 1m',
  };
}

export function formatDateLabel(timestamp: number): string {
  const d = new Date(timestamp);
  const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  const day = d.getUTCDate();
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  return `${month} ${day}, ${hours}:${minutes} UTC`;
}
