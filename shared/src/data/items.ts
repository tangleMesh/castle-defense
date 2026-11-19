import type { AttackType } from './types';

/**
 * Builder items, bought from the own castle. They are expensive late-game upgrades: the builder
 * carries up to MAX_ITEMS of them until the round ends (every round starts with an empty bag).
 */
export const MAX_ITEMS = 3;

export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  cost: number;
  /** Bonus for every unit of the carrier's team, anywhere on the map. Same item on several teammates doesn't stack. */
  teamAura?: { stat: 'dmg' | 'armor' | 'regen' | 'speed'; value: number };
  /** The builder shoots enemy units in range on its own. */
  builderAttack?: { dmg: number; attackType: AttackType; range: number; cooldown: number; targetsAir: boolean };
  /** Every own-team building within `range` tiles of the builder regains `hps` HP per second (free; not the castle). */
  repair?: { hps: number; range: number };
  /** Spawn buildings of the carrier's team train this much faster (0.15 = +15%). Doesn't stack between teammates. */
  spawnSpeed?: number;
  /** Extra armor for every building and the castle of the carrier's team. Doesn't stack between teammates. */
  structureArmor?: number;
  /** Builder movement speed multiplier delta (0.3 = +30%). */
  builderSpeed?: number;
}

export const ITEMS: ItemDef[] = [
  {
    id: 'war_horn', name: 'Horn of Valor', cost: 660,
    desc: 'Every unit of your team deals +20% damage, anywhere on the battlefield.',
    teamAura: { stat: 'dmg', value: 0.2 },
  },
  {
    id: 'aegis', name: 'Aegis Charm', cost: 600,
    desc: 'Every unit of your team gains +3 armor.',
    teamAura: { stat: 'armor', value: 3 },
  },
  {
    id: 'chalice', name: 'Verdant Chalice', cost: 540,
    desc: 'Every unit of your team regenerates 4 HP per second.',
    teamAura: { stat: 'regen', value: 4 },
  },
  {
    id: 'boots', name: 'Pathfinder Boots', cost: 420,
    desc: 'Every unit of your team moves 15% faster. Your builder runs 30% faster.',
    teamAura: { stat: 'speed', value: 0.15 }, builderSpeed: 0.3,
  },
  {
    id: 'war_drum', name: 'War Drum', cost: 720,
    desc: 'Every spawn building of your team trains its units 15% faster.',
    spawnSpeed: 0.15,
  },
  {
    id: 'bulwark', name: 'Bulwark Seal', cost: 480,
    desc: 'Every building of your team and your castle gain +4 armor.',
    structureArmor: 4,
  },
  {
    id: 'crossbow', name: "Warden's Crossbow", cost: 200,
    desc: 'Your builder shoots enemy units within 5.5 tiles (30 pierce damage per second, hits flyers). The builder stays invulnerable.',
    builderAttack: { dmg: 30, attackType: 'pierce', range: 5.5, cooldown: 1, targetsAir: true },
  },
  {
    id: 'hammer', name: "Mason's Hammer", cost: 420,
    desc: 'Every building of your team within 6 tiles of your builder regains 5 HP per second, for free. Stacks with the builder\'s own repair.',
    repair: { hps: 5, range: 6 },
  },
];

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
