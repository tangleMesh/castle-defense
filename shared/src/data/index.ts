import type { BuildingDef, FactionDef, FactionId, UnitDef } from './types';
import { IRONVOW } from './factions/ironvow';
import { THORNWILD } from './factions/thornwild';
import { SHARDBOUND } from './factions/shardbound';
import { COGSPARK } from './factions/cogspark';
import { DUSKMOON } from './factions/duskmoon';
import { BLOODTUSK } from './factions/bloodtusk';
import { SUNSPIRE } from './factions/sunspire';
import { TUNING } from './tuning';
import type { Tuning } from './types';

export * from './types';
export * from './combat';
export * from './items';
export * from './abilities';

export const FACTIONS: Record<FactionId, FactionDef> = { ironvow: IRONVOW, thornwild: THORNWILD, shardbound: SHARDBOUND, cogspark: COGSPARK, duskmoon: DUSKMOON, bloodtusk: BLOODTUSK, sunspire: SUNSPIRE };
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
    if (f.trait?.unitEvade && u.evade === undefined) u.evade = f.trait.unitEvade;
    UNITS[u.id] = u;
  }
}

/** Hand-written values of every unit, before tuning. */
const BASE = new Map(Object.values(UNITS).map((u) => [u.id, { hp: u.hp, dmg: u.dmg, heal: u.heal && { ...u.heal }, poison: u.poison && { ...u.poison } }]));
const unitFaction = new Map<string, FactionId>();
for (const f of Object.values(FACTIONS)) for (const u of f.units) unitFaction.set(u.id, f.id);
/** Units of the first tier: spawned by buildable, non-special buildings, and what they burst into. */
export const EARLY_UNITS = new Set<string>();
for (const b of Object.values(BUILDINGS)) {
  if (!b.spawn || b.upgradeOnly || b.special) continue;
  EARLY_UNITS.add(b.spawn.unit);
  const od = UNITS[b.spawn.unit].onDeath;
  if (od) EARLY_UNITS.add(od.unit);
}

/** Balance revision of the committed tuning: the `+N` after the game version (0.20.0+3). */
export const BALANCE_REVISION = TUNING.revision ?? 0;

/** Full version label: game version (semantic, from package.json) + balance revision. */
export const versionLabel = (gameVersion: string) => `${gameVersion}+${BALANCE_REVISION}`;

/** The tuning in effect (see shared/src/data/tuning.ts). */
export let ACTIVE_TUNING: Tuning = TUNING;

/**
 * Sets every unit's hp / damage / heal / poison to its hand-written value times the tuning.
 * Always starts from the base values, so applying a tuning twice doesn't compound.
 */
export function applyUnitTuning(t: Tuning) {
  ACTIVE_TUNING = t;
  for (const u of Object.values(UNITS)) {
    const b = BASE.get(u.id)!;
    const ft = t.factions[unitFaction.get(u.id)!];
    const power = Math.sqrt((ft?.power ?? 1) * (EARLY_UNITS.has(u.id) ? ft?.early ?? 1 : 1));
    const hp = power * (t.units[u.id]?.hp ?? 1), dmg = power * (t.units[u.id]?.dmg ?? 1);
    u.hp = b.hp * hp;
    u.dmg = b.dmg * dmg;
    if (b.heal) u.heal = { ...b.heal, amount: b.heal.amount * dmg };
    if (b.poison) u.poison = { ...b.poison, dps: b.poison.dps * dmg };
  }
}
applyUnitTuning(TUNING);

/** Command-card hotkeys in WC3-grid order (row by row). */
export const GRID_HOTKEYS = ['Q', 'W', 'E', 'R', 'A', 'S', 'D', 'F', 'Z', 'X', 'C', 'V'];

export function isFactionId(v: unknown): v is FactionId {
  return typeof v === 'string' && v in FACTIONS;
}
