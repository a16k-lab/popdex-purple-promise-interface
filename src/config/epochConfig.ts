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

// All timestamps are absolute instants (ms since epoch); the epoch boundaries are
// defined in UTC so they are the same for everyone. Everything the viewer *reads*
// is rendered in their own timezone so "Sunday" means their Sunday.

/** "Sep 14, 03:30" in the viewer's timezone. */
export function formatDateLabel(timestamp: number): string {
  const d = new Date(timestamp);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date}, ${time}`;
}

/** "Sep 14" in the viewer's timezone. */
export function formatShortDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** "Mon 02:00" (bucket start) or "Mon 02:37" in the viewer's timezone. */
export function formatBucketLabel(timestamp: number): string {
  const d = new Date(timestamp);
  const day = d.toLocaleDateString('en-US', { weekday: 'short' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} ${time}`;
}

/** "UTC+03:30" / "UTC" — the viewer's offset, for a one-line disclosure. */
export function localTzLabel(): string {
  const offsetMin = -new Date().getTimezoneOffset();
  if (offsetMin === 0) return 'UTC';
  const sign = offsetMin > 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `UTC${sign}${hh}:${mm}`;
}

/** "7d", "14d", "23.5d", "36h" — the epoch length, for copy that must not assume a week. */
export function formatDuration(ms: number): string {
  const hours = ms / 3_600_000;
  if (hours < 48) return `${Math.round(hours)}h`;
  const days = hours / 24;
  return `${Number.isInteger(days) ? days : days.toFixed(1)}d`;
}
