import type { FactionId } from '../data';
import type { BuildCategory } from './ai';
import type { Persona } from './persona';

/**
 * Game plans: what a bot is trying to do this round, beyond the next purchase. A plan shifts the
 * category preferences, the timing of towers, Treasure Chests, upgrades and the legendary.
 */
export type PlanId = 'rush' | 'eco' | 'tech' | 'turtle' | 'air' | 'balanced';
export const PLAN_IDS: PlanId[] = ['rush', 'eco', 'tech', 'turtle', 'air', 'balanced'];

export interface Plan {
  weights: Partial<Record<BuildCategory, number>>;
  /** Extra towers wanted (beyond the usual). */
  towers: number;
  /** Treasure Chest from this many spawners on (default 3). */
  chestAt: number;
  /** Shift of the legendary / upgrade timing (negative = earlier). */
  specialShift: number;
  upgradeShift: number;
}

export const PLANS: Record<PlanId, Plan> = {
  rush: { weights: { melee: 1.35, swarm: 1.5, ranged: 1.1, eco: 0.4, upgrade: 0.6, special: 0.6, tower: 0.5 }, towers: -1, chestAt: 8, specialShift: 4, upgradeShift: 3 },
  eco: { weights: { eco: 2.2, upgrade: 1.1, special: 1.1, swarm: 0.8 }, towers: 0, chestAt: 1, specialShift: 0, upgradeShift: 0 },
  tech: { weights: { upgrade: 1.8, special: 1.6, aura: 1.3, swarm: 0.6, melee: 0.9 }, towers: 0, chestAt: 4, specialShift: -2, upgradeShift: -2 },
  turtle: { weights: { tower: 2.2, ranged: 1.3, aura: 1.2, special: 1.3, swarm: 0.7, melee: 0.85 }, towers: 2, chestAt: 3, specialShift: -1, upgradeShift: 0 },
  air: { weights: { air: 2.3, ranged: 1.1, melee: 0.8, swarm: 0.8 }, towers: 0, chestAt: 4, specialShift: 1, upgradeShift: 0 },
  balanced: { weights: {}, towers: 0, chestAt: 3, specialShift: 0, upgradeShift: 0 },
};

/** The answer to an enemy plan (what usually beats it). */
export const COUNTER_PLAN: Record<PlanId, PlanId[]> = {
  rush: ['turtle', 'balanced'],
  eco: ['rush', 'air'],
  tech: ['rush', 'eco'],
  turtle: ['eco', 'tech'],
  air: ['balanced', 'turtle'],
  balanced: ['tech', 'eco', 'rush'],
};

/**
 * What the bots have learned about plans: wins and games per (faction, own plan, enemy plan seen),
 * filled by the background learner from self-play and real matches. Empty → only the persona's taste.
 */
export interface StrategyStats {
  /** key `${faction}|${plan}|${enemyPlan or '*'}` → [wins, games] */
  [key: string]: [number, number];
}

let STATS: StrategyStats = {};
export function setStrategyStats(s: StrategyStats | null | undefined) { STATS = s ?? {}; }
export function strategyStats(): StrategyStats { return STATS; }
export const statKey = (f: FactionId, plan: PlanId, enemy: PlanId | '*') => `${f}|${plan}|${enemy}`;

/** How much a persona likes each plan (its taste, before experience). */
export function planTaste(p: Persona): Record<PlanId, number> {
  return {
    rush: Math.exp(0.9 * p.aggression - 0.3 * p.tech),
    eco: Math.exp(0.9 * p.eco - 0.4 * p.aggression),
    tech: Math.exp(0.9 * p.tech),
    turtle: Math.exp(0.9 * p.defence - 0.3 * p.aggression),
    air: Math.exp(1.1 * p.air) * 0.7,
    balanced: 1.1,
  };
}

/** Beta(a, b) sample from two gamma draws. */
function betaSample(a: number, b: number, rnd: () => number): number {
  const gamma = (k: number): number => {
    // Marsaglia–Tsang for k ≥ 1; boost for k < 1.
    if (k < 1) return gamma(k + 1) * rnd() ** (1 / k);
    const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x: number, v: number;
      do { x = Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd()); v = 1 + c * x; } while (v <= 0);
      v = v * v * v;
      if (Math.log(1 - rnd()) < 0.5 * x * x + d - d * v + d * Math.log(v)) return d * v;
    }
  };
  const x = gamma(a), y = gamma(b);
  return x / (x + y);
}

/**
 * Picks a plan: Thompson sampling over what has worked for this faction (against this enemy plan,
 * if one is recognised), weighed by the persona's taste. Skill decides how much experience counts
 * against taste: beginners play what they like, strong players what works.
 */
export function choosePlan(faction: FactionId, enemy: PlanId | '*', persona: Persona, rnd: () => number, allowed: PlanId[] = PLAN_IDS): PlanId {
  const taste = planTaste(persona);
  const trust = Math.min(1, persona.skill / 1.2);
  let best: PlanId = 'balanced', bestV = -Infinity;
  for (const plan of allowed) {
    const [w, n] = STATS[statKey(faction, plan, enemy)] ?? STATS[statKey(faction, plan, '*')] ?? [0, 0];
    const p = betaSample(2 + w, 2 + (n - w), rnd);
    const v = Math.log(taste[plan]) * (1.2 - trust) + Math.log(p / (1 - p)) * (0.3 + 2 * trust);
    if (v > bestV) { bestV = v; best = plan; }
  }
  return best;
}

/** What the enemy seems to be doing, from what we've seen of their base and army. */
export interface EnemySightings {
  spawners: number;
  towers: number;
  chests: number;
  upgrades: number;
  legendary: number;
  airShare: number;
  /** Enemy spawner value relative to their building count (cheap spam ≈ low). */
  avgSpawnerCost: number;
  minutes: number;
}

export function recognisePlan(e: EnemySightings): PlanId | '*' {
  if (e.spawners + e.towers + e.chests === 0) return '*';
  if (e.airShare > 0.4) return 'air';
  if (e.towers >= 3 && e.towers >= e.spawners * 0.5) return 'turtle';
  if (e.chests >= 1 && e.minutes < 6) return 'eco';
  if (e.legendary > 0 || e.upgrades >= Math.max(2, e.spawners * 0.4)) return 'tech';
  if (e.spawners >= 4 && e.avgSpawnerCost < 230 && e.minutes < 6) return 'rush';
  return 'balanced';
}
