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
  desc: 'Serpent folk of the deep and their murloc thralls: high regeneration, hydras, turtles, sirens, earthquakes, mind control and tsunamis, but no tower.',
  color: 0xff7a6a,
  traits: [
    'Tidal blood: every unit regenerates 3 HP per second',
    'Murlocs come in pairs; naga guardians cleave; dragon turtles bash and reflect blows',
    'Sirens call lobsters; the oracle takes control of an enemy unit',
    'The deep: the pyramid shakes the earth (50% slow), the tidal guardian sends tsunamis',
    'No tower: the Dominion defends with its army and its special buildings',
  ],
  trait: { unitRegen: 3 },
  build: [
    'tc_murloc_camp', 'tc_swamp_well', 'tc_spawning_grounds', 'tc_naga_spring',
    'tc_reptile_pool', 'tc_snake_temple', 'tc_coral_statue', 'tc_pyramid',
    'tc_oracle', 'tc_tidal_guardian',
  ],
  buildings: [
    // ---------------------------------------------------------------- murlocs
    {
      id: 'tc_murloc_camp', name: 'Murloc Camp', faction: 'tidecall', cost: 100, hp: 600, armor: 2, buildTime: 8, size: 2,
      desc: 'Murloc Warriors, two at a time. Upgrades into Murloc Village.',
      spawn: { unit: 'tc_murloc', count: 2, interval: 22 },
      upgrades: ['tc_murloc_village'],
      model: { style: 'murloccamp', wall: KELP, roof: SAND, height: 16 },
    },
    {
      id: 'tc_murloc_village', name: 'Murloc Village', faction: 'tidecall', cost: 110, hp: 850, armor: 3, buildTime: 8, size: 2, upgradeOnly: true,
      desc: 'Murloc Champions, two at a time: they cleave, dodge and stun. Upgrades into Murloc Fortress.',
      spawn: { unit: 'tc_murloc_champion', count: 2, interval: 30 },
      upgrades: ['tc_murloc_fortress'],
      model: { style: 'murloccamp', wall: 0x2a7a5a, roof: 0xe8d8b0, height: 20 },
    },
    {
      id: 'tc_murloc_fortress', name: 'Murloc Fortress', faction: 'tidecall', cost: 120, hp: 1100, armor: 4, buildTime: 9, size: 2, upgradeOnly: true,
      desc: 'Murloc Assassins, two at a time: wide cleaves, crits every 5th blow, stuns and evasion.',
      spawn: { unit: 'tc_murloc_assassin', count: 2, interval: 38 },
      model: { style: 'murloccamp', wall: 0x1a5a4a, roof: CORAL, height: 24 },
    },
    // ---------------------------------------------------------------- swamp spitters → hydra
    {
      id: 'tc_swamp_well', name: 'Swamp Well', faction: 'tidecall', cost: 105, hp: 550, armor: 2, buildTime: 8, size: 2,
      desc: 'Swamp Spitters: ranged poison that slows by 35%. Upgrades (with a sapphire) into the Lernaean Fountain.',
      spawn: { unit: 'tc_spitter', count: 1, interval: 21 },
      upgrades: ['tc_lernaean'],
      model: { style: 'swampwell', wall: 0x5a6a4a, roof: 0x6ac080, height: 18 },
    },
    {
      id: 'tc_lernaean', name: 'Lernaean Fountain', faction: 'tidecall', cost: 300, sapphires: 1, hp: 1400, armor: 5, buildTime: 15, size: 2, upgradeOnly: true,
      desc: 'ELITE (costs a sapphire): the Ancient Hydra: chaos breath that splashes and poisons, it shrugs off magic, and when it falls two Hydra Heads keep fighting.',
      spawn: { unit: 'tc_hydra', count: 1, interval: 45 },
      model: { style: 'swampwell', wall: 0x3a5a4a, roof: 0x3ae0a0, height: 26 },
    },
    // ---------------------------------------------------------------- naga warriors
    {
      id: 'tc_spawning_grounds', name: 'Spawning Grounds', faction: 'tidecall', cost: 150, hp: 700, armor: 3, buildTime: 10, size: 2,
      desc: 'Naga Guardians: tough serpent warriors whose tridents cleave the group around the target. Upgrades into Royal Spawning Grounds.',
      spawn: { unit: 'tc_guardian', count: 1, interval: 26 },
      upgrades: ['tc_royal_grounds'],
      model: { style: 'spawningpool', wall: SAND, roof: SEA, height: 20 },
    },
    {
      id: 'tc_royal_grounds', name: 'Royal Spawning Grounds', faction: 'tidecall', cost: 125, hp: 1000, armor: 4, buildTime: 10, size: 2, upgradeOnly: true,
      desc: 'Naga Royal Guards: heavier tridents, cleave and the odd double blow.',
      spawn: { unit: 'tc_royal_guard', count: 1, interval: 34 },
      model: { style: 'spawningpool', wall: 0xe8d8b0, roof: 0x1a6ad0, height: 24 },
    },
    {
      id: 'tc_naga_spring', name: 'Naga Spring', faction: 'tidecall', cost: 200, hp: 700, armor: 3, buildTime: 11, size: 2,
      desc: 'Naga Sirens: chaos bolts, and every 18 s they call two Lobsters that fight for 20 s.',
      spawn: { unit: 'tc_siren', count: 1, interval: 30 },
      model: { style: 'nagaspring', wall: SAND, roof: CORAL, height: 28 },
    },
    // ---------------------------------------------------------------- turtles, serpents
    {
      id: 'tc_reptile_pool', name: 'Reptile Pool', faction: 'tidecall', cost: 170, hp: 700, armor: 3, buildTime: 10, size: 2,
      desc: 'Dragon Turtles: long-range siege, every 7th shot stuns, and their thorny shell reflects 40% of melee damage.',
      spawn: { unit: 'tc_dragon_turtle', count: 1, interval: 28 },
      model: { style: 'reptilepool', wall: 0x6a6a5a, roof: KELP, height: 16 },
    },
    {
      id: 'tc_snake_temple', name: 'Temple of Snakes', faction: 'tidecall', cost: 140, hp: 650, armor: 2, buildTime: 9, size: 2,
      desc: 'Winged Serpents: magic flyers whose bolts bounce between 3 enemies.',
      spawn: { unit: 'tc_winged_serpent', count: 1, interval: 25 },
      model: { style: 'snaketemple', wall: SAND, roof: 0x3ac0a0, height: 30 },
    },
    // ---------------------------------------------------------------- utility
    {
      id: 'tc_coral_statue', name: 'Coral Statue', faction: 'tidecall', cost: 150, hp: 600, armor: 2, buildTime: 9, size: 2,
      desc: 'Aura: allied units within 7 tiles regenerate 6 HP/s more, and buildings nearby are mended by 2.5 HP/s.',
      aura: { stat: 'regen', value: 6, radius: 7, target: 'ally' },
      mend: { hps: 2.5, radius: 7 },
      model: { style: 'coralstatue', wall: SAND, roof: CORAL, height: 30 },
    },
    {
      id: 'tc_pyramid', name: 'Ancient Pyramid', faction: 'tidecall', cost: 215, hp: 700, armor: 3, buildTime: 12, size: 2,
      desc: 'Every 10 s the earth splits under the nearest enemy ground units anywhere on the map: a little damage and a 50% slow for 8 s.',
      power: { kind: 'cyclone', global: true, cooldown: 10, range: 14, radius: 3, dmg: 6, duration: 8, slow: 0.5 },
      model: { style: 'pyramid', wall: SAND, roof: SEA, height: 32 },
    },
    {
      id: 'tc_oracle', name: 'Oracle of Sirens', faction: 'tidecall', cost: 185, hp: 600, armor: 2, buildTime: 11, size: 2,
      desc: 'Every 16 s the nearest enemy unit anywhere on the map with at most 800 HP is charmed and fights for you.',
      power: { kind: 'charm', global: true, cooldown: 16, range: 13, radius: 0, dmg: 800 },
      model: { style: 'oracle', wall: SAND, roof: 0xff9ad0, height: 34 },
    },
    // ---------------------------------------------------------------- special
    {
      id: 'tc_tidal_guardian', name: 'Tidal Guardian', faction: 'tidecall', cost: 400, hp: 1800, armor: 6, buildTime: 20, size: 2, special: true, sapphires: 1,
      desc: 'SPECIAL: costs a sapphire. Every 15 s a tsunami rolls 20 tiles towards the enemy: 240 damage to every ground unit in its path. Upgrades into the Tidal Titan.',
      power: { kind: 'wave', cooldown: 15, range: 20, radius: 1.6, dmg: 240 },
      upgrades: ['tc_tidal_guardian_2'],
      model: { style: 'tidalguardian', wall: SAND, roof: SEA, height: 48 },
    },
    {
      id: 'tc_tidal_guardian_2', name: 'Tidal Titan', faction: 'tidecall', cost: 350, hp: 2400, armor: 7, buildTime: 15, size: 2, special: true, upgradeOnly: true,
      desc: 'A tsunami every 11 s, wider and harder (300 damage).',
      power: { kind: 'wave', cooldown: 11, range: 22, radius: 2, dmg: 300 },
      model: { style: 'tidalguardian', wall: 0xe8d8b0, roof: 0x1a6ad0, height: 56 },
    },
  ],
  units: [
    { id: 'tc_murloc', name: 'Murloc Warrior', hp: 260, armor: 4, armorType: 'light', dmg: 14, attackType: 'normal', range: 0.4, cooldown: 1.25, speed: 2.8, radius: 0.3, bounty: 3,
      crit: { every: 10, mult: 2 },
      model: { shape: 'murloc', body: 0x4a9a7a, accent: CORAL, scale: 0.95 } },
    { id: 'tc_murloc_champion', name: 'Murloc Champion', hp: 420, armor: 6, armorType: 'light', dmg: 22, attackType: 'normal', range: 0.5, cooldown: 1.25, speed: 2.8, radius: 0.33, bounty: 5,
      splash: 0.8, evade: 12, bash: { every: 7, stun: 1 }, crit: { every: 10, mult: 2 },
      model: { shape: 'murloc', body: 0x3a8a8a, accent: SAND, scale: 1.08, variant: 'champion' } },
    { id: 'tc_murloc_assassin', name: 'Murloc Assassin', hp: 650, armor: 8, armorType: 'light', dmg: 30, attackType: 'normal', range: 0.5, cooldown: 1.25, speed: 2.8, radius: 0.36, bounty: 8,
      splash: 1, evade: 7, bash: { every: 7, stun: 1 }, crit: { every: 5, mult: 2 },
      model: { shape: 'murloc', body: 0x2a5a6a, accent: 0xb02a4a, scale: 1.18, variant: 'assassin' } },
    { id: 'tc_spitter', name: 'Swamp Spitter', hp: 340, armor: 3, armorType: 'medium', dmg: 20, attackType: 'normal', range: 3.25, cooldown: 1.4, speed: 2.8, radius: 0.36, bounty: 5, targetsAir: true,
      poison: { dps: 3, duration: 4, slow: 0.35 },
      model: { shape: 'spitter', body: 0x5a8a4a, accent: 0x9ae060, scale: 1.05 } },
    { id: 'tc_hydra', name: 'Ancient Hydra', hp: 1530, armor: 9, armorType: 'medium', dmg: 70, attackType: 'chaos', range: 4, cooldown: 1.4, speed: 3.2, radius: 0.6, bounty: 25, targetsAir: true,
      splash: 1.4, magicResist: 0.7, poison: { dps: 6, duration: 4, slow: 0.35 }, onDeath: { unit: 'tc_hydra_head', count: 2 },
      model: { shape: 'hydra', body: 0x2a7a5a, accent: 0x6ae0a0, scale: 1.55 } },
    { id: 'tc_hydra_head', name: 'Hydra Head', hp: 430, armor: 5, armorType: 'medium', dmg: 27, attackType: 'chaos', range: 3.5, cooldown: 1.4, speed: 3.2, radius: 0.4, bounty: 6, targetsAir: true,
      poison: { dps: 4, duration: 3, slow: 0.25 },
      model: { shape: 'hydra', body: 0x3a8a6a, accent: 0x6ae0a0, scale: 0.95, variant: 'head' } },
    { id: 'tc_guardian', name: 'Naga Guardian', hp: 570, armor: 6, armorType: 'heavy', dmg: 36, attackType: 'pierce', range: 0.6, cooldown: 1.4, speed: 2.8, radius: 0.42, bounty: 8,
      splash: 1,
      model: { shape: 'naga', body: 0x3a8a8a, accent: SEA, scale: 1.12 } },
    { id: 'tc_royal_guard', name: 'Naga Royal Guard', hp: 940, armor: 9, armorType: 'heavy', dmg: 52, attackType: 'pierce', range: 0.7, cooldown: 1.4, speed: 2.8, radius: 0.46, bounty: 13,
      splash: 0.9, crit: { every: 10, mult: 2 },
      model: { shape: 'naga', body: 0x2a6a7a, accent: 0xe0c040, scale: 1.3, variant: 'royal' } },
    { id: 'tc_siren', name: 'Naga Siren', hp: 490, armor: 3, armorType: 'light', dmg: 42, attackType: 'chaos', range: 4, cooldown: 1.6, speed: 2.9, radius: 0.36, bounty: 9, targetsAir: true,
      summon: { unit: 'tc_lobster', count: 2, every: 18, ttl: 20 },
      model: { shape: 'naga', body: 0x4aa0a0, accent: CORAL, scale: 1.05, variant: 'siren' } },
    { id: 'tc_lobster', name: 'Lobster', hp: 220, armor: 5, armorType: 'heavy', dmg: 14, attackType: 'normal', range: 0.4, cooldown: 1.2, speed: 2.6, radius: 0.32, bounty: 1,
      model: { shape: 'lobster', body: 0xd04a2a, accent: SAND, scale: 0.95 } },
    { id: 'tc_dragon_turtle', name: 'Dragon Turtle', hp: 620, armor: 8, armorType: 'heavy', dmg: 50, attackType: 'siege', range: 5.5, cooldown: 1.7, speed: 2.3, radius: 0.55, bounty: 9,
      bash: { every: 7, stun: 2 }, thorns: 0.4,
      model: { shape: 'dragonturtle', body: 0x4a7a5a, accent: 0xb0a060, scale: 1.25 } },
    { id: 'tc_winged_serpent', name: 'Winged Serpent', hp: 410, armor: 2, armorType: 'light', dmg: 26, attackType: 'magic', range: 4.2, cooldown: 1.5, speed: 3.3, radius: 0.38, bounty: 7, air: true, targetsAir: true,
      chain: 3,
      model: { shape: 'wingedserpent', body: 0x3ac0a0, accent: CORAL, scale: 1.15 } },
  ],
};
