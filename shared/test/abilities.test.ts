/**
 * Unit abilities and building powers: critical strikes, bash, evasion, shield wall, hardened skin,
 * anti-air, attack-speed auras, summons, the Siege Battery's shells and the Howling Hollow's cyclone.
 */
import { describe, expect, it } from 'vitest';
import { BUILDINGS, Sim, TICK_RATE, UNITS, computeDamage, filterSnapshot, makeSnapshot, type Entity, type PlayerSetup, type SimEvent } from '../src/index';
import { spawnUnit } from '../src/sim/spawning';
import { armorOf, attackStats, canTarget, performAttack } from '../src/sim/combat';
import { computeAuras } from '../src/sim/auras';

const players: PlayerSetup[] = [
  { userId: 'a', name: 'A', team: 0, faction: 'ironvow' },
  { userId: 'b', name: 'B', team: 1, faction: 'thornwild' },
];
const newSim = () => Sim.create({ countdownTicks: 0, players, bestOf: 1, seed: 7 });

/** Place a finished building directly (no builder walk). */
function building(sim: Sim, player: number, type: string, tx: number, ty: number): Entity {
  const def = BUILDINGS[type];
  return sim.add({
    kind: 'building', type, owner: player, team: sim.state.players[player].team, x: tx, y: ty, tx, ty, size: def.size,
    hp: def.hp, maxHp: def.hp, value: def.cost, buildLeft: 0,
  });
}

/** A unit at a fixed spot (no building needed). */
function unit(sim: Sim, player: number, type: string, x: number, y: number): Entity {
  const castle = sim.castle(sim.state.players[player].team);
  const u = spawnUnit(sim, castle, type, 0, 1);
  u.x = x; u.y = y;
  return u;
}

/** Damage dealt by `n` consecutive attacks (target healed back to full after each). */
function hits(sim: Sim, a: Entity, t: Entity, n: number): number[] {
  const st = attackStats(a)!;
  sim.hash.rebuild(sim.state.entities.filter((e) => e.kind === 'unit' && e.hp > 0));
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    t.hp = t.maxHp;
    performAttack(sim, a, st, t, 1);
    out.push(+(t.maxHp - t.hp).toFixed(3));
  }
  return out;
}

describe('chance abilities (WC3 percentages, seeded rolls)', () => {
  // A plain melee unit and a sturdy target, patched per test (and restored afterwards).
  const meleeId = Object.values(UNITS).find((u) => u.range < 1 && !u.air && !u.crit && !u.bash && !u.splash && !u.chain && !u.multishot && !u.suicide && !u.charge && !u.poison && !u.weaken && !u.lifesteal)!.id;
  const tankId = Object.values(UNITS).find((u) => !u.air && !u.evade && !u.block && !u.thorns && !u.rangedResist && !u.magicResist && !u.deathBlast && !u.onDeath && u.hp >= 300)!.id;
  function withPatch<T>(id: string, patch: Partial<typeof UNITS[string]>, fn: () => T): T {
    const u = UNITS[id] as unknown as Record<string, unknown>;
    const old = Object.fromEntries(Object.keys(patch).map((k) => [k, u[k]]));
    Object.assign(u, patch);
    try { return fn(); } finally { for (const [k, v] of Object.entries(old)) { if (v === undefined) delete u[k]; else u[k] = v; } }
  }
  const duel = () => { const sim = newSim(); return { sim, a: unit(sim, 1, meleeId, 50, 20), t: unit(sim, 0, tankId, 50.6, 20) }; };

  it('critical strike: always at 100%, never at 0%, about the chance in between', () => {
    const { sim, a, t } = duel();
    const plain = hits(sim, a, t, 1)[0];
    withPatch(meleeId, { crit: { chance: 1, mult: 2 } }, () => expect(hits(sim, a, t, 5).every((d) => Math.abs(d - plain * 2) < 0.01)).toBe(true));
    withPatch(meleeId, { crit: { chance: 0, mult: 2 } }, () => expect(hits(sim, a, t, 5).every((d) => Math.abs(d - plain) < 0.01)).toBe(true));
    const rate = withPatch(meleeId, { crit: { chance: 0.25, mult: 2 } }, () => {
      let n = 0;
      for (let i = 0; i < 600; i++) { sim.state.tick++; if (hits(sim, a, t, 1)[0] > plain * 1.5) n++; }
      return n / 600;
    });
    expect(rate).toBeGreaterThan(0.18);
    expect(rate).toBeLessThan(0.32);
  });

  it('bash stuns and deals its extra damage; a stunned unit stands still', () => {
    const { sim, a, t } = duel();
    const plain = hits(sim, a, t, 1)[0];
    withPatch(meleeId, { bash: { chance: 1, stun: 2, dmg: 25 } }, () => {
      const d = hits(sim, a, t, 1)[0];
      expect(d).toBeGreaterThan(plain);
      expect(t.stun).toBe(2 * TICK_RATE);
    });
    sim.removeNow(a);
    const x = t.x;
    sim.step();
    expect(t.x).toBe(x);
  });

  it('evasion: the chance of an attack missing', () => {
    const { sim, a, t } = duel();
    withPatch(tankId, { evade: 1 }, () => expect(hits(sim, a, t, 5)).toEqual([0, 0, 0, 0, 0]));
    const misses = withPatch(tankId, { evade: 0.3 }, () => {
      let n = 0;
      for (let i = 0; i < 600; i++) { sim.state.tick++; if (hits(sim, a, t, 1)[0] === 0) n++; }
      return n / 600;
    });
    expect(misses).toBeGreaterThan(0.23);
    expect(misses).toBeLessThan(0.37);
  });

  it('chain lightning (storm) jumps to nearby enemies', () => {
    const { sim, a } = duel();
    const ts = [0, 1, 2].map((i) => unit(sim, 0, tankId, 50.6 + i * 0.8, 20));
    const before = ts[1].hp;
    withPatch(meleeId, { storm: { chance: 1, dmg: 50, jumps: 3 } }, () => hits(sim, a, ts[0], 1));
    expect(ts[1].hp).toBeLessThan(before);
    expect(sim.state.events.some((e) => e.t === 'chain')).toBe(true);
  });
});

