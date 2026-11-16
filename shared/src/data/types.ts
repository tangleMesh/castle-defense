/** `chaos` (castles only) deals full damage to every armour type. */
export type AttackType = 'normal' | 'pierce' | 'siege' | 'magic' | 'chaos';
export type ArmorType = 'light' | 'medium' | 'heavy' | 'fortified';
export type FactionId = 'ironvow' | 'thornwild';

/** Visual description used by the client to generate procedural sprites. */
export interface UnitModel {
  shape: 'infantry' | 'shield' | 'polearm' | 'archer' | 'caster' | 'cavalry' | 'siege' | 'flyer' | 'beast' | 'giant' | 'ram';
  body: number;
  accent: number;
  scale: number;
}

export interface BuildingModel {
  style: 'hall' | 'tower' | 'temple' | 'workshop' | 'stable' | 'nest' | 'banner' | 'citadel' | 'tree' | 'hut' | 'mound' | 'shrine';
  wall: number;
  roof: number;
  height: number;
}

export interface UnitDef {
  id: string;
  name: string;
  hp: number;
  armor: number;
  armorType: ArmorType;
  dmg: number;
  attackType: AttackType;
  /** Edge-to-edge attack range in tiles (melee ≈ 0.4). */
  range: number;
  /** Seconds between attacks. */
  cooldown: number;
  /** Tiles per second. */
  speed: number;
  radius: number;
  bounty: number;
  air?: boolean;
  targetsAir?: boolean;
  /** Only attacks buildings and castles (e.g. siege rams). */
  structuresOnly?: boolean;
  splash?: number;
  /** Number of targets hit by a chain attack (including the first). */
  chain?: number;
  heal?: { amount: number; range: number; cooldown: number };
  aggro?: number;
  // ---- faction-specific abilities
  /** Aura carried by the unit itself (radius measured from the unit). */
  aura?: AuraDef;
  /** Damage multiplier against a target class (e.g. halberds vs heavy armour, hawks vs flyers). */
  bonusVs?: { vs: ArmorType | 'air' | 'structure'; mult: number };
  /** Attacks ignore the target's armour value. */
  ignoreArmor?: boolean;
  /** The first blow after marching freely deals this damage multiplier. */
  charge?: number;
  /** Attacks poison the target: damage per second for `duration` seconds and a slow. */
  poison?: { dps: number; duration: number; slow: number };
  /** Share of damage dealt that heals the attacker. */
  lifesteal?: number;
  /** Share of melee damage taken that is reflected to the attacker. */
  thorns?: number;
  /** Units released when this unit dies. */
  onDeath?: { unit: string; count: number };
  /** Innate regeneration in HP per second. */
  regen?: number;
  model: UnitModel;
}

export interface AuraDef {
  stat: 'dmg' | 'armor' | 'regen' | 'speed';
  /** dmg/speed: multiplier delta (0.2 = +20%), armor: flat, regen: hp/s. */
  value: number;
  radius: number;
  target: 'ally' | 'enemy';
}

export interface BuildingDef {
  id: string;
  name: string;
  faction: FactionId;
  desc: string;
  cost: number;
  hp: number;
  armor: number;
  /** Seconds to construct (or to upgrade into this building). */
  buildTime: number;
  size: number;
  /** Not directly buildable; reached by upgrading. */
  upgradeOnly?: boolean;
  special?: boolean;
  /** Sapphires needed (on top of gold) to build or upgrade into this building. */
  sapphires?: number;
  spawn?: { unit: string; count: number; interval: number };
  aura?: AuraDef;
  attack?: { dmg: number; attackType: AttackType; range: number; cooldown: number; targetsAir: boolean; splash?: number };
  /** Extra share of kill bounties for the owner (0.5 = +50%; stacks up to MAX_BOUNTY_BONUS). */
  bountyBonus?: number;
  /** Structure regeneration in HP per second (set by faction traits). */
  regen?: number;
  /** Additional income multiplier (0.15 = +15%). */
  incomeBonus?: number;
  upgrades?: string[];
  model: BuildingModel;
}

export interface FactionDef {
  id: FactionId;
  name: string;
  desc: string;
  color: number;
  /** Short summary of what makes the faction play differently (lobby). */
  traits: string[];
  /** Applied to every unit / building of the faction. */
  trait?: { unitRegen?: number; buildingRegen?: number; buildingArmor?: number };
  /** Buildable building ids in command-card order. */
  build: string[];
  buildings: BuildingDef[];
  units: UnitDef[];
}

/**
 * Balance multipliers on top of the hand-written faction data, written by `npm run balance`
 * (shared/src/data/tuning.ts). `power` scales hp and damage of every unit of a faction by
 * sqrt(power) each, so fight strength moves by about `power`.
 */
export interface Tuning {
  /**
   * Balance revision: +1 every time the balancer writes a changed tuning, never reset. Shown after
   * the game version (0.20.0+3), so a balance-only change is told apart from a game change.
   */
  revision?: number;
  factions: Partial<Record<FactionId, { power: number }>>;
  units: Record<string, { hp?: number; dmg?: number }>;
  /** Income multiplier per bot level ('hard' is the anchor and stays 1). */
  aiIncome: Partial<Record<'easy' | 'normal' | 'hard' | 'brutal', number>>;
}
