import { describe, expect, it } from 'vitest';
import {
  BASE_INCOME, BOUNTY_MULT, MAX_INCOME_BONUS, BUILDINGS, CASTLE_HP, FACTIONS, INCOME_INTERVAL_TICKS, INCOME_PCT, MAP, ROCK_GRID,
  ROUND_COUNTDOWN_TICKS, ROUND_END_TICKS, SAPPHIRE_GOLD, START_GOLD, START_SAPPHIRES, Sim, UNITS, computeDamage, computeFlowField, buildBlockedGrid, isFullyConnected,
  incomeFor, makeSnapshot, rectCenter, type PlayerSetup, type SimEvent, type Team,
} from '../src/index';
import { spawnUnit } from '../src/sim/spawning';
import { dealDamage } from '../src/sim/combat';
import { startRound } from '../src/sim/rounds';

const players = (n = 1): PlayerSetup[] => {
  const out: PlayerSetup[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ userId: `a${i}`, name: `A${i}`, team: 0, faction: 'ironvow' });
    out.push({ userId: `b${i}`, name: `B${i}`, team: 1, faction: 'thornwild' });
  }
  return out;
};

const newSim = (bestOf = 3, n = 1) => Sim.create({ countdownTicks: 0, players: players(n), bestOf, seed: 1234 });

/** Place a completed building directly, bypassing the builder walk. */
function placeNow(sim: Sim, player: number, building: string, tx: number, ty: number, complete = true) {
  const p = sim.state.players[player];
  sim.state.players[player].gold += 10000;
  sim.state.players[player].lumber = (sim.state.players[player].lumber ?? 0) + 10000;
  sim.step([{ player, cmd: { c: 'build', building, tx, ty } }]);
  for (let i = 0; i < 400 && sim.get(p.builderId)!.orders!.length; i++) sim.step();
  const b = sim.state.entities.find((e) => e.kind === 'building' && e.tx === tx && e.ty === ty)!;
  expect(b, `building ${building} placed`).toBeTruthy();
  if (complete) { b.buildLeft = 1; b.hp = b.maxHp; sim.step(); }
  return b;
}

describe('data', () => {
  it('every reference resolves', () => {
    for (const f of Object.values(FACTIONS)) {
      for (const id of f.build) expect(BUILDINGS[id], id).toBeTruthy();
      for (const b of f.buildings) {
        if (b.spawn) expect(UNITS[b.spawn.unit], b.spawn.unit).toBeTruthy();
        for (const u of b.upgrades ?? []) expect(BUILDINGS[u]?.upgradeOnly, u).toBe(true);
      }
      // Legendaries (specials) need a sapphire unless they are upgrades of one.
      for (const b of f.buildings.filter((x) => x.special && !x.upgradeOnly)) expect(b.sapphires, b.id).toBe(1);
    }
  });
});

describe('combat table', () => {
  it('applies attack/armour multipliers and armour reduction', () => {
    // The castleFight map's table (war3mapMisc.txt).
    expect(computeDamage(100, 'pierce', 'light', 0)).toBeCloseTo(175);
    expect(computeDamage(100, 'siege', 'fortified', 0)).toBeCloseTo(160);
    expect(computeDamage(100, 'magic', 'heavy', 0)).toBeCloseTo(175);
    expect(computeDamage(100, 'pierce', 'unarmored', 0)).toBeCloseTo(105);
    expect(computeDamage(100, 'hero', 'divine', 0)).toBeCloseTo(40);
    expect(computeDamage(100, 'normal', 'medium', 5)).toBeCloseTo(175 * (1 - 0.3 / 1.3));
  });
});