describe('targeting', () => {
  it('anti-air specialists shoot flyers only', () => {
    const sim = newSim();
    const a = unit(sim, 0, 'iv_arbalester', 50, 20);
    const st = attackStats(a)!;
    expect(canTarget(sim, a, st, unit(sim, 1, 'tw_vineling', 52, 20))).toBe(false);
    expect(canTarget(sim, a, st, unit(sim, 1, 'tw_dusk_moth', 52, 21))).toBe(true);
    expect(canTarget(sim, a, st, sim.castle(1))).toBe(false);
  });
});

describe('auras', () => {
  it('the War Horn makes nearby allies attack faster', () => {
    const sim = newSim();
    building(sim, 0, 'iv_war_banner', 40, 18);
    const a = unit(sim, 0, 'iv_militia', 43, 19.5), t = unit(sim, 1, 'tw_boulder_ram', 43.9, 19.5);
    t.hp = t.maxHp = 1e6;
    // The cooldown right after each blow is the hasted one.
    let longest = 0;
    for (let i = 0; i < 4 * TICK_RATE; i++) { sim.step(); longest = Math.max(longest, a.cd ?? 0); }
    const base = Math.round(UNITS.iv_militia.cooldown * TICK_RATE);
    expect(longest).toBe(Math.round(base / (1 + BUILDINGS.iv_war_banner.aura!.value)));
    expect(longest).toBeLessThan(base);
  });
});

describe('summons', () => {
  it('Grove Keepers call treantlings that fade without paying bounty or counting as lost', () => {
    const sim = newSim();
    const sm = UNITS.tw_sylvan_sniper.summon!;
    const k = unit(sim, 1, 'tw_sylvan_sniper', 90, 4);
    const treants = () => sim.state.entities.filter((e) => e.type === sm.unit);
    for (let i = 0; i < sm.every * TICK_RATE + 2; i++) { k.x = 90; k.y = 4; sim.step(); }
    expect(treants()).toHaveLength(sm.count);
    expect(treants().every((t) => t.ttl! > 0)).toBe(true);
    const gold = sim.state.players[0].gold;
    // Keep the keeper from summoning again while the first pair fades.
    k.abilityCd = 1e6;
    for (let i = 0; i < sm.ttl * TICK_RATE + 2; i++) { k.x = 90; k.y = 4; for (const t of treants()) { t.x = 92; t.y = 4; } sim.step(); }
    expect(treants()).toHaveLength(0);
    expect(sim.state.players[1].lost ?? 0).toBe(0);
    expect(sim.state.players[0].gold - gold).toBeLessThan(20); // only income, no bounty
  });
});

describe('building powers', () => {
  it('the Siege Battery shells the nearest enemy building, anywhere on the map', () => {
    const sim = newSim();
    const battery = building(sim, 0, 'iv_siege_battery', 30, 18);
    const target = building(sim, 1, 'tw_burrow', 55, 18);
    building(sim, 1, 'tw_burrow', 85, 18); // farther away
    const p = BUILDINGS.iv_siege_battery.power!;
    const events: SimEvent[] = [];
    for (let i = 0; i < p.cooldown * TICK_RATE + 2 * TICK_RATE; i++) events.push(...sim.step());
    const shell = events.find((e) => e.t === 'shell');
    expect(shell).toMatchObject({ a: battery.id, x: 56, y: 19 });
    expect(target.hp).toBeLessThan(target.maxHp - p.dmg);
  });

  it("global powers reach across the map, local ones (beams) don't", () => {
    const sim = newSim();
    // Battery deep in the own zone, the only enemy building deep in the enemy zone (~75 tiles away).
    const battery = building(sim, 0, 'iv_siege_battery', 6, 18);
    const far = building(sim, 1, 'tw_burrow', 100, 18);
    expect(BUILDINGS.iv_siege_battery.power!.global).toBe(true);
    const events: SimEvent[] = [];
    for (let i = 0; i < (BUILDINGS.iv_siege_battery.power!.cooldown + 2) * TICK_RATE; i++) events.push(...sim.step());
    expect(events.find((e) => e.t === 'shell')).toMatchObject({ a: battery.id });
    expect(far.hp).toBeLessThan(far.maxHp);
    // Tower-like and self-centred powers keep their range.
    for (const b of Object.values(BUILDINGS)) {
      // The City of Magic's sheep hex is map-wide on request; the flyer-freezing mushroom stays local.
      // Map-wide where the map says so: the Stasis Totem freezes every enemy unit.
      // The tsunami rolls out from its building.
      if (b.power?.kind === 'wave') expect(b.power.global, b.id).toBeFalsy();
      if (b.power?.kind === 'hex') expect(!!b.power.global, b.id).toBe(b.id === 'su_city_of_magic');
      if (b.power && ['bombard', 'cyclone', 'slay', 'charm', 'chaos', 'tentacles'].includes(b.power.kind)) expect(b.power.global, b.id).toBe(true);
    }
  });

  it('the Howling Hollow drops a cyclone that hurts and slows enemies', () => {
    const sim = newSim();
    building(sim, 1, 'tw_howling_hollow', 70, 18);
    const p = BUILDINGS.tw_howling_hollow.power!;
    const foe = unit(sim, 0, 'iv_shieldbearer', 62, 19);
    foe.hp = foe.maxHp = 1e5;
    const events: SimEvent[] = [];
    for (let i = 0; i < p.cooldown * TICK_RATE + 1; i++) { foe.x = 62; foe.y = 19; events.push(...sim.step()); }
    expect(events.some((e) => e.t === 'zone')).toBe(true);
    const hp = foe.hp;
    for (let i = 0; i < 2 * TICK_RATE; i++) { foe.x = 62; foe.y = 19; sim.step(); }
    expect(foe.hp).toBeLessThan(hp);
    computeAuras(sim);
    expect(sim.mods.get(foe.id)?.speed).toBeCloseTo(1 - p.slow!);
  });
});

