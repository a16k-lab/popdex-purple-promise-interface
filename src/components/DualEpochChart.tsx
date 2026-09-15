import React, { useState, useRef, useLayoutEffect } from 'react';
import type { ChartPoint, EpochConfig, WalletVolumeData } from '../types';
import { formatDateLabel, formatShortDate, formatBucketLabel, localTzLabel, getCountdown, formatDuration, CHART_WINDOW_BUCKETS } from '../config/epochConfig';

const shortDate = formatShortDate;
import { Activity, Sparkles, Clock } from 'lucide-react';

interface DualEpochChartProps {
  data: WalletVolumeData;
  epochConfig: EpochConfig;
  /** While the previous epoch is still streaming in: its fetch progress. */
  pastLoading?: { done: number; total: number } | null;
}

export const DualEpochChart: React.FC<DualEpochChartProps> = ({ data, epochConfig, pastLoading }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<(ChartPoint & { windowVolume?: number }) | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);
  const [isHoveringFuture, setIsHoveringFuture] = useState(false);

  const countdown = getCountdown(epochConfig.endTime);

  // The SVG is drawn in CSS pixels: the viewBox tracks the container's real width,
  // so labels, badges and stroke widths stay the same size on a phone as on a desktop
  // instead of being scaled down with the chart.
  const [containerWidth, setContainerWidth] = useState(1000);
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setContainerWidth(Math.max(300, Math.round(el.getBoundingClientRect().width)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isNarrow = containerWidth < 640;
  // Phones show one epoch at a time (full width, switchable); wider screens show both side by side.
  const [mobileView, setMobileView] = useState<'live' | 'past'>('live');
  const view: 'both' | 'live' | 'past' = isNarrow ? mobileView : 'both';
  const showPast = view !== 'live';
  const showLive = view !== 'past';
  const viewBoxWidth = containerWidth;
  const viewBoxHeight = isNarrow ? 340 : 380;
  const padLeft = isNarrow ? 44 : 48;
  const padRight = isNarrow ? 14 : 40;
  const padTop = 50;
  const padBottom = 45;

  const chartWidth = viewBoxWidth - padLeft - padRight; // 920
  const chartHeight = viewBoxHeight - padTop - padBottom;
  const midX = padLeft + chartWidth / 2; // Exactly 500 (50% center junction)
  const rightEdge = viewBoxWidth - padRight; // 960 (100% end of epoch)
  const halfWidth = chartWidth / 2; // 460
  const groundY = padTop + chartHeight;

  // Horizontal span of each epoch: half the chart when both are shown, all of it otherwise.
  const pastX0 = padLeft;
  const pastSpan = showLive ? halfWidth : chartWidth;
  const pastX1 = pastX0 + pastSpan;
  const liveX0 = showPast ? midX : padLeft;
  const liveSpan = showPast ? halfWidth : chartWidth;

  // Dynamic Square-Root Normalizer (Sub-linear Power Transform)
  // Compresses outlier whale peaks so standard trading activity remains clear, dynamic and off the floor
  const transformVol = (v: number) => Math.sqrt(Math.max(0, v));
  const invertVol = (t: number) => Math.pow(t, 2);

  // The curve plots a ROLLING window: each 2h point shows the volume of the last
  // WINDOW_BUCKETS buckets (3 × 2h = 6h). Data stays at 2h resolution, so the line keeps
  // its detail, but a single-bucket spike spreads over three points instead of forming a
  // needle. Every drawn value is a real number (the trailing 6h sum) — hover shows it,
  // plus the raw 2h bucket and the running total.
  const WINDOW_BUCKETS = CHART_WINDOW_BUCKETS;
  type WindowedPoint = ChartPoint & { windowVolume: number };
  const withWindow = (pts: ChartPoint[]): WindowedPoint[] =>
    pts.map((p, i) => {
      let sum = 0;
      for (let k = Math.max(0, i - WINDOW_BUCKETS + 1); k <= i; k++) sum += pts[k].intervalVolume || 0;
      return { ...p, windowVolume: Math.round(sum * 100) / 100 };
    });
  const pastSeries = withWindow(data.pastPoints);
  const liveSeries = withWindow(data.livePoints);

  const maxIntervalVolume = Math.max(
    ...pastSeries.map((p) => p.windowVolume),
    ...liveSeries.map((p) => p.windowVolume),
    100
  );
  const maxTransformed = transformVol(maxIntervalVolume) * 1.08;

  const getY = (val: number) => {
    const t = transformVol(val);
    const ratio = Math.min(1, Math.max(0, t / maxTransformed));
    return padTop + chartHeight - ratio * chartHeight;
  };

  // "Nice" tick values (1 / 2 / 2.5 / 5 × 10^k) up to the highest bucket, at most 5 of them.
  const yTicks = (() => {
    const top = invertVol(maxTransformed);
    if (!(top > 0)) return [] as number[];
    const rough = top / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((c) => c >= rough) ?? mag * 10;
    const ticks: number[] = [];
    for (let v = step; v <= top && ticks.length < 5; v += step) ticks.push(v);
    return ticks;
  })();

  const formatUsdShort = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1)}K`;
    return `$${Math.round(v)}`;
  };

  // Bucket size of the series (what one point on the curve represents).
  const bucketLabel = (() => {
    const pts = data.allPoints;
    if (pts.length < 2) return 'bucket';
    const ms = Math.abs(pts[1].timestamp - pts[0].timestamp);
    const h = Math.round(ms / 3_600_000);
    return h >= 24 ? `${Math.round(h / 24)}d` : `${h}h`;
  })();

  const windowLabel = (() => {
    const pts = data.allPoints;
    if (pts.length < 2) return 'window';
    const h = Math.round((Math.abs(pts[1].timestamp - pts[0].timestamp) * WINDOW_BUCKETS) / 3_600_000);
    return h >= 24 ? `${Math.round(h / 24)}d` : `${h}h`;
  })();

  // Past points cover the entire left half (0% to 50% X). Every point is drawn at
  // its exact value — no visual smoothing — so the curve always agrees with the axis
  // and the tooltip. The monotone spline below handles the smoothness.
  const pastPointsCoords = showPast
    ? pastSeries.map((p) => ({
        x: pastX0 + p.percentAlongEpoch * pastSpan,
        y: getY(p.windowVolume),
        point: p,
      }))
    : [];

  // Live points cover ONLY elapsed time of active epoch (from midX up to nowX)
  const livePointsCoords = showLive
    ? liveSeries.map((p) => ({
        x: liveX0 + p.percentAlongEpoch * liveSpan,
        y: getY(p.windowVolume),
        point: p,
      }))
    : [];

  // Connect junction seamlessly at 50% without any cliff drop
  if (pastPointsCoords.length > 0 && livePointsCoords.length > 0) {
    const junctionCoord = pastPointsCoords[pastPointsCoords.length - 1];
    livePointsCoords[0].x = junctionCoord.x;
    livePointsCoords[0].y = junctionCoord.y;
  }

  const liveHead = livePointsCoords.length > 0 ? livePointsCoords[livePointsCoords.length - 1] : null;
  const nowX = liveHead ? liveHead.x : showLive ? liveX0 : rightEdge;
  const nowY = liveHead ? liveHead.y : groundY;

  // Monotone cubic interpolation (Fritsch–Carlson): a smooth curve through every
  // point that never overshoots between samples, so it can't dip below zero or
  // invent a bump that isn't in the data.
  const buildSmoothPath = (coords: { x: number; y: number }[]) => {
    const n = coords.length;
    if (n === 0) return '';
    if (n === 1) return `M ${coords[0].x} ${coords[0].y}`;
    if (n === 2) return `M ${coords[0].x} ${coords[0].y} L ${coords[1].x} ${coords[1].y}`;

    const dx: number[] = [];
    const slope: number[] = [];
    for (let i = 0; i < n - 1; i++) {
      const h = coords[i + 1].x - coords[i].x || 1e-6;
      dx.push(h);
      slope.push((coords[i + 1].y - coords[i].y) / h);
    }
    const tangent: number[] = [slope[0]];
    for (let i = 1; i < n - 1; i++) {
      tangent.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2);
    }
    tangent.push(slope[n - 2]);
    for (let i = 0; i < n - 1; i++) {
      if (slope[i] === 0) {
        tangent[i] = 0;
        tangent[i + 1] = 0;
        continue;
      }
      const a = tangent[i] / slope[i];
      const b = tangent[i + 1] / slope[i];
      const sum = a * a + b * b;
      if (sum > 9) {
        const t = 3 / Math.sqrt(sum);
        tangent[i] = t * a * slope[i];
        tangent[i + 1] = t * b * slope[i];
      }
    }

    let d = `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`;
    for (let i = 0; i < n - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const h = dx[i] / 3;
      const c1x = p0.x + h;
      const c1y = p0.y + tangent[i] * h;
      const c2x = p1.x - h;
      const c2y = p1.y - tangent[i + 1] * h;
      d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
    }
    return d;
  };

  const pastLineD = buildSmoothPath(pastPointsCoords);
  const liveLineD = buildSmoothPath(livePointsCoords);

  const pastAreaD =
    pastPointsCoords.length > 0
      ? `${pastLineD} L ${pastX1} ${groundY} L ${pastX0} ${groundY} Z`
      : '';

  // Live area drops strictly at nowX
  const liveAreaD =
    livePointsCoords.length > 0
      ? `${liveLineD} L ${nowX} ${groundY} L ${liveX0} ${groundY} Z`
      : '';

  const junctionPoint = pastPointsCoords[pastPointsCoords.length - 1] || { x: midX, y: groundY };

  // Responsive badge coordinates to prevent overlapping collisions
  const isNearJunction = nowX - liveX0 < 115;
  const transitionBadgeY = isNearJunction ? padTop - 15 : padTop - 32;
  const nowBadgeY = isNearJunction ? padTop - 38 : padTop - 32;

  const handlePointer = (clientXPage: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = clientXPage - rect.left;

    const scaleX = viewBoxWidth / rect.width;
    const svgX = clientX * scaleX;

    // If hovering in unelapsed future zone
    if (svgX > nowX + 16 && svgX <= rightEdge + 10) {
      setIsHoveringFuture(true);
      setHoveredPoint(null);
      setHoverCoords({ x: Math.min(rightEdge - 30, svgX), y: groundY - 50 });
      return;
    }

    setIsHoveringFuture(false);
    const allCoords = [...pastPointsCoords, ...livePointsCoords];
    let closest = allCoords[0];
    let minDist = Infinity;

    for (const c of allCoords) {
      const dist = Math.abs(c.x - svgX);
      if (dist < minDist) {
        minDist = dist;
        closest = c;
      }
    }

    if (closest && minDist < 45) {
      setHoveredPoint(closest.point);
      setHoverCoords({ x: closest.x, y: closest.y });
    } else {
      setHoveredPoint(null);
      setHoverCoords(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => handlePointer(e.clientX);
  // Touch: drag along the chart to scrub; the tooltip stays after lifting the finger.
  const handleTouch = (e: React.TouchEvent<SVGSVGElement>) => {
    const t = e.touches[0];
    if (t) handlePointer(t.clientX);
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    setHoverCoords(null);
    setIsHoveringFuture(false);
  };

  return (
    <div className="w-full glass-panel rounded-2xl p-5 sm:p-6 space-y-4">
      {/* Phone header: one epoch at a time */}
      {isNarrow && (
        <div className="seg" role="tablist" aria-label="Epoch">
          {(['live', 'past'] as const).map((v) => {
            const active = mobileView === v;
            const total = v === 'live' ? data.totalLiveVolumeUsd : data.totalPastVolumeUsd;
            return (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={active}
                className={`seg-btn${active ? ' active' : ''}${v === 'past' && active ? ' past' : ''}`}
                onClick={() => { setMobileView(v); handleMouseLeave(); }}
              >
                <span className="seg-label">{v === 'live' ? `This epoch · #${epochConfig.epochNumber}` : 'Last epoch'}</span>
                <span className="seg-value">{v === 'past' && pastLoading ? `${pastLoading.total ? Math.round((pastLoading.done / pastLoading.total) * 100) : 0}%` : formatUsdShort(total)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Chart Top Header */}
      <div className={`${isNarrow ? 'hidden' : 'flex'} flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3`}>
        {/* Left: Past Epoch */}
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-white/10 border border-[#a0a3a7] flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-[#a0a3a7]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#a0a3a7]">
                Past Baseline
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/[0.05] text-[#a0a3a7]">
                {formatDuration(epochConfig.durationMs)} prior · complete
              </span>
            </div>
            <p className="text-xs text-[#6c6f75] font-mono">
              {pastLoading ? `loading… ${pastLoading.total ? Math.round((pastLoading.done / pastLoading.total) * 100) : 0}%` : `$${data.totalPastVolumeUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            </p>
          </div>
        </div>

        {/* Center Indicator */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-white/50">
            <Sparkles size={11} className="text-[#8077ff]" />
            <span>50% Epoch Junction</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#8077ff]/10 text-[#bdb9ff] border border-[#8077ff]/20">
            √ scale
          </span>
        </div>

        {/* Right: Live Epoch */}
        <div className="flex items-center gap-2.5 text-right">
          <div>
            <div className="flex items-center justify-end gap-2">
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#8077ff]/20 text-[#bdb9ff] border border-[#8077ff]/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8077ff] animate-ping" />
                Epoch #{epochConfig.epochNumber}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#8077ff]">
                Live Cycle (In Progress)
              </span>
            </div>
            <p className="text-xs font-mono font-bold text-white flex items-center justify-end gap-1.5">
              <span>Volume So Far:</span>
              <span className={data.isEligible ? 'text-[#17a781]' : 'text-[#bdb9ff]'}>
                ${data.totalLiveVolumeUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </p>
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-[#8077ff]/40 border border-[#8077ff] flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-[#8077ff]" />
          </div>
        </div>
      </div>

      {/* SVG Chart Canvas */}
      <div ref={containerRef} className="relative w-full select-none">
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="w-full h-auto overflow-visible cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouch}
          onTouchMove={handleTouch}
          style={{ touchAction: 'pan-y' }}
        >
          <defs>
            <linearGradient id="pastAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6c6f75" stopOpacity="0.25" />
              <stop offset="70%" stopColor="#4c4f55" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#0b0b0d" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="liveAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8077ff" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#4d42fc" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#0b0b0d" stopOpacity="0.0" />
            </linearGradient>

            <filter id="purpleGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#8077ff" floodOpacity="0.75" />
            </filter>

            <filter id="junctionGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#8077ff" floodOpacity="0.9" />
            </filter>

            <pattern id="loadingStripes" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="7" height="14" fill="rgba(255,255,255,0.035)" />
            </pattern>
            <pattern id="futureGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Y axis: round-dollar ticks placed on the sqrt scale (spacing shrinks toward the top). */}
          {yTicks.map((val) => {
            const y = getY(val);
            return (
              <g key={val} opacity={0.35}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={viewBoxWidth - padRight}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeDasharray="4 4"
                />
                <text
                  x={padLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="9"
                  fontFamily="monospace"
                  fill="#a0a3a7"
                >
                  {formatUsdShort(val)}
                </text>
              </g>
            );
          })}
          <text
            x={padLeft}
            y={padTop - 6}
            textAnchor="start"
            fontSize="8"
            fontFamily="monospace"
            fill="#6c6f75"
            letterSpacing="0.08em"
          >
            {WINDOW_BUCKETS > 1 ? `USD · ROLLING ${windowLabel.toUpperCase()}` : `USD / ${bucketLabel.toUpperCase()}`}
          </text>

          <line
            x1={padLeft}
            y1={groundY}
            x2={viewBoxWidth - padRight}
            y2={groundY}
            stroke="rgba(255, 255, 255, 0.1)"
          />

          {/* Past epoch still streaming in */}
          {pastLoading && showPast && (
            <g>
              <rect x={pastX0} y={padTop} width={pastSpan} height={chartHeight} fill="url(#loadingStripes)" opacity="0.9">
                <animate attributeName="opacity" values="0.55;0.95;0.55" dur="1.6s" repeatCount="indefinite" />
              </rect>
              <rect x={pastX0 + pastSpan / 2 - 74} y={padTop + chartHeight / 2 - 12} width="148" height="24" rx="7" fill="#141518" stroke="rgba(255,255,255,0.14)" />
              <text x={pastX0 + pastSpan / 2} y={padTop + chartHeight / 2 + 4} textAnchor="middle" fontSize="10" fontWeight="600" fill="#a0a3a7" fontFamily="system-ui">
                Loading last epoch · {pastLoading.total ? Math.round((pastLoading.done / pastLoading.total) * 100) : 0}%
              </text>
            </g>
          )}

          {/* Past Curve (Left 50%) */}
          <path d={pastAreaD} fill="url(#pastAreaGrad)" />
          <path
            d={pastLineD}
            fill="none"
            stroke="#7d8087"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />

          {/* Future Unelapsed Zone (Between nowX and rightEdge) */}
          {nowX < rightEdge - 15 && (
            <g>
              <rect
                x={nowX}
                y={padTop}
                width={rightEdge - nowX}
                height={chartHeight}
                fill="url(#futureGrid)"
              />
              {/* Perfectly horizontal projection line from nowX to rightEdge */}
              <line
                x1={nowX}
                y1={nowY}
                x2={rightEdge}
                y2={nowY}
                stroke="#8077ff"
                strokeWidth="1.5"
                strokeDasharray="5 4"
                opacity="0.45"
              />
              {rightEdge - nowX > 170 && (
              <g
                transform={`translate(${(nowX + rightEdge) / 2}, ${
                  nowY > groundY - 50 ? groundY - 55 : groundY - 26
                })`}
              >
                <rect
                  x="-72"
                  y="-11"
                  width="144"
                  height="22"
                  rx="6"
                  fill="#141518"
                  stroke="rgba(128, 119, 255, 0.35)"
                  strokeWidth="1.2"
                />
                <text
                  x="0"
                  y="4.5"
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="600"
                  fill="#bdb9ff"
                  fontFamily="monospace"
                >
                  ⏳ {countdown.formatted} Remaining
                </text>
              </g>
              )}
            </g>
          )}

          {/* Live Curve (From midX strictly up to nowX) */}
          <path d={liveAreaD} fill="url(#liveAreaGrad)" />
          <path
            d={liveLineD}
            fill="none"
            stroke="#8077ff"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#purpleGlow)"
          />

          {/* 50% Junction Indicator */}
          {showPast && showLive && (
          <g>
            <line
              x1={midX}
              y1={padTop - 8}
              x2={midX}
              y2={groundY}
              stroke="#8077ff"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.5"
            />

            <rect
              x={midX - 50}
              y={transitionBadgeY - 9}
              width="100"
              height="18"
              rx="5"
              fill="#141518"
              stroke="#8077ff"
              strokeWidth="1"
              opacity="0.95"
            />
            <text
              x={midX}
              y={transitionBadgeY + 3.5}
              textAnchor="middle"
              fontSize="9"
              fontWeight="700"
              fill="#bdb9ff"
              fontFamily="system-ui"
            >
              ⚡ Transition
            </text>

            <circle cx={junctionPoint.x} cy={junctionPoint.y} r="9" fill="#8077ff" opacity="0.18" />
            <circle
              cx={junctionPoint.x}
              cy={junctionPoint.y}
              r="4.5"
              fill="#ffffff"
              stroke="#8077ff"
              strokeWidth="2"
              filter="url(#junctionGlow)"
            />
          </g>
          )}

          {/* Live Head / NOW Marker */}
          {liveHead && nowX < rightEdge && (
            <g>
              <line
                x1={nowX}
                y1={nowBadgeY - 10}
                x2={nowX}
                y2={groundY}
                stroke="#8077ff"
                strokeWidth="1.2"
                strokeDasharray="3 3"
                opacity="0.8"
              />
              <circle cx={nowX} cy={nowY} r="10" fill="#8077ff" opacity="0.18" />
              <circle
                cx={nowX}
                cy={nowY}
                r="4.5"
                fill="#ffffff"
                stroke="#8077ff"
                strokeWidth="2.2"
                filter="url(#purpleGlow)"
              />
              <rect
                x={nowX - 28}
                y={nowBadgeY - 10}
                width="56"
                height="20"
                rx="5"
                fill="#141518"
                stroke="#8077ff"
                strokeWidth="1.2"
                opacity="0.95"
              />
              <text
                x={nowX}
                y={nowBadgeY + 3.5}
                textAnchor="middle"
                fontSize="9"
                fontWeight="800"
                fill="#8077ff"
                fontFamily="system-ui"
              >
                ● NOW
              </text>
            </g>
          )}

          {/* Axis Time Labels */}
          <text
            x={padLeft}
            y={groundY + 18}
            fontSize="9.5"
            fill="#6c6f75"
            fontFamily="monospace"
            textAnchor="start"
          >
            {(() => { const t = showPast ? epochConfig.pastStartTime : epochConfig.startTime; return isNarrow ? shortDate(t) : formatDateLabel(t); })()}
          </text>

          {showPast && showLive && (
          <text
            x={midX}
            y={groundY + 18}
            fontSize="9.5"
            fontWeight="bold"
            fill="#bdb9ff"
            fontFamily="monospace"
            textAnchor="middle"
          >
            {isNarrow ? shortDate(epochConfig.startTime) : formatDateLabel(epochConfig.startTime)}
          </text>
          )}

          {/* If nowX is separated enough from start and end, show Now label without collision */}
          {liveHead && nowX > liveX0 + 115 && nowX < rightEdge - 90 && (
            <text
              x={nowX}
              y={groundY + 18}
              fontSize="9.5"
              fontWeight="bold"
              fill="#8077ff"
              fontFamily="monospace"
              textAnchor="middle"
            >
              {formatDateLabel(data.livePoints[data.livePoints.length - 1]?.timestamp || Date.now())}
            </text>
          )}

          <text
            x={rightEdge}
            y={groundY + 18}
            fontSize="9.5"
            fill="#6c6f75"
            fontFamily="monospace"
            textAnchor="end"
          >
            {(() => { const t = showLive ? epochConfig.endTime : epochConfig.startTime; return isNarrow ? shortDate(t) : formatDateLabel(t); })()}
          </text>

          {/* Hover Crosshair for Elapsed Points */}
          {hoverCoords && hoveredPoint && (
            <g>
              <line
                x1={hoverCoords.x}
                y1={padTop}
                x2={hoverCoords.x}
                y2={groundY}
                stroke={hoveredPoint.epochType === 'live' ? '#8077ff' : '#6c6f75'}
                strokeWidth="1.2"
                strokeDasharray="3 3"
                opacity="0.8"
              />
              <circle
                cx={hoverCoords.x}
                cy={hoverCoords.y}
                r="5.5"
                fill="#ffffff"
                stroke={hoveredPoint.epochType === 'live' ? '#8077ff' : '#6c6f75'}
                strokeWidth="2"
                filter={hoveredPoint.epochType === 'live' ? 'url(#purpleGlow)' : undefined}
              />
            </g>
          )}
        </svg>

        {/* Floating Tooltip for Elapsed Historical / Live Points */}
        {hoverCoords && hoveredPoint && !isHoveringFuture && (
          <div
            className="absolute pointer-events-none z-30 transition-transform duration-75"
            style={{
              left: `${(Math.min(Math.max(hoverCoords.x, 105), viewBoxWidth - 105) / viewBoxWidth) * 100}%`,
              top: `${Math.max(10, (hoverCoords.y / viewBoxHeight) * 100 - 30)}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="bg-[#141518]/95 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-2xl text-xs min-w-[220px] space-y-1.5 whitespace-nowrap">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-1">
                <span
                  className={`font-bold uppercase tracking-wider text-[10px] ${
                    hoveredPoint.epochType === 'live' ? 'text-[#8077ff]' : 'text-[#a0a3a7]'
                  }`}
                >
                  {hoveredPoint.epochType === 'live' ? '● Live Elapsed' : '○ Past Baseline'}
                </span>
                <span className="text-white/50 font-mono text-[10px]">{formatBucketLabel(hoveredPoint.timestamp)}</span>
              </div>

              <div className="flex justify-between items-center text-white/80">
                <span>{WINDOW_BUCKETS > 1 ? `Volume (last ${windowLabel})` : `Volume (${bucketLabel} bucket)`}</span>
                <span className="font-mono font-bold text-white">
                  ${(hoveredPoint.windowVolume ?? hoveredPoint.intervalVolume).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {WINDOW_BUCKETS > 1 && (
              <div className="flex justify-between items-center text-white/60">
                <span>This {bucketLabel} bucket</span>
                <span className="font-mono font-semibold">
                  ${hoveredPoint.intervalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              )}

              <div className="flex justify-between items-center text-white/80">
                <span>Running total</span>
                <span
                  className={`font-mono font-bold ${
                    hoveredPoint.epochType === 'live' ? 'text-[#bdb9ff]' : 'text-slate-300'
                  }`}
                >
                  ${hoveredPoint.cumulativeVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {hoveredPoint.epochType === 'live' && (
                <div className="pt-1 border-t border-white/[0.08] flex items-center justify-between text-[11px]">
                  <span className="text-white/50">$100K Target:</span>
                  <span
                    className={`font-bold ${
                      hoveredPoint.cumulativeVolume >= 100_000
                        ? 'text-[#17a781]'
                        : 'text-[#f03277]'
                    }`}
                  >
                    {hoveredPoint.cumulativeVolume >= 100_000
                      ? '✓ Reached'
                      : `${Math.round((hoveredPoint.cumulativeVolume / 100_000) * 100)}%`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floating Tooltip for Unelapsed Future Zone */}
        {hoverCoords && isHoveringFuture && (
          <div
            className="absolute pointer-events-none z-30 transition-transform duration-75"
            style={{
              left: `${(Math.min(Math.max(hoverCoords.x, 105), viewBoxWidth - 105) / viewBoxWidth) * 100}%`,
              top: `${Math.max(10, (hoverCoords.y / viewBoxHeight) * 100 - 30)}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="bg-[#141518]/95 backdrop-blur-md border border-[#8077ff]/30 rounded-xl p-3 shadow-2xl text-xs min-w-[210px] space-y-1.5">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-1">
                <span className="font-bold uppercase tracking-wider text-[10px] text-[#8077ff] flex items-center gap-1">
                  <Clock size={11} /> Unelapsed Epoch
                </span>
                <span className="text-[#bdb9ff] font-mono text-[10px]">{countdown.formatted} left</span>
              </div>
              <div className="flex justify-between items-center text-white/80">
                <span>Goal Threshold:</span>
                <span className="font-mono font-bold text-white">$100,000.00</span>
              </div>
              <div className="flex justify-between items-center text-white/80">
                <span>Current Volume:</span>
                <span className="font-mono font-bold text-[#bdb9ff]">
                  ${data.totalLiveVolumeUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="pt-1 border-t border-white/[0.08] flex items-center justify-between text-[11px]">
                <span className="text-white/50">Status:</span>
                <span className={`font-bold ${data.isEligible ? 'text-[#17a781]' : 'text-[#f03277]'}`}>
                  {data.isEligible
                    ? '✓ Target Achieved'
                    : `$${data.remainingUsdNeeded.toLocaleString()} Needed by End`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chart Footer Note */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 text-[11px] text-white/40 border-t border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <Activity size={12} className="text-[#8077ff]" />
          <span>{WINDOW_BUCKETS > 1 ? `Rolling ${windowLabel} volume at ${bucketLabel} steps` : `Volume per ${bucketLabel} bucket`} (√ scale keeps whale spikes readable) · hover for details · times in your timezone ({localTzLabel()})</span>
        </div>
        <div className="font-mono text-white/50">
          Threshold: <strong className="text-white">$100,000 USD</strong>
        </div>
      </div>
    </div>
  );
};
