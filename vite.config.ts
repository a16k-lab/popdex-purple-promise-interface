import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import handler from './api/wallet-volume.ts'

// Absolute site origin for social-preview tags. Explicit VITE_SITE_URL wins;
// otherwise fall back to the URLs Vercel injects at build time.
function siteUrl(): string {
  const explicit = process.env.VITE_SITE_URL?.trim().replace(/\/+$/, '')
  if (explicit) return explicit
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
  return vercel ? `https://${vercel}` : ''
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'popdex-site-url',
      transformIndexHtml(html) {
        return html.replaceAll('__SITE_URL__', siteUrl())
      },
    },
    {
      name: 'popdex-live-api',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith('/api/wallet-volume')) {
            handler(req as any, res as any);
          } else {
            next();
          }
        });
      },
    },
  ],
})