describe('map & pathing', () => {
  it('the bare map is fully connected', () => {
    expect(isFullyConnected(ROCK_GRID)).toBe(true);
  });

  it('flow field routes around buildings', () => {
    const sim = newSim();
    const before = computeFlowField(buildBlockedGrid(sim.state), MAP.castles[1]);
    const i = (x: number, y: number) => y * MAP.width + x;
    const start = before[i(18, 20)];
    // wall off a column in front of tile (18,20) with buildings, leaving gaps at the edges
    for (let y = 4; y < 36; y += 2) placeNow(sim, 0, 'iv_militia_hall', 20, y);
    const after = sim.flowField(0);
    expect(after[i(18, 20)]).toBeGreaterThan(start);
    expect(after[i(18, 20)]).toBeLessThan(0xffff);
  });
});

describe('placement', () => {
  it('rejects outside build zone and on occupied tiles', () => {
    const sim = newSim();
    sim.step([{ player: 0, cmd: { c: 'build', building: 'iv_militia_hall', tx: 40, ty: 2 } }]);
    expect(sim.state.events.some((e) => e.t === 'err' && e.msg.includes('zone'))).toBe(true);
    placeNow(sim, 0, 'iv_militia_hall', 10, 6);
    sim.step([{ player: 0, cmd: { c: 'build', building: 'iv_militia_hall', tx: 11, ty: 7 } }]);
    expect(sim.state.events.some((e) => e.t === 'err' && e.msg.includes('occupied'))).toBe(true);
  });

  it('keeps a clear ring around the castle', () => {
    const sim = newSim();
    const c = MAP.castles[0];
    // Directly behind and in front of the castle, 1 tile away: refused.
    for (const [tx, ty] of [[c.x - 3, c.y], [c.x + c.w + 1, c.y + 1], [c.x, c.y - 3]]) {
      sim.state.events.length = 0;
      sim.step([{ player: 0, cmd: { c: 'build', building: 'iv_militia_hall', tx, ty } }]);
      expect(sim.state.events.some((e) => e.t === 'err' && e.msg.includes('clear around the castle'))).toBe(true);
    }
    // Exactly 2 tiles away is fine.
    placeNow(sim, 0, 'iv_militia_hall', c.x - 4, c.y);
  });

  it('starts every faction with enough gold for its cheapest building', () => {
    for (const f of Object.values(FACTIONS)) {
      const cheapest = Math.min(...Object.values(BUILDINGS).filter((b) => b.faction === f.id).map((b) => b.cost));
      expect(START_GOLD).toBeGreaterThanOrEqual(cheapest);
    }
  });

  it('rejects other factions buildings', () => {
    const sim = newSim();
    sim.step([{ player: 0, cmd: { c: 'build', building: 'tw_burrow', tx: 10, ty: 10 } }]);
    expect(sim.state.events.some((e) => e.t === 'err')).toBe(true);
  });

  it('special buildings and elite upgrades cost sapphires; one more can be bought for gold', () => {
    const sim = newSim();
    const me = sim.state.players[0];
    me.gold = 5000;
    me.lumber = 5000;
    expect(me.sapphires).toBe(START_SAPPHIRES);
    const errs = () => sim.state.events.filter((e) => e.t === 'err').map((e) => (e as { msg: string }).msg);
    sim.step([{ player: 0, cmd: { c: 'build', building: 'iv_sun_citadel', tx: 10, ty: 6 } }]);
    expect(me.sapphires).toBe(0);
    // A second special needs another sapphire.
    sim.step([{ player: 0, cmd: { c: 'build', building: 'iv_sun_citadel', tx: 16, ty: 6, queue: true } }]);
    expect(errs()[0]).toMatch(/sapphire/);
    // Cancelling the order returns the sapphire with the gold.
    sim.step([{ player: 0, cmd: { c: 'stop' } }]);
    expect(me.sapphires).toBe(1);
    expect(me.gold).toBe(5000);
    // Buying one in the castle shop.
    sim.step([{ player: 0, cmd: { c: 'buySapphire' } }]);
    expect(me.sapphires).toBe(2);
    expect(me.gold).toBe(5000 - SAPPHIRE_GOLD);
    me.gold = 100;
    sim.step([{ player: 0, cmd: { c: 'buySapphire' } }]);
    expect(errs()[0]).toMatch(/sapphire costs/);
    // Elite upgrade of a spawn building.
    me.gold = 5000;
    const st = placeNow(sim, 0, 'iv_chapel', 20, 6);
    sim.step([{ player: 0, cmd: { c: 'upgrade', id: st.id, to: 'iv_cathedral' } }]);
    st.buildLeft = 1; sim.step();
    sim.step([{ player: 0, cmd: { c: 'upgrade', id: st.id, to: 'iv_paladin_chapter' } }]);
    expect(st.type).toBe('iv_paladin_chapter');
    expect(me.sapphires).toBe(1);
    // The next round starts with exactly one sapphire again.
    startRound(sim);
    expect(sim.state.players[0].sapphires).toBe(START_SAPPHIRES);
  });

  it('rejects placements that enclose a pocket', () => {
    const sim = newSim();
    // ring of 2x2 buildings around the 2x2 hole at (17..18, 4..5)
    const ring = [[15, 2], [17, 2], [19, 2], [15, 4], [19, 4], [15, 6]];
    for (const [x, y] of ring) placeNow(sim, 0, 'iv_militia_hall', x, y);
    sim.state.players[0].gold = 10000;
    sim.step([{ player: 0, cmd: { c: 'build', building: 'iv_militia_hall', tx: 17, ty: 6 } }]);
    expect(sim.state.events.some((e) => e.t === 'err' && e.msg.includes('block'))).toBe(true);
  });

  it('charges gold on order and refunds on stop', () => {
    const sim = newSim();
    sim.step([{ player: 0, cmd: { c: 'build', building: 'iv_militia_hall', tx: 20, ty: 3 } }]);
    expect(sim.state.players[0].gold).toBe(START_GOLD - BUILDINGS.iv_militia_hall.cost);
    sim.step([{ player: 0, cmd: { c: 'stop' } }]);
    expect(sim.state.players[0].gold).toBe(START_GOLD);
  });
});

