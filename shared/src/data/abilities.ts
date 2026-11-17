import type { BuildingDef, UnitDef } from './types';

const STAT: Record<string, string> = { dmg: 'damage', armor: 'armour', regen: 'HP/s regeneration', speed: 'speed', haste: 'attack speed' };
const VS: Record<string, string> = { air: 'flyers', structure: 'buildings', light: 'light armour', medium: 'medium armour', heavy: 'heavy armour', fortified: 'fortified' };
const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Short descriptions of a unit's special abilities (for tooltips and the info panel). */
export function unitAbilities(u: UnitDef, units: Record<string, UnitDef>): string[] {
  const out: string[] = [];
  if (u.aura) {
    const a = u.aura;
    const v = a.stat === 'dmg' || a.stat === 'speed' || a.stat === 'haste' ? `${a.value > 0 ? '+' : ''}${pct(a.value)}` : `+${a.value}`;
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
  if (u.airOnly) out.push('Anti-air: attacks flyers only');
  if (u.crit) out.push(`Critical strike: every ${nth(u.crit.every)} attack deals ${u.crit.mult}× damage`);
  if (u.bash) out.push(`Bash: every ${nth(u.bash.every)} attack stuns for ${u.bash.stun}s`);
  if (u.slam) out.push(`Slam: every ${nth(u.slam.every)} attack deals ${Math.round(u.slam.dmg)} damage around the target`);
  if (u.storm) out.push(`Storm: every ${nth(u.storm.every)} attack calls lightning (${Math.round(u.storm.dmg)} damage, ${u.storm.jumps} targets)`);
  if (u.evade) out.push(`Evasion: every ${nth(u.evade)} attack against it misses`);
  if (u.rangedResist) out.push(`Shield wall: takes ${pct(u.rangedResist)} less damage from ranged attacks`);
  if (u.block) out.push(`Hardened skin: blocks ${u.block} damage of every attack`);
  if (u.summon) out.push(`Summons ${u.summon.count} ${units[u.summon.unit]?.name ?? u.summon.unit}${u.summon.count > 1 ? 's' : ''} every ${u.summon.every}s (they last ${u.summon.ttl}s)`);
  return out;
}

const nth = (n: number) => (n === 1 ? '' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);

/** Short description of a building power (tooltips). */
export function powerText(b: BuildingDef): string | undefined {
  const p = b.power;
  if (!p) return undefined;
  if (p.kind === 'bombard') return `Bombard: every ${p.cooldown}s a shell hits the nearest enemy building within ${p.range} tiles (${p.dmg} siege damage in radius ${p.radius}, half to units)`;
  return `Cyclone: every ${p.cooldown}s a storm settles on the nearest enemy within ${p.range} tiles for ${p.duration}s (${p.dmg} damage/s and ${pct(p.slow ?? 0)} slow in radius ${p.radius})`;
}

/**
 * Rough damage and toughness multipliers of a unit's every-nth and defensive abilities, for
 * value estimates (bot planning). 1 = no such ability.
 */
export function abilityFactors(u: UnitDef): { dmg: number; hp: number } {
  let dmg = 1, hp = 1;
  const perHit = u.dmg || 1;
  if (u.crit) dmg += (u.crit.mult - 1) / u.crit.every;
  if (u.slam) dmg += (u.slam.dmg * 1.8) / (u.slam.every * perHit);
  if (u.storm) dmg += (u.storm.dmg * Math.min(3, u.storm.jumps) * 0.8) / (u.storm.every * perHit);
  if (u.bash) dmg += Math.min(0.5, u.bash.stun / (u.bash.every * u.cooldown));
  if (u.summon) dmg += 0.15 * u.summon.count * Math.min(1, u.summon.ttl / u.summon.every);
  if (u.evade) hp *= u.evade / (u.evade - 1);
  if (u.rangedResist) hp *= 1 + u.rangedResist * 0.5;
  if (u.block) hp *= 1 + Math.min(1, u.block / 25);
  return { dmg, hp };
}
