import { CASTLE_CLEARANCE } from '../constants';
import { BUILDINGS } from '../data';
import { MAP, inRect } from '../map/map';
import { fillRect, idx, inBounds, isFullyConnected } from './grid';
import type { Sim } from './sim';
import type { Team } from './state';

/** True for tiles of a castle or within CASTLE_CLEARANCE tiles of it. */
export function nearCastle(x: number, y: number): boolean {
  return MAP.castles.some((c) => x >= c.x - CASTLE_CLEARANCE && y >= c.y - CASTLE_CLEARANCE
    && x < c.x + c.w + CASTLE_CLEARANCE && y < c.y + c.h + CASTLE_CLEARANCE);
}

/**
 * Cheap checks shared with the client for the ghost preview: in bounds, inside the
 * team's build zone and every footprint tile free.
 */
export function basicPlacementError(team: Team, tx: number, ty: number, size: number, isBlocked: (x: number, y: number) => boolean): string | null {
  const zone = MAP.zones[team];
  for (let y = ty; y < ty + size; y++) {
    for (let x = tx; x < tx + size; x++) {
      if (!inBounds(x, y)) return 'Out of bounds';
      if (!inRect(zone, x, y)) return 'Must build inside your build zone';
      if (nearCastle(x, y)) return `Keep ${CASTLE_CLEARANCE} tiles clear around the castle`;
      if (isBlocked(x, y)) return 'Space is occupied';
    }
  }
  return null;
}

/** Full authoritative placement validation. Returns an error message or null. */
export function placementError(sim: Sim, player: number, buildingId: string, tx: number, ty: number, ignoreOrder?: object): string | null {
  const p = sim.state.players[player];
  const def = BUILDINGS[buildingId];
  if (!p || !def) return 'Unknown building';
  if (def.faction !== 'any' && def.faction !== p.faction) return 'Not your faction';
  if (!Number.isInteger(tx) || !Number.isInteger(ty)) return 'Invalid position';

  const grid = sim.blockedGrid.slice();
  // Reserve tiles of every pending build order.
  for (const q of sim.state.players) {
    const b = sim.get(q.builderId);
    for (const o of b?.orders ?? []) {
      if (o === ignoreOrder) continue;
      fillRect(grid, { x: o.tx, y: o.ty, w: BUILDINGS[o.building].size, h: BUILDINGS[o.building].size }, 1);
    }
  }
  const basic = basicPlacementError(p.team, tx, ty, def.size, (x, y) => !!grid[idx(x, y)]);
  if (basic) return basic;

  fillRect(grid, { x: tx, y: ty, w: def.size, h: def.size }, 1);
  if (!isFullyConnected(grid)) return 'That would block the path';
  return null;
}