describe('new-faction mechanics', () => {
  const four: PlayerSetup[] = [
    { userId: 'a', name: 'A', team: 0, faction: 'cogspark' },
    { userId: 'b', name: 'B', team: 1, faction: 'shardbound' },
  ];
  const sim4 = () => Sim.create({ countdownTicks: 0, players: four, bestOf: 1, seed: 9 });

  it('Lunatic Goblins explode on their first attack: area damage to units and buildings, no bounty', () => {
    const sim = sim4();
    const lun = UNITS.cs_lunatic;
    const goblin = unit(sim, 0, 'cs_lunatic', 80, 20);
    const t1 = unit(sim, 1, 'sb_rill', 80.6, 20), t2 = unit(sim, 1, 'sb_rill', 81.2, 20.4);
    const far = unit(sim, 1, 'sb_rill', 85, 20);
    const hut = building(sim, 1, 'sb_obelisk', 81, 21);
    const gold = sim.state.players[1].gold;
    hits(sim, goblin, t1, 1);
    expect(goblin.hp).toBe(0);
    for (const t of [t1, t2]) expect(t.hp).toBeLessThan(t.maxHp);
    expect(far.hp).toBe(far.maxHp);
    expect(hut.hp).toBeLessThan(hut.maxHp);
    expect(t1.maxHp - t1.hp).toBeCloseTo(computeDamage(lun.dmg, lun.attackType, 'medium', UNITS.sb_rill.armor), 0);
    expect(sim.state.players[1].gold).toBe(gold);
  });

  it('the Energy Tower\'s shot bounces between three enemies', () => {
    const sim = sim4();
    building(sim, 0, 'cs_energy_tower', 30, 18);
    const foes = [0, 1, 2, 3].map((i) => unit(sim, 1, 'sb_rill', 34 + i * 1.2, 19));
    for (const f of foes) f.hp = f.maxHp = 1e5;
    for (let i = 0; i < 2 * TICK_RATE; i++) { foes.forEach((f, k) => { f.x = 34 + k * 1.2; f.y = 19; }); sim.step(); }
    expect(foes.filter((f) => f.hp < f.maxHp)).toHaveLength(3);
  });

  it('the Codex of Meteors burns flyers only, ground storms leave flyers alone', () => {
    const sim = sim4();
    building(sim, 1, 'sb_codex_meteors', 70, 18);
    const p = BUILDINGS.sb_codex_meteors.power!;
    const flyer = unit(sim, 0, 'cs_rotorcopter', 64, 19), ground = unit(sim, 0, 'cs_light_tank', 64, 19.5);
    for (const u of [flyer, ground]) u.hp = u.maxHp = 1e5;
    for (let i = 0; i < (p.cooldown + 2) * TICK_RATE; i++) { flyer.x = ground.x = 64; flyer.y = 19; ground.y = 19.5; sim.step(); }
    expect(flyer.hp).toBeLessThan(flyer.maxHp);
    expect(ground.hp).toBe(ground.maxHp);

    const sim2 = sim4();
    building(sim2, 1, 'sb_codex_storms', 70, 18);
    const f2 = unit(sim2, 0, 'cs_rotorcopter', 64, 19), g2 = unit(sim2, 0, 'cs_light_tank', 64, 19.5);
    for (const u of [f2, g2]) u.hp = u.maxHp = 1e5;
    for (let i = 0; i < (BUILDINGS.sb_codex_storms.power!.cooldown + 2) * TICK_RATE; i++) { f2.x = g2.x = 64; f2.y = 19; g2.y = 19.5; sim2.step(); }
    expect(g2.hp).toBeLessThan(g2.maxHp);
    expect(f2.hp).toBe(f2.maxHp);
    computeAuras(sim2);
    expect(sim2.mods.get(f2.id)?.speed ?? 1).toBe(1);
  });

  it('the Spare Part Heap mends nearby own buildings and the castle, not itself', () => {
    const sim = sim4();
    const m = BUILDINGS.cs_scrap_heap.mend!;
    const heap = building(sim, 0, 'cs_scrap_heap', 20, 18);
    const near = building(sim, 0, 'cs_gun_smith', 23, 18), far = building(sim, 0, 'cs_gun_smith', 20, 34);
    for (const b of [heap, near, far]) b.hp = 100;
    for (let i = 0; i < 2 * TICK_RATE; i++) sim.step();
    expect(near.hp).toBeCloseTo(100 + 2 * m.hps, 0);
    expect(far.hp).toBe(100);
    expect(heap.hp).toBe(100);
  });
});

