import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// The game version lives in the root package.json (semantic versioning, bumped per feature/fix).
const rootPkg = fileURLToPath(new URL('../package.json', import.meta.url));
const { version } = JSON.parse(readFileSync(rootPkg, 'utf8')) as { version: string };

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [{
    // Restart the dev server when the version is bumped so the corner label stays current.
    name: 'watch-root-version',
    configureServer(server) {
      server.watcher.add(rootPkg);
      server.watcher.on('change', (file) => { if (file === rootPkg) void server.restart(); });
    },
  }],
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
