/**
 * Headless bot test against a running server (e.g. the docker-compose stack backed by MongoDB).
 *
 *   TICK_MS=2 docker compose up -d --build              # accelerated simulation
 *   BASE_URL=http://localhost:3000 \
 *   RESTART_CMD="docker compose restart server" \
 *   npm run bots
 *
 * 1. Full 2v2 match (best of 1): verifies history + stats via the API (stored in MongoDB).
 * 2. Save & exit mid-match → optional server restart → resume with the same accounts → finish.
 */
import { execSync } from 'node:child_process';
import { fullMatchScenario, saveResumeScenario } from './scenarios';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const RESTART = process.env.RESTART_CMD;
const prefix = `bot${Date.now() % 1_000_000}_`;

async function waitHealthy(base: string) {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${base}/api/health`)).ok) return; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('server did not become healthy');
}

await waitHealthy(BASE);
console.log(`== full match against ${BASE}`);
const a = await fullMatchScenario(BASE, { perTeam: 2, bestOf: 1, timeoutMs: 15 * 60_000, prefix: `${prefix}f` });
a.log.forEach((l) => console.log('  ', l));

console.log(`== save / ${RESTART ? 'restart / ' : ''}resume`);
const b = await saveResumeScenario(BASE, {
  prefix: `${prefix}s`,
  timeoutMs: 20 * 60_000,
  restart: RESTART
    ? async () => {
      execSync(RESTART, { stdio: 'inherit' });
      await waitHealthy(BASE);
      return BASE;
    }
    : undefined,
});
b.log.forEach((l) => console.log('  ', l));
console.log('ALL SCENARIOS PASSED');
process.exit(0);
