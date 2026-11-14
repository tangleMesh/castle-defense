import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { startServer } from './app';
import { createPersistence } from './persistence';

const MONGO_URL = process.env.MONGO_URL ?? 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME ?? 'bastion_clash';

async function main() {
  const persistence = await createPersistence(MONGO_URL, DB_NAME);
  const server = await startServer({
    persistence,
    port: Number(process.env.PORT ?? 3000),
    host: process.env.HOST ?? '0.0.0.0',
    // 50 ms = real time at 20 Hz; lower it for accelerated bot tests.
    tickMs: Number(process.env.TICK_MS ?? 50),
    clientDist: process.env.CLIENT_DIST ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist'),
  });

  const shutdown = async (signal: string) => {
    server.app.log.info(`${signal}: saving running matches…`);
    await server.close();
    await persistence.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
