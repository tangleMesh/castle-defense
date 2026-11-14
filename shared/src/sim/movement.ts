import { BUILDER_REACH, BUILDER_SPEED, TICK_RATE } from '../constants';
import { BUILDINGS, UNITS } from '../data';
import { MAP, rectCenter } from '../map/map';
import { footprint, idx, inBounds, flowStep, nearestFree } from './grid';
import { placementError } from './placement';
import type { Sim } from './sim';
import type { Entity, Team } from './state';

const blockedAt = (g: Uint8Array, x: number, y: number) => {
  const tx = Math.floor(x), ty = Math.floor(y);
  return !inBounds(tx, ty) || g[idx(tx, ty)] !== 0;
};

export function nearestPointOn(structure: Entity, x: number, y: number) {
  const r = footprint(structure);
  return {
    x: Math.min(Math.max(x, r.x), r.x + r.w),
    y: Math.min(Math.max(y, r.y), r.y + r.h),
  };
}

/** Move `e` toward (x,y) by up to `step` tiles, sliding along blocked tiles (ground units). */
export function moveToward(sim: Sim, e: Entity, x: number, y: number, step: number) {
  const dx = x - e.x, dy = y - e.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) return;
  const k = Math.min(step, d) / d;
  const nx = e.x + dx * k, ny = e.y + dy * k;
  if (sim.isAir(e) || e.kind === 'builder') { e.x = nx; e.y = ny; return; }
  const g = sim.blockedGrid;
  if (!blockedAt(g, nx, ny)) { e.x = nx; e.y = ny; return; }
  // Path blocked: if chasing something, fall back to the flow field which knows a way around.
  if (!blockedAt(g, nx, e.y)) e.x = nx;
  else if (!blockedAt(g, e.x, ny)) e.y = ny;
  else followFlow(sim, e, step);
}

/** Advance along the team's flow field towards the enemy castle. */
export function followFlow(sim: Sim, e: Entity, step: number) {
  const enemy = (1 - e.team) as Team;
  const goal = rectCenter(MAP.castles[enemy]);
  if (sim.isAir(e)) { moveToward(sim, e, goal.x, goal.y, step); return; }
  const g = sim.blockedGrid;
  const next = flowStep(sim.flowField(e.team), g, Math.floor(e.x), Math.floor(e.y));
  const tx = next ? next.x : goal.x;
  const ty = next ? next.y : goal.y;
  const dx = tx - e.x, dy = ty - e.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) return;
  const k = Math.min(step, d) / d;
  const nx = e.x + dx * k, ny = e.y + dy * k;
  if (!blockedAt(g, nx, ny)) { e.x = nx; e.y = ny; }
  else if (!blockedAt(g, nx, e.y)) e.x = nx;
  else if (!blockedAt(g, e.x, ny)) e.y = ny;
}

/** Builders walk to their move target or to the next build site and place foundations. */
export function stepBuilders(sim: Sim) {
  const step = BUILDER_SPEED / TICK_RATE;
  for (const p of sim.state.players) {
    const b = sim.get(p.builderId);
    if (!b) continue;
    const order = b.orders?.[0];
    if (order) {
      const def = BUILDINGS[order.building];
      const cx = order.tx + def.size / 2, cy = order.ty + def.size / 2;
      if (Math.hypot(cx - b.x, cy - b.y) > BUILDER_REACH) { moveToward(sim, b, cx, cy, step); continue; }
      b.orders!.shift();
      const err = placementError(sim, p.index, def.id, order.tx, order.ty, order);
      if (err) {
        p.gold += order.paid;
        sim.emit({ t: 'err', p: p.index, msg: `${def.name}: ${err}` });
        continue;
      }
      const total = Math.round(def.buildTime * TICK_RATE);
      sim.add({
        kind: 'building', type: def.id, owner: p.index, team: p.team,
        x: cx, y: cy, tx: order.tx, ty: order.ty, size: def.size,
        hp: def.hp * 0.1, maxHp: def.hp, buildLeft: total, buildTotal: total, value: def.cost, cd: 0,
      });
      continue;
    }
    if (b.moveX !== undefined && b.moveY !== undefined) {
      moveToward(sim, b, b.moveX, b.moveY, step);
      if (Math.hypot(b.moveX - b.x, b.moveY - b.y) < 0.05) { delete b.moveX; delete b.moveY; }
    }
  }
}

/** Separation between overlapping units, un-sticking from blocked tiles and map clamping. */
export function stepUnitMovementPost(sim: Sim) {
  const g = sim.blockedGrid;
  const units = sim.state.entities.filter((e) => e.kind === 'unit' && e.hp > 0);
  sim.hash.rebuild(units);
  for (const a of units) {
    const ra = UNITS[a.type].radius;
    const airA = !!UNITS[a.type].air;
    for (const b of sim.hash.query(a.x, a.y, ra + 0.9)) {
      if (b.id <= a.id) continue;
      if (airA !== !!UNITS[b.type].air) continue;
      const rb = UNITS[b.type].radius;
      let dx = b.x - a.x, dy = b.y - a.y;
      let d = Math.hypot(dx, dy);
      const overlap = ra + rb - d;
      if (overlap <= 0) continue;
      if (d < 1e-4) { dx = ((a.id * 7919) % 13) / 13 - 0.5; dy = ((b.id * 104729) % 17) / 17 - 0.5; d = Math.hypot(dx, dy) || 1; }
      // Allies push each other gently; enemies hold their ground more.
      const push = (overlap * (a.team === b.team ? 0.5 : 0.35)) / d;
      tryShift(g, a, -dx * push, -dy * push, airA);
      tryShift(g, b, dx * push, dy * push, airA);
    }
  }
  for (const u of units) {
    if (!UNITS[u.type].air && blockedAt(g, u.x, u.y)) {
      const f = nearestFree(g, u.x, u.y);
      u.x = f.x; u.y = f.y;
    }
    u.x = Math.min(Math.max(u.x, 0.2), MAP.width - 0.2);
    u.y = Math.min(Math.max(u.y, 0.2), MAP.height - 0.2);
  }
}

function tryShift(g: Uint8Array, e: Entity, dx: number, dy: number, air: boolean) {
  const nx = e.x + dx, ny = e.y + dy;
  if (air || !blockedAt(g, nx, ny)) { e.x = nx; e.y = ny; }
}
