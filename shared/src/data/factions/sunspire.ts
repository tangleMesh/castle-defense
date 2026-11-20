import type { FactionDef } from '../types';

const MARBLE = 0xe8e0d0;
const GOLD = 0xd8b040;
const CRIMSON = 0xa02a3a;
const AZURE = 0x3a6ac0;

/**
 * Sunspire Concord: the high elves of the golden cities. Tree and stat ratios follow the classic
 * "elf" castle-fight race (archers with headshots, blademasters, sorceresses → wizards who heal and
 * call lightning, blood-elf bouncing mages, a ballista, dragonhawk riders, an arcane multi-shot
 * tower, the hexing city of magic, an obelisk of light and the golden shrine that revives the
 * fallen), re-themed with the Concord's own names and look.
 */
export const SUNSPIRE: FactionDef = {
  id: 'sunspire',
  name: 'Sunspire Concord',
  desc: 'High elves of the golden cities: sharpshooters, blademasters, sorcery that heals and hexes, dragonhawks and a shrine that raises the fallen.',
  color: 0xd8a830,
  traits: [
    'Sharpshooters: archers land headshots (critical arrows) and dodge blows',
    'Blademasters: lightning-fast swords with critical strikes and evasion',
    'Sorcery: sorceresses and wizards heal allies and call chain lightning; the City of Magic hexes the toughest enemy',
    'Light: an obelisk burns enemies with sunbeams; the arcane tower shoots five at once',
    'Grace: the golden shrine raises every 5th fallen ally nearby',
  ],
  build: [
    'su_archery_range', 'su_hall_of_honor', 'su_school', 'su_war_academy',
    'su_siege_works', 'su_hawk_portal', 'su_arcane_tower', 'su_city_of_magic',
    'su_light_obelisk', 'su_golden_shrine',
  ],
  buildings: [
    // ---------------------------------------------------------------- archers
    {
      id: 'su_archery_range', name: 'Archery Range', faction: 'sunspire', cost: 100, hp: 550, armor: 2, buildTime: 8, size: 2,
      desc: 'Trains Archers: every 10th arrow is a triple-damage headshot; they dodge every 7th blow. Upgrades into Archery Tower.',
      spawn: { unit: 'su_archer', count: 1, interval: 21 },
      upgrades: ['su_archery_tower'],
      model: { style: 'elfrange', wall: MARBLE, roof: CRIMSON, height: 22 },
    },
    {
      id: 'su_archery_tower', name: 'Archery Tower', faction: 'sunspire', cost: 130, hp: 800, armor: 3, buildTime: 9, size: 2, upgradeOnly: true,
      desc: 'Trains Master Archers: long range, a headshot every 5th arrow, they dodge every 4th blow.',
      spawn: { unit: 'su_master_archer', count: 1, interval: 31 },
      model: { style: 'elfrange', wall: MARBLE, roof: 0x7a1a2a, height: 30 },
    },
    // ---------------------------------------------------------------- blademasters
    {
      id: 'su_hall_of_honor', name: 'Hall of Honor', faction: 'sunspire', cost: 130, hp: 600, armor: 3, buildTime: 9, size: 2,
      desc: 'Trains Blademasters: very fast blades, every 4th strike is a 2.5× critical, they dodge and resist magic. Upgrades into Hall of the Eldest.',
      spawn: { unit: 'su_blademaster', count: 1, interval: 23 },
      upgrades: ['su_hall_of_eldest'],
      model: { style: 'honorhall', wall: MARBLE, roof: GOLD, height: 24 },
    },
    {
      id: 'su_hall_of_eldest', name: 'Hall of the Eldest', faction: 'sunspire', cost: 140, hp: 900, armor: 4, buildTime: 10, size: 2, upgradeOnly: true,
      desc: 'Trains Elder Blademasters: even faster, a 2.5× critical every 4th strike, dodge every 4th blow.',
      spawn: { unit: 'su_elder_blademaster', count: 1, interval: 33 },
      model: { style: 'honorhall', wall: MARBLE, roof: 0xe8c860, height: 28 },
    },
    // ---------------------------------------------------------------- sorcery
    {
      id: 'su_school', name: 'School of Wizardry', faction: 'sunspire', cost: 155, hp: 650, armor: 2, buildTime: 11, size: 2,
      desc: 'Trains Sorceresses: long-range magic, they heal wounded allies and every 4th spell is chain lightning. Upgrades (with a sapphire) into the Tower of Supreme Magic.',
      spawn: { unit: 'su_sorceress', count: 1, interval: 30 },
      upgrades: ['su_supreme_tower'],
      model: { style: 'wizardspire', wall: MARBLE, roof: AZURE, height: 34 },
    },
    {
      id: 'su_supreme_tower', name: 'Tower of Supreme Magic', faction: 'sunspire', cost: 260, sapphires: 1, hp: 1200, armor: 4, buildTime: 14, size: 2, upgradeOnly: true,
      desc: 'ELITE (costs a sapphire): trains Wizards: very long range, big heals, strong chain lightning every 4th spell, and they shrug off most magic.',
      spawn: { unit: 'su_wizard', count: 1, interval: 40 },
      model: { style: 'wizardspire', wall: 0xf0e8d8, roof: 0x6a3ad0, height: 44 },
    },
    {
      id: 'su_war_academy', name: 'Blood Mage Academy', faction: 'sunspire', cost: 160, hp: 650, armor: 2, buildTime: 10, size: 2,
      desc: 'Trains Blood Mages: fire bolts that bounce between 3 enemies.',
      spawn: { unit: 'su_blood_mage', count: 1, interval: 25 },
      model: { style: 'academy', wall: 0xc8b8a8, roof: CRIMSON, height: 26 },
    },
    // ---------------------------------------------------------------- siege & air
    {
      id: 'su_siege_works', name: 'Ballista Works', faction: 'sunspire', cost: 200, hp: 750, armor: 3, buildTime: 12, size: 2,
      desc: 'Builds Ballistae: long-range bolts that pierce through the enemy line (splash). Can\'t hit flyers.',
      spawn: { unit: 'su_ballista', count: 1, interval: 29 },
      model: { style: 'elfsiege', wall: MARBLE, roof: GOLD, height: 20 },
    },
    {
      id: 'su_hawk_portal', name: 'Dragonhawk Portal', faction: 'sunspire', cost: 185, hp: 700, armor: 2, buildTime: 11, size: 2,
      desc: 'Dragonhawk Riders: armoured flyers whose every 4th strike calls a solar flare around the target.',
      spawn: { unit: 'su_dragonhawk', count: 1, interval: 27 },
      model: { style: 'hawkportal', wall: MARBLE, roof: 0xff9a3a, height: 30 },
    },
    // ---------------------------------------------------------------- utility
    {
      id: 'su_arcane_tower', name: 'Arcane Tower', faction: 'sunspire', cost: 160, hp: 1200, armor: 6, buildTime: 12, size: 2,
      desc: 'Defensive tower: arcane missiles at air and ground within 6.75 tiles, five targets per volley.',
      attack: { dmg: 30, attackType: 'magic', range: 6.75, cooldown: 1.2, targetsAir: true, multishot: 5 },
      model: { style: 'arcanetower', wall: MARBLE, roof: 0x8a5ae0, height: 42 },
    },
    {
      id: 'su_city_of_magic', name: 'City of Magic', faction: 'sunspire', cost: 170, hp: 700, armor: 2, buildTime: 11, size: 2,
      desc: 'Every 10 s the toughest enemy unit anywhere on the map is turned into a harmless sheep for 5 s.',
      power: { kind: 'hex', global: true, cooldown: 10, range: 12, radius: 0, dmg: 0, duration: 5 },
      model: { style: 'magiccity', wall: MARBLE, roof: AZURE, height: 30 },
    },
    {
      id: 'su_light_obelisk', name: 'Obelisk of Light', faction: 'sunspire', cost: 160, hp: 650, armor: 2, buildTime: 10, size: 2,
      desc: 'Every 4 s a beam of light burns the nearest enemy unit within 11 tiles for 90 magic damage.',
      power: { kind: 'beam', cooldown: 4, range: 11, radius: 0, dmg: 90 },
      model: { style: 'lightobelisk', wall: MARBLE, roof: GOLD, height: 40 },
    },
    // ---------------------------------------------------------------- special
    {
      id: 'su_golden_shrine', name: 'Golden Shrine of Grace', faction: 'sunspire', cost: 400, hp: 1800, armor: 6, buildTime: 20, size: 2, special: true, sapphires: 1,
      desc: 'SPECIAL: costs a sapphire. Every 5th unit of your team that falls anywhere on the map rises again on the spot. Upgrades into the Radiant Shrine.',
      revive: { every: 5, radius: 14, global: true },
      upgrades: ['su_golden_shrine_2'],
      model: { style: 'goldshrine', wall: MARBLE, roof: GOLD, height: 46 },
    },
    {
      id: 'su_golden_shrine_2', name: 'Radiant Shrine', faction: 'sunspire', cost: 350, hp: 2400, armor: 7, buildTime: 15, size: 2, special: true, upgradeOnly: true,
      desc: 'Every 3rd unit of your team that falls anywhere on the map rises again.',
      revive: { every: 3, radius: 18, global: true },
      model: { style: 'goldshrine', wall: 0xf8f0e0, roof: 0xf0d060, height: 54 },
    },
  ],
  units: [
    { id: 'su_archer', name: 'Archer', hp: 300, armor: 2, armorType: 'light', dmg: 15, attackType: 'pierce', range: 4.5, cooldown: 1.05, speed: 3.0, radius: 0.3, bounty: 4, targetsAir: true,
      crit: { chance: 0.1, mult: 3 }, evade: 0.143,
      model: { shape: 'highelf', body: CRIMSON, accent: GOLD, scale: 1, variant: 'archer' } },
    { id: 'su_master_archer', name: 'Master Archer', hp: 500, armor: 4, armorType: 'light', dmg: 30, attackType: 'pierce', range: 5, cooldown: 1.0, speed: 3.0, radius: 0.32, bounty: 9, targetsAir: true,
      crit: { chance: 0.2, mult: 3 }, evade: 0.25,
      model: { shape: 'highelf', body: 0x7a1a2a, accent: GOLD, scale: 1.12, variant: 'master' } },
    { id: 'su_blademaster', name: 'Blademaster', hp: 380, armor: 7, armorType: 'heavy', dmg: 13, attackType: 'normal', range: 0.5, cooldown: 0.7, speed: 3.25, radius: 0.32, bounty: 6,
      crit: { chance: 0.25, mult: 2.5 }, evade: 0.143, magicResist: 0.15,
      model: { shape: 'blademaster', body: CRIMSON, accent: GOLD, scale: 1 } },
    { id: 'su_elder_blademaster', name: 'Elder Blademaster', hp: 650, armor: 9, armorType: 'heavy', dmg: 16, attackType: 'normal', range: 0.55, cooldown: 0.55, speed: 3.4, radius: 0.35, bounty: 12,
      crit: { chance: 0.25, mult: 2.5 }, evade: 0.25, magicResist: 0.25,
      model: { shape: 'blademaster', body: 0x4a1a2a, accent: 0xf0d060, scale: 1.15, variant: 'elder' } },
    { id: 'su_sorceress', name: 'Sorceress', hp: 500, armor: 2, armorType: 'light', dmg: 24, attackType: 'magic', range: 5, cooldown: 1.8, speed: 3.0, radius: 0.32, bounty: 8, targetsAir: true,
      heal: { amount: 50, range: 5, cooldown: 6 }, storm: { chance: 0.25, dmg: 55, jumps: 3 },
      model: { shape: 'sorceress', body: AZURE, accent: 0xb0d0ff, scale: 1 } },
    { id: 'su_wizard', name: 'Wizard', hp: 1250, armor: 4, armorType: 'light', dmg: 46, attackType: 'magic', range: 6.5, cooldown: 1.8, speed: 3.0, radius: 0.36, bounty: 22, targetsAir: true,
      heal: { amount: 100, range: 6, cooldown: 5 }, storm: { chance: 0.25, dmg: 90, jumps: 4 }, magicResist: 0.7,
      model: { shape: 'sorceress', body: 0x4a2a8a, accent: 0xe0c0ff, scale: 1.25, variant: 'wizard' } },
    { id: 'su_blood_mage', name: 'Blood Mage', hp: 470, armor: 3, armorType: 'medium', dmg: 22, attackType: 'magic', range: 3.6, cooldown: 1.5, speed: 3.0, radius: 0.32, bounty: 7, targetsAir: true,
      chain: 3,
      model: { shape: 'sorceress', body: CRIMSON, accent: 0xff8a3a, scale: 1.05, variant: 'blood' } },
    { id: 'su_ballista', name: 'Ballista', hp: 480, armor: 3, armorType: 'medium', dmg: 68, attackType: 'siege', range: 8.5, cooldown: 4, speed: 2.5, radius: 0.46, bounty: 8,
      splash: 1.2,
      model: { shape: 'ballista', body: 0xc8b090, accent: GOLD, scale: 1.05 } },
    { id: 'su_dragonhawk', name: 'Dragonhawk Rider', hp: 600, armor: 3, armorType: 'heavy', dmg: 32, attackType: 'pierce', range: 4.5, cooldown: 1.5, speed: 3.3, radius: 0.42, bounty: 9, air: true, targetsAir: true,
      slam: { chance: 0.25, dmg: 55, radius: 1.5 },
      model: { shape: 'dragonhawk', body: 0xd04a2a, accent: GOLD, scale: 1.15 } },
  ],
};
