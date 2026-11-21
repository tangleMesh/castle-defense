import type { AiLevel } from './ai/ai';

/**
 * Elo ratings for accounts. Every account starts at START_RATING. A team's rating is the average
 * of its players (preset bots count with a fixed rating per difficulty, Auto bots with the target Elo
 * they were given for the match; bots' ratings never change); the expected
 * score follows the usual logistic curve (400 points = 10:1 odds), and every human on a team moves
 * by the same K × (result − expected), so a win against stronger opponents earns more.
 */
export const START_RATING = 1000;
export const ELO_K = 32;
/** Fixed ratings of the preset levels ('auto' bots instead get a target Elo per match, see botTargets). */
export const BOT_RATING: Record<AiLevel, number> = { easy: 800, normal: 1000, hard: 1200, brutal: 1400, auto: START_RATING };

/** Auto bots never aim outside this Elo range. */
export const BOT_ELO_MIN = 600, BOT_ELO_MAX = 2400;

/**
 * Target Elo of every Auto bot so the match is fair: the two teams' average ratings come out equal.
 * Humans (and fixed-level bots) bring their rating; Auto bots (`rating` undefined) fill the gap.
 * - Auto bots on one side only: they bring their team's average up (or down) to the other team's.
 * - Auto bots on both sides: everyone aims at the average of the known players (1000 if none), each
 *   team's Auto bots making up for their own team's known players.
 * Returns the target per index of `players` (undefined for non-auto entries).
 */
export function botTargets(players: Array<{ team: 0 | 1; rating?: number }>): Array<number | undefined> {
  const known = (t: 0 | 1) => players.filter((p) => p.team === t && p.rating !== undefined).map((p) => p.rating!);
  const autos = (t: 0 | 1) => players.filter((p) => p.team === t && p.rating === undefined).length;
  const size = (t: 0 | 1) => players.filter((p) => p.team === t).length;
  const avg = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
  const all = [...known(0), ...known(1)];
  const target: Record<0 | 1, number | undefined> = { 0: undefined, 1: undefined };
  for (const t of [0, 1] as const) {
    if (!autos(t)) continue;
    const other = (1 - t) as 0 | 1;
    // The level both teams should average.
    const goal = autos(other) ? (all.length ? avg(all) : START_RATING) : known(other).length ? avg(known(other)) : START_RATING;
    const sum = known(t).reduce((s, x) => s + x, 0);
    const per = (goal * size(t) - sum) / autos(t);
    target[t] = Math.round(Math.min(BOT_ELO_MAX, Math.max(BOT_ELO_MIN, per)));
  }
  return players.map((p) => (p.rating === undefined ? target[p.team] : undefined));
}

/** Probability that a team rated `a` beats one rated `b`. */
export function expectedScore(a: number, b: number): number {
  return 1 / (1 + 10 ** ((b - a) / 400));
}

/** Rating change of every player on team A (team B moves by the negative), rounded to whole points. */
export function eloDelta(teamA: number[], teamB: number[], aWon: boolean, k = ELO_K): number {
  const avg = (t: number[]) => t.reduce((s, v) => s + v, 0) / Math.max(1, t.length);
  return Math.round(k * ((aWon ? 1 : 0) - expectedScore(avg(teamA), avg(teamB))));
}
