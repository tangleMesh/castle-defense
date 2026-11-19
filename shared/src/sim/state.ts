import type { FactionId } from '../data/types';
import type { GameMode } from '../constants';

export type Team = 0 | 1;
export type EntityKind = 'unit' | 'building' | 'builder' | 'castle';
export type Phase = 'playing' | 'roundOver' | 'matchOver';

export interface BuildOrder {
  building: string;
  tx: number;
  ty: number;
  /** Gold already paid for this order (refunded if it fails). */
  paid: number;
  /** Sapphires already paid for this order (refunded if it fails). */
  paidS?: number;
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
  /** Charge ready: the next blow deals the unit's charge multiplier. */
  charge?: boolean;
  /** Active poison: damage per second, ticks left, slow and the player credited for kills. */
  poison?: { dps: number; left: number; slow: number; owner: number };
  /** Killed by a rescue strike: nothing bursts out of it (no Sproutlings from a smitten Vineling). */
  smitten?: boolean;
  /** Attacks made so far (every-nth abilities: critical strikes, bashes, slams, storms). */
  hits?: number;
  /** Attacks aimed at this unit so far (evasion). */
  dodges?: number;
  /** Stunned for this many more ticks. */
  stun?: number;
  /** Summoned unit: fades after this many more ticks. */
  ttl?: number;
  /** Fallen allies counted by a reviving shrine. */
  revives?: number;
  /** Ticks until the next summon (units) or power (buildings). */
  abilityCd?: number;

  // ---- builder
  orders?: BuildOrder[];
  /** Building the builder walks to and repairs (one at a time). */
  repairId?: number;
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
  /** Sapphires (rare resource for special buildings and elite upgrades); absent in old saves = START_SAPPHIRES. */
  sapphires?: number;
  /** Income multiplier (handicap); absent = 1. */
  incomeMult?: number;
}

export interface PendingStrike {
  player: number;
  x: number;
  y: number;
  ticksLeft: number;
}

/** A building power's shell in flight (Siege Battery). */
export interface Shell {
  owner: number;
  team: Team;
  x: number;
  y: number;
  radius: number;
  dmg: number;
  ticksLeft: number;
}

/** A lingering area effect (Howling Hollow's cyclone): damage per second and a slow for enemies inside. */
export interface Zone {
  owner: number;
  team: Team;
  x: number;
  y: number;
  radius: number;
  dps: number;
  slow: number;
  ticksLeft: number;
  /** Hits flyers only (meteor shower); otherwise ground units only. */
  air?: boolean;
}

export type SimEvent =
  | { t: 'atk'; a: number; b: number; r: 0 | 1 }
  | { t: 'chain'; ids: number[] }
  | { t: 'splash'; x: number; y: number; r: number }
  /** Building `a` fired a shell that lands at x/y after `f` ticks. */
  | { t: 'shell'; a: number; x: number; y: number; f: number; r: number }
  /** A cyclone of radius `r` settles at x/y for `d` ticks. */
  | { t: 'zone'; x: number; y: number; r: number; d: number; air?: 1 }
  | { t: 'stasis'; x: number; y: number; r: number }
  | { t: 'hex'; id: number; d: number }
  | { t: 'beam'; a: number; b: number }
  | { t: 'revive'; id: number }
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
  /** Player `p` bought a sapphire in the castle shop. */
  | { t: 'sapphire'; p: number }
  /** Player `p` finished the round's `place`-th first building (0-based) and got `g` bonus gold. */
  | { t: 'first'; p: number; place: number; g: number };

export interface RoundRecord {
  winner: Team;
  ticks: number;
}

export interface SimState {
  version: 1;
  /** Map the game is played on, `<width>x<height>` (absent in saves from before the 110×40 map). */
  map?: string;
  tick: number;
  /** Tick at which the current round started. */
  roundStartTick: number;
  rng: number;
  bestOf: number;
  /** Game mode (optional: absent in older saves = standard). */
  mode?: GameMode;
  round: number;
  score: [number, number];
  rounds: RoundRecord[];
  phase: Phase;
  /** 'roundOver': ticks until the next round. 'playing': ticks of the start countdown left (frozen, no commands). */
  phaseTicks: number;
  /** Length of the start countdown of each round (ticks; missing in old saves = none). */
  countdownTicks?: number;
  winner: Team | null;
  incomeTicks: number;
  nextId: number;
  players: PlayerState[];
  /** Entities sorted by ascending id (insertion order). */
  entities: Entity[];
  castleIds: [number, number];
  strikes: PendingStrike[];
  /** Building powers in flight / on the ground (optional: absent in older saves). */
  shells?: Shell[];
  zones?: Zone[];
  /** Players who already finished a building this round, in order (optional: absent in older saves). */
  firstBuilds?: number[];
  /** Place handed out on the latest tick a first-building bonus was paid (same-tick finishers share it). */
  firstBuildTie?: { tick: number; place: number };
  /** Transient: events produced in the last step (not meaningful after restore). */
  events: SimEvent[];
}

export interface PlayerSetup {
  userId: string;
  name: string;
  team: Team;
  faction: FactionId;
  /** Income multiplier (handicap); the Brutal bot gets more than 1. */
  incomeMult?: number;
}

export type Command =
  | { c: 'move'; x: number; y: number }
  | { c: 'build'; building: string; tx: number; ty: number; queue?: boolean }
  | { c: 'buySapphire' }
  | { c: 'upgrade'; id: number; to: string }
  | { c: 'sell'; id: number }
  | { c: 'repair'; id: number }
  | { c: 'rescue'; x: number; y: number }
  | { c: 'buy'; item: string }
  | { c: 'stop' };

export interface PlayerCommand {
  player: number;
  cmd: Command;
}
