import { TICK_RATE } from '../constants';
import { BUILDINGS, UNITS, type PowerDef } from '../data';
import { distToRect } from '../map/map';
import { dealDamage, rewardKill } from './combat';
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
    if (e.kind !== 'building' || e.hp <= 0 || e.buildLeft || e.stun) continue;
    const def = BUILDINGS[e.type];
    if (def.mend) mend(sim, e, def.mend.hps, def.mend.radius);
    const p = def.power;
    if (!p) continue;
    // A fresh building (or a fresh upgrade) needs a full cooldown before its first cast.
    e.abilityCd ??= Math.round(p.cooldown * TICK_RATE);
    if (--e.abilityCd > 0) continue;
    const cast = p.kind === 'bombard' ? bombard(sim, e, p) : p.kind === 'stasis' ? stasis(sim, e, p) : p.kind === 'hex' ? hex(sim, e, p) : p.kind === 'beam' ? beam(sim, e, p) : p.kind === 'slay' ? slay(sim, e, p) : p.kind === 'chaos' ? chaos(sim, e, p) : p.kind === 'erase' ? erase(sim, e, p) : p.kind === 'charm' ? charm(sim, e, p) : p.kind === 'wave' ? wave(sim, e, p) : p.kind === 'tentacles' ? tentacles(sim, e, p) : cyclone(sim, e, p);
    // Nothing in range: look again in a second.
    e.abilityCd = cast ? Math.round(p.cooldown * TICK_RATE) : TICK_RATE;
  }
  stepShells(sim);
  stepZones(sim);
}

/** Mending buildings (Spare Part Heap): own-team structures nearby regain HP, never the mender itself. */
function mend(sim: Sim, e: Entity, hps: number, radius: number) {
  const c = centre(e);
  const sparkle = (sim.state.tick + e.id) % TICK_RATE === 0;
  for (const b of sim.structures()) {
    if (b === e || b.team !== e.team || b.hp <= 0 || b.buildLeft || b.hp >= b.maxHp) continue;
    if (distToRect(footprint(b), c.x, c.y) > radius) continue;
    b.hp = Math.min(b.maxHp, b.hp + hps / TICK_RATE);
    if (sparkle) sim.emit({ t: 'heal', a: e.id, b: b.id });
  }
}

/** How far a power reaches: the whole map for global powers. */
const reach = (p: PowerDef) => (p.global ? Infinity : p.range);
/** Candidate targets within `range` of `c` (every entity for a global power). */
function around(sim: Sim, c: { x: number; y: number }, range: number): Iterable<Entity> {
  return range === Infinity ? sim.state.entities : sim.hash.query(c.x, c.y, range + 1);
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
    if (d <= reach(p) && d < bestD) { best = b; bestD = d; }
  }
  if (!best) return false;
  const at = centre(best);
  (sim.state.shells ??= []).push({ owner: e.owner, team: e.team, x: at.x, y: at.y, radius: p.radius, dmg: p.dmg, ticksLeft: SHELL_FLIGHT_TICKS, ...(p.freeze ? { freeze: Math.round(p.freeze * TICK_RATE) } : {}) });
  sim.emit({ t: 'shell', a: e.id, x: r2(at.x), y: r2(at.y), f: SHELL_FLIGHT_TICKS, r: p.radius });
  return true;
}

function cyclone(sim: Sim, e: Entity, p: PowerDef): boolean {
  const c = centre(e);
  let best: Entity | undefined, bestD = Infinity;
  for (const u of around(sim, c, reach(p))) {
    if (u.team === e.team || u.hp <= 0 || u.hidden || sim.isAir(u) !== !!p.air) continue;
    const d = Math.hypot(u.x - c.x, u.y - c.y);
    if (d <= reach(p) && d < bestD) { best = u; bestD = d; }
  }
  if (!best) return false;
  const ticks = Math.round((p.duration ?? 6) * TICK_RATE);
  (sim.state.zones ??= []).push({ owner: e.owner, team: e.team, x: best.x, y: best.y, radius: p.radius, dps: p.dmg, slow: p.slow ?? 0, ticksLeft: ticks, ...(p.air ? { air: true } : {}) });
  sim.emit({ t: 'zone', x: r2(best.x), y: r2(best.y), r: p.radius, d: ticks, ...(p.air ? { air: 1 as const } : {}) });
  return true;
}

/** Stasis: every enemy unit within range is stunned (only cast when at least one is there). */
function stasis(sim: Sim, e: Entity, p: PowerDef): boolean {
  const c = centre(e);
  const ticks = Math.round((p.duration ?? 3) * TICK_RATE);
  let any = false;
  for (const u of sim.hash.query(c.x, c.y, p.range + 1)) {
    if (u.team === e.team || u.hp <= 0 || u.hidden || u.kind !== 'unit' || Math.hypot(u.x - c.x, u.y - c.y) > p.range) continue;
    u.stun = Math.max(u.stun ?? 0, ticks);
    any = true;
  }
  if (any) sim.emit({ t: 'stasis', x: r2(c.x), y: r2(c.y), r: p.range });
  return any;
}

