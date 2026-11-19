import { describe, expect, it } from 'vitest';
import { FACTION_IDS, Sim, makeSnapshot, type PlayerSetup } from '../src/index';
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
      for (let r = 0; r < 59; r++) { startRound(sim); out.push(sim.state.players.map((p) => p.faction)); }
      return out;
    };
    const a = draws(42);
    expect(draws(42)).toEqual(a);
    const all = a.flat();
    // Over many rounds every faction comes up.
    for (const f of FACTION_IDS) expect(all, f).toContain(f);
    // Factions really change between rounds (not just one draw per match).
    expect(new Set(a.map((r) => r.join())).size).toBeGreaterThan(1);
  });
});

describe('faction draws', () => {
  it('random mode never gives a faction twice to one team; mirror mode gives both teams the same set', async () => {
    const { Sim } = await import('../src/index');
    for (const mode of ['random', 'mirror'] as const) for (let seed = 1; seed <= 20; seed++) {
      const sim = Sim.create({ countdownTicks: 0, bestOf: 1, seed, mode, players: [
        { userId: 'a', name: 'a', team: 0, faction: 'ironvow' }, { userId: 'b', name: 'b', team: 0, faction: 'ironvow' },
        { userId: 'c', name: 'c', team: 0, faction: 'ironvow' }, { userId: 'd', name: 'd', team: 0, faction: 'ironvow' },
        { userId: 'e', name: 'e', team: 1, faction: 'ironvow' }, { userId: 'f', name: 'f', team: 1, faction: 'ironvow' },
        { userId: 'g', name: 'g', team: 1, faction: 'ironvow' }, { userId: 'h', name: 'h', team: 1, faction: 'ironvow' },
      ] });
      const t0 = sim.state.players.filter((p) => p.team === 0).map((p) => p.faction);
      const t1 = sim.state.players.filter((p) => p.team === 1).map((p) => p.faction);
      expect(new Set(t0).size, `${mode} #${seed}`).toBe(4);
      expect(new Set(t1).size, `${mode} #${seed}`).toBe(4);
      if (mode === 'mirror') expect([...t1].sort()).toEqual([...t0].sort());
    }
  });
});

describe('round statistics', () => {
  it('reset every round while the match totals keep the earlier rounds', async () => {
    const { Sim, matchStats } = await import('../src/index');
    const sim = Sim.create({ countdownTicks: 0, bestOf: 3, seed: 1, players: [
      { userId: 'a', name: 'a', team: 0, faction: 'ironvow' }, { userId: 'b', name: 'b', team: 1, faction: 'thornwild' }] });
    const p = sim.state.players[0];
    p.kills = 7; p.goldEarned = 300; p.strikes = 1; p.lost = 2; p.castleDmg = 50;
    startRound(sim);
    expect([p.kills, p.goldEarned, p.strikes, p.lost, p.castleDmg]).toEqual([0, 0, 0, 0, 0]);
    p.kills = 3;
    expect(matchStats(p)).toEqual({ kills: 10, strikes: 1, goldEarned: 300, lost: 2, castleDmg: 50 });
  });
});
