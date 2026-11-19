import { BOUNTY_MULT, CASTLE_ARMOR, DEFAULT_AGGRO, TICK_RATE } from '../constants';
import { BUILDINGS, UNITS, computeDamage, teamItemBonus, type ArmorType, type AttackType, type UnitDef } from '../data';
import type { Sim } from './sim';
import type { Entity } from './state';
import { modsOf } from './auras';
import { followFlow, moveToward, nearestPointOn } from './movement';
import { footprint } from './grid';
import { distToRect } from '../map/map';
import { summonUnits } from './spawning';

export interface AttackStats {
  dmg: number;
  attackType: AttackType;
  range: number;
  cooldownTicks: number;
  targetsAir: boolean;
  /** Only flyers (anti-air specialists). */
  airOnly: boolean;
  structuresOnly: boolean;
  splash: number;
  chain: number;
  aggro: number;
}

export function attackStats(e: Entity): AttackStats | null {
  if (e.kind === 'unit') {
    const u = UNITS[e.type];
    return {
      dmg: u.dmg, attackType: u.attackType, range: u.range, cooldownTicks: Math.round(u.cooldown * TICK_RATE),
      targetsAir: !!u.targetsAir || !!u.airOnly, airOnly: !!u.airOnly, structuresOnly: !!u.structuresOnly, splash: u.splash ?? 0, chain: u.chain ?? 0,
      aggro: u.aggro ?? Math.max(DEFAULT_AGGRO, u.range + 1.5),
    };
  }
  // Castles have no attack: only units, towers and the rescue strike defend them.
  if (e.kind === 'building') {
    const a = BUILDINGS[e.type].attack;
    if (!a) return null;
    return {
      dmg: a.dmg, attackType: a.attackType, range: a.range, cooldownTicks: Math.round(a.cooldown * TICK_RATE),
      targetsAir: a.targetsAir, airOnly: false, structuresOnly: false, splash: a.splash ?? 0, chain: a.chain ?? 0, aggro: a.range,
    };
  }
  return null;
}

export function armorOf(sim: Sim, e: Entity): { type: ArmorType; value: number } {
  if (e.kind === 'unit') {
    const u = UNITS[e.type];
    return { type: u.armorType, value: u.armor + modsOf(sim, e.id).armor };
  }
  // Bulwark Seal: extra armor on all structures of the carrier's team.
  if (e.kind === 'castle') return { type: 'fortified', value: CASTLE_ARMOR + teamItemBonus(sim.state.players, e.team, 'structureArmor') };
  if (e.kind === 'building') return { type: 'fortified', value: BUILDINGS[e.type].armor + teamItemBonus(sim.state.players, e.team, 'structureArmor') };
  return { type: 'light', value: 0 };
}

export function canTarget(sim: Sim, a: Entity, st: AttackStats, t: Entity | undefined): t is Entity {
  if (!t || t.hp <= 0 || t.team === a.team || t.kind === 'builder') return false;
  if (st.structuresOnly && !sim.isStructure(t)) return false;
  if (sim.isAir(t) ? !st.targetsAir : st.airOnly) return false;
  return true;
}

/** Apply damage; credits kills/bounty to the attacking player. Returns damage dealt. */
/**
 * Credit a kill: the killer's kill count and the full gold bounty (plus hunting bonuses).
 * Used by regular combat and by the rescue strike alike.
 */
export function rewardKill(sim: Sim, target: Entity, killerOwner: number) {
  const p = sim.state.players[killerOwner];
  if (!p) return;
  if (target.kind === 'unit') p.kills++;
  const bounty = target.kind === 'unit'
    // No minimum: swarms of cheap bodies must not feed the enemy more gold than an elite army.
    ? Math.round(UNITS[target.type].bounty * BOUNTY_MULT)
    : target.kind === 'building' ? Math.floor((target.value ?? 0) * 0.1 * BOUNTY_MULT) : 0;
  if (bounty <= 0) return;
  // Hunting economies (Thornwild's Trophy Totem) earn extra from every kill.
  const bonus = sim.bountyBonus[killerOwner] ?? 0;
  const extra = bonus > 0 ? Math.max(1, Math.round(bounty * bonus)) : 0;
  p.gold += bounty + extra;
  p.goldEarned += bounty + extra;
  sim.emit({ t: 'gold', p: killerOwner, g: bounty + extra, x: Math.round(target.x * 100) / 100, y: Math.round(target.y * 100) / 100 });
}

/**
 * `attack`: the damage comes from an attack (not poison, thorns or a cyclone), so the target's
 * flat damage block applies.
 */
