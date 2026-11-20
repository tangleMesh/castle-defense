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
  desc: "Chaos demons: cleaving chaos warriors, satyrs and quill demons, the immune twins, cursing succubi, chaos-born blood fiends, red dragons and burning infernals, with chaotic magic, a volcano, Hell's Fist and the Eraser.",
  color: 0xc02060,
  traits: [
    "Chaos warriors and champions cleave; the champion's roar makes allies deal 25% more damage",
    "Quill demons' aura reflects 35% of melee damage; succubi curse their targets (35% less damage)",
    "Blood fiends are chaos-born: a random armour type and a random perk each",
    "Present of chaos: a random enemy explodes, dies, mutates into your Mutation, is hexed, hurt, stunned, strengthened, or nothing happens",
    "Legendaries: the Twins of Serenity, Hell's Fist (cripples a building for 6 minutes) and the Eraser (kills a whole enemy unit type)",
  ],
  build: [
    'df_magic_ruin', 'df_blood_fountain', 'df_eraser', 'df_demon_cage', 'df_volcano', 'df_destruction_shrine', 'df_greed_altar', 'df_chaos_citadel', 'df_dragon_nest', 'treasure_box', 'df_demon_gate',
  ],
  buildings: [
    {
      id: 'df_chaos_citadel', name: 'Chaos Citadel', faction: 'doomforge', cost: 160, hp: 1200, armor: 5, buildTime: 2, size: 2,
      desc: "Trains Chaos Warriors: cleaving blows. Upgrades into the Greater Chaos Citadel.",
      spawn: { unit: 'df_chaos_warrior', count: 1, interval: 23 },
      upgrades: ['df_greater_citadel'],
      model: { style: 'chaoscitadel', wall: OBSIDIAN, roof: FEL, height: 24 },
    },
    {
      id: 'df_greater_citadel', name: 'Greater Chaos Citadel', faction: 'doomforge', cost: 190, hp: 1400, armor: 5, buildTime: 2, size: 2, upgradeOnly: true,
      desc: "Trains Chaos Champions: wide cleaves, critical strikes and a roar that makes allies deal 25% more damage.",
      spawn: { unit: 'df_chaos_champion', count: 1, interval: 32 },
      model: { style: 'chaoscitadel', wall: 0x2a1a1a, roof: 0xe02a4a, height: 30 },
    },
    {
      id: 'df_demon_cage', name: 'Lesser Demon Cage', faction: 'doomforge', cost: 120, hp: 1200, armor: 5, buildTime: 2, size: 2,
      desc: "Trains Satyrs: cheap ranged demons. Upgrades into the Greater Demon Cage.",
      spawn: { unit: 'df_satyr', count: 1, interval: 21 },
      upgrades: ['df_greater_cage'],
      model: { style: 'demoncage', wall: BRASS, roof: FEL, height: 22 },
    },
    {
      id: 'df_greater_cage', name: 'Greater Demon Cage', faction: 'doomforge', cost: 230, hp: 1400, armor: 5, buildTime: 2, size: 2, upgradeOnly: true,
      desc: "Trains Quill Demons: bouncing quills and an aura that reflects 35% of melee damage. Upgrades into Serenity (legendary).",
      spawn: { unit: 'df_quill_demon', count: 1, interval: 32 },
      upgrades: ['df_serenity'],
      model: { style: 'demoncage', wall: 0x7a5a2a, roof: 0xe02a4a, height: 28 },
    },
    {
      id: 'df_serenity', name: 'Serenity', faction: 'doomforge', cost: 550, lumber: 1600, hp: 2000, armor: 5, buildTime: 2, size: 2, upgradeOnly: true, special: true, sapphires: 1,
      desc: "LEGENDARY: needs a sapphire. Trains the Twins: the laughing Twin Smiley (4\u00d7 critical strikes, a slowing clap) and the weeping Twin Weeper (cleave, poisonous gas). Both immune, divine armour, 90% spell resistance.",
      spawn: { unit: 'df_twin', count: 1, interval: 60, extra: 'df_twin_weeper' },
      lumberGain: 0,
      model: { style: 'demoncage', wall: 0x5a3a5a, roof: 0xf0a0ff, height: 32 },
    },
    {
      id: 'df_greed_altar', name: 'Altar of Greed', faction: 'doomforge', cost: 230, hp: 1300, armor: 5, buildTime: 2, size: 2,
      desc: "Trains Succubi: magic bolts whose curse makes the target deal 35% less damage for 45 s.",
      spawn: { unit: 'df_succubus', count: 1, interval: 26 },
      model: { style: 'greedaltar', wall: OBSIDIAN, roof: 0xe0a030, height: 24 },
    },
    {
      id: 'df_blood_fountain', name: 'Fountain of Blood', faction: 'doomforge', cost: 280, hp: 1300, armor: 5, buildTime: 2, size: 2,
      desc: "Trains Blood Fiends: fast chaos brutes, each born with a random armour type and a random perk.",
      spawn: { unit: 'df_blood_fiend', count: 1, interval: 29 },
      model: { style: 'bloodfountain', wall: OBSIDIAN, roof: 0xb01a1a, height: 22 },
    },
    {
      id: 'df_dragon_nest', name: 'Dragon Nest', faction: 'doomforge', cost: 350, hp: 1400, armor: 5, buildTime: 2, size: 2,
      desc: "Trains Red Dragons: flying chaos fire with splash.",
      spawn: { unit: 'df_red_dragon', count: 1, interval: 32 },
      model: { style: 'dragonnest', wall: 0x4a3a32, roof: HELLFIRE, height: 30 },
    },
    {
      id: 'df_demon_gate', name: 'Demon Gate', faction: 'doomforge', cost: 500, hp: 1600, armor: 5, buildTime: 2, size: 2,
      desc: "Summons Infernals: huge chaos brutes that also hit flyers and burn every enemy within 3 tiles (33 damage per second).",
      spawn: { unit: 'df_infernal', count: 1, interval: 40 },
      model: { style: 'demongate', wall: OBSIDIAN, roof: 0x7aff3a, height: 40 },
    },
    {
      id: 'df_magic_ruin', name: 'Magic Tower Ruin', faction: 'doomforge', cost: 200, lumber: 330, hp: 1400, armor: 5, buildTime: 2, size: 2,
      desc: "Present of chaos: every 10 s a random enemy unit anywhere suffers one of eight fates (explodes, dies, mutates into your Mutation, hexed, 500 damage, stunned, strengthened, or nothing).",
      power: { kind: 'chaos', global: true, cooldown: 10, range: 13, radius: 0, dmg: 0, unit: 'df_mutation' },
      incomeRate: 0.009, lumberGain: 0,
      model: { style: 'magicruin', wall: 0x6a5a6a, roof: FEL, height: 30 },
    },
    {
      id: 'df_volcano', name: 'Volcano', faction: 'doomforge', cost: 340, lumber: 660, hp: 900, armor: 5, buildTime: 2, size: 2,
      desc: "Eruption: every 12 s the ground erupts around the nearest enemy anywhere on the map: 100 spell damage per second for 2.75 s.",
      power: { kind: 'cyclone', global: true, cooldown: 12, range: 14, radius: 2.5, dmg: 100, duration: 2.75, slow: 0 },
      incomeRate: 0.009, lumberGain: 0,
      model: { style: 'volcano', wall: 0x4a3a32, roof: HELLFIRE, height: 34 },
    },
    {
      id: 'df_destruction_shrine', name: 'Shrine of Destruction', faction: 'doomforge', cost: 850, lumber: 1800, hp: 1300, armor: 5, buildTime: 2, size: 2, special: true, sapphires: 1,
      desc: "LEGENDARY: needs a sapphire. Hell's Fist: every 40 s the nearest enemy building anywhere takes 400 damage and is disabled for 6 minutes (no training, shooting or casting).",
      power: { kind: 'bombard', global: true, cooldown: 40, range: 30, radius: 1, dmg: 400, freeze: 360 },
      incomeRate: 0.012, lumberGain: 0,
      model: { style: 'destructionshrine', wall: OBSIDIAN, roof: HELLFIRE, height: 36 },
    },
    {
      id: 'df_eraser', name: 'Eraser', faction: 'doomforge', cost: 350, lumber: 1000, hp: 1000, armor: 5, buildTime: 2, size: 2, special: true, sapphires: 1,
      desc: "LEGENDARY: needs a sapphire. Erase: every 50 s every enemy unit of a random type dies, anywhere on the map. Upgrades twice (\u221212.5 s each).",
      upgrades: ['df_eraser_2'],
      power: { kind: 'erase', global: true, cooldown: 50, range: 18, radius: 0, dmg: 1000000 },
      incomeRate: 0.009, lumberGain: 0,
      model: { style: 'eraser', wall: OBSIDIAN, roof: FEL, height: 46 },
    },
    {
      id: 'df_eraser_2', name: 'Eraser II', faction: 'doomforge', cost: 175, lumber: 350, hp: 1250, armor: 5, buildTime: 2, size: 2, upgradeOnly: true, special: true,
      desc: "Erases a random enemy unit type every 37.5 s.",
      upgrades: ['df_eraser_3'],
      power: { kind: 'erase', global: true, cooldown: 37.5, range: 20, radius: 0, dmg: 1000000 },
      incomeRate: 0.009, lumberGain: 0,
      model: { style: 'eraser', wall: 0x2a1a2a, roof: 0xe02a8a, height: 52 },
    },
    {
      id: 'df_eraser_3', name: 'Eraser III', faction: 'doomforge', cost: 175, lumber: 350, hp: 1500, armor: 5, buildTime: 2, size: 2, upgradeOnly: true, special: true,
      desc: "Erases a random enemy unit type every 25 s.",
      power: { kind: 'erase', global: true, cooldown: 25, range: 22, radius: 0, dmg: 1000000 },
      incomeRate: 0.009, lumberGain: 0,
      model: { style: 'eraser', wall: 0x1a0a1a, roof: 0xff4ab0, height: 58 },
    },
  ],
  units: [
    { id: 'df_chaos_warrior', name: 'Chaos Warrior', hp: 400, armor: 5, armorType: 'medium', dmg: 37.5, attackType: 'normal', range: 0.5, cooldown: 1.39, speed: 3.2, radius: 0.36, bounty: 5,
      cleave: { pct: 0.25, radius: 1.75 },
      model: { shape: 'demon', body: 0x8a2a2a, accent: FEL, scale: 1.05, variant: 'warrior' } },
    { id: 'df_chaos_champion', name: 'Chaos Champion', hp: 850, armor: 8, armorType: 'medium', dmg: 80, attackType: 'normal', range: 0.6, cooldown: 1.36, speed: 3.2, radius: 0.42, bounty: 11,
      crit: { chance: 0.1, mult: 2 }, cleave: { pct: 0.35, radius: 2 }, aura: { stat: 'dmg', value: 0.25, radius: 5.25, target: 'ally' },
      model: { shape: 'demon', body: 0x6a1a2a, accent: 0xff4a4a, scale: 1.3, variant: 'champion' } },
    { id: 'df_satyr', name: 'Satyr', hp: 250, armor: 3, armorType: 'light', dmg: 28, attackType: 'normal', range: 2.75, cooldown: 1.4, speed: 3.2, radius: 0.3, bounty: 3, targetsAir: true,
      model: { shape: 'satyr', body: 0x7a4a2a, accent: FEL, scale: 1 } },
    { id: 'df_quill_demon', name: 'Quill Demon', hp: 700, armor: 4, armorType: 'light', dmg: 46, attackType: 'normal', range: 3.1, cooldown: 0.8, speed: 3.2, radius: 0.4, bounty: 11, targetsAir: true,
      regen: 1, chain: 2, aura: { stat: 'thorns', value: 0.35, radius: 3.5, target: 'ally' },
      model: { shape: 'quilldemon', body: 0x5a3a2a, accent: 0xe0d0a0, scale: 1.2 } },
    { id: 'df_twin', name: 'Twin Smiley', hp: 450, armor: 15, armorType: 'divine', dmg: 101, attackType: 'chaos', range: 5, cooldown: 1, speed: 3, radius: 0.4, bounty: 21, targetsAir: true,
      immune: true, magicResist: 0.9, bash: { chance: 0.15, stun: 2 }, evade: 0.15, crit: { chance: 0.3, mult: 4 }, poison: { dps: 0, duration: 5, slow: 0.5 },
      model: { shape: 'twin', body: 0xf0a0ff, accent: 0x5a2a6a, scale: 1.2 } },
    { id: 'df_twin_weeper', name: 'Twin Weeper', hp: 450, armor: 15, armorType: 'divine', dmg: 101, attackType: 'chaos', range: 0.5, cooldown: 1, speed: 3, radius: 0.4, bounty: 21,
      immune: true, magicResist: 0.9, bash: { chance: 0.15, stun: 2 }, evade: 0.15, cleave: { pct: 0.3, radius: 4 }, aura: { stat: 'regen', value: -40, radius: 4, target: 'enemy' },
      model: { shape: 'twin', body: 0x6a3a7a, accent: 0xd0b0e8, scale: 1.2, variant: 'weeper' } },
    { id: 'df_succubus', name: 'Succubus', hp: 450, armor: 2, armorType: 'light', dmg: 69.5, attackType: 'magic', range: 3.6, cooldown: 1.54, speed: 3.1, radius: 0.32, bounty: 7, targetsAir: true,
      regen: 1.5, weaken: { mult: 0.35, duration: 45 },
      model: { shape: 'succubus', body: 0xb04a6a, accent: 0xe0a030, scale: 1.05 } },
    { id: 'df_blood_fiend', name: 'Blood Fiend', hp: 570, armor: 5, armorType: 'medium', dmg: 55, attackType: 'chaos', range: 0.5, cooldown: 1.2, speed: 3.5, radius: 0.38, bounty: 9,
      regen: 2, chaosSpawn: true,
      model: { shape: 'fiend', body: 0x9a1a1a, accent: 0xff8a3a, scale: 1.1 } },
    { id: 'df_red_dragon', name: 'Red Dragon', hp: 800, armor: 6, armorType: 'heavy', dmg: 70, attackType: 'chaos', range: 4, cooldown: 1.4, speed: 3.2, radius: 0.5, bounty: 11, air: true, targetsAir: true,
      splash: 2,
      model: { shape: 'reddragon', body: 0xb02a1a, accent: HELLFIRE, scale: 1.35 } },
    { id: 'df_infernal', name: 'Infernal', hp: 1600, armor: 7, armorType: 'heavy', dmg: 122.5, attackType: 'chaos', range: 0.7, cooldown: 1.36, speed: 3, radius: 0.58, bounty: 16, targetsAir: true,
      regen: 5, aura: { stat: 'regen', value: -33, radius: 3, target: 'enemy' },
      model: { shape: 'infernal', body: 0x3a3a32, accent: 0x7aff3a, scale: 1.5 } },
    { id: 'df_mutation', name: 'Mutation', hp: 600, armor: 4, armorType: 'medium', dmg: 50, attackType: 'normal', range: 0.5, cooldown: 1.5, speed: 2.7, radius: 0.42, bounty: 1,
      regen: 1,
      model: { shape: 'mutation', body: 0x8a3a5a, accent: 0xd06a8a, scale: 1.1 } },
  ],
};
