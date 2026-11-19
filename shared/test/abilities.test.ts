/**
 * Unit abilities and building powers: critical strikes, bash, evasion, shield wall, hardened skin,
 * anti-air, attack-speed auras, summons, the Siege Battery's shells and the Howling Hollow's cyclone.
 */
import { describe, expect, it } from 'vitest';
import { BUILDINGS, Sim, TICK_RATE, UNITS, computeDamage, type Entity, type PlayerSetup, type SimEvent } from '../src/index';
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

describe('every-nth abilities', () => {
  it('critical strike: every n-th attack deals the multiplier', () => {
    const sim = newSim();
    const g = UNITS.tw_gnasher;
    const a = unit(sim, 1, 'tw_gnasher', 50, 20), t = unit(sim, 0, 'iv_militia', 50.6, 20);
    const d = hits(sim, a, t, 2 * g.crit!.every);
    const plain = d[0];
    expect(d[g.crit!.every - 1]).toBeCloseTo(plain * g.crit!.mult);
    expect(d[2 * g.crit!.every - 1]).toBeCloseTo(plain * g.crit!.mult);
    expect(d.filter((x) => x > plain * 1.01)).toHaveLength(2);
  });

  it('bash: every n-th attack stuns, and a stunned unit stands still', () => {
    const sim = newSim();
    const l = UNITS.iv_lancer;
    const a = unit(sim, 0, 'iv_lancer', 50, 20), t = unit(sim, 1, 'tw_vineling', 50.6, 20);
    hits(sim, a, t, l.bash!.every - 1);
    expect(t.stun ?? 0).toBe(0);
    hits(sim, a, t, 1);
    expect(t.stun).toBe(Math.round(l.bash!.stun * TICK_RATE));
    sim.removeNow(a);
    const x = t.x;
    sim.step();
    expect(t.x).toBe(x);
  });

  it('evasion: every n-th attack against the unit misses', () => {
    const sim = newSim();
    const ev = UNITS.iv_shieldbearer.evade!;
    const a = unit(sim, 1, 'tw_vineling', 50, 20), t = unit(sim, 0, 'iv_shieldbearer', 50.6, 20);
    delete UNITS.tw_vineling.poison; // keep the damage clean
    try {
      const d = hits(sim, a, t, ev * 2);
      expect(d[ev - 1]).toBe(0);
      expect(d[2 * ev - 1]).toBe(0);
      expect(d.filter((x) => x === 0)).toHaveLength(2);
    } finally {
      UNITS.tw_vineling.poison = { dps: 2, duration: 4, slow: 0.1 };
    }
  });

  it('shield wall: ranged attacks deal less, melee doesn\'t', () => {
    const sim = newSim();
    const sb = UNITS.iv_shieldbearer;
    const archer = unit(sim, 1, 'tw_thorn_archer', 50, 20), t = unit(sim, 0, 'iv_shieldbearer', 53, 20);
    const ranged = hits(sim, archer, t, 1)[0];
    const full = computeDamage(UNITS.tw_thorn_archer.dmg, 'pierce', sb.armorType, sb.armor + sb.aura!.value * 0);
    expect(ranged).toBeCloseTo(full * (1 - sb.rangedResist!), 1);
  });

  it('hardened skin: blocks a flat amount, at least a quarter gets through', () => {
    const sim = newSim();
    const giant = UNITS.tw_boulder_ram;
    const t = unit(sim, 1, 'tw_boulder_ram', 50.6, 20);
    const knight = unit(sim, 0, 'iv_knight', 50, 20);
    knight.charge = false;
    const big = hits(sim, knight, t, 1)[0];
    expect(big).toBeCloseTo(computeDamage(UNITS.iv_knight.dmg, 'normal', giant.armorType, giant.armor) - giant.block!, 1);
    const mil = unit(sim, 0, 'iv_militia', 50, 20.6);
    const small = hits(sim, mil, t, 1)[0];
    const raw = computeDamage(UNITS.iv_militia.dmg, 'normal', giant.armorType, giant.armor);
    expect(small).toBeCloseTo(Math.max(raw * 0.25, raw - giant.block!), 1);
  });

  it('storm: every n-th attack chains lightning to nearby enemies', () => {
    const sim = newSim();
    const hawk = UNITS.iv_skyhawk;
    const a = unit(sim, 0, 'iv_skyhawk', 50, 20);
    const ts = [0, 1, 2].map((i) => unit(sim, 1, 'tw_vineling', 53 + i * 0.8, 20));
    const before = ts.slice(1).map((t) => t.hp);
    hits(sim, a, ts[0], hawk.storm!.every - 1);
    expect(ts.slice(1).map((t) => t.hp)).toEqual(before);
    hits(sim, a, ts[0], 1);
    expect(ts[1].hp).toBeLessThan(before[0]);
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
  it('the Siege Battery shells the nearest enemy building in range', () => {
    const sim = newSim();
    const battery = building(sim, 0, 'iv_siege_battery', 30, 18);
    const target = building(sim, 1, 'tw_burrow', 55, 18);
    building(sim, 1, 'tw_burrow', 85, 18); // out of range
    const p = BUILDINGS.iv_siege_battery.power!;
    const events: SimEvent[] = [];
    for (let i = 0; i < p.cooldown * TICK_RATE + 2 * TICK_RATE; i++) events.push(...sim.step());
    const shell = events.find((e) => e.t === 'shell');
    expect(shell).toMatchObject({ a: battery.id, x: 56, y: 19 });
    expect(target.hp).toBeLessThan(target.maxHp - p.dmg);
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
    } finally { UNITS.dm_assassin.evade = 6; }
  });

  it('Moonlit grace: Duskmoon units without their own evasion dodge every 8th blow', () => {
    expect(UNITS.dm_huntress.evade).toBe(8);
    expect(UNITS.dm_assassin.evade).toBe(6);
    expect(UNITS.iv_militia.evade).toBeUndefined();
  });
});

describe('Bloodtusk mechanics', () => {
  const ps: PlayerSetup[] = [
    { userId: 'a', name: 'A', team: 0, faction: 'bloodtusk' },
    { userId: 'b', name: 'B', team: 1, faction: 'thornwild' },
  ];
  const simB = () => Sim.create({ countdownTicks: 0, players: ps, bestOf: 1, seed: 6 });

  it('berserk: a badly hurt troll attacks twice as fast', () => {
    const cdOf = (hurt: boolean) => {
      const sim = simB();
      const t = unit(sim, 0, 'bt_berserker', 50, 20), f = unit(sim, 1, 'tw_boulder_ram', 52.5, 20);
      f.hp = f.maxHp = 1e6;
      if (hurt) t.hp = t.maxHp * 0.3;
      let longest = 0;
      for (let i = 0; i < 4 * TICK_RATE; i++) { t.x = 50; t.y = 20; f.x = 52.5; f.y = 20; sim.step(); longest = Math.max(longest, t.cd ?? 0); }
      return longest;
    };
    expect(cdOf(true)).toBe(Math.round(cdOf(false) / 2));
  });

  it('spell resistance: Spellbreaker Kodos take less magic damage', () => {
    const sim = simB();
    const k = unit(sim, 0, 'bt_spellbreaker', 50.6, 20), s = unit(sim, 1, 'tw_storm_shaman', 50, 20);
    const d = hits(sim, s, k, 1)[0];
    const sb = UNITS.bt_spellbreaker;
    expect(d).toBeCloseTo(computeDamage(UNITS.tw_storm_shaman.dmg, 'magic', sb.armorType, sb.armor) * (1 - sb.magicResist!), 1);
  });

  it('the Spear Tower deals triple damage to flyers', () => {
    const sim = simB();
    const tower = building(sim, 0, 'bt_aa_tower', 30, 18);
    const moth = unit(sim, 1, 'tw_dusk_moth', 33, 19), vine = unit(sim, 1, 'tw_vineling', 33, 19.4);
    const st = attackStats(tower)!;
    for (const u of [moth, vine]) u.hp = u.maxHp = 1e5;
    sim.hash.rebuild(sim.state.entities.filter((e) => e.kind === 'unit'));
    performAttack(sim, tower, st, moth, 1); performAttack(sim, tower, st, vine, 1);
    const a = BUILDINGS.bt_aa_tower.attack!;
    expect(1e5 - moth.hp).toBeCloseTo(computeDamage(a.dmg * 3, a.attackType, 'light', 0), 1);
    expect(1e5 - vine.hp).toBeCloseTo(computeDamage(a.dmg, a.attackType, 'light', 0), 1);
  });

  it('the Stasis Totem freezes every enemy unit in range', () => {
    const sim = simB();
    building(sim, 0, 'bt_stasis_totem', 30, 18);
    const p = BUILDINGS.bt_stasis_totem.power!;
    const near = unit(sim, 1, 'tw_vineling', 38, 19), far = unit(sim, 1, 'tw_vineling', 30 + p.range + 4, 19);
    for (const u of [near, far]) u.hp = u.maxHp = 1e5;
    let saw = false;
    for (let i = 0; i < p.cooldown * TICK_RATE + 2; i++) {
      near.x = 38; near.y = 19; far.x = 30 + p.range + 4; far.y = 19;
      for (const ev of sim.step()) if (ev.t === 'stasis') saw = true;
      if (saw) break;
    }
    expect(saw).toBe(true);
    expect(near.stun).toBeGreaterThan(0);
    expect(far.stun ?? 0).toBe(0);
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

  it('the Eraser wipes out the most numerous enemy kind in range, strong kinds are immune', () => {
    const sim = simD();
    building(sim, 0, 'df_eraser', 30, 18);
    const vines = [0, 1, 2].map((i) => unit(sim, 1, 'tw_vineling', 36 + i, 19));
    const archers = [0, 1].map((i) => unit(sim, 1, 'tw_thorn_archer', 36 + i, 21));
    const treant = unit(sim, 1, 'tw_ancient_treant', 38, 23);
    const all = [...vines, ...archers, treant];
    const at = all.map((u) => [u.x, u.y]);
    let erased = false;
    for (let i = 0; i < (BUILDINGS.df_eraser.power!.cooldown + 1) * TICK_RATE && !erased; i++) {
      all.forEach((u, k) => { if (u.hp > 0) { u.x = at[k][0]; u.y = at[k][1]; } });
      erased = sim.step().some((e) => e.t === 'slay');
    }
    expect(vines.every((v) => v.hp === 0)).toBe(true);
    expect(archers.every((a) => a.hp > 0)).toBe(true);
    expect(treant.hp).toBeGreaterThan(0);
  });

  it('a present of chaos cycles its fates on the nearest enemy', () => {
    const sim = simD();
    const ruin = building(sim, 0, 'df_magic_ruin', 30, 18);
    const p = BUILDINGS.df_magic_ruin.power!;
    const fates: string[] = [];
    for (let n = 0; n < 4; n++) {
      const foe = unit(sim, 1, 'tw_gnasher', 34, 19);
      foe.hp = foe.maxHp = 500;
      ruin.abilityCd = 1;
      const before = foe.hp;
      const ev = sim.step();
      fates.push(foe.hp === 0 ? 'death' : foe.stun ? 'stun' : foe.hp < before ? 'blast' : 'nothing');
      expect(ev.length).toBeGreaterThanOrEqual(0);
      sim.removeNow(foe);
    }
    expect(fates).toEqual(['blast', 'stun', 'death', 'nothing']);
    void p;
  });
});

describe('Tidecall mechanics', () => {
  const ps: PlayerSetup[] = [
    { userId: 'a', name: 'A', team: 0, faction: 'tidecall' },
    { userId: 'b', name: 'B', team: 1, faction: 'ironvow' },
  ];
  const simT = () => Sim.create({ countdownTicks: 0, players: ps, bestOf: 1, seed: 16 });

  it('the Oracle of Sirens charms the nearest weak enemy: it changes sides for good', () => {
    const sim = simT();
    building(sim, 0, 'tc_oracle', 30, 18);
    const knight = unit(sim, 1, 'iv_paladin', 33, 19), mil = unit(sim, 1, 'iv_militia', 36, 19);
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
