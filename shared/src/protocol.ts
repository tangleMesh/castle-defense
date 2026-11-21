import { z } from 'zod';
import type { Snapshot } from './sim/snapshot';
import type { FactionId } from './data/types';
import type { AiLevel } from './ai/ai';
import type { GameMode } from './constants';

const num = z.number().finite();

export const CommandSchema = z.discriminatedUnion('c', [
  z.object({ c: z.literal('move'), x: num, y: num }),
  z.object({ c: z.literal('build'), building: z.string().max(64), tx: z.number().int(), ty: z.number().int(), queue: z.boolean().optional() }),
  z.object({ c: z.literal('upgrade'), id: z.number().int(), to: z.string().max(64) }),
  z.object({ c: z.literal('sell'), id: z.number().int() }),
  z.object({ c: z.literal('repair'), id: z.number().int() }),
  z.object({ c: z.literal('rescue'), x: num, y: num }),
  z.object({ c: z.literal('buy'), item: z.string().max(64) }),
  z.object({ c: z.literal('stop') }),
  z.object({ c: z.literal('buySapphire') }),
]);

export const FactionSchema = z.enum(['ironvow', 'thornwild', 'shardbound', 'cogspark', 'duskmoon', 'bloodtusk', 'sunspire', 'frostmark', 'gravewake', 'doomforge', 'tidecall', 'blightroot']);
export const GameModeSchema = z.enum(['standard', 'random', 'mirror']);
export const AiLevelSchema = z.enum(['easy', 'normal', 'hard', 'brutal']);

export const ClientMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('auth'), token: z.string().max(200) }),
  z.object({ type: z.literal('lobby.create'), name: z.string().trim().min(1).max(40), bestOf: z.union([z.literal(1), z.literal(3), z.literal(5)]), mode: GameModeSchema.optional() }),
  z.object({ type: z.literal('lobby.setMode'), mode: GameModeSchema }),
  z.object({ type: z.literal('lobby.join'), roomId: z.string().max(64) }),
  /** Join by invite code (shared in a chat, or opened as an `?join=CODE` link). */
  z.object({ type: z.literal('lobby.joinCode'), code: z.string().trim().max(200) }),
  z.object({ type: z.literal('lobby.leave') }),
  z.object({ type: z.literal('lobby.setTeam'), team: z.union([z.literal(0), z.literal(1)]) }),
  z.object({ type: z.literal('lobby.setFaction'), faction: FactionSchema }),
  z.object({ type: z.literal('lobby.ready'), ready: z.boolean() }),
  z.object({ type: z.literal('lobby.start') }),
  // Host only: computer players.
  z.object({ type: z.literal('lobby.addBot'), team: z.union([z.literal(0), z.literal(1)]), level: AiLevelSchema }),
  z.object({
    type: z.literal('lobby.updateBot'), userId: z.string().max(64),
    team: z.union([z.literal(0), z.literal(1)]).optional(), faction: FactionSchema.optional(), level: AiLevelSchema.optional(),
  }),
  z.object({ type: z.literal('lobby.removeBot'), userId: z.string().max(64) }),
  z.object({ type: z.literal('lobby.resume'), savedGameId: z.string().max(64) }),
  z.object({ type: z.literal('cmd'), cmd: CommandSchema }),
  z.object({ type: z.literal('game.pause'), pause: z.boolean() }),
  z.object({ type: z.literal('game.saveAndExit') }),
  /** The client has loaded the battlefield (the round's start countdown waits for everyone). */
  z.object({ type: z.literal('match.loaded') }),
  z.object({ type: z.literal('game.leave') }),
  // In a match: `all` reaches every player (enemies too); otherwise only the own team.
  z.object({ type: z.literal('chat'), text: z.string().trim().min(1).max(300), all: z.boolean().optional() }),
]);

export type ClientMessage = z.infer<typeof ClientMessageSchema>;

export interface PublicUser {
  id: string;
  username: string;
  stats: UserStats;
}

export interface UserStats {
  wins: number;
  losses: number;
  roundsWon: number;
  unitsKilled: number;
  rescueStrikesUsed: number;
  matches: number;
  /** Elo rating (START_RATING for new accounts) and the highest it has been. */
  rating: number;
  peakRating: number;
}

/** One player's line on the statistics page after a match. */
export interface MatchStatsPlayer {
  userId: string;
  name: string;
  team: 0 | 1;
  /** Bot difficulty, for computer players. */
  bot?: string;
  /** Faction per round (random and mirror modes change it). */
  factions: string[];
  kills: number;
  lost: number;
  goldEarned: number;
  castleDmg: number;
  strikes: number;
  /** Elo before and after the match (accounts only). */
  rating?: { before: number; after: number };
}

/** The statistics page shown after the final round. */
export interface MatchStats {
  mode: string;
  rounds: Array<{ winner: 0 | 1; seconds: number; players: Array<{ kills: number; lost: number; goldEarned: number; castleDmg: number; faction: string }> }>;
  players: MatchStatsPlayer[];
}

export interface RoomSlot {
  userId: string;
  name: string;
  team: 0 | 1;
  faction: FactionId;
  ready: boolean;
  connected: boolean;
  /** Set for computer players. */
  bot?: AiLevel;
}

/** Invite codes: letters and digits that can't be mixed up when typed (no 0/O, 1/I/L). */
export const INVITE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const INVITE_LENGTH = 6;
/** Pulls an invite code out of whatever was pasted: the bare code or a whole `?join=` link. */
export function parseInviteCode(input: string): string | null {
  const m = /[?&]join=([A-Za-z0-9]+)/.exec(input);
  const raw = (m ? m[1] : input).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return raw.length === INVITE_LENGTH && [...raw].every((c) => INVITE_ALPHABET.includes(c)) ? raw : null;
}

export interface RoomInfo {
  id: string;
  /** Short invite code (e.g. K7QX2M) for `?join=` links and the join-by-code box. */
  code: string;
  name: string;
  hostId: string;
  bestOf: number;
  mode: GameMode;
  status: 'lobby' | 'playing';
  /** Set when the room resumes a saved game: roster is locked to these users. */
  savedGameId?: string;
  roster?: Array<{ userId: string; name: string; team: 0 | 1; faction: FactionId }>;
  score?: [number, number];
  slots: RoomSlot[];
}

export interface MatchInitPlayer {
  i: number;
  userId: string;
  name: string;
  team: 0 | 1;
  faction: FactionId;
}

export type ServerMessage =
  | { type: 'auth.ok'; user: PublicUser }
  | { type: 'lobby.list'; rooms: RoomInfo[] }
  | { type: 'lobby.room'; room: RoomInfo | null }
  | { type: 'match.init'; matchId: string; you: number; players: MatchInitPlayer[]; bestOf: number; hostId: string; resumed: boolean }
  | { type: 'match.snapshot'; snap: Snapshot }
  | { type: 'match.paused'; paused: boolean; reason: string; waitingFor: string[]; votes: string[]; resumeIn?: number }
  | { type: 'match.end'; reason: 'finished' | 'saved' | 'left'; winner?: 0 | 1; score?: [number, number]; stats?: MatchStats }
  | { type: 'chat'; from: string; text: string; scope: 'lobby' | 'match' | 'team' }
  | { type: 'error'; message: string };
