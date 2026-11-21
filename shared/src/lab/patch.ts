import { BUILDINGS, UNITS, applyUnitTuning, type Tuning } from '../data';
import { TUNING } from '../data/tuning';

/**
 * What-if balance changes for the simulation lab: `{ "tw_burrow.spawn.interval": 24 }` sets a field
 * of a building or unit definition (by id), creating intermediate objects as needed.
 */
export function applyPatch(patch: Record<string, unknown>) {
  for (const [path, value] of Object.entries(patch)) {
    const [id, ...keys] = path.split('.');
    let obj: Record<string, unknown> | undefined = (BUILDINGS[id] ?? UNITS[id]) as unknown as Record<string, unknown> | undefined;
    if (!obj || !keys.length) throw new Error(`patch: unknown building/unit "${id}" in "${path}"`);
    for (const k of keys.slice(0, -1)) obj = (obj[k] ??= {}) as Record<string, unknown>;
    obj[keys.at(-1)!] = value;
  }
}


/** The committed tuning (shared/src/data/tuning.ts). */
export const COMMITTED_TUNING: Tuning = TUNING;
/** No tuning at all: every multiplier 1, default bot incomes. */
export const NEUTRAL_TUNING: Tuning = { factions: {}, units: {}, aiIncome: {} };

/** Applies a tuning (unit multipliers and bot incomes) from the hand-written base values. */
export function applyTuning(t: Tuning) {
  applyUnitTuning(t);
  // Bot incomes are not tunable any more: every bot earns exactly like a player (AI_INCOME is all 1).
  void t.aiIncome;
}
