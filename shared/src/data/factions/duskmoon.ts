import type { FactionDef } from '../types';

const BARK = 0x4a3a4a;
const SILVER = 0xc8d0e0;
const MOON = 0x6ad0d0;
const DUSK = 0x5a4a8a;

/**
 * Duskmoon Covenant: the night elves of the moon goddess. Tree and stat ratios follow the
 * classic "night elf" castle-fight race (huntresses → rangers → amazons with multi-shot, druids
 * that entangle, assassins that backstab, avenging spirits, a glaive thrower, healing faerie
 * dragons, the lantern tower and the starfall obelisk), re-themed with the Covenant's own names
 * and look. Fragile, but every unit dodges blows.
 */
export const DUSKMOON: FactionDef = {
  id: 'duskmoon',
  name: 'Duskmoon Covenant',
  desc: "The night elves: huntresses, multishot rangers and the legendary Amazon, druids that entangle, stealthy assassins backstabbing casters, vengeful spirits, glaive throwers, faerie dragons, Elune's Lantern, the Silver Glade, the Obelisk of Wilderness and the Starfall Obelisk.",
  color: 0x4ab8c8,
  traits: [
    "Evasion everywhere: huntresses, rangers, assassins and spirits dodge attacks (up to 40%)",
    "Rangers shoot 3 targets, the legendary Amazon 7 (immune, 70% spell resistance)",
    "Assassins stalk unseen and backstab casters; spirits heal on every kill and avatars take revenge when they fall",
    "Druids entangle ground units in place while they take damage",
    "Obelisk of Wilderness wards your units; the Silver Glade heals and armours the wounded; the Starfall Obelisk (legendary) rains stars anywhere",
  ],
  build: [
    'dm_wild_obelisk', 'dm_silver_glade', 'dm_lantern', 'dm_starfall', 'dm_moon_shrine', 'dm_shadow_house', 'dm_pillaged_hut', 'dm_glaive_works', 'dm_hunters_hall', 'treasure_box', 'dm_wonder_fountain',
  ],
  buildings: [
    {
      id: 'dm_hunters_hall', name: "Hunters' Hall", faction: 'duskmoon', cost: 150, hp: 1200, armor: 5, buildTime: 2, size: 2,
      desc: "Huntresses: cheap archers with 8% evade. Upgrades into the Ranger's Hall.",
      spawn: { unit: 'dm_huntress', count: 1, interval: 22 },
      upgrades: ['dm_ranger_hall'],
      model: { style: 'moonhall', wall: BARK, roof: DUSK, height: 22 },
    },
    {
      id: 'dm_ranger_hall', name: "Rangers' Hall", faction: 'duskmoon', cost: 200, hp: 1400, armor: 5, buildTime: 2, size: 2, upgradeOnly: true,
      desc: "Rangers: shoot 3 targets at once, 15% evade. Upgrades into the Amazon's Hall (legendary).",
      spawn: { unit: 'dm_ranger', count: 1, interval: 32 },
      upgrades: ['dm_amazon_hall'],
      model: { style: 'moonhall', wall: BARK, roof: 0x4a5aa0, height: 26 },
    },
    {
      id: 'dm_amazon_hall', name: "Amazons' Hall", faction: 'duskmoon', cost: 400, lumber: 375, hp: 1900, armor: 5, buildTime: 2, size: 2, upgradeOnly: true, special: true, sapphires: 1,
      desc: "LEGENDARY: needs a sapphire. Amazons: 7 targets at once, immune, 70% spell resistance, 25% evade.",
      spawn: { unit: 'dm_amazon', count: 1, interval: 52 },
      lumberGain: 0,
      model: { style: 'moonhall', wall: 0x3a2a3a, roof: SILVER, height: 30 },
    },
    {
      id: 'dm_moon_shrine', name: 'Moon Shrine', faction: 'duskmoon', cost: 190, hp: 1200, armor: 5, buildTime: 2, size: 2,
      desc: "Druids: chaos bolts, and now and then they entangle a ground unit for 5 s (15 damage per second). Upgrades into the Moon Altar.",
      spawn: { unit: 'dm_druid', count: 1, interval: 24 },
      upgrades: ['dm_moon_altar'],
      model: { style: 'moonshrine', wall: SILVER, roof: MOON, height: 26 },
    },
    {
      id: 'dm_moon_altar', name: 'Moon Altar', faction: 'duskmoon', cost: 210, hp: 1500, armor: 5, buildTime: 2, size: 2, upgradeOnly: true,
      desc: "Sage Druids: mass entangle, 3 ground units for 6 s (35 damage per second).",
      spawn: { unit: 'dm_sage', count: 1, interval: 35 },
      model: { style: 'moonshrine', wall: SILVER, roof: 0x9af0e0, height: 32 },
    },
    {
      id: 'dm_shadow_house', name: 'House of Shadows', faction: 'duskmoon', cost: 200, hp: 1300, armor: 5, buildTime: 2, size: 2,
      desc: "Assassins: stalk unseen and backstab casters for 150 extra, 15% evade. Upgrades into the Guild of Shadows.",
      spawn: { unit: 'dm_assassin', count: 1, interval: 30 },
      upgrades: ['dm_shadow_guild'],
      model: { style: 'shadowhouse', wall: 0x2a2232, roof: DUSK, height: 22 },
    },
    {
      id: 'dm_shadow_guild', name: 'Guild of Shadows', faction: 'duskmoon', cost: 175, hp: 1400, armor: 5, buildTime: 2, size: 2, upgradeOnly: true,
      desc: "Royal Assassins: faster blades, 25% evade, backstabs for 300 extra.",
      spawn: { unit: 'dm_royal_assassin', count: 1, interval: 33 },
      model: { style: 'shadowhouse', wall: 0x1a1422, roof: 0x7a3a8a, height: 26 },
    },
    {
      id: 'dm_pillaged_hut', name: 'Pillaged Hut', faction: 'duskmoon', cost: 230, hp: 1300, armor: 5, buildTime: 2, size: 2,
      desc: "Avenging Spirits: 30% evade, corrosive strikes (\u22124 armour), heal 14% on every kill. Upgrades into the Scorched Mansion.",
      spawn: { unit: 'dm_spirit', count: 1, interval: 26 },
      upgrades: ['dm_scorched_mansion'],
      model: { style: 'ruinhut', wall: 0x4a3a2a, roof: 0x6ae0a0, height: 18 },
    },
    {
      id: 'dm_scorched_mansion', name: 'Scorched Mansion', faction: 'duskmoon', cost: 240, hp: 1500, armor: 5, buildTime: 2, size: 2, upgradeOnly: true,
      desc: "Avatars of Vengeance: 40% evade, corrosion \u22127, heal 20% per kill, and 350 chaos damage to their killer when they fall.",
      spawn: { unit: 'dm_vengeance', count: 1, interval: 38 },
      model: { style: 'ruinhut', wall: 0x3a2a1a, roof: 0x9affc0, height: 24 },
    },
    {
      id: 'dm_glaive_works', name: 'Glaive Works', faction: 'duskmoon', cost: 285, hp: 1300, armor: 5, buildTime: 2, size: 2,
      desc: "Glaive Throwers: very long-range siege glaives bouncing between 4 enemies (ground only).",
      spawn: { unit: 'dm_glaive', count: 1, interval: 29 },
      incomeRate: 0.018, lumberGain: 0.75,
      model: { style: 'glaiveworks', wall: BARK, roof: SILVER, height: 20 },
    },
    {
      id: 'dm_wonder_fountain', name: 'Fountain of Wonders', faction: 'duskmoon', cost: 260, hp: 1300, armor: 5, buildTime: 2, size: 2,
      desc: "Faerie Dragons: small magic flyers that heal an ally for 175 every 6 s.",
      spawn: { unit: 'dm_faerie', count: 1, interval: 28 },
      model: { style: 'wonderwell', wall: SILVER, roof: 0xe08af0, height: 20 },
    },
    {
      id: 'dm_lantern', name: "Elune's Lantern", faction: 'duskmoon', cost: 210, lumber: 300, hp: 1500, armor: 8, buildTime: 20, size: 2,
      desc: "Base defence: moonbeams (magic, 87 damage per second) at air and ground.",
      attack: { dmg: 70, attackType: 'magic', range: 8.5, cooldown: 0.8, targetsAir: true },
      incomeRate: 0.008, lumberGain: 0,
      model: { style: 'moonlantern', wall: SILVER, roof: MOON, height: 44 },
    },
    {
      id: 'dm_wild_obelisk', name: 'Obelisk of the Wild', faction: 'duskmoon', cost: 220, lumber: 300, hp: 900, armor: 5, buildTime: 2, size: 2,
      desc: "Resistance of the wilderness: every 7 s a random unit of yours (one without it first) permanently gains 50% spell resistance and a 40% chance to take 40 less from an attack.",
      power: { kind: 'bless', ward: true, global: true, cooldown: 7, range: 14, radius: 0, dmg: 0 },
      incomeRate: 0.012, lumberGain: 0,
      model: { style: 'wildstone', wall: 0x6a6a5a, roof: 0x6ad070, height: 26 },
    },
    {
      id: 'dm_silver_glade', name: 'Silver Glade', faction: 'duskmoon', cost: 225, lumber: 600, hp: 1000, armor: 5, buildTime: 2, size: 2,
      desc: "Moonshine blessing: every 20 s everything around a random wounded unit of yours heals 175 and gains +6 armour for 6 s.",
      power: { kind: 'moonshine', global: true, cooldown: 20, range: 14, radius: 3, dmg: 175, armor: 6, duration: 6 },
      incomeRate: 0.012, lumberGain: 0,
      model: { style: 'moonstone', wall: SILVER, roof: 0xd8f0ff, height: 18 },
    },
    {
      id: 'dm_starfall', name: 'Starfall Obelisk', faction: 'duskmoon', cost: 650, lumber: 1350, hp: 1200, armor: 5, buildTime: 2, size: 2, special: true, sapphires: 1,
      desc: "LEGENDARY: needs a sapphire. Starfall: every 30 s stars rain around a random enemy anywhere for 11 s, 50 spell damage per second.",
      power: { kind: 'cyclone', global: true, cooldown: 30, range: 18, radius: 3.5, dmg: 50, duration: 11, slow: 0 },
      incomeRate: 0.009, lumberGain: 0,
      model: { style: 'starfall', wall: SILVER, roof: MOON, height: 50 },
    },
  ],
  units: [
    { id: 'dm_huntress', name: 'Huntress', hp: 300, armor: 1, armorType: 'light', dmg: 41.5, attackType: 'pierce', range: 4, cooldown: 1.54, speed: 3, radius: 0.3, bounty: 5, targetsAir: true,
      evade: 0.08,
      model: { shape: 'moonarcher', body: DUSK, accent: MOON, scale: 1 } },
    { id: 'dm_ranger', name: 'Ranger', hp: 500, armor: 3, armorType: 'light', dmg: 65, attackType: 'pierce', range: 4.25, cooldown: 1.04, speed: 3, radius: 0.32, bounty: 11, targetsAir: true,
      multishot: 3, evade: 0.15,
      model: { shape: 'moonarcher', body: 0x3a5a4a, accent: MOON, scale: 1.1, variant: 'ranger' } },
    { id: 'dm_amazon', name: 'Amazon', hp: 900, armor: 5, armorType: 'light', dmg: 100, attackType: 'pierce', range: 4.6, cooldown: 1, speed: 3, radius: 0.38, bounty: 23, targetsAir: true,
      regen: 3, immune: true, magicResist: 0.7, multishot: 7, evade: 0.25,
      model: { shape: 'moonarcher', body: 0x2a2a4a, accent: SILVER, scale: 1.3, variant: 'amazon' } },
    { id: 'dm_druid', name: 'Druid', hp: 325, armor: 1, armorType: 'unarmored', dmg: 50, attackType: 'chaos', range: 3.75, cooldown: 1.61, speed: 2.85, radius: 0.32, bounty: 6, targetsAir: true,
      bash: { chance: 0.115, stun: 5, dmg: 75 },
      model: { shape: 'druid', body: 0x4a6a3a, accent: MOON, scale: 1 } },
    { id: 'dm_sage', name: 'Sage Druid', hp: 550, armor: 3, armorType: 'unarmored', dmg: 75, attackType: 'chaos', range: 3.75, cooldown: 1.63, speed: 2.85, radius: 0.36, bounty: 14, targetsAir: true,
      regen: 1, bash: { chance: 0.35, stun: 6, dmg: 210 },
      model: { shape: 'druid', body: 0x3a5a3a, accent: 0x9af0e0, scale: 1.15, variant: 'sage' } },
    { id: 'dm_assassin', name: 'Assassin', hp: 375, armor: 1, armorType: 'medium', dmg: 30, attackType: 'pierce', range: 0.4, cooldown: 1, speed: 3.2, radius: 0.3, bounty: 7,
      evade: 0.15, charge: 6, stealth: { reveal: 4 },
      model: { shape: 'shade', body: 0x2a2232, accent: 0xb06ae0, scale: 1 } },
    { id: 'dm_royal_assassin', name: 'Royal Assassin', hp: 575, armor: 2, armorType: 'medium', dmg: 45, attackType: 'pierce', range: 0.4, cooldown: 0.75, speed: 3.3, radius: 0.32, bounty: 12,
      evade: 0.25, charge: 7.7, stealth: { reveal: 3 },
      model: { shape: 'shade', body: 0x1a1422, accent: 0xe06ad0, scale: 1.12, variant: 'royal' } },
    { id: 'dm_spirit', name: 'Avenging Spirit', hp: 425, armor: 5, armorType: 'light', dmg: 45, attackType: 'magic', range: 0.5, cooldown: 1.2, speed: 3.6, radius: 0.34, bounty: 7,
      evade: 0.3, killHeal: 0.14, aura: { stat: 'armor', value: -4, radius: 1, target: 'enemy' },
      model: { shape: 'wraith', body: 0x6ae0a0, accent: 0xd0fff0, scale: 1 } },
    { id: 'dm_vengeance', name: 'Avatar of Vengeance', hp: 700, armor: 8, armorType: 'light', dmg: 70, attackType: 'magic', range: 0.4, cooldown: 0.9, speed: 3.6, radius: 0.4, bounty: 15,
      evade: 0.4, killHeal: 0.2, revenge: 350, aura: { stat: 'armor', value: -7, radius: 1, target: 'enemy' },
      model: { shape: 'wraith', body: 0x4ad090, accent: 0xffffff, scale: 1.3, variant: 'avatar' } },
    { id: 'dm_glaive', name: 'Glaive Thrower', hp: 400, armor: 2, armorType: 'heavy', dmg: 92.5, attackType: 'siege', range: 10, cooldown: 3.56, speed: 2.5, radius: 0.45, bounty: 9,
      chain: 4,
      model: { shape: 'glaivecart', body: BARK, accent: SILVER, scale: 1.05 } },
    { id: 'dm_faerie', name: 'Faerie Dragon', hp: 460, armor: 2, armorType: 'light', dmg: 50, attackType: 'magic', range: 3.5, cooldown: 1.79, speed: 3.4, radius: 0.34, bounty: 8, air: true, targetsAir: true,
      heal: { amount: 175, range: 5, cooldown: 6 },
      model: { shape: 'faeriedragon', body: 0x8ad0f0, accent: 0xe08af0, scale: 1 } },
  ],
};
