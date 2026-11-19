/** `chaos` (castles only) deals full damage to every armour type. */
export type AttackType = 'normal' | 'pierce' | 'siege' | 'magic' | 'chaos';
export type ArmorType = 'light' | 'medium' | 'heavy' | 'fortified';
export type FactionId = 'ironvow' | 'thornwild' | 'shardbound' | 'cogspark' | 'duskmoon' | 'bloodtusk' | 'sunspire' | 'frostmark' | 'gravewake' | 'doomforge' | 'tidecall' | 'blightroot';

/** Visual description used by the client to generate procedural sprites. */
export interface UnitModel {
  shape: 'infantry' | 'shield' | 'polearm' | 'archer' | 'caster' | 'cavalry' | 'siege' | 'flyer' | 'beast' | 'giant' | 'ram'
    // Shardbound elementals
    | 'water' | 'wisp' | 'flame' | 'spark' | 'rock' | 'elementalist' | 'avatar'
    // Cogspark machines
    | 'goblin' | 'tank' | 'copter' | 'golem' | 'shredder' | 'mech'
    // Duskmoon night elves
    | 'moonarcher' | 'druid' | 'shade' | 'wraith' | 'glaivecart' | 'faeriedragon'
    // Bloodtusk orcs
    | 'orc' | 'troll' | 'kodo' | 'wyvern' | 'orccatapult'
    // Sunspire high elves
    | 'highelf' | 'blademaster' | 'sorceress' | 'ballista' | 'dragonhawk'
    // Frostmark northerners
    | 'frostbeast' | 'magnataur' | 'wendigo' | 'yeti' | 'icetroll' | 'icequeen' | 'drake'
    // Gravewake undead
    | 'zombie' | 'necromancer' | 'lich' | 'skeleton' | 'vampire' | 'bat' | 'banshee' | 'fleshgolem' | 'bonewyrm'
    // Doomforge demons
    | 'demon' | 'satyr' | 'quilldemon' | 'twin' | 'succubus' | 'fiend' | 'reddragon' | 'infernal'
    // Tidecall naga
    | 'murloc' | 'spitter' | 'hydra' | 'naga' | 'lobster' | 'dragonturtle' | 'wingedserpent'
    // Blightroot corrupted
    | 'blightent' | 'voidwalker' | 'felhound' | 'infernalmachine' | 'netherdrake' | 'incubus' | 'tentacle';
  body: number;
  accent: number;
  scale: number;
  /** Gear / build variant within a shape (e.g. tank: 'light' | 'mine' | 'assault' | 'heavy' | 'rocket'). */
  variant?: string;
}

