import type { ArmorType, AttackType } from './types';

/** Damage multiplier: attack type (row) against armour type (column). */
/**
 * Damage multipliers of the castleFight map (war3mapMisc.txt, DamageBonus*): attack type against
 * armour type, exactly as in the map.
 */
export const DAMAGE_TABLE: Record<AttackType, Record<ArmorType, number>> = {
  normal: { light: 0.7, medium: 1.75, heavy: 1.0, fortified: 0.5, hero: 0.6, divine: 0.25, unarmored: 1.05 },
  pierce: { light: 1.75, medium: 1.0, heavy: 0.7, fortified: 0.45, hero: 0.6, divine: 0.25, unarmored: 1.05 },
  siege: { light: 0.7, medium: 0.7, heavy: 0.7, fortified: 1.6, hero: 0.4, divine: 0.2, unarmored: 1.0 },
  magic: { light: 1.0, medium: 0.7, heavy: 1.75, fortified: 0.4, hero: 0.6, divine: 0.25, unarmored: 1.05 },
  chaos: { light: 1.0, medium: 1.0, heavy: 1.0, fortified: 1.0, hero: 1.0, divine: 1.0, unarmored: 1.0 },
  hero: { light: 1.1, medium: 1.1, heavy: 1.1, fortified: 0.6, hero: 0.6, divine: 0.4, unarmored: 1.1 },
  spells: { light: 1.0, medium: 1.0, heavy: 1.0, fortified: 1.0, hero: 0.7, divine: 0.25, unarmored: 1.0 },
};

/** Fraction of damage that passes through the given armour value. */
export function armorFactor(armor: number): number {
  if (armor >= 0) return 1 - (0.06 * armor) / (1 + 0.06 * armor);
  return 2 - Math.pow(0.94, -armor);
}

export function computeDamage(raw: number, attack: AttackType, armorType: ArmorType, armor: number): number {
  return raw * DAMAGE_TABLE[attack][armorType] * armorFactor(armor);
}
