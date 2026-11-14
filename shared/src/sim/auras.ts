import { BUILDINGS } from '../data';
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
}
