import { TICK_RATE } from '../constants';
import { itemEffect } from '../data';
import { distToRect } from '../map/map';
import type { Sim } from './sim';
import type { Entity } from './state';
import { canTarget, performAttack, type AttackStats } from './combat';
import { footprint } from './grid';

/** Builder item effects that act each tick: the Warden's Crossbow and the Mason's Hammer. */
export function stepItems(sim: Sim) {
  for (const p of sim.state.players) {
    if (!p.items?.length) continue;
    const b = sim.get(p.builderId);
    if (!b) continue;
    const atk = itemEffect(p, 'builderAttack');
    if (atk) builderShoot(sim, b, {
      dmg: atk.dmg, attackType: atk.attackType, range: atk.range, cooldownTicks: Math.round(atk.cooldown * TICK_RATE),
      targetsAir: atk.targetsAir, structuresOnly: false, splash: 0, chain: 0, aggro: atk.range,
    });
    const rep = itemEffect(p, 'repair');
    if (rep) repair(sim, b, rep.hps, rep.range);
  }
}

function builderShoot(sim: Sim, b: Entity, st: AttackStats) {
  if ((b.cd ?? 0) > 0) { b.cd!--; return; }
  let t = sim.get(b.targetId);
  if (!canTarget(sim, b, st, t) || t.kind !== 'unit' || sim.edgeDist(b, t) > st.range) {
    t = undefined;
    let bestD = Infinity;
    for (const u of sim.hash.query(b.x, b.y, st.range + 1)) {
      if (!canTarget(sim, b, st, u)) continue;
      const d = sim.edgeDist(b, u);
      if (d <= st.range && d < bestD) { t = u; bestD = d; }
    }
  }
  b.targetId = t?.id;
  if (!t) return;
  performAttack(sim, b, st, t, 1);
  b.cd = st.cooldownTicks;
}

function repair(sim: Sim, b: Entity, hps: number, range: number) {
  let best: Entity | undefined, bestFrac = 1;
  for (const e of sim.state.entities) {
    if ((e.kind !== 'building' && e.kind !== 'castle') || e.team !== b.team || e.hp <= 0 || e.buildLeft) continue;
    const frac = e.hp / e.maxHp;
    if (frac >= bestFrac || distToRect(footprint(e), b.x, b.y) > range) continue;
    best = e; bestFrac = frac;
  }
  if (!best) return;
  best.hp = Math.min(best.maxHp, best.hp + hps / TICK_RATE);
  // One sparkle per second is enough for the client.
  if ((sim.state.tick + b.id) % TICK_RATE === 0) sim.emit({ t: 'heal', a: b.id, b: best.id });
}
