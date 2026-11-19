/**
 * Simulation lab: headless bot-vs-bot matches on the real simulation (no network, no rendering).
 * The building block for balance matrices, AI arenas and tuning — see server/scripts/lab/.
 */
import { AI_INCOME, AiPlayer, makeBotId, type AiLevel, type Profile } from '../ai/ai';
import { TICK_RATE } from '../constants';
import { BUILDINGS, type FactionId } from '../data';
import { Sim } from '../sim/sim';
import { matchStats, type PlayerCommand, type Team } from '../sim/state';

export interface LabPlayer {
  faction: FactionId;
  level: AiLevel;
  /** Profile overrides for this bot (an AI variant). */
  profile?: Partial<Profile>;
  /** Free-form tag carried into the result (e.g. 'A' / 'B' in an arena). */
  tag?: string;
}

export interface LabMatch {
  /** Players per team: teams[0] plays the left castle, teams[1] the right one. */
  teams: [LabPlayer[], LabPlayer[]];
  seed: number;
  /** Hard stop; a match still running then counts as a draw. */
  maxMinutes?: number;
  bestOf?: number;
  /**
   * End the match early once it is decided (see `decided`): the lab only needs the winner, and
   * the last minutes of a lost game (the winner grinding down the castle) are the slowest ones.
   */
  adjudicate?: boolean;
  /** Record a snapshot every 15 s (castle hp, building value, army hp per team) for analysis. */
  trace?: boolean;
}

export interface LabPlayerResult extends LabPlayer {
  team: Team;
  kills: number;
  lost: number;
  goldEarned: number;
  castleDmg: number;
  /** Buildings standing at the end of the (last) round. */
  buildings: number;
  /** Average unspent gold over the match (a proxy for how well the bot spends). */
  avgFloat: number;
}

export interface LabResult {
  winner: Team | null;
  minutes: number;
  /** Castle HP fraction left per team at the end. */
  castleHp: [number, number];
  players: LabPlayerResult[];
  /** The match was ended early by `adjudicate` (the winner is the team that was clearly ahead). */
  adjudicated?: boolean;
  /** With `trace`: [minute, castle0, castle1, value0, value1, army0, army1] every 15 s. */
  trace?: number[][];
}

export function playMatch(m: LabMatch): LabResult {
  const players = m.teams.flatMap((t, team) => t.map((p, i) => ({ ...p, team: team as Team, idx: i })));
  const sim = Sim.create({
    players: players.map((p, i) => ({ userId: makeBotId(p.level, `${p.team}${p.idx}`), name: `${p.faction}-${p.level}-${i}`, team: p.team, faction: p.faction, incomeMult: AI_INCOME[p.level] })),
    bestOf: m.bestOf ?? 1,
    seed: m.seed,
  });
  const ais = players.map((p, i) => new AiPlayer(i, p.level, m.seed * 31 + i * 7 + 1, p.profile));
  const maxTicks = TICK_RATE * 60 * (m.maxMinutes ?? 40);
  const float = players.map(() => 0);
  let samples = 0;
  const trace: number[][] = [];
  let leader: Team | null = null, streak = 0, called: Team | null = null;
  while (sim.state.phase !== 'matchOver' && sim.state.tick < maxTicks) {
    const cmds: PlayerCommand[] = [];
    for (const ai of ais) for (const cmd of ai.update(sim)) cmds.push({ player: ai.player, cmd });
    sim.step(cmds);
    if (sim.state.tick % TICK_RATE === 0) {
      samples++;
      sim.state.players.forEach((p, i) => { float[i] += p.gold; });
    }
    if (sim.state.tick % (TICK_RATE * 15) === 0 && (m.trace || m.adjudicate)) {
      const st = teamStats(sim);
      if (m.trace) trace.push([sim.state.tick / TICK_RATE / 60, ...st]);
      if (m.adjudicate && (m.bestOf ?? 1) === 1) {
        const lead = decided(st);
        streak = lead !== null && lead === leader ? streak + 1 : lead !== null ? 1 : 0;
        leader = lead;
        if (streak >= ADJ.snapshots) { called = lead; break; }
      }
    }
  }
  const s = sim.state;
  const castleHp = [0, 1].map((t) => { const c = sim.castle(t as Team); return c ? c.hp / c.maxHp : 0; }) as [number, number];
  return {
    winner: called ?? (s.phase === 'matchOver' ? s.winner : null),
    ...(called !== null ? { adjudicated: true } : {}),
    minutes: s.tick / TICK_RATE / 60,
    castleHp,
    ...(m.trace ? { trace } : {}),
    players: players.map((p, i) => {
      const ps = s.players[i];
      return {
        faction: p.faction, level: p.level, profile: p.profile, tag: p.tag, team: p.team,
        ...((t) => ({ kills: t.kills, lost: t.lost, goldEarned: t.goldEarned, castleDmg: t.castleDmg }))(matchStats(ps)),
        buildings: s.entities.filter((e) => e.kind === 'building' && e.owner === i && BUILDINGS[e.type]).length,
        avgFloat: samples ? float[i] / samples : 0,
      };
    }),
  };
}

/** Castle hp fraction, standing building value and army hp of both teams. */
export function teamStats(sim: Sim): [number, number, number, number, number, number] {
  const r: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];
  for (const e of sim.state.entities) {
    if (e.hp <= 0 || e.team === undefined) continue;
    const t = e.team as number;
    if (e.kind === 'castle') r[t] = e.hp / e.maxHp;
    else if (e.kind === 'building') r[2 + t] += e.value ?? 0;
    else if (e.kind === 'unit') r[4 + t] += e.hp;
  }
  return r;
}

/**
 * Early-decision rule, fitted on 220 traced hard-bot games of all team sizes: called in 217, wrong
 * in none, saving ~7% of the playing time. One castle is at least 20 points healthier and that team
 * also has 1.2× the standing base value and the bigger army. Games snowball, so this is decided;
 * the remaining minutes are the leader grinding down the castle. (Earlier calls, from base value
 * alone, started to pick wrong winners.)
 */
export const ADJ = { castleGap: 0.2, value: 1.2, snapshots: 1 };

/** The team that has clearly won, or null. `st` from `teamStats`. */
export function decided(st: readonly number[]): Team | null {
  const [c0, c1, v0, v1, a0, a1] = st;
  if (c0 - c1 >= ADJ.castleGap && v0 >= ADJ.value * Math.max(v1, 1) && a0 >= Math.max(a1, 50)) return 0;
  if (c1 - c0 >= ADJ.castleGap && v1 >= ADJ.value * Math.max(v0, 1) && a1 >= Math.max(a0, 50)) return 1;
  return null;
}
