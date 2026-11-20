import type { FactionDef } from '../types';

const BARK = 0x6b4a2e;
const LEAF = 0x4f9a3a;
const MOSS = 0x7cb85a;

/**
 * Thornwild: the swarm. Tree and stat ratios follow the classic "nature" castle-fight race
 * (paired spider broods that split, dryads and grove keepers who call treants, furbolg-style
 * shamans, bears, a stone giant with hardened skin, a dragon, an ancient protector and a gale
 * ancient), re-themed and with Thornwild's own vines, thorns, poison and stags.
 *
 * Ids are kept when a role was reworked, so saved matches still load: `tw_ram_pen` / `tw_boulder_ram`
 * are the Standing Stones / Stonehide Giant, `tw_sylvan_sniper` is the Grove Keeper.
 */
export const THORNWILD: FactionDef = {
  id: 'thornwild',
  name: 'Thornwild Circle',
  desc: "The wild forest: poisonous spiders that split when they die, furbolg shamans, dryads and keepers of the grove with their treants, slumbering bears, emerald dragons, mountain giants, the Ancient of Gale, the Ancient Guardian and the Ancient of Wonders.",
  color: 0x4f9a3a,
  traits: [
    "Spiders poison and slow, web their prey, and split into smaller spiders when they die",
    "Furbolgs, dryads and keepers heal; keepers summon treants that return melee damage",
    "Bears cleave, bash and crit; mountain giants shrug off 25 damage from every hit",
    "The Ancient of Gale sends tornadoes and the Ancient Guardian banishes enemies, anywhere on the map",
    "Legendaries: the Ancient Keeper and the Ancient of Wonders (forest spirits that stun and explode)",
  ],
  build: [
    'tw_burrow', 'tw_shaman_hut', 'tw_thorn_grove', 'tw_stag_den', 'tw_wyrm_roost', 'tw_ram_pen', 'tw_strangle_root', 'tw_howling_hollow', 'tw_mossheart', 'tw_amber_shrine', 'treasure_box',
  ],
  buildings: [
    {
      id: 'tw_burrow', name: 'Spider Clutch', faction: 'thornwild', cost: 170, hp: 1300, armor: 5, buildTime: 2, size: 2,
      desc: "Black Spiders: fast biters whose slow poison deals 5 per second for 10 s. Upgrades into the Spider Nest.",
      spawn: { unit: 'tw_spider', count: 1, interval: 23 },
      upgrades: ['tw_briar_burrow'],
      model: { style: 'mound', wall: BARK, roof: LEAF, height: 14 },
    },
    {
      id: 'tw_briar_burrow', name: 'Spider Nest', faction: 'thornwild', cost: 200, hp: 1400, armor: 5, buildTime: 2, size: 2, upgradeOnly: true,
      desc: "Giant Spiders: stronger poison, webs that hold enemies in place, and 2 Forest Spiders hatch when they die. Upgrades into the Brood Hatchery.",
      spawn: { unit: 'tw_giant_spider', count: 1, interval: 33 },
      upgrades: ['tw_gnasher_warren'],
      model: { style: 'mound', wall: BARK, roof: 0x3a6a2a, height: 18 },
    },
    {
      id: 'tw_gnasher_warren', name: 'Brood Hatchery', faction: 'thornwild', cost: 210, hp: 1700, armor: 5, buildTime: 2, size: 2, upgradeOnly: true,
      desc: "Brood Mothers: heavy poison (25% slow), long webs, and a Giant Spider bursts out when they die.",
      spawn: { unit: 'tw_brood_mother', count: 1, interval: 44 },
      model: { style: 'mound', wall: 0x5a3a24, roof: 0x8a6a3a, height: 18 },
    },
    {
      id: 'tw_shaman_hut', name: 'Furbolg Hut', faction: 'thornwild', cost: 200, hp: 1200, armor: 5, buildTime: 2, size: 2,
      desc: "Furbolg Shamans: magic bolts and a rejuvenation that heals an ally for 200. Upgrades into the Furbolg Abode.",
      spawn: { unit: 'tw_storm_shaman', count: 1, interval: 25 },
      upgrades: ['tw_storm_lodge'],
      model: { style: 'hut', wall: 0x8a6a4a, roof: 0x5a8ab0, height: 22 },
    },
    {
      id: 'tw_storm_lodge', name: 'Furbolg Abode', faction: 'thornwild', cost: 200, hp: 1400, armor: 5, buildTime: 2, size: 2, upgradeOnly: true,
      desc: "Furbolg Elder Shamans: stronger bolts and a rejuvenation for 400.",
      spawn: { unit: 'tw_stormcaller', count: 1, interval: 35 },
      model: { style: 'hut', wall: 0x8a6a4a, roof: 0x3a6ad0, height: 28 },
    },
    {
      id: 'tw_thorn_grove', name: 'Ancient of Growth', faction: 'thornwild', cost: 220, hp: 1300, armor: 5, buildTime: 2, size: 2,
      desc: "Dryads: spear throwers with 15% spell resistance and nature's touch (heals 75). Upgrades into the Ancient of Life.",
      spawn: { unit: 'tw_thorn_archer', count: 1, interval: 26 },
      upgrades: ['tw_elder_grove'],
      model: { style: 'tree', wall: BARK, roof: LEAF, height: 34 },
    },
    {
      id: 'tw_elder_grove', name: 'Ancient of Life', faction: 'thornwild', cost: 220, hp: 1600, armor: 5, buildTime: 2, size: 2, upgradeOnly: true,
      desc: "Keepers of the Grove: rapid spears, heals, and 2 Treants every 25 s. Upgrades into the Ancient of Eternity (legendary).",
      spawn: { unit: 'tw_sylvan_sniper', count: 1, interval: 37 },
      upgrades: ['tw_elder_heartwood'],
      model: { style: 'tree', wall: BARK, roof: 0x2e7a2a, height: 42 },
    },
    {
      id: 'tw_elder_heartwood', name: 'Ancient of Eternity', faction: 'thornwild', cost: 400, lumber: 400, hp: 2000, armor: 5, buildTime: 2, size: 2, upgradeOnly: true, special: true, sapphires: 1,
      desc: "LEGENDARY: needs a sapphire. The Ancient Keeper: immune, 25% evade, a regeneration aura (+15 HP per second) and 5 Treants every 30 s.",
      spawn: { unit: 'tw_tempest_caller', count: 1, interval: 57 },
      lumberGain: 0,
      model: { style: 'tree', wall: 0x5a3a20, roof: 0x2a6a2a, height: 56 },
    },
    {
      id: 'tw_stag_den', name: 'Ancient of Slumber', faction: 'thornwild', cost: 260, hp: 1300, armor: 5, buildTime: 2, size: 2,
      desc: "Bears: cleaving swipes, 15% bash and 20% critical strikes. Upgrades into the Ancient of Hibernation.",
      spawn: { unit: 'tw_gnasher', count: 1, interval: 28 },
      upgrades: ['tw_great_stag_den'],
      model: { style: 'stable', wall: BARK, roof: MOSS, height: 18 },
    },
    {
      id: 'tw_great_stag_den', name: 'Ancient of Hibernation', faction: 'thornwild', cost: 220, hp: 1500, armor: 5, buildTime: 2, size: 2, upgradeOnly: true,
      desc: "Ancient Bears: wider cleaves, 30% bash and 30% critical strikes.",
      spawn: { unit: 'tw_ancient_bear', count: 1, interval: 39 },
      model: { style: 'stable', wall: BARK, roof: 0x3a8a3a, height: 22 },
    },
    {
      id: 'tw_wyrm_roost', name: 'Emerald Dragon Roost', faction: 'thornwild', cost: 310, hp: 1400, armor: 5, buildTime: 2, size: 2,
      desc: "Emerald Dragons: flying chaos breath with splash that corrodes armour (up to \u22126).",
      spawn: { unit: 'tw_jade_wyrm', count: 1, interval: 30 },
      model: { style: 'nest', wall: 0x4a5a3a, roof: 0x3aa070, height: 34 },
    },
    {
      id: 'tw_ram_pen', name: 'Monolith', faction: 'thornwild', cost: 440, hp: 1600, armor: 5, buildTime: 2, size: 2,
      desc: "Mountain Giants: fortified skin that blocks 25 of every hit, and a 30% chance to pulverize for 200.",
      spawn: { unit: 'tw_boulder_ram', count: 1, interval: 37 },
      model: { style: 'shrine', wall: 0x8a8a7a, roof: 0x5a6a4a, height: 22 },
    },
    {
      id: 'tw_strangle_root', name: 'Ancient Protector', faction: 'thornwild', cost: 210, lumber: 300, hp: 1600, armor: 8, buildTime: 20, size: 2,
      desc: "Base defence: hurls boulders that splash (siege, 70 damage per second).",
      attack: { dmg: 105, attackType: 'siege', range: 7, cooldown: 1.5, targetsAir: true, splash: 1.75 },
      incomeRate: 0.008, lumberGain: 0,
      model: { style: 'tree', wall: 0x4a3020, roof: 0x5a3a5a, height: 26 },
    },
    {
      id: 'tw_howling_hollow', name: 'Ancient of Gale', faction: 'thornwild', cost: 350, lumber: 650, hp: 900, armor: 5, buildTime: 2, size: 2,
      desc: "Cyclone: every 14 s a tornado wanders over the nearest enemy army anywhere on the map: 40 per second and a 25% slow for 7 s.",
      power: { kind: 'cyclone', global: true, cooldown: 14, range: 14, radius: 2.5, dmg: 40, duration: 7, slow: 0.25 },
      incomeRate: 0.012, lumberGain: 0,
      model: { style: 'tree', wall: 0x5a6a4a, roof: 0x8ac8a0, height: 30 },
    },
    {
      id: 'tw_mossheart', name: 'Ancient Guardian', faction: 'thornwild', cost: 250, lumber: 500, hp: 1000, armor: 5, buildTime: 2, size: 2,
      desc: "Banish: every 12 s a random enemy unit anywhere on the map turns ethereal for 12 s: it can't attack and takes 66% more magic damage.",
      power: { kind: 'banish', global: true, cooldown: 12, range: 14, radius: 0, dmg: 0, duration: 12 },
      incomeRate: 0.009, lumberGain: 0,
      model: { style: 'shrine', wall: 0x5a6a4a, roof: MOSS, height: 18 },
    },
    {
      id: 'tw_amber_shrine', name: 'Ancient of Wonders', faction: 'thornwild', cost: 650, lumber: 1800, hp: 1500, armor: 5, buildTime: 2, size: 2, special: true, sapphires: 1,
      desc: "LEGENDARY: needs a sapphire. Call of nature: every 40 s four forest spirits appear; their touch stuns (50%) and they explode for 200 when they die.",
      spawn: { unit: 'tw_wisp', count: 4, interval: 40, ttl: 40 },
      incomeRate: 0.012, lumberGain: 0,
      model: { style: 'shrine', wall: 0x8a6a3a, roof: 0xe0a030, height: 20 },
    },
  ],
  units: [
    { id: 'tw_spider', name: 'Black Spider', hp: 250, armor: 1, armorType: 'unarmored', dmg: 30.5, attackType: 'pierce', range: 0.5, cooldown: 1, speed: 3.3, radius: 0.3, bounty: 2,
      regen: 1.5, poison: { dps: 5, duration: 10, slow: 0.1 },
      model: { shape: 'spider', body: 0x2a2228, accent: 0xb03a3a, scale: 0.9 } },
    { id: 'tw_giant_spider', name: 'Giant Spider', hp: 500, armor: 4, armorType: 'unarmored', dmg: 70, attackType: 'pierce', range: 0.5, cooldown: 1.3, speed: 3.3, radius: 0.38, bounty: 6,
      regen: 3, poison: { dps: 8, duration: 10, slow: 0.15 }, bash: { chance: 0.07, stun: 10 }, onDeath: { unit: 'tw_forest_spider', count: 2 },
      model: { shape: 'spider', body: 0x3a3a2a, accent: 0x9ac040, scale: 1, variant: 'giant' } },
    { id: 'tw_brood_mother', name: 'Brood Mother', hp: 800, armor: 6, armorType: 'unarmored', dmg: 100, attackType: 'pierce', range: 0.5, cooldown: 1.5, speed: 3.3, radius: 0.46, bounty: 10,
      regen: 5, poison: { dps: 12, duration: 10, slow: 0.25 }, bash: { chance: 0.08, stun: 12 }, onDeath: { unit: 'tw_giant_spider', count: 1 },
      model: { shape: 'spider', body: 0x2a3a2a, accent: 0xd0e070, scale: 1.05, variant: 'brood' } },
    { id: 'tw_forest_spider', name: 'Forest Spider', hp: 150, armor: 0, armorType: 'unarmored', dmg: 11, attackType: 'pierce', range: 0.5, cooldown: 0.75, speed: 3.3, radius: 0.26, bounty: 1,
      regen: 1,
      model: { shape: 'spider', body: 0x5a4a32, accent: 0x8a6a3a, scale: 0.75 } },
    { id: 'tw_storm_shaman', name: 'Furbolg Shaman', hp: 450, armor: 1, armorType: 'light', dmg: 52.5, attackType: 'magic', range: 4, cooldown: 1.4, speed: 2.8, radius: 0.32, bounty: 7, targetsAir: true,
      regen: 1, heal: { amount: 200, range: 4, cooldown: 16 },
      model: { shape: 'furbolg', body: 0x7a5a3a, accent: 0x7ad070, scale: 1 } },
    { id: 'tw_stormcaller', name: 'Furbolg Elder', hp: 650, armor: 3, armorType: 'light', dmg: 72.5, attackType: 'magic', range: 4.5, cooldown: 1.4, speed: 2.8, radius: 0.34, bounty: 13, targetsAir: true,
      regen: 2, heal: { amount: 400, range: 4.5, cooldown: 14 },
      model: { shape: 'furbolg', body: 0x9a8a6a, accent: 0xa0e0ff, scale: 1.12, variant: 'elder' } },
    { id: 'tw_thorn_archer', name: 'Dryad', hp: 500, armor: 3, armorType: 'medium', dmg: 60, attackType: 'pierce', range: 4, cooldown: 1.6, speed: 3.1, radius: 0.3, bounty: 8, targetsAir: true,
      regen: 1, magicResist: 0.15, heal: { amount: 75, range: 4, cooldown: 15 },
      model: { shape: 'archer', body: LEAF, accent: BARK, scale: 1 } },
    { id: 'tw_sylvan_sniper', name: 'Keeper of the Grove', hp: 700, armor: 5, armorType: 'medium', dmg: 90, attackType: 'pierce', range: 4.5, cooldown: 1.2, speed: 3, radius: 0.36, bounty: 14, targetsAir: true,
      regen: 1.5, magicResist: 0.2, heal: { amount: 150, range: 4.5, cooldown: 8 }, summon: { unit: 'tw_sapling', count: 2, every: 25, ttl: 40 },
      model: { shape: 'caster', body: 0x2e7a2a, accent: 0xe0d0a0, scale: 1.2 } },
    { id: 'tw_tempest_caller', name: 'Ancient Keeper', hp: 1000, armor: 7, armorType: 'medium', dmg: 145, attackType: 'chaos', range: 5.5, cooldown: 2.1, speed: 2.9, radius: 0.36, bounty: 25, targetsAir: true,
      regen: 5, immune: true, evade: 0.25, aura: { stat: 'regen', value: 15, radius: 3.5, target: 'ally' }, summon: { unit: 'tw_sapling', count: 5, every: 30, ttl: 40 },
      model: { shape: 'caster', body: 0x3a5a2a, accent: 0xd0f0a0, scale: 1.35 } },
    { id: 'tw_gnasher', name: 'Bear', hp: 675, armor: 5, armorType: 'unarmored', dmg: 85, attackType: 'normal', range: 0.4, cooldown: 1.75, speed: 2.7, radius: 0.45, bounty: 9,
      regen: 1, bash: { chance: 0.15, stun: 0.5, dmg: 50 }, cleave: { pct: 0.3, radius: 1.5 }, crit: { chance: 0.2, mult: 2 },
      model: { shape: 'forestbear', body: 0x6a4a2a, accent: 0x5a8a3a, scale: 1 } },
    { id: 'tw_ancient_bear', name: 'Ancient Bear', hp: 1100, armor: 8, armorType: 'unarmored', dmg: 115, attackType: 'normal', range: 0.5, cooldown: 2, speed: 2.7, radius: 0.52, bounty: 15,
      regen: 2, bash: { chance: 0.3, stun: 1, dmg: 65 }, cleave: { pct: 0.35, radius: 1.75 }, crit: { chance: 0.3, mult: 2 },
      model: { shape: 'forestbear', body: 0x4a3420, accent: 0x6ab04a, scale: 1.2, variant: 'ancient' } },
    { id: 'tw_jade_wyrm', name: 'Jade Wyrm', hp: 700, armor: 5, armorType: 'heavy', dmg: 65, attackType: 'chaos', range: 2.5, cooldown: 1.4, speed: 3.3, radius: 0.45, bounty: 10, air: true, targetsAir: true,
      regen: 1.5, splash: 1.5, aura: { stat: 'armor', value: -6, radius: 1.5, target: 'enemy' },
      model: { shape: 'flyer', body: 0x3aa070, accent: 0xd0f0a0, scale: 1.4 } },
    { id: 'tw_boulder_ram', name: 'Stonehide Giant', hp: 800, armor: 8, armorType: 'fortified', dmg: 150, attackType: 'normal', range: 0.6, cooldown: 1.8, speed: 2.5, radius: 0.55, bounty: 16,
      regen: 4, block: 25, slam: { chance: 0.3, dmg: 200, radius: 1.75 },
      model: { shape: 'giant', body: 0x8a8a7a, accent: 0x5a6a4a, scale: 1.35 } },
    { id: 'tw_sapling', name: 'Sapling', hp: 220, armor: 2, armorType: 'medium', dmg: 14, attackType: 'normal', range: 0.4, cooldown: 1.1, speed: 2.8, radius: 0.36, bounty: 3,
      model: { shape: 'giant', body: 0x6a4a2a, accent: 0x8ad05a, scale: 0.85 } },
    { id: 'tw_wisp', name: 'Forest Spirit', hp: 50, armor: 0, armorType: 'light', dmg: 10, attackType: 'spells', range: 0.5, cooldown: 1, speed: 3.5, radius: 0.26, bounty: 1, air: true, targetsAir: true,
      bash: { chance: 0.5, stun: 1.5 }, deathBlast: { dmg: 200, radius: 3.5 },
      model: { shape: 'forestspirit', body: 0xb0f0a0, accent: 0x6ae08a, scale: 1 } },
  ],
};
