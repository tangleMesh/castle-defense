import type { BuildingDef, FactionDef, FactionId, UnitDef } from './types';
import { IRONVOW } from './factions/ironvow';
import { THORNWILD } from './factions/thornwild';

export * from './types';
export * from './combat';
export * from './items';
export * from './abilities';

export const FACTIONS: Record<FactionId, FactionDef> = { ironvow: IRONVOW, thornwild: THORNWILD };
export const FACTION_IDS = Object.keys(FACTIONS) as FactionId[];

export const BUILDINGS: Record<string, BuildingDef> = {};
export const UNITS: Record<string, UnitDef> = {};
for (const f of Object.values(FACTIONS)) {
  // Faction traits are folded into the individual defs once, at load time.
  for (const b of f.buildings) {
    if (f.trait?.buildingRegen && b.regen === undefined) b.regen = f.trait.buildingRegen;
    if (f.trait?.buildingArmor) b.armor += f.trait.buildingArmor;
    BUILDINGS[b.id] = b;
  }
  for (const u of f.units) {
    if (f.trait?.unitRegen && u.regen === undefined) u.regen = f.trait.unitRegen;
    UNITS[u.id] = u;
  }
}

/** Command-card hotkeys in WC3-grid order (row by row). */
export const GRID_HOTKEYS = ['Q', 'W', 'E', 'R', 'A', 'S', 'D', 'F', 'Z', 'X', 'C', 'V'];

export function isFactionId(v: unknown): v is FactionId {
  return typeof v === 'string' && v in FACTIONS;
}
