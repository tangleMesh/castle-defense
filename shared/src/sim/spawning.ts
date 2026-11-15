import { FIRST_BUILD_BONUS, TICK_RATE } from '../constants';
import { BUILDINGS, UNITS, teamItemBonus } from '../data';
import { idx, inBounds, nearestFree } from './grid';
import type { Sim } from './sim';
import { sideRandom } from './rng';
import { MAP } from '../map/map';
import type { Entity } from './state';

/** The first three players to finish a building in a round earn a small gold bonus. */
function firstBuildBonus(sim: Sim, e: Entity) {
  const s = sim.state;
  const list = (s.firstBuilds ??= []);
  if (list.length >= FIRST_BUILD_BONUS.length || list.includes(e.owner)) return;
  const p = s.players[e.owner];
  if (!p) return;
  const place = list.length;
  const g = FIRST_BUILD_BONUS[place];
  list.push(e.owner);
  p.gold += g;
  p.goldEarned += g;
  sim.emit({ t: 'first', p: e.owner, place, g });
  sim.emit({ t: 'gold', p: e.owner, g, x: e.x, y: e.y });
}

/** Construction/upgrade progress and periodic unit spawning. */
export function stepBuildings(sim: Sim) {
  // War Drum: spawn timers of the carrier's team run faster (kept integral and deterministic).
  const t = sim.state.tick;
  const step = [0, 1].map((team) => {
    const d = teamItemBonus(sim.state.players, team, 'spawnSpeed');
    // +d ticks per tick on average: one extra tick whenever floor(t·d) steps up.
    return 1 + (Math.floor((t + 1) * d) - Math.floor(t * d));
  });
  // Iterate over a copy: spawning appends to the entity list.
  for (const e of sim.state.entities.slice()) {
    if (e.kind !== 'building' || e.hp <= 0) continue;
    const def = BUILDINGS[e.type];
    if (e.buildLeft && e.buildLeft > 0) {
      e.buildLeft--;
      // Fresh constructions grow from 10% to full HP; upgrades keep their HP ratio.
      if (!e.upgrading) e.hp = Math.min(e.maxHp, e.hp + (e.maxHp * 0.9) / (e.buildTotal || 1));
      if (e.buildLeft === 0) {
        const fresh = !e.upgrading;
        delete e.upgrading;
        sim.emit({ t: 'built', id: e.id });
        if (fresh) firstBuildBonus(sim, e);
        // Each building runs its own training cycle, starting from zero when it is finished.
        if (def.spawn) e.spawnTimer = Math.round(def.spawn.interval * TICK_RATE);
      }
      continue;
    }
    // Living structures (Thornwild) slowly regrow damage.
    if (def.regen && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + def.regen / TICK_RATE);
    if (!def.spawn) continue;
    if (e.spawnTimer === undefined) e.spawnTimer = Math.round(def.spawn.interval * TICK_RATE);
    e.spawnTimer -= step[e.team];
    if (e.spawnTimer > 0) continue;
    e.spawnTimer = Math.round(def.spawn.interval * TICK_RATE);
    for (let i = 0; i < def.spawn.count; i++) spawnUnit(sim, e, def.spawn.unit, i, def.spawn.count);
  }
}

export function spawnUnit(sim: Sim, from: Entity, unitId: string, i: number, n: number): Entity {
  const u = UNITS[unitId];
  const dir = from.team === 0 ? 1 : -1;
  const size = from.size ?? 2;
  let x = from.team === 0 ? from.tx! + size + 0.45 : from.tx! - 0.45;
  // dir * 0.01 keeps spawns off exact tile boundaries in a point-symmetric way (otherwise
  // flooring sends team 0 and team 1 units into tiles that aren't mirror images of each other).
  // Mirrored jitter: team 1 gets the mirror image of what team 0 would get from the same spot.
  const rx = from.team === 0 ? from.tx! : MAP.width - size - from.tx!;
  const ry = from.team === 0 ? from.ty! : MAP.height - size - from.ty!;
  const jitter = sideRandom(sim.state, rx * 131 + ry * 7919 + i * 31) - 0.5;
  let y = from.ty! + size / 2 + dir * (i - (n - 1) / 2) * 0.7 + dir * 0.01 + dir * jitter * 0.2;
  if (!u.air) {
    const g = sim.blockedGrid;
    const tx = Math.floor(x), ty = Math.floor(y);
    if (!inBounds(tx, ty) || g[idx(tx, ty)] !== 0) {
      const f = nearestFree(g, x + dir * 0.5, y);
      x = f.x; y = f.y;
    }
  }
  return sim.add({
    kind: 'unit', type: unitId, owner: from.owner, team: from.team,
    x, y, hp: u.hp, maxHp: u.hp, cd: 0, healCd: 0,
  });
}
