import { CASTLE_HP, CASTLE_SIZE, INCOME_INTERVAL_TICKS, ROUND_END_TICKS, START_GOLD, START_LUMBER, START_SAPPHIRES } from '../constants';
import { MAP, rectCenter } from '../map/map';
import { FACTION_IDS } from '../data';
import { nextRandom } from './rng';
import type { Sim } from './sim';
import { matchStats, type Team } from './state';

/** Wipe the battlefield and start a fresh round: castles, new builders, gold, rescue strikes. */
export function startRound(sim: Sim) {
  const s = sim.state;
  s.round++;
  s.firstBuilds = [];
  delete s.firstBuildTie;
  drawFactions(sim);
  s.entities = [];
  s.strikes = [];
  s.shells = [];
  s.zones = [];
  s.teamBuffs = [];
  s.mines = [];
  s.phase = 'playing';
  s.phaseTicks = s.countdownTicks ?? 0;
  // The round's clock starts when the countdown ends.
  s.roundStartTick = s.tick + s.phaseTicks;
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
      // Point-symmetric map: team 1's builders stand in the mirror image of team 0's.
      x: c.x + dir * 3.5, y: c.y + dir * (slot - 1.5), hp: 1, maxHp: 1, orders: [],
    });
    p.builderId = builder.id;
    // Every round's scoreboard starts from zero; the match totals keep the earlier rounds.
    if (s.round > 1) {
      p.past = matchStats(p);
      p.kills = 0; p.strikes = 0; p.goldEarned = 0; p.lost = 0; p.castleDmg = 0;
    }
    p.gold = START_GOLD;
    p.rescueUsed = false;
    p.items = [];
    p.sapphires = START_SAPPHIRES;
    p.lumber = START_LUMBER;
    p.itemReady = {};
    delete p.orbCd;
  }
}

/**
 * Random modes draw this round's factions (seeded, so deterministic), never one faction twice in a
 * team. Random: each team draws on its own. Mirror: one draw, and the n-th player of each team
 * gets the n-th faction, so both teams field the same builders.
 */
function drawFactions(sim: Sim) {
  const s = sim.state;
  if (s.mode !== 'random' && s.mode !== 'mirror') return;
  const draw = (n: number) => {
    const pool = [...FACTION_IDS], out: typeof pool = [];
    for (let k = 0; k < n && pool.length; k++) out.push(pool.splice(Math.floor(nextRandom(s) * pool.length), 1)[0]);
    return out;
  };
  const teams = ([0, 1] as Team[]).map((t) => s.players.filter((p) => p.team === t));
  if (s.mode === 'mirror') {
    const set = draw(Math.max(teams[0].length, teams[1].length));
    for (const members of teams) members.forEach((p, k) => { p.faction = set[k]; });
  } else {
    for (const members of teams) { const set = draw(members.length); members.forEach((p, k) => { p.faction = set[k]; }); }
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
  s.rounds.push({
    winner, ticks: s.tick - s.roundStartTick,
    players: s.players.map((p) => ({ faction: p.faction, kills: p.kills, strikes: p.strikes, goldEarned: Math.floor(p.goldEarned), lost: p.lost ?? 0, castleDmg: Math.round(p.castleDmg ?? 0) })),
  });
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