describe('economy', () => {
  it('pays base + percentage of building value at each income tick', () => {
    const sim = newSim();
    const b = placeNow(sim, 0, 'iv_militia_hall', 10, 6);
    const expected = Math.floor(BASE_INCOME + INCOME_PCT * b.value!);
    expect(incomeFor(sim, 0)).toBe(expected);
    sim.state.incomeTicks = 1;
    const gold = sim.state.players[0].gold;
    sim.step();
    expect(sim.state.players[0].gold).toBe(gold + expected);
    expect(sim.state.incomeTicks).toBe(INCOME_INTERVAL_TICKS);
  });

  it('a Treasure Box adds 25% income, every further one 15% less than the one before', () => {
    const sim = newSim();
    const hall = placeNow(sim, 0, 'iv_militia_hall', 10, 6);
    const base = BASE_INCOME + (hall.value ?? 0) * (BUILDINGS.iv_militia_hall.incomeRate ?? INCOME_PCT);
    expect(incomeFor(sim, 0)).toBe(Math.floor(base));
    const box1 = placeNow(sim, 0, 'treasure_box', 14, 6);
    const withBox = base + (box1.value ?? 0) * BUILDINGS.treasure_box.incomeRate!;
    expect(incomeFor(sim, 0)).toBe(Math.floor(withBox * 1.25));
    const box2 = placeNow(sim, 0, 'treasure_box', 18, 6);
    const withTwo = withBox + (box2.value ?? 0) * BUILDINGS.treasure_box.incomeRate!;
    expect(incomeFor(sim, 0)).toBe(Math.floor(withTwo * (1 + 0.25 + 0.2125)));
  });
});