describe('Duskmoon mechanics', () => {
  const ps: PlayerSetup[] = [
    { userId: 'a', name: 'A', team: 0, faction: 'duskmoon' },
    { userId: 'b', name: 'B', team: 1, faction: 'ironvow' },
  ];
  const simD = () => Sim.create({ countdownTicks: 0, players: ps, bestOf: 1, seed: 4 });

  it('multi-shot: a Ranger volley strikes three enemies in range', () => {
    const sim = simD();
    const r = unit(sim, 0, 'dm_ranger', 50, 20);
    const foes = [0, 1, 2, 3].map((i) => unit(sim, 1, 'iv_militia', 52 + i * 0.7, 20 + (i % 2) * 0.6));
    for (const f of foes) f.hp = f.maxHp = 1e5;
    hits(sim, r, foes[0], 1);
    expect(foes.filter((f) => f.hp < f.maxHp)).toHaveLength(3);
  });

  it('an Avatar of Vengeance explodes when it falls, not when smitten', () => {
    const sim = simD();
    const v = unit(sim, 0, 'dm_vengeance', 60, 20);
    const near = unit(sim, 1, 'iv_militia', 61, 20), far = unit(sim, 1, 'iv_militia', 66, 20);
    near.hp = near.maxHp = far.hp = far.maxHp = 1e5;
    v.hp = 0;
    sim.removeDead();
    expect(near.hp).toBeLessThan(near.maxHp);
    expect(far.hp).toBe(far.maxHp);
    const sim2 = simD();
    const v2 = unit(sim2, 0, 'dm_vengeance', 60, 20), n2 = unit(sim2, 1, 'iv_militia', 61, 20);
    n2.hp = n2.maxHp = 1e5;
    v2.hp = 0; v2.smitten = true;
    sim2.removeDead();
    expect(n2.hp).toBe(n2.maxHp);
  });

  it('the Obelisk of the Wild blocks a flat part of every hit on nearby allies', () => {
    const sim = simD();
    building(sim, 0, 'dm_wild_obelisk', 30, 18);
    const t = unit(sim, 0, 'dm_assassin', 32, 19), a = unit(sim, 1, 'iv_halberdier', 32.6, 19);
    delete UNITS.dm_assassin.evade;
    try {
      sim.hash.rebuild(sim.state.entities.filter((e) => e.kind === 'unit' && e.hp > 0));
      computeAuras(sim);
      const d = hits(sim, a, t, 1)[0];
      const raw = computeDamage(UNITS.iv_halberdier.dmg, 'normal', 'medium', UNITS.dm_assassin.armor);
      expect(d).toBeCloseTo(raw - BUILDINGS.dm_wild_obelisk.aura!.value, 1);
    } finally { UNITS.dm_assassin.evade = 0.167; }
  });

  it('Moonlit grace: Duskmoon units without their own evasion dodge 12.5% of blows', () => {
    expect(UNITS.dm_huntress.evade).toBe(0.125);
    expect(UNITS.dm_assassin.evade).toBeCloseTo(1 / 6, 2);
    expect(Object.values(UNITS).filter((u) => u.id.startsWith('iv_')).every((u) => !u.evade || u.evade < 0.5)).toBe(true);
  });
});

describe('Bloodtusk mechanics', () => {
  const ps: PlayerSetup[] = [
    { userId: 'a', name: 'A', team: 0, faction: 'bloodtusk' },
    { userId: 'b', name: 'B', team: 1, faction: 'thornwild' },
  ];
  const simB = () => Sim.create({ countdownTicks: 0, players: ps, bestOf: 1, seed: 6 });

  // Units picked by role, so these tests don't depend on other factions' rosters.
  const groundId = () => Object.values(UNITS).find((u) => !u.air && !u.evade && !u.immune && !u.block && u.hp >= 200 && u.range < 1.5 && !u.thorns)!.id;
  const flyerId = () => Object.values(UNITS).find((u) => u.air && !u.evade && !u.immune)!.id;
  const casterId = () => Object.values(UNITS).find((u) => u.attackType === 'magic' && !u.air && !u.chain && !u.splash && !u.poison)!.id;

  it('berserk: after a kill a troll rampages (+200% attack speed for 6 s) and takes 10% more damage', () => {
    const sim = simB();
    const t = unit(sim, 0, 'bt_berserker', 50, 20), f = unit(sim, 1, groundId(), 52.5, 20);
    const rp = UNITS.bt_berserker.rampage!;
    f.hp = 1;
    sim.hash.rebuild(sim.state.entities.filter((e) => e.kind === 'unit'));
    performAttack(sim, t, attackStats(t)!, f, 1);
    expect(t.rampageLeft).toBe(rp.duration * TICK_RATE);
    const g = unit(sim, 1, groundId(), 52.5, 20);
    g.hp = g.maxHp = 1e6;
    let longest = 0;
    for (let i = 0; i < 3 * TICK_RATE; i++) { t.x = 50; t.y = 20; g.x = 52.5; g.y = 20; sim.step(); longest = Math.max(longest, t.cd ?? 0); }
    expect(longest).toBeLessThanOrEqual(Math.round((UNITS.bt_berserker.cooldown * TICK_RATE) / (1 + rp.haste)) + 1);
  });

  it('ensnare binds a flyer to the ground so melee units can hit it', () => {
    const sim = simB();
    const trap = unit(sim, 0, 'bt_trapper', 50, 20), fly = unit(sim, 1, flyerId(), 52, 20);
    fly.hp = fly.maxHp = 1e5;
    const melee = unit(sim, 0, groundId(), 51.5, 20);
    const st = attackStats(melee)!;
    expect(canTarget(sim, melee, st, fly)).toBe(false);
    hits(sim, trap, fly, 1);
    expect(fly.netted).toBe(UNITS.bt_trapper.ensnare!.duration * TICK_RATE);
    expect(canTarget(sim, melee, st, fly)).toBe(true);
  });

  it('spell resistance: Spellbreaker Kodos take less magic damage', () => {
    const sim = simB();
    const caster = casterId();
    const k = unit(sim, 0, 'bt_spellbreaker', 50.6, 20), s = unit(sim, 1, caster, 50, 20);
    const d = hits(sim, s, k, 1)[0];
    const sb = UNITS.bt_spellbreaker;
    expect(d).toBeCloseTo(computeDamage(UNITS[caster].dmg, 'magic', sb.armorType, sb.armor) * (1 - sb.magicResist!), 1);
  });

  it('the anti-air tower deals 4.67× damage to flyers', () => {
    const sim = simB();
    const tower = building(sim, 0, 'bt_aa_tower', 30, 18);
    const fly = unit(sim, 1, flyerId(), 33, 19), walk = unit(sim, 1, groundId(), 33, 19.4);
    const st = attackStats(tower)!;
    for (const u of [fly, walk]) u.hp = u.maxHp = 1e5;
    sim.hash.rebuild(sim.state.entities.filter((e) => e.kind === 'unit'));
    performAttack(sim, tower, st, fly, 1); performAttack(sim, tower, st, walk, 1);
    const a = BUILDINGS.bt_aa_tower.attack!;
    expect(1e5 - fly.hp).toBeCloseTo(computeDamage(a.dmg * 4.67, a.attackType, UNITS[fly.type].armorType, UNITS[fly.type].armor), 1);
    expect(1e5 - walk.hp).toBeCloseTo(computeDamage(a.dmg, a.attackType, UNITS[walk.type].armorType, UNITS[walk.type].armor), 1);
  });

  it('the Stasis Totem freezes every enemy unit on the map', () => {
    const sim = simB();
    building(sim, 0, 'bt_stasis_totem', 6, 18);
    const p = BUILDINGS.bt_stasis_totem.power!;
    const near = unit(sim, 1, groundId(), 38, 19), far = unit(sim, 1, groundId(), 100, 19);
    for (const u of [near, far]) u.hp = u.maxHp = 1e5;
    let saw = false;
    for (let i = 0; i < p.cooldown * TICK_RATE + 2; i++) {
      near.x = 38; near.y = 19; far.x = 100; far.y = 19;
      for (const ev of sim.step()) if (ev.t === 'stasis') saw = true;
      if (saw) break;
    }
    expect(saw).toBe(true);
    expect(near.stun).toBeGreaterThan(0);
    expect(far.stun).toBeGreaterThan(0);
  });

  it('Tribal Blessing makes a random unit permanently stronger', () => {
    const sim = simB();
    building(sim, 0, 'bt_war_totem', 6, 18);
    const p = BUILDINGS.bt_war_totem.power!;
    const u = unit(sim, 0, groundId(), 20, 19);
    const hp = u.maxHp;
    for (let i = 0; i < (p.cooldown + 1) * TICK_RATE && !u.blessed; i++) { u.x = 20; u.y = 19; sim.step(); }
    expect(u.blessed).toMatchObject({ dmg: 20, armor: 3, haste: 0.2 });
    expect(u.maxHp).toBe(hp + 200);
  });
});

