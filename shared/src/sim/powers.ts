import { TICK_RATE } from '../constants';
import { BUILDINGS, type PowerDef } from '../data';
import { distToRect } from '../map/map';
import { dealDamage } from './combat';
import { footprint } from './grid';
import type { Sim } from './sim';
import type { Entity } from './state';

const SHELL_FLIGHT_TICKS = Math.round(1.6 * TICK_RATE);
/** Cyclone damage is dealt in pulses (every 0.5 s), not every tick. */
const ZONE_PULSE_TICKS = TICK_RATE / 2;

const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Building powers (Siege Battery's bombardment, Howling Hollow's cyclone): each finished building
 * with a power casts it every `cooldown` seconds on the nearest valid target in range. Targets are
 * chosen deterministically (nearest, ties by entity order), so mirror matches stay mirrored.
 */
export function stepPowers(sim: Sim) {
  const s = sim.state;
  for (const e of s.entities) {
    if (e.kind !== 'building' || e.hp <= 0 || e.buildLeft) continue;
    const p = BUILDINGS[e.type].power;
    if (!p) continue;
    // A fresh building (or a fresh upgrade) needs a full cooldown before its first cast.
    e.abilityCd ??= Math.round(p.cooldown * TICK_RATE);
    if (--e.abilityCd > 0) continue;
    const cast = p.kind === 'bombard' ? bombard(sim, e, p) : cyclone(sim, e, p);
    // Nothing in range: look again in a second.
    e.abilityCd = cast ? Math.round(p.cooldown * TICK_RATE) : TICK_RATE;
  }
  stepShells(sim);
  stepZones(sim);
}

function centre(e: Entity) {
  return { x: e.tx! + e.size! / 2, y: e.ty! + e.size! / 2 };
}

function bombard(sim: Sim, e: Entity, p: PowerDef): boolean {
  const c = centre(e);
  let best: Entity | undefined, bestD = Infinity;
  for (const b of sim.structures()) {
    if (b.team === e.team || b.hp <= 0) continue;
    const d = distToRect(footprint(b), c.x, c.y);
    if (d <= p.range && d < bestD) { best = b; bestD = d; }
  }
  if (!best) return false;
  const at = centre(best);
  (sim.state.shells ??= []).push({ owner: e.owner, team: e.team, x: at.x, y: at.y, radius: p.radius, dmg: p.dmg, ticksLeft: SHELL_FLIGHT_TICKS });
  sim.emit({ t: 'shell', a: e.id, x: r2(at.x), y: r2(at.y), f: SHELL_FLIGHT_TICKS, r: p.radius });
  return true;
}

function cyclone(sim: Sim, e: Entity, p: PowerDef): boolean {
  const c = centre(e);
  let best: Entity | undefined, bestD = Infinity;
  for (const u of sim.hash.query(c.x, c.y, p.range + 1)) {
    if (u.team === e.team || u.hp <= 0 || sim.isAir(u)) continue;
    const d = Math.hypot(u.x - c.x, u.y - c.y);
    if (d <= p.range && d < bestD) { best = u; bestD = d; }
  }
  if (!best) return false;
  const ticks = Math.round((p.duration ?? 6) * TICK_RATE);
  (sim.state.zones ??= []).push({ owner: e.owner, team: e.team, x: best.x, y: best.y, radius: p.radius, dps: p.dmg, slow: p.slow ?? 0, ticksLeft: ticks });
  sim.emit({ t: 'zone', x: r2(best.x), y: r2(best.y), r: p.radius, d: ticks });
  return true;
}

/** Shells land: full siege damage to structures in the blast, half to ground units. */
function stepShells(sim: Sim) {
  const shells = sim.state.shells;
  if (!shells?.length) return;
  for (const sh of shells) {
    if (--sh.ticksLeft > 0) continue;
    for (const b of sim.structures()) {
      if (b.team === sh.team || b.hp <= 0) continue;
      if (distToRect(footprint(b), sh.x, sh.y) <= sh.radius) dealDamage(sim, b, sh.dmg, 'siege', sh.owner);
    }
    for (const u of sim.hash.query(sh.x, sh.y, sh.radius + 1)) {
      if (u.team === sh.team || u.hp <= 0 || sim.isAir(u)) continue;
      if (Math.hypot(u.x - sh.x, u.y - sh.y) - sim.radius(u) <= sh.radius) dealDamage(sim, u, sh.dmg * 0.5, 'siege', sh.owner);
    }
    sim.emit({ t: 'splash', x: r2(sh.x), y: r2(sh.y), r: sh.radius });
  }
  sim.state.shells = shells.filter((sh) => sh.ticksLeft > 0);
}

/** Cyclones hurt enemy ground units inside them (their slow is applied with the auras). */
function stepZones(sim: Sim) {
  const zones = sim.state.zones;
  if (!zones?.length) return;
  for (const z of zones) {
    z.ticksLeft--;
    if (z.ticksLeft % ZONE_PULSE_TICKS !== 0) continue;
    for (const u of sim.hash.query(z.x, z.y, z.radius + 1)) {
      if (u.team === z.team || u.hp <= 0 || sim.isAir(u)) continue;
      if (Math.hypot(u.x - z.x, u.y - z.y) <= z.radius) dealDamage(sim, u, (z.dps * ZONE_PULSE_TICKS) / TICK_RATE, 'magic', z.owner);
    }
  }
  sim.state.zones = zones.filter((z) => z.ticksLeft > 0);
}