export function dealDamage(sim: Sim, target: Entity, raw: number, type: AttackType, attackerOwner: number, ignoreArmor = false, attack = false): number {
  if (target.hp <= 0) return 0;
  const armor = armorOf(sim, target);
  let dmg = computeDamage(raw, type, armor.type, ignoreArmor ? 0 : armor.value);
  const block = attack && target.kind === 'unit' ? (UNITS[target.type].block ?? 0) + modsOf(sim, target.id).block : 0;
  if (block) dmg = Math.max(dmg * 0.25, dmg - block);
  const mr = type === 'magic' && target.kind === 'unit' ? UNITS[target.type].magicResist : undefined;
  if (mr) dmg *= 1 - mr;
  target.hp -= dmg;
  if (target.hp <= 0 && target.kind !== 'castle') {
    target.hp = 0;
    rewardKill(sim, target, attackerOwner);
  }
  if (target.kind === 'castle') {
    const p = sim.state.players[attackerOwner];
    if (p) p.castleDmg = (p.castleDmg ?? 0) + Math.min(dmg, dmg + target.hp);
    target.hp = Math.max(0, target.hp);
  }
  return dmg;
}

/** Nearest valid target within `radius`; units are preferred over structures. */
export function findTarget(sim: Sim, a: Entity, st: AttackStats, radius: number): Entity | undefined {
  let best: Entity | undefined, bestD = Infinity;
  if (!st.structuresOnly) {
    for (const u of sim.hash.query(a.x, a.y, radius + 1.5)) {
      if (!canTarget(sim, a, st, u)) continue;
      const d = sim.edgeDist(a, u);
      if (d <= radius && d < bestD) { best = u; bestD = d; }
    }
    if (best) return best;
  }
  // Bounding-box pre-check (exact: edgeDist can't be within `radius` outside it).
  const reach = radius + sim.radius(a) + 0.01;
  for (const b of sim.structures()) {
    if (a.x < b.tx! - reach || a.x > b.tx! + b.size! + reach || a.y < b.ty! - reach || a.y > b.ty! + b.size! + reach) continue;
    if (!canTarget(sim, a, st, b)) continue;
    const d = sim.edgeDist(a, b);
    if (d <= radius && d < bestD) { best = b; bestD = d; }
  }
  return best;
}

/** Damage multiplier of a unit's `bonusVs` against a target. */
function bonusMult(sim: Sim, a: Entity, t: Entity): number {
  const b = a.kind === 'unit' ? UNITS[a.type].bonusVs : a.kind === 'building' ? BUILDINGS[a.type].attack?.bonusVs : undefined;
  if (!b) return 1;
  const hit = b.vs === 'air' ? sim.isAir(t) : b.vs === 'structure' ? sim.isStructure(t) : t.kind === 'unit' && UNITS[t.type].armorType === b.vs;
  return hit ? b.mult : 1;
}

/**
 * Lightning that jumps from `first` to the nearest not-yet-hit enemy within 3.5 tiles, losing 20%
 * per jump. Returns everything it hit.
 */
function chainFrom(sim: Sim, a: Entity, st: AttackStats, first: Entity, dmg: number, jumps: number, type: AttackType): Entity[] {
  const hit = [first];
  dealDamage(sim, first, dmg, type, a.owner, false, true);
  let last = first, cur = dmg;
  for (let i = 1; i < jumps; i++) {
    cur *= 0.8;
    let next: Entity | undefined, nd = Infinity;
    for (const u of sim.hash.query(last.x, last.y, 3.5)) {
      if (hit.includes(u) || !canTarget(sim, a, st, u)) continue;
      const d = Math.hypot(u.x - last.x, u.y - last.y);
      if (d < nd) { nd = d; next = u; }
    }
    if (!next) break;
    dealDamage(sim, next, cur, type, a.owner, false, true);
    hit.push(next);
    last = next;
  }
  return hit;
}

/** Abilities that hit anything: storms jump to flyers and ground units alike. */
const anyTarget = (st: AttackStats): AttackStats => ({ ...st, targetsAir: true, airOnly: false, structuresOnly: false });

