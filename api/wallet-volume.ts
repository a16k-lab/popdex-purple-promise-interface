import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';

// Configure proxy for local Node environment if available to guarantee reliable PopDEX API connectivity
try {
  const proxyPath = '/Users/farajioranj/.gemini/antigravity/brain/4267a431-ef04-44c9-8042-8e8896004671/proxies.json';
  if (fs.existsSync(proxyPath)) {
    const proxies = JSON.parse(fs.readFileSync(proxyPath, 'utf8'));
    if (Array.isArray(proxies) && proxies.length > 0) {
      const p = proxies[0];
      const proxyUri = `http://${p.username}:${p.password}@${p.ip}:${p.port}`;
      process.env.HTTPS_PROXY = process.env.HTTPS_PROXY || proxyUri;
      process.env.HTTP_PROXY = process.env.HTTP_PROXY || proxyUri;
    }
  }
} catch {
  // Ignore proxy config error on cloud deployments
}

const POPDEX_API_BASE = 'https://api.popdex.xyz';

interface VolumeEvent {
  timestamp: number;
  volumeUsd: number;
}

async function fetchPopdexApi(endpoint: string): Promise<any> {
  const url = `${POPDEX_API_BASE}${endpoint}`;
  const resp = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'PopDEX-PurplePromise-Tracker/1.0',
    },
  });
  if (!resp.ok) {
    throw new Error(`PopDEX API HTTP ${resp.status}: ${resp.statusText}`);
  }
  return resp.json();
}

