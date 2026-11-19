import { describe, expect, it } from 'vitest';
import { ITEMS, ITEM_BY_ID, MAX_ITEMS, Sim, TICK_RATE, makeSnapshot, type PlayerSetup, type SimEvent } from '../src/index';
import { armorOf } from '../src/sim/combat';
import { spawnUnit } from '../src/sim/spawning';
import { modsOf } from '../src/sim/auras';

const players: PlayerSetup[] = [
  { userId: 'a', name: 'A', team: 0, faction: 'ironvow' },
  { userId: 'b', name: 'B', team: 1, faction: 'thornwild' },
];
const newSim = () => Sim.create({ countdownTicks: 0, players, bestOf: 3, seed: 5 });
const buy = (sim: Sim, item: string, player = 0) => sim.step([{ player, cmd: { c: 'buy', item } }]);

describe('builder items', () => {
  it('are expensive late-game purchases (the crossbow is a cheap early pick)', () => {
    for (const i of ITEMS) expect(i.cost, i.id).toBeGreaterThanOrEqual(i.id === 'crossbow' ? 150 : 420);
  });

  it('buying costs gold, refuses duplicates, a full bag and empty purses', () => {
    const sim = newSim();
    const me = sim.state.players[0];
    const errs = (ev: SimEvent[]) => ev.filter((e) => e.t === 'err').map((e) => (e as { msg: string }).msg);
    expect(errs(buy(sim, 'war_horn'))).toEqual(['Not enough gold']);
    me.gold = 2000;
    const ev = buy(sim, 'war_horn');
    expect(ev.some((e) => e.t === 'item' && e.item === 'war_horn')).toBe(true);
    expect(me.gold).toBe(2000 - ITEM_BY_ID.war_horn.cost);
    expect(errs(buy(sim, 'war_horn'))[0]).toMatch(/already/);
    buy(sim, 'aegis'); buy(sim, 'boots');
    expect(me.items).toHaveLength(MAX_ITEMS);
    expect(errs(buy(sim, 'chalice'))[0]).toMatch(/only 3/);
    expect(makeSnapshot(sim, []).players[0].items).toEqual(['war_horn', 'aegis', 'boots']);
  });

  it('team auras reach every unit of the team anywhere, but not the enemy', () => {
    const sim = newSim();
    const me = sim.state.players[0];
    me.gold = 2000;
    buy(sim, 'war_horn'); buy(sim, 'aegis'); buy(sim, 'chalice'); 
    const far = spawnUnit(sim, sim.castle(0), 'iv_militia', 0, 0);
    far.x = 60; far.y = 3;
    const foe = spawnUnit(sim, sim.castle(1), 'tw_vineling', 1, 1);
    sim.step();
    const m = modsOf(sim, far.id);
    expect(m.dmg).toBeCloseTo(1.2);
    expect(m.armor).toBe(3);
    expect(m.regen).toBe(4);
    expect(modsOf(sim, foe.id).dmg).toBe(1);
  });

  it("the Warden's Crossbow makes the builder shoot nearby enemies", () => {
    const sim = newSim();
    const me = sim.state.players[0];
    me.gold = 2000;
    buy(sim, 'crossbow');
    const b = sim.get(me.builderId)!;
    const foe = spawnUnit(sim, sim.castle(1), 'tw_vineling', 1, 1);
    foe.x = b.x + 3; foe.y = b.y; 
    const hp = foe.hp;
    let shots = 0;
    for (let i = 0; i < 5; i++) for (const e of sim.step()) if (e.t === 'atk' && e.a === b.id) shots++;
    expect(shots).toBeGreaterThan(0);
    expect(foe.hp).toBeLessThan(hp);
  });

  it("the Mason's Hammer repairs buildings, not the castle", () => {
    const sim = newSim();
    const me = sim.state.players[0];
    me.gold = 2000;
    buy(sim, 'hammer');
    const castle = sim.castle(0);
    castle.hp = 5000;
    for (let i = 0; i < 10 * TICK_RATE; i++) sim.step();
    expect(castle.hp).toBe(5000); // area repair of buildings: see repair.test.ts
  });

  it('the War Drum makes the team spawn 15% faster', () => {
    const run = (drum: boolean) => {
      const sim = newSim();
      const me = sim.state.players[0];
      me.gold = 5000;
      sim.step([{ player: 0, cmd: { c: 'build', building: 'iv_militia_hall', tx: 14, ty: 4 } }]);
      for (let i = 0; i < 400 && sim.get(me.builderId)!.orders!.length; i++) sim.step();
      const hall = sim.state.entities.find((e) => e.kind === 'building')!;
      hall.buildLeft = 1; sim.step();
      if (drum) buy(sim, 'war_drum');
      const ids = new Set<number>();
      for (let i = 0; i < 120 * TICK_RATE; i++) {
        sim.castle(0).hp = sim.castle(1).hp = 8000;
        sim.step();
        for (const e of sim.state.entities) if (e.kind === 'unit' && e.owner === 0) ids.add(e.id);
      }
      return ids.size;
    };
    const base = run(false), fast = run(true);
    expect(fast / base).toBeGreaterThan(1.1);
    expect(fast / base).toBeLessThan(1.25);
  });

  it('the Bulwark Seal armors buildings and the castle of the team', () => {
    const sim = newSim();
    const before = armorOf(sim, sim.castle(0)).value;
    sim.state.players[0].gold = 2000;
    buy(sim, 'bulwark');
    expect(armorOf(sim, sim.castle(0)).value).toBe(before + 4);
    expect(armorOf(sim, sim.castle(1)).value).toBe(before);
  });

  it('items are lost when the round ends', () => {
    const sim = newSim();
    const me = sim.state.players[0];
    me.gold = 2000;
    buy(sim, 'boots');
    sim.castle(1).hp = 0;
    for (let i = 0; i < 400 && sim.state.round === 1; i++) sim.step();
    expect(sim.state.round).toBe(2);
    expect(me.items).toEqual([]);
  });
});

describe('team-wide items', () => {
  it("don't stack: a teammate can't buy a team-wide item someone on the team carries, but personal ones are fine", async () => {
    const { Sim, ITEM_BY_ID, isTeamWideOnly, teammateCarries } = await import('../src/index');
    const sim = Sim.create({ countdownTicks: 0, bestOf: 1, seed: 1, players: [
      { userId: 'a', name: 'Ann', team: 0, faction: 'ironvow' },
      { userId: 'b', name: 'Bob', team: 0, faction: 'thornwild' },
      { userId: 'c', name: 'Cid', team: 1, faction: 'ironvow' },
    ] });
    for (const p of sim.state.players) p.gold = 5000;
    expect(isTeamWideOnly(ITEM_BY_ID.war_horn)).toBe(true);
    expect(isTeamWideOnly(ITEM_BY_ID.crossbow)).toBe(false);
    expect(isTeamWideOnly(ITEM_BY_ID.boots)).toBe(false);
    sim.step([{ player: 0, cmd: { c: 'buy', item: 'war_horn' } }, { player: 0, cmd: { c: 'buy', item: 'crossbow' } }]);
    const ev = sim.step([{ player: 1, cmd: { c: 'buy', item: 'war_horn' } }, { player: 1, cmd: { c: 'buy', item: 'crossbow' } }, { player: 2, cmd: { c: 'buy', item: 'war_horn' } }]);
    expect(sim.state.players[1].items).toEqual(['crossbow']);
    expect(sim.state.players[2].items).toEqual(['war_horn']);
    expect(teammateCarries(sim.state.players, 1, ITEM_BY_ID.war_horn)).toBe('Ann');
    void ev;
  });
});
