import { BUILDINGS, UNITS } from '../data';

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