export default async function handler(
  req: IncomingMessage & { query?: Record<string, string | string[]> },
  res: ServerResponse & { json?: (data: any) => void; status?: (code: number) => any }
) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const sendJson = (statusCode: number, data: any) => {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };

  try {
    const parsedUrl = new URL(req.url || '', `http://${req.headers?.host || 'localhost'}`);
    const rawAddress =
      (typeof req.query?.address === 'string' ? req.query.address : parsedUrl.searchParams.get('address')) || '';
    const address = rawAddress.trim().toLowerCase();

    const rawStart = Number(
      (typeof req.query?.startTs === 'string' ? req.query.startTs : parsedUrl.searchParams.get('startTs')) || 1789344000000
    );
    const rawEnd = Number(
      (typeof req.query?.endTs === 'string' ? req.query.endTs : parsedUrl.searchParams.get('endTs')) || 1789948800000
    );

    const startMs = rawStart < 100_000_000_000 ? rawStart * 1000 : rawStart;
    const endMs = rawEnd < 100_000_000_000 ? rawEnd * 1000 : rawEnd;
    const duration = endMs - startMs;
    const pastStartMs = startMs - duration;

    if (!address || !address.startsWith('0x') || address.length !== 42) {
      sendJson(400, { error: 'Invalid EVM address format' });
      return;
    }

    // 1. Fetch Open Positions from PopDEX official UTA endpoint
    // https://popdex.xyz/docs/uta/positions/Get-Position
    const openPositionsPromise = fetchPopdexApi(`/api/v1/account/${address}/positions`)
      .then((data) => data?.data || [])
      .catch((err) => {
        console.warn('Failed to fetch open positions:', err?.message);
        return [];
      });

    // 2. Fetch Closed Position History from PopDEX official UTA endpoint
    // https://popdex.xyz/docs/uta/positions/Get-Position-History
    const fetchHistoryPositions = async () => {
      const allHistory: any[] = [];
      let cursor = '';
      const maxPages = 10;
      for (let i = 0; i < maxPages; i++) {
        let endpoint = `/api/v1/account/${address}/history/positions?startTime=${pastStartMs}&limit=100`;
        if (cursor) {
          endpoint += `&cursor=${cursor}`;
        }
        try {
          const json = await fetchPopdexApi(endpoint);
          const list = json?.data || [];
          allHistory.push(...list);
          if (!json?.cursor || list.length < 100) {
            break;
          }
          cursor = json.cursor;
        } catch (err) {
          console.warn(`History page ${i} error:`, err);
          break;
        }
      }
      return allHistory;
    };

    const [openPositions, historyPositions] = await Promise.all([
      openPositionsPromise,
      fetchHistoryPositions(),
    ]);

    const events: VolumeEvent[] = [];

    // Process open positions:
    for (const p of openPositions) {
      const openPrice = parseFloat(p.avgOpenPrice || '0') || 0;
      const holdQty = parseFloat(p.holdQty || '0') || 0;
      const closeQty = parseFloat(p.closeQty || '0') || 0;
      const totalQty = holdQty + closeQty;
      const openTs = Number(p.createdAt) || 0;
      const updateTs = Number(p.updatedAt || p.createdAt) || openTs;

      if (openPrice > 0 && totalQty > 0 && openTs > 0) {
        events.push({
          timestamp: openTs,
          volumeUsd: openPrice * totalQty,
        });
      }

      if (openPrice > 0 && closeQty > 0 && updateTs > 0) {
        events.push({
          timestamp: updateTs,
          volumeUsd: openPrice * closeQty,
        });
      }
    }

    // Process closed history positions:
    for (const h of historyPositions) {
      const openPrice = parseFloat(h.avgOpenPrice || '0') || 0;
      const closePrice = parseFloat(h.avgClosePrice || '0') || openPrice;
      const openQty = parseFloat(h.totalOpenQty || h.closeQty || '0') || 0;
      const closeQty = parseFloat(h.totalCloseQty || h.closeQty || '0') || 0;
      const openTs = Number(h.createdAt) || 0;
      const closeTs = Number(h.updatedAt || h.createdAt) || openTs;

      if (openPrice > 0 && openQty > 0 && openTs > 0) {
        events.push({
          timestamp: openTs,
          volumeUsd: openPrice * openQty,
        });
      }

      if (closePrice > 0 && closeQty > 0 && closeTs > 0) {
        events.push({
          timestamp: closeTs,
          volumeUsd: closePrice * closeQty,
        });
      }
    }

    // Step size for continuous curve: 2 hours
    const stepMs = 2 * 3600 * 1000;
    const pastBuckets = new Map<number, number>();
    const liveBuckets = new Map<number, number>();

    let totalLiveVolumeUsd = 0;
    let totalPastVolumeUsd = 0;
    let liveTradesCount = 0;

    for (const ev of events) {
      if (ev.timestamp >= pastStartMs && ev.timestamp < startMs) {
        totalPastVolumeUsd += ev.volumeUsd;
        const bucketTs = Math.floor((ev.timestamp - pastStartMs) / stepMs) * stepMs + pastStartMs;
        pastBuckets.set(bucketTs, (pastBuckets.get(bucketTs) || 0) + ev.volumeUsd);
      } else if (ev.timestamp >= startMs && ev.timestamp <= endMs) {
        totalLiveVolumeUsd += ev.volumeUsd;
        liveTradesCount++;
        const bucketTs = Math.floor((ev.timestamp - startMs) / stepMs) * stepMs + startMs;
        liveBuckets.set(bucketTs, (liveBuckets.get(bucketTs) || 0) + ev.volumeUsd);
      }
    }

    // Build seamless past curve points across [pastStartMs, startMs]
    const pastPoints = [];
    let pastCumulative = 0;
    for (let t = pastStartMs; t <= startMs; t += stepMs) {
      const vol = t === startMs ? 0 : (pastBuckets.get(t) || 0);
      pastCumulative += vol;
      const d = new Date(t);
      const dayStr = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
      const hourStr = String(d.getUTCHours()).padStart(2, '0') + ':00';
      pastPoints.push({
        timestamp: t,
        timeLabel: `${dayStr} ${hourStr} UTC`,
        isoString: d.toISOString(),
        intervalVolume: Math.round(vol * 100) / 100,
        cumulativeVolume: Math.round(pastCumulative * 100) / 100,
        epochType: 'past' as const,
        percentAlongEpoch: Math.min(1, (t - pastStartMs) / duration),
      });
    }

    // Build live curve points strictly up to the current hour (Date.now())
    const now = Date.now();
    const effectiveEnd = Math.min(now, endMs);
    const livePoints = [];
    let liveCumulative = 0;
    for (let t = startMs; t <= effectiveEnd; t += stepMs) {
      const vol = liveBuckets.get(t) || 0;
      liveCumulative += vol;
      const d = new Date(t);
      const dayStr = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
      const hourStr = String(d.getUTCHours()).padStart(2, '0') + ':00';
      livePoints.push({
        timestamp: t,
        timeLabel: `${dayStr} ${hourStr} UTC`,
        isoString: d.toISOString(),
        intervalVolume: Math.round(vol * 100) / 100,
        cumulativeVolume: Math.round(liveCumulative * 100) / 100,
        epochType: 'live' as const,
        percentAlongEpoch: (t - startMs) / duration,
      });
    }

    // Append precise real-time now head point so the chart NOW indicator matches current minute
    if (livePoints.length > 0 && now > livePoints[livePoints.length - 1].timestamp && now < endMs) {
      const d = new Date(now);
      const dayStr = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
      const hourStr = String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0');
      livePoints.push({
        timestamp: now,
        timeLabel: `${dayStr} ${hourStr} UTC`,
        isoString: d.toISOString(),
        intervalVolume: 0,
        cumulativeVolume: Math.round(liveCumulative * 100) / 100,
        epochType: 'live' as const,
        percentAlongEpoch: Math.min(1, (now - startMs) / duration),
      });
    }

    const allPoints = [...pastPoints, ...livePoints];
    const targetVolumeUsd = 100000;
    const isEligible = totalLiveVolumeUsd >= targetVolumeUsd;
    const remainingUsdNeeded = Math.max(0, targetVolumeUsd - totalLiveVolumeUsd);
    const progressPercent = Math.min(100, (totalLiveVolumeUsd / targetVolumeUsd) * 100);
    const avgOrderSizeUsd = liveTradesCount > 0 ? totalLiveVolumeUsd / liveTradesCount : 0;

    const responseData = {
      address,
      totalLiveVolumeUsd: Math.round(totalLiveVolumeUsd * 100) / 100,
      totalPastVolumeUsd: Math.round(totalPastVolumeUsd * 100) / 100,
      targetVolumeUsd,
      isEligible,
      remainingUsdNeeded: Math.round(remainingUsdNeeded * 100) / 100,
      progressPercent: Math.round(progressPercent * 10) / 10,
      pastPoints,
      livePoints,
      allPoints,
      tradeCount: liveTradesCount,
      totalOrders: events.length,
      avgOrderSizeUsd: Math.round(avgOrderSizeUsd * 100) / 100,
      lastActiveTs: Date.now(),
      source: 'popdex_uta_positions',
    };

    sendJson(200, responseData);
  } catch (err: any) {
    console.error('PopDEX UTA volume calculation error:', err);
    sendJson(500, { error: err?.message || 'Server error' });
  }
}
