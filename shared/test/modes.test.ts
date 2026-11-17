import { describe, expect, it } from 'vitest';
import { Sim, makeSnapshot, type PlayerSetup } from '../src/index';
import { startRound } from '../src/sim/rounds';

const players: PlayerSetup[] = [0, 1, 2, 3].map((i) => ({ userId: `u${i}`, name: `P${i}`, team: (i % 2) as 0 | 1, faction: 'ironvow' }));

describe('game modes', () => {
  it('standard mode keeps the chosen factions', () => {
    const sim = Sim.create({ countdownTicks: 0, players, bestOf: 5, seed: 9 });
    for (let r = 0; r < 4; r++) startRound(sim);
    expect(sim.state.players.every((p) => p.faction === 'ironvow')).toBe(true);
    expect(makeSnapshot(sim, []).mode).toBe('standard');
  });

  it('random mode draws every faction anew each round, deterministically', () => {
    const draws = (seed: number) => {
      const sim = Sim.create({ countdownTicks: 0, players, bestOf: 5, seed, mode: 'random' });
      const out = [sim.state.players.map((p) => p.faction)];
      for (let r = 0; r < 7; r++) { startRound(sim); out.push(sim.state.players.map((p) => p.faction)); }
      return out;
    };
    const a = draws(42);
    expect(draws(42)).toEqual(a);
    const all = a.flat();
    expect(all).toContain('ironvow');
    expect(all).toContain('thornwild');
    // Factions really change between rounds (not just one draw per match).
    expect(new Set(a.map((r) => r.join())).size).toBeGreaterThan(1);
  });
});