/** Hex: the toughest enemy unit in range (ties: nearest, then oldest) becomes a harmless critter for a while. */
function hex(sim: Sim, e: Entity, p: PowerDef): boolean {
  const c = centre(e);
  let best: Entity | undefined, bestHp = -1, bestD = Infinity;
  for (const u of sim.hash.query(c.x, c.y, p.range + 1)) {
    if (u.team === e.team || u.hp <= 0 || u.hidden || u.kind !== 'unit' || (u.stun ?? 0) > 0 || (p.air && !sim.isAir(u))) continue;
    const d = Math.hypot(u.x - c.x, u.y - c.y);
    if (d > p.range) continue;
    if (u.maxHp > bestHp || (u.maxHp === bestHp && d < bestD)) { best = u; bestHp = u.maxHp; bestD = d; }
  }
  if (!best) return false;
  const ticks = Math.round((p.duration ?? 5) * TICK_RATE);
  best.stun = ticks;
  sim.emit({ t: 'hex', id: best.id, d: ticks });
  if (p.dmg) dealDamage(sim, best, p.dmg, 'magic', e.owner);
  return true;
}

/** Light beam: the nearest enemy unit in range takes magic damage at once. */
function beam(sim: Sim, e: Entity, p: PowerDef): boolean {
  const c = centre(e);
  let best: Entity | undefined, bestD = Infinity;
  for (const u of sim.hash.query(c.x, c.y, p.range + 1)) {
    if (u.team === e.team || u.hp <= 0 || u.hidden || u.kind !== 'unit') continue;
    const d = Math.hypot(u.x - c.x, u.y - c.y);
    if (d <= p.range && d < bestD) { best = u; bestD = d; }
  }
  if (!best) return false;
  sim.emit({ t: 'beam', a: e.id, b: best.id });
  dealDamage(sim, best, p.dmg, 'magic', e.owner);
  return true;
}

/** Sudden death: the nearest enemy unit in range that isn't too strong (max HP ≤ dmg) dies at once. */
function slay(sim: Sim, e: Entity, p: PowerDef): boolean {
  const c = centre(e);
  let best: Entity | undefined, bestD = Infinity;
  for (const u of around(sim, c, reach(p))) {
    if (u.team === e.team || u.hp <= 0 || u.hidden || u.kind !== 'unit' || u.maxHp > p.dmg) continue;
    const d = Math.hypot(u.x - c.x, u.y - c.y);
    if (d <= reach(p) && d < bestD) { best = u; bestD = d; }
  }
  if (!best) return false;
  sim.emit({ t: 'slay', a: e.id, b: best.id });
  best.hp = 0;
  rewardKill(sim, best, e.owner);
  return true;
}

function nearestEnemyUnit(sim: Sim, e: Entity, range: number): Entity | undefined {
  const c = centre(e);
  let best: Entity | undefined, bestD = Infinity;
  for (const u of around(sim, c, range)) {
    if (u.team === e.team || u.hp <= 0 || u.hidden || u.kind !== 'unit') continue;
    const d = Math.hypot(u.x - c.x, u.y - c.y);
    if (d <= range && d < bestD) { best = u; bestD = d; }
  }
  return best;
}

/**
 * Present of chaos: the nearest enemy unit suffers the next of four fates (the building counts its
 * casts, so it is deterministic and mirror matches stay mirrored): a blast, a stun, death, nothing.
 */
function chaos(sim: Sim, e: Entity, p: PowerDef): boolean {
  const t = nearestEnemyUnit(sim, e, reach(p));
  if (!t) return false;
  const fate = (e.revives = (e.revives ?? 0) + 1) % 4;
  if (fate === 1) { sim.emit({ t: 'beam', a: e.id, b: t.id }); dealDamage(sim, t, p.dmg, 'magic', e.owner); }
  else if (fate === 2) { t.stun = Math.max(t.stun ?? 0, Math.round((p.duration ?? 4) * TICK_RATE)); sim.emit({ t: 'hex', id: t.id, d: t.stun }); dealDamage(sim, t, p.dmg / 3, 'magic', e.owner); }
  else if (fate === 3) {
    sim.emit({ t: 'slay', a: e.id, b: t.id });
    if (t.maxHp <= p.dmg * 1.5) { t.hp = 0; rewardKill(sim, t, e.owner); } else dealDamage(sim, t, p.dmg, 'magic', e.owner);
  }
  return true;
}

/** Erase: every enemy unit of the most numerous type in range dies (strong types are immune). */
function erase(sim: Sim, e: Entity, p: PowerDef): boolean {
  const c = centre(e);
  const count = new Map<string, Entity[]>();
  for (const u of sim.hash.query(c.x, c.y, p.range + 1)) {
    if (u.team === e.team || u.hp <= 0 || u.hidden || u.kind !== 'unit' || u.maxHp > p.dmg || Math.hypot(u.x - c.x, u.y - c.y) > p.range) continue;
    const list = count.get(u.type) ?? [];
    list.push(u); count.set(u.type, list);
  }
  let best: Entity[] = [], bestType = '';
  for (const [type, list] of count) if (list.length > best.length || (list.length === best.length && type < bestType)) { best = list; bestType = type; }
  if (!best.length) return false;
  for (const u of best) { sim.emit({ t: 'slay', a: e.id, b: u.id }); u.hp = 0; rewardKill(sim, u, e.owner); }
  return true;
}