export function performAttack(sim: Sim, a: Entity, st: AttackStats, t: Entity, dmgMult: number) {
  const ud = a.kind === 'unit' ? UNITS[a.type] : undefined;
  let mult = dmgMult * bonusMult(sim, a, t);
  // Charge: the first blow after marching freely hits much harder.
  let charged = false;
  if (ud?.charge && a.charge) { mult *= ud.charge; a.charge = false; charged = true; }
  // Every-nth abilities count the attacker's blows (deterministic, so mirror matches stay mirrored).
  const n = ud && (ud.crit || ud.bash || ud.slam || ud.storm) ? (a.hits = (a.hits ?? 0) + 1) : 0;
  const crit = !!ud?.crit && n % ud.crit.every === 0;
  if (crit) mult *= ud!.crit!.mult;
  const raw = st.dmg * mult;
  const ranged: 0 | 1 = st.range >= 1.5 ? 1 : 0;
  if (ud?.suicide) { explode(sim, a, st, t, raw, ud.suicide.radius); return; }
  if (st.chain > 1) {
    const hit = chainFrom(sim, a, st, t, raw, st.chain, st.attackType);
    // Venomous storms poison every enemy the lightning touches.
    if (ud?.poison) for (const h of hit) if (h.kind === 'unit' && h.hp > 0) h.poison = { dps: ud.poison.dps, left: Math.round(ud.poison.duration * TICK_RATE), slow: ud.poison.slow, owner: a.owner };
    sim.emit({ t: 'chain', ids: [a.id, ...hit.map((h) => h.id)] });
    return;
  }
  sim.emit({ t: 'atk', a: a.id, b: t.id, r: ranged });
  const td = t.kind === 'unit' ? UNITS[t.type] : undefined;
  // Evasion: every n-th attack aimed at the unit misses (splash and all).
  if (td?.evade && (t.dodges = (t.dodges ?? 0) + 1) % td.evade === 0) return;
  // Shield wall: ranged attacks lose part of their force.
  const resist = ranged && td?.rangedResist ? 1 - td.rangedResist : 1;
  const dealt = dealDamage(sim, t, raw * resist, st.attackType, a.owner, !!ud?.ignoreArmor, true);
  // Multi-shot: the same volley strikes further enemies in range, nearest first.
  const ms = ud ? ud.multishot : a.kind === 'building' ? BUILDINGS[a.type].attack?.multishot : undefined;
  if (ms && ms > 1) {
    const extra: Array<[Entity, number]> = [];
    for (const o of sim.hash.query(a.x, a.y, st.range + 2)) {
      if (o === t || !canTarget(sim, a, st, o)) continue;
      const d = sim.edgeDist(a, o);
      if (d <= st.range) extra.push([o, d]);
    }
    extra.sort((p, q) => p[1] - q[1] || p[0].id - q[0].id);
    for (const [o] of extra.slice(0, ms - 1)) {
      sim.emit({ t: 'atk', a: a.id, b: o.id, r: ranged });
      const or = ranged && UNITS[o.type]?.rangedResist ? 1 - UNITS[o.type].rangedResist! : 1;
      dealDamage(sim, o, raw * or, st.attackType, a.owner, !!ud?.ignoreArmor, true);
    }
  }
  if (charged || crit) sim.emit({ t: 'splash', x: Math.round(t.x * 100) / 100, y: Math.round(t.y * 100) / 100, r: 0.6 });
  if (ud) {
    onHit(sim, a, ud, t, dealt, ranged);
    if (ud.bash && n % ud.bash.every === 0 && t.kind === 'unit' && t.hp > 0) t.stun = Math.max(t.stun ?? 0, Math.round(ud.bash.stun * TICK_RATE));
    if (ud.slam && n % ud.slam.every === 0) {
      const p = sim.isStructure(t) ? nearestPointOn(t, a.x, a.y) : { x: t.x, y: t.y };
      for (const u of sim.hash.query(p.x, p.y, ud.slam.radius + 0.8)) {
        if (!canTarget(sim, a, anyTarget(st), u) || sim.isAir(u)) continue;
        if (Math.hypot(u.x - p.x, u.y - p.y) - sim.radius(u) > ud.slam.radius) continue;
        dealDamage(sim, u, ud.slam.dmg * dmgMult, st.attackType, a.owner, false, true);
      }
      sim.emit({ t: 'splash', x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100, r: ud.slam.radius });
    }
    if (ud.storm && n % ud.storm.every === 0 && t.hp > 0 && t.kind === 'unit') {
      const hit = chainFrom(sim, a, anyTarget(st), t, ud.storm.dmg * dmgMult, ud.storm.jumps, 'magic');
      sim.emit({ t: 'chain', ids: [a.id, ...hit.map((h) => h.id)] });
    }
  }
  if (st.splash > 0) {
    const p = sim.isStructure(t) ? nearestPointOn(t, a.x, a.y) : { x: t.x, y: t.y };
    for (const u of sim.hash.query(p.x, p.y, st.splash + 0.8)) {
      if (u === t || !canTarget(sim, a, st, u) || sim.isAir(u)) continue;
      if (Math.hypot(u.x - p.x, u.y - p.y) - sim.radius(u) > st.splash) continue;
      dealDamage(sim, u, raw * 0.5, st.attackType, a.owner, false, true);
    }
    sim.emit({ t: 'splash', x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100, r: st.splash });
  }
}

