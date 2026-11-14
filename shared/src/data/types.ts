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
  spawn?: { unit: string; count: number; interval: number };
  aura?: AuraDef;
  attack?: { dmg: number; attackType: AttackType; range: number; cooldown: number; targetsAir: boolean };
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
  /** Buildable building ids in command-card order. */
  build: string[];
  buildings: BuildingDef[];
  units: UnitDef[];
}
