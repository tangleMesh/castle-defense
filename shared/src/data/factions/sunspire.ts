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
  desc: "The high elves: evasive archers with headshots, critical-striking blademasters, sorceresses and the legendary Wizard calling chain lightning, bouncing bloodthirsters, ballistae, dragonhawks, the Obelisk of Light, the City of Magic and the Golden Shrine.",
  color: 0xd8a830,
  traits: [
    "Archers and blademasters evade attacks; headshots stun, blademasters crit up to 3\u00d7",
    "Sorceresses heal and call chain lightning; the Wizard (legendary) is immune with 70% spell resistance",
    "Bloodthirsters bounce their bolts between 3 enemies and strip armour",
    "The Obelisk of Light strikes a random enemy anywhere for 160 every 4 s; the City of Magic turns one into a sheep",
    "Golden Shrine (legendary): every fallen unit has a 20% chance to rise again",
  ],
  build: [
    'su_golden_shrine', 'su_city_of_magic', 'su_arcane_tower', 'su_school', 'su_war_academy', 'su_hall_of_honor', 'treasure_box', 'su_archery_range', 'su_siege_works', 'su_hawk_portal', 'su_light_obelisk',
  ],
  buildings: [
    {
      id: 'su_archery_range', name: 'Archery Range', faction: 'sunspire', cost: 180, hp: 1200, armor: 5, buildTime: 2, size: 2,
      desc: "Archers: evasive bowmen whose headshots (10%) stun and deal 50 extra. Upgrades into the Archery Tower.",
      spawn: { unit: 'su_archer', count: 1, interval: 24 },
      upgrades: ['su_archery_tower'],
      model: { style: 'elfrange', wall: MARBLE, roof: CRIMSON, height: 22 },
    },
    {
      id: 'su_archery_tower', name: 'Archery Tower', faction: 'sunspire', cost: 200, hp: 1400, armor: 5, buildTime: 2, size: 2, upgradeOnly: true,
      desc: "Master Archers: 25% evade, 20% headshots for 125 extra.",
      spawn: { unit: 'su_master_archer', count: 1, interval: 34 },
      model: { style: 'elfrange', wall: MARBLE, roof: 0x7a1a2a, height: 30 },
    },
    {
      id: 'su_hall_of_honor', name: 'Hall of Honor', faction: 'sunspire', cost: 220, hp: 1300, armor: 5, buildTime: 2, size: 2,
      desc: "Blademasters: heavy-armoured swordsmen, 15% evade, 25% critical strikes (2.5\u00d7). Upgrades into the Hall of the Eldest.",
      spawn: { unit: 'su_blademaster', count: 1, interval: 26 },
      upgrades: ['su_hall_of_eldest'],
      model: { style: 'honorhall', wall: MARBLE, roof: GOLD, height: 24 },
    },
    {
      id: 'su_hall_of_eldest', name: 'Hall of the Eldest', faction: 'sunspire', cost: 230, hp: 1500, armor: 5, buildTime: 2, size: 2, upgradeOnly: true,
      desc: "Elder Blademasters: very fast blades, 25% evade, 30% critical strikes (3\u00d7).",
      spawn: { unit: 'su_elder_blademaster', count: 1, interval: 37 },
      model: { style: 'honorhall', wall: MARBLE, roof: 0xe8c860, height: 28 },
    },
    {
      id: 'su_school', name: 'School of Wizardry', faction: 'sunspire', cost: 360, hp: 1400, armor: 5, buildTime: 2, size: 2,
      desc: "Sorceresses: heal allies and have a 25% chance to call chain lightning (150, 7 targets). Upgrades into the Tower of Supreme Magic (legendary).",
      spawn: { unit: 'su_sorceress', count: 1, interval: 33 },
      upgrades: ['su_supreme_tower'],
      model: { style: 'wizardspire', wall: MARBLE, roof: AZURE, height: 34 },
    },
    {
      id: 'su_supreme_tower', name: 'Tower of Supreme Magic', faction: 'sunspire', cost: 440, lumber: 400, hp: 2000, armor: 5, buildTime: 2, size: 2, upgradeOnly: true, special: true, sapphires: 1,
      desc: "LEGENDARY: needs a sapphire. The Wizard: immune, 70% spell resistance, strong heals and 30% chain lightning (230, 7 targets).",
      spawn: { unit: 'su_wizard', count: 1, interval: 55 },
      lumberGain: 0,
      model: { style: 'wizardspire', wall: 0xf0e8d8, roof: 0x6a3ad0, height: 44 },
    },
    {
      id: 'su_war_academy', name: 'Blood Mage Academy', faction: 'sunspire', cost: 275, hp: 1300, armor: 5, buildTime: 2, size: 2,
      desc: "Bloodthirsters: magic bolts bouncing between 3 enemies, and faerie fire (\u22126 armour) on the enemies around them.",
      spawn: { unit: 'su_blood_mage', count: 1, interval: 28 },
      model: { style: 'academy', wall: 0xc8b8a8, roof: CRIMSON, height: 26 },
    },
    {
      id: 'su_siege_works', name: 'Ballista Works', faction: 'sunspire', cost: 350, hp: 1400, armor: 5, buildTime: 2, size: 2,
      desc: "Ballistae: long-range bolts that pierce through the enemies behind the target (ground only).",
      spawn: { unit: 'su_ballista', count: 1, interval: 32 },
      incomeRate: 0.018, lumberGain: 0.75,
      model: { style: 'elfsiege', wall: MARBLE, roof: GOLD, height: 20 },
    },
    {
      id: 'su_hawk_portal', name: 'Dragonhawk Portal', faction: 'sunspire', cost: 310, hp: 1400, armor: 5, buildTime: 2, size: 2,
      desc: "Dragonhawk Riders: flying lancers whose solar strikes stun enemy flyers.",
      spawn: { unit: 'su_dragonhawk', count: 1, interval: 30 },
      model: { style: 'hawkportal', wall: MARBLE, roof: 0xff9a3a, height: 30 },
    },
    {
      id: 'su_arcane_tower', name: 'Arcane Tower', faction: 'sunspire', cost: 250, lumber: 300, hp: 1500, armor: 8, buildTime: 20, size: 2,
      desc: "Base defence: an arcane tower shooting 5 targets at once (magic).",
      attack: { dmg: 57.5, attackType: 'magic', range: 6.75, cooldown: 1.2, targetsAir: true, multishot: 5 },
      incomeRate: 0.008, lumberGain: 0,
      model: { style: 'arcanetower', wall: MARBLE, roof: 0x8a5ae0, height: 42 },
    },
    {
      id: 'su_city_of_magic', name: 'City of Magic', faction: 'sunspire', cost: 240, lumber: 420, hp: 1000, armor: 5, buildTime: 2, size: 2,
      desc: "Hex: every 10 s a random enemy unit anywhere on the map turns into a sheep for 45 s.",
      power: { kind: 'hex', global: true, cooldown: 10, range: 12, radius: 0, dmg: 0, duration: 45 },
      incomeRate: 0.012, lumberGain: 0,
      model: { style: 'magiccity', wall: MARBLE, roof: AZURE, height: 30 },
    },
    {
      id: 'su_light_obelisk', name: 'Obelisk of Light', faction: 'sunspire', cost: 235, lumber: 450, hp: 900, armor: 5, buildTime: 2, size: 2,
      desc: "Light beam: every 4 s a random enemy unit anywhere on the map takes 160 damage.",
      power: { kind: 'beam', global: true, cooldown: 4, range: 12, radius: 0, dmg: 160 },
      incomeRate: 0.012, lumberGain: 0,
      model: { style: 'lightobelisk', wall: MARBLE, roof: GOLD, height: 40 },
    },
    {
      id: 'su_golden_shrine', name: 'Golden Shrine of Grace', faction: 'sunspire', cost: 650, lumber: 1800, hp: 1250, armor: 5, buildTime: 2, size: 2, special: true, sapphires: 1,
      desc: "LEGENDARY: needs a sapphire. Bright aura of grace: every own unit that falls anywhere has a 20% chance to rise again (a second shrine stacks once; not legendaries).",
      revive: { chance: 0.2, radius: 14, global: true },
      incomeRate: 0.012, lumberGain: 0,
      model: { style: 'goldshrine', wall: MARBLE, roof: GOLD, height: 46 },
    },
  ],
  units: [
    { id: 'su_archer', name: 'Archer', hp: 320, armor: 2, armorType: 'unarmored', dmg: 37.5, attackType: 'pierce', range: 4.5, cooldown: 1.3, speed: 3, radius: 0.3, bounty: 6, targetsAir: true,
      regen: 1, bash: { chance: 0.1, stun: 0.5, dmg: 50 }, evade: 0.15,
      model: { shape: 'highelf', body: CRIMSON, accent: GOLD, scale: 1, variant: 'archer' } },
    { id: 'su_master_archer', name: 'Master Archer', hp: 525, armor: 4, armorType: 'unarmored', dmg: 85, attackType: 'pierce', range: 5, cooldown: 1.01, speed: 3, radius: 0.32, bounty: 12, targetsAir: true,
      regen: 1, bash: { chance: 0.2, stun: 0.5, dmg: 125 }, evade: 0.25,
      model: { shape: 'highelf', body: 0x7a1a2a, accent: GOLD, scale: 1.12, variant: 'master' } },
    { id: 'su_blademaster', name: 'Blademaster', hp: 400, armor: 7, armorType: 'heavy', dmg: 27.5, attackType: 'normal', range: 0.5, cooldown: 0.7, speed: 3.25, radius: 0.32, bounty: 7,
      regen: 1, evade: 0.15, crit: { chance: 0.25, mult: 2.5 }, magicResist: 0.15,
      model: { shape: 'blademaster', body: CRIMSON, accent: GOLD, scale: 1 } },
    { id: 'su_elder_blademaster', name: 'Elder Blademaster', hp: 700, armor: 10, armorType: 'heavy', dmg: 45, attackType: 'normal', range: 0.55, cooldown: 0.5, speed: 3.4, radius: 0.35, bounty: 13,
      regen: 2, crit: { chance: 0.3, mult: 3 }, evade: 0.25, magicResist: 0.25,
      model: { shape: 'blademaster', body: 0x4a1a2a, accent: 0xf0d060, scale: 1.15, variant: 'elder' } },
    { id: 'su_sorceress', name: 'Sorceress', hp: 550, armor: 2, armorType: 'unarmored', dmg: 50, attackType: 'magic', range: 5, cooldown: 1.8, speed: 3, radius: 0.32, bounty: 11, targetsAir: true,
      heal: { amount: 150, range: 5, cooldown: 8 }, storm: { chance: 0.25, dmg: 150, jumps: 7 },
      model: { shape: 'sorceress', body: AZURE, accent: 0xb0d0ff, scale: 1 } },
    { id: 'su_wizard', name: 'Wizard', hp: 800, armor: 4, armorType: 'unarmored', dmg: 100, attackType: 'chaos', range: 6.5, cooldown: 1.8, speed: 3, radius: 0.36, bounty: 25, targetsAir: true,
      magicResist: 0.7, immune: true, heal: { amount: 300, range: 6.5, cooldown: 12 }, storm: { chance: 0.3, dmg: 230, jumps: 7 },
      model: { shape: 'sorceress', body: 0x4a2a8a, accent: 0xe0c0ff, scale: 1.25, variant: 'wizard' } },
    { id: 'su_blood_mage', name: 'Bloodthirster', hp: 525, armor: 3, armorType: 'medium', dmg: 57.5, attackType: 'magic', range: 3.6, cooldown: 1.5, speed: 3, radius: 0.32, bounty: 9, targetsAir: true,
      regen: 1.5, chain: 3, aura: { stat: 'armor', value: -6, radius: 3.6, target: 'enemy' },
      model: { shape: 'sorceress', body: CRIMSON, accent: 0xff8a3a, scale: 1.05, variant: 'blood' } },
    { id: 'su_ballista', name: 'Ballista', hp: 500, armor: 3, armorType: 'medium', dmg: 125, attackType: 'siege', range: 8.5, cooldown: 4, speed: 2.5, radius: 0.46, bounty: 11,
      splash: 2,
      model: { shape: 'ballista', body: 0xc8b090, accent: GOLD, scale: 1.05 } },
    { id: 'su_dragonhawk', name: 'Dragonhawk Rider', hp: 650, armor: 3, armorType: 'heavy', dmg: 70, attackType: 'pierce', range: 4.5, cooldown: 1.5, speed: 3.3, radius: 0.42, bounty: 10, air: true, targetsAir: true,
      regen: 1, slam: { chance: 0.1, dmg: 80, radius: 4 },
      model: { shape: 'dragonhawk', body: 0xd04a2a, accent: GOLD, scale: 1.15 } },
  ],
};
