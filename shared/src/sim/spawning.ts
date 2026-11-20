import { GOLD_FACTOR, FIRST_BUILD_BONUS, START_LUMBER, TICK_RATE } from '../constants';
import { BUILDINGS, UNITS, teamItemBonus } from '../data';
import { idx, inBounds, nearestFree } from './grid';
import type { Sim } from './sim';
import { sideRandom, chanceRoll } from './rng';
import { MAP } from '../map/map';
import type { Entity } from './state';

/**
 * The first three players to finish a building in a round earn a small gold bonus. Players who
 * finish on the same tick share the place (otherwise the player processed first, always the left
 * side in a mirror match, got 5 gold more every round).
 */
function firstBuildBonus(sim: Sim, e: Entity) {
  const s = sim.state;
  const list = (s.firstBuilds ??= []);
  if (list.includes(e.owner)) return;
  const p = s.players[e.owner];
  if (!p) return;
  const tie = s.firstBuildTie?.tick === s.tick;
  const place = tie ? s.firstBuildTie!.place : list.length;
  if (place >= FIRST_BUILD_BONUS.length) return;
  if (!tie) s.firstBuildTie = { tick: s.tick, place };
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
        // Lumber for every finished building and upgrade: its value (gold invested so far), as in the map.
        const gain = def.lumberGain ?? (def.special || def.attack || def.treasure || def.lumber ? 0 : 1);
        const owner = sim.state.players[e.owner];
        if (owner && gain > 0) owner.lumber = (owner.lumber ?? START_LUMBER) + Math.round(((e.value ?? def.cost) / GOLD_FACTOR) * gain);
        if (fresh) firstBuildBonus(sim, e);
        // Each building runs its own training cycle, starting from zero when it is finished.
        if (def.spawn) e.spawnTimer = Math.round(def.spawn.interval * TICK_RATE);
      }
      continue;
    }
    // Frozen (frost bolt): no training, regrowth, shooting or casting until it thaws.
    if (e.stun) { e.stun--; continue; }
    // Living structures (Thornwild) slowly regrow damage.
    if (def.regen && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + def.regen / TICK_RATE);
    if (!def.spawn) continue;
    if (e.spawnTimer === undefined) e.spawnTimer = Math.round(def.spawn.interval * TICK_RATE);
    e.spawnTimer -= step[e.team];
    if (e.spawnTimer > 0) continue;
    e.spawnTimer = Math.round(def.spawn.interval * TICK_RATE);
    const sp = def.spawn;
    const half = (e.size ?? 2) / 2, at = { x: e.tx! + half, y: e.ty! + half, team: e.team };
    for (let i = 0; i < sp.count; i++) {
      // A random kind from the pool (raised skeletons), seeded and side-symmetric.
      const kind = sp.pool ? sp.pool[Math.floor(chanceRoll(sim.state, at, 50 + i) * sp.pool.length)] : sp.unit;
      const u = spawnUnit(sim, e, kind, i, sp.count + (sp.extra ? 1 : 0));
      if (sp.ttl) u.ttl = Math.round(sp.ttl * TICK_RATE);
    }
    // Call to Arms (Heroic Shrine): a chance that an extra unit is trained for the shrine's owner
    // (a second shrine of the team stacks once; never legendary units or summons).
    if (!def.special && !sp.ttl) {
      const shrines = sim.state.entities.filter((b) => b.kind === 'building' && b.team === e.team && b.hp > 0 && !b.buildLeft && BUILDINGS[b.type].callToArms);
      if (shrines.length) {
        const p = 1 - Math.pow(1 - BUILDINGS[shrines[0].type].callToArms!, Math.min(2, shrines.length));
        if (chanceRoll(sim.state, at, 60) < p) {
          const extra = spawnUnit(sim, e, sp.unit, sp.count, sp.count + 1);
          extra.owner = shrines[0].owner;
          sim.emit({ t: 'revive', id: extra.id });
        }
      }
    }
    if (def.spawn.extra) spawnUnit(sim, e, def.spawn.extra, def.spawn.count, def.spawn.count + 1);
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
  const e = sim.add({
    kind: 'unit', type: unitId, owner: from.owner, team: from.team,
    x, y, hp: u.hp, maxHp: u.hp, cd: 0, healCd: 0,
  });
  // A powered building trains stronger units (+100 HP; +2 armor and +20% damage in combat).
  if (from.powered) { e.hp += 100; e.maxHp += 100; e.powered = true; }
  // Chaos spawns (Blood Fiends) roll a random armour type and perk (seeded, side-symmetric).
  if (u.chaosSpawn) {
    const r = sideRandom(sim.state, rx * 977 + ry * 131 + i * 17 + 5);
    const types = ['light', 'medium', 'heavy', 'unarmored'] as const, perks = ['crit', 'evade', 'demolish'] as const;
    e.armorType = types[Math.floor(r * types.length)];
    e.blessed = { dmg: 0, haste: 0, armor: 0, perk: perks[Math.floor((r * 12) % 3)] };
  }
  return e;
}

/** A unit calls helpers to its side (Grove Keeper's treants); they fade after `ttl` seconds. */
export function summonUnits(sim: Sim, from: Entity, sm: { unit: string; count: number; ttl: number }) {
  const u = UNITS[sm.unit];
  const dir = from.team === 0 ? 1 : -1;
  for (let i = 0; i < sm.count; i++) {
    let x = from.x + dir * 0.6, y = from.y + dir * (i - (sm.count - 1) / 2) * 0.7;
    if (!u.air) {
      const tx = Math.floor(x), ty = Math.floor(y);
      if (!inBounds(tx, ty) || sim.blockedGrid[idx(tx, ty)] !== 0) ({ x, y } = nearestFree(sim.blockedGrid, x, y));
    }
    sim.add({
      kind: 'unit', type: sm.unit, owner: from.owner, team: from.team,
      x, y, hp: u.hp, maxHp: u.hp, cd: 0, healCd: 0, ttl: Math.round(sm.ttl * TICK_RATE),
    });
  }
}
