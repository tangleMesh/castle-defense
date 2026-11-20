import { describe, expect, it } from 'vitest';
import { ITEMS, ITEM_BY_ID, MAX_ITEMS, Sim, TICK_RATE, UNITS, type PlayerSetup } from '../src/index';
import { armorOf } from '../src/sim/combat';
import { spawnUnit } from '../src/sim/spawning';
import { modsOf } from '../src/sim/auras';

/** The castle shop: the castleFight map's nine items (Cheese = the sapphire), under our names. */
const players: PlayerSetup[] = [
  { userId: 'a', name: 'Ann', team: 0, faction: 'ironvow' },
  { userId: 'b', name: 'Bob', team: 1, faction: 'thornwild' },
  { userId: 'c', name: 'Cid', team: 0, faction: 'shardbound' },
];
const newSim = () => Sim.create({ countdownTicks: 0, players, bestOf: 3, seed: 5 });
const buy = (sim: Sim, item: string, player = 0) => sim.step([{ player, cmd: { c: 'buy', item } }]);
const errs = (ev: ReturnType<Sim['step']>) => ev.filter((e) => e.t === 'err').map((e) => (e as { msg: string }).msg);
const anyUnit = Object.values(UNITS).find((u) => !u.air && u.hp >= 200 && !u.evade)!.id;
const later = (sim: Sim, seconds: number) => { sim.state.roundStartTick = sim.state.tick - seconds * TICK_RATE; };

describe('castle shop (map items)', () => {
  it('sells the map items with their prices', () => {
    expect(ITEMS.map((i) => [i.id, i.cost, i.lumber ?? 0])).toEqual([
      ['spark_staff', 150, 300], ['stone_scroll', 150, 0], ['mason_rune', 100, 0], ['storm_orb', 550, 0],
      ['rhythm_engine', 600, 0], ['thunder_drums', 650, 0], ['fury_shard', 600, 0], ['rage_heart', 1400, 0],
    ]);
    expect(MAX_ITEMS).toBe(6);
  });

  it('checks gold, lumber, unlock time and restock', () => {
    const sim = newSim();
    const me = sim.state.players[0];
    expect(errs(buy(sim, 'thunder_drums'))[0]).toMatch(/available after 1 min/);
    later(sim, 31);
    me.gold = 0;
    expect(errs(buy(sim, 'thunder_drums'))).toEqual(['Not enough gold']);
    me.gold = 5000; me.lumber = 0;
    expect(errs(buy(sim, 'spark_staff'))).toEqual(['Not enough lumber']);
    me.lumber = 1000;
    expect(errs(buy(sim, 'storm_orb'))[0]).toMatch(/available after 15 min/);
    expect(errs(buy(sim, 'spark_staff'))).toEqual([]);
    expect(me.items).toEqual(['spark_staff']);
    expect(me.lumber).toBe(700);
    expect(errs(buy(sim, 'mason_rune'))).toEqual([]);
    expect(errs(buy(sim, 'mason_rune'))[0]).toMatch(/restocks in/);
  });

  it('team-wide items do not stack within a team, personal ones do', () => {
    const sim = newSim();
    later(sim, 60);
    for (const p of sim.state.players) p.gold = 5000;
    buy(sim, 'thunder_drums', 0);
    expect(errs(buy(sim, 'thunder_drums', 2))[0]).toMatch(/already carries/);
    expect(errs(buy(sim, 'thunder_drums', 1))).toEqual([]); // the enemy team
    buy(sim, 'mason_rune', 0);
    expect(errs(buy(sim, 'mason_rune', 2))).toEqual([]);
  });

  it('team auras reach every unit of the team: drums +33% damage, the engine +15% speed and +30% attack speed', () => {
    const sim = newSim();
    later(sim, 60);
    sim.state.players[0].gold = 5000;
    const ours = spawnUnit(sim, sim.castle(0), anyUnit, 0, 1);
    const theirs = spawnUnit(sim, sim.castle(1), anyUnit, 0, 1);
    buy(sim, 'thunder_drums'); buy(sim, 'rhythm_engine');
    sim.step();
    const m = modsOf(sim, ours.id);
    expect(m.dmg).toBeCloseTo(1.33);
    expect(m.speed).toBeCloseTo(1.15);
    expect(m.haste).toBeCloseTo(1.3);
    expect(modsOf(sim, theirs.id).dmg).toBe(1);
  });

  it('Fury Shard and Rage Heart: double / quadruple team damage for 30 s, used at once', () => {
    const sim = newSim();
    const me = sim.state.players[0];
    me.gold = 5000;
    expect(errs(buy(sim, 'fury_shard'))[0]).toMatch(/available after 5 min/);
    later(sim, 601);
    const u = spawnUnit(sim, sim.castle(0), anyUnit, 0, 1);
    buy(sim, 'rage_heart');
    expect(me.items).toEqual([]);
    sim.step();
    expect(modsOf(sim, u.id).dmg).toBeCloseTo(4);
    for (let i = 0; i < 30 * TICK_RATE; i++) sim.step();
    expect(modsOf(sim, u.id).dmg).toBe(1);
  });

  it('Stoneskin Scroll heals and armours allies near the builder for 30 s', () => {
    const sim = newSim();
    later(sim, 60);
    const b = sim.get(sim.state.players[0].builderId)!;
    const u = spawnUnit(sim, sim.castle(0), anyUnit, 0, 1);
    u.x = b.x + 2; u.y = b.y;
    u.hp = 10;
    const before = armorOf(sim, u).value;
    buy(sim, 'stone_scroll');
    expect(u.hp).toBe(Math.min(u.maxHp, 410));
    expect(armorOf(sim, u).value).toBe(before + 8);
    for (let i = 0; i < 30 * TICK_RATE + 1; i++) sim.step();
    expect(armorOf(sim, u).value).toBe(before);
  });

  it('Spark Staff makes the builder shoot nearby enemies; the Storm Orb casts a chain lightning', () => {
    const sim = newSim();
    const me = sim.state.players[0];
    me.lumber = 1000; me.gold = 5000;
    later(sim, 901);
    buy(sim, 'spark_staff'); buy(sim, 'storm_orb');
    expect(me.items).toEqual(['spark_staff', 'storm_orb']);
    const b = sim.get(me.builderId)!;
    const foes = [0, 1, 2].map((k) => { const f = spawnUnit(sim, sim.castle(1), anyUnit, 0, 1); f.x = b.x + 3 + k * 0.7; f.y = b.y; f.hp = f.maxHp = 5000; return f; });
    const events = [];
    for (let i = 0; i < TICK_RATE * 2; i++) { for (const f of foes) { f.x = f.x; } events.push(...sim.step()); }
    expect(events.some((e) => e.t === 'chain')).toBe(true);
    expect(foes[0].hp).toBeLessThan(5000 - 900);
    expect(foes[1].hp).toBeLessThan(5000);
    expect(ITEM_BY_ID.storm_orb.builderLightning!.every).toBe(60);
  });
});
