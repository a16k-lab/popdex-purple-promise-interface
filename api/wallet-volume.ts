import type { IncomingMessage, ServerResponse } from 'http';

// Traded volume per wallet from PopDEX UTA trade fills:
//   GET /api/v1/account/{walletId}/trade/fills?startTime&endTime&limit&cursor
// Each fill carries execValue (USD notional) and createdAt. Fills are summed into
// 2-hour buckets — the same number the exchange reports as traded volume.
//
// Request:  /api/wallet-volume?address=0x…&startTs&endTs&scope=live|past|both
// Response: newline-delimited JSON. Every line is a full WalletVolumeData snapshot
// for the requested scope with `progress: {done,total}`; the last line has
// done === total. Clients that ignore streaming can just parse the last line.

const POPDEX_API_BASE = 'https://api.popdex.xyz';
const STEP_MS = 2 * 3600 * 1000; // chart bucket
const SLICE_MS = 6 * 3600 * 1000; // fetch window per parallel task (multiple of STEP_MS)
const CONCURRENCY = 12; // 16 is still fine, 24 trips PopDEX rate limits
const PAGE_LIMIT = 100; // API maximum
const MAX_PAGES_PER_SLICE = 150;
const DEADLINE_MS = 45_000; // stay under the function's maxDuration
const TARGET_VOLUME_USD = Number(process.env.TARGET_VOLUME_USD || process.env.VITE_TARGET_VOLUME_USD) || 100_000;

// A fetched slice, reduced to what the chart needs: USD per 2h bucket + fill count.
type Slice = { b: [number, number][]; n: number; c: boolean };

// ---------- caching: memory (per instance) + optional Upstash/Vercel KV (shared) ----------

const memory = new Map<string, { at: number; ttl: number; value: Slice }>();
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const kvEnabled = Boolean(KV_URL && KV_TOKEN);

async function kvGet(key: string): Promise<Slice | null> {
  if (!kvEnabled) return null;
  try {
    const r = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${KV_TOKEN}` } });
    const j = (await r.json()) as { result?: string | null };
    return j?.result ? (JSON.parse(j.result) as Slice) : null;
  } catch {
    return null;
  }
}
async function kvSet(key: string, value: Slice, ttlSec: number) {
  if (!kvEnabled) return;
  try {
    await fetch(`${KV_URL}/set/${encodeURIComponent(key)}?EX=${ttlSec}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    });
  } catch {
    /* cache is best-effort */
  }
}

async function cacheGet(key: string): Promise<Slice | null> {
  const hit = memory.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.value;
  memory.delete(key);
  const shared = await kvGet(key);
  if (shared) memory.set(key, { at: Date.now(), ttl: 6 * 3600_000, value: shared });
  return shared;
}
async function cacheSet(key: string, value: Slice, finished: boolean) {
  if (memory.size > 5000) memory.clear();
  memory.set(key, { at: Date.now(), ttl: finished ? 6 * 3600_000 : 90_000, value });
  if (finished) await kvSet(key, value, 14 * 24 * 3600); // a finished window never changes
}

// ---------- PopDEX ----------

async function fetchJson(url: string, deadline: number): Promise<any> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), Math.max(1000, deadline - Date.now()));
  try {
    const resp = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'PopDEX-PurplePromise-Tracker/2.1' },
      signal: controller.signal,
    });
    return await resp.json();
  } finally {
    clearTimeout(t);
  }
}

// Fills in [from, to], summed per bucket. `c` (complete) is false if a page couldn't be read.
async function fetchSlice(address: string, from: number, to: number, bucketOrigin: number, deadline: number): Promise<Slice> {
  const key = `pp:v2:${address}:${from}:${to}`;
  const hit = await cacheGet(key);
  if (hit) return hit;

  const buckets = new Map<number, number>();
  let n = 0;
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
    if (json?.code !== '200') { console.warn('fills page failed', { from, to, page, code: json?.code, msg: json?.msg }); complete = false; break; }
    const list: { execValue: string; createdAt: string }[] = json.data || [];
    for (const f of list) {
      const ts = Number(f.createdAt);
      const v = Number(f.execValue) || 0;
      if (ts < from || ts > to) continue;
      const b = Math.floor((ts - bucketOrigin) / STEP_MS) * STEP_MS + bucketOrigin;
      buckets.set(b, (buckets.get(b) || 0) + v);
      n++;
    }
    if (!json.cursor || list.length < PAGE_LIMIT) break;
    cursor = json.cursor;
  }

  const slice: Slice = { b: [...buckets.entries()], n, c: complete };
  if (complete) await cacheSet(key, slice, to < Date.now() - 5 * 60_000);
  return slice;
}

// ---------- response building ----------

const r2 = (n: number) => Math.round(n * 100) / 100;
const bucketLabel = (t: number, withMinutes = false) => {
  const d = new Date(t);
  const day = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = withMinutes ? ':' + String(d.getUTCMinutes()).padStart(2, '0') : ':00';
  return `${day} ${hh}${mm} UTC`;
};

function buildPoints(buckets: Map<number, number>, from: number, to: number, duration: number, type: 'past' | 'live', closeAtZero: boolean) {
  const points = [];
  let cumulative = 0;
  for (let t = from; t <= to; t += STEP_MS) {
    const vol = closeAtZero && t === to ? 0 : buckets.get(t) || 0;
    cumulative += vol;
    points.push({
      timestamp: t,
      timeLabel: bucketLabel(t),
      isoString: new Date(t).toISOString(),
      intervalVolume: r2(vol),
      cumulativeVolume: r2(cumulative),
      epochType: type,
      percentAlongEpoch: Math.min(1, (t - from) / duration),
    });
  }
  return { points, cumulative };
}

