/**
 * Self-play worker: plays one bot-vs-bot game after another in the background (at the lowest CPU
 * priority, only while the main thread says so) and reports every result to the learner. Games
 * pause mid-way when a real match starts and continue when the server is idle again.
 */
import { setPriority } from 'node:os';
import { parentPort } from 'node:worker_threads';
import {
  AiPlayer, FACTION_IDS, MAX_SKILL, Sim, TICK_RATE, makeBotId, setSkillCurve, setStrategyStats,
  type FactionId, type PlanRecord, type PlayerCommand, type SkillCurve, type StrategyStats,
} from '@bc/shared';

export type ToWorker =
  | { t: 'state'; strategy: StrategyStats; curve: SkillCurve }
  | { t: 'run'; on: boolean; restMs: number }
  | { t: 'stop' };

export interface SelfPlayResult {
  players: Array<{ team: 0 | 1; skill: number; faction: FactionId; log: PlanRecord[] }>;
  winner: 0 | 1;
  seconds: number;
}
export type FromWorker = { t: 'game'; result: SelfPlayResult };

try { setPriority(19); } catch { /* not permitted: still throttled by the main thread */ }

let running = false, stopped = false, restMs = 2000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

parentPort!.on('message', (m: ToWorker) => {
  if (m.t === 'state') { setStrategyStats(m.strategy); setSkillCurve(m.curve); }
  else if (m.t === 'run') { running = m.on; restMs = m.restMs; }
  else if (m.t === 'stop') stopped = true;
});

const pick = <T>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

/** One game: 1v1 mostly, sometimes 2v2; random factions (once per team), skills and personalities. */
async function playGame(): Promise<SelfPlayResult | null> {
  const perTeam = Math.random() < 0.7 ? 1 : 2;
  const players: SelfPlayResult['players'] = [];
  for (const team of [0, 1] as const) {
    const free = [...FACTION_IDS];
    for (let i = 0; i < perTeam; i++) {
      const faction = free.splice(Math.floor(Math.random() * free.length), 1)[0];
      players.push({ team, skill: Math.random() * MAX_SKILL, faction, log: [] });
    }
  }
  const sim = Sim.create({
    countdownTicks: 0, bestOf: 1, seed: (Math.random() * 2 ** 32) >>> 0,
    players: players.map((p, i) => ({ userId: makeBotId('auto', `sp${i}`), name: `sp${i}`, team: p.team, faction: p.faction })),
  });
  const ais = players.map((p, i) => new AiPlayer(i, 'auto', (Math.random() * 2 ** 31) >>> 0, undefined, { skill: p.skill }));
  const limit = 25 * 60 * TICK_RATE;
  while (sim.state.phase === 'playing' && sim.state.tick < limit) {
    // Let messages in (pause / stop) every 20 game seconds; wait while paused.
    if (sim.state.tick % 400 === 0) {
      await new Promise((r) => setImmediate(r));
      while (!running && !stopped) await sleep(500);
      if (stopped) return null;
    }
    const cmds: PlayerCommand[] = [];
    for (const ai of ais) for (const c of ai.update(sim)) cmds.push({ player: ai.player, cmd: c });
    sim.step(cmds);
  }
  for (const ai of ais) ai.update(sim); // logs the final round
  const winner = sim.state.rounds.at(-1)?.winner ?? (sim.castle(0)!.hp >= sim.castle(1)!.hp ? 0 : 1);
  ais.forEach((ai, i) => { players[i].log = ai.roundLog.map(({ faction, opening, plan, enemy, won }) => ({ faction, opening, plan, enemy, won })); });
  return { players, winner, seconds: Math.round(sim.state.tick / TICK_RATE) };
}

void (async () => {
  while (!stopped) {
    if (!running) { await sleep(500); continue; }
    const result = await playGame();
    if (result) parentPort!.postMessage({ t: 'game', result } satisfies FromWorker);
    await sleep(restMs);
  }
  process.exit(0);
})();
