import type { BuildCategory, Profile } from './ai';
import { MAX_SKILL } from './calibration';

/**
 * A bot's personality: its skill plus a playstyle and a temperament, drawn once per bot (seeded).
 * Two bots of the same skill play differently: one rushes with cheap spawners, the next greeds a
 * Treasure Chest, a third turtles behind towers or loves flyers.
 */
export interface Persona {
  /** 0 (beginner) … 1 (the old Hard) … 1.5 (sharper than Hard, never cheating). */
  skill: number;
  /** Style, each in [-1, 1]. Aggression: cheap early pressure (+) vs. greedy economy (−). */
  aggression: number;
  /** Tech: upgrades and legendaries (+) vs. many basic spawners (−). */
  tech: number;
  /** Economy: Treasure Chests and income buildings early (+). */
  eco: number;
  /** Defence: towers and patient rescue strikes (+). */
  defence: number;
  /** Likes flyers (+) or ground armies (−). */
  air: number;
  /** Temperament, each in [0, 1]: plays riskier when behind. */
  tilt: number;
  /** Sticks to its plan instead of reacting. */
  stubborn: number;
  /** Talks in chat. */
  chatty: number;
}

/** Seeded generator (LCG, the same family the bots use). */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Draws a persona with the given skill (its style and temperament from the seed). */
export function drawPersona(seed: number, skill: number): Persona {
  const r = seededRandom(seed * 2654435761);
  // Style axes: mostly moderate, sometimes strongly opinionated (cubed uniform → heavier near 0).
  const axis = () => { const u = r() * 2 - 1; return Math.sign(u) * Math.abs(u) ** 1.6; };
  return {
    skill: Math.max(0, Math.min(MAX_SKILL, skill)),
    aggression: axis(), tech: axis(), eco: axis(), defence: axis(), air: axis(),
    tilt: r(), stubborn: r(), chatty: r(),
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * The bot's profile for a persona: numbers interpolate between the old Easy (skill 0), Normal (0.5)
 * and Hard (1) profiles and get a little sharper beyond 1; abilities switch on as skill grows; the
 * style becomes category preferences.
 */
export function personaProfile(p: Persona, presets: { easy: Profile; normal: Profile; hard: Profile }): Profile {
  const s = p.skill;
  const [a, b, t] = s < 0.5 ? [presets.easy, presets.normal, s / 0.5] : [presets.normal, presets.hard, Math.min(1, (s - 0.5) / 0.5)];
  const num = (k: keyof Profile, fa?: number, fb?: number) => lerp((fa ?? (a[k] as number)) || 0, (fb ?? (b[k] as number)) || 0, t);
  const beyond = Math.max(0, s - 1) / (MAX_SKILL - 1); // 0 … 1 above Hard
  const bias: Partial<Record<BuildCategory, number>> = {
    melee: Math.exp(0.3 * p.aggression),
    swarm: Math.exp(0.35 * p.aggression - 0.2 * p.tech),
    tower: Math.exp(0.45 * p.defence - 0.2 * p.aggression),
    eco: Math.exp(0.5 * p.eco - 0.25 * p.aggression),
    upgrade: Math.exp(0.4 * p.tech),
    special: Math.exp(0.35 * p.tech),
    air: Math.exp(0.6 * p.air),
    ranged: Math.exp(0.2 * p.defence),
    aura: Math.exp(0.2 * p.tech),
  };
  return {
    think: Math.max(3, Math.round(num('think') * (1 - 0.4 * beyond))),
    maxQueue: Math.round(num('maxQueue')),
    idle: Math.max(0, num('idle')),
    upgradeAfter: Math.round(num('upgradeAfter') - 1.5 * p.tech),
    specialAt: Math.max(3, Math.round(num('specialAt') - 1.5 * p.tech + p.aggression)),
    planner: s >= 0.3,
    counter: s >= 0.4,
    saves: s >= 0.75,
    tidy: s >= 0.2,
    // Defensive players wait for bigger waves before striking; aggressive ones fire early.
    rescueAt: Math.max(2, num('rescueAt') * (1 + 0.25 * p.defence)),
    rescueDelay: Math.round(num('rescueDelay')),
    rescueAim: Math.max(0, num('rescueAim') * (1 - beyond)),
    upgradeBias: 1 + 0.2 * p.tech,
    rangedShare: Math.max(0, num('rangedShare') + 0.1 * p.defence),
    safeSpots: false,
    saveForSpecial: num('saveForSpecial') * (1 + 0.5 * Math.max(0, p.tech)),
    itemsAfterMin: num('itemsAfterMin'),
    items: (s < 0.3 ? presets.easy : s < 0.75 ? presets.normal : presets.hard).items,
    repairBelow: num('repairBelow'),
    waitCost: num('waitCost', a.waitCost ?? 3, b.waitCost ?? 1.5),
    maxWait: num('maxWait', a.maxWait ?? 30, b.maxWait ?? 120),
    // Opinionated (stubborn) players change their army less from round to round.
    doctrine: num('doctrine', a.doctrine ?? 0.6, b.doctrine ?? 0.3) * (1.2 - 0.5 * p.stubborn),
    noise: num('noise', a.noise ?? 0.4, b.noise ?? 0.15),
    antiAirWait: num('antiAirWait'),
    place: s >= 0.75 ? 'back' : undefined,
    bias,
  };
}
