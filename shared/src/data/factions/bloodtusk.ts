import type { FactionDef } from '../types';

const HIDE = 0x8a5a3a;
const BLOOD = 0xb03a2a;
const BONE = 0xe0d0b0;
const LOG = 0x5a3a22;

/**
 * Bloodtusk Horde: orcs, trolls and their beasts. Tree and stat ratios follow the classic "orc"
 * castle-fight race (grunts → veterans → axemasters, berserker trolls → trappers, kodo beasts with
 * three rider upgrades, wyvern riders, shamans, a catapult, the ceremonial totem, a poison-spitting
 * serpent rock, the anti-air tower and the stasis totem), re-themed with the Horde's own names and look.
 */
export const BLOODTUSK: FactionDef = {
  id: 'bloodtusk',
  name: 'Bloodtusk Horde',
  desc: 'Orcs, trolls and war beasts: tough axes, raging berserkers, kodo riders, wyverns, shamans and a totem that freezes armies.',
  color: 0xb04a2a,
  traits: [
    'Axes: grunts, veterans and axemasters crush with critical blows',
    'Rage: trolls attack twice as fast once badly hurt; trappers ensnare their prey',
    'War beasts: tanky kodos, ridden by spellbreakers (magic resistance), war drummers or shield bearers',
    'Shamans: their presence makes nearby warriors hit harder',
    'Stasis: the special totem freezes every enemy unit around it',
  ],
  build: [
    'bt_fighters_hall', 'bt_troll_hut', 'bt_kodo_pen', 'bt_wyvern_roost',
    'bt_shaman_tent', 'bt_siege_works', 'bt_war_totem', 'bt_serpent_rock',
    'bt_aa_tower', 'bt_stasis_totem',
  ],
  buildings: [
    // ---------------------------------------------------------------- grunts → veterans → axemasters
    {
      id: 'bt_fighters_hall', name: "Fighters' Hall", faction: 'bloodtusk', cost: 90, hp: 650, armor: 3, buildTime: 8, size: 2,
      desc: 'Trains Grunts: cheap, tough axemen. Upgrades into Veterans\' Hall.',
      spawn: { unit: 'bt_grunt', count: 1, interval: 18 },
      upgrades: ['bt_veteran_hall'],
      model: { style: 'warhall', wall: HIDE, roof: BLOOD, height: 22 },
    },
    {
      id: 'bt_veteran_hall', name: "Veterans' Hall", faction: 'bloodtusk', cost: 110, hp: 900, armor: 4, buildTime: 8, size: 2, upgradeOnly: true,
      desc: 'Trains Veteran Grunts: every 4th blow is critical. Upgrades (with a sapphire) into the Axemasters\' Hall.',
      spawn: { unit: 'bt_veteran', count: 1, interval: 23 },
      upgrades: ['bt_axemaster_hall'],
      model: { style: 'warhall', wall: HIDE, roof: 0x8a2a1a, height: 26 },
    },
    {
      id: 'bt_axemaster_hall', name: "Axemasters' Hall", faction: 'bloodtusk', cost: 240, sapphires: 1, hp: 1200, armor: 5, buildTime: 13, size: 2, upgradeOnly: true,
      desc: 'ELITE (costs a sapphire): trains Axemasters: every 4th blow is a double critical that also pulverises the ground around the target.',
      spawn: { unit: 'bt_axemaster', count: 1, interval: 33 },
      model: { style: 'warhall', wall: 0x6a3a22, roof: 0x5a1a10, height: 30 },
    },
    // ---------------------------------------------------------------- trolls
    {
      id: 'bt_troll_hut', name: 'Troll Hut', faction: 'bloodtusk', cost: 120, hp: 600, armor: 2, buildTime: 9, size: 2,
      desc: 'Trains Troll Berserkers: axe throwers that attack twice as fast once below half health. Upgrades into Trappers\' Hut.',
      spawn: { unit: 'bt_berserker', count: 1, interval: 22 },
      upgrades: ['bt_trapper_hut'],
      model: { style: 'trollhut', wall: LOG, roof: 0xb0a060, height: 22 },
    },
    {
      id: 'bt_trapper_hut', name: "Trappers' Hut", faction: 'bloodtusk', cost: 120, hp: 850, armor: 3, buildTime: 9, size: 2, upgradeOnly: true,
      desc: 'Trains Troll Trappers: every 4th throw ensnares the target in a net. Upgrades (with a sapphire) into the Forest Trappers\' Hole.',
      spawn: { unit: 'bt_trapper', count: 1, interval: 26 },
      upgrades: ['bt_forest_hole'],
      model: { style: 'trollhut', wall: LOG, roof: 0x8a8a4a, height: 26 },
    },
    {
      id: 'bt_forest_hole', name: "Forest Trappers' Hole", faction: 'bloodtusk', cost: 250, sapphires: 1, hp: 1200, armor: 4, buildTime: 13, size: 2, upgradeOnly: true,
      desc: 'ELITE (costs a sapphire): trains Forest Trappers: long range, regeneration, nets that catch small groups.',
      spawn: { unit: 'bt_forest_trapper', count: 1, interval: 36 },
      model: { style: 'trollhut', wall: 0x3a4a22, roof: 0x5a7a3a, height: 30 },
    },
    // ---------------------------------------------------------------- kodos
    {
      id: 'bt_kodo_pen', name: 'Kodo Pen', faction: 'bloodtusk', cost: 150, hp: 750, armor: 3, buildTime: 10, size: 2,
      desc: 'Breeds Kodos: huge, tanky beasts. Upgrades into a Spellbreaker, War Drum or Shield Bearer pen (one choice).',
      spawn: { unit: 'bt_kodo', count: 1, interval: 25 },
      upgrades: ['bt_spellbreaker_pen', 'bt_war_drum_pen', 'bt_shield_pen'],
      model: { style: 'kodopen', wall: LOG, roof: HIDE, height: 18 },
    },
    {
      id: 'bt_spellbreaker_pen', name: 'Spellbreaker Pen', faction: 'bloodtusk', cost: 110, hp: 950, armor: 4, buildTime: 9, size: 2, upgradeOnly: true,
      desc: 'Spellbreaker Kodo Riders: they shrug off 60% of magic damage.',
      spawn: { unit: 'bt_spellbreaker', count: 1, interval: 30 },
      model: { style: 'kodopen', wall: LOG, roof: 0x4a6ab0, height: 20 },
    },
    {
      id: 'bt_war_drum_pen', name: 'War Drum Pen', faction: 'bloodtusk', cost: 110, hp: 950, armor: 4, buildTime: 9, size: 2, upgradeOnly: true,
      desc: 'War Drum Kodo Riders: their drums make nearby allies deal 15% more damage.',
      spawn: { unit: 'bt_drummer', count: 1, interval: 30 },
      model: { style: 'kodopen', wall: LOG, roof: BLOOD, height: 20 },
    },
    {
      id: 'bt_shield_pen', name: 'Shield Bearer Pen', faction: 'bloodtusk', cost: 110, hp: 950, armor: 4, buildTime: 9, size: 2, upgradeOnly: true,
      desc: 'Shield Bearer Kodo Riders: nearby allies get +3 armour.',
      spawn: { unit: 'bt_shield_kodo', count: 1, interval: 30 },
      model: { style: 'kodopen', wall: LOG, roof: 0x8a8a8a, height: 20 },
    },
    // ---------------------------------------------------------------- air, casters, siege
    {
      id: 'bt_wyvern_roost', name: 'Wyvern Roost', faction: 'bloodtusk', cost: 140, hp: 650, armor: 2, buildTime: 10, size: 2,
      desc: 'Wyvern Riders: flyers with poisoned spears (hit air and ground, 20% slow).',
      spawn: { unit: 'bt_wyvern', count: 1, interval: 23 },
      model: { style: 'roost', wall: 0x7a6a5a, roof: BLOOD, height: 32 },
    },
    {
      id: 'bt_shaman_tent', name: 'Shaman Tent', faction: 'bloodtusk', cost: 120, hp: 550, armor: 2, buildTime: 9, size: 2,
      desc: 'Trains Shamans: magic casters whose war chant makes nearby allies deal 15% more damage. Upgrades into the Spirit Lodge.',
      spawn: { unit: 'bt_shaman', count: 1, interval: 21 },
      upgrades: ['bt_spirit_lodge'],
      model: { style: 'shamantent', wall: HIDE, roof: 0x4a8ac0, height: 22 },
    },
    {
      id: 'bt_spirit_lodge', name: 'Spirit Lodge', faction: 'bloodtusk', cost: 130, hp: 900, armor: 3, buildTime: 9, size: 2, upgradeOnly: true,
      desc: 'Trains Spirit Walkers: long-range casters whose every 4th spell calls lightning on 3 enemies.',
      spawn: { unit: 'bt_spirit_walker', count: 1, interval: 29 },
      model: { style: 'shamantent', wall: 0x6a4a2a, roof: 0x6ab0e0, height: 26 },
    },
    {
      id: 'bt_siege_works', name: 'Orc Siege Works', faction: 'bloodtusk', cost: 200, hp: 750, armor: 3, buildTime: 12, size: 2,
      desc: 'Builds Catapults: very long range, burning splash shells. Can\'t hit flyers.',
      spawn: { unit: 'bt_catapult', count: 1, interval: 31 },
      model: { style: 'orcworks', wall: LOG, roof: HIDE, height: 22 },
    },
    // ---------------------------------------------------------------- utility
    {
      id: 'bt_war_totem', name: 'Ceremonial Totem', faction: 'bloodtusk', cost: 150, hp: 550, armor: 2, buildTime: 9, size: 2,
      desc: 'Aura: the blessing of the ancestors, allied units within 7 tiles attack 20% faster.',
      aura: { stat: 'haste', value: 0.2, radius: 7, target: 'ally' },
      model: { style: 'totempole', wall: 0x7a4a2a, roof: BLOOD, height: 34 },
    },
    {
      id: 'bt_serpent_rock', name: 'Serpent Rock', faction: 'bloodtusk', cost: 160, hp: 700, armor: 3, buildTime: 10, size: 2,
      desc: 'Every 12 s the stone serpent spits poison on the nearest enemy ground units anywhere on the map: damage and a 20% slow for 5 s.',
      power: { kind: 'cyclone', global: true, cooldown: 12, range: 13, radius: 2.4, dmg: 20, duration: 5, slow: 0.2 },
      model: { style: 'serpentrock', wall: 0x6a6a5a, roof: 0x6ad040, height: 26 },
    },
    {
      id: 'bt_aa_tower', name: 'Spear Tower', faction: 'bloodtusk', cost: 150, hp: 1200, armor: 6, buildTime: 12, size: 2,
      desc: 'Defensive tower: heavy spears at air and ground within 7.5 tiles; triple damage against flyers.',
      attack: { dmg: 40, attackType: 'normal', range: 7.5, cooldown: 1.1, targetsAir: true, bonusVs: { vs: 'air', mult: 3 } },
      model: { style: 'speartower', wall: LOG, roof: HIDE, height: 40 },
    },
    // ---------------------------------------------------------------- special
    {
      id: 'bt_stasis_totem', name: 'Stasis Totem', faction: 'bloodtusk', cost: 400, hp: 1800, armor: 6, buildTime: 20, size: 2, special: true, sapphires: 1,
      desc: 'SPECIAL: costs a sapphire. Every 35 s it freezes every enemy unit within 14 tiles for 3 s. Upgrades into the Great Stasis Totem.',
      power: { kind: 'stasis', cooldown: 35, range: 14, radius: 0, dmg: 0, duration: 3 },
      upgrades: ['bt_stasis_totem_2'],
      model: { style: 'stasistotem', wall: 0x7a7468, roof: 0x9ad8ff, height: 48 },
    },
    {
      id: 'bt_stasis_totem_2', name: 'Great Stasis Totem', faction: 'bloodtusk', cost: 350, hp: 2400, armor: 7, buildTime: 15, size: 2, special: true, upgradeOnly: true,
      desc: 'Freezes every enemy unit within 18 tiles for 4 s, every 28 s.',
      power: { kind: 'stasis', cooldown: 28, range: 18, radius: 0, dmg: 0, duration: 4 },
      model: { style: 'stasistotem', wall: 0x6a6458, roof: 0xd0f0ff, height: 56 },
    },
  ],
  units: [
    { id: 'bt_grunt', name: 'Grunt', hp: 330, armor: 4, armorType: 'heavy', dmg: 17, attackType: 'normal', range: 0.4, cooldown: 1.5, speed: 2.7, radius: 0.34, bounty: 3,
      model: { shape: 'orc', body: HIDE, accent: BLOOD, scale: 1, variant: 'grunt' } },
    { id: 'bt_veteran', name: 'Veteran Grunt', hp: 540, armor: 6, armorType: 'heavy', dmg: 23, attackType: 'normal', range: 0.4, cooldown: 1.3, speed: 2.9, radius: 0.36, bounty: 7,
      crit: { every: 4, mult: 2 },
      model: { shape: 'orc', body: 0x6a4a3a, accent: BLOOD, scale: 1.12, variant: 'veteran' } },
    { id: 'bt_axemaster', name: 'Axemaster', hp: 1400, armor: 9, armorType: 'heavy', dmg: 32, attackType: 'normal', range: 0.5, cooldown: 1.0, speed: 3.2, radius: 0.42, bounty: 20,
      crit: { every: 4, mult: 2 }, slam: { every: 4, dmg: 60, radius: 1.4 },
      model: { shape: 'orc', body: 0x4a3a2a, accent: 0xd03020, scale: 1.3, variant: 'axemaster' } },
    { id: 'bt_berserker', name: 'Troll Berserker', hp: 400, armor: 3, armorType: 'medium', dmg: 21, attackType: 'normal', range: 3, cooldown: 1.5, speed: 2.9, radius: 0.33, bounty: 5, targetsAir: true,
      berserk: { below: 0.5, haste: 1 },
      model: { shape: 'troll', body: 0x5a8aa0, accent: 0xd04a2a, scale: 1, variant: 'berserker' } },
    { id: 'bt_trapper', name: 'Troll Trapper', hp: 560, armor: 4, armorType: 'medium', dmg: 32, attackType: 'normal', range: 3.25, cooldown: 1.5, speed: 2.9, radius: 0.35, bounty: 8, targetsAir: true,
      berserk: { below: 0.5, haste: 1 }, bash: { every: 4, stun: 1.5 },
      model: { shape: 'troll', body: 0x4a7a8a, accent: 0xb0a060, scale: 1.1, variant: 'trapper' } },
    { id: 'bt_forest_trapper', name: 'Forest Trapper', hp: 1350, armor: 8, armorType: 'medium', dmg: 52, attackType: 'normal', range: 5.25, cooldown: 1.5, speed: 2.9, radius: 0.4, bounty: 20, targetsAir: true,
      berserk: { below: 0.5, haste: 1 }, bash: { every: 4, stun: 1 }, splash: 0.8, regen: 3, crit: { every: 7, mult: 2 },
      model: { shape: 'troll', body: 0x3a6a4a, accent: 0x8ab040, scale: 1.3, variant: 'forest' } },
    { id: 'bt_kodo', name: 'Kodo', hp: 890, armor: 6, armorType: 'light', dmg: 18, attackType: 'pierce', range: 0.6, cooldown: 1.2, speed: 2.5, radius: 0.55, bounty: 8,
      model: { shape: 'kodo', body: 0x8a7a6a, accent: BONE, scale: 1.1 } },
    { id: 'bt_spellbreaker', name: 'Spellbreaker Kodo', hp: 1060, armor: 7, armorType: 'light', dmg: 22, attackType: 'pierce', range: 2, cooldown: 1.2, speed: 2.5, radius: 0.58, bounty: 11,
      magicResist: 0.6,
      model: { shape: 'kodo', body: 0x7a6a5a, accent: 0x4a6ab0, scale: 1.2, variant: 'spellbreaker' } },
    { id: 'bt_drummer', name: 'War Drum Kodo', hp: 1060, armor: 7, armorType: 'light', dmg: 22, attackType: 'pierce', range: 2, cooldown: 1.2, speed: 2.5, radius: 0.58, bounty: 11,
      aura: { stat: 'dmg', value: 0.15, radius: 5, target: 'ally' },
      model: { shape: 'kodo', body: 0x7a6a5a, accent: BLOOD, scale: 1.2, variant: 'drum' } },
    { id: 'bt_shield_kodo', name: 'Shield Bearer Kodo', hp: 1060, armor: 7, armorType: 'light', dmg: 22, attackType: 'pierce', range: 2, cooldown: 1.2, speed: 2.5, radius: 0.58, bounty: 11,
      aura: { stat: 'armor', value: 3, radius: 5, target: 'ally' },
      model: { shape: 'kodo', body: 0x7a6a5a, accent: 0x9a9a9a, scale: 1.2, variant: 'shield' } },
    { id: 'bt_wyvern', name: 'Wyvern Rider', hp: 380, armor: 2, armorType: 'light', dmg: 17, attackType: 'pierce', range: 4, cooldown: 1.0, speed: 3.3, radius: 0.4, bounty: 6, air: true, targetsAir: true,
      poison: { dps: 3, duration: 3, slow: 0.2 },
      model: { shape: 'wyvern', body: 0x9a6a3a, accent: BLOOD, scale: 1.15 } },
    { id: 'bt_shaman', name: 'Shaman', hp: 320, armor: 1, armorType: 'light', dmg: 27, attackType: 'magic', range: 3.5, cooldown: 1.9, speed: 2.7, radius: 0.32, bounty: 5, targetsAir: true,
      aura: { stat: 'dmg', value: 0.15, radius: 4, target: 'ally' },
      model: { shape: 'orc', body: 0x6a5a4a, accent: 0x4a8ac0, scale: 1, variant: 'shaman' } },
    { id: 'bt_spirit_walker', name: 'Spirit Walker', hp: 700, armor: 4, armorType: 'light', dmg: 43, attackType: 'magic', range: 4.5, cooldown: 1.5, speed: 2.7, radius: 0.36, bounty: 10, targetsAir: true,
      storm: { every: 4, dmg: 50, jumps: 3 },
      model: { shape: 'orc', body: 0x4a5a6a, accent: 0x9ad0ff, scale: 1.15, variant: 'spirit' } },
    { id: 'bt_catapult', name: 'Catapult', hp: 450, armor: 5, armorType: 'medium', dmg: 70, attackType: 'siege', range: 9.5, cooldown: 3.0, speed: 2.3, radius: 0.5, bounty: 9,
      splash: 1.5, poison: { dps: 10, duration: 3, slow: 0 },
      model: { shape: 'orccatapult', body: LOG, accent: BLOOD, scale: 1.1 } },
  ],
};
