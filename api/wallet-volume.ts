import type { IncomingMessage, ServerResponse } from 'http';

// Traded volume per wallet, computed from PopDEX UTA trade fills:
//   GET /api/v1/account/{walletId}/trade/fills?startTime&endTime&limit&cursor
// Each fill carries execValue (USD notional) and createdAt, so summing fills per
// 2-hour bucket gives exactly what the exchange itself reports as traded volume.
// (Positions/orders were the wrong source: a position aggregates many fills over
// days into one record, and order history is dominated by cancelled orders.)

const POPDEX_API_BASE = 'https://api.popdex.xyz';
const STEP_MS = 2 * 3600 * 1000; // chart bucket
const SLICE_MS = 6 * 3600 * 1000; // fetch window per parallel task
const CONCURRENCY = 8; // >16 starts tripping PopDEX rate limits
const PAGE_LIMIT = 100; // API maximum
const MAX_PAGES_PER_SLICE = 120;
const DEADLINE_MS = 45_000; // stay under the function's maxDuration
const TARGET_VOLUME_USD = Number(process.env.TARGET_VOLUME_USD || process.env.VITE_TARGET_VOLUME_USD) || 100_000;

interface Fill {
  execId: string;
  execValue: string;
  createdAt: string;
  category?: string;
}

type SliceResult = { fills: Fill[]; complete: boolean };

// Per-instance cache: a finished epoch never changes, the live one is refreshed often.
const cache = new Map<string, { at: number; ttl: number; value: SliceResult }>();
const cached = (key: string) => {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.value;
  cache.delete(key);
  return null;
};
const remember = (key: string, value: SliceResult, ttl: number) => {
  if (cache.size > 2000) cache.clear();
  cache.set(key, { at: Date.now(), ttl, value });
};

async function fetchJson(url: string, deadline: number): Promise<any> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), Math.max(1000, deadline - Date.now()));
  try {
    const resp = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'PopDEX-PurplePromise-Tracker/2.0' },
      signal: controller.signal,
    });
    return await resp.json();
  } finally {
    clearTimeout(t);
  }
}