/**
 * Suicide attackers: one blast of full damage to every enemy ground unit and building within
 * `radius` of the target, then the attacker is gone (no bounty for anyone, nothing bursts out).
 */
function explode(sim: Sim, a: Entity, st: AttackStats, t: Entity, dmg: number, radius: number) {
  const p = sim.isStructure(t) ? nearestPointOn(t, a.x, a.y) : { x: t.x, y: t.y };
  for (const b of sim.structures()) {
    if (b.team === a.team || b.hp <= 0) continue;
    if (distToRect(footprint(b), p.x, p.y) <= radius) dealDamage(sim, b, dmg, st.attackType, a.owner, false, true);
  }
  for (const u of sim.hash.query(p.x, p.y, radius + 0.8)) {
    if (u.team === a.team || u.hp <= 0 || u.kind !== 'unit' || sim.isAir(u)) continue;
    if (Math.hypot(u.x - p.x, u.y - p.y) - sim.radius(u) <= radius) dealDamage(sim, u, dmg, st.attackType, a.owner, false, true);
  }
  sim.emit({ t: 'splash', x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100, r: radius });
  a.hp = 0;
  a.smitten = true;
}

/** Lifesteal, poison and thorns after a single-target hit. */
function onHit(sim: Sim, a: Entity, ud: UnitDef, t: Entity, dealt: number, ranged: 0 | 1) {
  if (ud.lifesteal && dealt > 0 && a.hp > 0) a.hp = Math.min(a.maxHp, a.hp + dealt * ud.lifesteal);
  if (ud.poison && t.kind === 'unit' && t.hp > 0) {
    t.poison = { dps: ud.poison.dps, left: Math.round(ud.poison.duration * TICK_RATE), slow: ud.poison.slow, owner: a.owner };
  }
  const thorns = t.kind === 'unit' ? UNITS[t.type].thorns : undefined;
  if (thorns && !ranged && dealt > 0 && a.hp > 0) dealDamage(sim, a, dealt * thorns, 'chaos', t.owner, true);
}

function tryHeal(sim: Sim, e: Entity) {
  const h = UNITS[e.type].heal;
  if (!h) return;
  if ((e.healCd ?? 0) > 0) { e.healCd!--; return; }
  let best: Entity | undefined, missing = h.amount * 0.4;
  for (const u of sim.hash.query(e.x, e.y, h.range + 1)) {
    if (u.team !== e.team || u.hp <= 0) continue;
    const m = u.maxHp - u.hp;
    if (m > missing && Math.hypot(u.x - e.x, u.y - e.y) <= h.range) { best = u; missing = m; }
  }
  if (!best) return;
  best.hp = Math.min(best.maxHp, best.hp + h.amount);
  e.healCd = Math.round(h.cooldown * TICK_RATE);
  sim.emit({ t: 'heal', a: e.id, b: best.id });
}

/**
 * Entities in alternating order (forwards on even ticks, backwards on odd ones). Damage applies
 * immediately, so a fixed order would let whoever was created first (usually team 0, whose
 * commands are applied first) strike first in every even fight.
 */
function fairOrder(sim: Sim): Entity[] {
  const list = sim.state.entities;
  return sim.state.tick % 2 ? list.slice().reverse() : list;
}

