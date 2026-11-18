import type { FactionDef } from '../types';

const BRASS = 0xb08a4a;
const RUST = 0x8a4a2a;
const PLATE = 0x6a6a72;

/**
 * Cogspark Syndicate: goblin tinkers and their machines. Tree and stat ratios follow the classic
 * "mechanical" castle-fight race (flamegunners with line damage, a tank factory with three upgrade
 * lines, anti-air rotorcraft, armoured golems, suicide goblins, shield generators, a bouncing
 * energy tower, a scrap heap that mends buildings), re-themed and with the Syndicate's own names,
 * look and champion. Lots of splash and armour, few long-range or magic attacks.
 */
export const COGSPARK: FactionDef = {
  id: 'cogspark',
  name: 'Cogspark Syndicate',
  desc: 'Goblin machines: splash, plating and explosions. Tanks, golems, rotorcraft and suicide goblins.',
  color: 0xd88a2a,
  traits: [
    'Riveted plating: all buildings have +2 armour',
    'Tank plating: tanks block a flat part of every hit',
    'Splash everywhere: flamegunners, shredders and assault tanks hit whole groups',
    'Boom: Lunatic Goblins run in and blow themselves up next to enemy units and buildings',
    'Scrap heaps mend your buildings; shield generators plate your army',
  ],
  trait: { buildingArmor: 2 },
  build: [
    'cs_gun_smith', 'cs_tank_factory', 'cs_aircraft_factory', 'cs_golem_factory',
    'cs_demolition_lab', 'cs_shield_generator', 'cs_energy_tower', 'cs_scrap_heap',
    'cs_scrap_exchange', 'cs_goliath_works',
  ],
  buildings: [
    // ---------------------------------------------------------------- flamegunners
    {
      id: 'cs_gun_smith', name: 'Gun Smith', faction: 'cogspark', cost: 95, hp: 650, armor: 2, buildTime: 8, size: 2,
      desc: 'Arms Flamegunners: short-range flame throwers that scorch the whole group in front of them. Can\'t hit flyers. Upgrades into Arsenal.',
      spawn: { unit: 'cs_flamegunner', count: 1, interval: 21 },
      upgrades: ['cs_arsenal'],
      model: { style: 'factory', wall: PLATE, roof: RUST, height: 20 },
    },
    {
      id: 'cs_arsenal', name: 'Arsenal', faction: 'cogspark', cost: 140, hp: 900, armor: 3, buildTime: 9, size: 2, upgradeOnly: true,
      desc: 'Arms Flame Sergeants: wider flames, and every 4th attack lobs a grenade that bursts around the target.',
      spawn: { unit: 'cs_flame_sergeant', count: 1, interval: 29 },
      model: { style: 'factory', wall: PLATE, roof: 0xa03a1a, height: 24 },
    },
    // ---------------------------------------------------------------- tanks
    {
      id: 'cs_tank_factory', name: 'Tank Factory', faction: 'cogspark', cost: 115, hp: 700, armor: 3, buildTime: 9, size: 2,
      desc: 'Builds Light Tanks: ranged, heavy armour, their plating blocks 3 damage of every hit. Can\'t hit flyers. Upgrades into Mine Layer, Assault Tank or Heavy Tank Factory.',
      spawn: { unit: 'cs_light_tank', count: 1, interval: 22 },
      upgrades: ['cs_mine_factory', 'cs_assault_factory', 'cs_heavy_factory'],
      model: { style: 'factory', wall: PLATE, roof: BRASS, height: 18 },
    },
    {
      id: 'cs_mine_factory', name: 'Mine Layer Factory', faction: 'cogspark', cost: 120, hp: 900, armor: 4, buildTime: 9, size: 2, upgradeOnly: true,
      desc: 'Builds Mine Layers: close-range tanks whose every 4th attack drops a mine that blasts the ground around the target.',
      spawn: { unit: 'cs_mine_layer', count: 1, interval: 27 },
      model: { style: 'factory', wall: PLATE, roof: 0x7a6a3a, height: 20 },
    },
    {
      id: 'cs_assault_factory', name: 'Assault Tank Factory', faction: 'cogspark', cost: 150, hp: 900, armor: 4, buildTime: 10, size: 2, upgradeOnly: true,
      desc: 'Builds Assault Tanks: long-range siege shells that splash over groups and crack buildings.',
      spawn: { unit: 'cs_assault_tank', count: 1, interval: 31 },
      model: { style: 'factory', wall: PLATE, roof: 0x9a5a2a, height: 22 },
    },
    {
      id: 'cs_heavy_factory', name: 'Heavy Tank Factory', faction: 'cogspark', cost: 150, hp: 1000, armor: 5, buildTime: 10, size: 2, upgradeOnly: true,
      desc: 'Builds Heavy Tanks: thick plating blocks 6 damage of every hit. Upgrades (with a sapphire) into the Rocket Tank Factory.',
      spawn: { unit: 'cs_heavy_tank', count: 1, interval: 31 },
      upgrades: ['cs_rocket_factory'],
      model: { style: 'factory', wall: 0x5a5a62, roof: BRASS, height: 22 },
    },
    {
      id: 'cs_rocket_factory', name: 'Rocket Tank Factory', faction: 'cogspark', cost: 230, sapphires: 1, hp: 1200, armor: 5, buildTime: 13, size: 2, upgradeOnly: true,
      desc: 'ELITE (costs a sapphire): builds Rocket Tanks, heavy tanks that also fire anti-air rockets.',
      spawn: { unit: 'cs_rocket_tank', count: 1, interval: 34 },
      model: { style: 'factory', wall: 0x4a4a52, roof: 0xe0a040, height: 26 },
    },
    // ---------------------------------------------------------------- air
    {
      id: 'cs_aircraft_factory', name: 'Aircraft Factory', faction: 'cogspark', cost: 90, hp: 550, armor: 2, buildTime: 8, size: 2,
      desc: 'Launches Rotorcopters: flyers that shoot only enemy flyers; every 3rd burst stuns. Upgrades into Bomber Factory.',
      spawn: { unit: 'cs_rotorcopter', count: 1, interval: 21 },
      upgrades: ['cs_bomber_factory'],
      model: { style: 'hangar', wall: PLATE, roof: BRASS, height: 28 },
    },
    {
      id: 'cs_bomber_factory', name: 'Bomber Factory', faction: 'cogspark', cost: 140, hp: 850, armor: 3, buildTime: 9, size: 2, upgradeOnly: true,
      desc: 'Launches Gyrocopters: tougher flyers that shoot flyers and bomb ground units; every 3rd attack stuns.',
      spawn: { unit: 'cs_gyrocopter', count: 1, interval: 28 },
      model: { style: 'hangar', wall: PLATE, roof: 0xd0a050, height: 32 },
    },
    // ---------------------------------------------------------------- golems & shredders
    {
      id: 'cs_golem_factory', name: 'Golem Factory', faction: 'cogspark', cost: 160, hp: 900, armor: 4, buildTime: 11, size: 2,
      desc: 'Forges Iron Golems: heavily armoured brawlers that pulverise the ground every 4th blow and stun every 7th. Upgrades into Shredder Works or (with a sapphire) the Adamant Forge.',
      spawn: { unit: 'cs_iron_golem', count: 1, interval: 25 },
      upgrades: ['cs_shredder_works', 'cs_adamant_forge'],
      model: { style: 'factory', wall: PLATE, roof: 0x5a5a6a, height: 24 },
    },
    {
      id: 'cs_shredder_works', name: 'Shredder Works', faction: 'cogspark', cost: 170, hp: 1000, armor: 4, buildTime: 10, size: 2, upgradeOnly: true,
      desc: 'Assembles Goblin Shredders: spinning blades that cut through the whole crowd around them; every 4th cut is critical.',
      spawn: { unit: 'cs_shredder', count: 1, interval: 30 },
      model: { style: 'factory', wall: PLATE, roof: RUST, height: 26 },
    },
    {
      id: 'cs_adamant_forge', name: 'Adamant Forge', faction: 'cogspark', cost: 250, sapphires: 1, hp: 1300, armor: 5, buildTime: 13, size: 2, upgradeOnly: true,
      desc: 'ELITE (costs a sapphire): forges Adamant Golems, near-indestructible plating; every 2nd blow stuns and every 3rd pulverises.',
      spawn: { unit: 'cs_adamant_golem', count: 1, interval: 38 },
      model: { style: 'factory', wall: 0x8a8a9a, roof: 0x3a8ab0, height: 30 },
    },
    // ---------------------------------------------------------------- explosives
    {
      id: 'cs_demolition_lab', name: 'Demolition Lab', faction: 'cogspark', cost: 120, hp: 600, armor: 2, buildTime: 9, size: 2,
      desc: 'Releases two Lunatic Goblins at a time: fast and fragile, they run into the enemy and explode, hitting every unit and building nearby.',
      spawn: { unit: 'cs_lunatic', count: 2, interval: 24 },
      model: { style: 'lab', wall: RUST, roof: 0xe0c040, height: 18 },
    },
    // ---------------------------------------------------------------- utility
    {
      id: 'cs_shield_generator', name: 'Shield Generator', faction: 'cogspark', cost: 130, hp: 600, armor: 2, buildTime: 8, size: 2,
      desc: 'Aura: allied units within 7 tiles get an energy shield, +2 armour. Upgrades into Greater Shield Generator.',
      aura: { stat: 'armor', value: 2, radius: 7, target: 'ally' },
      upgrades: ['cs_greater_shield'],
      model: { style: 'generator', wall: PLATE, roof: 0x4a8ad0, height: 30 },
    },
    {
      id: 'cs_greater_shield', name: 'Greater Shield Generator', faction: 'cogspark', cost: 140, hp: 800, armor: 3, buildTime: 8, size: 2, upgradeOnly: true,
      desc: 'Aura: allied units within 7 tiles get a strong energy shield, +4 armour.',
      aura: { stat: 'armor', value: 4, radius: 7, target: 'ally' },
      model: { style: 'generator', wall: PLATE, roof: 0xd04a4a, height: 34 },
    },
    {
      id: 'cs_energy_tower', name: 'Energy Tower', faction: 'cogspark', cost: 160, hp: 1200, armor: 6, buildTime: 12, size: 2,
      desc: 'Defensive tower: energy bolts that bounce between 3 enemies, air and ground, within 6.5 tiles.',
      attack: { dmg: 62, attackType: 'magic', range: 6.5, cooldown: 1.4, targetsAir: true, chain: 3 },
      model: { style: 'tesla', wall: PLATE, roof: 0x5ad0e0, height: 44 },
    },
    {
      id: 'cs_scrap_heap', name: 'Spare Part Heap', faction: 'cogspark', cost: 130, hp: 700, armor: 2, buildTime: 8, size: 2,
      desc: 'Tinkers mend your team\'s buildings and castle within 7 tiles by 6 HP per second.',
      mend: { hps: 6, radius: 7 },
      model: { style: 'scrapheap', wall: RUST, roof: PLATE, height: 26 },
    },
    {
      id: 'cs_scrap_exchange', name: 'Scrap Exchange', faction: 'cogspark', cost: 170, hp: 550, armor: 1, buildTime: 10, size: 2,
      desc: 'Sells salvage: your income is increased by 15% (stacks up to +30%).',
      incomeBonus: 0.15,
      model: { style: 'exchange', wall: BRASS, roof: 0x3a3a3a, height: 18 },
    },
    // ---------------------------------------------------------------- special
    {
      id: 'cs_goliath_works', name: 'Goliath Works', faction: 'cogspark', cost: 400, hp: 2000, armor: 6, buildTime: 20, size: 2, special: true, sapphires: 1,
      desc: 'SPECIAL: costs a sapphire. Assembles a Goliath: a walking fortress with plating and splash-damage missiles (strong against medium armour) that also hit flyers. Upgrades twice.',
      spawn: { unit: 'cs_goliath', count: 1, interval: 45 },
      upgrades: ['cs_goliath_works_2'],
      model: { style: 'foundry', wall: PLATE, roof: BRASS, height: 54 },
    },
    {
      id: 'cs_goliath_works_2', name: 'Goliath Assembly Line', faction: 'cogspark', cost: 350, hp: 2600, armor: 7, buildTime: 15, size: 2, special: true, upgradeOnly: true,
      desc: 'Assembles the Goliath Mk II more often.',
      spawn: { unit: 'cs_goliath_2', count: 1, interval: 40 },
      upgrades: ['cs_goliath_works_3'],
      model: { style: 'foundry', wall: PLATE, roof: 0xd0a040, height: 60 },
    },
    {
      id: 'cs_goliath_works_3', name: 'Doom Foundry', faction: 'cogspark', cost: 500, hp: 3400, armor: 8, buildTime: 15, size: 2, special: true, upgradeOnly: true,
      desc: 'Assembles the Doomwalker: the heaviest plating and a rocket barrage over whole groups.',
      spawn: { unit: 'cs_goliath_3', count: 1, interval: 35 },
      model: { style: 'foundry', wall: 0x4a4a52, roof: 0xe05a2a, height: 66 },
    },
  ],
  units: [
    // flamegunners: short-range line splash
    { id: 'cs_flamegunner', name: 'Flamegunner', hp: 320, armor: 3, armorType: 'light', dmg: 16, attackType: 'normal', range: 1, cooldown: 1.0, speed: 2.7, radius: 0.32, bounty: 4,
      splash: 1,
      model: { shape: 'goblin', body: RUST, accent: 0xffa040, scale: 1.1, variant: 'flamer' } },
    { id: 'cs_flame_sergeant', name: 'Flame Sergeant', hp: 470, armor: 5, armorType: 'light', dmg: 27, attackType: 'normal', range: 1, cooldown: 1.0, speed: 2.7, radius: 0.36, bounty: 8,
      splash: 1.2, slam: { every: 4, dmg: 45, radius: 1.5 },
      model: { shape: 'goblin', body: 0xa03a1a, accent: 0xffc050, scale: 1.25, variant: 'sergeant' } },
    // tanks: plated, can't hit flyers (except rocket tanks)
    { id: 'cs_light_tank', name: 'Light Tank', hp: 280, armor: 5, armorType: 'heavy', dmg: 22, attackType: 'normal', range: 3.75, cooldown: 1.3, speed: 2.7, radius: 0.38, bounty: 4,
      block: 3,
      model: { shape: 'tank', body: PLATE, accent: BRASS, scale: 0.95, variant: 'light' } },
    { id: 'cs_mine_layer', name: 'Mine Layer', hp: 430, armor: 6, armorType: 'heavy', dmg: 30, attackType: 'normal', range: 0.8, cooldown: 1.3, speed: 3.0, radius: 0.4, bounty: 7,
      block: 3, slam: { every: 4, dmg: 80, radius: 1.4 },
      model: { shape: 'tank', body: 0x7a6a3a, accent: 0xe0c040, scale: 1.05, variant: 'mine' } },
    { id: 'cs_assault_tank', name: 'Assault Tank', hp: 500, armor: 7, armorType: 'heavy', dmg: 42, attackType: 'siege', range: 5.5, cooldown: 1.6, speed: 2.7, radius: 0.42, bounty: 9,
      block: 4, splash: 1.2,
      model: { shape: 'tank', body: 0x9a5a2a, accent: PLATE, scale: 1.15, variant: 'assault' } },
    { id: 'cs_heavy_tank', name: 'Heavy Tank', hp: 580, armor: 8, armorType: 'heavy', dmg: 46, attackType: 'normal', range: 4, cooldown: 1.3, speed: 2.7, radius: 0.45, bounty: 10,
      block: 6,
      model: { shape: 'tank', body: 0x5a5a62, accent: BRASS, scale: 1.2, variant: 'heavy' } },
    { id: 'cs_rocket_tank', name: 'Rocket Tank', hp: 1300, armor: 8, armorType: 'heavy', dmg: 72, attackType: 'normal', range: 4, cooldown: 1.3, speed: 2.7, radius: 0.47, bounty: 20,
      block: 6, targetsAir: true,
      model: { shape: 'tank', body: 0x4a4a52, accent: 0xe0a040, scale: 1.3, variant: 'rocket' } },
    // air
    { id: 'cs_rotorcopter', name: 'Rotorcopter', hp: 230, armor: 3, armorType: 'light', dmg: 22, attackType: 'pierce', range: 5, cooldown: 1.0, speed: 3.4, radius: 0.34, bounty: 3,
      air: true, targetsAir: true, airOnly: true, bash: { every: 3, stun: 1.2 },
      model: { shape: 'copter', body: BRASS, accent: PLATE, scale: 0.95, variant: 'rotor' } },
    { id: 'cs_gyrocopter', name: 'Gyrocopter', hp: 460, armor: 5, armorType: 'light', dmg: 30, attackType: 'pierce', range: 4.5, cooldown: 1.0, speed: 3.4, radius: 0.4, bounty: 8,
      air: true, targetsAir: true, bash: { every: 3, stun: 1 },
      model: { shape: 'copter', body: 0xd0a050, accent: RUST, scale: 1.2, variant: 'gyro' } },
    // golems & shredders
    { id: 'cs_iron_golem', name: 'Iron Golem', hp: 400, armor: 9, armorType: 'medium', dmg: 38, attackType: 'normal', range: 0.5, cooldown: 1.5, speed: 2.5, radius: 0.44, bounty: 7,
      slam: { every: 4, dmg: 40, radius: 1.2 }, bash: { every: 7, stun: 1.5 },
      model: { shape: 'golem', body: PLATE, accent: 0xd06a3a, scale: 1.1, variant: 'iron' } },
    { id: 'cs_shredder', name: 'Goblin Shredder', hp: 720, armor: 8, armorType: 'medium', dmg: 44, attackType: 'pierce', range: 0.6, cooldown: 1.5, speed: 3.0, radius: 0.46, bounty: 11,
      splash: 1, crit: { every: 4, mult: 1.5 },
      model: { shape: 'shredder', body: RUST, accent: 0xd0d0d0, scale: 1.25 } },
    { id: 'cs_adamant_golem', name: 'Adamant Golem', hp: 720, armor: 12, armorType: 'medium', dmg: 70, attackType: 'normal', range: 0.6, cooldown: 1.5, speed: 2.5, radius: 0.5, bounty: 22,
      bash: { every: 2, stun: 1 }, slam: { every: 3, dmg: 85, radius: 1.4 },
      model: { shape: 'golem', body: 0x8a8a9a, accent: 0x3a8ab0, scale: 1.35, variant: 'adamant' } },
    // explosives
    { id: 'cs_lunatic', name: 'Lunatic Goblin', hp: 130, armor: 0, armorType: 'light', dmg: 175, attackType: 'siege', range: 0.5, cooldown: 1, speed: 3.6, radius: 0.28, bounty: 2,
      suicide: { radius: 1.5 },
      model: { shape: 'goblin', body: 0x8a5a2a, accent: 0xff4020, scale: 0.95, variant: 'bomber' } },
    // champions
    { id: 'cs_goliath', name: 'Goliath', hp: 2300, armor: 7, armorType: 'heavy', dmg: 60, attackType: 'normal', range: 4.5, cooldown: 1.5, speed: 2.5, radius: 0.62, bounty: 40, targetsAir: true,
      block: 6, splash: 1.2,
      model: { shape: 'mech', body: PLATE, accent: BRASS, scale: 1.7, variant: 'mk1' } },
    { id: 'cs_goliath_2', name: 'Goliath Mk II', hp: 3400, armor: 8, armorType: 'heavy', dmg: 84, attackType: 'normal', range: 4.5, cooldown: 1.45, speed: 2.6, radius: 0.68, bounty: 55, targetsAir: true,
      block: 7, splash: 1.4,
      model: { shape: 'mech', body: 0x5a5a62, accent: 0xd0a040, scale: 1.85, variant: 'mk2' } },
    { id: 'cs_goliath_3', name: 'Doomwalker', hp: 4500, armor: 9, armorType: 'heavy', dmg: 112, attackType: 'normal', range: 5, cooldown: 1.4, speed: 2.7, radius: 0.78, bounty: 80, targetsAir: true,
      block: 8, splash: 1.7,
      model: { shape: 'mech', body: 0x4a4a52, accent: 0xe05a2a, scale: 2.0, variant: 'doom' } },
  ],
};
