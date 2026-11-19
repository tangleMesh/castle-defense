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
  desc: 'Beasts and tribes of the frozen north: wolves, bears and tusked giants, wendigos, frost magic that chills, freezes and stops buildings cold.',
  color: 0xa8d8f8,
  traits: [
    'Beasts of the north: wolves, bears and magnataurs cleave and crit; wendigos pulverise and howl enemies weaker',
    'Frost: most ranged units chill their targets; ice trolls give nearby allies frost armour',
    'Ice queen: frost novas around her targets',
    'Frost launchers freeze enemy buildings: no training, shooting or casting while frozen',
    'World Freezer: the special calls a long blizzard on the enemy army',
  ],
  build: [
    'fm_snowy_rocks', 'fm_ice_claws', 'fm_igloo', 'fm_troll_hut',
    'fm_crystal_palace', 'fm_azure_nest', 'fm_icy_tower', 'fm_frost_mushroom',
    'fm_frost_launcher', 'fm_world_freezer',
  ],
  buildings: [
    // ---------------------------------------------------------------- wolves → bears → magnataurs
    {
      id: 'fm_snowy_rocks', name: 'Snowy Rocks', faction: 'frostmark', cost: 80, hp: 550, armor: 2, buildTime: 7, size: 2,
      desc: 'Frost Wolves den here: fast, cheap biters. Upgrades into Icy Rocks.',
      spawn: { unit: 'fm_wolf', count: 1, interval: 18 },
      upgrades: ['fm_icy_rocks'],
      model: { style: 'snowrocks', wall: STONE, roof: SNOW, height: 16 },
    },
    {
      id: 'fm_icy_rocks', name: 'Icy Rocks', faction: 'frostmark', cost: 110, hp: 850, armor: 3, buildTime: 8, size: 2, upgradeOnly: true,
      desc: 'Polar Bears: their swipes cleave the whole group around the target. Upgrades (with a sapphire) into the Glacier.',
      spawn: { unit: 'fm_bear', count: 1, interval: 25 },
      upgrades: ['fm_glacier'],
      model: { style: 'snowrocks', wall: 0x6a7080, roof: ICE, height: 20 },
    },
    {
      id: 'fm_glacier', name: 'Glacier', faction: 'frostmark', cost: 240, sapphires: 1, hp: 1200, armor: 4, buildTime: 13, size: 2, upgradeOnly: true,
      desc: 'ELITE (costs a sapphire): Magnataurs: tusked giants that cleave, crit and stomp the ground.',
      spawn: { unit: 'fm_magnataur', count: 1, interval: 36 },
      model: { style: 'snowrocks', wall: 0x5a6070, roof: 0x5ab0f0, height: 26 },
    },
    // ---------------------------------------------------------------- wendigos
    {
      id: 'fm_ice_claws', name: 'Ice Claws', faction: 'frostmark', cost: 165, hp: 750, armor: 3, buildTime: 11, size: 2,
      desc: 'Wendigos: tough clawed brutes that pulverise the ground every 4th blow. Upgrades into Frost Claws.',
      spawn: { unit: 'fm_wendigo', count: 1, interval: 26 },
      upgrades: ['fm_frost_claws'],
      model: { style: 'icecave', wall: STONE, roof: ICE, height: 22 },
    },
    {
      id: 'fm_frost_claws', name: 'Frost Claws', faction: 'frostmark', cost: 140, hp: 1000, armor: 4, buildTime: 10, size: 2, upgradeOnly: true,
      desc: 'Ancient Wendigos: pulverise every 4th blow, and their howl makes nearby enemies deal 20% less damage.',
      spawn: { unit: 'fm_ancient_wendigo', count: 1, interval: 36 },
      model: { style: 'icecave', wall: 0x5a6070, roof: 0x6ac0f0, height: 26 },
    },
    // ---------------------------------------------------------------- yetis
    {
      id: 'fm_igloo', name: 'Igloo', faction: 'frostmark', cost: 95, hp: 550, armor: 2, buildTime: 8, size: 2,
      desc: 'Rime Throwers: yetis hurling a fast hail of ice shards that chill. Upgrades (with a sapphire) into the Great Igloo.',
      spawn: { unit: 'fm_rime_thrower', count: 1, interval: 21 },
      upgrades: ['fm_great_igloo'],
      model: { style: 'igloo', wall: SNOW, roof: ICE, height: 16 },
    },
    {
      id: 'fm_great_igloo', name: 'Great Igloo', faction: 'frostmark', cost: 250, sapphires: 1, hp: 1200, armor: 4, buildTime: 13, size: 2, upgradeOnly: true,
      desc: 'ELITE (costs a sapphire): Raging Rime Throwers: armoured yetis whose volleys strike three enemies.',
      spawn: { unit: 'fm_raging_thrower', count: 1, interval: 38 },
      model: { style: 'igloo', wall: 0xf0f8ff, roof: 0x5ab0f0, height: 22 },
    },
    // ---------------------------------------------------------------- ice trolls
    {
      id: 'fm_troll_hut', name: 'Ice Troll Hut', faction: 'frostmark', cost: 105, hp: 550, armor: 2, buildTime: 9, size: 2,
      desc: 'Ice Troll Priests: chilling magic, and frost armour for allies around them (+3). Upgrades into the Voodoo Lounge.',
      spawn: { unit: 'fm_ice_priest', count: 1, interval: 21 },
      upgrades: ['fm_voodoo_lounge'],
      model: { style: 'icehut', wall: PINE, roof: SNOW, height: 22 },
    },
    {
      id: 'fm_voodoo_lounge', name: 'Voodoo Lounge', faction: 'frostmark', cost: 110, hp: 850, armor: 3, buildTime: 9, size: 2, upgradeOnly: true,
      desc: 'Ice Troll Witch Doctors: stronger chilling magic and +5 frost armour for allies around them.',
      spawn: { unit: 'fm_witch_doctor', count: 1, interval: 29 },
      model: { style: 'icehut', wall: 0x2a4a3a, roof: ICE, height: 26 },
    },
    // ---------------------------------------------------------------- ice queen, drakes
    {
      id: 'fm_crystal_palace', name: 'Crystal Palace', faction: 'frostmark', cost: 230, hp: 850, armor: 3, buildTime: 13, size: 2,
      desc: 'The Ice Queen: long-range frost magic that chills, and every 4th spell a frost nova around her target.',
      spawn: { unit: 'fm_ice_queen', count: 1, interval: 33 },
      model: { style: 'icepalace', wall: SNOW, roof: ICE, height: 40 },
    },
    {
      id: 'fm_azure_nest', name: 'Azure Nest', faction: 'frostmark', cost: 170, hp: 650, armor: 2, buildTime: 11, size: 2,
      desc: 'Azure Drakes: armoured flyers whose frost breath splashes over groups and chills them.',
      spawn: { unit: 'fm_azure_drake', count: 1, interval: 27 },
      model: { style: 'icenest', wall: STONE, roof: 0x4a8ae0, height: 30 },
    },
    // ---------------------------------------------------------------- utility
    {
      id: 'fm_icy_tower', name: 'Icy Tower', faction: 'frostmark', cost: 150, hp: 1200, armor: 6, buildTime: 12, size: 2,
      desc: 'Defensive tower: chunks of ice that splash over ground units within 7.5 tiles.',
      attack: { dmg: 70, attackType: 'normal', range: 7.5, cooldown: 1.4, targetsAir: false, splash: 1.2 },
      model: { style: 'icetower', wall: SNOW, roof: ICE, height: 42 },
    },
    {
      id: 'fm_frost_mushroom', name: 'Chilling Mushroom', faction: 'frostmark', cost: 120, hp: 550, armor: 2, buildTime: 8, size: 2,
      desc: 'Every 6 s the toughest enemy flyer within 10 tiles is frozen for 4 s and takes 110 magic damage.',
      power: { kind: 'hex', cooldown: 6, range: 10, radius: 0, dmg: 110, duration: 4, air: true },
      model: { style: 'frostshroom', wall: SNOW, roof: 0x6ab0f0, height: 24 },
    },
    {
      id: 'fm_frost_launcher', name: 'Frost Launcher', faction: 'frostmark', cost: 135, hp: 600, armor: 2, buildTime: 9, size: 2,
      desc: 'Every 12 s a frost bolt hits the nearest enemy building within 24 tiles: damage, and it freezes for 6 s (no training, shooting or casting). Upgrades into Greater Frost Launcher.',
      power: { kind: 'bombard', cooldown: 12, range: 24, radius: 1.2, dmg: 60, freeze: 6 },
      upgrades: ['fm_frost_launcher_2'],
      model: { style: 'frostlauncher', wall: PINE, roof: ICE, height: 22 },
    },
    {
      id: 'fm_frost_launcher_2', name: 'Greater Frost Launcher', faction: 'frostmark', cost: 180, hp: 850, armor: 3, buildTime: 10, size: 2, upgradeOnly: true,
      desc: 'Every 15 s a huge frost bolt freezes buildings within 2.5 tiles for 9 s (and units caught in it for 3 s).',
      power: { kind: 'bombard', cooldown: 15, range: 26, radius: 2.5, dmg: 100, freeze: 9 },
      model: { style: 'frostlauncher', wall: 0x2a4a3a, roof: 0x5ab0f0, height: 26 },
    },
    // ---------------------------------------------------------------- special
    {
      id: 'fm_world_freezer', name: 'World Freezer', faction: 'frostmark', cost: 400, hp: 1800, armor: 6, buildTime: 20, size: 2, special: true, sapphires: 1,
      desc: 'SPECIAL: costs a sapphire. Every 30 s a blizzard settles on the nearest enemy army within 18 tiles for 10 s: damage and a 50% slow. Upgrades into Eternal Winter.',
      power: { kind: 'cyclone', cooldown: 30, range: 18, radius: 4.5, dmg: 32, duration: 10, slow: 0.5 },
      upgrades: ['fm_world_freezer_2'],
      model: { style: 'worldfreezer', wall: SNOW, roof: ICE, height: 50 },
    },
    {
      id: 'fm_world_freezer_2', name: 'Eternal Winter', faction: 'frostmark', cost: 350, hp: 2400, armor: 7, buildTime: 15, size: 2, special: true, upgradeOnly: true,
      desc: 'Blizzards every 22 s, harder and wider.',
      power: { kind: 'cyclone', cooldown: 22, range: 20, radius: 5, dmg: 44, duration: 10, slow: 0.55 },
      model: { style: 'worldfreezer', wall: 0xf0f8ff, roof: 0x5ab0f0, height: 58 },
    },
  ],
  units: [
    { id: 'fm_wolf', name: 'Frost Wolf', hp: 300, armor: 4, armorType: 'light', dmg: 18, attackType: 'normal', range: 0.4, cooldown: 1.5, speed: 3.3, radius: 0.32, bounty: 3,
      crit: { every: 10, mult: 1.5 },
      model: { shape: 'frostbeast', body: 0xd8e0e8, accent: ICE, scale: 1.2, variant: 'wolf' } },
    { id: 'fm_bear', name: 'Polar Bear', hp: 520, armor: 5, armorType: 'light', dmg: 35, attackType: 'normal', range: 0.5, cooldown: 1.5, speed: 3.3, radius: 0.42, bounty: 7,
      splash: 0.8, crit: { every: 10, mult: 2 },
      model: { shape: 'frostbeast', body: 0xf0f0f0, accent: ICE, scale: 1.45, variant: 'bear' } },
    { id: 'fm_magnataur', name: 'Magnataur', hp: 1350, armor: 8, armorType: 'light', dmg: 58, attackType: 'normal', range: 0.8, cooldown: 1.4, speed: 3.3, radius: 0.55, bounty: 20,
      splash: 1.2, crit: { every: 8, mult: 2.5 }, slam: { every: 4, dmg: 60, radius: 1.6 },
      model: { shape: 'magnataur', body: 0x6a7a9a, accent: SNOW, scale: 1.4 } },
    { id: 'fm_wendigo', name: 'Wendigo', hp: 680, armor: 5, armorType: 'medium', dmg: 30, attackType: 'pierce', range: 0.5, cooldown: 1.4, speed: 2.9, radius: 0.48, bounty: 9,
      slam: { every: 4, dmg: 60, radius: 1.2 },
      model: { shape: 'wendigo', body: 0xd8d8d0, accent: ICE, scale: 1.2 } },
    { id: 'fm_ancient_wendigo', name: 'Ancient Wendigo', hp: 1200, armor: 7, armorType: 'medium', dmg: 48, attackType: 'pierce', range: 0.6, cooldown: 1.4, speed: 2.9, radius: 0.52, bounty: 16,
      slam: { every: 4, dmg: 100, radius: 1.4 }, aura: { stat: 'dmg', value: -0.2, radius: 4, target: 'enemy' },
      model: { shape: 'wendigo', body: 0xb8c0c8, accent: 0x5ab0f0, scale: 1.4, variant: 'ancient' } },
    { id: 'fm_rime_thrower', name: 'Rime Thrower', hp: 310, armor: 2, armorType: 'heavy', dmg: 10, attackType: 'pierce', range: 3.8, cooldown: 0.65, speed: 3.0, radius: 0.36, bounty: 4, targetsAir: true,
      poison: { dps: 3, duration: 3, slow: 0.2 },
      model: { shape: 'yeti', body: 0xe0e8f0, accent: ICE, scale: 1.05 } },
    { id: 'fm_raging_thrower', name: 'Raging Rime Thrower', hp: 1350, armor: 9, armorType: 'heavy', dmg: 28, attackType: 'pierce', range: 4, cooldown: 0.6, speed: 3.0, radius: 0.45, bounty: 20, targetsAir: true,
      multishot: 3, poison: { dps: 4, duration: 3, slow: 0.3 },
      model: { shape: 'yeti', body: 0xc8d8e8, accent: 0x5ab0f0, scale: 1.35, variant: 'raging' } },
    { id: 'fm_ice_priest', name: 'Ice Troll Priest', hp: 330, armor: 1, armorType: 'light', dmg: 22, attackType: 'magic', range: 3.5, cooldown: 1.5, speed: 2.9, radius: 0.32, bounty: 5, targetsAir: true,
      poison: { dps: 4, duration: 4, slow: 0.25 }, aura: { stat: 'armor', value: 3, radius: 4, target: 'ally' },
      model: { shape: 'icetroll', body: 0x9ac8e0, accent: ICE, scale: 1 } },
    { id: 'fm_witch_doctor', name: 'Ice Troll Witch Doctor', hp: 620, armor: 3, armorType: 'light', dmg: 34, attackType: 'magic', range: 3.7, cooldown: 1.3, speed: 2.9, radius: 0.34, bounty: 9, targetsAir: true,
      poison: { dps: 6, duration: 5, slow: 0.35 }, aura: { stat: 'armor', value: 5, radius: 4, target: 'ally' },
      model: { shape: 'icetroll', body: 0x7ab0d0, accent: 0x5ab0f0, scale: 1.15, variant: 'doctor' } },
    { id: 'fm_ice_queen', name: 'Ice Queen', hp: 620, armor: 4, armorType: 'light', dmg: 46, attackType: 'magic', range: 4.5, cooldown: 1.5, speed: 2.9, radius: 0.36, bounty: 12, targetsAir: true,
      poison: { dps: 8, duration: 5, slow: 0.3 }, slam: { every: 4, dmg: 70, radius: 2 },
      model: { shape: 'icequeen', body: SNOW, accent: ICE, scale: 1.15 } },
    { id: 'fm_azure_drake', name: 'Azure Drake', hp: 620, armor: 4, armorType: 'heavy', dmg: 26, attackType: 'magic', range: 2.5, cooldown: 1.4, speed: 3.3, radius: 0.45, bounty: 9, air: true, targetsAir: true,
      splash: 1, poison: { dps: 0, duration: 3, slow: 0.3 },
      model: { shape: 'drake', body: 0x4a8ae0, accent: SNOW, scale: 1.25 } },
  ],
};
