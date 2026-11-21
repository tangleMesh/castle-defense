/**
 * Self-play worker: plays one bot-vs-bot game after another in the background (at the lowest CPU
 * priority, only while the main thread says so) and reports every result to the learner. Games
 * pause mid-way when a real match starts and continue when the server is idle again.
 */
import { setPriority } from 'node:os';
import { parentPort } from 'node:worker_threads';
import {
  AiPlayer, CATEGORIES, FACTION_IDS, FEATURE_COUNT, GameRecorder, MAX_SKILL, Mlp, Sim, TICK_RATE, makeBotId, setModels, setSkillCurve, setStrategyStats,
  type FactionId, type MlpJson, type ModelSet, type PlanRecord, type PlayerCommand, type Sample, type SkillCurve, type StrategyStats,
} from '@bc/shared';

export type ModelKind = 'value' | 'policy';

export type ToWorker =
  | { t: 'state'; strategy: StrategyStats; curve: SkillCurve }
  | { t: 'models'; models: ModelSet }
  | { t: 'samples'; value: Sample[]; policy: Sample[] }
  | { t: 'run'; on: boolean; restMs: number }
  | { t: 'stop' };

export interface SelfPlayResult {
  players: Array<{ team: 0 | 1; skill: number; faction: FactionId; log: PlanRecord[]; models: boolean }>;
  winner: 0 | 1;
  seconds: number;
}
export type FromWorker =
  | { t: 'game'; result: SelfPlayResult }
  | { t: 'model'; kind: ModelKind; model: MlpJson; valLoss: number; championLoss: number | null; samples: number };

try { setPriority(19); } catch { /* not permitted: still throttled by the main thread */ }

let running = false, stopped = false, restMs = 2000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- training data & models

const MAX_VALUE = 60_000, MAX_POLICY = 40_000;
/** New samples before a training attempt (env overrides for quick local runs). */
const TRAIN_VALUE = Number(process.env.LEARNER_TRAIN_VALUE) || 3000, TRAIN_POLICY = Number(process.env.LEARNER_TRAIN_POLICY) || 1500;
const buf: Record<ModelKind, Sample[]> = { value: [], policy: [] };
const fresh: Record<ModelKind, number> = { value: 0, policy: 0 };
const champion: Partial<Record<ModelKind, MlpJson>> = {};
const addSamples = (kind: ModelKind, s: Sample[]) => {
  buf[kind].push(...s);
  fresh[kind] += s.length;
  const max = kind === 'value' ? MAX_VALUE : MAX_POLICY;
  // Over the limit: drop the oldest self-play samples first (human samples are rarer and worth more).
  while (buf[kind].length > max) {
    const i = buf[kind].findIndex((x) => !x.human);
    buf[kind].splice(i < 0 ? 0 : i, 1);
  }
};

/**
 * Trains a candidate (warm-started from the current model) and reports it only if it predicts the
 * held-out games better than the current one: a worse model never replaces a better one.
 */
async function train(kind: ModelKind) {
  const data = buf[kind];
  const holdout = data.filter((_, i) => i % 7 === 0), train = data.filter((_, i) => i % 7 !== 0);
  if (holdout.length < 100) return;
  const champ = champion[kind] ? Mlp.fromJSON(champion[kind]!) : null;
  const cand = champ ? Mlp.fromJSON(champion[kind]!) : new Mlp([FEATURE_COUNT, 32, 16, kind === 'value' ? 1 : CATEGORIES.length], kind === 'value' ? 'sigmoid' : 'softmax', (Math.random() * 2 ** 31) >>> 0);
  for (let epoch = 0; epoch < 3; epoch++) {
    const order = train.map((_, i) => i).sort(() => Math.random() - 0.5);
    for (let b = 0; b < order.length; b += 64) {
      const batch = order.slice(b, b + 64).map((i) => train[i]);
      cand.trainBatch(batch.map((x) => x.x), batch.map((x) => x.y), batch.map((x) => x.w));
      // Stay responsive (pause messages) and yield to the real game server.
      if ((b / 64) % 40 === 0) { await new Promise((r) => setImmediate(r)); while (!running && !stopped) await sleep(500); if (stopped) return; }
    }
  }
  const xs = holdout.map((x) => x.x), ys = holdout.map((x) => x.y), ws = holdout.map((x) => x.w);
  const valLoss = cand.loss(xs, ys, ws), championLoss = champ ? champ.loss(xs, ys, ws) : null;
  if (championLoss === null || valLoss < championLoss * 0.995) {
    champion[kind] = cand.toJSON();
    parentPort!.postMessage({ t: 'model', kind, model: champion[kind]!, valLoss, championLoss, samples: data.length } satisfies FromWorker);
  }
}

parentPort!.on('message', (m: ToWorker) => {
  if (m.t === 'state') { setStrategyStats(m.strategy); setSkillCurve(m.curve); }
  else if (m.t === 'models') {
    setModels(m.models);
    if (m.models.value) champion.value = m.models.value; else delete champion.value;
    if (m.models.policy) champion.policy = m.models.policy; else delete champion.policy;
  } else if (m.t === 'samples') { addSamples('value', m.value); addSamples('policy', m.policy); }
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
      players.push({ team, skill: Math.random() * MAX_SKILL, faction, log: [], models: false });
    }
  }
  const sim = Sim.create({
    countdownTicks: 0, bestOf: 1, seed: (Math.random() * 2 ** 32) >>> 0,
    players: players.map((p, i) => ({ userId: makeBotId('auto', `sp${i}`), name: `sp${i}`, team: p.team, faction: p.faction })),
  });
  // A/B: often one team plays with the learned models and the other without, so the learner can
  // check that the models actually help.
  const modelTeam = Math.random() < 0.6 ? (Math.random() < 0.5 ? 0 : 1) : Math.random() < 0.5 ? 'both' : 'none';
  for (const p of players) p.models = modelTeam === 'both' || modelTeam === p.team;
  const ais = players.map((p, i) => new AiPlayer(i, 'auto', (Math.random() * 2 ** 31) >>> 0, undefined, { skill: p.skill, useModels: p.models }));
  // Policy samples only from strong winners (bots learn from good play, not from their mistakes).
  const rec = new GameRecorder((p, won) => ({ w: won && players[p].skill > 0.9 ? 0.5 : 0, human: false }));
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
    rec.observe(sim, cmds);
    sim.step(cmds);
  }
  rec.observe(sim, []);
  addSamples('value', rec.value);
  addSamples('policy', rec.policy);
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
    // Enough new games: try to improve the models.
    if (fresh.value >= TRAIN_VALUE) { fresh.value = 0; await train('value'); }
    if (fresh.policy >= TRAIN_POLICY) { fresh.policy = 0; await train('policy'); }
    await sleep(restMs);
  }
  process.exit(0);
})();
