import type { FactionDef } from '../types';

const SNOW = 0xe8f0f8;
const ICE = 0x8ad0f0;
const PINE = 0x3a5a4a;
const STONE = 0x7a8090;

/**
 * Frostmark Clans: the beasts and tribes of the frozen north. Tree and stat ratios follow the
 * classic "northern" castle-fight race (frost wolves → polar bears → magnataurs, wendigos, ice
 * trolls with frost armour, frost-throwing yetis, the ice queen, azure drakes, a chilling splash
 * tower, a mushroom that freezes flyers, frost launchers that freeze buildings and the world
 * freezer), re-themed with the Clans' own names and look.
 */
export const FROSTMARK: FactionDef = {
  id: 'frostmark',
  name: 'Frostmark Clans',
  desc: "Beasts and trolls of the frozen north: wolves, bears and magnataurs, pulverizing wendigos, ice trolls that freeze their targets, the Ice Queen, rime throwers, azure drakes, frost launchers that freeze buildings and the World Freezer.",
  color: 0xa8d8f8,
  traits: [
    "Frost attack: trolls, throwers and the Ice Queen can freeze a ground target in place for 7\u201312.5 s while it takes damage",
    "Chill: witch doctors, azure drakes and the icy tower slow everything they hit by 30%",
    "Wendigos pulverize; the ancient wendigo's howl makes enemies deal 30% less damage",
    "Frost launchers freeze enemy buildings (no training, shooting or casting) anywhere on the map",
    "Legendaries: the Raging Rime Thrower (triple shot, immune) and the World Freezer",
  ],
  build: [
    'fm_frost_mushroom', 'fm_frost_launcher', 'fm_world_freezer', 'fm_snowy_rocks', 'fm_ice_claws', 'fm_crystal_palace', 'fm_troll_hut', 'fm_icy_tower', 'treasure_box', 'fm_igloo', 'fm_azure_nest',
  ],
  buildings: [
    {
      id: 'fm_snowy_rocks', name: 'Snowy Rocks', faction: 'frostmark', cost: 115, hp: 1200, armor: 5, buildTime: 2, size: 2,
      desc: "Frost Wolves: fast and cheap, a 10% critical bite. Upgrades into Icy Rocks.",
      spawn: { unit: 'fm_wolf', count: 1, interval: 20 },
      upgrades: ['fm_icy_rocks'],
      model: { style: 'snowrocks', wall: STONE, roof: SNOW, height: 16 },
    },
    {
      id: 'fm_icy_rocks', name: 'Icy Rocks', faction: 'frostmark', cost: 125, hp: 1300, armor: 5, buildTime: 2, size: 2, upgradeOnly: true,
      desc: "Polar Bears: cleaving swipes and critical strikes. Upgrades into the Glacier.",
      spawn: { unit: 'fm_bear', count: 1, interval: 27 },
      upgrades: ['fm_glacier'],
      model: { style: 'snowrocks', wall: 0x6a7080, roof: ICE, height: 20 },
    },
    {
      id: 'fm_glacier', name: 'Glacier', faction: 'frostmark', cost: 250, hp: 1600, armor: 5, buildTime: 2, size: 2, upgradeOnly: true,
      desc: "Magnataurs: wide cleaves, 15% critical strikes (3\u00d7) and a stomp.",
      spawn: { unit: 'fm_magnataur', count: 1, interval: 39 },
      model: { style: 'snowrocks', wall: 0x5a6070, roof: 0x5ab0f0, height: 26 },
    },
    {
      id: 'fm_ice_claws', name: 'Ice Claws', faction: 'frostmark', cost: 275, hp: 1300, armor: 5, buildTime: 2, size: 2,
      desc: "Wendigos: a 25% chance to pulverize the ground for 80. Upgrades into Frost Claws.",
      spawn: { unit: 'fm_wendigo', count: 1, interval: 28 },
      upgrades: ['fm_frost_claws'],
      model: { style: 'icecave', wall: STONE, roof: ICE, height: 22 },
    },
    {
      id: 'fm_frost_claws', name: 'Frost Claws', faction: 'frostmark', cost: 225, hp: 1600, armor: 5, buildTime: 2, size: 2, upgradeOnly: true,
      desc: "Ancient Wendigos: stronger pulverize, and a howl that makes enemies deal 30% less damage.",
      spawn: { unit: 'fm_ancient_wendigo', count: 1, interval: 40 },
      model: { style: 'icecave', wall: 0x5a6070, roof: 0x6ac0f0, height: 26 },
    },
    {
      id: 'fm_igloo', name: 'Igloo', faction: 'frostmark', cost: 160, hp: 1200, armor: 5, buildTime: 2, size: 2,
      desc: "Rime Throwers: rapid icy throws with a small chance to freeze. Upgrades into the Modern Igloo (legendary).",
      spawn: { unit: 'fm_rime_thrower', count: 1, interval: 23 },
      upgrades: ['fm_great_igloo'],
      model: { style: 'igloo', wall: SNOW, roof: ICE, height: 16 },
    },
    {
      id: 'fm_great_igloo', name: 'Great Igloo', faction: 'frostmark', cost: 580, lumber: 460, hp: 1900, armor: 5, buildTime: 2, size: 2, upgradeOnly: true, special: true, sapphires: 1,
      desc: "LEGENDARY: needs a sapphire. Raging Rime Throwers: three targets at once, immune, 70% spell resistance, freezing throws.",
      spawn: { unit: 'fm_raging_thrower', count: 1, interval: 52 },
      lumberGain: 0,
      model: { style: 'igloo', wall: 0xf0f8ff, roof: 0x5ab0f0, height: 22 },
    },
    {
      id: 'fm_troll_hut', name: 'Ice Troll Hut', faction: 'frostmark', cost: 175, hp: 1200, armor: 5, buildTime: 2, size: 2,
      desc: "Ice Troll Shadow Priests: frost bolts that can freeze, and frost armour for nearby allies. Upgrades into the Voodoo Lounge.",
      spawn: { unit: 'fm_ice_priest', count: 1, interval: 23 },
      upgrades: ['fm_voodoo_lounge'],
      model: { style: 'icehut', wall: PINE, roof: SNOW, height: 22 },
    },
    {
      id: 'fm_voodoo_lounge', name: 'Voodoo Lounge', faction: 'frostmark', cost: 150, hp: 1400, armor: 5, buildTime: 2, size: 2, upgradeOnly: true,
      desc: "Ice Troll Witch Doctors: chilling bolts, freezes, and stronger frost armour for allies.",
      spawn: { unit: 'fm_witch_doctor', count: 1, interval: 31 },
      model: { style: 'icehut', wall: 0x2a4a3a, roof: ICE, height: 26 },
    },
    {
      id: 'fm_crystal_palace', name: 'Crystal Palace', faction: 'frostmark', cost: 400, hp: 1500, armor: 5, buildTime: 2, size: 2,
      desc: "The Ice Queen: chaos frost bolts, frost novas, and a 20% chance to freeze her target for 12.5 s.",
      spawn: { unit: 'fm_ice_queen', count: 1, interval: 35 },
      model: { style: 'icepalace', wall: SNOW, roof: ICE, height: 40 },
    },
    {
      id: 'fm_azure_nest', name: 'Azure Nest', faction: 'frostmark', cost: 280, hp: 1300, armor: 5, buildTime: 2, size: 2,
      desc: "Azure Drakes: flying chaos frost breath with splash that chills.",
      spawn: { unit: 'fm_azure_drake', count: 1, interval: 29 },
      model: { style: 'icenest', wall: STONE, roof: 0x4a8ae0, height: 30 },
    },
    {
      id: 'fm_icy_tower', name: 'Icy Tower', faction: 'frostmark', cost: 230, lumber: 300, hp: 1500, armor: 8, buildTime: 20, size: 2,
      desc: "Base defence: an icy tower whose shards splash and chill (83 damage per second).",
      attack: { dmg: 100, attackType: 'normal', range: 7.5, cooldown: 1.2, targetsAir: true, splash: 1.45 },
      incomeRate: 0.008, lumberGain: 0,
      model: { style: 'icetower', wall: SNOW, roof: ICE, height: 42 },
    },
    {
      id: 'fm_frost_mushroom', name: 'Chilling Mushroom', faction: 'frostmark', cost: 190, lumber: 350, hp: 800, armor: 5, buildTime: 2, size: 2,
      desc: "Freezing blast: every 6 s the toughest enemy flyer within 10 tiles is frozen for 6 s and takes 200 spell damage.",
      power: { kind: 'hex', cooldown: 6, range: 10, radius: 0, dmg: 200, duration: 6, air: true },
      incomeRate: 0.012, lumberGain: 0,
      model: { style: 'frostshroom', wall: SNOW, roof: 0x6ab0f0, height: 24 },
    },
    {
      id: 'fm_frost_launcher', name: 'Frost Launcher', faction: 'frostmark', cost: 210, lumber: 475, hp: 900, armor: 5, buildTime: 2, size: 2,
      desc: "Frost bolt: every 12 s a bolt hits the nearest enemy building anywhere on the map: 50 damage, frozen for 10 s. Upgrades into the Greater Frost Launcher.",
      upgrades: ['fm_frost_launcher_2'],
      power: { kind: 'bombard', global: true, cooldown: 12, range: 24, radius: 1, dmg: 50, freeze: 10 },
      incomeRate: 0.009, lumberGain: 0,
      model: { style: 'frostlauncher', wall: PINE, roof: ICE, height: 22 },
    },
    {
      id: 'fm_frost_launcher_2', name: 'Greater Frost Launcher', faction: 'frostmark', cost: 290, lumber: 575, hp: 1200, armor: 5, buildTime: 2, size: 2, upgradeOnly: true,
      desc: "Greater frost bolt: every 15 s a huge bolt freezes everything within 2.5 tiles of an enemy building for 12 s and deals 100 damage.",
      power: { kind: 'bombard', global: true, cooldown: 15, range: 26, radius: 2.5, dmg: 100, freeze: 12 },
      incomeRate: 0.009, lumberGain: 0,
      model: { style: 'frostlauncher', wall: 0x2a4a3a, roof: 0x5ab0f0, height: 26 },
    },
    {
      id: 'fm_world_freezer', name: 'World Freezer', faction: 'frostmark', cost: 600, lumber: 1350, hp: 1400, armor: 5, buildTime: 2, size: 2, special: true, sapphires: 1,
      desc: "LEGENDARY: needs a sapphire. Onset of winter: every 35 s a winter storm settles on the nearest enemy army anywhere on the map: 60 spell damage per second and a 50% slow for 10 s.",
      power: { kind: 'cyclone', global: true, cooldown: 35, range: 18, radius: 4.5, dmg: 60, duration: 10, slow: 0.5 },
      incomeRate: 0.009, lumberGain: 0,
      model: { style: 'worldfreezer', wall: SNOW, roof: ICE, height: 50 },
    },
  ],
  units: [
    { id: 'fm_wolf', name: 'Frost Wolf', hp: 280, armor: 4, armorType: 'unarmored', dmg: 30, attackType: 'normal', range: 0.4, cooldown: 1.5, speed: 3.3, radius: 0.32, bounty: 4,
      crit: { chance: 0.1, mult: 1.5 },
      model: { shape: 'frostbeast', body: 0xd8e0e8, accent: ICE, scale: 1.2, variant: 'wolf' } },
    { id: 'fm_bear', name: 'Polar Bear', hp: 550, armor: 5, armorType: 'unarmored', dmg: 65, attackType: 'normal', range: 0.5, cooldown: 1.5, speed: 3.3, radius: 0.42, bounty: 8,
      cleave: { pct: 0.27, radius: 2 }, crit: { chance: 0.1, mult: 2 },
      model: { shape: 'frostbeast', body: 0xf0f0f0, accent: ICE, scale: 1.45, variant: 'bear' } },
    { id: 'fm_magnataur', name: 'Magnataur', hp: 1200, armor: 8, armorType: 'unarmored', dmg: 135, attackType: 'normal', range: 0.8, cooldown: 1.5, speed: 3.3, radius: 0.55, bounty: 16,
      crit: { chance: 0.15, mult: 3 }, cleave: { pct: 0.4, radius: 2.5 }, slam: { chance: 0.12, dmg: 75, radius: 2.5 },
      model: { shape: 'magnataur', body: 0x6a7a9a, accent: SNOW, scale: 1.4 } },
    { id: 'fm_wendigo', name: 'Wendigo', hp: 800, armor: 5, armorType: 'medium', dmg: 65, attackType: 'pierce', range: 0.5, cooldown: 1.4, speed: 2.9, radius: 0.48, bounty: 9,
      regen: 2, slam: { chance: 0.25, dmg: 80, radius: 1.5 },
      model: { shape: 'wendigo', body: 0xd8d8d0, accent: ICE, scale: 1.2 } },
    { id: 'fm_ancient_wendigo', name: 'Ancient Wendigo', hp: 1500, armor: 7, armorType: 'medium', dmg: 110, attackType: 'pierce', range: 0.6, cooldown: 1.4, speed: 2.9, radius: 0.52, bounty: 16,
      regen: 2.5, slam: { chance: 0.3, dmg: 140, radius: 1.5 }, aura: { stat: 'dmg', value: -0.3, radius: 8.5, target: 'enemy' },
      model: { shape: 'wendigo', body: 0xb8c0c8, accent: 0x5ab0f0, scale: 1.4, variant: 'ancient' } },
    { id: 'fm_rime_thrower', name: 'Rime Thrower', hp: 325, armor: 2, armorType: 'heavy', dmg: 22, attackType: 'pierce', range: 3.8, cooldown: 0.65, speed: 3, radius: 0.36, bounty: 5, targetsAir: true,
      bash: { chance: 0.05, stun: 7, dmg: 105 },
      model: { shape: 'yeti', body: 0xe0e8f0, accent: ICE, scale: 1.05 } },
    { id: 'fm_raging_thrower', name: 'Raging Rime Thrower', hp: 1600, armor: 10, armorType: 'heavy', dmg: 66, attackType: 'pierce', range: 4, cooldown: 0.6, speed: 3, radius: 0.45, bounty: 19, targetsAir: true,
      regen: 1, magicResist: 0.7, immune: true, multishot: 3, bash: { chance: 0.1, stun: 7, dmg: 105 },
      model: { shape: 'yeti', body: 0xc8d8e8, accent: 0x5ab0f0, scale: 1.35, variant: 'raging' } },
    { id: 'fm_ice_priest', name: 'Ice Troll Priest', hp: 350, armor: 1, armorType: 'light', dmg: 50, attackType: 'magic', range: 3.5, cooldown: 1.85, speed: 2.9, radius: 0.32, bounty: 3, targetsAir: true,
      regen: 1, bash: { chance: 0.1, stun: 7, dmg: 105 }, aura: { stat: 'armor', value: 3.5, radius: 4, target: 'ally' },
      model: { shape: 'icetroll', body: 0x9ac8e0, accent: ICE, scale: 1 } },
    { id: 'fm_witch_doctor', name: 'Ice Troll Witch Doctor', hp: 650, armor: 3, armorType: 'light', dmg: 63, attackType: 'magic', range: 3.7, cooldown: 1.3, speed: 2.9, radius: 0.34, bounty: 10, targetsAir: true,
      regen: 1, poison: { dps: 0, duration: 5, slow: 0.3 }, bash: { chance: 0.1, stun: 10, dmg: 200 }, aura: { stat: 'armor', value: 7, radius: 4, target: 'ally' },
      model: { shape: 'icetroll', body: 0x7ab0d0, accent: 0x5ab0f0, scale: 1.15, variant: 'doctor' } },
    { id: 'fm_ice_queen', name: 'Ice Queen', hp: 650, armor: 4, armorType: 'unarmored', dmg: 85, attackType: 'chaos', range: 4.5, cooldown: 1.52, speed: 2.9, radius: 0.36, bounty: 13, targetsAir: true,
      regen: 1.25, bash: { chance: 0.2, stun: 12.5, dmg: 375 }, slam: { chance: 0.15, dmg: 150, radius: 3 },
      model: { shape: 'icequeen', body: SNOW, accent: ICE, scale: 1.15 } },
    { id: 'fm_azure_drake', name: 'Azure Drake', hp: 650, armor: 4, armorType: 'heavy', dmg: 60, attackType: 'chaos', range: 2.5, cooldown: 1.82, speed: 3.3, radius: 0.45, bounty: 9, air: true, targetsAir: true,
      regen: 2, splash: 1.75, poison: { dps: 0, duration: 5, slow: 0.3 },
      model: { shape: 'drake', body: 0x4a8ae0, accent: SNOW, scale: 1.25 } },
  ],
};
