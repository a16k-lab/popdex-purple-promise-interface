import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import handler from './api/wallet-volume.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
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
