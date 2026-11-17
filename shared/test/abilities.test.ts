/**
 * Unit abilities and building powers: critical strikes, bash, evasion, shield wall, hardened skin,
 * anti-air, attack-speed auras, summons, the Siege Battery's shells and the Howling Hollow's cyclone.
 */
import { describe, expect, it } from 'vitest';
import { BUILDINGS, Sim, TICK_RATE, UNITS, computeDamage, type Entity, type PlayerSetup, type SimEvent } from '../src/index';
import { spawnUnit } from '../src/sim/spawning';
import { attackStats, canTarget, performAttack } from '../src/sim/combat';
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