export default async function handler(
  req: IncomingMessage & { query?: Record<string, string | string[]> },
  res: ServerResponse & { flush?: () => void }
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const sendError = (statusCode: number, error: string) => {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error }));
  };

  try {
    const parsedUrl = new URL(req.url || '', `http://${req.headers?.host || 'localhost'}`);
    const q = (k: string) => (typeof req.query?.[k] === 'string' ? (req.query![k] as string) : parsedUrl.searchParams.get(k)) || '';
    const address = q('address').trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(address)) return sendError(400, 'Invalid EVM address format');

    const toMs = (v: string, fallback: number) => {
      const n = Number(v);
      if (!n) return fallback;
      return n < 100_000_000_000 ? n * 1000 : n;
    };
    const now = Date.now();
    const defaultStart = (() => { const d = new Date(now); const day = d.getUTCDay(); d.setUTCDate(d.getUTCDate() - day + (day === 0 ? -6 : 1)); d.setUTCHours(0, 0, 0, 0); return d.getTime(); })();
    const startMs = toMs(q('startTs'), defaultStart);
    const endMs = toMs(q('endTs'), startMs + 7 * 24 * 3600_000);
    if (endMs <= startMs) return sendError(400, 'endTs must be after startTs');
    const scope = (['live', 'past', 'both'].includes(q('scope')) ? q('scope') : 'both') as 'live' | 'past' | 'both';

    const duration = endMs - startMs;
    const pastStartMs = startMs - duration;
    const deadline = now + DEADLINE_MS;

    // Work list: 6h slices, each aligned to its epoch start so buckets line up.
    type Task = { type: 'past' | 'live'; from: number; to: number; origin: number };
    const tasks: Task[] = [];
    const addSlices = (type: 'past' | 'live', from: number, to: number) => {
      for (let t = from; t < to; t += SLICE_MS) tasks.push({ type, from: t, to: Math.min(t + SLICE_MS, to) - 1, origin: from });
    };
    // Live first: it answers "am I eligible?"; the past epoch is context.
    if (scope !== 'past') addSlices('live', startMs, Math.min(endMs, now));
    if (scope !== 'live') addSlices('past', pastStartMs, startMs);

    const pastBuckets = new Map<number, number>();
    const liveBuckets = new Map<number, number>();
    let liveFills = 0;
    let pastFills = 0;
    let done = 0;
    let allComplete = true;

    const snapshot = (final: boolean) => {
      const nowTs = Date.now();
      const past = buildPoints(pastBuckets, pastStartMs, startMs, duration, 'past', true);
      const liveEnd = Math.min(nowTs, endMs);
      const live = buildPoints(liveBuckets, startMs, liveEnd, duration, 'live', false);
      if (live.points.length > 0 && nowTs > live.points[live.points.length - 1].timestamp && nowTs < endMs) {
        live.points.push({
          timestamp: nowTs,
          timeLabel: bucketLabel(nowTs, true),
          isoString: new Date(nowTs).toISOString(),
          intervalVolume: 0,
          cumulativeVolume: r2(live.cumulative),
          epochType: 'live' as const,
          percentAlongEpoch: Math.min(1, (nowTs - startMs) / duration),
        });
      }
      const totalLive = live.cumulative;
      const totalPast = past.cumulative;
      return {
        address,
        scope,
        totalLiveVolumeUsd: r2(totalLive),
        totalPastVolumeUsd: r2(totalPast),
        targetVolumeUsd: TARGET_VOLUME_USD,
        isEligible: totalLive >= TARGET_VOLUME_USD,
        remainingUsdNeeded: r2(Math.max(0, TARGET_VOLUME_USD - totalLive)),
        progressPercent: Math.round(Math.min(100, (totalLive / TARGET_VOLUME_USD) * 100) * 10) / 10,
        pastPoints: scope === 'live' ? [] : past.points,
        livePoints: scope === 'past' ? [] : live.points,
        allPoints: [...(scope === 'live' ? [] : past.points), ...(scope === 'past' ? [] : live.points)],
        tradeCount: liveFills,
        totalOrders: liveFills + pastFills,
        avgOrderSizeUsd: r2(liveFills > 0 ? totalLive / liveFills : 0),
        lastActiveTs: nowTs,
        progress: { done, total: tasks.length },
        complete: final ? allComplete : false,
        source: 'popdex_fills',
      };
    };

    // Stream one NDJSON line per finished slice (throttled), then the final snapshot.
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Accel-Buffering', 'no');
    let lastFlush = 0;
    const emit = (final: boolean) => {
      const t = Date.now();
      if (!final && t - lastFlush < 250) return;
      lastFlush = t;
      res.write(JSON.stringify(snapshot(final)) + '\n');
      res.flush?.();
    };
    emit(false);

    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, async () => {
        while (next < tasks.length) {
          const task = tasks[next++];
          const slice = await fetchSlice(address, task.from, task.to, task.origin, deadline);
          const target = task.type === 'live' ? liveBuckets : pastBuckets;
          for (const [b, v] of slice.b) target.set(b, (target.get(b) || 0) + v);
          if (task.type === 'live') liveFills += slice.n; else pastFills += slice.n;
          if (!slice.c) allComplete = false;
          done++;
          emit(false);
        }
      }),
    );

    emit(true);
    res.end();
  } catch (err: any) {
    console.error('PopDEX fills volume error:', err);
    if (!res.headersSent) sendError(500, err?.message || 'Server error');
    else res.end();
  }
}