describe('spawning & combat', () => {
  it('spawn buildings produce units that march to the enemy castle', () => {
    const sim = newSim();
    placeNow(sim, 0, 'iv_militia_hall', 20, 12);
    for (let i = 0; i < 20 * (BUILDINGS.iv_militia_hall.spawn!.interval + 3); i++) sim.step();
    const units = sim.state.entities.filter((e) => e.kind === 'unit' && e.team === 0);
    expect(units.length).toBeGreaterThanOrEqual(BUILDINGS.iv_militia_hall.spawn!.count);
    expect(Math.max(...units.map((u) => u.x))).toBeGreaterThan(25);
  });

  it('upgrades change the spawned unit', () => {
    const sim = newSim();
    const b = placeNow(sim, 0, 'iv_militia_hall', 20, 12);
    sim.state.players[0].gold = 1000;
    sim.step([{ player: 0, cmd: { c: 'upgrade', id: b.id, to: 'iv_shield_hall' } }]);
    expect(b.type).toBe('iv_shield_hall');
    expect(b.upgrading).toBe(true);
    // The upgrade, then a full training cycle.
    for (let i = 0; i < 20 * (BUILDINGS.iv_shield_hall.buildTime + BUILDINGS.iv_shield_hall.spawn!.interval + 1); i++) sim.step();
    expect(sim.state.entities.some((e) => e.type === 'iv_shieldbearer')).toBe(true);
  });

  it('a finished building starts its own training cycle from zero', () => {
    const sim = newSim();
    sim.state.players[0].gold = 1000;
    const b = placeNow(sim, 0, 'iv_militia_hall', 20, 12);
    b.buildLeft = 1;
    sim.step();
    const interval = BUILDINGS.iv_militia_hall.spawn!.interval * 20;
    expect(b.spawnTimer).toBe(interval);
    const units = () => sim.state.entities.filter((e) => e.kind === 'unit').length;
    for (let i = 0; i < interval - 1; i++) sim.step();
    expect(units()).toBe(0);
    sim.step();
    expect(units()).toBe(BUILDINGS.iv_militia_hall.spawn!.count);
  });

  it('opposing units fight and kills pay bounty', () => {
    const sim = newSim();
    const a = spawnUnit(sim, placeNow(sim, 0, 'iv_militia_hall', 25, 12), 'iv_knight', 0, 1);
    const b = spawnUnit(sim, placeNow(sim, 1, 'tw_burrow', 85, 12), 'tw_spider', 0, 1);
    a.x = 55; a.y = 16; b.x = 56; b.y = 16;
    const gold = sim.state.players[0].gold;
    const events: SimEvent[] = [];
    for (let i = 0; i < 20 * 15 && sim.get(b.id); i++) events.push(...sim.step());
    expect(sim.get(b.id)).toBeUndefined();
    expect(sim.state.players[0].kills).toBe(1);
    expect(events.some((e) => e.t === 'gold' && e.p === 0 && e.g >= 1)).toBe(true);
    expect(sim.state.players[1].lost).toBe(1);
    dealDamage(sim, sim.castle(1), 100, 'chaos', 0);
    expect(sim.state.players[0].castleDmg).toBeCloseTo(sim.castle(1).maxHp - sim.castle(1).hp);
    expect(makeSnapshot(sim, []).players[0].castleDmg).toBeGreaterThan(0);
    expect(sim.state.players[0].gold).toBeGreaterThanOrEqual(gold + Math.max(1, Math.round(UNITS.tw_spider.bounty * BOUNTY_MULT)));
  });

  it('ground melee cannot hit air units', () => {
    const sim = newSim();
    const a = spawnUnit(sim, placeNow(sim, 0, 'iv_militia_hall', 25, 12), 'iv_militia', 0, 1);
    const b = spawnUnit(sim, placeNow(sim, 1, 'tw_wyrm_roost', 85, 12), 'tw_jade_wyrm', 0, 1);
    a.x = 55; a.y = 16; b.x = 55.5; b.y = 16;
    const hp = b.hp;
    for (let i = 0; i < 10; i++) { b.x = 55.5; b.y = 16; sim.step(); }
    expect(sim.get(b.id)!.hp).toBe(hp);
  });
});

