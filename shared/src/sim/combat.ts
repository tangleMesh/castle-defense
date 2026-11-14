import { BOUNTY_MULT, CASTLE_ARMOR, DEFAULT_AGGRO, TICK_RATE } from '../constants';
import { BUILDINGS, UNITS, computeDamage, type ArmorType, type AttackType } from '../data';
import type { Sim } from './sim';
import type { Entity } from './state';
import { modsOf } from './auras';
import { followFlow, moveToward, nearestPointOn } from './movement';

export interface AttackStats {
  dmg: number;
  attackType: AttackType;
  range: number;
  cooldownTicks: number;
  targetsAir: boolean;
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
      targetsAir: !!u.targetsAir, structuresOnly: !!u.structuresOnly, splash: u.splash ?? 0, chain: u.chain ?? 0,
      aggro: u.aggro ?? Math.max(DEFAULT_AGGRO, u.range + 1.5),
    };
  }
  // Castles have no attack: only units, towers and the rescue strike defend them.
  if (e.kind === 'building') {
    const a = BUILDINGS[e.type].attack;
    if (!a) return null;
    return {
      dmg: a.dmg, attackType: a.attackType, range: a.range, cooldownTicks: Math.round(a.cooldown * TICK_RATE),
      targetsAir: a.targetsAir, structuresOnly: false, splash: 0, chain: 0, aggro: a.range,
    };
  }
  return null;
}

export function armorOf(sim: Sim, e: Entity): { type: ArmorType; value: number } {
  if (e.kind === 'unit') {
    const u = UNITS[e.type];
    return { type: u.armorType, value: u.armor + modsOf(sim, e.id).armor };
  }
  if (e.kind === 'castle') return { type: 'fortified', value: CASTLE_ARMOR };
  if (e.kind === 'building') return { type: 'fortified', value: BUILDINGS[e.type].armor };
  return { type: 'light', value: 0 };
}

export function canTarget(sim: Sim, a: Entity, st: AttackStats, t: Entity | undefined): t is Entity {
  if (!t || t.hp <= 0 || t.team === a.team || t.kind === 'builder') return false;
  if (st.structuresOnly && !sim.isStructure(t)) return false;
  if (sim.isAir(t) && !st.targetsAir) return false;
  return true;
}

/** Apply damage; credits kills/bounty to the attacking player. Returns damage dealt. */
export function dealDamage(sim: Sim, target: Entity, raw: number, type: AttackType, attackerOwner: number): number {
  if (target.hp <= 0) return 0;
  const armor = armorOf(sim, target);
  const dmg = computeDamage(raw, type, armor.type, armor.value);
  target.hp -= dmg;
  if (target.hp <= 0 && target.kind !== 'castle') {
    target.hp = 0;
    const p = sim.state.players[attackerOwner];
    if (p) {
      if (target.kind === 'unit') p.kills++;
      const bounty = target.kind === 'unit'
        ? Math.max(1, Math.round(UNITS[target.type].bounty * BOUNTY_MULT))
        : target.kind === 'building' ? Math.floor((target.value ?? 0) * 0.1 * BOUNTY_MULT) : 0;
      if (bounty > 0) {
        p.gold += bounty;
        p.goldEarned += bounty;
        sim.emit({ t: 'gold', p: attackerOwner, g: bounty, x: Math.round(target.x * 100) / 100, y: Math.round(target.y * 100) / 100 });
      }
    }
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
  for (const b of sim.state.entities) {
    if (!sim.isStructure(b) || !canTarget(sim, a, st, b)) continue;
    const d = sim.edgeDist(a, b);
    if (d <= radius && d < bestD) { best = b; bestD = d; }
  }
  return best;
}

function performAttack(sim: Sim, a: Entity, st: AttackStats, t: Entity, dmgMult: number) {
  const raw = st.dmg * dmgMult;
  const ranged: 0 | 1 = st.range >= 1.5 ? 1 : 0;
  if (st.chain > 1) {
    const hit = [t];
    dealDamage(sim, t, raw, st.attackType, a.owner);
    let last = t, cur = raw;
    for (let i = 1; i < st.chain; i++) {
      cur *= 0.8;
      let next: Entity | undefined, nd = Infinity;
      for (const u of sim.hash.query(last.x, last.y, 3.5)) {
        if (hit.includes(u) || !canTarget(sim, a, st, u)) continue;
        const d = Math.hypot(u.x - last.x, u.y - last.y);
        if (d < nd) { nd = d; next = u; }
      }
      if (!next) break;
      dealDamage(sim, next, cur, st.attackType, a.owner);
      hit.push(next);
      last = next;
    }
    sim.emit({ t: 'chain', ids: [a.id, ...hit.map((h) => h.id)] });
    return;
  }
  sim.emit({ t: 'atk', a: a.id, b: t.id, r: ranged });
  dealDamage(sim, t, raw, st.attackType, a.owner);
  if (st.splash > 0) {
    const p = sim.isStructure(t) ? nearestPointOn(t, a.x, a.y) : { x: t.x, y: t.y };
    for (const u of sim.hash.query(p.x, p.y, st.splash + 0.8)) {
      if (u === t || !canTarget(sim, a, st, u) || sim.isAir(u)) continue;
      if (Math.hypot(u.x - p.x, u.y - p.y) - sim.radius(u) > st.splash) continue;
      dealDamage(sim, u, raw * 0.5, st.attackType, a.owner);
    }
    sim.emit({ t: 'splash', x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100, r: st.splash });
  }
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

/** Unit AI: regen, heal, acquire targets, attack in range or move. */
export function stepCombatUnits(sim: Sim) {
  const tick = sim.state.tick;
  for (const e of sim.state.entities) {
    if (e.kind !== 'unit' || e.hp <= 0) continue;
    const st = attackStats(e)!;
    const mods = modsOf(sim, e.id);
    if (mods.regen > 0) e.hp = Math.min(e.maxHp, e.hp + mods.regen / TICK_RATE);
    if ((e.cd ?? 0) > 0) e.cd!--;
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
          e.cd = st.cooldownTicks;
        }
      } else {
        const p = sim.isStructure(target) ? nearestPointOn(target, e.x, e.y) : target;
        moveToward(sim, e, p.x, p.y, speed);
      }
    } else {
      followFlow(sim, e, speed);
    }
  }
}

/** Towers and attacking aura buildings shoot the nearest enemy unit. */
export function stepStructureAttacks(sim: Sim) {
  for (const e of sim.state.entities) {
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
