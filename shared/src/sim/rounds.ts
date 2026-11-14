import { CASTLE_HP, CASTLE_SIZE, INCOME_INTERVAL_TICKS, ROUND_END_TICKS, START_GOLD } from '../constants';
import { MAP, rectCenter } from '../map/map';
import type { Sim } from './sim';
import type { Team } from './state';

/** Wipe the battlefield and start a fresh round: castles, new builders, gold, rescue strikes. */
export function startRound(sim: Sim) {
  const s = sim.state;
  s.round++;
  s.entities = [];
  s.strikes = [];
  s.phase = 'playing';
  s.phaseTicks = 0;
  s.roundStartTick = s.tick;
  s.incomeTicks = INCOME_INTERVAL_TICKS;
  sim.reindex();

  for (const team of [0, 1] as Team[]) {
    const r = MAP.castles[team];
    const c = rectCenter(r);
    const castle = sim.add({
      kind: 'castle', type: 'castle', owner: -1, team, x: c.x, y: c.y,
      hp: CASTLE_HP, maxHp: CASTLE_HP, tx: r.x, ty: r.y, size: CASTLE_SIZE, buildLeft: 0, buildTotal: 0, cd: 0,
    });
    s.castleIds[team] = castle.id;
  }

  const perTeam: [number, number] = [0, 0];
  for (const p of s.players) {
    const c = rectCenter(MAP.castles[p.team]);
    const slot = perTeam[p.team]++;
    const dir = p.team === 0 ? 1 : -1;
    const builder = sim.add({
      kind: 'builder', type: 'builder', owner: p.index, team: p.team,
      x: c.x + dir * 3.5, y: c.y - 1.5 + slot, hp: 1, maxHp: 1, orders: [],
    });
    p.builderId = builder.id;
    p.gold = START_GOLD;
    p.rescueUsed = false;
    p.items = [];
  }
}

/** Countdown between rounds; starts the next round when it expires. */
export function stepPhase(sim: Sim) {
  const s = sim.state;
  if (s.phase === 'roundOver') {
    if (--s.phaseTicks <= 0) startRound(sim);
  }
}

export function checkRoundEnd(sim: Sim) {
  const s = sim.state;
  if (s.phase !== 'playing') return;
  const dead = ([0, 1] as Team[]).filter((t) => sim.castle(t).hp <= 0);
  if (!dead.length) return;
  // Both castles fell on the same tick: the one with less HP left loses (team 0 on an exact tie).
  const loser: Team = dead.length === 2 ? (sim.castle(0).hp <= sim.castle(1).hp ? 0 : 1) : dead[0];
  const winner = (1 - loser) as Team;
  s.score[winner]++;
  s.rounds.push({ winner, ticks: s.tick - s.roundStartTick });
  const needed = Math.floor(s.bestOf / 2) + 1;
  if (s.score[winner] >= needed) {
    s.phase = 'matchOver';
    s.winner = winner;
    sim.emit({ t: 'match', winner, score: [s.score[0], s.score[1]] });
  } else {
    s.phase = 'roundOver';
    s.phaseTicks = ROUND_END_TICKS;
    sim.emit({ t: 'round', winner, score: [s.score[0], s.score[1]], round: s.round });
  }
}
