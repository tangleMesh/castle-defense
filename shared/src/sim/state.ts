import type { FactionId } from '../data/types';

export type Team = 0 | 1;
export type EntityKind = 'unit' | 'building' | 'builder' | 'castle';
export type Phase = 'playing' | 'roundOver' | 'matchOver';

export interface BuildOrder {
  building: string;
  tx: number;
  ty: number;
  /** Gold already paid for this order (refunded if it fails). */
  paid: number;
}

/**
 * Every field is plain JSON so the whole state can be stored in MongoDB
 * and restored later.
 */
export interface Entity {
  id: number;
  kind: EntityKind;
  /** Unit/building def id, or 'castle' / 'builder'. */
  type: string;
  /** Player index; -1 for castles. */
  owner: number;
  team: Team;
  x: number;
  y: number;
  hp: number;
  maxHp: number;

  // ---- buildings & castles
  tx?: number;
  ty?: number;
  size?: number;
  /** Remaining construction/upgrade ticks (0 = complete). */
  buildLeft?: number;
  buildTotal?: number;
  /** True while an upgrade (rather than the initial construction) is in progress. */
  upgrading?: boolean;
  spawnTimer?: number;
  /** Total gold invested (incl. upgrades). */
  value?: number;

  // ---- units & attacking buildings
  targetId?: number;
  cd?: number;
  healCd?: number;

  // ---- builder
  orders?: BuildOrder[];
  moveX?: number;
  moveY?: number;
}

export interface PlayerState {
  index: number;
  userId: string;
  name: string;
  team: Team;
  faction: FactionId;
  gold: number;
  rescueUsed: boolean;
  builderId: number;
  connected: boolean;
  // per-match statistics
  kills: number;
  strikes: number;
  goldEarned: number;
  /** Own units that died (optional: absent in games saved by older versions). */
  lost?: number;
  /** Damage dealt to the enemy castle. */
  castleDmg?: number;
  /** Builder items carried this round (optional: absent in games saved by older versions). */
  items?: string[];
}

export interface PendingStrike {
  player: number;
  x: number;
  y: number;
  ticksLeft: number;
}

export type SimEvent =
  | { t: 'atk'; a: number; b: number; r: 0 | 1 }
  | { t: 'chain'; ids: number[] }
  | { t: 'splash'; x: number; y: number; r: number }
  | { t: 'heal'; a: number; b: number }
  | { t: 'die'; id: number; x: number; y: number; k: EntityKind }
  /** Kill bounty paid to player `p` (last hit). */
  | { t: 'gold'; p: number; g: number; x: number; y: number }
  | { t: 'built'; id: number }
  | { t: 'strike'; p: number; x: number; y: number; hit: 0 | 1; kills?: number }
  | { t: 'income'; amounts: number[] }
  | { t: 'round'; winner: Team; score: [number, number]; round: number }
  | { t: 'match'; winner: Team; score: [number, number] }
  | { t: 'err'; p: number; msg: string }
  /** Player `p` bought an item. */
  | { t: 'item'; p: number; item: string }
  /** Player `p` finished the round's `place`-th first building (0-based) and got `g` bonus gold. */
  | { t: 'first'; p: number; place: number; g: number };

export interface RoundRecord {
  winner: Team;
  ticks: number;
}

export interface SimState {
  version: 1;
  tick: number;
  /** Tick at which the current round started. */
  roundStartTick: number;
  rng: number;
  bestOf: number;
  round: number;
  score: [number, number];
  rounds: RoundRecord[];
  phase: Phase;
  phaseTicks: number;
  winner: Team | null;
  incomeTicks: number;
  nextId: number;
  players: PlayerState[];
  /** Entities sorted by ascending id (insertion order). */
  entities: Entity[];
  castleIds: [number, number];
  strikes: PendingStrike[];
  /** Players who already finished a building this round, in order (optional: absent in older saves). */
  firstBuilds?: number[];
  /** Transient: events produced in the last step (not meaningful after restore). */
  events: SimEvent[];
}

export interface PlayerSetup {
  userId: string;
  name: string;
  team: Team;
  faction: FactionId;
}

export type Command =
  | { c: 'move'; x: number; y: number }
  | { c: 'build'; building: string; tx: number; ty: number; queue?: boolean }
  | { c: 'upgrade'; id: number; to: string }
  | { c: 'sell'; id: number }
  | { c: 'rescue'; x: number; y: number }
  | { c: 'buy'; item: string }
  | { c: 'stop' };

export interface PlayerCommand {
  player: number;
  cmd: Command;
}