describe('rescue strike', () => {
  function setup() {
    const sim = newSim();
    const c = rectCenter(MAP.castles[0]);
    const hut = placeNow(sim, 1, 'tw_burrow', 85, 12);
    const enemy = spawnUnit(sim, hut, 'tw_spider', 0, 1);
    enemy.x = c.x + 6; enemy.y = c.y;
    const far = spawnUnit(sim, hut, 'tw_spider', 0, 1);
    far.x = c.x + 20; far.y = c.y;
    const friend = spawnUnit(sim, placeNow(sim, 0, 'iv_militia_hall', 10, 2), 'iv_militia', 0, 1);
    friend.x = c.x + 6; friend.y = c.y + 1;
    return { sim, c, enemy, far, friend };
  }

  it('is rejected outside the own build zone', () => {
    const { sim, c } = setup();
    const z = MAP.zones[0];
    sim.step([{ player: 0, cmd: { c: 'rescue', x: z.x + z.w + 1, y: c.y } }]);
    expect(sim.state.players[0].rescueUsed).toBe(false);
    expect(sim.state.events.some((e) => e.t === 'err')).toBe(true);
  });

  it('kills only enemy units in the circle, once per round', () => {
    const { sim, c, enemy, far, friend } = setup();
    sim.step([{ player: 0, cmd: { c: 'rescue', x: c.x + 6, y: c.y } }]);
    expect(sim.state.players[0].rescueUsed).toBe(true);
    // keep the targets pinned in place during the telegraph
    for (let i = 0; i < 25; i++) {
      for (const [u, x, y] of [[enemy, c.x + 6, c.y], [friend, c.x + 6, c.y + 1], [far, c.x + 20, c.y]] as const) {
        const e = sim.get(u.id); if (e) { e.x = x; e.y = y; }
      }
      sim.step();
    }
    expect(sim.get(enemy.id)).toBeUndefined();
    expect(sim.get(friend.id)).toBeDefined();
    expect(sim.get(far.id)).toBeDefined();
    // The smitten Vineling doesn't burst into Sproutlings (the far one is untouched).
    expect(sim.state.entities.filter((e) => e.type === 'tw_forest_spider')).toEqual([]);
    sim.step([{ player: 0, cmd: { c: 'rescue', x: c.x + 6, y: c.y } }]);
    expect(sim.state.events.some((e) => e.t === 'err' && e.msg.includes('already'))).toBe(true);
  });

  it('counts its kills as regular kills of the caster and pays the full bounty', () => {
    const { sim, c, enemy, far } = setup();
    const p = sim.state.players[0];
    const kills0 = p.kills;
    let paid = 0;
    sim.step([{ player: 0, cmd: { c: 'rescue', x: c.x + 6, y: c.y } }]);
    for (let i = 0; i < 25 && sim.get(enemy.id); i++) {
      const e = sim.get(enemy.id); if (e) { e.x = c.x + 6; e.y = c.y; }
      const f = sim.get(far.id); if (f) { f.x = c.x + 20; f.y = c.y; }
      sim.step();
      for (const ev of sim.state.events) if (ev.t === 'gold' && ev.p === 0) paid += ev.g;
    }
    expect(sim.get(enemy.id)).toBeUndefined();
    expect(p.kills).toBe(kills0 + 1);
    expect(paid).toBe(Math.round(UNITS.tw_spider.bounty * BOUNTY_MULT));
  });
});

