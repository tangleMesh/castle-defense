import type { BuildingDef, FactionDef, FactionId, UnitDef } from './types';
import { IRONVOW } from './factions/ironvow';
import { THORNWILD } from './factions/thornwild';

export * from './types';
export * from './combat';

export const FACTIONS: Record<FactionId, FactionDef> = { ironvow: IRONVOW, thornwild: THORNWILD };
export const FACTION_IDS = Object.keys(FACTIONS) as FactionId[];

export const BUILDINGS: Record<string, BuildingDef> = {};
export const UNITS: Record<string, UnitDef> = {};
for (const f of Object.values(FACTIONS)) {
  for (const b of f.buildings) BUILDINGS[b.id] = b;
  for (const u of f.units) UNITS[u.id] = u;
}

/** Command-card hotkeys in WC3-grid order (row by row). */
export const GRID_HOTKEYS = ['Q', 'W', 'E', 'R', 'A', 'S', 'D', 'F', 'Z', 'X', 'C', 'V'];

export function isFactionId(v: unknown): v is FactionId {
  return typeof v === 'string' && v in FACTIONS;
}
