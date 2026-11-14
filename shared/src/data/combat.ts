import type { ArmorType, AttackType } from './types';

/** Damage multiplier: attack type (row) against armour type (column). */
export const DAMAGE_TABLE: Record<AttackType, Record<ArmorType, number>> = {
  normal: { light: 1.0, medium: 1.5, heavy: 1.0, fortified: 0.7 },
  pierce: { light: 2.0, medium: 0.75, heavy: 0.9, fortified: 0.35 },
  siege: { light: 1.0, medium: 0.5, heavy: 1.0, fortified: 1.5 },
  magic: { light: 1.25, medium: 0.75, heavy: 2.0, fortified: 0.35 },
  chaos: { light: 1.0, medium: 1.0, heavy: 1.0, fortified: 1.0 },
};

/** Fraction of damage that passes through the given armour value. */
export function armorFactor(armor: number): number {
  if (armor >= 0) return 1 - (0.06 * armor) / (1 + 0.06 * armor);
  return 2 - Math.pow(0.94, -armor);
}

export function computeDamage(raw: number, attack: AttackType, armorType: ArmorType, armor: number): number {
  return raw * DAMAGE_TABLE[attack][armorType] * armorFactor(armor);
}
