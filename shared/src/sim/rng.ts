import type { SimState } from './state';

/** Mulberry32 step: deterministic PRNG whose whole state is a single uint32 kept in SimState. */
export function nextRandom(state: SimState): number {
  let t = (state.rng = (state.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randomRange(state: SimState, min: number, max: number): number {
  return min + (max - min) * nextRandom(state);
}

/**
 * Side-symmetric random number in [0, 1): derived from the current RNG state, the tick and a
 * caller key without advancing the RNG. Callers build the key from team-relative (mirrored)
 * coordinates, so both teams get the same draw for mirror-image situations: no side is luckier
 * just because its entities happen to be processed first.
 */
export function sideRandom(state: SimState, key: number): number {
  let t = (state.rng ^ Math.imul(state.tick + 1, 0x9e3779b1) ^ Math.imul(key | 0, 0x85ebca6b)) >>> 0;
  t = Math.imul(t ^ (t >>> 16), 0x7feb352d);
  t = Math.imul(t ^ (t >>> 15), 0x846ca68b);
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
}