/** Control: the nearest enemy unit that isn't too strong changes sides (owner and team) for good. */
function charm(sim: Sim, e: Entity, p: PowerDef): boolean {
  const c = centre(e);
  let best: Entity | undefined, bestD = Infinity;
  for (const u of around(sim, c, reach(p))) {
    if (u.team === e.team || u.hp <= 0 || u.hidden || u.kind !== 'unit' || u.maxHp > p.dmg || u.ttl !== undefined) continue;
    const d = Math.hypot(u.x - c.x, u.y - c.y);
    if (d <= reach(p) && d < bestD) { best = u; bestD = d; }
  }
  if (!best) return false;
  best.owner = e.owner; best.team = e.team;
  delete best.targetId; delete best.poison; delete best.stun;
  sim.emit({ t: 'charm', id: best.id });
  return true;
}

/** Tsunami: a wave rolls from the building towards the nearest enemy unit and hits every ground enemy in its path. */
function wave(sim: Sim, e: Entity, p: PowerDef): boolean {
  const c = centre(e);
  const t = nearestEnemyUnit(sim, e, p.range);
  if (!t) return false;
  const dx = t.x - c.x, dy = t.y - c.y, len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const ex = c.x + ux * p.range, ey = c.y + uy * p.range;
  for (const u of sim.state.entities) {
    if (u.kind !== 'unit' || u.team === e.team || u.hp <= 0 || u.hidden || sim.isAir(u)) continue;
    const along = (u.x - c.x) * ux + (u.y - c.y) * uy;
    if (along < 0 || along > p.range) continue;
    const off = Math.abs((u.x - c.x) * uy - (u.y - c.y) * ux);
    if (off <= p.radius + sim.radius(u)) dealDamage(sim, u, p.dmg, 'magic', e.owner);
  }
  sim.emit({ t: 'wave', x: r2(c.x), y: r2(c.y), x2: r2(ex), y2: r2(ey), r: p.radius });
  return true;
}

/** Tentacle prison: summoned units burst from the ground in a ring around the nearest enemy unit. */
function tentacles(sim: Sim, e: Entity, p: PowerDef): boolean {
  const t = nearestEnemyUnit(sim, e, reach(p));
  if (!t || sim.isAir(t) || !p.unit) return false;
  const def = UNITS[p.unit], n = p.count ?? 4;
  const ttl = Math.round((p.duration ?? 10) * TICK_RATE);
  for (let k = 0; k < n; k++) {
    // Point-symmetric ring: team 1's ring is the mirror image of team 0's.
    const a = (k / n) * Math.PI * 2 + (e.team === 0 ? 0 : Math.PI);
    sim.add({ kind: 'unit', type: p.unit, owner: e.owner, team: e.team, x: t.x + Math.cos(a) * p.radius, y: t.y + Math.sin(a) * p.radius, hp: def.hp, maxHp: def.hp, cd: 0, healCd: 0, ttl });
  }
  sim.emit({ t: 'splash', x: r2(t.x), y: r2(t.y), r: p.radius });
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
      if (distToRect(footprint(b), sh.x, sh.y) > sh.radius) continue;
      dealDamage(sim, b, sh.dmg, 'siege', sh.owner);
      if (sh.freeze && b.kind === 'building') b.stun = Math.max(b.stun ?? 0, sh.freeze);
    }
    for (const u of sim.hash.query(sh.x, sh.y, sh.radius + 1)) {
      if (u.team === sh.team || u.hp <= 0 || sim.isAir(u)) continue;
      if (Math.hypot(u.x - sh.x, u.y - sh.y) - sim.radius(u) > sh.radius) continue;
      dealDamage(sim, u, sh.dmg * 0.5, 'siege', sh.owner);
      if (sh.freeze) u.stun = Math.max(u.stun ?? 0, Math.round(sh.freeze / 3));
    }
    sim.emit({ t: 'splash', x: r2(sh.x), y: r2(sh.y), r: sh.radius });
  }
  sim.state.shells = shells.filter((sh) => sh.ticksLeft > 0);
}

/** Cyclones hurt enemy ground units inside them, meteor showers flyers (their slow is applied with the auras). */
function stepZones(sim: Sim) {
  const zones = sim.state.zones;
  if (!zones?.length) return;
  for (const z of zones) {
    z.ticksLeft--;
    if (z.ticksLeft % ZONE_PULSE_TICKS !== 0) continue;
    for (const u of sim.hash.query(z.x, z.y, z.radius + 1)) {
      if (u.team === z.team || u.hp <= 0 || sim.isAir(u) !== !!z.air) continue;
      if (Math.hypot(u.x - z.x, u.y - z.y) <= z.radius) dealDamage(sim, u, (z.dps * ZONE_PULSE_TICKS) / TICK_RATE, 'magic', z.owner);
    }
  }
  sim.state.zones = zones.filter((z) => z.ticksLeft > 0);
}
