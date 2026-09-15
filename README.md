# PopDex Purple Promise (3P)

Weekly volume tracker: paste a wallet, see its traded volume for the current and previous epoch, and whether it clears the Purple Promise threshold.

React + Vite + Tailwind, deployed on Vercel. The UI mirrors the PopDex Creators form.

## How volume is computed

`api/wallet-volume.ts` (a Vercel function) sums **trade fills** from the PopDEX UTA API —
`GET /api/v1/account/{wallet}/trade/fills` — using each fill's `execValue` (USD notional) and `createdAt`.
That is the same number the exchange reports as traded volume. Fills are bucketed into 2-hour intervals
for the chart; totals are the plain sum.

- The UI asks for the **live epoch first** (`scope=live`) and shows eligibility as soon as it lands,
  then streams the **previous epoch** (`scope=past`) into the left half of the chart.
- Each scope is fetched as parallel 6-hour slices (12 concurrent requests, 100 fills per page) and the
  response is **NDJSON**: one full snapshot per finished slice with `progress: {done,total}`, the last
  line being final. The UI renders a progress bar from it. A very active wallet (20k fills / 2 weeks)
  takes ~7 s to answer and ~20 s to finish the previous epoch; a normal wallet is under 2 s.
- **Cache**: every finished 6-hour window is reduced to 2-hour buckets and kept in the function
  instance (6 h) and, when `KV_REST_API_URL`/`KV_REST_API_TOKEN` are set, in Upstash Redis for 14 days
  — so the previous epoch of any wallet is computed once for everyone. Only the current window is
  re-read (90 s TTL). Cached values are public trading volumes; no secrets or personal data.
- If PopDex can't be fully read inside the 45 s budget, the response carries `complete: false` and the UI
  says the totals are a lower bound.

## Environment variables (all optional)

| Name | Purpose |
| --- | --- |
| `VITE_EPOCH_START`, `VITE_EPOCH_END` | epoch window (ms or s timestamps); defaults to the current Monday-to-Monday UTC week |
| `VITE_EPOCH_NUMBER` | displayed epoch number |
| `VITE_TARGET_VOLUME_USD` | threshold, default `100000` (read by both the UI and the API) |
| `VITE_CHART_WINDOW_BUCKETS` | chart smoothing: each point = volume of the last N 2h buckets; `1` raw, `3` rolling 6h (default), `6` rolling 12h |
| `VITE_SITE_URL` | site origin for social-preview tags; on Vercel it is derived automatically |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | optional shared cache (Upstash Redis / Vercel KV); `UPSTASH_REDIS_REST_*` also accepted |

## Development

```bash
npm install
npm run dev      # Vite dev server; /api/wallet-volume is served by the same handler
npm run build
```
