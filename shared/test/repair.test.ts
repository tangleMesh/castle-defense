/**
 * Builder repair (one building at a time, costs gold) and the Mason's Hammer (slow area repair).
 */
import { describe, expect, it } from 'vitest';
import { BUILDINGS, CASTLE_REPAIR_HPS, ITEM_BY_ID, REPAIR_FULL_SECONDS, Sim, TICK_RATE, type Entity, type PlayerSetup } from '../src/index';

const players: PlayerSetup[] = [
  { userId: 'a', name: 'A', team: 0, faction: 'ironvow' },
  { userId: 'b', name: 'B', team: 1, faction: 'thornwild' },
];
const newSim = () => Sim.create({ countdownTicks: 0, players, bestOf: 1, seed: 3 });

function building(sim: Sim, player: number, type: string, tx: number, ty: number): Entity {
  const def = BUILDINGS[type];
  return sim.add({
    kind: 'building', type, owner: player, team: sim.state.players[player].team, x: tx + def.size / 2, y: ty + def.size / 2, tx, ty, size: def.size,
    hp: def.hp, maxHp: def.hp, value: def.cost, buildLeft: 0,
  });
}

describe('builder repair', () => {
  it('walks over, restores HP at the repair rate, for free', () => {
    const sim = newSim();
    const def = BUILDINGS.iv_bastion_tower;
    const b = building(sim, 0, 'iv_bastion_tower', 20, 6);
    b.hp = b.maxHp / 2;
    const p = sim.state.players[0];
    p.gold = 1000;
    sim.step([{ player: 0, cmd: { c: 'repair', id: b.id } }]);
    const builder = sim.get(p.builderId)!;
    expect(builder.repairId).toBe(b.id);
    // Walk there (a few seconds at most), then measure one second of repair.
    for (let i = 0; i < 10 * TICK_RATE && b.hp === b.maxHp / 2; i++) sim.step();
    expect(b.hp).toBeGreaterThan(b.maxHp / 2);
    const hp0 = b.hp, gold0 = p.gold;
    for (let i = 0; i < TICK_RATE; i++) sim.step();
    const rate = def.hp / REPAIR_FULL_SECONDS;
    expect(b.hp - hp0).toBeCloseTo(rate, 0);
    expect(p.gold).toBeGreaterThanOrEqual(gold0);
    // Repairs to full, then stops on its own.
    for (let i = 0; i < 120 * TICK_RATE && builder.repairId !== undefined; i++) sim.step();
    expect(b.hp).toBe(b.maxHp);
    expect(builder.repairId).toBeUndefined();
  });

  it('repairs only one building at a time, and a move order stops it', () => {
    const sim = newSim();
    const a = building(sim, 0, 'iv_bastion_tower', 20, 6), c = building(sim, 0, 'iv_bastion_tower', 20, 30);
    a.hp = c.hp = 300;
    sim.state.players[0].gold = 1000;
    sim.step([{ player: 0, cmd: { c: 'repair', id: a.id } }]);
    sim.step([{ player: 0, cmd: { c: 'repair', id: c.id } }]);
    for (let i = 0; i < 8 * TICK_RATE; i++) sim.step();
    expect(a.hp).toBe(300);
    expect(c.hp).toBeGreaterThan(300);
    const builder = sim.get(sim.state.players[0].builderId)!;
    sim.step([{ player: 0, cmd: { c: 'move', x: 10, y: 20 } }]);
    expect(builder.repairId).toBeUndefined();
    const hp = c.hp;
    for (let i = 0; i < TICK_RATE; i++) sim.step();
    expect(c.hp).toBe(hp);
  });

  it('refuses other players\' and undamaged buildings, and repairs without any gold', () => {
    const sim = newSim();
    const enemy = building(sim, 1, 'tw_burrow', 85, 6);
    enemy.hp = 10;
    const full = building(sim, 0, 'iv_bastion_tower', 20, 6);
    sim.step([{ player: 0, cmd: { c: 'repair', id: enemy.id } }, { player: 0, cmd: { c: 'repair', id: full.id } }]);
    expect(sim.get(sim.state.players[0].builderId)!.repairId).toBeUndefined();
    full.hp = 100;
    const p = sim.state.players[0];
    p.gold = 0;
    sim.step([{ player: 0, cmd: { c: 'repair', id: full.id } }]);
    for (let i = 0; i < 8 * TICK_RATE; i++) { p.gold = 0; sim.step(); }
    expect(sim.get(p.builderId)!.repairId).toBe(full.id);
    const hp = full.hp;
    sim.step();
    expect(full.hp).toBeGreaterThan(hp);
  });
});

describe('castle repair', () => {
  it('builders repair their own castle, teammates stack, the enemy castle is refused', () => {
    const four: PlayerSetup[] = [
      { userId: 'a', name: 'A', team: 0, faction: 'ironvow' }, { userId: 'c', name: 'C', team: 0, faction: 'thornwild' },
      { userId: 'b', name: 'B', team: 1, faction: 'thornwild' }, { userId: 'd', name: 'D', team: 1, faction: 'ironvow' },
    ];
    const sim = Sim.create({ countdownTicks: 0, players: four, bestOf: 1, seed: 5 });
    const own = sim.castle(0), enemy = sim.castle(1);
    own.hp = enemy.hp = 4000;
    sim.step([
      { player: 0, cmd: { c: 'repair', id: own.id } }, { player: 1, cmd: { c: 'repair', id: own.id } },
      { player: 0, cmd: { c: 'repair', id: enemy.id } },
    ]);
    // The order for the enemy castle is ignored, so player 0 keeps repairing its own.
    expect(sim.get(sim.state.players[0].builderId)!.repairId).toBe(own.id);
    expect(sim.get(sim.state.players[1].builderId)!.repairId).toBe(own.id);
    for (let i = 0; i < 5 * TICK_RATE; i++) sim.step();
    const hp0 = own.hp;
    for (let i = 0; i < 2 * TICK_RATE; i++) sim.step();
    expect(own.hp - hp0).toBeCloseTo(2 * 2 * CASTLE_REPAIR_HPS, 0); // two builders, two seconds
    expect(enemy.hp).toBe(4000);
  });
});

describe("Mason's Rune", () => {
  it('slowly repairs every own building near the builder, for free', () => {
    const sim = newSim();
    const rep = ITEM_BY_ID.mason_rune.repair!;
    const p = sim.state.players[0];
    const builder = sim.get(p.builderId)!;
    const near = [building(sim, 0, 'iv_bastion_tower', 20, 6), building(sim, 0, 'iv_militia_hall', 20, 9)];
    const far = building(sim, 0, 'iv_bastion_tower', 20, 30);
    for (const b of [...near, far]) b.hp = 200;
    p.items = ['mason_rune'];
    builder.x = 19; builder.y = 8;
    const gold = p.gold;
    for (let i = 0; i < 2 * TICK_RATE; i++) sim.step();
    for (const b of near) expect(b.hp).toBeCloseTo(200 + 2 * rep.hps, 0);
    expect(far.hp).toBe(200);
    expect(p.gold).toBeGreaterThanOrEqual(gold);
    // Slower than the builder's own repair of the same tower.
    const t = BUILDINGS.iv_bastion_tower;
    expect(rep.hps).toBeLessThan(t.hp / REPAIR_FULL_SECONDS);
  });
});
