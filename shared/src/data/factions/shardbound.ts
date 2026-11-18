import type { FactionDef } from '../types';

const STONE = 0x6a6478;
const SHARD = 0x9a6ae0;
const DEEP = 0x4a3a7a;

/**
 * Shardbound Conclave: conjurers who bind elemental spirits into crystal shards. Tree and stat
 * ratios follow the classic "elemental" castle-fight race (water spirits that shrug off missiles,
 * wind elementals that only hunt flyers, splitting fire, chain lightning with a crackling shield,
 * siege earth elementals, storm books that rain on the ground or burn the sky), re-themed and with
 * the Conclave's own names, look and champion.
 */
export const SHARDBOUND: FactionDef = {
  id: 'shardbound',
  name: 'Shardbound Conclave',
  desc: 'Elemental spirits bound in crystal: tough water, sky-hunting wind, splitting fire, chain lightning and storms.',
  color: 0x9a6ae0,
  traits: [
    'Bound spirits: water elementals shrug off missiles, lightning elementals shock whoever strikes them',
    'Sky hunters: wind elementals fly and shoot only flyers, so they shine against air armies',
    'Splitting fire: a fallen Blaze Elemental breaks into two Cinders',
    'Earth: slow siege elementals that pulverise the ground and tear down buildings',
    'Storm books: a Codex rains storms on the ground or meteors on the sky',
  ],
  build: [
    'sb_tidewell', 'sb_gale_cage', 'sb_ember_altar', 'sb_storm_pillar',
    'sb_rock_pile', 'sb_codex', 'sb_obelisk', 'sb_guard_tower',
    'sb_mana_well', 'sb_nexus',
  ],
  buildings: [
    // ---------------------------------------------------------------- water
    {
      id: 'sb_tidewell', name: 'Tidewell', faction: 'shardbound', cost: 95, hp: 600, armor: 2, buildTime: 8, size: 2,
      desc: 'Calls Rill Spirits: melee water elementals that shrug off 30% of ranged damage. Upgrades into Tide Fountain.',
      spawn: { unit: 'sb_rill', count: 1, interval: 20 },
      upgrades: ['sb_tide_fountain'],
      model: { style: 'fountain', wall: STONE, roof: 0x4a9ad0, height: 18 },
    },
    {
      id: 'sb_tide_fountain', name: 'Tide Fountain', faction: 'shardbound', cost: 130, hp: 850, armor: 3, buildTime: 9, size: 2, upgradeOnly: true,
      desc: 'Calls Tide Spirits: tougher, 40% less ranged damage. Upgrades (with a sapphire) into the Deepwater Fountain.',
      spawn: { unit: 'sb_tide', count: 1, interval: 27 },
      upgrades: ['sb_deep_fountain'],
      model: { style: 'fountain', wall: STONE, roof: 0x3a7ac8, height: 22 },
    },
    {
      id: 'sb_deep_fountain', name: 'Deepwater Fountain', faction: 'shardbound', cost: 240, sapphires: 1, hp: 1100, armor: 4, buildTime: 13, size: 2, upgradeOnly: true,
      desc: 'ELITE (costs a sapphire): calls Deepwater Spirits that halve ranged damage and slip away from every 5th blow.',
      spawn: { unit: 'sb_deep', count: 1, interval: 32 },
      model: { style: 'fountain', wall: DEEP, roof: 0x2a5ab8, height: 26 },
    },
    // ---------------------------------------------------------------- wind (anti-air)
    {
      id: 'sb_gale_cage', name: 'Gale Cage', faction: 'shardbound', cost: 80, hp: 500, armor: 2, buildTime: 7, size: 2,
      desc: 'Frees Breeze Wisps: cheap flyers that shoot only enemy flyers. Upgrades into Wind Monument.',
      spawn: { unit: 'sb_breeze', count: 1, interval: 19 },
      upgrades: ['sb_wind_monument'],
      model: { style: 'cage', wall: STONE, roof: 0xb0d8f0, height: 26 },
    },
    {
      id: 'sb_wind_monument', name: 'Wind Monument', faction: 'shardbound', cost: 130, hp: 800, armor: 3, buildTime: 9, size: 2, upgradeOnly: true,
      desc: 'Frees Gust Elementals: anti-air flyers whose gusts slow their prey by 20%. Upgrades (with a sapphire) into the Zephyr Spire.',
      spawn: { unit: 'sb_gust', count: 1, interval: 26 },
      upgrades: ['sb_zephyr_spire'],
      model: { style: 'cage', wall: STONE, roof: 0x90c0e8, height: 32 },
    },
    {
      id: 'sb_zephyr_spire', name: 'Zephyr Spire', faction: 'shardbound', cost: 220, sapphires: 1, hp: 1100, armor: 4, buildTime: 12, size: 2, upgradeOnly: true,
      desc: 'ELITE (costs a sapphire): frees Zephyr Lords, armoured sky hunters whose gale splashes over flyer packs and slows them by 35%.',
      spawn: { unit: 'sb_zephyr', count: 1, interval: 32 },
      model: { style: 'cage', wall: DEEP, roof: 0xd0e8ff, height: 38 },
    },
    // ---------------------------------------------------------------- fire
    {
      id: 'sb_ember_altar', name: 'Ember Altar', faction: 'shardbound', cost: 120, hp: 600, armor: 2, buildTime: 9, size: 2,
      desc: 'Kindles Ember Elementals: heavy-armoured ranged fire (magic, strong against heavy armour). Upgrades into Blaze Altar.',
      spawn: { unit: 'sb_ember', count: 1, interval: 22 },
      upgrades: ['sb_blaze_altar'],
      model: { style: 'altar', wall: STONE, roof: 0xd0603a, height: 22 },
    },
    {
      id: 'sb_blaze_altar', name: 'Blaze Altar', faction: 'shardbound', cost: 150, hp: 850, armor: 3, buildTime: 10, size: 2, upgradeOnly: true,
      desc: 'Kindles Blaze Elementals: every 5th attack is a fire breath over the target\'s group, and when one falls it splits into two Cinders. Upgrades (with a sapphire) into the Spire of Elder Lore.',
      spawn: { unit: 'sb_blaze', count: 1, interval: 30 },
      upgrades: ['sb_elder_spire'],
      model: { style: 'altar', wall: STONE, roof: 0xe0402a, height: 26 },
    },
    {
      id: 'sb_elder_spire', name: 'Spire of Elder Lore', faction: 'shardbound', cost: 260, sapphires: 1, hp: 1200, armor: 4, buildTime: 14, size: 2, upgradeOnly: true,
      desc: 'ELITE (costs a sapphire): summons a Master of Elements, a long-range caster whose every 4th spell calls a storm, and who makes nearby elementals hit 15% harder.',
      spawn: { unit: 'sb_master', count: 1, interval: 36 },
      model: { style: 'altar', wall: DEEP, roof: SHARD, height: 44 },
    },
    // ---------------------------------------------------------------- lightning
    {
      id: 'sb_storm_pillar', name: 'Storm Pillar', faction: 'shardbound', cost: 135, hp: 650, armor: 2, buildTime: 10, size: 2,
      desc: 'Charges Spark Elementals: lightning that jumps between 3 enemies; melee attackers take 15% of their damage back. Upgrades into St. Elmo\'s Pillar.',
      spawn: { unit: 'sb_spark', count: 1, interval: 23 },
      upgrades: ['sb_elmo_pillar'],
      model: { style: 'pillar', wall: STONE, roof: 0x7ab0ff, height: 34 },
    },
    {
      id: 'sb_elmo_pillar', name: "St. Elmo's Pillar", faction: 'shardbound', cost: 160, hp: 900, armor: 3, buildTime: 10, size: 2, upgradeOnly: true,
      desc: 'Charges Thunder Elementals: heavy-armoured, lightning jumps between 5 enemies, melee attackers take 30% back.',
      spawn: { unit: 'sb_thunder', count: 1, interval: 31 },
      model: { style: 'pillar', wall: STONE, roof: 0xa0d0ff, height: 40 },
    },
    // ---------------------------------------------------------------- earth (siege)
    {
      id: 'sb_rock_pile', name: 'Rock Pile', faction: 'shardbound', cost: 150, hp: 900, armor: 4, buildTime: 11, size: 2,
      desc: 'Wakes Stone Elementals: slow melee siege that pulverises the ground every 5th blow and crushes buildings. Upgrades into Greater Fissure.',
      spawn: { unit: 'sb_stone', count: 1, interval: 24 },
      upgrades: ['sb_fissure'],
      model: { style: 'rockpile', wall: 0x7a7468, roof: 0x8a7a5a, height: 16 },
    },
    {
      id: 'sb_fissure', name: 'Greater Fissure', faction: 'shardbound', cost: 170, hp: 1200, armor: 5, buildTime: 11, size: 2, upgradeOnly: true,
      desc: 'Wakes Mountain Elementals: huge siege brutes that pulverise the ground every 4th blow.',
      spawn: { unit: 'sb_mountain', count: 1, interval: 34 },
      model: { style: 'rockpile', wall: 0x6a6458, roof: 0x6a5a3a, height: 20 },
    },
    // ---------------------------------------------------------------- utility
    {
      id: 'sb_codex', name: 'Codex of Conjuration', faction: 'shardbound', cost: 170, hp: 700, armor: 2, buildTime: 10, size: 2,
      desc: 'Every 15 s a monsoon settles on the nearest enemy ground unit: damage and a 15% slow. Upgrades into Codex of Storms (ground) or Codex of Meteors (flyers).',
      power: { kind: 'cyclone', cooldown: 15, range: 13, radius: 2.5, dmg: 12, duration: 5, slow: 0.15 },
      upgrades: ['sb_codex_storms', 'sb_codex_meteors'],
      model: { style: 'codex', wall: DEEP, roof: SHARD, height: 24 },
    },
    {
      id: 'sb_codex_storms', name: 'Codex of Storms', faction: 'shardbound', cost: 110, hp: 900, armor: 3, buildTime: 9, size: 2, upgradeOnly: true,
      desc: 'Every 15 s a blizzard settles on the nearest enemy ground unit within 14 tiles: heavy damage and a 25% slow for 7 s.',
      power: { kind: 'cyclone', cooldown: 15, range: 14, radius: 2.8, dmg: 24, duration: 7, slow: 0.25 },
      model: { style: 'codex', wall: DEEP, roof: 0x7ab0ff, height: 28 },
    },
    {
      id: 'sb_codex_meteors', name: 'Codex of Meteors', faction: 'shardbound', cost: 110, hp: 900, armor: 3, buildTime: 9, size: 2, upgradeOnly: true,
      desc: 'Every 15 s a meteor shower burns the nearest enemy flyers within 15 tiles: 45 damage per second for 4 s. Flyers only.',
      power: { kind: 'cyclone', cooldown: 15, range: 15, radius: 2.5, dmg: 45, duration: 4, slow: 0, air: true },
      model: { style: 'codex', wall: DEEP, roof: 0xe06a2a, height: 28 },
    },
    {
      id: 'sb_obelisk', name: 'Obelisk of Elements', faction: 'shardbound', cost: 140, hp: 500, armor: 2, buildTime: 8, size: 2,
      desc: 'Aura: allied units within 7 tiles are wrapped in stone, +3 armour.',
      aura: { stat: 'armor', value: 3, radius: 7, target: 'ally' },
      model: { style: 'obelisk', wall: STONE, roof: 0xc0a0f0, height: 30 },
    },
    {
      id: 'sb_guard_tower', name: 'Elemental Guard Tower', faction: 'shardbound', cost: 160, hp: 1300, armor: 6, buildTime: 12, size: 2,
      desc: 'Defensive tower: hurls boulders at air and ground within 8 tiles (normal damage, strong against medium armour).',
      attack: { dmg: 85, attackType: 'normal', range: 8, cooldown: 1.6, targetsAir: true },
      model: { style: 'guardspire', wall: 0x7a7468, roof: SHARD, height: 46 },
    },
    {
      id: 'sb_mana_well', name: 'Mana Well', faction: 'shardbound', cost: 180, hp: 500, armor: 1, buildTime: 10, size: 2,
      desc: 'Draws mana from the deep: your income is increased by 20% (stacks up to +30%).',
      incomeBonus: 0.2,
      model: { style: 'well', wall: DEEP, roof: 0x6ae0d0, height: 16 },
    },
    // ---------------------------------------------------------------- special
    {
      id: 'sb_nexus', name: 'Elemental Nexus', faction: 'shardbound', cost: 400, hp: 2000, armor: 6, buildTime: 20, size: 2, special: true, sapphires: 1,
      desc: 'SPECIAL: costs a sapphire. Binds a Primal Avatar, all four elements in one body: its blows burn around the target. Upgrades twice.',
      spawn: { unit: 'sb_avatar', count: 1, interval: 45 },
      upgrades: ['sb_nexus_2'],
      model: { style: 'nexus', wall: DEEP, roof: SHARD, height: 56 },
    },
    {
      id: 'sb_nexus_2', name: 'Resonant Nexus', faction: 'shardbound', cost: 350, hp: 2600, armor: 7, buildTime: 15, size: 2, special: true, upgradeOnly: true,
      desc: 'Binds an Ascended Avatar more often.',
      spawn: { unit: 'sb_avatar_2', count: 1, interval: 40 },
      upgrades: ['sb_nexus_3'],
      model: { style: 'nexus', wall: DEEP, roof: 0xb08af0, height: 62 },
    },
    {
      id: 'sb_nexus_3', name: 'Heart of the Elements', faction: 'shardbound', cost: 500, hp: 3400, armor: 8, buildTime: 15, size: 2, special: true, upgradeOnly: true,
      desc: 'Binds the Elemental Paragon: a walking storm whose every 3rd blow calls lightning.',
      spawn: { unit: 'sb_avatar_3', count: 1, interval: 35 },
      model: { style: 'nexus', wall: 0x3a2a6a, roof: 0xd0b0ff, height: 68 },
    },
  ],
  units: [
    // water: melee, missile-resistant
    { id: 'sb_rill', name: 'Rill Spirit', hp: 240, armor: 1, armorType: 'medium', dmg: 22, attackType: 'normal', range: 0.4, cooldown: 1.5, speed: 2.7, radius: 0.32, bounty: 4,
      rangedResist: 0.3,
      model: { shape: 'water', body: 0x4a9ad0, accent: 0xd0f0ff, scale: 0.95 } },
    { id: 'sb_tide', name: 'Tide Spirit', hp: 480, armor: 3, armorType: 'medium', dmg: 38, attackType: 'normal', range: 0.4, cooldown: 1.6, speed: 2.7, radius: 0.36, bounty: 7,
      rangedResist: 0.4,
      model: { shape: 'water', body: 0x3a7ac8, accent: 0xe0f8ff, scale: 1.1 } },
    { id: 'sb_deep', name: 'Deepwater Spirit', hp: 1300, armor: 6, armorType: 'medium', dmg: 72, attackType: 'normal', range: 0.5, cooldown: 1.6, speed: 2.7, radius: 0.4, bounty: 20,
      rangedResist: 0.5, evade: 5,
      model: { shape: 'water', body: 0x2a5ab8, accent: 0x9ae8ff, scale: 1.25, variant: 'deep' } },
    // wind: flying anti-air
    { id: 'sb_breeze', name: 'Breeze Wisp', hp: 250, armor: 2, armorType: 'medium', dmg: 24, attackType: 'pierce', range: 4, cooldown: 1.5, speed: 3.0, radius: 0.32, bounty: 3,
      air: true, targetsAir: true, airOnly: true,
      model: { shape: 'wisp', body: 0xb0d8f0, accent: 0xffffff, scale: 0.9 } },
    { id: 'sb_gust', name: 'Gust Elemental', hp: 400, armor: 4, armorType: 'medium', dmg: 36, attackType: 'pierce', range: 4.5, cooldown: 1.5, speed: 3.0, radius: 0.38, bounty: 7,
      air: true, targetsAir: true, airOnly: true, poison: { dps: 0, duration: 3, slow: 0.2 },
      model: { shape: 'wisp', body: 0x90c0e8, accent: 0xf0ffff, scale: 1.15 } },
    { id: 'sb_zephyr', name: 'Zephyr Lord', hp: 1200, armor: 7, armorType: 'medium', dmg: 50, attackType: 'pierce', range: 4.5, cooldown: 1.5, speed: 3.0, radius: 0.45, bounty: 18,
      air: true, targetsAir: true, airOnly: true, splash: 1, poison: { dps: 0, duration: 3, slow: 0.35 },
      model: { shape: 'wisp', body: 0xd0e8ff, accent: SHARD, scale: 1.4, variant: 'lord' } },
    // fire: ranged magic, heavy armour
    { id: 'sb_ember', name: 'Ember Elemental', hp: 440, armor: 4, armorType: 'heavy', dmg: 25, attackType: 'magic', range: 4, cooldown: 1.4, speed: 2.6, radius: 0.34, bounty: 5,
      model: { shape: 'flame', body: 0xd0603a, accent: 0xffd080, scale: 1 } },
    { id: 'sb_blaze', name: 'Blaze Elemental', hp: 640, armor: 6, armorType: 'heavy', dmg: 40, attackType: 'magic', range: 4.5, cooldown: 1.5, speed: 2.6, radius: 0.38, bounty: 10,
      slam: { every: 5, dmg: 60, radius: 1.3 }, onDeath: { unit: 'sb_cinder', count: 2 },
      model: { shape: 'flame', body: 0xe0402a, accent: 0xffe060, scale: 1.15, variant: 'blaze' } },
    { id: 'sb_cinder', name: 'Cinder', hp: 150, armor: 1, armorType: 'light', dmg: 12, attackType: 'magic', range: 3, cooldown: 1.3, speed: 2.8, radius: 0.26, bounty: 1,
      model: { shape: 'flame', body: 0xff7a3a, accent: 0xffe0a0, scale: 0.65, variant: 'cinder' } },
    { id: 'sb_master', name: 'Master of Elements', hp: 1300, armor: 7, armorType: 'medium', dmg: 76, attackType: 'magic', range: 5.5, cooldown: 1.7, speed: 2.7, radius: 0.4, bounty: 22, targetsAir: true,
      storm: { every: 4, dmg: 60, jumps: 4 }, aura: { stat: 'dmg', value: 0.15, radius: 6, target: 'ally' },
      model: { shape: 'elementalist', body: DEEP, accent: SHARD, scale: 1.3 } },
    // lightning: chain casters with a crackling shield
    { id: 'sb_spark', name: 'Spark Elemental', hp: 300, armor: 2, armorType: 'light', dmg: 26, attackType: 'magic', range: 3.5, cooldown: 1.7, speed: 2.6, radius: 0.32, bounty: 6, targetsAir: true,
      chain: 3, thorns: 0.15,
      model: { shape: 'spark', body: 0x7ab0ff, accent: 0xffffff, scale: 1.15 } },
    { id: 'sb_thunder', name: 'Thunder Elemental', hp: 600, armor: 6, armorType: 'heavy', dmg: 42, attackType: 'magic', range: 4, cooldown: 2.0, speed: 2.6, radius: 0.38, bounty: 10, targetsAir: true,
      chain: 5, thorns: 0.3,
      model: { shape: 'spark', body: 0xa0d0ff, accent: 0x4a6ad0, scale: 1.35, variant: 'thunder' } },
    // earth: melee siege
    { id: 'sb_stone', name: 'Stone Elemental', hp: 360, armor: 4, armorType: 'heavy', dmg: 44, attackType: 'siege', range: 0.5, cooldown: 1.7, speed: 2.4, radius: 0.42, bounty: 6,
      slam: { every: 5, dmg: 45, radius: 1.2 },
      model: { shape: 'rock', body: 0x8a7a5a, accent: 0xc0a0f0, scale: 1.25 } },
    { id: 'sb_mountain', name: 'Mountain Elemental', hp: 740, armor: 7, armorType: 'heavy', dmg: 76, attackType: 'siege', range: 0.6, cooldown: 1.8, speed: 2.4, radius: 0.52, bounty: 13,
      slam: { every: 4, dmg: 85, radius: 1.5 },
      model: { shape: 'rock', body: 0x6a5a3a, accent: 0xb090f0, scale: 1.55, variant: 'mountain' } },
    // champions
    { id: 'sb_avatar', name: 'Primal Avatar', hp: 2500, armor: 6, armorType: 'heavy', dmg: 64, attackType: 'magic', range: 0.6, cooldown: 1.5, speed: 2.7, radius: 0.62, bounty: 40, splash: 1.3,
      model: { shape: 'avatar', body: DEEP, accent: 0xff9a4a, scale: 1.7 } },
    { id: 'sb_avatar_2', name: 'Ascended Avatar', hp: 3600, armor: 7, armorType: 'heavy', dmg: 90, attackType: 'magic', range: 0.6, cooldown: 1.45, speed: 2.8, radius: 0.68, bounty: 55, splash: 1.5,
      model: { shape: 'avatar', body: 0x5a4a9a, accent: 0x7ae0ff, scale: 1.85, variant: 'ascended' } },
    { id: 'sb_avatar_3', name: 'Elemental Paragon', hp: 4500, armor: 8, armorType: 'heavy', dmg: 112, attackType: 'magic', range: 1.2, cooldown: 1.4, speed: 2.9, radius: 0.78, bounty: 80, splash: 1.7,
      storm: { every: 3, dmg: 90, jumps: 4 },
      model: { shape: 'avatar', body: 0x3a2a6a, accent: 0xd0b0ff, scale: 2.0, variant: 'paragon' } },
  ],
};
