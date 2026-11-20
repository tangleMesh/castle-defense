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
  desc: "Corrupted ancients and fel demons: weakening treants, incinerating void walkers with armour-breaking auras, felhounds, infernal machines, drakes, an overtaking incubus, tentacles, the Well of Pain and the Eye of Corruption.",
  color: 0xd0b020,
  traits: [
    "Weakening blows: ents, treants and the annihilator make their targets deal 27% / 55% / 100% less damage",
    "Void walkers and keepers incinerate (each hit on the same target grows hotter) and break enemy armour around them",
    "Infernal machines and tanks detonate when they fall; the incubus can overtake what it hits",
    "Specials: tentacles around any enemy, the Well of Pain (200 damage every 4 s), the Eye of Corruption (\u22126 armour for every enemy unit)",
    "A corrupted protector tower with chaos splash",
  ],
  build: [
    'br_protector', 'br_ancient_battle', 'br_demonic_statue', 'treasure_box', 'br_eye', 'br_felhound_shrine', 'br_forgotten_one', 'br_hells_gate', 'br_nether_ancient', 'br_void_portal', 'br_well_of_pain',
  ],
  buildings: [
    {
      id: 'br_ancient_battle', name: 'Corrupted Ancient of Battle', faction: 'blightroot', cost: 125, hp: 1200, armor: 5, buildTime: 2, size: 2,
      desc: "Trains Corrupted Ents: their blows make the target deal 27% less damage for 20 s. Upgrades into the Corrupted Ancient of War.",
      spawn: { unit: 'br_ent', count: 1, interval: 21 },
      upgrades: ['br_ancient_war'],
      model: { style: 'blightancient', wall: ROTWOOD, roof: FELG, height: 34 },
    },
    {
      id: 'br_ancient_war', name: 'Corrupted Ancient of War', faction: 'blightroot', cost: 125, hp: 1300, armor: 5, buildTime: 2, size: 2, upgradeOnly: true,
      desc: "Trains Corrupted Treants: cleave, critical strikes, and blows that weaken by 55%. Upgrades into the Ancient of Annihilation (legendary).",
      spawn: { unit: 'br_treant', count: 1, interval: 27 },
      upgrades: ['br_annihilation'],
      model: { style: 'blightancient', wall: 0x3a2a2a, roof: 0xa0e030, height: 40 },
    },
    {
      id: 'br_annihilation', name: 'Ancient of Annihilation', faction: 'blightroot', cost: 500, lumber: 375, hp: 1900, armor: 5, buildTime: 2, size: 2, upgradeOnly: true, special: true, sapphires: 1,
      desc: "LEGENDARY: needs a sapphire. Trains the Corrupted Annihilator: immune, 70% spell resistance, wide cleaves, critical strikes, blows that leave the target harmless for 20 s, and impaling spikes.",
      spawn: { unit: 'br_annihilator', count: 1, interval: 52 },
      lumberGain: 0,
      model: { style: 'blightancient', wall: 0x2a1a1a, roof: BLIGHT, height: 46 },
    },
    {
      id: 'br_void_portal', name: 'Void Portal', faction: 'blightroot', cost: 190, hp: 1200, armor: 5, buildTime: 2, size: 2,
      desc: "Trains Void Walkers: incinerating bolts and an aura that takes 2 armour from nearby enemies. Upgrades into the Portal of the Abyss.",
      spawn: { unit: 'br_void_walker', count: 1, interval: 24 },
      upgrades: ['br_abyss_portal'],
      model: { style: 'voidportal', wall: 0x4a4a52, roof: VOIDC, height: 30 },
    },
    {
      id: 'br_abyss_portal', name: 'Portal of the Abyss', faction: 'blightroot', cost: 190, hp: 1400, armor: 5, buildTime: 2, size: 2, upgradeOnly: true,
      desc: "Trains Void Keepers: hotter incineration (explosions of 160) and \u22124 armour for enemies within 6.5 tiles.",
      spawn: { unit: 'br_void_keeper', count: 1, interval: 34 },
      model: { style: 'voidportal', wall: 0x3a3a42, roof: 0xb05ae0, height: 34 },
    },
    {
      id: 'br_felhound_shrine', name: 'Felhound Shrine', faction: 'blightroot', cost: 240, hp: 1300, armor: 5, buildTime: 2, size: 2,
      desc: "Trains Felhounds: fast fel beasts whose aura makes allies within 9 tiles attack 18% faster.",
      spawn: { unit: 'br_felhound', count: 1, interval: 27 },
      model: { style: 'felshrine', wall: ROTWOOD, roof: FELG, height: 24 },
    },
    {
      id: 'br_hells_gate', name: "Hell's Gate", faction: 'blightroot', cost: 300, hp: 1400, armor: 5, buildTime: 2, size: 2,
      desc: "Builds Infernal Machines: long-range siege that detonates when destroyed. Upgrades into Hell's Portal.",
      spawn: { unit: 'br_machine', count: 1, interval: 30 },
      upgrades: ['br_hells_portal'],
      incomeRate: 0.018, lumberGain: 0.75,
      model: { style: 'hellgate', wall: 0x3a3232, roof: 0xff6a1a, height: 28 },
    },
    {
      id: 'br_hells_portal', name: "Hell's Portal", faction: 'blightroot', cost: 150, hp: 1500, armor: 5, buildTime: 2, size: 2, upgradeOnly: true,
      desc: "Builds Infernal Tanks: siege whose shots burn a line of enemies, and a bigger detonation.",
      spawn: { unit: 'br_infernal_tank', count: 1, interval: 37 },
      incomeRate: 0.018, lumberGain: 0.75,
      model: { style: 'hellgate', wall: 0x2a2222, roof: 0xff3a1a, height: 32 },
    },
    {
      id: 'br_nether_ancient', name: 'Nether Ancient', faction: 'blightroot', cost: 235, hp: 1300, armor: 5, buildTime: 2, size: 2,
      desc: "Trains Nether Drakes: flyers whose bolts splash. Upgrades into the Shadow Ancient.",
      spawn: { unit: 'br_nether_drake', count: 1, interval: 26 },
      upgrades: ['br_shadow_ancient'],
      model: { style: 'blightancient', wall: 0x3a3a4a, roof: VOIDC, height: 34 },
    },
    {
      id: 'br_shadow_ancient', name: 'Shadow Ancient', faction: 'blightroot', cost: 165, hp: 1500, armor: 5, buildTime: 2, size: 2, upgradeOnly: true,
      desc: "Trains Shadow Drakes: tougher flyers with heavier splashing bolts.",
      spawn: { unit: 'br_shadow_drake', count: 1, interval: 35 },
      model: { style: 'blightancient', wall: 0x2a2a3a, roof: 0x5a2a8a, height: 40 },
    },
    {
      id: 'br_demonic_statue', name: 'Demonic Statue', faction: 'blightroot', cost: 520, hp: 1600, armor: 5, buildTime: 2, size: 2,
      desc: "Summons the Incubus: chaos splash from range, and a 10% chance per hit to take control of its target.",
      spawn: { unit: 'br_incubus', count: 1, interval: 41 },
      model: { style: 'demonstatue', wall: 0x4a4a42, roof: FELG, height: 36 },
    },
    {
      id: 'br_protector', name: 'Corrupted Protector', faction: 'blightroot', cost: 200, lumber: 300, hp: 1500, armor: 8, buildTime: 20, size: 2,
      desc: "Base defence: a corrupted protector that hurls chaos with splash (43 damage per second).",
      attack: { dmg: 65, attackType: 'chaos', range: 8, cooldown: 1.5, targetsAir: true, splash: 2.25 },
      incomeRate: 0.008, lumberGain: 0,
      model: { style: 'blightprotector', wall: ROTWOOD, roof: BLIGHT, height: 34 },
    },
    {
      id: 'br_forgotten_one', name: 'Forgotten One', faction: 'blightroot', cost: 260, lumber: 420, hp: 900, armor: 5, buildTime: 2, size: 2,
      desc: "Tentacle prison: every 12 s six tentacles burst from the ground around the nearest enemy ground unit anywhere on the map.",
      power: { kind: 'tentacles', global: true, cooldown: 12, range: 13, radius: 1.2, dmg: 0, duration: 30, unit: 'br_tentacle', count: 6 },
      incomeRate: 0.009, lumberGain: 0,
      model: { style: 'forgottenone', wall: 0x3a4a3a, roof: VOIDC, height: 26 },
    },
    {
      id: 'br_well_of_pain', name: 'Well of Pain', faction: 'blightroot', cost: 275, lumber: 480, hp: 900, armor: 5, buildTime: 2, size: 2,
      desc: "Touch of pain: every 4 s the nearest enemy unit anywhere on the map takes 200 spell damage.",
      power: { kind: 'beam', global: true, cooldown: 4, range: 12, radius: 0, dmg: 200 },
      incomeRate: 0.009, lumberGain: 0,
      model: { style: 'painwell', wall: 0x4a3a3a, roof: 0xd02a6a, height: 22 },
    },
    {
      id: 'br_eye', name: 'Eye of Corruption', faction: 'blightroot', cost: 500, lumber: 1350, hp: 1300, armor: 5, buildTime: 2, size: 2, special: true, sapphires: 1,
      desc: "LEGENDARY: needs a sapphire. Gaze of corruption: every enemy unit on the map has 6 less armour.",
      aura: { stat: 'armor', value: -6, radius: 200, target: 'enemy' },
      incomeRate: 0.012, lumberGain: 0,
      model: { style: 'corruptioneye', wall: ROTWOOD, roof: FELG, height: 48 },
    },
  ],
  units: [
    { id: 'br_ent', name: 'Corrupted Ent', hp: 320, armor: 4, armorType: 'heavy', dmg: 26, attackType: 'normal', range: 0.5, cooldown: 1.37, speed: 3, radius: 0.36, bounty: 3,
      weaken: { mult: 0.27, duration: 20 },
      model: { shape: 'blightent', body: ROTWOOD, accent: FELG, scale: 1 } },
    { id: 'br_treant', name: 'Corrupted Treant', hp: 640, armor: 5, armorType: 'heavy', dmg: 52.5, attackType: 'normal', range: 0.6, cooldown: 1.38, speed: 3, radius: 0.42, bounty: 8,
      cleave: { pct: 0.25, radius: 1.75 }, crit: { chance: 0.1, mult: 2 }, weaken: { mult: 0.55, duration: 20 },
      model: { shape: 'blightent', body: 0x3a2a2a, accent: 0xa0e030, scale: 1.2, variant: 'treant' } },
    { id: 'br_annihilator', name: 'Corrupted Annihilator', hp: 1800, armor: 8, armorType: 'heavy', dmg: 150, attackType: 'normal', range: 0.8, cooldown: 1.35, speed: 3, radius: 0.58, bounty: 23,
      regen: 2, magicResist: 0.7, immune: true, cleave: { pct: 0.4, radius: 2.25 }, crit: { chance: 0.15, mult: 2 }, weaken: { mult: 1, duration: 20 }, slam: { chance: 0.09, dmg: 250, radius: 2 },
      model: { shape: 'blightent', body: 0x2a1a1a, accent: BLIGHT, scale: 1.55, variant: 'annihilator' } },
    { id: 'br_void_walker', name: 'Void Walker', hp: 375, armor: 2, armorType: 'light', dmg: 40, attackType: 'magic', range: 3.8, cooldown: 1.6, speed: 2.9, radius: 0.34, bounty: 6, targetsAir: true,
      incinerate: { step: 7, blast: 80, radius: 1.5 }, aura: { stat: 'armor', value: -2, radius: 4, target: 'enemy' },
      model: { shape: 'voidwalker', body: VOIDC, accent: 0xe0a0ff, scale: 1.05 } },
    { id: 'br_void_keeper', name: 'Void Keeper', hp: 740, armor: 4, armorType: 'light', dmg: 80, attackType: 'magic', range: 4, cooldown: 1.6, speed: 2.9, radius: 0.4, bounty: 12, targetsAir: true,
      regen: 1.5, incinerate: { step: 7, blast: 160, radius: 1.5 }, aura: { stat: 'armor', value: -4, radius: 6.5, target: 'enemy' },
      model: { shape: 'voidwalker', body: 0x5a2a8a, accent: 0xff8aff, scale: 1.25, variant: 'keeper' } },
    { id: 'br_felhound', name: 'Felhound', hp: 650, armor: 7, armorType: 'medium', dmg: 50, attackType: 'pierce', range: 0.5, cooldown: 1.35, speed: 3.3, radius: 0.42, bounty: 6,
      regen: 1, aura: { stat: 'haste', value: 0.18, radius: 9, target: 'ally' },
      model: { shape: 'felhound', body: 0x7a3a2a, accent: FELG, scale: 1.15 } },
    { id: 'br_machine', name: 'Infernal Machine', hp: 600, armor: 3, armorType: 'heavy', dmg: 72.5, attackType: 'siege', range: 6, cooldown: 1.61, speed: 2.9, radius: 0.45, bounty: 10,
      deathBlast: { dmg: 100, radius: 2.25 },
      model: { shape: 'infernalmachine', body: 0x4a3a32, accent: 0xff6a1a, scale: 1.1 } },
    { id: 'br_infernal_tank', name: 'Infernal Tank', hp: 850, armor: 4, armorType: 'heavy', dmg: 80, attackType: 'siege', range: 6, cooldown: 1.4, speed: 2.9, radius: 0.5, bounty: 14,
      regen: 1.13, cleave: { pct: 0.75, radius: 1.5 }, deathBlast: { dmg: 150, radius: 2.75 },
      model: { shape: 'infernalmachine', body: 0x3a2a22, accent: 0xff3a1a, scale: 1.3, variant: 'tank' } },
    { id: 'br_nether_drake', name: 'Nether Drake', hp: 425, armor: 2, armorType: 'medium', dmg: 67.5, attackType: 'magic', range: 4, cooldown: 1.83, speed: 3.3, radius: 0.4, bounty: 8, air: true, targetsAir: true,
      splash: 2.5,
      model: { shape: 'netherdrake', body: 0x4a3a7a, accent: 0xa070ff, scale: 1.1 } },
    { id: 'br_shadow_drake', name: 'Shadow Drake', hp: 700, armor: 4, armorType: 'medium', dmg: 107.5, attackType: 'magic', range: 4, cooldown: 1.83, speed: 3.3, radius: 0.45, bounty: 13, air: true, targetsAir: true,
      regen: 1, splash: 2.5,
      model: { shape: 'netherdrake', body: 0x2a1a3a, accent: 0xd070ff, scale: 1.3, variant: 'shadow' } },
    { id: 'br_incubus', name: 'Incubus', hp: 1000, armor: 4, armorType: 'medium', dmg: 102.5, attackType: 'chaos', range: 5.3, cooldown: 1.6, speed: 3.2, radius: 0.42, bounty: 16, targetsAir: true,
      regen: 2, splash: 2.1, overtake: 0.1,
      model: { shape: 'incubus', body: 0x6a2a3a, accent: FELG, scale: 1.25 } },
    { id: 'br_tentacle', name: 'Tentacle', hp: 225, armor: 0, armorType: 'medium', dmg: 21, attackType: 'normal', range: 1.2, cooldown: 1, speed: 0, radius: 0.3, bounty: 1,
      crit: { chance: 0.1, mult: 1.5 },
      model: { shape: 'tentacle', body: 0x4a6a4a, accent: VOIDC, scale: 1 } },
  ],
};
