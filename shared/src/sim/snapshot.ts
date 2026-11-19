import { START_SAPPHIRES, type GameMode } from '../constants';
import { incomeFor } from './economy';
import type { Sim } from './sim';
import type { EntityKind, Phase, SimEvent } from './state';

export const KIND_CODES: EntityKind[] = ['unit', 'building', 'builder', 'castle'];

/**
 * Compact entity row: [id, kind, type, owner, team, x, y, hp, maxHp, extra, spawn].
 * extra = construction progress 0..100 for structures (‑progress while upgrading), else 0.
 * spawn = ticks until the next unit for finished spawn buildings, else 0.
 * fx = status bit flags (FX_POISON, FX_STUN, FX_HIDDEN).
 */
export type EntRow = [number, number, string, number, number, number, number, number, number, number, number, number];

/** EntRow fx flag: the unit is poisoned. */
export const FX_POISON = 1;
/** EntRow fx flag: the unit is stunned. */
export const FX_STUN = 2;
/** Stealth unit currently hidden: the enemy never receives it, its own team draws it faded. */
export const FX_HIDDEN = 4;
/** Hexed into a sheep. */
export const FX_SHEEP = 8;

export interface SnapshotPlayer {
  i: number;
  name: string;
  team: 0 | 1;
  faction: string;
  gold: number;
  income: number;
  rescueUsed: boolean;
  builderId: number;
  connected: boolean;
  kills: number;
  /** Match totals for the scoreboard. */
  goldEarned: number;
  lost: number;
  castleDmg: number;
  /** Builder items carried this round. */
  items: string[];
  /** Sapphires in hand. */
  sapphires: number;
}

export interface Snapshot {
  tick: number;
  phase: Phase;
  phaseTicks: number;
  round: number;
  bestOf: number;
  mode: GameMode;
  score: [number, number];
  /** Winner of the most recent finished round, if any. */
  lastWinner: 0 | 1 | null;
  incomeTicks: number;
  players: SnapshotPlayer[];
  ents: EntRow[];
  /** Pending build orders: [player, building, tx, ty]. */
  orders: Array<[number, string, number, number]>;
  strikes: Array<[number, number, number, number]>;
  /** Buried mines: [team, x, y]. Only the own team's reach a client. */
  mines?: Array<[number, number, number]>;
  ev: SimEvent[];
}

const r2 = (v: number) => Math.round(v * 100) / 100;

export function makeSnapshot(sim: Sim, events: SimEvent[]): Snapshot {
  const s = sim.state;
  const ents: EntRow[] = [];
  const orders: Snapshot['orders'] = [];
  for (const e of s.entities) {
    let extra = 0;
    if (e.kind === 'building') {
      const prog = e.buildLeft ? Math.round(100 * (1 - e.buildLeft / (e.buildTotal || 1))) : 100;
      extra = e.upgrading ? -Math.max(1, prog) : prog;
    }
    // Builders use the spawn column for the building they repair.
    const spawn = e.kind === 'building' && !e.buildLeft ? e.spawnTimer ?? 0 : e.kind === 'builder' ? e.repairId ?? 0 : 0;
    ents.push([e.id, KIND_CODES.indexOf(e.kind), e.type, e.owner, e.team, r2(e.x), r2(e.y), Math.ceil(e.hp), Math.round(e.maxHp), extra, spawn, (e.poison ? FX_POISON : 0) | (e.stun ? FX_STUN : 0) | (e.hidden ? FX_HIDDEN : 0) | (e.sheep ? FX_SHEEP : 0)]);
    if (e.kind === 'builder') for (const o of e.orders ?? []) orders.push([e.owner, o.building, o.tx, o.ty]);
  }
  return {
    tick: s.tick,
    phase: s.phase,
    phaseTicks: s.phaseTicks,
    round: s.round,
    bestOf: s.bestOf,
    mode: s.mode ?? 'standard',
    score: [s.score[0], s.score[1]],
    lastWinner: s.rounds.length ? s.rounds[s.rounds.length - 1].winner : null,
    incomeTicks: s.incomeTicks,
    players: s.players.map((p) => ({
      i: p.index, name: p.name, team: p.team, faction: p.faction, gold: Math.floor(p.gold),
      income: incomeFor(sim, p.index), rescueUsed: p.rescueUsed, builderId: p.builderId,
      connected: p.connected, kills: p.kills,
      goldEarned: Math.floor(p.goldEarned), lost: p.lost ?? 0, castleDmg: Math.round(p.castleDmg ?? 0),
      items: [...(p.items ?? [])],
      sapphires: p.sapphires ?? START_SAPPHIRES,
    })),
    ents,
    orders,
    strikes: s.strikes.map((st) => [st.player, r2(st.x), r2(st.y), st.ticksLeft]),
    mines: (s.mines ?? []).map((m) => [m.team, r2(m.x), r2(m.y)]),
    ev: events,
  };
}
