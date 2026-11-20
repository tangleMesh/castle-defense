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
  /** Lumber paid (refunded on cancel). */
  paidL?: number;
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
  /** Mine layers: ticks until the next mine. */
  mineCd?: number;
  /** Hexed (City of Magic): a harmless sheep for this many more ticks (it is stunned as well). */
  sheep?: number;
  /** Stoneskin Scroll: extra armor for a while. */
  stone?: { armor: number; left: number };
  /** Stealth units: invisible to the enemy right now. */
  hidden?: boolean;
  /** Stealth units: ticks until a revealed one vanishes again. */
  revealLeft?: number;
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
  /** Weakened by a corrupted blow: deals `mult` less damage for `left` more ticks. */
  weaken?: { mult: number; left: number };
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
  // Statistics of the current round (reset when a round starts; earlier rounds sit in `past`).
  kills: number;
  strikes: number;
  goldEarned: number;
  /** Own units that died (optional: absent in games saved by older versions). */
  lost?: number;
  /** Damage dealt to the enemy castle. */
  castleDmg?: number;
  /** Statistics of the finished rounds of this match (absent before the second round). */
  past?: RoundStats;
  /** Builder items carried this round (optional: absent in games saved by older versions). */
  items?: string[];
  /** Shop restock: tick from which each item can be bought again by this player. */
  itemReady?: Record<string, number>;
  /** Storm Orb: ticks until the builder's next chain lightning. */
  orbCd?: number;
  /** Sapphires (rare resource for special buildings and elite upgrades); absent in old saves = START_SAPPHIRES. */
  sapphires?: number;
  /** Lumber (absent in games saved before lumber existed = START_LUMBER). */
  lumber?: number;
  /** Income multiplier (handicap); absent = 1. */
  incomeMult?: number;
}

export interface RoundStats {
  kills: number;
  strikes: number;
  goldEarned: number;
  lost: number;
  castleDmg: number;
}

/** A player's statistics over the whole match: the finished rounds plus the current one. */
export function matchStats(p: PlayerState): RoundStats {
  const a = p.past;
  return {
    kills: (a?.kills ?? 0) + p.kills,
    strikes: (a?.strikes ?? 0) + p.strikes,
    goldEarned: (a?.goldEarned ?? 0) + p.goldEarned,
    lost: (a?.lost ?? 0) + (p.lost ?? 0),
    castleDmg: (a?.castleDmg ?? 0) + (p.castleDmg ?? 0),
  };
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
  /** Ticks everything hit is frozen for (frost bolts). */
  freeze?: number;
}

/** A buried mine (Mine Layer): explodes when an enemy ground unit steps on it. */
export interface Mine {
  owner: number;
  team: Team;
  /** The unit that laid it (each layer keeps a limited number armed). */
  layer: number;
  x: number;
  y: number;
  dmg: number;
  radius: number;
  trigger: number;
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
  /** A mine went off. */
  | { t: 'mine'; x: number; y: number; r: number }
  /** Building `a` fired a shell that lands at x/y after `f` ticks. */
  | { t: 'shell'; a: number; x: number; y: number; f: number; r: number }
  /** A cyclone of radius `r` settles at x/y for `d` ticks. */
  | { t: 'zone'; x: number; y: number; r: number; d: number; air?: 1 }
  | { t: 'stasis'; x: number; y: number; r: number }
  | { t: 'hex'; id: number; d: number }
  | { t: 'beam'; a: number; b: number }
  | { t: 'revive'; id: number }
  | { t: 'slay'; a: number; b: number }
  | { t: 'charm'; id: number }
  | { t: 'wave'; x: number; y: number; x2: number; y2: number; r: number }
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
  /** Every player's statistics of this round, in player order (absent in older saves). */
  players?: Array<RoundStats & { faction: FactionId }>;
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
  /** Timed team-wide damage bonuses from consumables (Fury Shard, Rage Heart). */
  teamBuffs?: Array<{ team: Team; dmg: number; left: number }>;
  /** Buried mines (absent in games saved before mines existed). */
  mines?: Mine[];
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
