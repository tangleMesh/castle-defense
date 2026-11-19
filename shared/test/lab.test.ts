import { describe, expect, it } from 'vitest';
import {
  FACTION_IDS, UNITS, applyPatch, compositions, duel, factionMatrix, ladderMatrix, playMatch, summarize, summarizeLadder, wilson,
} from '../src/index';

describe('simulation lab', () => {
  it('enumerates team line-ups and matrices from the faction list', () => {
    const n = FACTION_IDS.length;
    expect(compositions(1)).toHaveLength(n);
    // Each faction at most once per team.
    expect(compositions(2)).toHaveLength((n * (n - 1)) / 2);
    expect(compositions(2).every(([a, b]) => a !== b)).toBe(true);
    const jobs = factionMatrix({ sizes: [1], level: 'easy', seeds: 2 });
    // n(n+1)/2 pairings × 2 seeds × 2 sides
    expect(jobs).toHaveLength(((n * (n + 1)) / 2) * 2 * 2);
    expect(new Set(jobs.map((j) => j.seed)).size).toBe(jobs.length);
    expect(ladderMatrix({ hi: 'hard', lo: 'easy', seeds: 1 })).toHaveLength(n * n * 2);
  });

  it('computes Wilson intervals', () => {
    const [lo, hi] = wilson(5, 10);
    expect(lo).toBeLessThan(0.5); expect(hi).toBeGreaterThan(0.5);
    expect(wilson(0, 0)).toEqual([0, 1]);
  });

  it('summarizes results per pairing, faction and side', () => {
    const jobs = factionMatrix({ sizes: [1], level: 'easy', seeds: 1, factions: ['ironvow', 'thornwild'] });
    // Fake results: team 0 always wins.
    const results = jobs.map(() => ({ winner: 0 as const, minutes: 5, castleHp: [1, 0] as [number, number], players: [] }));
    const r = summarize(jobs, results);
    expect(r.side.rate).toBe(1);
    const cross = r.pairings.find((p) => p.a !== p.b)!;
    expect(cross.rate).toBe(0.5); // each side once
    expect(r.factions.ironvow.rate).toBeCloseTo(0.5);
    const lad = ladderMatrix({ hi: 'hard', lo: 'easy', seeds: 1, factions: ['ironvow'] });
    expect(summarizeLadder(lad, lad.map(() => ({ winner: 0 as const, minutes: 1, castleHp: [1, 0] as [number, number], players: [] }))).total.rate).toBe(0.5);
  });

  it('plays a headless bot match and a building duel', () => {
    const r = playMatch({ teams: [[{ faction: 'ironvow', level: 'hard' }], [{ faction: 'thornwild', level: 'easy' }]], seed: 3, maxMinutes: 2 });
    expect(r.minutes).toBeGreaterThan(1.9);
    expect(r.players).toHaveLength(2);
    expect(r.players.every((p) => p.buildings > 0)).toBe(true);
    const d = duel({ building: 'iv_militia_hall', count: 1 }, { building: 'tw_burrow', count: 1 }, { minutes: 1 });
    expect(d.score).toBeGreaterThanOrEqual(0); expect(d.score).toBeLessThanOrEqual(1);
  });

  it('patches unit data for what-if balance runs', () => {
    const hp = UNITS.iv_militia.hp;
    applyPatch({ 'iv_militia.hp': hp + 1 });
    expect(UNITS.iv_militia.hp).toBe(hp + 1);
    applyPatch({ 'iv_militia.hp': hp });
    expect(() => applyPatch({ 'nope.hp': 1 })).toThrow();
  });
});

// Slow statistical gate (minutes): BALANCE=1 npx vitest run shared/test/lab.test.ts
// For full reports use `npm run lab -- all` (parallel, with confidence intervals).
describe.runIf(process.env.BALANCE)('balance gate (BALANCE=1)', () => {
  it('no faction dominates 1v1 hard-bot games', () => {
    const jobs = factionMatrix({ sizes: [1], level: 'hard', seeds: 4 });
    const r = summarize(jobs, jobs.map(playMatch));
    for (const [f, v] of Object.entries(r.factions)) {
      expect(v.rate, `${f} win rate`).toBeGreaterThan(0.25);
      expect(v.rate, `${f} win rate`).toBeLessThan(0.75);
    }
    expect(r.side.rate, 'left side').toBeGreaterThan(0.3);
    expect(r.side.rate, 'left side').toBeLessThan(0.7);
  }, 1_800_000);

  it('each difficulty beats the one below it', () => {
    for (const [hi, lo] of [['brutal', 'hard'], ['hard', 'normal'], ['normal', 'easy']] as const) {
      const jobs = ladderMatrix({ hi, lo, seeds: 2 });
      const s = summarizeLadder(jobs, jobs.map(playMatch));
      expect(s.total.rate, `${hi} vs ${lo}`).toBeGreaterThanOrEqual(0.6);
    }
  }, 1_800_000);
});
