import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The build output (dist/) is embedded into the Go binary via //go:embed.
// In dev, `bun run dev` proxies /api and /ws to the Go server on :8080, so the
// React app talks to the real backend (scenario, steps, check, terminal WS).
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
      },
      // VS Code / desktop iframe tabs are routed by ingress in prod; proxy in dev too
      '/editor': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
