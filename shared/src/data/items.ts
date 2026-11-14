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
  /** The builder repairs the most damaged own-team structure in range (HP per second). */
  repair?: { hps: number; range: number };
  /** The builder's sight radius in tiles (normal units and builders: 6). */
  vision?: number;
  /** Builder movement speed multiplier delta (0.3 = +30%). */
  builderSpeed?: number;
  /** Single use: "use" it to get the rescue strike back this round. */
  refreshStrike?: boolean;
}

export const ITEMS: ItemDef[] = [
  {
    id: 'war_horn', name: 'Horn of Valor', cost: 220,
    desc: 'Every unit of your team deals +20% damage, anywhere on the battlefield.',
    teamAura: { stat: 'dmg', value: 0.2 },
  },
  {
    id: 'aegis', name: 'Aegis Charm', cost: 200,
    desc: 'Every unit of your team gains +3 armor.',
    teamAura: { stat: 'armor', value: 3 },
  },
  {
    id: 'chalice', name: 'Verdant Chalice', cost: 180,
    desc: 'Every unit of your team regenerates 4 HP per second.',
    teamAura: { stat: 'regen', value: 4 },
  },
  {
    id: 'boots', name: 'Pathfinder Boots', cost: 140,
    desc: 'Every unit of your team moves 15% faster. Your builder runs 30% faster.',
    teamAura: { stat: 'speed', value: 0.15 }, builderSpeed: 0.3,
  },
  {
    id: 'crossbow', name: "Warden's Crossbow", cost: 180,
    desc: 'Your builder shoots enemy units within 5.5 tiles (30 pierce damage per second, hits flyers). The builder stays invulnerable.',
    builderAttack: { dmg: 30, attackType: 'pierce', range: 5.5, cooldown: 1, targetsAir: true },
  },
  {
    id: 'hammer', name: "Mason's Hammer", cost: 150,
    desc: 'Your builder repairs the most damaged building or castle of your team within 3 tiles, 30 HP per second.',
    repair: { hps: 30, range: 3 },
  },
  {
    id: 'spyglass', name: 'Far-Seer Spyglass', cost: 120,
    desc: 'Your builder sees twice as far (12 tiles), revealing enemy armies through the fog.',
    vision: 12,
  },
  {
    id: 'flare', name: 'Signal Flare', cost: 240,
    desc: 'Single use. Use it (1/2/3 or click it) after your rescue strike to get the strike back this round.',
    refreshStrike: true,
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
