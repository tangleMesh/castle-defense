import type { FactionDef } from '../types';

const BONE = 0xe0d8c0;
const ROT = 0x8ab040;
const GRAVE = 0x4a4a52;
const VOID = 0x5a3a7a;

/**
 * Gravewake Legion: the risen dead. Tree and stat ratios follow the classic "undead" castle-fight
 * race (rotting zombies → plague bearers, necromancers who raise skeletons → the lich king,
 * vampires that drink blood, banshees that spread fear, the flesh golem, the frost wyrm, a skull
 * pile that raises the dead, the turret of souls, a death pit and the city of decay), re-themed
 * with the Legion's own names and look.
 */
export const GRAVEWAKE: FactionDef = {
  id: 'gravewake',
  name: 'Gravewake Legion',
  desc: 'The risen dead: rotting hordes, necromancers raising skeletons, vampires, banshees, a flesh golem, a bone wyrm, death pits and a city whose decay rots every enemy.',
  color: 0x8ab040,
  traits: [
    'Rot & plague: zombies poison what they bite; plague bearers spread a rotting cloud around them',
    'Necromancy: necromancers raise skeletons every few seconds; the skull pile raises them in pairs',
    'Blood: vampires heal themselves from every bite',
    'Dread: banshees make nearby enemies deal less damage and slow them',
    'Death: the death pit slays a unit at a stroke; the City of Decay rots every enemy unit on the battlefield',
  ],
  build: [
    'gw_hay_cart', 'gw_bone_temple', 'gw_crypt', 'gw_haunted_mine',
    'gw_slaughterhouse', 'gw_dragon_cemetery', 'gw_skull_pile', 'gw_soul_turret',
    'gw_death_pit', 'gw_city_of_decay',
  ],
  buildings: [
    // ---------------------------------------------------------------- zombies
    {
      id: 'gw_hay_cart', name: 'Rotting Hay Cart', faction: 'gravewake', cost: 75, hp: 550, armor: 2, buildTime: 7, size: 2,
      desc: 'Zombies shamble out of the rot: slow, cheap, their bite poisons. Upgrades into Tainted Farm.',
      spawn: { unit: 'gw_zombie', count: 1, interval: 19 },
      upgrades: ['gw_tainted_farm'],
      model: { style: 'haycart', wall: 0x5a4a32, roof: ROT, height: 16 },
    },
    {
      id: 'gw_tainted_farm', name: 'Tainted Farm', faction: 'gravewake', cost: 85, hp: 800, armor: 3, buildTime: 8, size: 2, upgradeOnly: true,
      desc: 'Suffocated Zombies: tougher, with a stronger rotting bite. Upgrades into Defiled Granary.',
      spawn: { unit: 'gw_ghoul', count: 1, interval: 23 },
      upgrades: ['gw_defiled_granary'],
      model: { style: 'plaguebarn', wall: 0x4a3a2a, roof: 0x6a7a3a, height: 22 },
    },
    {
      id: 'gw_defiled_granary', name: 'Defiled Granary', faction: 'gravewake', cost: 140, hp: 1000, armor: 4, buildTime: 10, size: 2, upgradeOnly: true,
      desc: 'Plague Bearers: huge bloated corpses whose plague cloud rots enemies around them (8 HP/s).',
      spawn: { unit: 'gw_plague_bearer', count: 1, interval: 32 },
      model: { style: 'plaguebarn', wall: 0x3a2a1a, roof: 0x8ab040, height: 28 },
    },
    // ---------------------------------------------------------------- necromancers
    {
      id: 'gw_bone_temple', name: 'Temple of Bone', faction: 'gravewake', cost: 125, hp: 600, armor: 2, buildTime: 9, size: 2,
      desc: 'Necromancers: magic bolts, and every 18 s they raise two Skeletons that crumble after 16 s. Upgrades into Temple of Necromancy.',
      spawn: { unit: 'gw_necromancer', count: 1, interval: 22 },
      upgrades: ['gw_necro_temple'],
      model: { style: 'bonetemple', wall: GRAVE, roof: BONE, height: 26 },
    },
    {
      id: 'gw_necro_temple', name: 'Temple of Necromancy', faction: 'gravewake', cost: 110, hp: 850, armor: 3, buildTime: 9, size: 2, upgradeOnly: true,
      desc: 'Mighty Necromancers: carrion swarms every 4th spell, and they raise Skeleton Warriors. Upgrades (with a sapphire) into the Lich Citadel.',
      spawn: { unit: 'gw_mighty_necromancer', count: 1, interval: 30 },
      upgrades: ['gw_lich_citadel'],
      model: { style: 'bonetemple', wall: 0x3a3a42, roof: 0xb0a8e0, height: 30 },
    },
    {
      id: 'gw_lich_citadel', name: 'Lich Citadel', faction: 'gravewake', cost: 240, sapphires: 1, hp: 1200, armor: 4, buildTime: 14, size: 2, upgradeOnly: true,
      desc: 'ELITE (costs a sapphire): the Lich King: decaying bolts, he shrugs off magic and raises Death Knights.',
      spawn: { unit: 'gw_lich', count: 1, interval: 40 },
      model: { style: 'bonetemple', wall: 0x2a2a3a, roof: 0x8ad0f0, height: 36 },
    },
    // ---------------------------------------------------------------- vampires
    {
      id: 'gw_crypt', name: 'Crypt', faction: 'gravewake', cost: 140, hp: 650, armor: 3, buildTime: 10, size: 2,
      desc: 'Vampires: fast biters that heal themselves for 40% of the damage they deal. Upgrades into Graveyard.',
      spawn: { unit: 'gw_vampire', count: 1, interval: 24 },
      upgrades: ['gw_graveyard'],
      model: { style: 'crypt', wall: GRAVE, roof: 0x8a1a2a, height: 22 },
    },
    {
      id: 'gw_graveyard', name: 'Graveyard', faction: 'gravewake', cost: 160, hp: 900, armor: 4, buildTime: 10, size: 2, upgradeOnly: true,
      desc: 'Vampire Lords: deadly bites that heal for 50% of the damage, and they call Bats to their side.',
      spawn: { unit: 'gw_vampire_lord', count: 1, interval: 36 },
      model: { style: 'graveyard', wall: GRAVE, roof: 0x6a1a2a, height: 24 },
    },
    // ---------------------------------------------------------------- spirits, golem, wyrm
    {
      id: 'gw_haunted_mine', name: 'Haunted Mine', faction: 'gravewake', cost: 170, hp: 650, armor: 2, buildTime: 11, size: 2,
      desc: 'Banshees: wailing spirits whose fear makes nearby enemies deal 15% less damage; their chains slow.',
      spawn: { unit: 'gw_banshee', count: 1, interval: 26 },
      model: { style: 'hauntedmine', wall: 0x5a4a3a, roof: 0x9ad0c0, height: 22 },
    },
    {
      id: 'gw_slaughterhouse', name: 'Slaughterhouse', faction: 'gravewake', cost: 220, hp: 900, armor: 4, buildTime: 13, size: 2,
      desc: 'Flesh Golems: stitched-together siege brutes that demolish buildings and pulverise the ground every 4th blow.',
      spawn: { unit: 'gw_flesh_golem', count: 1, interval: 34 },
      model: { style: 'slaughterhouse', wall: 0x5a3a2a, roof: 0x7a2a22, height: 24 },
    },
    {
      id: 'gw_dragon_cemetery', name: 'Dragon Cemetery', faction: 'gravewake', cost: 290, hp: 1000, armor: 4, buildTime: 15, size: 2,
      desc: 'Bone Wyrms: huge flying dragon skeletons whose frost breath splashes and chills.',
      spawn: { unit: 'gw_bone_wyrm', count: 1, interval: 40 },
      model: { style: 'dragongrave', wall: GRAVE, roof: BONE, height: 30 },
    },
    // ---------------------------------------------------------------- utility
    {
      id: 'gw_skull_pile', name: 'Skull Pile', faction: 'gravewake', cost: 95, hp: 500, armor: 2, buildTime: 7, size: 2,
      desc: 'Raises two Skeletons from the bones every 14 s. Upgrades into Skull Shrine.',
      spawn: { unit: 'gw_skeleton', count: 2, interval: 14 },
      upgrades: ['gw_skull_shrine'],
      model: { style: 'skullpile', wall: BONE, roof: ROT, height: 18 },
    },
    {
      id: 'gw_skull_shrine', name: 'Skull Shrine', faction: 'gravewake', cost: 120, hp: 800, armor: 3, buildTime: 8, size: 2, upgradeOnly: true,
      desc: 'Raises two Skeleton Warriors every 15 s.',
      spawn: { unit: 'gw_skeleton_warrior', count: 2, interval: 15 },
      model: { style: 'skullpile', wall: BONE, roof: 0x9a6ad0, height: 24 },
    },
    {
      id: 'gw_soul_turret', name: 'Turret of Souls', faction: 'gravewake', cost: 150, hp: 1200, armor: 6, buildTime: 12, size: 2,
      desc: 'Defensive tower: soul bolts at air and ground within 8 tiles.',
      attack: { dmg: 72, attackType: 'normal', range: 8, cooldown: 1.3, targetsAir: true },
      model: { style: 'soulturret', wall: GRAVE, roof: 0x8ad0c0, height: 42 },
    },
    {
      id: 'gw_death_pit', name: 'Death Pit', faction: 'gravewake', cost: 220, hp: 650, armor: 2, buildTime: 12, size: 2,
      desc: 'Every 15 s the nearest enemy unit within 14 tiles with at most 800 HP dies at once (champions and elites are too strong).',
      power: { kind: 'slay', cooldown: 15, range: 14, radius: 0, dmg: 800 },
      model: { style: 'deathpit', wall: GRAVE, roof: VOID, height: 18 },
    },
    // ---------------------------------------------------------------- special
    {
      id: 'gw_city_of_decay', name: 'City of Decay', faction: 'gravewake', cost: 400, hp: 1800, armor: 6, buildTime: 20, size: 2, special: true, sapphires: 1,
      desc: 'SPECIAL: costs a sapphire. Its decay rots every enemy unit on the battlefield: 6 HP per second. Upgrades into the Necropolis.',
      aura: { stat: 'regen', value: -6, radius: 120, target: 'enemy' },
      upgrades: ['gw_city_of_decay_2'],
      model: { style: 'necropolis', wall: GRAVE, roof: ROT, height: 48 },
    },
    {
      id: 'gw_city_of_decay_2', name: 'Necropolis', faction: 'gravewake', cost: 350, hp: 2400, armor: 7, buildTime: 15, size: 2, special: true, upgradeOnly: true,
      desc: 'The rot deepens: every enemy unit loses 10 HP per second.',
      aura: { stat: 'regen', value: -10, radius: 120, target: 'enemy' },
      model: { style: 'necropolis', wall: 0x3a3a42, roof: 0xb0e040, height: 56 },
    },
  ],
  units: [
    { id: 'gw_zombie', name: 'Zombie', hp: 290, armor: 3, armorType: 'medium', dmg: 16, attackType: 'normal', range: 0.4, cooldown: 2.0, speed: 2.3, radius: 0.32, bounty: 3,
      poison: { dps: 4, duration: 4, slow: 0 },
      model: { shape: 'zombie', body: 0x7a8a5a, accent: ROT, scale: 1 } },
    { id: 'gw_ghoul', name: 'Suffocated Zombie', hp: 480, armor: 5, armorType: 'medium', dmg: 27, attackType: 'normal', range: 0.4, cooldown: 2.0, speed: 2.45, radius: 0.35, bounty: 6,
      poison: { dps: 6, duration: 4, slow: 0.1 },
      model: { shape: 'zombie', body: 0x6a7a6a, accent: 0x9ac040, scale: 1.12, variant: 'ghoul' } },
    { id: 'gw_plague_bearer', name: 'Plague Bearer', hp: 1000, armor: 6, armorType: 'medium', dmg: 50, attackType: 'normal', range: 0.5, cooldown: 2.0, speed: 2.6, radius: 0.5, bounty: 13,
      poison: { dps: 9, duration: 4, slow: 0.15 }, aura: { stat: 'regen', value: -8, radius: 2.5, target: 'enemy' },
      model: { shape: 'zombie', body: 0x8a9a6a, accent: 0xb0e040, scale: 1.4, variant: 'bloated' } },
    { id: 'gw_necromancer', name: 'Necromancer', hp: 290, armor: 1, armorType: 'light', dmg: 26, attackType: 'magic', range: 3.8, cooldown: 1.6, speed: 2.7, radius: 0.32, bounty: 5, targetsAir: true,
      summon: { unit: 'gw_skeleton', count: 2, every: 18, ttl: 16 },
      model: { shape: 'necromancer', body: 0x2a2a32, accent: ROT, scale: 1 } },
    { id: 'gw_mighty_necromancer', name: 'Mighty Necromancer', hp: 520, armor: 3, armorType: 'light', dmg: 40, attackType: 'magic', range: 4, cooldown: 1.6, speed: 2.7, radius: 0.35, bounty: 10, targetsAir: true,
      storm: { every: 4, dmg: 55, jumps: 3 }, summon: { unit: 'gw_skeleton_warrior', count: 2, every: 18, ttl: 16 },
      model: { shape: 'necromancer', body: 0x3a2a4a, accent: 0xb0a8e0, scale: 1.12, variant: 'mighty' } },
    { id: 'gw_lich', name: 'Lich King', hp: 1300, armor: 5, armorType: 'light', dmg: 52, attackType: 'magic', range: 5, cooldown: 1.6, speed: 3.0, radius: 0.4, bounty: 22, targetsAir: true,
      magicResist: 0.7, poison: { dps: 6, duration: 4, slow: 0.15 }, summon: { unit: 'gw_death_knight', count: 2, every: 18, ttl: 18 },
      model: { shape: 'lich', body: 0x2a3a5a, accent: 0x8ad0f0, scale: 1.3 } },
    { id: 'gw_skeleton', name: 'Skeleton', hp: 170, armor: 1, armorType: 'light', dmg: 11, attackType: 'normal', range: 0.4, cooldown: 1.2, speed: 2.8, radius: 0.28, bounty: 1,
      model: { shape: 'skeleton', body: BONE, accent: ROT, scale: 0.9 } },
    { id: 'gw_skeleton_warrior', name: 'Skeleton Warrior', hp: 260, armor: 3, armorType: 'medium', dmg: 16, attackType: 'normal', range: 0.4, cooldown: 1.2, speed: 2.8, radius: 0.3, bounty: 2,
      model: { shape: 'skeleton', body: BONE, accent: 0x8a8a92, scale: 1, variant: 'warrior' } },
    { id: 'gw_death_knight', name: 'Death Knight', hp: 420, armor: 5, armorType: 'heavy', dmg: 26, attackType: 'normal', range: 0.5, cooldown: 1.2, speed: 2.8, radius: 0.34, bounty: 3,
      model: { shape: 'skeleton', body: 0xc8c0b0, accent: 0x8ad0f0, scale: 1.12, variant: 'knight' } },
    { id: 'gw_vampire', name: 'Vampire', hp: 450, armor: 3, armorType: 'heavy', dmg: 26, attackType: 'pierce', range: 0.5, cooldown: 1.2, speed: 3.2, radius: 0.32, bounty: 6,
      lifesteal: 0.4,
      model: { shape: 'vampire', body: 0x2a1a22, accent: 0xb02a3a, scale: 1 } },
    { id: 'gw_vampire_lord', name: 'Vampire Lord', hp: 620, armor: 4, armorType: 'heavy', dmg: 40, attackType: 'pierce', range: 0.5, cooldown: 1.0, speed: 3.1, radius: 0.36, bounty: 12,
      lifesteal: 0.5, summon: { unit: 'gw_bat', count: 2, every: 16, ttl: 18 },
      model: { shape: 'vampire', body: 0x1a0a12, accent: 0xd02a3a, scale: 1.15, variant: 'lord' } },
    { id: 'gw_bat', name: 'Vampire Bat', hp: 90, armor: 0, armorType: 'light', dmg: 8, attackType: 'pierce', range: 0.6, cooldown: 0.9, speed: 4.0, radius: 0.24, bounty: 1, air: true, targetsAir: true,
      lifesteal: 0.3,
      model: { shape: 'bat', body: 0x3a2a32, accent: 0xb02a3a, scale: 0.8 } },
    { id: 'gw_banshee', name: 'Banshee', hp: 340, armor: 2, armorType: 'light', dmg: 40, attackType: 'magic', range: 3.5, cooldown: 1.4, speed: 3.0, radius: 0.32, bounty: 7, targetsAir: true,
      magicResist: 0.3, poison: { dps: 0, duration: 3, slow: 0.3 }, aura: { stat: 'dmg', value: -0.15, radius: 4, target: 'enemy' },
      model: { shape: 'banshee', body: 0x9ad0c0, accent: 0xe0fff8, scale: 1.05 } },
    { id: 'gw_flesh_golem', name: 'Flesh Golem', hp: 1000, armor: 8, armorType: 'medium', dmg: 58, attackType: 'siege', range: 0.6, cooldown: 1.7, speed: 2.4, radius: 0.55, bounty: 14,
      bonusVs: { vs: 'structure', mult: 1.5 }, slam: { every: 4, dmg: 90, radius: 1.4 },
      model: { shape: 'fleshgolem', body: 0xb08a7a, accent: 0x6a2a22, scale: 1.4 } },
    { id: 'gw_bone_wyrm', name: 'Bone Wyrm', hp: 1150, armor: 5, armorType: 'light', dmg: 60, attackType: 'normal', range: 3.25, cooldown: 1.8, speed: 3.0, radius: 0.55, bounty: 16, air: true, targetsAir: true,
      splash: 1.2, poison: { dps: 0, duration: 3, slow: 0.3 },
      model: { shape: 'bonewyrm', body: BONE, accent: 0x8ad0f0, scale: 1.45 } },
  ],
};
