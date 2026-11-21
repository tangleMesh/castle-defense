import { afterAll, describe, expect, it } from 'vitest';
import { startServer, type RunningServer } from '../src/app';
import { createMemoryPersistence } from '../src/persistence/memory';
import { aiMatchScenario, fullMatchScenario, rankedScenario, saveResumeScenario } from '../scripts/scenarios';

const persistence = createMemoryPersistence();
const servers: RunningServer[] = [];

async function boot(port = 0) {
  const s = await startServer({ persistence, port, host: '127.0.0.1', tickMs: 1, logger: false, matchmaking: { botWait: [2, 3], botWaitPerPlayer: 0 } });
  servers.push(s);
  return s;
}

afterAll(async () => {
  for (const s of servers) await s.close().catch(() => {});
});

describe('websocket end-to-end (in-memory persistence, accelerated ticks)', () => {
  it('plays a full 2v2 match and records history + stats', async () => {
    const s = await boot();
    const res = await fullMatchScenario(`http://127.0.0.1:${s.port}`, { perTeam: 2, bestOf: 1, timeoutMs: 150_000, prefix: 'e2e' });
    console.log(res.log.join('\n'));
    expect(res.log.at(-1)).toContain('none');
  }, 200_000);

  it('saves a match, survives a server restart, resumes with the same players and finishes', async () => {
    let s = await boot();
    const res = await saveResumeScenario(`http://127.0.0.1:${s.port}`, {
      prefix: 'sr',
      timeoutMs: 200_000,
      restart: async () => {
        await s.close();
        s = await boot();
        return `http://127.0.0.1:${s.port}`;
      },
    });
    console.log(res.log.join('\n'));
  }, 300_000);

  it('plays against AI players: add/edit/remove bots, save, resume with bots, finish', async () => {
    const s = await boot();
    const res = await aiMatchScenario(`http://127.0.0.1:${s.port}`, { prefix: 'ai', timeoutMs: 200_000 });
    console.log(res.log.join('\n'));
  }, 300_000);

  it('ranked matchmaking: humans meet in the queue; a waiting party gets bot accounts that look like players', async () => {
    const s = await boot();
    const res = await rankedScenario(`http://127.0.0.1:${s.port}`, { prefix: 'rk', timeoutMs: 200_000 });
    console.log(res.log.join('\n'));
  }, 300_000);
});
