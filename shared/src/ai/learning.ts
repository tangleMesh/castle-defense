import { START_RATING, expectedScore } from '../elo';
import type { FactionId } from '../data';
import { DEFAULT_SKILL_CURVE, MAX_SKILL, eloForSkill, type SkillCurve } from './calibration';
import { statKey, type PlanId, type StrategyStats } from './strategy';
import type { MlpJson } from './mlp';

/**
 * What the bots learn from every game (self-play in idle time and real matches), as pure functions
 * so the server's learner, the lab and the tests share them:
 * - which game plans win, per faction and enemy plan (strategy stats, slowly forgetting old games
 *   so the bots follow balance changes and new human habits);
 * - how strong each skill level really is, on the human Elo scale (skill calibration).
 */
export interface LearnedState {
  /** Bumped whenever the learned data changes shape or is reset. */
  version: number;
  selfPlayGames: number;
  realGames: number;
  strategy: StrategyStats;
  /** Elo of each skill bucket (SKILL_BUCKETS), measured from results. */
  skillElo: number[];
  /** Learned models in use (value: P(win), policy: next building category) and their version. */
  models: { value?: MlpJson; policy?: MlpJson };
  modelVersion: number;
  /** Off when bots with the models kept losing to bots without them (until the next model). */
  modelsEnabled: boolean;
  /** Self-play games of model users against non-users: [model side wins, games] (slowly forgetting). */
  modelEdge: [number, number];
  /**
   * Benchmark: the learning Auto bot (skill 1) vs the fixed original Hard bot, same faction.
   * `recent` forgets slowly (≈ the last 200 games), `total` counts everything.
   */
  benchmark: Benchmark;
  /** The same at the top end: the learning Auto bot at Brutal's skill (1.2) vs the fixed original Brutal bot. */
  benchmarkBrutal: Benchmark;
  /** Real matches of bots against humans: bot wins, games, and the wins Elo expected. */
  vsHumans: { wins: number; games: number; expected: number };
  /** Share of held-out samples the live models predict right. */
  modelAccuracy: { value?: number; policy?: number };
  /** Earlier model versions (newest last) for rollback. */
  history: Array<{ version: number; at: string; models: { value?: MlpJson; policy?: MlpJson } }>;
}

/** Benchmark results: `recent` forgets slowly (≈ the last 200 games), `total` counts everything. */
export interface Benchmark { recent: [number, number]; total: [number, number]; history: Array<{ at: string; games: number; winRate: number }> }

/** Skill levels whose strength is measured (0, 0.1, … 1.5). */
export const SKILL_BUCKETS = Array.from({ length: Math.round(MAX_SKILL / 0.1) + 1 }, (_, i) => i / 10);

export function freshLearnedState(): LearnedState {
  return {
    version: 1, selfPlayGames: 0, realGames: 0, strategy: {}, skillElo: SKILL_BUCKETS.map((s) => Math.round(eloForSkill(s, DEFAULT_SKILL_CURVE))),
    models: {}, modelVersion: 0, modelsEnabled: true, modelEdge: [0, 0], history: [],
    benchmark: { recent: [0, 0], total: [0, 0], history: [] }, benchmarkBrutal: { recent: [0, 0], total: [0, 0], history: [] }, vsHumans: { wins: 0, games: 0, expected: 0 }, modelAccuracy: {},
  };
}

/** One bot's round, as the bot logged it. */
export interface PlanRecord { faction: FactionId; opening: PlanId; plan: PlanId; enemy: PlanId | '*'; won: boolean }

/**
 * Adds round results to the strategy stats. Old results fade (× decay per added round), so a plan
 * that stopped working loses its reputation after a few hundred rounds. `weight` lets real games
 * count more than self-play.
 */
export function addPlanResults(stats: StrategyStats, records: PlanRecord[], weight = 1, decay = 0.9995): void {
  if (!records.length) return;
  const fade = decay ** records.length;
  for (const k of Object.keys(stats)) { stats[k][0] *= fade; stats[k][1] *= fade; }
  const add = (k: string, won: boolean) => {
    const s = (stats[k] ??= [0, 0]);
    s[0] += won ? weight : 0;
    s[1] += weight;
  };
  for (const r of records) {
    add(statKey(r.faction, r.opening, '*'), r.won);
    if (r.enemy !== '*') add(statKey(r.faction, r.plan, r.enemy), r.won);
  }
}

/** A participant of a finished game: a bot (its skill) or a player with a fixed rating. */
export type Participant = { team: 0 | 1; skill: number } | { team: 0 | 1; rating: number };

const bucketWeights = (skill: number) => {
  const x = Math.max(0, Math.min(MAX_SKILL, skill)) / 0.1;
  const i = Math.min(SKILL_BUCKETS.length - 2, Math.floor(x));
  return [[i, 1 - (x - i)], [i + 1, x - i]] as const;
};

/** Elo of a skill (interpolated between the measured buckets). */
export function bucketElo(state: LearnedState, skill: number): number {
  return bucketWeights(skill).reduce((s, [i, w]) => s + state.skillElo[i] * w, 0);
}

/**
 * Elo-style update of the skill buckets from one game: each team's rating is its players' average
 * (bots at their bucket's Elo), and every bot's buckets move by k × (result − expected). Players
 * with a fixed rating (humans, preset bots) anchor the scale and don't move here.
 */
export function addSkillResult(state: LearnedState, players: Participant[], winner: 0 | 1, k: number): void {
  const rating = (p: Participant) => ('rating' in p ? p.rating : bucketElo(state, p.skill));
  const avg = (t: 0 | 1) => { const r = players.filter((p) => p.team === t).map(rating); return r.length ? r.reduce((a, b) => a + b, 0) / r.length : START_RATING; };
  const e0 = expectedScore(avg(0), avg(1));
  for (const p of players) {
    if ('rating' in p) continue;
    const exp = p.team === 0 ? e0 : 1 - e0;
    const delta = k * ((winner === p.team ? 1 : 0) - exp);
    for (const [i, w] of bucketWeights(p.skill)) state.skillElo[i] += delta * w;
  }
}

/**
 * The skill curve for the bots (Elo → skill) from the measured buckets, made monotone: a higher
 * skill never plays at a lower Elo (pool-adjacent-violators on the bucket ratings).
 */
export function curveFromState(state: LearnedState): SkillCurve {
  // Pool adjacent violators: average neighbouring buckets until the ratings increase with skill.
  const blocks = state.skillElo.map((v) => ({ sum: v, n: 1 }));
  for (let i = 1; i < blocks.length; i++) {
    let j = i;
    while (j > 0 && blocks[j - 1].sum / blocks[j - 1].n > blocks[j].sum / blocks[j].n) {
      blocks[j - 1] = { sum: blocks[j - 1].sum + blocks[j].sum, n: blocks[j - 1].n + blocks[j].n };
      blocks.splice(j, 1);
      j--; i--;
    }
  }
  const elos: number[] = [];
  for (const b of blocks) for (let t = 0; t < b.n; t++) elos.push(b.sum / b.n);
  // Pooled buckets share a rating: spread them 1 point apart so the inverse stays defined.
  const curve: SkillCurve = [];
  for (let i = 0; i < elos.length; i++) curve.push([i ? Math.max(Math.round(elos[i]), curve[i - 1][0] + 1) : Math.round(elos[i]), SKILL_BUCKETS[i]]);
  return curve;
}
