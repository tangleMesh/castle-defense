import { MAX_BOUNTY_BONUS } from '../constants';
import { BUILDINGS, ITEM_BY_ID, UNITS, itemsOf, type AuraDef } from '../data';
import { distToRect } from '../map/map';
import { footprint } from './grid';
import type { Sim } from './sim';
import type { Entity } from './state';

export interface Mods {
  dmg: number;
  armor: number;
  regen: number;
  speed: number;
  /** Attack speed multiplier (1.3 = attacks 30% faster). */
  haste: number;
  /** Flat damage taken off every attack (block aura). */
  block: number;
  /** Rot from enemy decay auras, HP lost per second (a negative regen aura). */
  decay: number;
  /** Weakening enemy auras (≤ 0): damage multiplier delta and armour, kept apart from ally boosts so both apply. */
  dmgMalus: number;
  armorMalus: number;
}

const NONE: Mods = Object.freeze({ dmg: 1, armor: 0, regen: 0, speed: 1, haste: 1, block: 0, decay: 0, dmgMalus: 0, armorMalus: 0 });

export function modsOf(sim: Sim, id: number): Mods {
  return sim.mods.get(id) ?? NONE;
}

/**
 * Recompute per-unit stat modifiers from aura buildings. Same-stat auras from
 * several buildings do not stack: the strongest one applies.
 */
export function computeAuras(sim: Sim) {
  sim.mods.clear();
  const bounty = sim.state.players.map(() => 0);
  for (const b of sim.state.entities) {
    if (b.hp <= 0) continue;
    if (b.kind === 'unit') {
      // Auras carried by units (Shieldbearer's shield wall, champions' battle cries…).
      const aura = UNITS[b.type].aura;
      if (!aura) continue;
      for (const u of sim.hash.query(b.x, b.y, aura.radius + 1)) {
        if (u.hp > 0 && Math.hypot(u.x - b.x, u.y - b.y) <= aura.radius) applyAura(sim, aura, b, u);
      }
      continue;
    }
    if (b.kind !== 'building' || b.buildLeft) continue;
    const def = BUILDINGS[b.type];
    if (def.bountyBonus && bounty[b.owner] !== undefined) bounty[b.owner] += def.bountyBonus;
    const aura = def.aura;
    if (!aura) continue;
    const rect = footprint(b);
    const cx = b.tx! + b.size! / 2, cy = b.ty! + b.size! / 2;
    for (const u of sim.hash.query(cx, cy, aura.radius + b.size!)) {
      if (u.hp > 0 && distToRect(rect, u.x, u.y) <= aura.radius) applyAura(sim, aura, b, u);
    }
  }
  sim.bountyBonus = bounty.map((v) => Math.min(MAX_BOUNTY_BONUS, v));
  // Poison slows its victims (the strongest slow wins, like slowing auras).
  for (const u of sim.state.entities) {
    if (!u.poison || u.hp <= 0) continue;
    const m = modFor(sim, u);
    m.speed = Math.min(m.speed, 1 - u.poison.slow);
  }
  // Cyclones slow every enemy unit inside them.
  for (const z of sim.state.zones ?? []) {
    for (const u of sim.hash.query(z.x, z.y, z.radius + 1)) {
      if (u.team === z.team || u.hp <= 0 || sim.isAir(u) !== !!z.air || Math.hypot(u.x - z.x, u.y - z.y) > z.radius) continue;
      const m = modFor(sim, u);
      m.speed = Math.min(m.speed, 1 - z.slow);
    }
  }
  applyItemAuras(sim);
}

function modFor(sim: Sim, u: Entity): Mods {
  let m = sim.mods.get(u.id);
  if (!m) sim.mods.set(u.id, (m = { ...NONE }));
  return m;
}

/** Same-stat auras do not stack: the strongest one applies. */
function applyAura(sim: Sim, aura: AuraDef, src: Entity, u: Entity) {
  if ((aura.target === 'ally') !== (u.team === src.team)) return;
  const m = modFor(sim, u);
  switch (aura.stat) {
    // Weakening auras on enemies (negative values) take the strongest malus instead.
    case 'dmg': if (aura.value < 0) m.dmgMalus = Math.min(m.dmgMalus, aura.value); else m.dmg = Math.max(m.dmg, 1 + aura.value); break;
    case 'armor': if (aura.value < 0) m.armorMalus = Math.min(m.armorMalus, aura.value); else m.armor = Math.max(m.armor, aura.value); break;
    case 'regen': if (aura.value < 0) m.decay = Math.max(m.decay, -aura.value); else m.regen = Math.max(m.regen, aura.value); break;
    case 'speed': m.speed = aura.value < 0 ? Math.min(m.speed, 1 + aura.value) : Math.max(m.speed, 1 + aura.value); break;
    case 'haste': m.haste = Math.max(m.haste, 1 + aura.value); break;
    case 'block': m.block = Math.max(m.block, aura.value); break;
  }
}

/**
 * Team-wide item bonuses (Horn of Valor etc.) apply to every unit of the carrier's team and add
 * on top of building auras. The same stat from several teammates' items doesn't stack.
 */
function applyItemAuras(sim: Sim) {
  const zero = (): Mods => ({ dmg: 0, armor: 0, regen: 0, speed: 0, haste: 0, block: 0, decay: 0, dmgMalus: 0, armorMalus: 0 });
  const bonus: [Mods, Mods] = [zero(), zero()];
  let any = false;
  for (const p of sim.state.players) {
    for (const id of itemsOf(p)) {
      for (const a of ITEM_BY_ID[id]?.teamAura ?? []) {
        bonus[p.team][a.stat] = Math.max(bonus[p.team][a.stat], a.value);
        any = true;
      }
    }
  }
  // Consumable damage boosts (Fury Shard, Rage Heart) add up while they last.
  for (const b of sim.state.teamBuffs ?? []) { bonus[b.team].dmg += b.dmg; any = true; }
  if (!any) return;
  for (const u of sim.state.entities) {
    if (u.kind !== 'unit' || u.hp <= 0) continue;
    const b = bonus[u.team];
    if (!b.dmg && !b.armor && !b.regen && !b.speed && !b.haste) continue;
    let m = sim.mods.get(u.id);
    if (!m) sim.mods.set(u.id, (m = { ...NONE }));
    m.dmg += b.dmg;
    m.armor += b.armor;
    m.regen += b.regen;
    m.speed += b.speed;
    m.haste += b.haste;
  }
}