describe('round start countdown', () => {
  it('freezes the round for 5 s and refuses commands, then play starts', () => {
    const sim = Sim.create({ players: [
      { userId: 'a', name: 'a', team: 0, faction: 'ironvow' },
      { userId: 'b', name: 'b', team: 1, faction: 'thornwild' },
    ], bestOf: 1, seed: 1 });
    expect(sim.state.phaseTicks).toBe(ROUND_COUNTDOWN_TICKS);
    const build = { c: 'build', building: 'iv_militia_hall', tx: 4, ty: 4 } as const;
    const gold = sim.state.players[0].gold;
    sim.step([{ player: 0, cmd: build }]);
    expect(sim.state.events.some((e) => e.t === 'err' && e.msg.includes('round starts'))).toBe(true);
    expect(sim.state.players[0].gold).toBe(gold);
    while (sim.state.phaseTicks > 0) sim.step();
    expect(sim.state.tick).toBe(sim.state.roundStartTick);
    sim.step([{ player: 0, cmd: build }]);
    expect(sim.state.players[0].gold).toBeLessThan(gold);
  });
});

describe('rounds', () => {
  it('castle death ends the round and resets the map with new builders, gold and strikes', () => {
    const sim = newSim(3);
    placeNow(sim, 0, 'iv_militia_hall', 10, 6);
    sim.state.players[0].rescueUsed = true;
    const oldBuilder = sim.state.players[0].builderId;
    sim.castle(1).hp = 0;
    sim.step();
    expect(sim.state.phase).toBe('roundOver');
    expect(sim.state.score).toEqual([1, 0]);
    for (let i = 0; i < ROUND_END_TICKS; i++) sim.step();
    expect(sim.state.phase).toBe('playing');
    expect(sim.state.round).toBe(2);
    expect(sim.state.entities.filter((e) => e.kind === 'building')).toHaveLength(0);
    expect(sim.state.players[0].builderId).not.toBe(oldBuilder);
    expect(sim.get(sim.state.players[0].builderId)?.kind).toBe('builder');
    expect(sim.state.players[0].gold).toBe(START_GOLD);
    expect(sim.state.players[0].rescueUsed).toBe(false);
    expect(sim.castle(1).hp).toBe(CASTLE_HP);
  });

  it('best-of detection ends the match at majority', () => {
    const sim = newSim(3);
    const win = (t: Team) => {
      sim.castle((1 - t) as Team).hp = 0;
      sim.step();
      for (let i = 0; i < ROUND_END_TICKS && sim.state.phase === 'roundOver'; i++) sim.step();
    };
    win(1);
    win(0);
    expect(sim.state.phase).toBe('playing');
    win(1);
    expect(sim.state.phase).toBe('matchOver');
    expect(sim.state.winner).toBe(1);
    expect(sim.state.score).toEqual([1, 2]);
  });
});

describe('determinism & persistence', () => {
  function busySim() {
    const sim = newSim(3, 2);
    const orders: Array<[number, string, number, number]> = [
      [0, 'iv_militia_hall', 20, 6], [2, 'iv_crossbow_lodge', 20, 18], [1, 'tw_burrow', 58, 8], [3, 'tw_thorn_grove', 58, 18],
    ];
    sim.step(orders.map(([player, building, tx, ty]) => ({ player, cmd: { c: 'build' as const, building, tx, ty } })));
    for (let i = 0; i < 20 * 40; i++) sim.step();
    return sim;
  }

  it('save/restore round-trip continues identically', () => {
    const a = busySim();
    const saved = JSON.parse(JSON.stringify(a.serialize()));
    const b = Sim.restore(saved);
    for (let i = 0; i < 20 * 30; i++) { a.step(); b.step(); }
    expect(a.serialize()).toEqual(b.serialize());
    expect(a.state.entities.filter((e) => e.kind === 'unit').length).toBeGreaterThan(0);
  });

  it('snapshots are JSON-serialisable and compact', () => {
    const a = busySim();
    const snap = makeSnapshot(a, []);
    const json = JSON.stringify(snap);
    expect(JSON.parse(json).ents.length).toBe(a.state.entities.length);
  });
});
