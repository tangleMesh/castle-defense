import type { UnitDef } from './types';

const STAT: Record<string, string> = { dmg: 'damage', armor: 'armour', regen: 'HP/s regeneration', speed: 'speed' };
const VS: Record<string, string> = { air: 'flyers', structure: 'buildings', light: 'light armour', medium: 'medium armour', heavy: 'heavy armour', fortified: 'fortified' };
const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Short descriptions of a unit's special abilities (for tooltips and the info panel). */
export function unitAbilities(u: UnitDef, units: Record<string, UnitDef>): string[] {
  const out: string[] = [];
  if (u.aura) {
    const a = u.aura;
    const v = a.stat === 'dmg' || a.stat === 'speed' ? `${a.value > 0 ? '+' : ''}${pct(a.value)}` : `+${a.value}`;
    out.push(`Aura: ${a.target === 'ally' ? 'allies' : 'enemies'} within ${a.radius} tiles get ${v} ${STAT[a.stat]}`);
  }
  if (u.charge) out.push(`Charge: the first blow after marching deals ${u.charge}× damage`);
  if (u.bonusVs) out.push(`${u.bonusVs.mult}× damage against ${VS[u.bonusVs.vs]}`);
  if (u.ignoreArmor) out.push('Armour-piercing: ignores armour');
  if (u.poison) out.push(`Poison: ${u.poison.dps} dmg/s for ${u.poison.duration}s and ${pct(u.poison.slow)} slow`);
  if (u.lifesteal) out.push(`Lifesteal: heals for ${pct(u.lifesteal)} of damage dealt`);
  if (u.thorns) out.push(`Thorns: melee attackers take ${pct(u.thorns)} of their damage back`);
  if (u.onDeath) out.push(`On death: releases ${u.onDeath.count} ${units[u.onDeath.unit]?.name ?? u.onDeath.unit}${u.onDeath.count > 1 ? 's' : ''}`);
  if (u.chain) out.push(`Chain lightning: jumps between ${u.chain} enemies`);
  if (u.splash) out.push(`Splash damage (radius ${u.splash})`);
  if (u.heal) out.push(`Heals allies for ${u.heal.amount} HP`);
  if (u.regen) out.push(`Regenerates ${u.regen} HP/s`);
  if (u.structuresOnly) out.push('Attacks buildings only');
  return out;
}
