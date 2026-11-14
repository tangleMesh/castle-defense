import { BUILDINGS, ITEM_BY_ID, itemsOf } from '../data';
import { distToRect } from '../map/map';
import { footprint } from './grid';
import type { Sim } from './sim';

export interface Mods {
  dmg: number;
  armor: number;
  regen: number;
  speed: number;
}

const NONE: Mods = Object.freeze({ dmg: 1, armor: 0, regen: 0, speed: 1 });

export function modsOf(sim: Sim, id: number): Mods {
  return sim.mods.get(id) ?? NONE;
}

/**
 * Recompute per-unit stat modifiers from aura buildings. Same-stat auras from
 * several buildings do not stack: the strongest one applies.
 */
export function computeAuras(sim: Sim) {
  sim.mods.clear();
  for (const b of sim.state.entities) {
    if (b.kind !== 'building' || b.buildLeft || b.hp <= 0) continue;
    const aura = BUILDINGS[b.type].aura;
    if (!aura) continue;
    const rect = footprint(b);
    const cx = b.tx! + b.size! / 2, cy = b.ty! + b.size! / 2;
    for (const u of sim.hash.query(cx, cy, aura.radius + b.size!)) {
      if (u.hp <= 0) continue;
      const ally = u.team === b.team;
      if ((aura.target === 'ally') !== ally) continue;
      if (distToRect(rect, u.x, u.y) > aura.radius) continue;
      let m = sim.mods.get(u.id);
      if (!m) sim.mods.set(u.id, (m = { ...NONE }));
      switch (aura.stat) {
        case 'dmg': m.dmg = Math.max(m.dmg, 1 + aura.value); break;
        case 'armor': m.armor = Math.max(m.armor, aura.value); break;
        case 'regen': m.regen = Math.max(m.regen, aura.value); break;
        case 'speed': m.speed = aura.value < 0 ? Math.min(m.speed, 1 + aura.value) : Math.max(m.speed, 1 + aura.value); break;
      }
    }
  }
  applyItemAuras(sim);
}

/**
 * Team-wide item bonuses (Horn of Valor etc.) apply to every unit of the carrier's team and add
 * on top of building auras. The same stat from several teammates' items doesn't stack.
 */
function applyItemAuras(sim: Sim) {
  const bonus: [Mods, Mods] = [{ dmg: 0, armor: 0, regen: 0, speed: 0 }, { dmg: 0, armor: 0, regen: 0, speed: 0 }];
  let any = false;
  for (const p of sim.state.players) {
    for (const id of itemsOf(p)) {
      const a = ITEM_BY_ID[id]?.teamAura;
      if (!a) continue;
      bonus[p.team][a.stat] = Math.max(bonus[p.team][a.stat], a.value);
      any = true;
    }
  }
  if (!any) return;
  for (const u of sim.state.entities) {
    if (u.kind !== 'unit' || u.hp <= 0) continue;
    const b = bonus[u.team];
    if (!b.dmg && !b.armor && !b.regen && !b.speed) continue;
    let m = sim.mods.get(u.id);
    if (!m) sim.mods.set(u.id, (m = { ...NONE }));
    m.dmg += b.dmg;
    m.armor += b.armor;
    m.regen += b.regen;
    m.speed += b.speed;
  }
}
