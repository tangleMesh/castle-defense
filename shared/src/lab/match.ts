/**
 * Simulation lab: headless bot-vs-bot matches on the real simulation (no network, no rendering).
 * The building block for balance matrices, AI arenas and tuning — see server/scripts/lab/.
 */
import { AI_INCOME, AiPlayer, makeBotId, type AiLevel, type Profile } from '../ai/ai';
import { TICK_RATE } from '../constants';
import { BUILDINGS, type FactionId } from '../data';
import { Sim } from '../sim/sim';
import type { PlayerCommand, Team } from '../sim/state';

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
  while (sim.state.phase !== 'matchOver' && sim.state.tick < maxTicks) {
    const cmds: PlayerCommand[] = [];
    for (const ai of ais) for (const cmd of ai.update(sim)) cmds.push({ player: ai.player, cmd });
    sim.step(cmds);
    if (sim.state.tick % TICK_RATE === 0) {
      samples++;
      sim.state.players.forEach((p, i) => { float[i] += p.gold; });
    }
  }
  const s = sim.state;
  const castleHp = [0, 1].map((t) => { const c = sim.castle(t as Team); return c ? c.hp / c.maxHp : 0; }) as [number, number];
  return {
    winner: s.phase === 'matchOver' ? s.winner : null,
    minutes: s.tick / TICK_RATE / 60,
    castleHp,
    players: players.map((p, i) => {
      const ps = s.players[i];
      return {
        faction: p.faction, level: p.level, profile: p.profile, tag: p.tag, team: p.team,
        kills: ps.kills, lost: ps.lost ?? 0, goldEarned: ps.goldEarned, castleDmg: ps.castleDmg ?? 0,
        buildings: s.entities.filter((e) => e.kind === 'building' && e.owner === i && BUILDINGS[e.type]).length,
        avgFloat: samples ? float[i] / samples : 0,
      };
    }),
  };
}
