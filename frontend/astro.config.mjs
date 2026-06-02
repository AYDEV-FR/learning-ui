// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

// The frontend is a fully static bundle embedded into the Go binary and served
// from the application root ("/"). API calls (/api/*) and the terminal
// websocket (/ws/terminal) are handled by the Go backend.
//
// During `astro dev` we proxy those paths to a locally running backend
// (default http://localhost:8080) so the UI can be developed with live reload.
const BACKEND = process.env.BACKEND_URL || 'http://localhost:8080';

export default defineConfig({
  integrations: [preact()],
  output: 'static',
  // Build straight into ./dist (default); the Go binary embeds frontend/dist.
  build: {
    assets: 'assets',
  },
  server: {
    port: 4321,
  },
  vite: {
    server: {
      proxy: {
        '/api': BACKEND,
        '/ws': { target: BACKEND, ws: true },
        '/editor': BACKEND,
      },
    },
  },
});
