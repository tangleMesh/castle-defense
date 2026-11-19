import type { BuildingDef, UnitDef } from './types';

const STAT: Record<string, string> = { dmg: 'damage', armor: 'armour', regen: 'HP/s regeneration', speed: 'speed', haste: 'attack speed', block: 'damage blocked per hit' };
const VS: Record<string, string> = { air: 'flyers', structure: 'buildings', light: 'light armour', medium: 'medium armour', heavy: 'heavy armour', fortified: 'fortified' };
const pct = (v: number) => `${Math.round(v * 100)}%`;
/**
 * A number for the UI: whole numbers from 10 up, otherwise at most one decimal (tuned values such
 * as 4.2312… damage per second read as 4.2).
 */
export function num(v: number | undefined): string {
  if (v === undefined) return "";
  if (!Number.isFinite(v)) return String(v);
  return String(Math.abs(v) >= 10 ? Math.round(v) : Math.round(v * 10) / 10);
}

/** Short descriptions of a unit's special abilities (for tooltips and the info panel). */
export function unitAbilities(u: UnitDef, units: Record<string, UnitDef>): string[] {
  const out: string[] = [];
  if (u.aura) {
    const a = u.aura;
    const v = a.stat === 'dmg' || a.stat === 'speed' || a.stat === 'haste' ? `${a.value > 0 ? '+' : ''}${pct(a.value)}` : `${a.value > 0 ? '+' : ''}${num(a.value)}`;
    out.push(`Aura: ${a.target === 'ally' ? 'allies' : 'enemies'} within ${num(a.radius)} tiles get ${v} ${STAT[a.stat]}`);
  }
  if (u.charge) out.push(`Charge: the first blow after marching deals ${num(u.charge)}× damage`);
  if (u.bonusVs) out.push(`${num(u.bonusVs.mult)}× damage against ${VS[u.bonusVs.vs]}`);
  if (u.ignoreArmor) out.push('Armour-piercing: ignores armour');
  if (u.poison) out.push(u.poison.dps ? `Poison: ${num(u.poison.dps)} dmg/s for ${num(u.poison.duration)}s and ${pct(u.poison.slow)} slow` : `Gale: slows its target by ${pct(u.poison.slow)} for ${num(u.poison.duration)}s`);
  if (u.lifesteal) out.push(`Lifesteal: heals for ${pct(u.lifesteal)} of damage dealt`);
  if (u.thorns) out.push(`Thorns: melee attackers take ${pct(u.thorns)} of their damage back`);
  if (u.onDeath) out.push(`On death: releases ${u.onDeath.count} ${units[u.onDeath.unit]?.name ?? u.onDeath.unit}${u.onDeath.count > 1 ? 's' : ''}`);
  if (u.chain) out.push(`Chain lightning: jumps between ${u.chain} enemies`);
  if (u.splash) out.push(`Splash damage (radius ${num(u.splash)})`);
  if (u.heal) out.push(`Heals allies for ${num(u.heal.amount)} HP`);
  if (u.regen) out.push(`Regenerates ${num(u.regen)} HP/s`);
  if (u.structuresOnly) out.push('Attacks buildings only');
  if (u.airOnly) out.push('Anti-air: attacks flyers only');
  if (u.crit) out.push(`Critical strike: every ${nth(u.crit.every)} attack deals ${num(u.crit.mult)}× damage`);
  if (u.bash) out.push(`Bash: every ${nth(u.bash.every)} attack stuns for ${num(u.bash.stun)}s`);
  if (u.slam) out.push(`Slam: every ${nth(u.slam.every)} attack deals ${Math.round(u.slam.dmg)} damage around the target`);
  if (u.storm) out.push(`Storm: every ${nth(u.storm.every)} attack calls lightning (${Math.round(u.storm.dmg)} damage, ${u.storm.jumps} targets)`);
  if (u.evade) out.push(`Evasion: every ${nth(u.evade)} attack against it misses`);
  if (u.rangedResist) out.push(`Shield wall: takes ${pct(u.rangedResist)} less damage from ranged attacks`);
  if (u.block) out.push(`Hardened skin: blocks ${num(u.block)} damage of every attack`);
  if (u.berserk) out.push(`Berserk: below ${pct(u.berserk.below)} health it attacks ${pct(u.berserk.haste)} faster`);
  if (u.magicResist) out.push(`Spell resistance: takes ${pct(u.magicResist)} less magic damage`);
  if (u.weaken) out.push(`Weakening blows: its target deals ${pct(u.weaken.mult)} less damage for ${u.weaken.duration}s`);
  if (u.multishot) out.push(`Multi-shot: every volley strikes ${u.multishot} enemies`);
  if (u.deathBlast) out.push(`Revenge: when it falls it explodes for ${Math.round(u.deathBlast.dmg)} damage within ${num(u.deathBlast.radius)} tiles`);
  if (u.suicide) out.push(`Suicide blast: its first attack explodes, hitting every enemy unit and building within ${num(u.suicide.radius)} tiles (no bounty)`);
  if (u.summon) out.push(`Summons ${u.summon.count} ${units[u.summon.unit]?.name ?? u.summon.unit}${u.summon.count > 1 ? 's' : ''} every ${u.summon.every}s (they last ${u.summon.ttl}s)`);
  return out;
}

