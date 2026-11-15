import { describe, expect, it } from 'vitest';
import { FIRST_BUILD_BONUS, Sim, type PlayerSetup, type SimEvent } from '../src/index';

const players: PlayerSetup[] = [0, 1, 2, 3].map((i) => ({ userId: `u${i}`, name: `P${i}`, team: (i % 2) as 0 | 1, faction: 'ironvow' }));

/** Puts a building of `owner` one tick away from completion. */
const almostBuilt = (sim: Sim, owner: number, upgrading = false) => sim.add({
  kind: 'building', type: 'iv_militia_hall', owner, team: sim.state.players[owner].team,
  x: 10, y: 10, tx: 9, ty: 9, size: 2, hp: 100, maxHp: 100, buildLeft: 1, buildTotal: 10, value: 90, cd: 0,
  ...(upgrading ? { upgrading: true } : {}),
});
const firsts = (ev: SimEvent[]) => ev.filter((e) => e.t === 'first') as Extract<SimEvent, { t: 'first' }>[];

describe('first-building bonus', () => {
  it('pays 20/15/10 gold to the first three players to finish a building, once each per round', () => {
    const sim = Sim.create({ players, bestOf: 3, seed: 1 });
    expect(FIRST_BUILD_BONUS).toEqual([20, 15, 10]);
    const gold = () => sim.state.players.map((p) => p.gold);
    const g0 = gold();
    // Player 2 finishes first, then player 2 again (no second bonus), then 0, upgrade of 3 (no), 1, 3.
    almostBuilt(sim, 2);
    expect(firsts(sim.step([])).map((e) => [e.p, e.g])).toEqual([[2, 20]]);
    almostBuilt(sim, 2); almostBuilt(sim, 3, true);
    expect(firsts(sim.step([]))).toEqual([]);
    almostBuilt(sim, 0);
    expect(firsts(sim.step([])).map((e) => [e.p, e.g])).toEqual([[0, 15]]);
    almostBuilt(sim, 1); almostBuilt(sim, 3);
    expect(firsts(sim.step([])).map((e) => [e.p, e.g])).toEqual([[1, 10]]);
    expect(gold().map((g, i) => g - g0[i])).toEqual([15, 10, 20, 0]);
  });

  it('resets every round', async () => {
    const { startRound } = await import('../src/sim/rounds');
    const sim = Sim.create({ players, bestOf: 3, seed: 1 });
    almostBuilt(sim, 0); sim.step([]);
    expect(sim.state.firstBuilds).toEqual([0]);
    startRound(sim);
    expect(sim.state.firstBuilds).toEqual([]);
    almostBuilt(sim, 0);
    expect(firsts(sim.step([])).map((e) => e.g)).toEqual([20]);
  });
});
