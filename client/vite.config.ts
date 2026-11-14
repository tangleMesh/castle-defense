import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// The game version lives in the root package.json (semantic versioning, bumped per feature/fix).
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    hmr: { clientPort: 5173 },
    proxy: {
      '/api': 'http://localhost:3000',
      '/ws': { target: 'ws://localhost:3000', ws: true },
    },
  },
  build: { chunkSizeWarningLimit: 2000 },
});