const nth = (n: number) => (n === 1 ? '' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);

/** Short description of a building power (tooltips). */
export function powerText(b: BuildingDef): string | undefined {
  const p = b.power;
  if (!p) return undefined;
  // Global powers reach the whole map.
  const within = p.global ? 'anywhere on the map' : `within ${num(p.range)} tiles`;
  if (p.kind === 'tentacles') return `Tentacle prison: every ${num(p.cooldown)}s ${p.count} tentacles burst from the ground around the nearest enemy ${within} (they last ${num(p.duration)}s)`;
  if (p.kind === 'charm') return `Control: every ${num(p.cooldown)}s the nearest enemy unit ${within} with at most ${num(p.dmg)} HP joins your side`;
  if (p.kind === 'wave') return `Tsunami: every ${num(p.cooldown)}s a wave rolls ${num(p.range)} tiles towards the enemy, ${num(p.dmg)} damage to every ground unit in its path`;
  if (p.kind === 'chaos') return `Present of chaos: every ${num(p.cooldown)}s the nearest enemy unit ${within} suffers the next fate: ${num(p.dmg)} damage, a ${num(p.duration)}s stun, death (up to ${Math.round(p.dmg * 1.5)} HP), or nothing`;
  if (p.kind === 'erase') return `Erase: every ${num(p.cooldown)}s every enemy unit of the most numerous type ${within} dies (types with more than ${num(p.dmg)} HP are immune)`;
  if (p.kind === 'slay') return `Sudden death: every ${num(p.cooldown)}s the nearest enemy unit ${within} with at most ${num(p.dmg)} HP dies at once`;
  if (p.kind === 'hex' && p.air) return `Freezing blast: every ${num(p.cooldown)}s the toughest enemy flyer ${within} is frozen for ${num(p.duration)}s and takes ${num(p.dmg)} magic damage`;
  if (p.kind === 'hex') return `Hex: every ${num(p.cooldown)}s the toughest enemy unit ${within} is turned into a harmless critter for ${num(p.duration)}s`;
  if (p.kind === 'beam') return `Light beam: every ${num(p.cooldown)}s a ray hits the nearest enemy unit ${within} for ${num(p.dmg)} magic damage`;
  if (p.kind === 'stasis') return `Stasis: every ${num(p.cooldown)}s all enemy units ${within} are frozen for ${num(p.duration)}s`;
  if (p.kind === 'cyclone' && p.air) return `Meteor shower: every ${num(p.cooldown)}s meteors rain on the nearest enemy flyer ${within} for ${num(p.duration)}s (${num(p.dmg)} damage/s to flyers in radius ${num(p.radius)})`;
  if (p.kind === 'bombard' && p.freeze) return `Frost bolt: every ${num(p.cooldown)}s a bolt hits the nearest enemy building ${within} (${num(p.dmg)} damage in radius ${num(p.radius)}) and freezes it for ${num(p.freeze)}s: no training, shooting or casting`;
  if (p.kind === 'bombard') return `Bombard: every ${num(p.cooldown)}s a shell hits the nearest enemy building ${within} (${num(p.dmg)} siege damage in radius ${num(p.radius)}, half to units)`;
  return `Cyclone: every ${num(p.cooldown)}s a storm settles on the nearest enemy ${within} for ${num(p.duration)}s (${num(p.dmg)} damage/s and ${pct(p.slow ?? 0)} slow in radius ${num(p.radius)})`;
}

/** Building abilities besides spawning and auras (tooltips): mending, bouncing tower shots, powers. */
export function buildingAbilities(b: BuildingDef): string[] {
  const out: string[] = [];
  if (b.attack?.bonusVs) out.push(`${num(b.attack.bonusVs.mult)}× damage against ${VS[b.attack.bonusVs.vs]}`);
  if (b.attack?.multishot) out.push(`Multi-shot: each volley strikes ${b.attack.multishot} enemies`);
  if (b.revive) out.push(`Grace: every ${nth(b.revive.every)} own unit that falls within ${num(b.revive.radius)} tiles rises again`);
  if (b.attack?.chain) out.push(`Bouncing shot: each shot jumps between ${b.attack.chain} enemies`);
  if (b.mend) out.push(`Mends your team's buildings and castle within ${num(b.mend.radius)} tiles by ${num(b.mend.hps)} HP/s`);
  const p = powerText(b);
  if (p) out.push(p);
  return out;
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
  if (u.multishot) dmg += (u.multishot - 1) * 0.45;
  if (u.weaken) hp *= 1 + u.weaken.mult * 0.4;
  if (u.berserk) dmg += u.berserk.haste * 0.25;
  if (u.magicResist) hp *= 1 + u.magicResist * 0.3;
  if (u.deathBlast) dmg += 0.1;
  // One blast and the unit is gone.
  if (u.suicide) dmg *= 0.3;
  if (u.summon) dmg += 0.15 * u.summon.count * Math.min(1, u.summon.ttl / u.summon.every);
  if (u.evade) hp *= u.evade / (u.evade - 1);
  if (u.rangedResist) hp *= 1 + u.rangedResist * 0.5;
  if (u.block) hp *= 1 + Math.min(1, u.block / 25);
  return { dmg, hp };
}