/** Unit AI: regen, heal, acquire targets, attack in range or move. */
export function stepCombatUnits(sim: Sim) {
  const tick = sim.state.tick;
  // Units alive at the start of the tick all get to act, even if they are killed earlier in this
  // loop: exchanges resolve simultaneously instead of favouring whoever happens to act first.
  let acting = fairOrder(sim).filter((e) => e.kind === 'unit' && e.hp > 0);
  // Regeneration and poison first, for everyone at once: inside each unit's turn the outcome
  // depended on whether the enemy had already struck (regen is capped at full hp).
  for (const e of acting) {
    const regen = (UNITS[e.type].regen ?? 0) + modsOf(sim, e.id).regen;
    if (regen > 0) e.hp = Math.min(e.maxHp, e.hp + regen / TICK_RATE);
    if (e.poison) {
      dealDamage(sim, e, e.poison.dps / TICK_RATE, 'chaos', e.poison.owner, true);
      if (--e.poison.left <= 0) delete e.poison;
    }
    // Summoned units fade (no bounty, nothing bursts out of them).
    if (e.ttl !== undefined && --e.ttl <= 0) { e.hp = 0; e.ttl = 0; e.smitten = true; continue; }
    const sm = UNITS[e.type].summon;
    if (sm) {
      e.abilityCd ??= Math.round(sm.every * TICK_RATE);
      if (--e.abilityCd <= 0) { e.abilityCd = Math.round(sm.every * TICK_RATE); summonUnits(sim, e, sm); }
    }
  }
  acting = acting.filter((e) => e.hp > 0); // killed by poison: no last blow
  // Moves are simultaneous too: every unit decides from the positions at the start of the tick
  // (a chaser must not see where its target has already stepped this tick), then all move at once.
  const moved: Array<[Entity, number, number]> = [];
  const settle = (e: Entity, x0: number, y0: number) => {
    if (e.x !== x0 || e.y !== y0) { moved.push([e, e.x, e.y]); e.x = x0; e.y = y0; }
  };
  for (const e of acting) {
    const x0 = e.x, y0 = e.y;
    stepUnit(sim, e, tick);
    settle(e, x0, y0);
  }
  for (const [e, x, y] of moved) { e.x = x; e.y = y; }
}

/** One unit's turn: healing, targeting, then attack or move (regen and poison ran before). */
function stepUnit(sim: Sim, e: Entity, tick: number) {
  if (e.hp <= 0) {
    // Killed this tick: its last blow still lands (no movement, no regeneration).
    const st = attackStats(e)!, t = sim.get(e.targetId);
    if (!e.cd && t && t.hp > 0 && t.team !== e.team && sim.edgeDist(e, t) <= st.range + 0.05) performAttack(sim, e, st, t, modsOf(sim, e.id).dmg);
    return;
  }
  const st = attackStats(e)!;
  const mods = modsOf(sim, e.id);
  if ((e.cd ?? 0) > 0) e.cd!--;
  // Stunned: no moving, attacking or healing.
  if (e.stun) { e.stun--; return; }
  tryHeal(sim, e);

  let target = sim.get(e.targetId);
  const rescan = (tick + e.id) % 5 === 0;
  if (!canTarget(sim, e, st, target) || sim.edgeDist(e, target) > st.aggro + 3) {
    target = findTarget(sim, e, st, st.aggro);
  } else if (rescan && sim.isStructure(target) && !st.structuresOnly) {
    // Prefer fighting units over hitting buildings.
    const u = findTarget(sim, e, st, st.aggro);
    if (u && u.kind === 'unit') target = u;
  }
  e.targetId = target?.id;

  const speed = (UNITS[e.type].speed * mods.speed) / TICK_RATE;
  if (target) {
    if (sim.edgeDist(e, target) <= st.range + 0.05) {
      if (!e.cd) {
        performAttack(sim, e, st, target, mods.dmg);
        // Berserkers attack faster once badly hurt.
        const bz = UNITS[e.type].berserk;
        const rage = bz && e.hp < e.maxHp * bz.below ? 1 + bz.haste : 1;
        e.cd = Math.round(st.cooldownTicks / (mods.haste * rage));
      }
    } else {
      const p = sim.isStructure(target) ? nearestPointOn(target, e.x, e.y) : target;
      moveToward(sim, e, p.x, p.y, speed);
    }
  } else {
    followFlow(sim, e, speed);
    // Marching freely readies the next charge.
    if (UNITS[e.type].charge) e.charge = true;
  }
}

/** Towers and attacking aura buildings shoot the nearest enemy unit. */
export function stepStructureAttacks(sim: Sim) {
  for (const e of fairOrder(sim)) {
    if (!sim.isStructure(e) || e.hp <= 0 || e.buildLeft) continue;
    const st = attackStats(e);
    if (!st) continue;
    if ((e.cd ?? 0) > 0) { e.cd!--; continue; }
    let t = sim.get(e.targetId);
    if (!canTarget(sim, e, st, t) || t.kind !== 'unit' || sim.edgeDist(e, t) > st.range) {
      t = undefined;
      let bestD = Infinity;
      const cx = e.tx! + e.size! / 2, cy = e.ty! + e.size! / 2;
      for (const u of sim.hash.query(cx, cy, st.range + e.size!)) {
        if (!canTarget(sim, e, st, u)) continue;
        const d = sim.edgeDist(e, u);
        if (d <= st.range && d < bestD) { t = u; bestD = d; }
      }
    }
    e.targetId = t?.id;
    if (!t) continue;
    performAttack(sim, e, st, t, 1);
    e.cd = st.cooldownTicks;
  }
}
