/**
 * Game modes: 'standard' (pick your faction), 'random' (a random faction for every player each
 * round) or 'mirror' (each round both teams get the same random factions). A faction appears at
 * most once per team in every mode.
 */
export type GameMode = 'standard' | 'random' | 'mirror';
export const GAME_MODES: Record<GameMode, { name: string; desc: string }> = {
  standard: { name: 'Standard', desc: 'Every player picks a faction in the lobby (each faction once per team).' },
  random: { name: 'Random factions', desc: 'Every player gets a random faction at the start of each round.' },
  mirror: { name: 'Mirror', desc: 'Each round both teams get the same random factions: a fair fight of equal builders.' },
};

/** Simulation ticks per second. */
export const TICK_RATE = 20;
/** Snapshot is broadcast every N ticks (10 Hz). */
export const SNAPSHOT_EVERY = 2;

// The economy follows the castleFight map (war3map.j): 250 gold and 125 lumber to start, income
// every 10 s of 5 gold plus a share of every building's value, Treasure Boxes on top.
/**
 * Every gold amount is the map's × this factor: building and item prices (applied when the data
 * loads), start gold, base income, bounties, the sapphire price and first-build bonuses. Lumber
 * stays as in the map.
 */
export const GOLD_FACTOR = 1.2;
const gold = (v: number) => Math.round(v * GOLD_FACTOR);
export const START_GOLD = gold(250);
/** Lumber at the start of a round; finishing buildings (and upgrades) earns more. */
export const START_LUMBER = 125;
export const INCOME_INTERVAL_TICKS = 10 * TICK_RATE;
/** Base income per tick. */
export const BASE_INCOME = gold(5);
/** Default share of a building's value (gold invested, upgrades included) paid out each income tick (the map's 0.2%·10). */
export const INCOME_PCT = 0.02;
/** Treasure Boxes: the first adds +25% income, each further one 15% less than the one before. */
export const TREASURE_BONUS = 0.25;
export const TREASURE_DECAY = 0.85;
/** Multiplier on unit kill bounties (the map pays them in full, × the gold factor). */
export const BOUNTY_MULT = GOLD_FACTOR;
/** Share of a destroyed building's value paid to the killer. */
export const BUILDING_BOUNTY = 0.03;
/** Income buildings stack up to this total bonus (+30%). */
export const MAX_INCOME_BONUS = 0.3;
export const SELL_REFUND = 0.5;
/** Kill-bounty bonus buildings stack up to this total (+100%). */
export const MAX_BOUNTY_BONUS = 1;
/** Sapphires: the rare resource for special buildings and elite upgrades. Every round starts with this many. */
export const START_SAPPHIRES = 1;
/** Gold price of one more sapphire in the castle shop. */
export const SAPPHIRE_GOLD = gold(1500);
/** Bonus gold for the first, second and third player to finish a building each round. */
export const FIRST_BUILD_BONUS = [20, 15, 10, 5].map(gold);

export const CASTLE_HP = 5000;
export const CASTLE_ARMOR = 5;
export const CASTLE_SIZE = 4;
/** Tiles around each castle that must stay free of buildings (keeps paths open and nothing hidden behind it). */
export const CASTLE_CLEARANCE = 2;
/** Builder move speed (the map's builders: 550 → 5.5 tiles per second). */
export const BUILDER_SPEED = 5.5;
/** Builder must be this close to a footprint centre to start construction. */
export const BUILDER_REACH = 2.2;

/**
 * Builder repair is free but slow: repairing a building from 0 to full takes REPAIR_FULL_SECONDS,
 * whatever its size (the map's buildings go up in 2 s, so build time can't set the pace), so it
 * mends a base between waves but can't out-heal a push.
 */
export const REPAIR_FULL_SECONDS = 120;
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
