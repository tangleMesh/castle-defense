import { TICK_RATE } from '../constants';
import { ITEM_BY_ID, itemEffect } from '../data';
import { distToRect } from '../map/map';
import type { Sim } from './sim';
import type { Entity } from './state';
import { canTarget, castLightning, performAttack, type AttackStats } from './combat';
import { footprint } from './grid';

/** Item effects that act each tick: builder attacks, repair, the Storm Orb, and timed buffs running out. */
export function stepItems(sim: Sim) {
  const s = sim.state;
  if (s.teamBuffs?.length) s.teamBuffs = s.teamBuffs.filter((b) => --b.left > 0);
  for (const u of s.entities) if (u.stone && --u.stone.left <= 0) delete u.stone;
  for (const p of sim.state.players) {
    if (!p.items?.length) continue;
    const b = sim.get(p.builderId);
    if (!b) continue;
    const atk = itemEffect(p, 'builderAttack');
    if (atk) builderShoot(sim, b, {
      dmg: atk.dmg, attackType: atk.attackType, range: atk.range, cooldownTicks: Math.round(atk.cooldown * TICK_RATE),
      targetsAir: atk.targetsAir, airOnly: false, structuresOnly: false, splash: 0, chain: 0, aggro: atk.range,
    });
    // Repair items stack (several runes, like in the map).
    for (const id of p.items) { const rep = ITEM_BY_ID[id]?.repair; if (rep) repair(sim, b, rep.hps, rep.range); }
    const orb = itemEffect(p, 'builderLightning');
    if (orb) {
      p.orbCd ??= 0;
      if (p.orbCd > 0) p.orbCd--;
      else {
        let t: Entity | undefined, bestD = Infinity;
        for (const u of sim.hash.query(b.x, b.y, orb.range + 1)) {
          if (u.kind !== 'unit' || u.team === b.team || u.hp <= 0 || u.hidden) continue;
          const d = Math.hypot(u.x - b.x, u.y - b.y);
          if (d <= orb.range && d < bestD) { t = u; bestD = d; }
        }
        if (t) { castLightning(sim, b, t, orb.dmg, orb.jumps, orb.range); p.orbCd = Math.round(orb.every * TICK_RATE); }
        else p.orbCd = TICK_RATE;
      }
    }
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

/** Mason's Hammer: every damaged own-team building near the builder regains HP (slower than a builder repair). */
function repair(sim: Sim, b: Entity, hps: number, range: number) {
  const sparkle = (sim.state.tick + b.id) % TICK_RATE === 0;
  for (const e of sim.state.entities) {
    if (e.kind !== 'building' || e.team !== b.team || e.hp <= 0 || e.buildLeft || e.hp >= e.maxHp) continue;
    if (distToRect(footprint(e), b.x, b.y) > range) continue;
    e.hp = Math.min(e.maxHp, e.hp + hps / TICK_RATE);
    // One sparkle per second and building is enough for the client.
    if (sparkle) sim.emit({ t: 'heal', a: b.id, b: e.id });
  }
}
