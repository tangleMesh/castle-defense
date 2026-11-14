/**
 * Run the game server with in-memory persistence (no MongoDB needed).
 * Handy for quick UI work; nothing survives a restart.
 *   npm run dev:memory   (then open http://localhost:3000 after `npm run build`, or use `npm run dev:client`)
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { startServer } from '../src/app';
import { createMemoryPersistence } from '../src/persistence/memory';

const server = await startServer({
  persistence: createMemoryPersistence(),
  port: Number(process.env.PORT ?? 3000),
  tickMs: Number(process.env.TICK_MS ?? 50),
  clientDist: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist'),
});
console.log(`in-memory dev server on http://localhost:${server.port}`);