export interface BuildingModel {
  style: 'hall' | 'tower' | 'temple' | 'workshop' | 'stable' | 'nest' | 'banner' | 'citadel' | 'tree' | 'hut' | 'mound' | 'shrine'
    // Shardbound
    | 'fountain' | 'cage' | 'altar' | 'pillar' | 'rockpile' | 'codex' | 'obelisk' | 'guardspire' | 'well' | 'nexus'
    // Cogspark
    | 'factory' | 'hangar' | 'lab' | 'generator' | 'tesla' | 'scrapheap' | 'exchange' | 'foundry'
    // Duskmoon
    | 'moonhall' | 'moonshrine' | 'shadowhouse' | 'ruinhut' | 'glaiveworks' | 'wonderwell' | 'wildstone' | 'moonlantern' | 'moonstone' | 'starfall'
    // Bloodtusk
    | 'warhall' | 'trollhut' | 'kodopen' | 'roost' | 'shamantent' | 'orcworks' | 'totempole' | 'serpentrock' | 'speartower' | 'stasistotem'
    // Sunspire
    | 'elfrange' | 'honorhall' | 'wizardspire' | 'academy' | 'elfsiege' | 'hawkportal' | 'arcanetower' | 'magiccity' | 'lightobelisk' | 'goldshrine'
    // Frostmark
    | 'snowrocks' | 'icecave' | 'igloo' | 'icehut' | 'icepalace' | 'icenest' | 'icetower' | 'frostshroom' | 'frostlauncher' | 'worldfreezer'
    // Gravewake
    | 'haycart' | 'plaguebarn' | 'bonetemple' | 'crypt' | 'graveyard' | 'hauntedmine' | 'slaughterhouse' | 'dragongrave' | 'skullpile' | 'soulturret' | 'deathpit' | 'necropolis'
    // Doomforge
    | 'chaoscitadel' | 'demoncage' | 'greedaltar' | 'bloodfountain' | 'dragonnest' | 'demongate' | 'magicruin' | 'volcano' | 'destructionshrine' | 'eraser'
    // Tidecall
    | 'murloccamp' | 'swampwell' | 'spawningpool' | 'nagaspring' | 'reptilepool' | 'snaketemple' | 'coralstatue' | 'pyramid' | 'oracle' | 'tidalguardian'
    // Blightroot
    | 'blightancient' | 'voidportal' | 'felshrine' | 'hellgate' | 'demonstatue' | 'blightprotector' | 'forgottenone' | 'painwell' | 'corruptioneye';
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
  /**
   * Stealth (assassins): spawns invisible. Hidden, enemies can't see or target it (area damage
   * still hurts), and it slips past the front line to hunt casters, healers, aura carriers and
   * ranged units (the toughest in reach); inside the enemy build zone anything goes. A blow
   * reveals it for `reveal` seconds, then it vanishes again (its charge re-armed).
   */
  stealth?: { reveal: number };
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
  /** Only attacks flyers (needs `targetsAir`). */
  airOnly?: boolean;
  /** Every `every`-th attack is a critical strike dealing `mult`× damage. */
  crit?: { every: number; mult: number };
  /** Every `every`-th attack stuns a unit for `stun` seconds. */
  bash?: { every: number; stun: number };
  /** Every `every`-th attack also slams the ground: `dmg` to every enemy ground unit within `radius` of the target. */
  slam?: { every: number; dmg: number; radius: number };
  /** Every `every`-th attack calls down lightning that jumps between `jumps` enemies, starting at the target. */
  storm?: { every: number; dmg: number; jumps: number };
  /** Every `every`-th attack aimed at this unit misses. */
  evade?: number;
  /** Share of damage from ranged attacks that this unit shrugs off (shield wall). */
  rangedResist?: number;
  /** Flat damage taken off every attack after armour (at least a quarter always gets through). */
  block?: number;
  /**
   * Suicide attacker: its first attack is an explosion of `dmg` that hits every enemy (ground units
   * and buildings) within `radius` of the target in full, then the unit is gone (no bounty).
   */
  suicide?: { radius: number };
  /** Every attack also strikes up to `multishot - 1` further enemies in range (multi-shot arrows). */
  multishot?: number;
  /** Its blows weaken the target: it deals `mult` less damage for `duration` seconds. */
  weaken?: { mult: number; duration: number };
  /** Below `below` of its HP it flies into a rage: attacks `haste` faster (1 = twice as fast). */
  berserk?: { below: number; haste: number };
  /** Share of magic damage it shrugs off (spell resistance). */
  magicResist?: number;
  /** When it falls (not to a rescue strike), it explodes: `dmg` magic damage to enemies within `radius`. */
  deathBlast?: { dmg: number; radius: number };
  /** Calls `count` units every `every` seconds; they fade after `ttl` seconds. */
  summon?: { unit: string; count: number; every: number; ttl: number };
  model: UnitModel;
}

export interface AuraDef {
  stat: 'dmg' | 'armor' | 'regen' | 'speed' | 'haste' | 'block';
  /** dmg/speed/haste (attack speed): multiplier delta (0.2 = +20%), armor: flat, regen: hp/s, block: flat damage off every attack. */
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
  /** Tower attack. `chain`: the shot bounces between this many enemies (incl. the first). */
  attack?: { dmg: number; attackType: AttackType; range: number; cooldown: number; targetsAir: boolean; splash?: number; chain?: number; multishot?: number; bonusVs?: { vs: ArmorType | 'air' | 'structure'; mult: number } };
  /** Extra share of kill bounties for the owner (0.5 = +50%; stacks up to MAX_BOUNTY_BONUS). */
  bountyBonus?: number;
  /** Structure regeneration in HP per second (set by faction traits). */
  regen?: number;
  /** Additional income multiplier (0.15 = +15%). */
  incomeBonus?: number;
  /** Every `every`-th own unit that falls within `radius` tiles rises again on the spot (not summons). */
  revive?: { every: number; radius: number };
  /** Mends own-team buildings (and the castle) within `radius` tiles by `hps` HP per second (not itself). */
  mend?: { hps: number; radius: number };
  /** A power the building casts on its own every `cooldown` seconds. */
  power?: PowerDef;
  upgrades?: string[];
  model: BuildingModel;
}

