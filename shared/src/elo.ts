import type { AiLevel } from './ai/ai';

/**
 * Elo ratings for accounts. Every account starts at START_RATING. A team's rating is the average
 * of its players (bots count with a fixed rating per difficulty and never change); the expected
 * score follows the usual logistic curve (400 points = 10:1 odds), and every human on a team moves
 * by the same K × (result − expected), so a win against stronger opponents earns more.
 */
export const START_RATING = 1000;
export const ELO_K = 32;
export const BOT_RATING: Record<AiLevel, number> = { easy: 800, normal: 1000, hard: 1200, brutal: 1400 };

/** Probability that a team rated `a` beats one rated `b`. */
export function expectedScore(a: number, b: number): number {
  return 1 / (1 + 10 ** ((b - a) / 400));
}

/** Rating change of every player on team A (team B moves by the negative), rounded to whole points. */
export function eloDelta(teamA: number[], teamB: number[], aWon: boolean, k = ELO_K): number {
  const avg = (t: number[]) => t.reduce((s, v) => s + v, 0) / Math.max(1, t.length);
  return Math.round(k * ((aWon ? 1 : 0) - expectedScore(avg(teamA), avg(teamB))));
}
