/**
 * Writes docs/factions.md from the faction data (`npm run docs:factions`): every race's build
 * list, upgrade tree, costs, units and abilities, exactly as the game uses them.
 */
import { writeFileSync } from 'node:fs';
import { BUILDINGS, FACTIONS, UNITS, buildingAbilities, num, unitAbilities, type BuildingDef, type FactionId } from '@bc/shared';

const MAP_RACE: Record<FactionId, string> = {
  ironvow: 'Human', thornwild: 'Nature', shardbound: 'Elemental', cogspark: 'Mechanical', duskmoon: 'Night Elf', bloodtusk: 'Orc',
  sunspire: 'Elf', frostmark: 'Northern', gravewake: 'Undead', doomforge: 'Chaos', tidecall: 'Naga', blightroot: 'Corrupted',
};

const esc = (s: string) => s.replace(/\|/g, '\\|');
const price = (b: BuildingDef) => `${num(b.cost)}${b.lumber ? ` + ${num(b.lumber)} lumber` : ''}${b.special ? ' · legendary' : ''}`;

const out: string[] = [];
out.push(`# Factions

Every faction is a copy of a race of the author's Warcraft III castle-fight map (\`castleFight.w3x\`): the same build
list, upgrade trees, gold and lumber costs, hit points, armour, damage, ranges, cooldowns, spawn times, bounties and
abilities. Only names, looks and a few mechanics that need Warcraft's engine are our own (see below).

This file is generated from the data: \`npm run docs:factions\`.

## How the map's values were converted

| Map value | Castle Defense |
|---|---|
| Hit points, armour, gold, lumber, cooldown, spawn time | 1 : 1 |
| Damage | base + average of the dice (\`ua1b + d × (s + 1) / 2\`) |
| Range, movement speed, areas | ÷ 100 (500 range → 5 tiles, 270 speed → 2.7); melee (≤ 128) keeps our melee reach |
| Bounty | base + average of the dice |
| Armour and attack types | the map's damage table (normal, pierce, siege, magic, chaos, hero, spells × light, medium, heavy, fortified, hero, divine, unarmored) |
| Chance abilities (crit, bash, evade, …) | real random chance, seeded and side-symmetric |
| Buildings without hit points / armour in the map | 1200 HP / 5 armour (the editor default of their base building); missing gold is 140 |
| Legendaries (food 1) | need a sapphire (one per round; more can be bought) |
| Income | 5 + 2% of every building's value (some buildings other rates) every 10 s; Treasure Boxes +25%, each further one 15% less |
| Lumber | 125 at the start; a finished building or upgrade gives its value in lumber (most buildings) |

Abilities that rely on Warcraft's mana and spell system were turned into our closest mechanic: a cooldown spell of
a unit becomes a chance per attack with the same average rate (e.g. a 14 s entangle on a 1.6 s attacker → 11.5%
per hit), and target-picking spells of buildings pick a random or the nearest valid target anywhere on the map.
`);

for (const f of Object.values(FACTIONS)) {
  out.push(`## ${f.name} (the map's ${MAP_RACE[f.id]} race)\n\n${f.desc}\n`);
  for (const t of f.traits) out.push(`- ${t}`);
  out.push('\n### Buildings\n\n| Building | Cost | Trains | Upgrades into | Abilities |\n|---|---|---|---|---|');
  const seen = new Set<string>();
  const row = (id: string, depth: number) => {
    if (seen.has(id)) return;
    seen.add(id);
    const b = BUILDINGS[id];
    const sp = b.spawn;
    const trains = sp ? `${sp.count > 1 ? `${sp.count}× ` : ''}${UNITS[sp.pool ? sp.pool[0] : sp.unit].name}${sp.pool ? ' (random kind)' : ''} every ${num(sp.interval)} s` : '';
    const ups = (b.upgrades ?? []).map((u) => BUILDINGS[u].name).join(', ');
    const extra: string[] = [];
    if (b.attack) extra.push(`Attack: ${num(b.attack.dmg)} ${b.attack.attackType} every ${num(b.attack.cooldown)} s, range ${num(b.attack.range)}${b.attack.splash ? `, splash ${num(b.attack.splash)}` : ''}${b.attack.targetsAir ? '' : ', ground only'}`);
    if (b.aura) extra.push(`Aura: ${b.aura.value > 0 ? '+' : ''}${b.aura.stat === 'armor' || b.aura.stat === 'regen' || b.aura.stat === 'block' ? num(b.aura.value) : `${Math.round(b.aura.value * 100)}%`} ${b.aura.stat} for ${b.aura.target === 'ally' ? 'allies' : 'enemies'} within ${num(b.aura.radius)} tiles`);
    out.push(`| ${'→ '.repeat(depth)}${esc(b.name)} | ${price(b)} | ${esc(trains)} | ${esc(ups)} | ${esc([...extra, ...buildingAbilities(b)].join('; '))} |`);
    for (const u of b.upgrades ?? []) row(u, depth + 1);
  };
  for (const id of f.build) row(id, 0);
  out.push('\n### Units\n\n| Unit | HP | Armour | Damage | Cooldown | Range | Speed | Bounty | Abilities |\n|---|---|---|---|---|---|---|---|---|');
  for (const u of f.units) {
    out.push(`| ${esc(u.name)}${u.air ? ' (flying)' : ''} | ${num(u.hp)} | ${num(u.armor)} ${u.armorType} | ${num(u.dmg)} ${u.attackType} | ${num(u.cooldown)} s | ${num(u.range)} | ${num(u.speed)} | ${num(u.bounty)} | ${esc(unitAbilities(u, UNITS).join('; '))} |`);
  }
  out.push('');
}
writeFileSync(new URL('../../docs/factions.md', import.meta.url), out.join('\n') + '\n');
console.log('wrote docs/factions.md');