describe('Sunspire mechanics', () => {
  const ps: PlayerSetup[] = [
    { userId: 'a', name: 'A', team: 0, faction: 'sunspire' },
    { userId: 'b', name: 'B', team: 1, faction: 'ironvow' },
  ];
  const simS = () => Sim.create({ countdownTicks: 0, players: ps, bestOf: 1, seed: 8 });
  const runPower = (sim: Sim, id: string, foes: Entity[], at: Array<[number, number]>) => {
    const events: SimEvent[] = [];
    for (let i = 0; i < (BUILDINGS[id].power!.cooldown + 1) * TICK_RATE; i++) { foes.forEach((f, k) => { f.x = at[k][0]; f.y = at[k][1]; }); events.push(...sim.step()); }
    return events;
  };

  it('the Arcane Tower strikes five enemies per volley', () => {
    const sim = simS();
    building(sim, 0, 'su_arcane_tower', 30, 18);
    const at: Array<[number, number]> = [0, 1, 2, 3, 4, 5].map((i) => [33 + (i % 3) * 0.8, 18.5 + Math.floor(i / 3) * 0.9]);
    const foes = at.map(([x, y]) => unit(sim, 1, 'iv_militia', x, y));
    for (const f of foes) f.hp = f.maxHp = 1e5;
    for (let i = 0; i < 3; i++) { foes.forEach((f, k) => { f.x = at[k][0]; f.y = at[k][1]; }); sim.step(); }
    expect(foes.filter((f) => f.hp < f.maxHp)).toHaveLength(5);
  });

  it('the City of Magic hexes the toughest enemy in range', () => {
    const sim = simS();
    building(sim, 0, 'su_city_of_magic', 30, 18);
    const small = unit(sim, 1, 'iv_militia', 36, 19), big = unit(sim, 1, 'iv_knight', 38, 19);
    const ev = runPower(sim, 'su_city_of_magic', [small, big], [[36, 19], [38, 19]]);
    expect(ev.find((e) => e.t === 'hex')).toMatchObject({ id: big.id });
    expect(big.stun).toBeGreaterThan(0);
    expect(small.stun ?? 0).toBe(0);
  });

  it('the Obelisk of Light beams the nearest enemy for magic damage', () => {
    const sim = simS();
    building(sim, 0, 'su_light_obelisk', 30, 18);
    const near = unit(sim, 1, 'iv_knight', 34, 19), far = unit(sim, 1, 'iv_knight', 39, 19);
    for (const u of [near, far]) u.hp = u.maxHp = 1e5;
    runPower(sim, 'su_light_obelisk', [near, far], [[34, 19], [39, 19]]);
    expect(near.hp).toBeLessThan(near.maxHp);
    expect(far.hp).toBe(far.maxHp);
  });

  it('the Golden Shrine raises every 5th fallen ally nearby', () => {
    const sim = simS();
    building(sim, 0, 'su_golden_shrine', 20, 18);
    const count = () => sim.state.entities.filter((e) => e.type === 'su_archer').length;
    const raised: number[] = [];
    for (let i = 0; i < 10; i++) {
      const a = unit(sim, 0, 'su_archer', 24, 19);
      a.hp = 0;
      sim.removeDead();
      raised.push(count());
    }
    expect(raised).toEqual([0, 0, 0, 0, 1, 1, 1, 1, 1, 2]);
  });
});

