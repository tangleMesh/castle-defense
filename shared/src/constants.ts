/** Game modes: 'standard' (pick your faction) or 'random' (a random faction for every player each round). */
export type GameMode = 'standard' | 'random';
export const GAME_MODES: Record<GameMode, { name: string; desc: string }> = {
  standard: { name: 'Standard', desc: 'Every player picks a faction in the lobby.' },
  random: { name: 'Random factions', desc: 'Every player gets a random faction at the start of each round.' },
};

/** Simulation ticks per second. */
export const TICK_RATE = 20;
/** Snapshot is broadcast every N ticks (10 Hz). */
export const SNAPSHOT_EVERY = 2;

/** Enough for exactly one cheap spawner of either faction (both cost 90). */
export const START_GOLD = 150;
export const INCOME_INTERVAL_TICKS = 10 * TICK_RATE;
/** Gold pace: income and bounties run at 30% of the original (fast-paced) economy. */
export const BASE_INCOME = 6;
/** Share of total invested building value paid out each income tick. */
export const INCOME_PCT = 0.015;
/** Multiplier on kill bounties (unit bounty values and 10% of a destroyed building's value). */
export const BOUNTY_MULT = 0.3;
/** Income buildings stack up to this total bonus (+30%). */
export const MAX_INCOME_BONUS = 0.3;
export const SELL_REFUND = 0.5;
/** Kill-bounty bonus buildings stack up to this total (+100%). */
export const MAX_BOUNTY_BONUS = 1;
/** Sapphires: the rare resource for special buildings and elite upgrades. Every round starts with this many. */
export const START_SAPPHIRES = 1;
/** Gold price of one more sapphire in the castle shop. */
export const SAPPHIRE_GOLD = 1500;
/** Bonus gold for the first, second and third player to finish a building each round. */
export const FIRST_BUILD_BONUS = [20, 15, 10];

export const CASTLE_HP = 8000;
export const CASTLE_ARMOR = 5;
export const CASTLE_SIZE = 4;
/** Tiles around each castle that must stay free of buildings (keeps paths open and nothing hidden behind it). */
export const CASTLE_CLEARANCE = 2;

export const BUILDER_SPEED = 7;
/** Builder must be this close to a footprint centre to start construction. */
export const BUILDER_REACH = 2.2;

/**
 * Builder repair is free but slow: repairing a building from 0 to full takes REPAIR_TIME_RATIO ×
 * its build time (~11 HP/s on a tower), so it mends a base between waves but can't out-heal a push.
 */
export const REPAIR_TIME_RATIO = 9;
/** Builder repair of the own castle, HP per second per builder (several builders stack). */
export const CASTLE_REPAIR_HPS = 11;

export const RESCUE_RADIUS = 7;
export const RESCUE_DELAY_TICKS = 1 * TICK_RATE;

export const DEFAULT_AGGRO = 6;
/** Pause between rounds (includes the ~4 s castle-collapse cinematic before the banner). */
export const ROUND_END_TICKS = 15 * TICK_RATE;
/** Countdown at the start of every round: the game is frozen and nobody can build, so every player gets the same start. */
export const ROUND_COUNTDOWN_TICKS = 5 * TICK_RATE;
/** Real seconds the server waits after the final castle falls before ending the match (collapse cinematic). */
export const CASTLE_FALL_SECONDS = 5;

export const MAX_PLAYERS_PER_TEAM = 4;
export const BEST_OF_OPTIONS = [1, 3, 5] as const;
