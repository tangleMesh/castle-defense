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
