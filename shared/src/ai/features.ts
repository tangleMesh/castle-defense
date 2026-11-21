import { BUILDINGS, UNITS } from '../data';
import { MAP, rectCenter } from '../map/map';
import { incomeFor } from '../sim/economy';
import { KIND_CODES } from '../sim/snapshot';
import { entityVisible } from '../sim/vision';
import type { Sim } from '../sim/sim';
import { START_LUMBER, START_SAPPHIRES, TICK_RATE } from '../constants';
import { buildCategory, teamVision, type BuildCategory } from './ai';

/** Building categories in model order (policy outputs, value features). */
export const CATEGORIES: BuildCategory[] = ['melee', 'ranged', 'air', 'swarm', 'siege', 'tower', 'aura', 'eco', 'upgrade', 'special'];
export const FEATURE_COUNT = 30;

/**
 * The game as one player sees it, as numbers for the learned models: own economy, base and army in
 * full, the enemy only as far as the team can see (fog of war), so bots learn from and act on the
 * same information a human has. Roughly scaled to [0, 1].
 */
export function observedFeatures(sim: Sim, player: number): number[] {
  const s = sim.state, me = s.players[player], team = me.team;
  const vision = teamVision(sim, team);
  const own = new Array<number>(CATEGORIES.length).fill(0);
  const c = rectCenter(MAP.castles[team]);
  let ownUnits = 0, ownHp = 0, forward = 0, foes = 0, foeHp = 0, foeAir = 0, foeValue = 0, foeTowers = 0, threat = 0;
  let ownLegendary = 0, foeLegendary = 0;
  for (const e of s.entities) {
    if (e.hp <= 0 || e.kind === 'castle') continue;
    if (e.team === team) {
      if (e.kind === 'building' && e.owner === player) {
        const d = BUILDINGS[e.type];
        own[CATEGORIES.indexOf(buildCategory(d, !!d.upgradeOnly))] += (e.value ?? d.cost) / 2000;
        if (d.special) ownLegendary = 1;
      } else if (e.kind === 'unit' && e.owner === player) {
        ownUnits++; ownHp += e.hp;
        if (team === 0 ? e.x > MAP.width / 2 : e.x < MAP.width / 2) forward++;
      }
      continue;
    }
    if (!entityVisible(vision, KIND_CODES.indexOf(e.kind), e.type, e.x, e.y)) continue;
    if (e.kind === 'unit') {
      foes++; foeHp += e.hp;
      if (UNITS[e.type]?.air) foeAir++;
      if (Math.hypot(e.x - c.x, e.y - c.y) < 18) threat++;
    } else if (e.kind === 'building') {
      const d = BUILDINGS[e.type];
      foeValue += e.value ?? d.cost;
      if (d.attack) foeTowers++;
      if (d.special) foeLegendary = 1;
    }
  }
  const mine = sim.castle(team), theirs = sim.castle((1 - team) as 0 | 1);
  return [
    s.round / 5,
    (s.tick - s.roundStartTick) / TICK_RATE / 60 / 20,
    me.gold / 1000,
    (me.lumber ?? START_LUMBER) / 1000,
    incomeFor(sim, player) / 40,
    mine ? mine.hp / mine.maxHp : 0,
    theirs ? theirs.hp / theirs.maxHp : 0,
    (s.score[team] - s.score[1 - team]) / 3,
    ...own,
    ownUnits / 40, ownHp / 10000,
    foes / 40, foeHp / 10000, foes ? foeAir / foes : 0, foeValue / 5000, foeTowers / 5,
    me.sapphires ?? START_SAPPHIRES, ownLegendary, foeLegendary,
    threat / 20, forward / 20,
  ];
}
