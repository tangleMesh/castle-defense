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
  desc: 'Night elves of the moon: fragile but evasive archers, entangling druids, assassins, vengeful spirits and falling stars.',
  color: 0x4ab8c8,
  traits: [
    'Moonlit grace: every unit dodges every 8th blow',
    'Volleys: rangers and amazons shoot several enemies at once',
    'Shadows & vengeance: assassins backstab, avenging spirits ignore armour and explode when they fall',
    'Wild magic: druids entangle, faerie dragons heal, the wild obelisk blocks part of every hit',
    'Starfall: a special obelisk rains stars on the enemy army instead of training a champion',
  ],
  trait: { unitEvade: 8 },
  build: [
    'dm_hunters_hall', 'dm_moon_shrine', 'dm_shadow_house', 'dm_pillaged_hut',
    'dm_glaive_works', 'dm_wonder_fountain', 'dm_wild_obelisk', 'dm_lantern',
    'dm_moonstone_cache', 'dm_starfall',
  ],
  buildings: [
    // ---------------------------------------------------------------- huntresses → rangers → amazons
    {
      id: 'dm_hunters_hall', name: "Hunters' Hall", faction: 'duskmoon', cost: 90, hp: 550, armor: 2, buildTime: 8, size: 2,
      desc: 'Trains Huntresses: quick moonlit archers (hit flyers). Upgrades into Rangers\' Hall.',
      spawn: { unit: 'dm_huntress', count: 1, interval: 20 },
      upgrades: ['dm_ranger_hall'],
      model: { style: 'moonhall', wall: BARK, roof: DUSK, height: 22 },
    },
    {
      id: 'dm_ranger_hall', name: "Rangers' Hall", faction: 'duskmoon', cost: 130, hp: 800, armor: 3, buildTime: 9, size: 2, upgradeOnly: true,
      desc: 'Trains Rangers whose volleys strike three enemies at once. Upgrades (with a sapphire) into the Amazons\' Hall.',
      spawn: { unit: 'dm_ranger', count: 1, interval: 29 },
      upgrades: ['dm_amazon_hall'],
      model: { style: 'moonhall', wall: BARK, roof: 0x4a5aa0, height: 26 },
    },
    {
      id: 'dm_amazon_hall', name: "Amazons' Hall", faction: 'duskmoon', cost: 240, sapphires: 1, hp: 1100, armor: 4, buildTime: 13, size: 2, upgradeOnly: true,
      desc: 'ELITE (costs a sapphire): trains Amazons, whose volleys strike five enemies at once.',
      spawn: { unit: 'dm_amazon', count: 1, interval: 36 },
      model: { style: 'moonhall', wall: 0x3a2a3a, roof: SILVER, height: 30 },
    },
    // ---------------------------------------------------------------- druids
    {
      id: 'dm_moon_shrine', name: 'Moon Shrine', faction: 'duskmoon', cost: 115, hp: 550, armor: 2, buildTime: 9, size: 2,
      desc: 'Calls Druids whose bolts entangle: damage over time and a heavy 50% slow. Upgrades into Moon Altar.',
      spawn: { unit: 'dm_druid', count: 1, interval: 22 },
      upgrades: ['dm_moon_altar'],
      model: { style: 'moonshrine', wall: SILVER, roof: MOON, height: 26 },
    },
    {
      id: 'dm_moon_altar', name: 'Moon Altar', faction: 'duskmoon', cost: 130, hp: 800, armor: 3, buildTime: 9, size: 2, upgradeOnly: true,
      desc: 'Calls Sage Druids: their roots grip whole groups around the target (60% slow).',
      spawn: { unit: 'dm_sage', count: 1, interval: 31 },
      model: { style: 'moonshrine', wall: SILVER, roof: 0x9af0e0, height: 32 },
    },
    // ---------------------------------------------------------------- assassins
    {
      id: 'dm_shadow_house', name: 'House of Shadows', faction: 'duskmoon', cost: 120, hp: 550, armor: 2, buildTime: 9, size: 2,
      desc: 'Trains Assassins: fast and evasive, the first stab from the shadows deals triple damage. Upgrades into Guild of Shadows.',
      spawn: { unit: 'dm_assassin', count: 1, interval: 22 },
      upgrades: ['dm_shadow_guild'],
      model: { style: 'shadowhouse', wall: 0x2a2232, roof: DUSK, height: 22 },
    },
    {
      id: 'dm_shadow_guild', name: 'Guild of Shadows', faction: 'duskmoon', cost: 125, hp: 800, armor: 3, buildTime: 9, size: 2, upgradeOnly: true,
      desc: 'Trains Royal Assassins: very fast blades, dodge every 4th blow, a quadruple-damage backstab.',
      spawn: { unit: 'dm_royal_assassin', count: 1, interval: 30 },
      model: { style: 'shadowhouse', wall: 0x1a1422, roof: 0x7a3a8a, height: 26 },
    },
    // ---------------------------------------------------------------- avenging spirits
    {
      id: 'dm_pillaged_hut', name: 'Pillaged Hut', faction: 'duskmoon', cost: 140, hp: 600, armor: 2, buildTime: 10, size: 2,
      desc: 'Avenging Spirits rise from its ashes: armour-piercing, evasive, they drink the life of what they strike. Upgrades into Scorched Mansion.',
      spawn: { unit: 'dm_spirit', count: 1, interval: 23 },
      upgrades: ['dm_scorched_mansion'],
      model: { style: 'ruinhut', wall: 0x4a3a2a, roof: 0x6ae0a0, height: 18 },
    },
    {
      id: 'dm_scorched_mansion', name: 'Scorched Mansion', faction: 'duskmoon', cost: 150, hp: 900, armor: 3, buildTime: 10, size: 2, upgradeOnly: true,
      desc: 'Avatars of Vengeance rise from it: stronger spirits that explode in revenge when they fall.',
      spawn: { unit: 'dm_vengeance', count: 1, interval: 34 },
      model: { style: 'ruinhut', wall: 0x3a2a1a, roof: 0x9affc0, height: 24 },
    },
    // ---------------------------------------------------------------- siege & air
    {
      id: 'dm_glaive_works', name: 'Glaive Works', faction: 'duskmoon', cost: 170, hp: 650, armor: 2, buildTime: 11, size: 2,
      desc: 'Builds Glaive Throwers: very long-range siege whose spinning glaive bounces between 4 enemies. Can\'t hit flyers.',
      spawn: { unit: 'dm_glaive', count: 1, interval: 26 },
      model: { style: 'glaiveworks', wall: BARK, roof: SILVER, height: 20 },
    },
    {
      id: 'dm_wonder_fountain', name: 'Fountain of Wonders', faction: 'duskmoon', cost: 155, hp: 600, armor: 2, buildTime: 10, size: 2,
      desc: 'Faerie Dragons hatch from its shimmering water: small magic flyers that heal wounded allies.',
      spawn: { unit: 'dm_faerie', count: 1, interval: 25 },
      model: { style: 'wonderwell', wall: SILVER, roof: 0xe08af0, height: 20 },
    },
    // ---------------------------------------------------------------- utility
    {
      id: 'dm_wild_obelisk', name: 'Obelisk of the Wild', faction: 'duskmoon', cost: 140, hp: 500, armor: 2, buildTime: 8, size: 2,
      desc: 'Aura: allied units within 7 tiles are wrapped in wild bark, every hit on them deals 4 less damage.',
      aura: { stat: 'block', value: 4, radius: 7, target: 'ally' },
      model: { style: 'wildstone', wall: 0x6a6a5a, roof: 0x6ad070, height: 26 },
    },
    {
      id: 'dm_lantern', name: "Elune's Lantern", faction: 'duskmoon', cost: 150, hp: 1200, armor: 6, buildTime: 12, size: 2,
      desc: 'Defensive tower: moonbeams (magic, strong against heavy armour) at air and ground within 8 tiles.',
      attack: { dmg: 90, attackType: 'magic', range: 8, cooldown: 1.5, targetsAir: true },
      model: { style: 'moonlantern', wall: SILVER, roof: MOON, height: 44 },
    },
    {
      id: 'dm_moonstone_cache', name: 'Moonstone Cache', faction: 'duskmoon', cost: 170, hp: 500, armor: 1, buildTime: 10, size: 2,
      desc: 'Moonstones traded with the spirits: your income is increased by 20% (stacks up to +30%).',
      incomeBonus: 0.2,
      model: { style: 'moonstone', wall: BARK, roof: 0xb0e8ff, height: 16 },
    },
    // ---------------------------------------------------------------- special
    {
      id: 'dm_starfall', name: 'Starfall Obelisk', faction: 'duskmoon', cost: 400, hp: 1800, armor: 6, buildTime: 20, size: 2, special: true, sapphires: 1,
      desc: 'SPECIAL: costs a sapphire. Every 25 s stars rain on the nearest enemy army within 16 tiles for 8 s. Upgrades into Elune\'s Wrath.',
      power: { kind: 'cyclone', cooldown: 25, range: 16, radius: 3.5, dmg: 34, duration: 8, slow: 0 },
      upgrades: ['dm_starfall_2'],
      model: { style: 'starfall', wall: SILVER, roof: MOON, height: 50 },
    },
    {
      id: 'dm_starfall_2', name: "Elune's Wrath", faction: 'duskmoon', cost: 350, hp: 2400, armor: 7, buildTime: 15, size: 2, special: true, upgradeOnly: true,
      desc: 'Stars fall every 18 s, harder and wider.',
      power: { kind: 'cyclone', cooldown: 18, range: 18, radius: 4, dmg: 46, duration: 8, slow: 0 },
      model: { style: 'starfall', wall: SILVER, roof: 0xe0f8ff, height: 58 },
    },
  ],
  units: [
    { id: 'dm_huntress', name: 'Huntress', hp: 280, armor: 1, armorType: 'light', dmg: 16, attackType: 'pierce', range: 4, cooldown: 1.05, speed: 3.0, radius: 0.3, bounty: 4, targetsAir: true,
      model: { shape: 'moonarcher', body: DUSK, accent: MOON, scale: 1 } },
    { id: 'dm_ranger', name: 'Ranger', hp: 460, armor: 3, armorType: 'light', dmg: 25, attackType: 'pierce', range: 4.25, cooldown: 1.0, speed: 3.0, radius: 0.32, bounty: 8, targetsAir: true,
      multishot: 3,
      model: { shape: 'moonarcher', body: 0x3a5a4a, accent: MOON, scale: 1.1, variant: 'ranger' } },
    { id: 'dm_amazon', name: 'Amazon', hp: 1300, armor: 5, armorType: 'light', dmg: 44, attackType: 'pierce', range: 4.6, cooldown: 1.0, speed: 3.0, radius: 0.38, bounty: 20, targetsAir: true,
      multishot: 5,
      model: { shape: 'moonarcher', body: 0x2a2a4a, accent: SILVER, scale: 1.3, variant: 'amazon' } },
    { id: 'dm_druid', name: 'Druid', hp: 300, armor: 1, armorType: 'light', dmg: 24, attackType: 'magic', range: 3.75, cooldown: 1.4, speed: 2.85, radius: 0.32, bounty: 5, targetsAir: true,
      poison: { dps: 5, duration: 4, slow: 0.5 },
      model: { shape: 'druid', body: 0x4a6a3a, accent: MOON, scale: 1 } },
    { id: 'dm_sage', name: 'Sage Druid', hp: 520, armor: 3, armorType: 'light', dmg: 34, attackType: 'magic', range: 3.75, cooldown: 1.4, speed: 2.85, radius: 0.36, bounty: 9, targetsAir: true,
      splash: 1, poison: { dps: 9, duration: 5, slow: 0.6 },
      model: { shape: 'druid', body: 0x3a5a3a, accent: 0x9af0e0, scale: 1.15, variant: 'sage' } },
    { id: 'dm_assassin', name: 'Assassin', hp: 340, armor: 1, armorType: 'medium', dmg: 17, attackType: 'pierce', range: 0.4, cooldown: 1.0, speed: 3.2, radius: 0.3, bounty: 5,
      evade: 6, charge: 3,
      model: { shape: 'shade', body: 0x2a2232, accent: 0xb06ae0, scale: 1 } },
    { id: 'dm_royal_assassin', name: 'Royal Assassin', hp: 520, armor: 2, armorType: 'medium', dmg: 25, attackType: 'pierce', range: 0.4, cooldown: 0.75, speed: 3.3, radius: 0.32, bounty: 10,
      evade: 4, charge: 4,
      model: { shape: 'shade', body: 0x1a1422, accent: 0xe06ad0, scale: 1.12, variant: 'royal' } },
    { id: 'dm_spirit', name: 'Avenging Spirit', hp: 400, armor: 5, armorType: 'light', dmg: 24, attackType: 'magic', range: 0.5, cooldown: 1.2, speed: 3.6, radius: 0.34, bounty: 6,
      evade: 3, ignoreArmor: true, lifesteal: 0.14,
      model: { shape: 'wraith', body: 0x6ae0a0, accent: 0xd0fff0, scale: 1 } },
    { id: 'dm_vengeance', name: 'Avatar of Vengeance', hp: 680, armor: 8, armorType: 'light', dmg: 36, attackType: 'magic', range: 0.5, cooldown: 0.9, speed: 3.6, radius: 0.4, bounty: 12,
      evade: 3, ignoreArmor: true, lifesteal: 0.2, deathBlast: { dmg: 190, radius: 2 },
      model: { shape: 'wraith', body: 0x4ad090, accent: 0xffffff, scale: 1.3, variant: 'avatar' } },
    { id: 'dm_glaive', name: 'Glaive Thrower', hp: 380, armor: 2, armorType: 'heavy', dmg: 36, attackType: 'siege', range: 9, cooldown: 2.5, speed: 2.5, radius: 0.45, bounty: 6,
      chain: 4,
      model: { shape: 'glaivecart', body: BARK, accent: SILVER, scale: 1.05 } },
    { id: 'dm_faerie', name: 'Faerie Dragon', hp: 420, armor: 2, armorType: 'light', dmg: 20, attackType: 'magic', range: 3.5, cooldown: 1.3, speed: 3.4, radius: 0.34, bounty: 6, air: true, targetsAir: true,
      heal: { amount: 45, range: 4, cooldown: 3 },
      model: { shape: 'faeriedragon', body: 0x8ad0f0, accent: 0xe08af0, scale: 1 } },
  ],
};