/**
 * Building powers. `bombard`: a shell flies at the nearest enemy building (or the castle) within
 * `range` and deals `dmg` siege damage to structures within `radius` (half to ground units).
 * `cyclone`: a storm settles on the nearest enemy ground unit within `range` for `duration` seconds;
 * enemies inside take `dmg` magic damage per second and are slowed by `slow`. With `air`, the storm
 * targets and hurts flyers only (a meteor shower) instead of ground units. `stasis`: every enemy unit
 * within `range` is stunned for `duration` seconds (dmg and radius unused). `hex`: the toughest enemy
 * unit in range is turned into a harmless critter (stunned) for `duration` seconds. `beam`: a ray of
 * light hits the nearest enemy unit in range for `dmg` magic damage. A hex with `air` freezes the toughest
 * flyer instead and also deals `dmg` magic damage. `slay`: the nearest enemy unit in range with at most
 * `dmg` max HP dies at once (champions and elites are too strong to slay). `chaos`: the nearest enemy
 * unit suffers one of four fates in turn: `dmg` magic damage, a `duration` stun with a third of the
 * damage, death (if its max HP is at most 1.5 × dmg, else the damage), or nothing. `erase`: every enemy
 * unit of the most numerous type in range dies (types with more than `dmg` max HP are immune).
 * `charm`: the nearest enemy unit in range with at most `dmg` max HP changes sides for good.
 * `wave`: a wave rolls from the building towards the nearest enemy unit, `range` tiles long and
 * `radius` wide, dealing `dmg` to every enemy ground unit in its path. `tentacles`: `count` units of
 * type `unit` burst from the ground in a ring of `radius` around the nearest enemy and last `duration` s.
 */
export interface PowerDef {
  kind: 'bombard' | 'cyclone' | 'stasis' | 'hex' | 'beam' | 'slay' | 'chaos' | 'erase' | 'charm' | 'wave' | 'tentacles';
  cooldown: number;
  range: number;
  radius: number;
  dmg: number;
  duration?: number;
  slow?: number;
  air?: boolean;
  /** Tentacles: the unit summoned and how many. */
  unit?: string;
  count?: number;
  /**
   * Reaches the whole map (targets the nearest valid enemy anywhere; `range` is then unused).
   * Bombards, storms and single-target or summoning powers; tower-like (beam, hex) and
   * self-centred or directional powers (stasis, tsunami, erase) stay local.
   */
  global?: boolean;
  /** Bombard: what the shell hits is frozen for this many seconds (buildings stop training, shooting and casting). */
  freeze?: number;
}

export interface FactionDef {
  id: FactionId;
  name: string;
  desc: string;
  color: number;
  /** Short summary of what makes the faction play differently (lobby). */
  traits: string[];
  /** Applied to every unit / building of the faction. */
  trait?: { unitRegen?: number; buildingRegen?: number; buildingArmor?: number; unitEvade?: number };
  /** Buildable building ids in command-card order. */
  build: string[];
  buildings: BuildingDef[];
  units: UnitDef[];
}

/**
 * Balance multipliers on top of the hand-written faction data, written by `npm run balance`
 * (shared/src/data/tuning.ts). `power` scales hp and damage of every unit of a faction by
 * sqrt(power) each, so fight strength moves by about `power`. `early` does the same on top for the
 * units of buildable, non-special spawners (the first tier, plus what they burst into): it shifts a
 * faction's strength between short games (1v1, decided early) and long ones (big teams, late units).
 */
export interface Tuning {
  /**
   * Balance revision: +1 every time the balancer writes a changed tuning, never reset. Shown after
   * the game version (0.20.0+3), so a balance-only change is told apart from a game change.
   */
  revision?: number;
  factions: Partial<Record<FactionId, { power: number; early?: number }>>;
  units: Record<string, { hp?: number; dmg?: number }>;
  /** Income multiplier per bot level ('hard' is the anchor and stays 1). */
  aiIncome: Partial<Record<'easy' | 'normal' | 'hard' | 'brutal', number>>;
}