// All fills in [from, to], paginated. `complete` is false if a page could not be read.
async function fetchFillsSlice(address: string, from: number, to: number, deadline: number): Promise<SliceResult> {
  const key = `${address}:${from}:${to}`;
  const hit = cached(key);
  if (hit) return hit;

  const fills: Fill[] = [];
  let cursor = '';
  let complete = true;
  for (let page = 0; page < MAX_PAGES_PER_SLICE; page++) {
    if (Date.now() > deadline) { complete = false; break; }
    const url =
      `${POPDEX_API_BASE}/api/v1/account/${address}/trade/fills` +
      `?startTime=${from}&endTime=${to}&limit=${PAGE_LIMIT}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    let json: any = null;
    for (let attempt = 0; attempt < 4 && Date.now() < deadline; attempt++) {
      try {
        json = await fetchJson(url, deadline);
        if (json?.code === '200') break;
      } catch {
        json = null;
      }
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    }
    if (json?.code !== '200') { complete = false; break; }
    const list: Fill[] = json.data || [];
    fills.push(...list);
    if (!json.cursor || list.length < PAGE_LIMIT) break;
    cursor = json.cursor;
  }

  const result = { fills, complete };
  if (complete) {
    const finished = to < Date.now() - 5 * 60_000; // window fully in the past
    remember(key, result, finished ? 6 * 3600_000 : 90_000);
  }
  return result;
}

async function fetchFills(address: string, from: number, to: number, deadline: number): Promise<SliceResult> {
  const slices: [number, number][] = [];
  for (let t = from; t < to; t += SLICE_MS) slices.push([t, Math.min(t + SLICE_MS, to) - 1]);

  const results: SliceResult[] = new Array(slices.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, slices.length) }, async () => {
      while (next < slices.length) {
        const i = next++;
        results[i] = await fetchFillsSlice(address, slices[i][0], slices[i][1], deadline);
      }
    }),
  );

  const seen = new Set<string>();
  const fills: Fill[] = [];
  for (const r of results) for (const f of r.fills) if (!seen.has(f.execId)) { seen.add(f.execId); fills.push(f); }
  return { fills, complete: results.every((r) => r.complete) };
}

const bucketLabel = (t: number, withMinutes = false) => {
  const d = new Date(t);
  const day = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = withMinutes ? ':' + String(d.getUTCMinutes()).padStart(2, '0') : ':00';
  return `${day} ${hh}${mm} UTC`;
};

export default async function handler(
  req: IncomingMessage & { query?: Record<string, string | string[]> },
  res: ServerResponse & { json?: (data: any) => void; status?: (code: number) => any }
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const sendJson = (statusCode: number, data: any) => {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(data));
  };

  try {
    const parsedUrl = new URL(req.url || '', `http://${req.headers?.host || 'localhost'}`);
    const q = (k: string) => (typeof req.query?.[k] === 'string' ? (req.query![k] as string) : parsedUrl.searchParams.get(k)) || '';
    const address = q('address').trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(address)) {
      sendJson(400, { error: 'Invalid EVM address format' });
      return;
    }

    const toMs = (v: string, fallback: number) => {
      const n = Number(v);
      if (!n) return fallback;
      return n < 100_000_000_000 ? n * 1000 : n;
    };
    const now = Date.now();
    const defaultStart = (() => { const d = new Date(now); const day = d.getUTCDay(); d.setUTCDate(d.getUTCDate() - day + (day === 0 ? -6 : 1)); d.setUTCHours(0, 0, 0, 0); return d.getTime(); })();
    const startMs = toMs(q('startTs'), defaultStart);
    const endMs = toMs(q('endTs'), startMs + 7 * 24 * 3600_000);
    if (endMs <= startMs) {
      sendJson(400, { error: 'endTs must be after startTs' });
      return;
    }
    const duration = endMs - startMs;
    const pastStartMs = startMs - duration;
    const deadline = now + DEADLINE_MS;

    // Past epoch and elapsed part of the live epoch, fetched in parallel time slices.
    const [past, live] = await Promise.all([
      fetchFills(address, pastStartMs, startMs, deadline),
      fetchFills(address, startMs, Math.min(endMs, now), deadline),
    ]);

    const pastBuckets = new Map<number, number>();
    const liveBuckets = new Map<number, number>();
    let totalPastVolumeUsd = 0;
    let totalLiveVolumeUsd = 0;
    let liveFillCount = 0;

    for (const f of past.fills) {
      const ts = Number(f.createdAt);
      const v = Number(f.execValue) || 0;
      if (ts < pastStartMs || ts >= startMs) continue;
      totalPastVolumeUsd += v;
      const b = Math.floor((ts - pastStartMs) / STEP_MS) * STEP_MS + pastStartMs;
      pastBuckets.set(b, (pastBuckets.get(b) || 0) + v);
    }
    for (const f of live.fills) {
      const ts = Number(f.createdAt);
      const v = Number(f.execValue) || 0;
      if (ts < startMs || ts > endMs) continue;
      totalLiveVolumeUsd += v;
      liveFillCount++;
      const b = Math.floor((ts - startMs) / STEP_MS) * STEP_MS + startMs;
      liveBuckets.set(b, (liveBuckets.get(b) || 0) + v);
    }

    const r2 = (n: number) => Math.round(n * 100) / 100;

    // Past curve across [pastStartMs, startMs]; the final point closes the epoch at zero.
    const pastPoints = [];
    let pastCumulative = 0;
    for (let t = pastStartMs; t <= startMs; t += STEP_MS) {
      const vol = t === startMs ? 0 : pastBuckets.get(t) || 0;
      pastCumulative += vol;
      pastPoints.push({
        timestamp: t,
        timeLabel: bucketLabel(t),
        isoString: new Date(t).toISOString(),
        intervalVolume: r2(vol),
        cumulativeVolume: r2(pastCumulative),
        epochType: 'past' as const,
        percentAlongEpoch: Math.min(1, (t - pastStartMs) / duration),
      });
    }

    // Live curve up to the current bucket, plus a head point at "now".
    const effectiveEnd = Math.min(now, endMs);
    const livePoints = [];
    let liveCumulative = 0;
    for (let t = startMs; t <= effectiveEnd; t += STEP_MS) {
      const vol = liveBuckets.get(t) || 0;
      liveCumulative += vol;
      livePoints.push({
        timestamp: t,
        timeLabel: bucketLabel(t),
        isoString: new Date(t).toISOString(),
        intervalVolume: r2(vol),
        cumulativeVolume: r2(liveCumulative),
        epochType: 'live' as const,
        percentAlongEpoch: (t - startMs) / duration,
      });
    }
    if (livePoints.length > 0 && now > livePoints[livePoints.length - 1].timestamp && now < endMs) {
      livePoints.push({
        timestamp: now,
        timeLabel: bucketLabel(now, true),
        isoString: new Date(now).toISOString(),
        intervalVolume: 0,
        cumulativeVolume: r2(liveCumulative),
        epochType: 'live' as const,
        percentAlongEpoch: Math.min(1, (now - startMs) / duration),
      });
    }

    const isEligible = totalLiveVolumeUsd >= TARGET_VOLUME_USD;
    sendJson(200, {
      address,
      totalLiveVolumeUsd: r2(totalLiveVolumeUsd),
      totalPastVolumeUsd: r2(totalPastVolumeUsd),
      targetVolumeUsd: TARGET_VOLUME_USD,
      isEligible,
      remainingUsdNeeded: r2(Math.max(0, TARGET_VOLUME_USD - totalLiveVolumeUsd)),
      progressPercent: Math.round(Math.min(100, (totalLiveVolumeUsd / TARGET_VOLUME_USD) * 100) * 10) / 10,
      pastPoints,
      livePoints,
      allPoints: [...pastPoints, ...livePoints],
      tradeCount: liveFillCount,
      totalOrders: past.fills.length + live.fills.length,
      avgOrderSizeUsd: r2(liveFillCount > 0 ? totalLiveVolumeUsd / liveFillCount : 0),
      lastActiveTs: now,
      // false when a page could not be read before the deadline — totals are then a lower bound.
      complete: past.complete && live.complete,
      source: 'popdex_fills',
    });
  } catch (err: any) {
    console.error('PopDEX fills volume error:', err);
    sendJson(500, { error: err?.message || 'Server error' });
  }
}
