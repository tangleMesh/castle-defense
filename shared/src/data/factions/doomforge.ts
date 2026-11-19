import type { FactionDef } from '../types';

const OBSIDIAN = 0x3a2a2a;
const HELLFIRE = 0xff6a1a;
const FEL = 0xc02060;
const BRASS = 0x9a6a3a;

/**
 * Doomforge Pact: demons summoned from the burning pits. Tree and stat ratios follow the classic
 * "chaos" castle-fight race (chaos warriors → champions, satyrs → quill demons → the twins,
 * succubi, blood fiends, red dragons, infernals, the magic tower ruin's present of chaos, a volcano,
 * the shrine of destruction and the eraser), re-themed with the Pact's own names and look. Like the
 * map's race: chaos damage everywhere (full damage against every armour), but no tower and no siege.
 */
export const DOOMFORGE: FactionDef = {
  id: 'doomforge',
  name: 'Doomforge Pact',
  desc: 'Demons of the burning pits: chaos damage that ignores armour types, infernals, dragons and destructive magic, but no tower and no siege.',
  color: 0xc02060,
  traits: [
    'Chaos: most demons deal chaos damage, full against every armour type',
    'No walls: the Pact has no tower and no siege unit; it defends by killing',
    'Destruction: the Magic Tower Ruin curses enemies with chaos, the Volcano erupts under them, the Shrine of Destruction cripples buildings',
    'Infernals and dragons: burning giants that scorch everything nearby, flying red dragons',
    'Erase: the special wipes out every enemy unit of the most numerous kind',
  ],
  build: [
    'df_chaos_citadel', 'df_demon_cage', 'df_greed_altar', 'df_blood_fountain',
    'df_dragon_nest', 'df_demon_gate', 'df_magic_ruin', 'df_volcano',
    'df_destruction_shrine', 'df_eraser',
  ],
  buildings: [
    // ---------------------------------------------------------------- chaos warriors
    {
      id: 'df_chaos_citadel', name: 'Chaos Citadel', faction: 'doomforge', cost: 95, hp: 600, armor: 3, buildTime: 8, size: 2,
      desc: 'Chaos Warriors: brutes whose blades cleave the group around the target. Upgrades into Greater Chaos Citadel.',
      spawn: { unit: 'df_chaos_warrior', count: 1, interval: 21 },
      upgrades: ['df_greater_citadel'],
      model: { style: 'chaoscitadel', wall: OBSIDIAN, roof: FEL, height: 24 },
    },
    {
      id: 'df_greater_citadel', name: 'Greater Chaos Citadel', faction: 'doomforge', cost: 120, hp: 900, armor: 4, buildTime: 9, size: 2, upgradeOnly: true,
      desc: 'Chaos Champions: wide cleaves, the odd double blow, and their roar makes nearby demons hit 20% harder.',
      spawn: { unit: 'df_chaos_champion', count: 1, interval: 29 },
      model: { style: 'chaoscitadel', wall: 0x2a1a1a, roof: 0xe02a4a, height: 30 },
    },
    // ---------------------------------------------------------------- satyrs → quill demons → twins
    {
      id: 'df_demon_cage', name: 'Lesser Demon Cage', faction: 'doomforge', cost: 80, hp: 500, armor: 2, buildTime: 7, size: 2,
      desc: 'Satyrs: cheap goat-legged spear throwers. Upgrades into Greater Demon Cage.',
      spawn: { unit: 'df_satyr', count: 1, interval: 18 },
      upgrades: ['df_greater_cage'],
      model: { style: 'demoncage', wall: BRASS, roof: FEL, height: 22 },
    },
    {
      id: 'df_greater_cage', name: 'Greater Demon Cage', faction: 'doomforge', cost: 140, hp: 850, armor: 3, buildTime: 9, size: 2, upgradeOnly: true,
      desc: 'Quill Demons: fast quill volleys that bounce to a second enemy; melee attackers take 35% of their damage back. Upgrades (with a sapphire) into Serenity.',
      spawn: { unit: 'df_quill_demon', count: 1, interval: 29 },
      upgrades: ['df_serenity'],
      model: { style: 'demoncage', wall: 0x7a5a2a, roof: 0xe02a4a, height: 28 },
    },
    {
      id: 'df_serenity', name: 'Serenity', faction: 'doomforge', cost: 260, sapphires: 1, hp: 1200, armor: 4, buildTime: 14, size: 2, upgradeOnly: true,
      desc: 'ELITE (costs a sapphire): releases the Twins, a pair of laughing and weeping demons: crushing crits, stuns, evasion and strong magic resistance.',
      spawn: { unit: 'df_twin', count: 2, interval: 40 },
      model: { style: 'demoncage', wall: 0x5a3a5a, roof: 0xf0a0ff, height: 32 },
    },
    // ---------------------------------------------------------------- succubi, fiends
    {
      id: 'df_greed_altar', name: 'Altar of Greed', faction: 'doomforge', cost: 140, hp: 600, armor: 2, buildTime: 10, size: 2,
      desc: 'Succubi: chaos bolts, and their curse makes nearby enemies deal 20% less damage.',
      spawn: { unit: 'df_succubus', count: 1, interval: 25 },
      model: { style: 'greedaltar', wall: OBSIDIAN, roof: 0xe0a030, height: 24 },
    },
    {
      id: 'df_blood_fountain', name: 'Fountain of Blood', faction: 'doomforge', cost: 170, hp: 650, armor: 2, buildTime: 11, size: 2,
      desc: 'Blood Fiends: fast chaos claws that heal them for 20% of the damage they deal.',
      spawn: { unit: 'df_blood_fiend', count: 1, interval: 26 },
      model: { style: 'bloodfountain', wall: OBSIDIAN, roof: 0xb01a1a, height: 22 },
    },
    // ---------------------------------------------------------------- dragons, infernals
    {
      id: 'df_dragon_nest', name: 'Dragon Nest', faction: 'doomforge', cost: 210, hp: 750, armor: 3, buildTime: 12, size: 2,
      desc: 'Red Dragons: armoured flyers whose fire breath splashes chaos damage over groups.',
      spawn: { unit: 'df_red_dragon', count: 1, interval: 30 },
      model: { style: 'dragonnest', wall: 0x4a3a32, roof: HELLFIRE, height: 30 },
    },
    {
      id: 'df_demon_gate', name: 'Demon Gate', faction: 'doomforge', cost: 300, hp: 1000, armor: 4, buildTime: 15, size: 2,
      desc: 'Infernals: burning stone giants that strike air and ground and scorch every enemy around them (immolation, 12 HP/s).',
      spawn: { unit: 'df_infernal', count: 1, interval: 40 },
      model: { style: 'demongate', wall: OBSIDIAN, roof: 0x7aff3a, height: 40 },
    },
    // ---------------------------------------------------------------- destruction
    {
      id: 'df_magic_ruin', name: 'Magic Tower Ruin', faction: 'doomforge', cost: 150, hp: 650, armor: 2, buildTime: 10, size: 2,
      desc: 'Every 10 s the nearest enemy unit within 13 tiles suffers a present of chaos: in turn 350 damage, a 4 s stun, death (up to 525 HP), or nothing at all.',
      power: { kind: 'chaos', cooldown: 10, range: 13, radius: 0, dmg: 350, duration: 4 },
      model: { style: 'magicruin', wall: 0x6a5a6a, roof: FEL, height: 30 },
    },
    {
      id: 'df_volcano', name: 'Volcano', faction: 'doomforge', cost: 200, hp: 700, armor: 3, buildTime: 12, size: 2,
      desc: 'Every 12 s the ground erupts under the nearest enemy ground units within 14 tiles: heavy damage for 3 s.',
      power: { kind: 'cyclone', cooldown: 12, range: 14, radius: 2.5, dmg: 55, duration: 3, slow: 0 },
      model: { style: 'volcano', wall: 0x4a3a32, roof: HELLFIRE, height: 34 },
    },
    {
      id: 'df_destruction_shrine', name: 'Shrine of Destruction', faction: 'doomforge', cost: 280, hp: 700, armor: 3, buildTime: 14, size: 2,
      desc: "Every 40 s Hell's Fist strikes the nearest enemy building within 30 tiles: 300 damage, and it is crippled for 20 s (no training, shooting or casting).",
      power: { kind: 'bombard', cooldown: 40, range: 30, radius: 1, dmg: 300, freeze: 20 },
      model: { style: 'destructionshrine', wall: OBSIDIAN, roof: HELLFIRE, height: 36 },
    },
    // ---------------------------------------------------------------- special
    {
      id: 'df_eraser', name: 'Eraser', faction: 'doomforge', cost: 400, hp: 1800, armor: 6, buildTime: 20, size: 2, special: true, sapphires: 1,
      desc: 'SPECIAL: costs a sapphire. Every 50 s every enemy unit of the most numerous kind within 18 tiles is erased (kinds with more than 1000 HP are immune). Upgrades twice.',
      power: { kind: 'erase', cooldown: 50, range: 18, radius: 0, dmg: 1000 },
      upgrades: ['df_eraser_2'],
      model: { style: 'eraser', wall: OBSIDIAN, roof: FEL, height: 46 },
    },
    {
      id: 'df_eraser_2', name: 'Eraser II', faction: 'doomforge', cost: 175, hp: 2200, armor: 7, buildTime: 15, size: 2, special: true, upgradeOnly: true,
      desc: 'Erases every 38 s, within 20 tiles.',
      power: { kind: 'erase', cooldown: 38, range: 20, radius: 0, dmg: 1000 },
      upgrades: ['df_eraser_3'],
      model: { style: 'eraser', wall: 0x2a1a2a, roof: 0xe02a8a, height: 52 },
    },
    {
      id: 'df_eraser_3', name: 'Eraser III', faction: 'doomforge', cost: 175, hp: 2600, armor: 8, buildTime: 15, size: 2, special: true, upgradeOnly: true,
      desc: 'Erases every 25 s, within 22 tiles.',
      power: { kind: 'erase', cooldown: 25, range: 22, radius: 0, dmg: 1000 },
      model: { style: 'eraser', wall: 0x1a0a1a, roof: 0xff4ab0, height: 58 },
    },
  ],
  units: [
    { id: 'df_chaos_warrior', name: 'Chaos Warrior', hp: 380, armor: 5, armorType: 'medium', dmg: 20, attackType: 'chaos', range: 0.5, cooldown: 1.35, speed: 3.2, radius: 0.36, bounty: 5,
      splash: 0.8,
      model: { shape: 'demon', body: 0x8a2a2a, accent: FEL, scale: 1.05, variant: 'warrior' } },
    { id: 'df_chaos_champion', name: 'Chaos Champion', hp: 800, armor: 8, armorType: 'medium', dmg: 42, attackType: 'chaos', range: 0.6, cooldown: 1.35, speed: 3.2, radius: 0.42, bounty: 11,
      splash: 1, crit: { every: 10, mult: 2 }, aura: { stat: 'dmg', value: 0.2, radius: 4, target: 'ally' },
      model: { shape: 'demon', body: 0x6a1a2a, accent: 0xff4a4a, scale: 1.3, variant: 'champion' } },
    { id: 'df_satyr', name: 'Satyr', hp: 240, armor: 3, armorType: 'light', dmg: 14, attackType: 'chaos', range: 2.75, cooldown: 1.3, speed: 3.1, radius: 0.3, bounty: 3, targetsAir: true,
      model: { shape: 'satyr', body: 0x7a4a2a, accent: FEL, scale: 1 } },
    { id: 'df_quill_demon', name: 'Quill Demon', hp: 660, armor: 4, armorType: 'light', dmg: 24, attackType: 'chaos', range: 3.1, cooldown: 0.8, speed: 3.2, radius: 0.4, bounty: 9, targetsAir: true,
      chain: 2, thorns: 0.35,
      model: { shape: 'quilldemon', body: 0x5a3a2a, accent: 0xe0d0a0, scale: 1.2 } },
    { id: 'df_twin', name: 'Twin of Serenity', hp: 800, armor: 10, armorType: 'heavy', dmg: 40, attackType: 'chaos', range: 1, cooldown: 1.0, speed: 3.0, radius: 0.4, bounty: 14,
      crit: { every: 4, mult: 3 }, bash: { every: 5, stun: 1 }, evade: 7, magicResist: 0.6,
      model: { shape: 'twin', body: 0xf0a0ff, accent: 0x5a2a6a, scale: 1.2 } },
    { id: 'df_succubus', name: 'Succubus', hp: 430, armor: 2, armorType: 'light', dmg: 34, attackType: 'chaos', range: 3.6, cooldown: 1.4, speed: 3.1, radius: 0.32, bounty: 7, targetsAir: true,
      aura: { stat: 'dmg', value: -0.2, radius: 3.5, target: 'enemy' },
      model: { shape: 'succubus', body: 0xb04a6a, accent: 0xe0a030, scale: 1.05 } },
    { id: 'df_blood_fiend', name: 'Blood Fiend', hp: 540, armor: 5, armorType: 'medium', dmg: 30, attackType: 'chaos', range: 0.5, cooldown: 1.2, speed: 3.5, radius: 0.38, bounty: 8,
      lifesteal: 0.2,
      model: { shape: 'fiend', body: 0x9a1a1a, accent: 0xff8a3a, scale: 1.1 } },
    { id: 'df_red_dragon', name: 'Red Dragon', hp: 760, armor: 6, armorType: 'heavy', dmg: 38, attackType: 'chaos', range: 4, cooldown: 1.4, speed: 3.2, radius: 0.5, bounty: 11, air: true, targetsAir: true,
      splash: 1,
      model: { shape: 'reddragon', body: 0xb02a1a, accent: HELLFIRE, scale: 1.35 } },
    { id: 'df_infernal', name: 'Infernal', hp: 1500, armor: 7, armorType: 'heavy', dmg: 60, attackType: 'chaos', range: 0.7, cooldown: 1.2, speed: 3.0, radius: 0.58, bounty: 18, targetsAir: true,
      aura: { stat: 'regen', value: -12, radius: 2, target: 'enemy' },
      model: { shape: 'infernal', body: 0x3a3a32, accent: 0x7aff3a, scale: 1.5 } },
  ],
};
