import type { FactionDef } from '../types';

const CORAL = 0xff7a6a;
const SEA = 0x2a8ab0;
const SAND = 0xd8c8a0;
const KELP = 0x3a8a6a;

/**
 * Tidecall Dominion: the serpent folk of the deep and their murloc thralls. Tree and stat ratios
 * follow the classic "naga" castle-fight race (murlocs in pairs, swamp spitters → the ancient
 * hydra, naga guardians → royal guards, sirens with lobster summons, dragon turtles, winged
 * serpents, the coral statue, the ancient pyramid's earthquake, the oracle that takes control of
 * enemies and the tidal guardian's tsunami), re-themed with the Dominion's own names and look.
 * Like the map's race: strong regeneration, many special buildings, no tower.
 */
export const TIDECALL: FactionDef = {
  id: 'tidecall',
  name: 'Tidecall Dominion',
  desc: "Serpent folk of the deep and their murloc thralls: regenerating murlocs, cleaving naga, hydras that split, turtles, sirens, earthquakes, mind control and tsunamis, but no tower.",
  color: 0xff7a6a,
  traits: [
    "Regeneration: murlocs heal 3\u20134 HP/s, hydras 5\u201310 HP/s",
    "Cleaving naga guardians and royal guards; murloc champions and assassins crit, bash and evade",
    "Sirens call lobsters; the Oracle of Sirens takes control of an enemy unit",
    "The deep: the pyramid shakes the earth (50% slow), the Tidal Guardian sends tsunamis",
    "No tower: the Dominion defends with its army and its special buildings",
  ],
  build: [
    'tc_naga_spring', 'tc_tidal_guardian', 'tc_oracle', 'tc_swamp_well', 'tc_reptile_pool', 'tc_pyramid', 'tc_coral_statue', 'tc_murloc_camp', 'treasure_box', 'tc_snake_temple', 'tc_spawning_grounds',
  ],
  buildings: [
    {
      id: 'tc_murloc_camp', name: 'Murloc Camp', faction: 'tidecall', cost: 170, hp: 1300, armor: 5, buildTime: 2, size: 2,
      desc: "Trains Murloc Warriors: cheap, regenerating, a 10% critical strike. Upgrades into Murloc Village.",
      spawn: { unit: 'tc_murloc', count: 1, interval: 23 },
      upgrades: ['tc_murloc_village'],
      model: { style: 'murloccamp', wall: KELP, roof: SAND, height: 16 },
    },
    {
      id: 'tc_murloc_village', name: 'Murloc Village', faction: 'tidecall', cost: 180, hp: 1500, armor: 5, buildTime: 2, size: 2, upgradeOnly: true,
      desc: "Trains Murloc Champions: cleaving blows, bash, evasion and critical strikes. Upgrades into Murloc Fortress.",
      spawn: { unit: 'tc_murloc_champion', count: 1, interval: 32 },
      upgrades: ['tc_murloc_fortress'],
      model: { style: 'murloccamp', wall: 0x2a7a5a, roof: 0xe8d8b0, height: 20 },
    },
    {
      id: 'tc_murloc_fortress', name: 'Murloc Fortress', faction: 'tidecall', cost: 190, hp: 1700, armor: 5, buildTime: 2, size: 2, upgradeOnly: true,
      desc: "Trains Murloc Assassins: cleave, bash, 20% critical strikes, 15% evasion.",
      spawn: { unit: 'tc_murloc_assassin', count: 1, interval: 42 },
      model: { style: 'murloccamp', wall: 0x1a5a4a, roof: CORAL, height: 24 },
    },
    {
      id: 'tc_swamp_well', name: 'Swamp Well', faction: 'tidecall', cost: 175, hp: 1200, armor: 5, buildTime: 2, size: 2,
      desc: "Trains Swamp Spitters: ranged poison that slows attack and movement by 35%. Upgrades into the Lernaean Fountain (legendary).",
      spawn: { unit: 'tc_spitter', count: 1, interval: 23 },
      upgrades: ['tc_lernaean'],
      model: { style: 'swampwell', wall: 0x5a6a4a, roof: 0x6ac080, height: 18 },
    },
    {
      id: 'tc_lernaean', name: 'Lernaean Fountain', faction: 'tidecall', cost: 725, lumber: 1000, hp: 2100, armor: 5, buildTime: 2, size: 2, upgradeOnly: true, special: true, sapphires: 1,
      desc: "LEGENDARY: needs a sapphire. Trains the Ancient Hydra: chaos splash, poison, 70% spell resistance, immune; it splits into two Hydras, each of which splits into two Lesser Hydras.",
      spawn: { unit: 'tc_hydra', count: 1, interval: 60 },
      lumberGain: 0,
      model: { style: 'swampwell', wall: 0x3a5a4a, roof: 0x3ae0a0, height: 26 },
    },
    {
      id: 'tc_spawning_grounds', name: 'Spawning Grounds', faction: 'tidecall', cost: 250, hp: 1300, armor: 5, buildTime: 2, size: 2,
      desc: "Trains Naga Guardians: cleaving tridents. Upgrades into Royal Spawning Grounds.",
      spawn: { unit: 'tc_guardian', count: 1, interval: 27 },
      upgrades: ['tc_royal_grounds'],
      model: { style: 'spawningpool', wall: SAND, roof: SEA, height: 20 },
    },
    {
      id: 'tc_royal_grounds', name: 'Royal Spawning Grounds', faction: 'tidecall', cost: 200, hp: 1500, armor: 5, buildTime: 2, size: 2, upgradeOnly: true,
      desc: "Trains Naga Royal Guards: wide cleaves and critical strikes.",
      spawn: { unit: 'tc_royal_guard', count: 1, interval: 37 },
      model: { style: 'spawningpool', wall: 0xe8d8b0, roof: 0x1a6ad0, height: 24 },
    },
    {
      id: 'tc_naga_spring', name: 'Naga Spring', faction: 'tidecall', cost: 350, hp: 1400, armor: 5, buildTime: 2, size: 2,
      desc: "Trains Naga Sirens: chaos bolts; every 60 s a siren calls two Lobsters for 45 s.",
      spawn: { unit: 'tc_siren', count: 1, interval: 32 },
      model: { style: 'nagaspring', wall: SAND, roof: CORAL, height: 28 },
    },
    {
      id: 'tc_reptile_pool', name: 'Reptile Pool', faction: 'tidecall', cost: 280, hp: 1300, armor: 5, buildTime: 2, size: 2,
      desc: "Trains Dragon Turtles: ranged siege that also hits flyers, bash, and a shell that reflects 60% of melee damage.",
      spawn: { unit: 'tc_dragon_turtle', count: 1, interval: 29 },
      incomeRate: 0.018, lumberGain: 0.75,
      model: { style: 'reptilepool', wall: 0x6a6a5a, roof: KELP, height: 16 },
    },
    {
      id: 'tc_snake_temple', name: 'Temple of Snakes', faction: 'tidecall', cost: 230, hp: 1300, armor: 5, buildTime: 2, size: 2,
      desc: "Trains Winged Serpents: flyers whose magic bolts bounce between three enemies.",
      spawn: { unit: 'tc_winged_serpent', count: 1, interval: 26 },
      model: { style: 'snaketemple', wall: SAND, roof: 0x3ac0a0, height: 30 },
    },
    {
      id: 'tc_coral_statue', name: 'Coral Statue', faction: 'tidecall', cost: 250, lumber: 480, hp: 1000, armor: 5, buildTime: 2, size: 2,
      desc: "Restore area: nearby allied units regenerate 7.5 HP/s, nearby buildings 2.5 HP/s.",
      aura: { stat: 'regen', value: 7.5, radius: 7, target: 'ally' },
      mend: { hps: 2.5, radius: 7 },
      incomeRate: 0.018, lumberGain: 0,
      model: { style: 'coralstatue', wall: SAND, roof: CORAL, height: 30 },
    },
    {
      id: 'tc_pyramid', name: 'Ancient Pyramid', faction: 'tidecall', cost: 360, lumber: 600, hp: 1000, armor: 5, buildTime: 2, size: 2,
      desc: "Earthquake: every 10 s the earth splits under the nearest enemy anywhere on the map: 40 spell damage and a 50% slow for 10 s.",
      power: { kind: 'cyclone', global: true, cooldown: 10, range: 14, radius: 3, dmg: 4, duration: 10, slow: 0.5 },
      incomeRate: 0.018, lumberGain: 0,
      model: { style: 'pyramid', wall: SAND, roof: SEA, height: 32 },
    },
    {
      id: 'tc_oracle', name: 'Oracle of Sirens', faction: 'tidecall', cost: 310, lumber: 625, hp: 800, armor: 5, buildTime: 2, size: 2,
      desc: "Control enemy: every 16 s the nearest enemy unit anywhere on the map joins your side (not immune legendaries or summons).",
      power: { kind: 'charm', global: true, cooldown: 16, range: 13, radius: 0, dmg: 100000 },
      incomeRate: 0.018, lumberGain: 0,
      model: { style: 'oracle', wall: SAND, roof: 0xff9ad0, height: 34 },
    },
    {
      id: 'tc_tidal_guardian', name: 'Tidal Guardian', faction: 'tidecall', cost: 750, lumber: 1500, hp: 900, armor: 5, buildTime: 2, size: 2, special: true, sapphires: 1,
      desc: "LEGENDARY: needs a sapphire. Tsunami: every 15 s a huge wave rolls towards the enemy, 270 damage to every ground unit in its way.",
      power: { kind: 'wave', cooldown: 15, range: 20, radius: 1.6, dmg: 270 },
      incomeRate: 0.009, lumberGain: 0,
      model: { style: 'tidalguardian', wall: SAND, roof: SEA, height: 48 },
    },
  ],
  units: [
    { id: 'tc_murloc', name: 'Murloc Warrior', hp: 325, armor: 4, armorType: 'unarmored', dmg: 30, attackType: 'normal', range: 0.4, cooldown: 1.25, speed: 2.8, radius: 0.3, bounty: 4,
      regen: 3.25, crit: { chance: 0.1, mult: 2 },
      model: { shape: 'murloc', body: 0x4a9a7a, accent: CORAL, scale: 0.95 } },
    { id: 'tc_murloc_champion', name: 'Murloc Champion', hp: 520, armor: 6, armorType: 'unarmored', dmg: 45, attackType: 'normal', range: 0.5, cooldown: 1.25, speed: 2.8, radius: 0.33, bounty: 7,
      regen: 3.5, cleave: { pct: 0.25, radius: 1.75 }, evade: 0.08, bash: { chance: 0.15, stun: 2, dmg: 25 }, crit: { chance: 0.1, mult: 2 },
      model: { shape: 'murloc', body: 0x3a8a8a, accent: SAND, scale: 1.08, variant: 'champion' } },
    { id: 'tc_murloc_assassin', name: 'Murloc Assassin', hp: 750, armor: 8, armorType: 'unarmored', dmg: 62.5, attackType: 'normal', range: 0.5, cooldown: 1.25, speed: 2.8, radius: 0.36, bounty: 10,
      regen: 3.75, cleave: { pct: 0.3, radius: 2 }, evade: 0.15, bash: { chance: 0.15, stun: 2, dmg: 25 }, crit: { chance: 0.2, mult: 2 },
      model: { shape: 'murloc', body: 0x2a5a6a, accent: 0xb02a4a, scale: 1.18, variant: 'assassin' } },
    { id: 'tc_spitter', name: 'Swamp Spitter', hp: 380, armor: 3, armorType: 'medium', dmg: 38, attackType: 'normal', range: 3.25, cooldown: 1.4, speed: 2.8, radius: 0.36, bounty: 6, targetsAir: true,
      poison: { dps: 4, duration: 2, slow: 0.35 },
      model: { shape: 'spitter', body: 0x5a8a4a, accent: 0x9ae060, scale: 1.05 } },
    { id: 'tc_hydra', name: 'Ancient Hydra', hp: 1750, armor: 9, armorType: 'medium', dmg: 200, attackType: 'chaos', range: 5, cooldown: 1.5, speed: 3.5, radius: 0.6, bounty: 28, targetsAir: true,
      splash: 2.5, magicResist: 0.7, immune: true, poison: { dps: 4, duration: 2, slow: 0.35 }, onDeath: { unit: 'tc_hydra_head', count: 2 },
      model: { shape: 'hydra', body: 0x2a7a5a, accent: 0x6ae0a0, scale: 1.55 } },
    { id: 'tc_hydra_head', name: 'Hydra Head', hp: 750, armor: 6, armorType: 'medium', dmg: 100, attackType: 'chaos', range: 5, cooldown: 1.5, speed: 3.5, radius: 0.4, bounty: 5, targetsAir: true,
      regen: 10, splash: 1.5, poison: { dps: 4, duration: 2, slow: 0.35 }, onDeath: { unit: 'tc_lesser_hydra', count: 2 },
      model: { shape: 'hydra', body: 0x3a8a6a, accent: 0x6ae0a0, scale: 0.95, variant: 'head' } },
    { id: 'tc_lesser_hydra', name: 'Lesser Hydra', hp: 350, armor: 3, armorType: 'medium', dmg: 50, attackType: 'chaos', range: 5, cooldown: 1.5, speed: 3.5, radius: 0.32, bounty: 2, targetsAir: true,
      regen: 5, splash: 1.5, poison: { dps: 2, duration: 2, slow: 0.25 },
      model: { shape: 'hydra', body: 0x4a9a5a, accent: 0xb0e080, scale: 0.6, variant: 'head' } },
    { id: 'tc_guardian', name: 'Naga Guardian', hp: 625, armor: 6, armorType: 'heavy', dmg: 72.5, attackType: 'pierce', range: 0.6, cooldown: 1.4, speed: 2.8, radius: 0.42, bounty: 8,
      cleave: { pct: 0.35, radius: 2.3 },
      model: { shape: 'naga', body: 0x3a8a8a, accent: SEA, scale: 1.12 } },
    { id: 'tc_royal_guard', name: 'Naga Royal Guard', hp: 1100, armor: 9, armorType: 'heavy', dmg: 110, attackType: 'pierce', range: 0.7, cooldown: 1.4, speed: 2.8, radius: 0.46, bounty: 14,
      crit: { chance: 0.1, mult: 2 }, cleave: { pct: 0.25, radius: 2.6 },
      model: { shape: 'naga', body: 0x2a6a7a, accent: 0xe0c040, scale: 1.3, variant: 'royal' } },
    { id: 'tc_siren', name: 'Naga Siren', hp: 550, armor: 3, armorType: 'unarmored', dmg: 80, attackType: 'chaos', range: 4, cooldown: 1.6, speed: 2.9, radius: 0.36, bounty: 11, targetsAir: true,
      regen: 2, summon: { unit: 'tc_lobster', count: 2, every: 60, ttl: 45 },
      model: { shape: 'naga', body: 0x4aa0a0, accent: CORAL, scale: 1.05, variant: 'siren' } },
    { id: 'tc_lobster', name: 'Lobster', hp: 360, armor: 2, armorType: 'heavy', dmg: 42.5, attackType: 'normal', range: 0.4, cooldown: 1.4, speed: 3, radius: 0.32, bounty: 3,
      crit: { chance: 0.1, mult: 3 }, block: 17.5,
      model: { shape: 'lobster', body: 0xd04a2a, accent: SAND, scale: 0.95 } },
    { id: 'tc_dragon_turtle', name: 'Dragon Turtle', hp: 650, armor: 8, armorType: 'heavy', dmg: 95, attackType: 'siege', range: 5.5, cooldown: 1.76, speed: 2.3, radius: 0.55, bounty: 9, targetsAir: true,
      bash: { chance: 0.15, stun: 2, dmg: 25 }, thorns: 0.6,
      model: { shape: 'dragonturtle', body: 0x4a7a5a, accent: 0xb0a060, scale: 1.25 } },
    { id: 'tc_winged_serpent', name: 'Winged Serpent', hp: 450, armor: 2, armorType: 'light', dmg: 50, attackType: 'magic', range: 4.2, cooldown: 1.5, speed: 3.3, radius: 0.38, bounty: 7, air: true, targetsAir: true,
      chain: 3,
      model: { shape: 'wingedserpent', body: 0x3ac0a0, accent: CORAL, scale: 1.15 } },
  ],
};
