/**
 * Building duels: two spawn buildings (or groups of them, with equal gold invested) fight it out
 * on an otherwise empty map, no AI involved. Measures raw unit value per gold, tier by tier,
 * independent of how well the bots play.
 */
import { TICK_RATE } from '../constants';
import { BUILDINGS, FACTION_IDS, type BuildingDef, type FactionId } from '../data';
import { MAP } from '../map/map';
import { Sim } from '../sim/sim';
import type { Team } from '../sim/state';

export type Tier = 'basic' | 'upgrade' | 'elite' | 'special';

export function tierOf(d: BuildingDef): Tier {
  if (d.special) return 'special';
  if (d.sapphires) return 'elite';
  return d.upgradeOnly ? 'upgrade' : 'basic';
}

/** Gold to get this building: its own cost plus every upgrade step before it. */
export function totalCost(d: BuildingDef): number {
  const parent = Object.values(BUILDINGS).find((b) => b.upgrades?.includes(d.id));
  return d.cost + (parent ? totalCost(parent) : 0);
}

/** Spawn buildings of a faction, optionally of one tier. */
export function spawners(f: FactionId, tier?: Tier): BuildingDef[] {
  return Object.values(BUILDINGS).filter((b) => b.faction === f && b.spawn && (!tier || tierOf(b) === tier));
}

export interface DuelSide { building: string; count: number }
export interface DuelResult { score: number; castleHp: [number, number]; standing: [number, number] }

/**
 * `a` (left) against `b` (right) for `minutes`. Score in [0,1] from a's view: 1 = destroyed b's
 * castle, otherwise the castle HP difference mapped to 0..1.
 */
export function duel(a: DuelSide, b: DuelSide, opts: { minutes?: number; seed?: number } = {}): DuelResult {
  const sides = [a, b];
  const sim = Sim.create({
    players: sides.map((s, t) => ({ userId: `d${t}`, name: `d${t}`, team: t as Team, faction: BUILDINGS[s.building].faction as FactionId })),
    bestOf: 1, seed: opts.seed ?? 7,
  });
  sides.forEach((s, t) => {
    const d = BUILDINGS[s.building];
    for (let i = 0; i < s.count; i++) {
      // Spread over the lanes, near the front of the zone.
      // Team 1 gets the point mirror image of team 0's layout.
      const lx = MAP.zones[0].x + MAP.zones[0].w - 5 - (i >> 2) * 3, ly = 3 + (i % 4) * 6;
      const tx = t === 0 ? lx : MAP.width - lx - d.size, ty = t === 0 ? ly : MAP.height - ly - d.size;
      sim.add({ kind: 'building', type: d.id, owner: t, team: t as Team, x: tx + 1, y: ty + 1, tx, ty, size: d.size, hp: d.hp, maxHp: d.hp, buildLeft: 0, buildTotal: 1, value: totalCost(d), cd: 0, spawnTimer: TICK_RATE * 2 + i * 3 });
    }
  });
  sim.state.players.forEach((p) => { p.gold = -1e9; }); // no builder activity
  const end = TICK_RATE * 60 * (opts.minutes ?? 5);
  while (sim.state.phase === 'playing' && sim.state.tick < end) sim.step([]);
  const hp = [0, 1].map((t) => sim.castle(t as Team).hp / sim.castle(t as Team).maxHp) as [number, number];
  const standing = [0, 1].map((t) => sim.state.entities.filter((e) => e.kind === 'building' && e.team === t).length) as [number, number];
  const score = sim.state.phase !== 'playing' ? (sim.state.winner === 0 ? 1 : 0) : Math.max(0, Math.min(1, 0.5 + (hp[0] - hp[1]) / 2 + (standing[0] - standing[1]) * 0.05));
  return { score, castleHp: hp, standing };
}

/**
 * Building counts for both sides with gold as equal as possible (rounding each side on its own
 * gave e.g. 4 Militia Halls = 360 g against 5 Burrows = 425 g). Searches counts up to about
 * twice the budget and prefers the closest gold match, then the count nearest the budget.
 */
export function matchCounts(costA: number, costB: number, budget: number): [number, number] {
  let best: [number, number] = [1, 1], bestScore = Infinity;
  const maxA = Math.max(1, Math.ceil((budget * 1.6) / costA));
  for (let a = 1; a <= maxA; a++) {
    const b = Math.max(1, Math.round((a * costA) / costB));
    const ga = a * costA, gb = b * costB;
    const mismatch = Math.abs(ga - gb) / Math.max(ga, gb);
    const off = Math.abs((ga + gb) / 2 - budget) / budget;
    const score = mismatch * 4 + off * 0.25;
    if (score < bestScore) { bestScore = score; best = [a, b]; }
  }
  return best;
}

/**
 * Cross-faction duels of every spawn building against every enemy spawn building of the same
 * tier, with about `budget` gold invested per side, played from both sides.
 */
export function duelJobs(budget = 400, factions: readonly FactionId[] = FACTION_IDS): Array<{ tier: Tier; a: DuelSide; b: DuelSide }> {
  const out: Array<{ tier: Tier; a: DuelSide; b: DuelSide }> = [];
  const tiers: Tier[] = ['basic', 'upgrade', 'elite', 'special'];
  for (let i = 0; i < factions.length; i++) for (let j = i + 1; j < factions.length; j++) for (const tier of tiers) {
    const scale = tier === 'special' || tier === 'elite' ? 2.5 : 1;
    for (const da of spawners(factions[i], tier)) for (const db of spawners(factions[j], tier)) {
      const [ca, cb] = matchCounts(totalCost(da), totalCost(db), budget * scale);
      out.push({ tier, a: { building: da.id, count: ca }, b: { building: db.id, count: cb } });
    }
  }
  return out;
}