describe('Frostmark mechanics', () => {
  const ps: PlayerSetup[] = [
    { userId: 'a', name: 'A', team: 0, faction: 'frostmark' },
    { userId: 'b', name: 'B', team: 1, faction: 'thornwild' },
  ];
  const simF = () => Sim.create({ countdownTicks: 0, players: ps, bestOf: 1, seed: 10 });

  it('a frost bolt freezes the building it hits: no training while frozen', () => {
    const sim = simF();
    building(sim, 0, 'fm_frost_launcher', 30, 18);
    const target = building(sim, 1, 'tw_burrow', 50, 18);
    const p = BUILDINGS.fm_frost_launcher.power!;
    for (let i = 0; i < (p.cooldown + 2) * TICK_RATE && !target.stun; i++) sim.step();
    expect(target.stun).toBeGreaterThan(0);
    const timer = target.spawnTimer;
    sim.step(); sim.step();
    expect(target.spawnTimer).toBe(timer);
  });

  it('the Chilling Mushroom freezes flyers only', () => {
    const sim = simF();
    building(sim, 0, 'fm_frost_mushroom', 30, 18);
    const moth = unit(sim, 1, 'tw_dusk_moth', 35, 19), stag = unit(sim, 1, 'tw_boulder_ram', 34, 19);
    for (const u of [moth, stag]) u.hp = u.maxHp = 1e5;
    for (let i = 0; i < (BUILDINGS.fm_frost_mushroom.power!.cooldown + 1) * TICK_RATE && !moth.stun; i++) { moth.x = 35; moth.y = 19; stag.x = 34; stag.y = 19; sim.step(); }
    expect(moth.stun).toBeGreaterThan(0);
    expect(moth.hp).toBeLessThan(moth.maxHp);
    expect(stag.stun ?? 0).toBe(0);
  });

  it("an Ancient Wendigo's howl makes nearby enemies deal less damage", () => {
    const sim = simF();
    unit(sim, 0, 'fm_ancient_wendigo', 50, 20);
    const foe = unit(sim, 1, 'tw_vineling', 51, 20);
    sim.hash.rebuild(sim.state.entities.filter((e) => e.kind === 'unit'));
    computeAuras(sim);
    expect(sim.mods.get(foe.id)?.dmgMalus).toBeCloseTo(UNITS.fm_ancient_wendigo.aura!.value);
  });
});

describe('Gravewake mechanics', () => {
  const ps: PlayerSetup[] = [
    { userId: 'a', name: 'A', team: 0, faction: 'gravewake' },
    { userId: 'b', name: 'B', team: 1, faction: 'thornwild' },
  ];
  const simG = () => Sim.create({ countdownTicks: 0, players: ps, bestOf: 1, seed: 12 });

  it('the City of Decay rots every enemy unit on the battlefield, regeneration notwithstanding', () => {
    const sim = simG();
    building(sim, 0, 'gw_city_of_decay', 10, 30);
    const far = unit(sim, 1, 'tw_boulder_ram', 100, 5);
    far.hp = far.maxHp = 1e5;
    for (let i = 0; i < 2 * TICK_RATE; i++) { far.x = 100; far.y = 5; sim.step(); }
    const net = -BUILDINGS.gw_city_of_decay.aura!.value - (UNITS.tw_boulder_ram.regen ?? 0);
    expect(far.maxHp - far.hp).toBeCloseTo(2 * net, 0);
  });

  it('the Death Pit slays the nearest weak enemy but not champions', () => {
    const sim = simG();
    building(sim, 0, 'gw_death_pit', 30, 18);
    const champ = unit(sim, 1, 'tw_ancient_treant', 34, 19), weak = unit(sim, 1, 'tw_vineling', 38, 19);
    let slain = false;
    for (let i = 0; i < (BUILDINGS.gw_death_pit.power!.cooldown + 1) * TICK_RATE && !slain; i++) {
      champ.x = 34; champ.y = 19; weak.x = 38; weak.y = 19;
      slain = sim.step().some((e) => e.t === 'slay');
    }
    expect(slain).toBe(true);
    expect(weak.hp).toBe(0);
    expect(champ.hp).toBeGreaterThan(0);
  });
});

describe('Doomforge mechanics', () => {
  const ps: PlayerSetup[] = [
    { userId: 'a', name: 'A', team: 0, faction: 'doomforge' },
    { userId: 'b', name: 'B', team: 1, faction: 'thornwild' },
  ];
  const simD = () => Sim.create({ countdownTicks: 0, players: ps, bestOf: 1, seed: 14 });

  const typesOf = (pred: (u: (typeof UNITS)[string]) => boolean, n: number) => Object.values(UNITS).filter((u) => pred(u) && !u.air && !u.immune && !u.onDeath && !u.summon).slice(0, n).map((u) => u.id);

  it('the Eraser kills every enemy unit of one random type, anywhere on the map (immune ones are spared)', () => {
    const sim = simD();
    building(sim, 0, 'df_eraser', 6, 18);
    const [a, b] = typesOf((u) => u.hp >= 200, 2);
    const as = [0, 1, 2].map((i) => unit(sim, 1, a, 60 + i, 19));
    const bs = [0, 1].map((i) => unit(sim, 1, b, 90 + i, 21));
    const imm = unit(sim, 1, Object.values(UNITS).find((u) => u.immune && !u.air)!.id, 80, 23);
    const all = [...as, ...bs, imm];
    for (const u of all) u.hp = u.maxHp = 1e5;
    const at = all.map((u) => [u.x, u.y]);
    let erased = false;
    for (let i = 0; i < (BUILDINGS.df_eraser.power!.cooldown + 1) * TICK_RATE && !erased; i++) {
      all.forEach((u, k) => { if (u.hp > 0) { u.x = at[k][0]; u.y = at[k][1]; } });
      erased = sim.step().some((e) => e.t === 'slay');
    }
    const deadA = as.every((u) => u.hp === 0), deadB = bs.every((u) => u.hp === 0);
    expect(deadA !== deadB).toBe(true); // exactly one whole type
    expect(imm.hp).toBeGreaterThan(0);
  });

  it('a present of chaos picks one of eight fates for a random enemy (seeded)', () => {
    const sim = simD();
    const ruin = building(sim, 0, 'df_magic_ruin', 6, 18);
    const [a] = typesOf((u) => u.hp >= 200, 1);
    const seen = new Set<string>();
    for (let n = 0; n < 80; n++) {
      const foe = unit(sim, 1, a, 60, 19);
      foe.hp = foe.maxHp = 2000;
      ruin.abilityCd = 1;
      const ev = sim.step();
      const mutated = sim.state.entities.some((e) => e.type === 'df_mutation' && e.team === 0);
      seen.add(foe.hp === 0 ? (mutated ? 'mutation' : 'death') : foe.sheep ? 'hex' : foe.stun ? 'stun' : foe.maxHp > 2000 ? 'blessed' : foe.hp < 2000 ? 'hurt' : 'nothing');
      expect(ev.length).toBeGreaterThanOrEqual(0);
      for (const e of [...sim.state.entities]) if (e.kind === 'unit') sim.removeNow(e);
    }
    expect(seen.size).toBeGreaterThanOrEqual(6);
    expect(seen.has('mutation')).toBe(true);
  });
});

