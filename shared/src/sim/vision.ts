import { BUILDINGS } from '../data';
import { CASTLE_SIZE } from '../constants';
import { MAP, type Rect } from '../map/map';
import type { Phase, SimEvent, Team } from './state';
import type { EntRow, Snapshot } from './snapshot';

/**
 * Fog of war. A team always sees its own base area (its half up to the end of its build zone).
 * Beyond that, every own-team entity reveals a 24×24 tile square around itself (12 tiles each way).
 */
export const VISION_RANGE = 12;

const W = MAP.width, H = MAP.height;

/** The always-visible home area of a team: from the map edge to the end of its build zone, full height. */
export function baseArea(team: Team): Rect {
  const z = MAP.zones[team];
  return team === 0 ? { x: 0, y: 0, w: z.x + z.w, h: H } : { x: z.x, y: 0, w: W - z.x, h: H };
}

/** Fog only applies while a round is being played; between rounds everything is revealed. */
export function fogActive(phase: Phase): boolean {
  return phase === 'playing';
}

/** Visibility grid (1 = visible) for a team, given the positions of all its entities. */
export function computeVision(team: Team, sources: Iterable<{ x: number; y: number }>): Uint8Array {
  const grid = new Uint8Array(W * H);
  const b = baseArea(team);
  for (let y = b.y; y < b.y + b.h; y++) grid.fill(1, y * W + b.x, y * W + b.x + b.w);
  for (const s of sources) {
    // Tiles whose centre lies in [pos − R, pos + R) on both axes: always exactly 2R×2R tiles (clipped at the map edge).
    const x0 = Math.max(0, Math.ceil(s.x - VISION_RANGE - 0.5)), x1 = Math.min(W - 1, Math.ceil(s.x + VISION_RANGE - 0.5) - 1);
    const y0 = Math.max(0, Math.ceil(s.y - VISION_RANGE - 0.5)), y1 = Math.min(H - 1, Math.ceil(s.y + VISION_RANGE - 0.5) - 1);
    for (let y = y0; y <= y1; y++) if (x1 >= x0) grid.fill(1, y * W + x0, y * W + x1 + 1);
  }
  return grid;
}

export function tileVisible(grid: Uint8Array, x: number, y: number): boolean {
  const tx = Math.floor(x), ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= W || ty >= H) return false;
  return grid[ty * W + tx] === 1;
}

/** Footprint size in tiles of a structure (0 for units and builders). */
function footprint(kind: number, type: string): number {
  if (kind === 3) return CASTLE_SIZE;
  if (kind === 1) return BUILDINGS[type]?.size ?? 1;
  return 0;
}

/** An entity at (x, y) is visible if its tile — or for structures any footprint tile — is visible. */
export function entityVisible(grid: Uint8Array, kind: number, type: string, x: number, y: number): boolean {
  const size = footprint(kind, type);
  if (!size) return tileVisible(grid, x, y);
  const tx = Math.round(x - size / 2), ty = Math.round(y - size / 2);
  for (let yy = ty; yy < ty + size; yy++) for (let xx = tx; xx < tx + size; xx++) if (tileVisible(grid, xx + 0.5, yy + 0.5)) return true;
  return false;
}

/** Vision grid of a team computed from snapshot rows (own-team rows are never filtered). */
export function visionFromRows(team: Team, ents: EntRow[]): Uint8Array {
  const own: Array<{ x: number; y: number }> = [];
  for (const e of ents) if (e[4] === team) own.push({ x: e[5], y: e[6] });
  return computeVision(team, own);
}

/**
 * The snapshot as seen by one team: enemy entities, build orders, strikes and effects outside
 * its vision are removed. Castles always stay (their HP is shown in the top bar anyway).
 */
export function filterSnapshot(snap: Snapshot, team: Team): Snapshot {
  if (!fogActive(snap.phase)) return snap;
  const grid = visionFromRows(team, snap.ents);
  const ents = snap.ents.filter((e) => e[4] === team || e[1] === 3 || entityVisible(grid, e[1], e[2], e[5], e[6]));
  const ids = new Set(ents.map((e) => e[0]));
  const playerTeam = (p: number) => snap.players[p]?.team;
  const seen = (x: number, y: number) => tileVisible(grid, x, y);
  const evVisible = (ev: SimEvent): boolean => {
    switch (ev.t) {
      case 'atk': case 'heal': return ids.has(ev.a) || ids.has(ev.b);
      case 'chain': return ev.ids.some((id) => ids.has(id));
      case 'splash': return seen(ev.x, ev.y);
      case 'die': return seen(ev.x, ev.y);
      case 'gold': return playerTeam(ev.p) === team;
      case 'built': return ids.has(ev.id);
      case 'strike': return playerTeam(ev.p) === team || seen(ev.x, ev.y);
      default: return true;
    }
  };
  return {
    ...snap,
    ents,
    orders: snap.orders.filter((o) => playerTeam(o[0]) === team),
    strikes: snap.strikes.filter((s) => playerTeam(s[0]) === team || seen(s[1], s[2])),
    ev: snap.ev.filter(evVisible),
  };
}
