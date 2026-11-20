import { GOLD_FACTOR } from '../constants';
import type { AttackType } from './types';

/**
 * The castle shop of the castleFight map (its nine items, under our own names): permanent items
 * go into the builder's bag (six slots, like the map's worker inventory) until the round ends;
 * consumables take effect the moment they are bought. Some only become available some minutes
 * into the round, and every item restocks a while after a purchase (per player).
 */
export const MAX_ITEMS = 6;

export type ItemStat = 'dmg' | 'armor' | 'regen' | 'speed' | 'haste';

export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  cost: number;
  /** Lumber cost on top of the gold. */
  lumber?: number;
  /** Bonuses for every unit of the carrier's team, anywhere on the map. Same item on several teammates doesn't stack. */
  teamAura?: Array<{ stat: ItemStat; value: number }>;
  /** The builder shoots enemy units in range on its own. */
  builderAttack?: { dmg: number; attackType: AttackType; range: number; cooldown: number; targetsAir: boolean };
  /** Every own-team building within `range` tiles of the builder regains `hps` HP per second (free; not the castle). */
  repair?: { hps: number; range: number };
  /** The builder hurls a chain lightning at the nearest enemy unit within `range` every `every` seconds. */
  builderLightning?: { every: number; dmg: number; jumps: number; range: number };
  /** Spawn buildings of the carrier's team train this much faster (0.15 = +15%). Doesn't stack between teammates. */
  spawnSpeed?: number;
  /** Extra armor for every building and the castle of the carrier's team. Doesn't stack between teammates. */
  structureArmor?: number;
  /** Builder movement speed multiplier delta (0.3 = +30%). */
  builderSpeed?: number;
  /**
   * Consumable, used on purchase (never carried): every allied unit deals `dmg` more damage for
   * `duration` seconds (Double/Quad Damage); or, within `radius` tiles of the builder, heals `heal`
   * HP and gains `armor` for `duration` seconds (Scroll of Stone).
   */
  use?: { dmg?: number; heal?: number; armor?: number; radius?: number; duration: number };
  /** Seconds into the round before the shop offers it. */
  availableAfter?: number;
  /** Seconds before the same player can buy it again. */
  restock?: number;
}

/** The map's shop (castleFight 2.0.14: Main Castle items), values as in the map. */
export const ITEMS: ItemDef[] = [
  {
    id: 'spark_staff', name: 'Spark Staff', cost: 150, lumber: 300, availableAfter: 30, restock: 300,
    desc: 'Your builder launches a magic spark at a nearby enemy every second: 60 spell damage, flyers too. The builder stays invulnerable.',
    builderAttack: { dmg: 60, attackType: 'spells', range: 6, cooldown: 1, targetsAir: true },
  },
  {
    id: 'stone_scroll', name: 'Stoneskin Scroll', cost: 150, availableAfter: 30, restock: 180,
    desc: 'Used at once: every allied unit within 18 tiles of your builder heals 400 HP and gains +8 armor for 30 seconds.',
    use: { heal: 400, armor: 8, radius: 18, duration: 30 },
  },
  {
    id: 'mason_rune', name: "Mason's Rune", cost: 100, availableAfter: 30, restock: 180,
    desc: 'Every building of your team within 6 tiles of your builder regains 5 HP per second, for free. Stacks with other runes and the builder\'s own repair.',
    repair: { hps: 5, range: 6 },
  },
  {
    id: 'storm_orb', name: 'Storm Orb', cost: 550, availableAfter: 900, restock: 150,
    desc: 'From minute 15: every 60 seconds your builder hurls a chain lightning at the nearest enemy within 8 tiles, hitting up to 10 enemies (1000 damage to the first, less to each further one).',
    builderLightning: { every: 60, dmg: 1000, jumps: 10, range: 8 },
  },
  {
    id: 'rhythm_engine', name: 'Rhythm Engine', cost: 600, availableAfter: 30, restock: 900,
    desc: 'Every unit of your team moves 15% faster and attacks 30% faster. Does not stack within a team.',
    teamAura: [{ stat: 'speed', value: 0.15 }, { stat: 'haste', value: 0.3 }],
  },
  {
    id: 'thunder_drums', name: 'Thunder Drums', cost: 650, availableAfter: 30, restock: 900,
    desc: 'Every unit of your team deals +33% damage. Does not stack within a team.',
    teamAura: [{ stat: 'dmg', value: 0.33 }],
  },
  {
    id: 'fury_shard', name: 'Fury Shard', cost: 600, availableAfter: 300,
    desc: 'Used at once (from minute 5): every unit of your team deals double damage for 30 seconds.',
    use: { dmg: 1, duration: 30 },
  },
  {
    id: 'rage_heart', name: 'Rage Heart', cost: 1400, availableAfter: 600,
    desc: 'Used at once (from minute 10): every unit of your team deals quadruple damage for 30 seconds.',
    use: { dmg: 3, duration: 30 },
  },
];

// Gold prices are the map's × GOLD_FACTOR (lumber stays).
for (const i of ITEMS) i.cost = Math.round(i.cost * GOLD_FACTOR);

export const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

/** Items carried by a player (absent in games saved before items existed). */
export function itemsOf(p: { items?: string[] }): string[] {
  return p.items ?? [];
}

export function hasItem(p: { items?: string[] }, id: string): boolean {
  return !!p.items?.includes(id);
}

/** Item effect lookup over a player's bag. */
export function itemEffect<K extends keyof ItemDef>(p: { items?: string[] }, key: K): ItemDef[K] | undefined {
  for (const id of itemsOf(p)) {
    const v = ITEM_BY_ID[id]?.[key];
    if (v !== undefined) return v;
  }
  return undefined;
}

/** Strongest value of a numeric team-wide item effect among the players of `team`. */
export function teamItemBonus(players: ReadonlyArray<{ team: number; items?: string[] }>, team: number, key: 'spawnSpeed' | 'structureArmor'): number {
  let best = 0;
  for (const p of players) if (p.team === team) best = Math.max(best, itemEffect(p, key) ?? 0);
  return best;
}

/**
 * Items whose whole effect is team-wide (auras, faster spawning, structure armour): a second copy
 * on the same team adds nothing. Items with an effect on their own builder (crossbow, hammer,
 * boots' builder speed) stay worth buying for every teammate.
 */
export function isTeamWideOnly(item: ItemDef): boolean {
  return !!(item.teamAura || item.spawnSpeed || item.structureArmor) && !item.builderAttack && !item.repair && !item.builderSpeed;
}

/** A teammate (not `self`) already carries this team-wide-only item, so buying it would be wasted. */
export function teammateCarries(players: ReadonlyArray<{ team: number; items?: string[] }>, self: number, item: ItemDef): string | undefined {
  if (!isTeamWideOnly(item)) return undefined;
  const me = players[self];
  const mate = players.find((p, i) => i !== self && p.team === me.team && p.items?.includes(item.id));
  return mate ? ((mate as { name?: string }).name ?? 'A teammate') : undefined;
}