describe('Tidecall mechanics', () => {
  const ps: PlayerSetup[] = [
    { userId: 'a', name: 'A', team: 0, faction: 'tidecall' },
    { userId: 'b', name: 'B', team: 1, faction: 'ironvow' },
  ];
  const simT = () => Sim.create({ countdownTicks: 0, players: ps, bestOf: 1, seed: 16 });

  it('the Oracle of Sirens takes control of the nearest enemy that is not immune: it changes sides for good', () => {
    const sim = simT();
    const oracle = building(sim, 0, 'tc_oracle', 30, 18);
    oracle.hp = oracle.maxHp = 1e6; // the hydra would knock it down before its first cast
    // The nearer one is an immune legendary (the Ancient Hydra), so the farther one is taken.
    const knight = unit(sim, 1, 'tc_hydra', 33, 19), mil = unit(sim, 1, Object.values(UNITS).find((u) => !u.immune && !u.air && u.id.startsWith('iv_'))!.id, 36, 19);
    let charmed = false;
    for (let i = 0; i < (BUILDINGS.tc_oracle.power!.cooldown + 1) * TICK_RATE && !charmed; i++) {
      knight.x = 33; knight.y = 19; mil.x = 36; mil.y = 19;
      charmed = sim.step().some((e) => e.t === 'charm');
    }
    expect(charmed).toBe(true);
    expect(mil.team).toBe(0);
    expect(mil.owner).toBe(0);
    expect(knight.team).toBe(1);
  });

  it('the Tidal Guardian’s tsunami hits every ground enemy along its path', () => {
    const sim = simT();
    building(sim, 0, 'tc_tidal_guardian', 30, 18);
    const p = BUILDINGS.tc_tidal_guardian.power!;
    const line = [34, 38, 44].map((x) => unit(sim, 1, 'iv_militia', x, 19));
    const off = unit(sim, 1, 'iv_militia', 38, 26);
    for (const u of [...line, off]) u.hp = u.maxHp = 1e5;
    let waved = false;
    for (let i = 0; i < (p.cooldown + 1) * TICK_RATE && !waved; i++) {
      line.forEach((u, k) => { u.x = [34, 38, 44][k]; u.y = 19; }); off.x = 38; off.y = 26;
      waved = sim.step().some((e) => e.t === 'wave');
    }
    expect(waved).toBe(true);
    expect(line.every((u) => u.hp < u.maxHp)).toBe(true);
    expect(off.hp).toBe(off.maxHp);
  });
});

describe('Blightroot mechanics', () => {
  const ps: PlayerSetup[] = [
    { userId: 'a', name: 'A', team: 0, faction: 'blightroot' },
    { userId: 'b', name: 'B', team: 1, faction: 'ironvow' },
  ];
  const simB = () => Sim.create({ countdownTicks: 0, players: ps, bestOf: 1, seed: 18 });

  it('a corrupted blow weakens the target: it deals less damage for a while', () => {
    const sim = simB();
    const ent = unit(sim, 0, 'br_ent', 50, 20), mil = unit(sim, 1, 'iv_militia', 50.6, 20);
    const dummy = unit(sim, 0, 'br_ent', 51.2, 20);
    dummy.hp = dummy.maxHp = 1e5;
    const before = hits(sim, mil, dummy, 1)[0];
    hits(sim, ent, mil, 1);
    expect(mil.weaken?.mult).toBeCloseTo(UNITS.br_ent.weaken!.mult);
    const after = hits(sim, mil, dummy, 1)[0];
    expect(after).toBeCloseTo(before * (1 - UNITS.br_ent.weaken!.mult), 1);
  });

  it('the Forgotten One raises a ring of fading tentacles around the nearest enemy', () => {
    const sim = simB();
    building(sim, 0, 'br_forgotten_one', 30, 18);
    const p = BUILDINGS.br_forgotten_one.power!;
    const foe = unit(sim, 1, 'iv_knight', 36, 19);
    foe.hp = foe.maxHp = 1e5;
    for (let i = 0; i < (p.cooldown + 1) * TICK_RATE; i++) { foe.x = 36; foe.y = 19; sim.step(); }
    const tent = sim.state.entities.filter((e) => e.type === 'br_tentacle');
    expect(tent).toHaveLength(p.count!);
    expect(tent.every((t) => t.ttl! > 0 && Math.hypot(t.x - 36, t.y - 19) < p.radius + 0.6)).toBe(true);
  });

  it('the Eye of Corruption strips armour from every enemy on the battlefield', () => {
    const sim = simB();
    building(sim, 0, 'br_eye', 10, 30);
    const far = unit(sim, 1, 'iv_knight', 100, 5);
    sim.hash.rebuild(sim.state.entities.filter((e) => e.kind === 'unit'));
    computeAuras(sim);
    // Stacks with the knight's own armour aura instead of being overwritten by it.
    expect(sim.mods.get(far.id)?.armorMalus).toBe(BUILDINGS.br_eye.aura!.value);
    expect(armorOf(sim, far).value).toBe(UNITS.iv_knight.armor + UNITS.iv_knight.aura!.value + BUILDINGS.br_eye.aura!.value);
  });
});

