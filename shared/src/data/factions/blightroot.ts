import type { FactionDef } from '../types';

const ROTWOOD = 0x4a3a3a;
const BLIGHT = 0xd0b020;
const VOIDC = 0x7a3ab0;
const FELG = 0x8ad02a;

/**
 * Blightroot Coven: once-friendly creatures twisted by demons. Tree and stat ratios follow the
 * classic "corrupted" castle-fight race (corrupted ents → treants → the annihilator, void walkers
 * with corruption auras, felhounds, infernal machines that detonate, nether → shadow drakes, the
 * incubus, the corrupted protector, the forgotten one's tentacles, the well of pain and the eye of
 * corruption), re-themed with the Coven's own names and look.
 */
export const BLIGHTROOT: FactionDef = {
  id: 'blightroot',
  name: 'Blightroot Coven',
  desc: 'Creatures twisted by demons: weakening treants, armour-rotting void walkers, felhounds, exploding infernal machines, drakes, tentacles from the deep and an eye that strips armour.',
  color: 0xd0b020,
  traits: [
    'Corruption: treants weaken whatever they strike (it deals up to 60% less damage for a while)',
    'Rot: void walkers and the Eye of Corruption strip the armour of enemies',
    'Infernal machines blow up when destroyed',
    'From the deep: the Forgotten One raises tentacles around the enemy; the Well of Pain lashes them',
    'The corrupted protector splashes chaos over the enemy army',
  ],
  build: [
    'br_ancient_battle', 'br_void_portal', 'br_felhound_shrine', 'br_hells_gate',
    'br_nether_ancient', 'br_demonic_statue', 'br_protector', 'br_forgotten_one',
    'br_well_of_pain', 'br_eye',
  ],
  buildings: [
    // ---------------------------------------------------------------- corrupted ents
    {
      id: 'br_ancient_battle', name: 'Corrupted Ancient of Battle', faction: 'blightroot', cost: 80, hp: 600, armor: 2, buildTime: 7, size: 2,
      desc: 'Corrupted Ents: their blows weaken the target (25% less damage for 4 s). Upgrades into Corrupted Ancient of War.',
      spawn: { unit: 'br_ent', count: 1, interval: 19 },
      upgrades: ['br_ancient_war'],
      model: { style: 'blightancient', wall: ROTWOOD, roof: FELG, height: 34 },
    },
    {
      id: 'br_ancient_war', name: 'Corrupted Ancient of War', faction: 'blightroot', cost: 90, hp: 900, armor: 3, buildTime: 8, size: 2, upgradeOnly: true,
      desc: 'Corrupted Treants: cleaving, the odd double blow, and they weaken targets by 40%. Upgrades (with a sapphire) into the Ancient of Annihilation.',
      spawn: { unit: 'br_treant', count: 1, interval: 25 },
      upgrades: ['br_annihilation'],
      model: { style: 'blightancient', wall: 0x3a2a2a, roof: 0xa0e030, height: 40 },
    },
    {
      id: 'br_annihilation', name: 'Ancient of Annihilation', faction: 'blightroot', cost: 280, sapphires: 1, hp: 1300, armor: 4, buildTime: 14, size: 2, upgradeOnly: true,
      desc: 'ELITE (costs a sapphire): the Annihilator: huge cleaving blows that weaken by 60%, and every 4th blow a fan of spikes that stuns everyone around.',
      spawn: { unit: 'br_annihilator', count: 1, interval: 42 },
      model: { style: 'blightancient', wall: 0x2a1a1a, roof: BLIGHT, height: 46 },
    },
    // ---------------------------------------------------------------- void walkers
    {
      id: 'br_void_portal', name: 'Void Portal', faction: 'blightroot', cost: 115, hp: 550, armor: 2, buildTime: 8, size: 2,
      desc: 'Void Walkers: burning magic, and their corruption rots the armour of nearby enemies (−2). Upgrades into Portal of the Abyss.',
      spawn: { unit: 'br_void_walker', count: 1, interval: 22 },
      upgrades: ['br_abyss_portal'],
      model: { style: 'voidportal', wall: 0x4a4a52, roof: VOIDC, height: 30 },
    },
    {
      id: 'br_abyss_portal', name: 'Portal of the Abyss', faction: 'blightroot', cost: 115, hp: 800, armor: 3, buildTime: 9, size: 2, upgradeOnly: true,
      desc: 'Void Keepers: stronger burning magic, −4 armour on nearby enemies.',
      spawn: { unit: 'br_void_keeper', count: 1, interval: 31 },
      model: { style: 'voidportal', wall: 0x3a3a42, roof: 0xb05ae0, height: 34 },
    },
    // ---------------------------------------------------------------- felhounds, infernal machines
    {
      id: 'br_felhound_shrine', name: 'Felhound Shrine', faction: 'blightroot', cost: 145, hp: 650, armor: 3, buildTime: 10, size: 2,
      desc: 'Felhounds: armoured hunting beasts whose howl makes nearby allies attack 18% faster.',
      spawn: { unit: 'br_felhound', count: 1, interval: 26 },
      model: { style: 'felshrine', wall: ROTWOOD, roof: FELG, height: 24 },
    },
    {
      id: 'br_hells_gate', name: "Hell's Gate", faction: 'blightroot', cost: 180, hp: 750, armor: 3, buildTime: 11, size: 2,
      desc: 'Infernal Machines: long-range siege walkers that detonate when destroyed. Can\'t hit flyers. Upgrades into Hell\'s Portal.',
      spawn: { unit: 'br_machine', count: 1, interval: 28 },
      upgrades: ['br_hells_portal'],
      model: { style: 'hellgate', wall: 0x3a3232, roof: 0xff6a1a, height: 28 },
    },
    {
      id: 'br_hells_portal', name: "Hell's Portal", faction: 'blightroot', cost: 100, hp: 1000, armor: 4, buildTime: 9, size: 2, upgradeOnly: true,
      desc: 'Infernal Tanks: splash shells that pierce the enemy line, a bigger detonation when destroyed.',
      spawn: { unit: 'br_infernal_tank', count: 1, interval: 34 },
      model: { style: 'hellgate', wall: 0x2a2222, roof: 0xff3a1a, height: 32 },
    },
    // ---------------------------------------------------------------- drakes, incubus
    {
      id: 'br_nether_ancient', name: 'Nether Ancient', faction: 'blightroot', cost: 140, hp: 600, armor: 2, buildTime: 9, size: 2,
      desc: 'Nether Drakes: flying magic breath that splashes. Upgrades into Shadow Ancient.',
      spawn: { unit: 'br_nether_drake', count: 1, interval: 24 },
      upgrades: ['br_shadow_ancient'],
      model: { style: 'blightancient', wall: 0x3a3a4a, roof: VOIDC, height: 34 },
    },
    {
      id: 'br_shadow_ancient', name: 'Shadow Ancient', faction: 'blightroot', cost: 100, hp: 900, armor: 3, buildTime: 9, size: 2, upgradeOnly: true,
      desc: 'Shadow Drakes: bigger, darker, wider splash.',
      spawn: { unit: 'br_shadow_drake', count: 1, interval: 33 },
      model: { style: 'blightancient', wall: 0x2a2a3a, roof: 0x5a2a8a, height: 40 },
    },
    {
      id: 'br_demonic_statue', name: 'Demonic Statue', faction: 'blightroot', cost: 300, hp: 1000, armor: 4, buildTime: 15, size: 2,
      desc: 'Calls the Incubus: a long-range chaos caster whose blasts splash over groups.',
      spawn: { unit: 'br_incubus', count: 1, interval: 40 },
      model: { style: 'demonstatue', wall: 0x4a4a42, roof: FELG, height: 36 },
    },
    // ---------------------------------------------------------------- utility
    {
      id: 'br_protector', name: 'Corrupted Protector', faction: 'blightroot', cost: 150, hp: 1200, armor: 6, buildTime: 12, size: 2,
      desc: 'Defensive tower: hurls blighted boulders that splash chaos damage over ground units within 8 tiles.',
      attack: { dmg: 60, attackType: 'chaos', range: 8, cooldown: 1.4, targetsAir: false, splash: 1.2 },
      model: { style: 'blightprotector', wall: ROTWOOD, roof: BLIGHT, height: 34 },
    },
    {
      id: 'br_forgotten_one', name: 'Forgotten One', faction: 'blightroot', cost: 160, hp: 650, armor: 2, buildTime: 10, size: 2,
      desc: 'Every 12 s six tentacles burst from the ground around the nearest enemy ground unit anywhere on the map; they last 9 s.',
      power: { kind: 'tentacles', global: true, cooldown: 12, range: 13, radius: 1.2, dmg: 0, duration: 9, unit: 'br_tentacle', count: 6 },
      model: { style: 'forgottenone', wall: 0x3a4a3a, roof: VOIDC, height: 26 },
    },
    {
      id: 'br_well_of_pain', name: 'Well of Pain', faction: 'blightroot', cost: 165, hp: 600, armor: 2, buildTime: 10, size: 2,
      desc: 'Every 4 s a touch of pain lashes the nearest enemy unit within 12 tiles for 100 magic damage.',
      power: { kind: 'beam', cooldown: 4, range: 12, radius: 0, dmg: 100 },
      model: { style: 'painwell', wall: 0x4a3a3a, roof: 0xd02a6a, height: 22 },
    },
    // ---------------------------------------------------------------- special
    {
      id: 'br_eye', name: 'Eye of Corruption', faction: 'blightroot', cost: 400, hp: 1800, armor: 6, buildTime: 20, size: 2, special: true, sapphires: 1,
      desc: 'SPECIAL: costs a sapphire. Its gaze strips 5 armour from every enemy unit on the battlefield. Upgrades into the All-Seeing Eye.',
      aura: { stat: 'armor', value: -5, radius: 120, target: 'enemy' },
      upgrades: ['br_eye_2'],
      model: { style: 'corruptioneye', wall: ROTWOOD, roof: FELG, height: 48 },
    },
    {
      id: 'br_eye_2', name: 'All-Seeing Eye', faction: 'blightroot', cost: 350, hp: 2400, armor: 7, buildTime: 15, size: 2, special: true, upgradeOnly: true,
      desc: 'Its gaze strips 8 armour from every enemy unit on the battlefield.',
      aura: { stat: 'armor', value: -8, radius: 120, target: 'enemy' },
      model: { style: 'corruptioneye', wall: 0x3a2a2a, roof: BLIGHT, height: 56 },
    },
  ],
  units: [
    { id: 'br_ent', name: 'Corrupted Ent', hp: 320, armor: 4, armorType: 'heavy', dmg: 16, attackType: 'normal', range: 0.5, cooldown: 1.4, speed: 3.0, radius: 0.36, bounty: 3,
      weaken: { mult: 0.25, duration: 4 },
      model: { shape: 'blightent', body: ROTWOOD, accent: FELG, scale: 1 } },
    { id: 'br_treant', name: 'Corrupted Treant', hp: 600, armor: 5, armorType: 'heavy', dmg: 30, attackType: 'normal', range: 0.6, cooldown: 1.4, speed: 3.0, radius: 0.42, bounty: 7,
      splash: 0.8, crit: { every: 10, mult: 2 }, weaken: { mult: 0.4, duration: 4 },
      model: { shape: 'blightent', body: 0x3a2a2a, accent: 0xa0e030, scale: 1.2, variant: 'treant' } },
    { id: 'br_annihilator', name: 'Corrupted Annihilator', hp: 1460, armor: 8, armorType: 'heavy', dmg: 62, attackType: 'normal', range: 0.8, cooldown: 1.3, speed: 3.0, radius: 0.58, bounty: 22,
      splash: 1.2, crit: { every: 7, mult: 2 }, weaken: { mult: 0.6, duration: 4 }, slam: { every: 4, dmg: 130, radius: 1.6 }, bash: { every: 4, stun: 1.5 },
      model: { shape: 'blightent', body: 0x2a1a1a, accent: BLIGHT, scale: 1.55, variant: 'annihilator' } },
    { id: 'br_void_walker', name: 'Void Walker', hp: 350, armor: 2, armorType: 'light', dmg: 20, attackType: 'magic', range: 3.8, cooldown: 1.4, speed: 2.9, radius: 0.34, bounty: 5, targetsAir: true,
      poison: { dps: 4, duration: 3, slow: 0 }, aura: { stat: 'armor', value: -2, radius: 4, target: 'enemy' },
      model: { shape: 'voidwalker', body: VOIDC, accent: 0xe0a0ff, scale: 1.05 } },
    { id: 'br_void_keeper', name: 'Void Keeper', hp: 700, armor: 4, armorType: 'light', dmg: 40, attackType: 'magic', range: 4, cooldown: 1.4, speed: 2.9, radius: 0.4, bounty: 10, targetsAir: true,
      poison: { dps: 5, duration: 3, slow: 0 }, aura: { stat: 'armor', value: -4, radius: 4, target: 'enemy' },
      model: { shape: 'voidwalker', body: 0x5a2a8a, accent: 0xff8aff, scale: 1.25, variant: 'keeper' } },
    { id: 'br_felhound', name: 'Felhound', hp: 620, armor: 7, armorType: 'medium', dmg: 25, attackType: 'pierce', range: 0.5, cooldown: 1.2, speed: 3.3, radius: 0.42, bounty: 8,
      aura: { stat: 'haste', value: 0.18, radius: 5, target: 'ally' },
      model: { shape: 'felhound', body: 0x7a3a2a, accent: FELG, scale: 1.15 } },
    { id: 'br_machine', name: 'Infernal Machine', hp: 570, armor: 3, armorType: 'heavy', dmg: 50, attackType: 'siege', range: 6, cooldown: 2.0, speed: 2.9, radius: 0.45, bounty: 8,
      deathBlast: { dmg: 100, radius: 1.5 },
      model: { shape: 'infernalmachine', body: 0x4a3a32, accent: 0xff6a1a, scale: 1.1 } },
    { id: 'br_infernal_tank', name: 'Infernal Tank', hp: 820, armor: 4, armorType: 'heavy', dmg: 60, attackType: 'siege', range: 6, cooldown: 1.9, speed: 2.9, radius: 0.5, bounty: 11,
      splash: 1.2, deathBlast: { dmg: 150, radius: 1.8 },
      model: { shape: 'infernalmachine', body: 0x3a2a22, accent: 0xff3a1a, scale: 1.3, variant: 'tank' } },
    { id: 'br_nether_drake', name: 'Nether Drake', hp: 400, armor: 2, armorType: 'medium', dmg: 20, attackType: 'magic', range: 4, cooldown: 1.4, speed: 3.3, radius: 0.4, bounty: 6, air: true, targetsAir: true,
      splash: 0.8,
      model: { shape: 'netherdrake', body: 0x4a3a7a, accent: 0xa070ff, scale: 1.1 } },
    { id: 'br_shadow_drake', name: 'Shadow Drake', hp: 680, armor: 4, armorType: 'medium', dmg: 36, attackType: 'magic', range: 4, cooldown: 1.4, speed: 3.3, radius: 0.45, bounty: 10, air: true, targetsAir: true,
      splash: 1,
      model: { shape: 'netherdrake', body: 0x2a1a3a, accent: 0xd070ff, scale: 1.3, variant: 'shadow' } },
    { id: 'br_incubus', name: 'Incubus', hp: 950, armor: 4, armorType: 'medium', dmg: 56, attackType: 'chaos', range: 5.3, cooldown: 1.6, speed: 3.2, radius: 0.42, bounty: 14, targetsAir: true,
      splash: 1,
      model: { shape: 'incubus', body: 0x6a2a3a, accent: FELG, scale: 1.25 } },
    { id: 'br_tentacle', name: 'Tentacle', hp: 220, armor: 3, armorType: 'medium', dmg: 13, attackType: 'normal', range: 0.9, cooldown: 1.1, speed: 0, radius: 0.3, bounty: 1,
      crit: { every: 6, mult: 1.5 },
      model: { shape: 'tentacle', body: 0x4a6a4a, accent: VOIDC, scale: 1 } },
  ],
};
