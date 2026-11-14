import { describe, expect, it } from 'vitest';
import { ITEMS, ITEM_BY_ID, MAX_ITEMS, MAP, Sim, computeVision, filterSnapshot, makeSnapshot, rectCenter, tileVisible, type PlayerSetup, type SimEvent } from '../src/index';
import { spawnUnit } from '../src/sim/spawning';
import { modsOf } from '../src/sim/auras';

const players: PlayerSetup[] = [
  { userId: 'a', name: 'A', team: 0, faction: 'ironvow' },
  { userId: 'b', name: 'B', team: 1, faction: 'thornwild' },
];
const newSim = () => Sim.create({ players, bestOf: 3, seed: 5 });
const buy = (sim: Sim, item: string, player = 0) => sim.step([{ player, cmd: { c: 'buy', item } }]);

describe('builder items', () => {
  it('are expensive late-game purchases', () => {
    for (const i of ITEMS) expect(i.cost, i.id).toBeGreaterThanOrEqual(120);
  });

  it('buying costs gold, refuses duplicates, a full bag and empty purses', () => {
    const sim = newSim();
    const me = sim.state.players[0];
    const errs = (ev: SimEvent[]) => ev.filter((e) => e.t === 'err').map((e) => (e as { msg: string }).msg);
    expect(errs(buy(sim, 'war_horn'))).toEqual(['Not enough gold']);
    me.gold = 2000;
    const ev = buy(sim, 'war_horn');
    expect(ev.some((e) => e.t === 'item' && e.item === 'war_horn' && e.use === 0)).toBe(true);
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

  it("the Mason's Hammer repairs the castle", () => {
    const sim = newSim();
    const me = sim.state.players[0];
    me.gold = 2000;
    buy(sim, 'hammer');
    const castle = sim.castle(0);
    castle.hp = 5000;
    for (let i = 0; i < 20; i++) sim.step();
    expect(castle.hp).toBeGreaterThan(5000 + 20);
  });

  it('the Signal Flare restores the spent rescue strike once', () => {
    const sim = newSim();
    const me = sim.state.players[0];
    me.gold = 2000;
    buy(sim, 'flare');
    const c = rectCenter(MAP.castles[0]);
    const use = () => sim.step([{ player: 0, cmd: { c: 'use', item: 'flare' } }]);
    expect(use().some((e) => e.t === 'err')).toBe(true); // strike still ready
    sim.step([{ player: 0, cmd: { c: 'rescue', x: c.x + 3, y: c.y } }]);
    expect(me.rescueUsed).toBe(true);
    use();
    expect(me.rescueUsed).toBe(false);
    expect(me.items).toEqual([]);
  });

  it('the spyglass doubles the builder sight; enemies see it in the snapshot', () => {
    const sim = newSim();
    const me = sim.state.players[0];
    const b = sim.get(me.builderId)!;
    b.x = 40.5; b.y = 14.5;
    const foe = spawnUnit(sim, sim.castle(1), 'tw_vineling', 1, 1);
    foe.x = 50; foe.y = 14.5;
    sim.step();
    const seen = () => filterSnapshot(makeSnapshot(sim, []), 0).ents.some((e) => e[0] === foe.id);
    foe.x = 50; b.x = 40.5; b.y = 14.5;
    expect(seen()).toBe(false);
    me.gold = 2000;
    buy(sim, 'spyglass');
    foe.x = 50; b.x = 40.5; b.y = 14.5;
    expect(seen()).toBe(true);
    expect(tileVisible(computeVision(0, [{ x: 40.5, y: 14.5, r: 12 }]), 51.5, 14.5)).toBe(true);
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