describe('stealth (Duskmoon assassins)', () => {
  it('stays hidden past the front line, kills a caster from the shadows, then vanishes again', () => {
    const sim = newSim();
    const assassin = unit(sim, 0, 'dm_assassin', 62, 31);
    // Front-line brute right in front of it, a caster further back.
    const brute = unit(sim, 1, 'iv_militia', 63.2, 31);
    const caster = unit(sim, 1, 'dm_druid', 67, 31);
    for (const u of [brute, caster, assassin]) u.hp = u.maxHp = 5000;
    const tower = building(sim, 1, 'iv_bastion_tower', 64, 33);
    let revealedAt = -1;
    for (let i = 0; i < 8 * TICK_RATE; i++) {
      brute.x = 63.2; brute.y = 31; caster.x = 67; caster.y = 31;
      sim.step();
      if (i === 0) {
        expect(assassin.hidden).toBe(true);
      }
      if (assassin.hidden) {
        // Nobody can pick it while it's hidden, and it never stabs the brute.
        expect(brute.targetId).not.toBe(assassin.id);
        expect(tower.targetId).not.toBe(assassin.id);
      }
      if (!assassin.hidden && revealedAt < 0) revealedAt = i;
    }
    expect(revealedAt).toBeGreaterThan(0);
    expect(caster.hp).toBeLessThan(5000);
    expect(brute.hp).toBe(5000);
    // Revealed: the enemy sees it in the snapshot; hidden again after its reveal time without blows.
    caster.hp = 0;
    sim.step();
    for (let i = 0; i < (UNITS.dm_assassin.stealth!.reveal + 1) * TICK_RATE && !assassin.hidden; i++) { brute.x = 63.2; brute.y = 31; assassin.x = 62; sim.step(); }
    expect(assassin.hidden).toBe(true);
    const snap = filterSnapshot(makeSnapshot(sim, []), 1);
    expect(snap.ents.some((e) => e[0] === assassin.id)).toBe(false);
  });
});

describe('mines (Cogspark Mine Layer)', () => {
  it('buries hidden mines that blow up under enemy ground units', () => {
    const sim = newSim();
    const layer = unit(sim, 0, 'cs_mine_layer', 62, 31);
    layer.hp = layer.maxHp = 1e5;
    const md = UNITS.cs_mine_layer.mines!;
    for (let i = 0; i < md.every * TICK_RATE + 1; i++) { layer.x = 62; layer.y = 31; sim.step(); }
    expect(sim.state.mines?.length).toBe(1);
    // Own team sees it, the enemy doesn't.
    expect(filterSnapshot(makeSnapshot(sim, []), 0).mines?.length).toBe(1);
    expect(filterSnapshot(makeSnapshot(sim, []), 1).mines?.length ?? 0).toBe(0);
    // Two enemies walk onto it: both take the blast, the mine is gone.
    const a = unit(sim, 1, 'iv_militia', 62.3, 31), b = unit(sim, 1, 'iv_militia', 63.2, 31);
    for (const u of [a, b]) u.hp = u.maxHp = 1000;
    layer.x = 70; // out of the way
    const events: SimEvent[] = [];
    events.push(...sim.step());
    expect(events.some((e) => e.t === 'mine')).toBe(true);
    expect(a.hp).toBeLessThan(1000);
    expect(b.hp).toBeLessThan(1000);
    expect(sim.state.mines?.length).toBe(0);
  });

  it('keeps at most `max` mines per layer', () => {
    const sim = newSim();
    const layer = unit(sim, 0, 'cs_mine_layer', 62, 31);
    layer.hp = layer.maxHp = 1e5;
    const md = UNITS.cs_mine_layer.mines!;
    for (let i = 0; i < (md.max + 2) * md.every * TICK_RATE + 1; i++) { layer.x = 62 + (i % 40) / 20; layer.y = 31; sim.step(); }
    expect(sim.state.mines?.length).toBe(md.max);
  });
});

describe('Sunspire map-wide specials', () => {
  it('the City of Magic turns the toughest enemy anywhere into a sheep', () => {
    const sim = newSim();
    building(sim, 0, 'su_city_of_magic', 6, 30);
    const foe = unit(sim, 1, 'iv_militia', 100, 30);
    const big = unit(sim, 1, 'iv_shieldbearer', 101, 31);
    for (let i = 0; i < (BUILDINGS.su_city_of_magic.power!.cooldown + 1) * TICK_RATE && !big.sheep; i++) { foe.x = 100; big.x = 101; big.y = 31; sim.step(); }
    expect(big.sheep).toBeGreaterThan(0);
    expect(foe.sheep).toBeUndefined();
    const row = makeSnapshot(sim, []).ents.find((e) => e[0] === big.id)!;
    expect(row[11] & 8).toBe(8);
  });

  it('the Golden Shrine raises fallen units anywhere on the map', () => {
    const sim = newSim();
    building(sim, 0, 'su_golden_shrine', 6, 30);
    let revived = 0;
    for (let k = 0; k < 5; k++) {
      const u = unit(sim, 0, 'iv_militia', 100, 20 + k);
      u.hp = 0;
      revived += sim.step().filter((e) => e.t === 'revive').length;
    }
    expect(revived).toBe(1);
  });
});

describe('multi-target reach', () => {
  it("chain lightning only jumps to enemies within the caster's reach, not along a line of victims", () => {
    const sim = newSim();
    const caster = Object.values(UNITS).find((u) => (u.chain ?? 0) >= 3 && u.range >= 3)!;
    const a = unit(sim, 0, caster.id, 62, 31);
    // A line of enemies stepping away from the caster, 2 tiles apart.
    const line = [0, 1, 2, 3, 4].map((k) => unit(sim, 1, 'iv_shieldbearer', 62 + caster.range + 2 * k, 31));
    for (const u of line) u.hp = u.maxHp = 1e5;
    const st = attackStats(a)!;
    performAttack(sim, a, st, line[0], 1);
    const reach = caster.range + 2;
    for (const u of line) if (sim.edgeDist(a, u) > reach) expect(u.hp, `${u.x - a.x} tiles away`).toBe(1e5);
    expect(line[0].hp).toBeLessThan(1e5);
  });
});
