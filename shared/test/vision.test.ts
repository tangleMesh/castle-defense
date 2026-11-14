import { describe, expect, it } from 'vitest';
import { MAP, Sim, baseArea, computeVision, filterSnapshot, makeSnapshot, tileVisible, type PlayerSetup } from '../src/index';
import { spawnUnit } from '../src/sim/spawning';

const players: PlayerSetup[] = [
  { userId: 'a', name: 'A', team: 0, faction: 'ironvow' },
  { userId: 'b', name: 'B', team: 1, faction: 'thornwild' },
];

describe('fog of war', () => {
  it('sees the own base area and a 12×12 square around own entities', () => {
    const b = baseArea(0);
    expect(b.x).toBe(0);
    expect(b.w).toBe(MAP.zones[0].x + MAP.zones[0].w);
    const grid = computeVision(0, [{ x: 40.5, y: 14.5 }]);
    expect(tileVisible(grid, 5, 0)).toBe(true); // own base, far corner
    expect(tileVisible(grid, 60, 14)).toBe(false); // enemy base
    let count = 0;
    for (let y = 0; y < MAP.height; y++) for (let x = 30; x < 50; x++) if (tileVisible(grid, x + 0.5, y + 0.5)) count++;
    expect(count).toBe(144);
    expect(tileVisible(grid, 34.5, 14.5)).toBe(true);
    expect(tileVisible(grid, 33.5, 14.5)).toBe(false);
    expect(tileVisible(grid, 45.5, 8.5)).toBe(true);
    expect(tileVisible(grid, 46.5, 14.5)).toBe(false);
  });

  it('filters enemy entities and orders per team, keeps castles, reveals all between rounds', () => {
    const sim = Sim.create({ players, bestOf: 3, seed: 7 });
    const castle1 = sim.castle(1)!;
    const scout = spawnUnit(sim, castle1, 'tw_vineling', 0, 1);
    scout.x = 60; scout.y = 14;
    const full = makeSnapshot(sim, [{ t: 'die', id: 999, x: 60, y: 14, k: 'unit' }]);
    const seenBy0 = filterSnapshot(full, 0);
    expect(seenBy0.ents.some((e) => e[0] === scout.id)).toBe(false);
    expect(seenBy0.ents.some((e) => e[1] === 3 && e[4] === 1)).toBe(true);
    expect(seenBy0.ents.some((e) => e[1] === 2 && e[4] === 1)).toBe(false); // enemy builder at home
    expect(seenBy0.ev).toHaveLength(0);
    expect(filterSnapshot(full, 1).ents.some((e) => e[0] === scout.id)).toBe(true);

    // An own unit nearby reveals it.
    const castle0 = sim.castle(0)!;
    const mine = spawnUnit(sim, castle0, 'iv_militia', 0, 1);
    mine.x = 55; mine.y = 14;
    expect(filterSnapshot(makeSnapshot(sim, []), 0).ents.some((e) => e[0] === scout.id)).toBe(true);

    sim.state.phase = 'roundOver';
    mine.x = 20;
    expect(filterSnapshot(makeSnapshot(sim, []), 0).ents.some((e) => e[0] === scout.id)).toBe(true);
  });
});
