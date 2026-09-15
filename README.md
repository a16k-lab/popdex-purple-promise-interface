# PopDex Purple Promise (3P)

Weekly volume tracker: paste a wallet, see its traded volume for the current and previous epoch, and whether it clears the Purple Promise threshold.

React + Vite + Tailwind, deployed on Vercel. The UI mirrors the PopDex Creators form.

## How volume is computed

`api/wallet-volume.ts` (a Vercel function) sums **trade fills** from the PopDEX UTA API —
`GET /api/v1/account/{wallet}/trade/fills` — using each fill's `execValue` (USD notional) and `createdAt`.
That is the same number the exchange reports as traded volume. Fills are bucketed into 2-hour intervals
for the chart; totals are the plain sum.

- The past epoch and the elapsed part of the live epoch are fetched as parallel 6-hour slices
  (8 concurrent requests, 100 fills per page). A very active wallet (20k fills / 2 weeks) takes ~15 s;
  a normal one is well under 2 s.
- Finished windows are cached in the function instance for 6 h; the live window for 90 s.
- If PopDex can't be fully read inside the 45 s budget, the response carries `complete: false` and the UI
  says the totals are a lower bound.

## Environment variables (all optional)

| Name | Purpose |
| --- | --- |
| `VITE_EPOCH_START`, `VITE_EPOCH_END` | epoch window (ms or s timestamps); defaults to the current Monday-to-Monday UTC week |
| `VITE_EPOCH_NUMBER` | displayed epoch number |
| `VITE_TARGET_VOLUME_USD` | threshold, default `100000` (read by both the UI and the API) |
| `VITE_SITE_URL` | site origin for social-preview tags; on Vercel it is derived automatically |

## Development

```bash
npm install
npm run dev      # Vite dev server; /api/wallet-volume is served by the same handler
npm run build
```
