# Factions

Every faction is a copy of a race of the author's Warcraft III castle-fight map (`castleFight.w3x`): the same build
list, upgrade trees, gold and lumber costs, hit points, armour, damage, ranges, cooldowns, spawn times, bounties and
abilities. Only names, looks and a few mechanics that need Warcraft's engine are our own (see below).

This file is generated from the data: `npm run docs:factions`.

## How the map's values were converted

| Map value | Castle Defense |
|---|---|
| Hit points, armour, lumber, cooldown, spawn time | 1 : 1 |
| Gold (prices, bounties, start gold, income, bonuses) | × 1.2 (`GOLD_FACTOR`); the faction files keep the map's values |
| Damage | base + average of the dice (`ua1b + d × (s + 1) / 2`) |
| Range, movement speed, areas | ÷ 100 (500 range → 5 tiles, 270 speed → 2.7); melee (≤ 128) keeps our melee reach |
| Bounty | base + average of the dice |
| Armour and attack types | the map's damage table (normal, pierce, siege, magic, chaos, hero, spells × light, medium, heavy, fortified, hero, divine, unarmored) |
| Chance abilities (crit, bash, evade, …) | real random chance, seeded and side-symmetric |
| Buildings without hit points / armour in the map | 1200 HP / 5 armour (the editor default of their base building); missing gold is 140 (× 1.2) |
| Legendaries (food 1) | need a sapphire (one per round; more can be bought) |
| Income | 6 + 2% of every building's value (some buildings other rates) every 10 s; Treasure Boxes +25%, each further one 15% less |
| Lumber | 125 at the start; a finished building or upgrade gives its value in lumber (most buildings) |

Abilities that rely on Warcraft's mana and spell system were turned into our closest mechanic: a cooldown spell of
a unit becomes a chance per attack with the same average rate (e.g. a 14 s entangle on a 1.6 s attacker → 11.5%
per hit), and target-picking spells of buildings pick a random or the nearest valid target anywhere on the map.

## Ironvow Order (the map's Human race)

The human kingdom: footmen and evasive defenders, crusaders, paladins and the legendary Holy Warrior, gryphon riders, warlocks, snipers, marksmen and heavy gunners, mortars, the Gjallarhorn, long-range artillery and the Heroic Shrine.

- Crusaders and paladins cleave and bash; the Holy Warrior (legendary) armours everyone around it by 7
- Defenders evade, and take only 40% of ranged and 50% of spell damage
- Snipers upgrade into marksmen that shred flyers or heavy gunners with splash
- The Gjallarhorn speeds up the attacks of your units around it by 66%; the Artillery shells the enemy base
- Heroic Shrine (legendary): every unit your team trains has a 16% chance to come with an extra one

### Buildings

| Building | Cost | Trains | Upgrades into | Abilities |
|---|---|---|---|---|
| Militia Hall | 120 | Militia every 20 s | Shield Hall |  |
| → Shield Hall | 210 | Shieldbearer every 28 s |  |  |
| Crossbow Lodge | 168 | Crossbowman every 22 s | Arbalest Range, Powder Range |  |
| → Arbalest Range | 192 | Arbalester every 30 s |  |  |
| → Powder Range | 216 | Grenadier every 31 s |  |  |
| Siege Yard | 252 | Mangonel every 25 s |  |  |
| Thunderhawk Roost | 300 | Thunderhawk every 27 s |  |  |
| Chapel | 318 | Lancer every 28 s | Cathedral |  |
| → Cathedral | 312 | Vow Knight every 41 s | Paladin Chapter |  |
| → → Paladin Chapter | 240 + 500 lumber · legendary | Paladin every 51 s |  |  |
| Hall of Warlocks | 360 | Warlock every 30 s |  |  |
| Bastion Tower | 180 + 300 lumber |  |  | Attack: 45 pierce every 0.5 s, range 9.5 |
| Siege Battery | 240 + 360 lumber |  |  | Bombard: every 15s a shell hits the nearest enemy building anywhere on the map (350 siege damage in radius 3.2, half to units) |
| War Horn | 270 + 750 lumber |  |  | Aura: +66% haste for allies within 8 tiles |
| Treasure Chest | 420 + 500 lumber |  |  |  |
| Sun Citadel | 660 + 1500 lumber · legendary |  |  | Call to arms: whenever your team trains a unit, a 16% chance that an extra one is trained for you (a second shrine stacks once; not legendaries) |

### Units

| Unit | HP | Armour | Damage | Cooldown | Range | Speed | Bounty | Abilities |
|---|---|---|---|---|---|---|---|---|
| Militia | 250 | 4 heavy | 25 normal | 1.4 s | 0.4 | 2.7 | 4 |  |
| Shieldbearer | 575 | 7 heavy | 53 normal | 1.4 s | 0.4 | 2.5 | 9 | Regenerates 1.8 HP/s; Evasion: 15% chance that an attack against it misses; Shield wall: takes 60% less damage from ranged attacks; Spell resistance: takes 50% less magic damage |
| Lancer | 600 | 6 heavy | 60 hero | 1.4 s | 0.5 | 3.4 | 9 | Aura: allies within 1.5 tiles get +16 HP/s regeneration; Regenerates 1 HP/s; Bash: 20% chance to stun for 2s and deal 25 extra damage; Cleaving attack: each hit deals 25% of its damage to all enemies within 1.8 tiles of the target |
| Vow Knight | 850 | 9 heavy | 95 hero | 1.4 s | 0.5 | 3.4 | 16 | Aura: allies within 4 tiles get +3 armour; Regenerates 1 HP/s; Bash: 20% chance to stun for 2s and deal 25 extra damage; Cleaving attack: each hit deals 25% of its damage to all enemies within 1.8 tiles of the target |
| Paladin | 1400 | 12 heavy | 135 hero | 1.6 s | 0.5 | 3 | 26 | Aura: allies within 4 tiles get +7 armour; Regenerates 1 HP/s; Bash: 50% chance to stun for 1s and deal 100 extra damage; Cleaving attack: each hit deals 40% of its damage to all enemies within 2 tiles of the target; Spell resistance: takes 70% less magic damage |
| Thunderhawk (flying) | 500 | 2 medium | 46 magic | 2 s | 4.5 | 3.4 | 8 | Regenerates 1 HP/s; Bash: 15% chance to stun for 2s and deal 25 extra damage; Chain lightning: 10% chance to call lightning (150 damage, 5 targets) |
| Warlock | 320 | 1 unarmored | 30 chaos | 1.8 s | 1.6 | 3 | 9 | Regenerates 1.5 HP/s; Pulverize: 15% chance to deal 270 damage to all enemies within 3.7 tiles |
| Crossbowman | 270 | 0 medium | 34 pierce | 1.6 s | 5 | 2.6 | 5 | Critical strike: 10% chance to deal 1.5× damage |
| Arbalester | 450 | 1 medium | 69 pierce | 1 s | 8 | 2 | 10 | Anti-air: attacks flyers only; Critical strike: 40% chance to deal 3× damage |
| Grenadier | 500 | 3 medium | 80 pierce | 1.7 s | 5.5 | 2.5 | 10 | Splash damage (radius 1.8); Critical strike: 20% chance to deal 2× damage |
| Mangonel | 280 | 0 light | 68 siege | 3.2 s | 10 | 2.2 | 7 | Splash damage (radius 2.2) |

## Thornwild Circle (the map's Nature race)

The wild forest: poisonous spiders that split when they die, furbolg shamans, dryads and keepers of the grove with their treants, slumbering bears, emerald dragons, mountain giants, the Ancient of Gale, the Ancient Guardian and the Ancient of Wonders.

- Spiders poison and slow, web their prey, and split into smaller spiders when they die
- Furbolgs, dryads and keepers heal; keepers summon treants that return melee damage
- Bears cleave, bash and crit; mountain giants shrug off 25 damage from every hit
- The Ancient of Gale sends tornadoes and the Ancient Guardian banishes enemies, anywhere on the map
- Legendaries: the Ancient Keeper and the Ancient of Wonders (forest spirits that stun and explode)

### Buildings

| Building | Cost | Trains | Upgrades into | Abilities |
|---|---|---|---|---|
| Spider Clutch | 204 | Black Spider every 23 s | Spider Nest |  |
| → Spider Nest | 240 | Giant Spider every 33 s | Brood Hatchery |  |
| → → Brood Hatchery | 252 | Brood Mother every 44 s |  |  |
| Furbolg Hut | 240 | Furbolg Shaman every 25 s | Furbolg Abode |  |
| → Furbolg Abode | 240 | Furbolg Elder every 35 s |  |  |
| Ancient of Growth | 264 | Dryad every 26 s | Ancient of Life |  |
| → Ancient of Life | 264 | Keeper of the Grove every 37 s | Ancient of Eternity |  |
| → → Ancient of Eternity | 480 + 400 lumber · legendary | Ancient Keeper every 57 s |  |  |
| Ancient of Slumber | 312 | Bear every 28 s | Ancient of Hibernation |  |
| → Ancient of Hibernation | 264 | Ancient Bear every 39 s |  |  |
| Emerald Dragon Roost | 372 | Jade Wyrm every 30 s |  |  |
| Monolith | 528 | Stonehide Giant every 37 s |  |  |
| Ancient Protector | 252 + 300 lumber |  |  | Attack: 105 siege every 1.5 s, range 7, splash 1.8 |
| Ancient Guardian | 300 + 500 lumber |  |  | Banish: every 12s a random enemy unit anywhere on the map turns ethereal for 12s: it can't attack and takes 66% more magic and spell damage |
| Treasure Chest | 420 + 500 lumber |  |  |  |
| Ancient of Gale | 420 + 650 lumber |  |  | Cyclone: every 14s a storm settles on the nearest enemy anywhere on the map for 7s (40 damage/s and 25% slow in radius 2.5) |
| Ancient of Wonders | 780 + 1800 lumber · legendary | 4× Forest Spirit every 40 s |  |  |

### Units

| Unit | HP | Armour | Damage | Cooldown | Range | Speed | Bounty | Abilities |
|---|---|---|---|---|---|---|---|---|
| Black Spider | 250 | 1 unarmored | 31 pierce | 1 s | 0.5 | 3.3 | 2 | Poison: 5 dmg/s for 10s and 10% slow; Regenerates 1.5 HP/s |
| Giant Spider | 500 | 4 unarmored | 70 pierce | 1.3 s | 0.5 | 3.3 | 6 | Poison: 8 dmg/s for 10s and 15% slow; On death: releases 2 Forest Spiders; Regenerates 3 HP/s; Bash: 7% chance to stun for 10s |
| Brood Mother | 800 | 6 unarmored | 100 pierce | 1.5 s | 0.5 | 3.3 | 10 | Poison: 12 dmg/s for 10s and 25% slow; On death: releases 1 Giant Spider; Regenerates 5 HP/s; Bash: 8% chance to stun for 12s |
| Forest Spider | 150 | 0 unarmored | 11 pierce | 0.8 s | 0.5 | 3.3 | 1 | Regenerates 1 HP/s |
| Furbolg Shaman | 450 | 1 light | 53 magic | 1.4 s | 4 | 2.8 | 7 | Heals allies for 200 HP; Regenerates 1 HP/s |
| Furbolg Elder | 650 | 3 light | 73 magic | 1.4 s | 4.5 | 2.8 | 13 | Heals allies for 400 HP; Regenerates 2 HP/s |
| Dryad | 500 | 3 medium | 60 pierce | 1.6 s | 4 | 3.1 | 8 | Heals allies for 75 HP; Regenerates 1 HP/s; Spell resistance: takes 15% less magic damage |
| Keeper of the Grove | 700 | 5 medium | 90 pierce | 1.2 s | 4.5 | 3 | 14 | Heals allies for 150 HP; Regenerates 1.5 HP/s; Spell resistance: takes 20% less magic damage; Summons 2 Saplings every 25s (they last 40s) |
| Ancient Keeper | 1000 | 7 medium | 145 chaos | 2.1 s | 5.5 | 2.9 | 25 | Aura: allies within 3.5 tiles get +15 HP/s regeneration; Regenerates 5 HP/s; Immune: stuns, slows, hexes, freezes and control have no effect; Evasion: 25% chance that an attack against it misses; Summons 5 Saplings every 30s (they last 40s) |
| Bear | 675 | 5 unarmored | 85 normal | 1.8 s | 0.4 | 2.7 | 9 | Regenerates 1 HP/s; Critical strike: 20% chance to deal 2× damage; Bash: 15% chance to stun for 0.5s and deal 50 extra damage; Cleaving attack: each hit deals 30% of its damage to all enemies within 1.5 tiles of the target |
| Ancient Bear | 1100 | 8 unarmored | 115 normal | 2 s | 0.5 | 2.7 | 15 | Regenerates 2 HP/s; Critical strike: 30% chance to deal 2× damage; Bash: 30% chance to stun for 1s and deal 65 extra damage; Cleaving attack: each hit deals 35% of its damage to all enemies within 1.8 tiles of the target |
| Jade Wyrm (flying) | 700 | 5 heavy | 65 chaos | 1.4 s | 2.5 | 3.3 | 10 | Aura: enemies within 1.5 tiles get -6 armour; Splash damage (radius 1.5); Regenerates 1.5 HP/s |
| Stonehide Giant | 800 | 8 fortified | 150 normal | 1.8 s | 0.6 | 2.5 | 16 | Regenerates 4 HP/s; Pulverize: 30% chance to deal 200 damage to all enemies within 1.8 tiles; Hardened skin: blocks 25 damage of every attack |
| Sapling | 220 | 2 medium | 14 normal | 1.1 s | 0.4 | 2.8 | 3 |  |
| Forest Spirit (flying) | 50 | 0 light | 10 spells | 1 s | 0.5 | 3.5 | 1 | Bash: 50% chance to stun for 1.5s; Revenge: when it falls it explodes for 200 damage within 3.5 tiles |

## Shardbound Conclave (the map's Elemental race)

Elementals: water spirits that most attacks pass through, wind elementals that ground enemy flyers, fire elementals that split, lightning that arcs to several targets, earth elementals that hit harder the healthier they are, the legendary Master of Elements and the Linker.

- Liquid body: water elementals let 50–70% of attacks pass through them and resist spells; the greatest create mirror images
- Wind elementals slow enemy flyers; lightning elementals hit 3–5 targets and stun melee attackers
- Earth elementals deal extra damage the healthier they are and pulverize the ground
- The Obelisk of Elements enchants your units; mana generators speed up your ability buildings
- Legendaries: the Master of Elements and the Linker (fallen units heal the rest)

### Buildings

| Building | Cost | Trains | Upgrades into | Abilities |
|---|---|---|---|---|
| Gale Cage | 144 | Breeze Wisp every 21 s | Wind Monument |  |
| → Wind Monument | 216 | Gust Elemental every 30 s | Zephyr Spire |  |
| → → Zephyr Spire | 240 | Zephyr Lord every 40 s |  |  |
| Tidewell | 168 | Rill Spirit every 22 s | Tide Fountain |  |
| → Tide Fountain | 216 | Tide Spirit every 31 s | Deepwater Fountain |  |
| → → Deepwater Fountain | 222 | Deepwater Spirit every 40 s |  |  |
| Ember Altar | 240 | Ember Elemental every 25 s | Blaze Altar |  |
| → Blaze Altar | 264 | Blaze Elemental every 39 s | Spire of Elder Lore |  |
| → → Spire of Elder Lore | 360 + 400 lumber · legendary | Master of Elements every 54 s |  |  |
| Storm Pillar | 276 | Spark Elemental every 26 s | St. Elmo's Pillar |  |
| → St. Elmo's Pillar | 252 | Thunder Elemental every 37 s |  |  |
| Rock Pile | 300 | Stone Elemental every 27 s | Greater Fissure |  |
| → Greater Fissure | 312 | Mountain Elemental every 40 s |  |  |
| Mana Well | 240 + 250 lumber |  |  | Mana transfusion: your team's ability buildings recharge 15% faster (half for non-elemental buildings; up to 3 generators) |
| Elemental Guard Tower | 288 + 300 lumber |  |  | Attack: 95 chaos every 1.2 s, range 9 |
| Obelisk of Elements | 294 + 550 lumber |  |  | Enchantment: every 10s a random unit of yours (one without it first) gets a forged weapon (50% splash), a rock shield (+15 armor), haste (+75% attack speed) or rejuvenation (+450 HP) |
| Codex of Conjuration | 408 + 650 lumber |  | Codex of Storms, Codex of Meteors | Cyclone: every 15s a storm settles on the nearest enemy anywhere on the map for 5s (15 damage/s and 0% slow in radius 2.5) |
| → Codex of Storms | 0 |  |  | Cyclone: every 15s a storm settles on the nearest enemy anywhere on the map for 7s (30 damage/s and 0% slow in radius 2.5) |
| → Codex of Meteors | 0 |  |  | Meteor shower: every 15s meteors rain on the nearest enemy flyer anywhere on the map for 3s (100 damage/s to flyers in radius 2.5) |
| Treasure Chest | 420 + 500 lumber |  |  |  |
| Linker | 840 + 1600 lumber · legendary |  |  | Link: whenever a unit of your team dies, 50% of its life heals your wounded units |

### Units

| Unit | HP | Armour | Damage | Cooldown | Range | Speed | Bounty | Abilities |
|---|---|---|---|---|---|---|---|---|
| Rill Spirit | 300 | 1 medium | 32 normal | 1.6 s | 0.4 | 2.7 | 6 | Evasion: 50% chance that an attack against it misses; Spell resistance: takes 50% less magic damage |
| Tide Spirit | 500 | 3 medium | 65 normal | 1.6 s | 0.4 | 2.7 | 12 | Regenerates 1 HP/s; Evasion: 60% chance that an attack against it misses; Spell resistance: takes 60% less magic damage |
| Deepwater Spirit | 650 | 7 medium | 120 normal | 1.8 s | 0.5 | 2.7 | 18 | Regenerates 1.5 HP/s; Illusion: 20% chance per hit to create a mirror image (60% damage, takes double, 20s); Evasion: 70% chance that an attack against it misses; Spell resistance: takes 70% less magic damage |
| Breeze Wisp (flying) | 350 | 2 medium | 45 pierce | 1.5 s | 4 | 3 | 5 | Regenerates 1 HP/s |
| Gust Elemental (flying) | 550 | 4 medium | 65 pierce | 1.5 s | 4.5 | 3 | 11 | Aura: enemies within 5 tiles get -20% attack speed; Regenerates 1.5 HP/s |
| Zephyr Lord (flying) | 1300 | 9 medium | 83 pierce | 1.5 s | 4.5 | 3 | 17 | Aura: enemies within 5 tiles get -35% attack speed; Splash damage (radius 3); Regenerates 2.5 HP/s; Revenge: when it falls it explodes for 225 damage within 3.5 tiles |
| Ember Elemental | 625 | 5 heavy | 45 chaos | 1.3 s | 4 | 2.6 | 8 |  |
| Blaze Elemental | 900 | 7 heavy | 77 chaos | 1.5 s | 4.5 | 2.6 | 10 | Pulverize: 20% chance to deal 100 damage to all enemies within 1 tiles; Summons 1 Ember Elemental every 22.5s (they last 600s) |
| Master of Elements | 1200 | 8 unarmored | 100 magic | 1.7 s | 5 | 2.8 | 24 | Regenerates 3 HP/s; Pulverize: 21% chance to deal 150 damage to all enemies within 2.5 tiles; Spell resistance: takes 70% less magic damage |
| Spark Elemental | 525 | 3 light | 50 magic | 1.7 s | 3.5 | 2.6 | 9 | Regenerates 1 HP/s; Lightning shield: 15% chance to stun a melee attacker for 2s; Multi-shot: every volley strikes 3 enemies |
| Thunder Elemental | 800 | 9 light | 80 magic | 2.1 s | 4 | 2.6 | 16 | Regenerates 1.5 HP/s; Lightning shield: 30% chance to stun a melee attacker for 2s; Multi-shot: every volley strikes 5 enemies |
| Stone Elemental | 450 | 4 hero | 75 siege | 1.5 s | 0.5 | 2.4 | 8 | Regenerates 1 HP/s; Pulverize: 20% chance to deal 100 damage to all enemies within 2 tiles; Power of earth: up to +50 damage per hit, scaled by its remaining HP |
| Mountain Elemental | 950 | 8 hero | 150 siege | 1.8 s | 0.6 | 2.4 | 16 | Regenerates 2 HP/s; Pulverize: 25% chance to deal 200 damage to all enemies within 2 tiles; Power of earth: up to +100 damage per hit, scaled by its remaining HP |

## Cogspark Syndicate (the map's Mechanical race)

Goblin engineering: flamegunners, armoured tanks that shrug off small hits, mine layers, rotor- and gyrocopters hunting flyers, iron and adamant golems, shredders, lunatic goblins, the legendary Goliath, energy shields and the Power Plant.

- Tank armour: tanks take 12 / 18 / 24 less damage from every attack
- Copters hunt only flyers and bash them; rocket tanks and the Goliath fire anti-air rockets
- Golems resist spells and bash; the Adamant Golem and the Goliath (legendaries) are immune with 90% spell resistance
- Energy shields give armour and block hostile building abilities
- The Power Plant powers the buildings next to it: +2 armour, no freezing, stronger towers and units

### Buildings

| Building | Cost | Trains | Upgrades into | Abilities |
|---|---|---|---|---|
| Aircraft Factory | 192 | Rotorcopter every 23 s | Bomber Factory |  |
| → Bomber Factory | 216 | Gyrocopter every 32 s |  |  |
| Tank Factory | 216 | Light Tank every 24 s | Mine Layer Factory, Assault Tank Factory, Heavy Tank Factory |  |
| → Mine Layer Factory | 180 | Mine Layer every 31 s |  |  |
| → Assault Tank Factory | 240 | Assault Tank every 34 s |  |  |
| → Heavy Tank Factory | 240 | Heavy Tank every 34 s | Rocket Tank Factory |  |
| → → Rocket Tank Factory | 180 | Rocket Tank every 41 s |  |  |
| Demolition Lab | 240 | Lunatic Goblin every 22 s |  |  |
| Gun Smith | 264 | Flamegunner every 26 s | Arsenal |  |
| → Arsenal | 168 | Flame Sergeant every 33 s |  |  |
| Golem Factory | 324 | Iron Golem every 28 s | Adamant Forge |  |
| → Adamant Forge | 600 + 385 lumber · legendary | Adamant Golem every 53 s |  |  |
| Shredder Works | 450 | Goblin Shredder every 33 s | Goliath Works |  |
| → Goliath Works | 510 + 400 lumber · legendary | Goliath every 55 s |  |  |
| Shield Generator | 228 + 270 lumber |  | Greater Shield Generator | Energy shield: every 7s a random unit of yours (one without it first) gains +2 armor and a shield that blocks the next 1 hostile building ability |
| → Greater Shield Generator | 168 + 130 lumber |  |  | Energy shield: every 7s a random unit of yours (one without it first) gains +4 armor and a shield that blocks the next 2 hostile building abilities (the first block heals 100) |
| Energy Tower | 288 + 300 lumber |  |  | Attack: 75 chaos every 1.2 s, range 6; Bouncing shot: each shot jumps between 3 enemies |
| Spare Part Heap | 300 + 350 lumber |  |  | Mends your team's buildings and castle within 7 tiles by 6 HP/s |
| Power Plant | 408 + 650 lumber |  |  | Power plant: your buildings within 1.8 tiles get +2 armor and can't be frozen; towers deal +25% damage; units trained there get +100 HP, +2 armor and +20% damage |
| Treasure Chest | 420 + 500 lumber |  |  |  |

### Units

| Unit | HP | Armour | Damage | Cooldown | Range | Speed | Bounty | Abilities |
|---|---|---|---|---|---|---|---|---|
| Flamegunner | 500 | 4 light | 34 chaos | 0.9 s | 1 | 2.7 | 7 | Splash damage (radius 1.5) |
| Flame Sergeant | 700 | 7 light | 60 chaos | 0.9 s | 1 | 2.7 | 11 | Gale: slows its target by 50% for 3s; Splash damage (radius 1.5) |
| Light Tank | 400 | 5 heavy | 65 normal | 2 s | 3.8 | 2.7 | 6 | Hardened skin: blocks 12 damage of every attack |
| Mine Layer | 600 | 7 heavy | 90 normal | 2.1 s | 0.8 | 3 | 10 | Mines: buries a hidden mine every 5s (up to 4, each lasts 45s); an enemy ground unit stepping on one sets it off for 250 damage within 1.5 tiles; Hardened skin: blocks 12 damage of every attack |
| Assault Tank | 700 | 8 heavy | 105 chaos | 2.1 s | 5.5 | 2.7 | 12 | Splash damage (radius 1.5); Hardened skin: blocks 18 damage of every attack |
| Heavy Tank | 800 | 12 heavy | 130 normal | 2.1 s | 4 | 2.7 | 13 | Hardened skin: blocks 24 damage of every attack |
| Rocket Tank | 900 | 12 heavy | 160 normal | 2.1 s | 4 | 2.7 | 16 | Anti-air rockets: every 2s 1 rocket at random enemy flyers within 8.5 tiles (75 damage each); Hardened skin: blocks 24 damage of every attack |
| Rotorcopter (flying) | 300 | 4 light | 25 pierce | 1 s | 5 | 3.4 | 5 | Anti-air: attacks flyers only; Bash: 30% chance to stun for 1.2s and deal 40 extra damage |
| Gyrocopter (flying) | 625 | 6 light | 45 pierce | 1 s | 5 | 3.4 | 11 | Anti-air: attacks flyers only; Bash: 50% chance to stun for 1.2s and deal 60 extra damage |
| Iron Golem | 525 | 12 medium | 70 hero | 1.5 s | 0.5 | 2.5 | 9 | Bash: 15% chance to stun for 2s and deal 40 extra damage; Pulverize: 25% chance to deal 60 damage to all enemies within 1.5 tiles; Spell resistance: takes 30% less magic damage |
| Adamant Golem | 950 | 15 divine | 125 hero | 1.4 s | 0.6 | 2.5 | 24 | Bash: 50% chance to stun for 2s and deal 100 extra damage; Pulverize: 40% chance to deal 150 damage to all enemies within 1.5 tiles; Immune: stuns, slows, hexes, freezes and control have no effect; Spell resistance: takes 90% less magic damage |
| Goblin Shredder | 1000 | 9 medium | 85 pierce | 1.5 s | 0.6 | 3 | 12 | Cleaving attack: each hit deals 100% of its damage to all enemies within 1.6 tiles of the target; Revenge: when it falls it explodes for 50 damage within 3 tiles |
| Lunatic Goblin | 175 | 0 unarmored | 275 chaos | 0.4 s | 0.5 | 3.3 | 7 | Revenge: when it falls it explodes for 150 damage within 2.8 tiles; Suicide blast: its first attack explodes, hitting every enemy unit and building within 1.5 tiles (no bounty) |
| Goliath | 1950 | 20 unarmored | 75 hero | 0.3 s | 0.5 | 2.5 | 24 | Anti-air rockets: every 2s 2 rockets at random enemy flyers within 7 tiles (275 damage each); Immune: stuns, slows, hexes, freezes and control have no effect; Spell resistance: takes 90% less magic damage |

## Duskmoon Covenant (the map's Night Elf race)

The night elves: huntresses, multishot rangers and the legendary Amazon, druids that entangle, stealthy assassins backstabbing casters, vengeful spirits, glaive throwers, faerie dragons, Elune's Lantern, the Silver Glade, the Obelisk of Wilderness and the Starfall Obelisk.

- Evasion everywhere: huntresses, rangers, assassins and spirits dodge attacks (up to 40%)
- Rangers shoot 3 targets, the legendary Amazon 7 (immune, 70% spell resistance)
- Assassins stalk unseen and backstab casters; spirits heal on every kill and avatars take revenge when they fall
- Druids entangle ground units in place while they take damage
- Obelisk of Wilderness wards your units; the Silver Glade heals and armours the wounded; the Starfall Obelisk (legendary) rains stars anywhere

### Buildings

| Building | Cost | Trains | Upgrades into | Abilities |
|---|---|---|---|---|
| Hunters' Hall | 180 | Huntress every 22 s | Rangers' Hall |  |
| → Rangers' Hall | 240 | Ranger every 32 s | Amazons' Hall |  |
| → → Amazons' Hall | 480 + 375 lumber · legendary | Amazon every 52 s |  |  |
| Moon Shrine | 228 | Druid every 24 s | Moon Altar |  |
| → Moon Altar | 252 | Sage Druid every 35 s |  |  |
| House of Shadows | 240 | Assassin every 30 s | Guild of Shadows |  |
| → Guild of Shadows | 210 | Royal Assassin every 33 s |  |  |
| Pillaged Hut | 276 | Avenging Spirit every 26 s | Scorched Mansion |  |
| → Scorched Mansion | 288 | Avatar of Vengeance every 38 s |  |  |
| Fountain of Wonders | 312 | Faerie Dragon every 28 s |  |  |
| Glaive Works | 342 | Glaive Thrower every 29 s |  |  |
| Elune's Lantern | 252 + 300 lumber |  |  | Attack: 70 magic every 0.8 s, range 8.5 |
| Obelisk of the Wild | 264 + 300 lumber |  |  | Resistance of the wilderness: every 7s a random unit of yours (one without it first) permanently gains 50% spell resistance and a 40% chance to take 40 less damage from an attack |
| Silver Glade | 270 + 600 lumber |  |  | Moonshine blessing: every 20s everything within 3 tiles of a random wounded unit of yours heals 175 HP and gains +6 armor for 6s |
| Treasure Chest | 420 + 500 lumber |  |  |  |
| Starfall Obelisk | 780 + 1350 lumber · legendary |  |  | Cyclone: every 30s a storm settles on the nearest enemy anywhere on the map for 11s (50 damage/s and 0% slow in radius 3.5) |

### Units

| Unit | HP | Armour | Damage | Cooldown | Range | Speed | Bounty | Abilities |
|---|---|---|---|---|---|---|---|---|
| Huntress | 300 | 1 light | 42 pierce | 1.5 s | 4 | 3 | 5 | Evasion: 8% chance that an attack against it misses |
| Ranger | 500 | 3 light | 65 pierce | 1 s | 4.3 | 3 | 11 | Evasion: 15% chance that an attack against it misses; Multi-shot: every volley strikes 3 enemies |
| Amazon | 900 | 5 light | 100 pierce | 1 s | 4.6 | 3 | 23 | Regenerates 3 HP/s; Immune: stuns, slows, hexes, freezes and control have no effect; Evasion: 25% chance that an attack against it misses; Spell resistance: takes 70% less magic damage; Multi-shot: every volley strikes 7 enemies |
| Druid | 325 | 1 unarmored | 50 chaos | 1.6 s | 3.8 | 2.9 | 6 | Bash: 12% chance to stun for 5s and deal 75 extra damage |
| Sage Druid | 550 | 3 unarmored | 75 chaos | 1.6 s | 3.8 | 2.9 | 14 | Regenerates 1 HP/s; Bash: 35% chance to stun for 6s and deal 210 extra damage |
| Assassin | 375 | 1 medium | 30 pierce | 1 s | 0.4 | 3.2 | 7 | Stealth: invisible, hunts casters, healers and ranged units behind the front line (anything in the enemy base); a blow reveals it for 4s; Charge: the first blow after marching deals 6× damage; Evasion: 15% chance that an attack against it misses |
| Royal Assassin | 575 | 2 medium | 45 pierce | 0.8 s | 0.4 | 3.3 | 12 | Stealth: invisible, hunts casters, healers and ranged units behind the front line (anything in the enemy base); a blow reveals it for 3s; Charge: the first blow after marching deals 7.7× damage; Evasion: 25% chance that an attack against it misses |
| Avenging Spirit | 425 | 5 light | 45 magic | 1.2 s | 0.5 | 3.6 | 7 | Aura: enemies within 1 tiles get -4 armour; Heal on kill: every kill heals 14% of its HP; Evasion: 30% chance that an attack against it misses |
| Avatar of Vengeance | 700 | 8 light | 70 magic | 0.9 s | 0.4 | 3.6 | 15 | Aura: enemies within 1 tiles get -7 armour; Heal on kill: every kill heals 20% of its HP; Revenge: when it falls it deals 350 chaos damage to its killer; Evasion: 40% chance that an attack against it misses |
| Glaive Thrower | 400 | 2 heavy | 93 siege | 3.6 s | 10 | 2.5 | 9 | Chain lightning: jumps between 4 enemies |
| Faerie Dragon (flying) | 460 | 2 light | 50 magic | 1.8 s | 3.5 | 3.4 | 8 | Heals allies for 175 HP |

## Bloodtusk Horde (the map's Orc race)

Orcs, trolls and war beasts: critical axes, berserk trolls that ensnare flyers, kodo riders with auras, wyverns, shamans, a catapult, a blessing totem and a totem that freezes every enemy.

- Axes: veterans and axemasters strike critically; axemasters pulverize the ground
- Berserk: trolls attack three times as fast for 6 s after every kill; trappers bind flyers to the ground
- War beasts: tanky kodos, ridden by spellbreakers (80% spell resistance), war drummers (+30% damage aura) or shield bearers (+4 armour aura)
- Tribal Blessing: the Ceremonial Totem makes a random unit permanently stronger every 10 s
- Stasis (legendary): the totem freezes every enemy unit on the map

### Buildings

| Building | Cost | Trains | Upgrades into | Abilities |
|---|---|---|---|---|
| Fighters' Hall | 132 | Grunt every 20 s | Veterans' Hall |  |
| → Veterans' Hall | 120 | Veteran Grunt every 25 s | Axemasters' Hall |  |
| → → Axemasters' Hall | 288 | Axemaster every 37 s |  |  |
| Shaman Tent | 204 | Shaman every 23 s | Spirit Lodge |  |
| → Spirit Lodge | 204 | Spirit Walker every 32 s |  |  |
| Troll Hut | 240 | Troll Berserker every 25 s | Trappers' Hut |  |
| → Trappers' Hut | 96 | Troll Trapper every 29 s | Forest Trappers' Hole |  |
| → → Forest Trappers' Hole | 588 + 390 lumber · legendary | Forest Trapper every 53 s |  |  |
| Wyvern Roost | 264 | Wyvern Rider every 26 s |  |  |
| Kodo Pen | 312 | Kodo every 28 s | Spellbreaker Pen, War Drum Pen, Shield Bearer Pen |  |
| → Spellbreaker Pen | 120 | Spellbreaker Kodo every 33 s |  |  |
| → War Drum Pen | 120 | War Drum Kodo every 33 s |  |  |
| → Shield Bearer Pen | 120 | Shield Bearer Kodo every 33 s |  |  |
| Orc Siege Works | 456 | Catapult every 34 s |  |  |
| Spear Tower | 210 + 300 lumber |  |  | Attack: 23 normal every 0.6 s, range 7; 4.7× damage against flyers |
| Ceremonial Totem | 300 + 540 lumber |  |  | Tribal blessing: every 10s a random unit of yours permanently gains +20 damage, +200 HP, +3 armor and 20% attack speed, plus a 25% critical strike, 30% evasion or 1.5× damage against buildings |
| Serpent Rock | 324 + 640 lumber |  |  | Cyclone: every 12s a storm settles on the nearest enemy anywhere on the map for 5s (30 damage/s and 20% slow in radius 2.4) |
| Treasure Chest | 420 + 500 lumber |  |  |  |
| Stasis Totem | 570 + 1350 lumber · legendary |  |  | Stasis: every 40s all enemy units anywhere on the map are frozen for 4.5s |

### Units

| Unit | HP | Armour | Damage | Cooldown | Range | Speed | Bounty | Abilities |
|---|---|---|---|---|---|---|---|---|
| Grunt | 325 | 4 heavy | 28 normal | 1.5 s | 0.4 | 2.7 | 4 |  |
| Veteran Grunt | 575 | 6 heavy | 40 normal | 1.3 s | 0.4 | 2.9 | 7 | Regenerates 1 HP/s; Critical strike: 25% chance to deal 2× damage |
| Axemaster | 1000 | 10 heavy | 65 normal | 1 s | 0.5 | 3.2 | 14 | Regenerates 2.3 HP/s; Critical strike: 30% chance to deal 3× damage; Pulverize: 35% chance to deal 130 damage to all enemies within 2 tiles |
| Troll Berserker | 450 | 3 medium | 45 normal | 1.5 s | 3 | 2.9 | 7 | Berserk: after a kill it attacks 200% faster for 6s (and takes 10% more damage) |
| Troll Trapper | 600 | 4 medium | 58 normal | 1.5 s | 3.3 | 2.9 | 9 | Berserk: after a kill it attacks 200% faster for 6s (and takes 10% more damage); Ensnare: every 8s it binds an enemy flyer to the ground for 16s, so melee units can hit it |
| Forest Trapper | 1600 | 10 medium | 159 normal | 1.5 s | 5.3 | 2.9 | 24 | Regenerates 5 HP/s; Critical strike: 15% chance to deal 2× damage; Berserk: after a kill it attacks 200% faster for 6s (and takes 10% more damage); Ensnare: every 8s it binds up to 5 enemy flyers to the ground for 16s, so melee units can hit them; Immune: stuns, slows, hexes, freezes and control have no effect; Spell resistance: takes 70% less magic damage |
| Kodo | 1000 | 6 light | 35 pierce | 1.5 s | 0.6 | 2.5 | 8 | Regenerates 1 HP/s |
| Spellbreaker Kodo | 1200 | 7 light | 40 pierce | 1.2 s | 2 | 2.5 | 10 | Regenerates 1 HP/s; Spell resistance: takes 80% less magic damage |
| War Drum Kodo | 1200 | 7 light | 40 pierce | 1.2 s | 2 | 2.5 | 13 | Aura: allies within 9 tiles get +30% damage; Regenerates 1 HP/s |
| Shield Bearer Kodo | 1200 | 7 light | 40 pierce | 1.2 s | 2 | 2.5 | 13 | Aura: allies within 9 tiles get +4 armour; Regenerates 1 HP/s |
| Wyvern Rider (flying) | 400 | 2 unarmored | 30 pierce | 1 s | 4 | 3.3 | 7 | Poison: 4 dmg/s for 3s and 20% slow |
| Shaman | 340 | 1 unarmored | 50 magic | 1.9 s | 3.5 | 2.7 | 6 | Aura: allies within 4 tiles get +33% damage |
| Spirit Walker | 750 | 4 light | 90 magic | 1.5 s | 4.5 | 2.7 | 10 | Regenerates 1 HP/s |
| Catapult | 475 | 5 medium | 135 siege | 5 s | 10 | 2.3 | 12 | Poison: 48 dmg/s for 2.5s and 0% slow; Splash damage (radius 1.6) |

## Sunspire Concord (the map's Elf race)

The high elves: evasive archers with headshots, critical-striking blademasters, sorceresses and the legendary Wizard calling chain lightning, bouncing bloodthirsters, ballistae, dragonhawks, the Obelisk of Light, the City of Magic and the Golden Shrine.

- Archers and blademasters evade attacks; headshots stun, blademasters crit up to 3×
- Sorceresses heal and call chain lightning; the Wizard (legendary) is immune with 70% spell resistance
- Bloodthirsters bounce their bolts between 3 enemies and strip armour
- The Obelisk of Light strikes a random enemy anywhere for 160 every 4 s; the City of Magic turns one into a sheep
- Golden Shrine (legendary): every fallen unit has a 20% chance to rise again

### Buildings

| Building | Cost | Trains | Upgrades into | Abilities |
|---|---|---|---|---|
| Archery Range | 216 | Archer every 24 s | Archery Tower |  |
| → Archery Tower | 240 | Master Archer every 34 s |  |  |
| Hall of Honor | 264 | Blademaster every 26 s | Hall of the Eldest |  |
| → Hall of the Eldest | 276 | Elder Blademaster every 37 s |  |  |
| Blood Mage Academy | 330 | Bloodthirster every 28 s |  |  |
| Dragonhawk Portal | 372 | Dragonhawk Rider every 30 s |  |  |
| Ballista Works | 420 | Ballista every 32 s |  |  |
| School of Wizardry | 432 | Sorceress every 33 s | Tower of Supreme Magic |  |
| → Tower of Supreme Magic | 528 + 400 lumber · legendary | Wizard every 55 s |  |  |
| Obelisk of Light | 282 + 450 lumber |  |  | Light beam: every 4s a ray hits the nearest enemy unit anywhere on the map for 160 magic damage |
| City of Magic | 288 + 420 lumber |  |  | Hex: every 10s the toughest enemy unit anywhere on the map is turned into a harmless critter for 45s |
| Arcane Tower | 300 + 300 lumber |  |  | Attack: 58 magic every 1.2 s, range 6.8; Multi-shot: each volley strikes 5 enemies |
| Treasure Chest | 420 + 500 lumber |  |  |  |
| Golden Shrine of Grace | 780 + 1800 lumber · legendary |  |  | Grace: every own unit that falls anywhere on the map has a 20% chance to rise again (a second shrine stacks once; not legendaries) |

### Units

| Unit | HP | Armour | Damage | Cooldown | Range | Speed | Bounty | Abilities |
|---|---|---|---|---|---|---|---|---|
| Archer | 320 | 2 unarmored | 38 pierce | 1.3 s | 4.5 | 3 | 6 | Regenerates 1 HP/s; Bash: 10% chance to stun for 0.5s and deal 50 extra damage; Evasion: 15% chance that an attack against it misses |
| Master Archer | 525 | 4 unarmored | 85 pierce | 1 s | 5 | 3 | 12 | Regenerates 1 HP/s; Bash: 20% chance to stun for 0.5s and deal 125 extra damage; Evasion: 25% chance that an attack against it misses |
| Blademaster | 400 | 7 heavy | 28 normal | 0.7 s | 0.5 | 3.3 | 7 | Regenerates 1 HP/s; Critical strike: 25% chance to deal 2.5× damage; Evasion: 15% chance that an attack against it misses; Spell resistance: takes 15% less magic damage |
| Elder Blademaster | 700 | 10 heavy | 45 normal | 0.5 s | 0.6 | 3.4 | 13 | Regenerates 2 HP/s; Critical strike: 30% chance to deal 3× damage; Evasion: 25% chance that an attack against it misses; Spell resistance: takes 25% less magic damage |
| Sorceress | 550 | 2 unarmored | 50 magic | 1.8 s | 5 | 3 | 11 | Heals allies for 150 HP; Chain lightning: 25% chance to call lightning (150 damage, 7 targets) |
| Wizard | 800 | 4 unarmored | 100 chaos | 1.8 s | 6.5 | 3 | 25 | Heals allies for 300 HP; Chain lightning: 30% chance to call lightning (230 damage, 7 targets); Immune: stuns, slows, hexes, freezes and control have no effect; Spell resistance: takes 70% less magic damage |
| Bloodthirster | 525 | 3 medium | 58 magic | 1.5 s | 3.6 | 3 | 9 | Aura: enemies within 3.6 tiles get -6 armour; Chain lightning: jumps between 3 enemies; Regenerates 1.5 HP/s |
| Ballista | 500 | 3 medium | 125 siege | 4 s | 8.5 | 2.5 | 11 | Splash damage (radius 2) |
| Dragonhawk Rider (flying) | 650 | 3 heavy | 70 pierce | 1.5 s | 4.5 | 3.3 | 10 | Regenerates 1 HP/s; Pulverize: 10% chance to deal 80 damage to all enemies within 4 tiles |

## Frostmark Clans (the map's Northern race)

Beasts and trolls of the frozen north: wolves, bears and magnataurs, pulverizing wendigos, ice trolls that freeze their targets, the Ice Queen, rime throwers, azure drakes, frost launchers that freeze buildings and the World Freezer.

- Frost attack: trolls, throwers and the Ice Queen can freeze a ground target in place for 7–12.5 s while it takes damage
- Chill: witch doctors, azure drakes and the icy tower slow everything they hit by 30%
- Wendigos pulverize; the ancient wendigo's howl makes enemies deal 30% less damage
- Frost launchers freeze enemy buildings (no training, shooting or casting) anywhere on the map
- Legendaries: the Raging Rime Thrower (triple shot, immune) and the World Freezer

### Buildings

| Building | Cost | Trains | Upgrades into | Abilities |
|---|---|---|---|---|
| Snowy Rocks | 138 | Frost Wolf every 20 s | Icy Rocks |  |
| → Icy Rocks | 150 | Polar Bear every 27 s | Glacier |  |
| → → Glacier | 300 | Magnataur every 39 s |  |  |
| Igloo | 192 | Rime Thrower every 23 s | Great Igloo |  |
| → Great Igloo | 696 + 460 lumber · legendary | Raging Rime Thrower every 52 s |  |  |
| Ice Troll Hut | 210 | Ice Troll Priest every 23 s | Voodoo Lounge |  |
| → Voodoo Lounge | 180 | Ice Troll Witch Doctor every 31 s |  |  |
| Ice Claws | 330 | Wendigo every 28 s | Frost Claws |  |
| → Frost Claws | 270 | Ancient Wendigo every 40 s |  |  |
| Azure Nest | 336 | Azure Drake every 29 s |  |  |
| Crystal Palace | 480 | Ice Queen every 35 s |  |  |
| Chilling Mushroom | 228 + 350 lumber |  |  | Freezing blast: every 6s the toughest enemy flyer within 10 tiles is frozen for 6s and takes 200 magic damage |
| Frost Launcher | 252 + 475 lumber |  | Greater Frost Launcher | Frost bolt: every 12s a bolt hits the nearest enemy building anywhere on the map (50 damage in radius 1) and freezes it for 10s: no training, shooting or casting |
| → Greater Frost Launcher | 348 + 575 lumber |  |  | Frost bolt: every 15s a bolt hits the nearest enemy building anywhere on the map (100 damage in radius 2.5) and freezes it for 12s: no training, shooting or casting |
| Icy Tower | 276 + 300 lumber |  |  | Attack: 100 normal every 1.2 s, range 7.5, splash 1.5 |
| Treasure Chest | 420 + 500 lumber |  |  |  |
| World Freezer | 720 + 1350 lumber · legendary |  |  | Cyclone: every 35s a storm settles on the nearest enemy anywhere on the map for 10s (60 damage/s and 50% slow in radius 4.5) |

### Units

| Unit | HP | Armour | Damage | Cooldown | Range | Speed | Bounty | Abilities |
|---|---|---|---|---|---|---|---|---|
| Frost Wolf | 280 | 4 unarmored | 30 normal | 1.5 s | 0.4 | 3.3 | 4 | Critical strike: 10% chance to deal 1.5× damage |
| Polar Bear | 550 | 5 unarmored | 65 normal | 1.5 s | 0.5 | 3.3 | 8 | Critical strike: 10% chance to deal 2× damage; Cleaving attack: each hit deals 27% of its damage to all enemies within 2 tiles of the target |
| Magnataur | 1200 | 8 unarmored | 135 normal | 1.5 s | 0.8 | 3.3 | 16 | Critical strike: 15% chance to deal 3× damage; Pulverize: 12% chance to deal 75 damage to all enemies within 2.5 tiles; Cleaving attack: each hit deals 40% of its damage to all enemies within 2.5 tiles of the target |
| Wendigo | 800 | 5 medium | 65 pierce | 1.4 s | 0.5 | 2.9 | 9 | Regenerates 2 HP/s; Pulverize: 25% chance to deal 80 damage to all enemies within 1.5 tiles |
| Ancient Wendigo | 1500 | 7 medium | 110 pierce | 1.4 s | 0.6 | 2.9 | 16 | Aura: enemies within 8.5 tiles get -30% damage; Regenerates 2.5 HP/s; Pulverize: 30% chance to deal 140 damage to all enemies within 1.5 tiles |
| Rime Thrower | 325 | 2 heavy | 22 pierce | 0.7 s | 3.8 | 3 | 5 | Bash: 5% chance to stun for 7s and deal 105 extra damage |
| Raging Rime Thrower | 1600 | 10 heavy | 66 pierce | 0.6 s | 4 | 3 | 19 | Regenerates 1 HP/s; Bash: 10% chance to stun for 7s and deal 105 extra damage; Immune: stuns, slows, hexes, freezes and control have no effect; Spell resistance: takes 70% less magic damage; Multi-shot: every volley strikes 3 enemies |
| Ice Troll Priest | 350 | 1 light | 50 magic | 1.9 s | 3.5 | 2.9 | 3 | Aura: allies within 4 tiles get +3.5 armour; Regenerates 1 HP/s; Bash: 10% chance to stun for 7s and deal 105 extra damage |
| Ice Troll Witch Doctor | 650 | 3 light | 63 magic | 1.3 s | 3.7 | 2.9 | 10 | Aura: allies within 4 tiles get +7 armour; Gale: slows its target by 30% for 5s; Regenerates 1 HP/s; Bash: 10% chance to stun for 10s and deal 200 extra damage |
| Ice Queen | 650 | 4 unarmored | 85 chaos | 1.5 s | 4.5 | 2.9 | 13 | Regenerates 1.3 HP/s; Bash: 20% chance to stun for 13s and deal 375 extra damage; Pulverize: 15% chance to deal 150 damage to all enemies within 3 tiles |
| Azure Drake (flying) | 650 | 4 heavy | 60 chaos | 1.8 s | 2.5 | 3.3 | 9 | Gale: slows its target by 30% for 5s; Splash damage (radius 1.8); Regenerates 2 HP/s |

## Gravewake Legion (the map's Undead race)

The restless dead: rotting zombies and plague bearers, necromancers raising skeletons, the soul-stealing Lich King, vampires that turn their victims, banshees, flesh golems, frost wyrms, a death pit and the City of Decay.

- Rot: zombies and plague bearers poison and rot every enemy around them
- Necromancers raise skeletons; skull piles raise more from the fallen
- Vampires heal from their bites and turn what they kill into vampires; their aura gives melee allies 30% lifesteal
- The Lich King (legendary) steals souls: a 15% chance to kill its target outright
- The Death Pit kills a random enemy unit every 15 s; the City of Decay (legendary) rots every enemy unit on the map

### Buildings

| Building | Cost | Trains | Upgrades into | Abilities |
|---|---|---|---|---|
| Rotting Hay Cart | 144 | Zombie every 21 s | Tainted Farm |  |
| → Tainted Farm | 120 | Suffocated Zombie every 26 s | Defiled Granary |  |
| → → Defiled Granary | 246 | Plague Bearer every 36 s |  |  |
| Skull Pile | 192 | Skeleton every 12 s | Skull Shrine |  |
| → Skull Shrine | 168 | Skeleton (random kind) every 15 s |  |  |
| Temple of Bone | 252 | Necromancer every 25 s | Temple of Necromancy |  |
| → Temple of Necromancy | 204 | Mighty Necromancer every 34 s | Lich Citadel |  |
| → → Lich Citadel | 444 + 375 lumber · legendary | Lich King every 52 s |  |  |
| Crypt | 276 | Vampire every 26 s | Graveyard |  |
| → Graveyard | 318 | Vampire Lord every 40 s |  |  |
| Haunted Mine | 348 | Banshee every 29 s |  |  |
| Slaughterhouse | 444 | Flesh Golem every 33 s |  |  |
| Dragon Cemetery | 600 | Bone Wyrm every 40 s |  |  |
| Turret of Souls | 240 + 300 lumber |  |  | Attack: 90 chaos every 1.2 s, range 8 |
| Treasure Chest | 420 + 500 lumber |  |  |  |
| Death Pit | 432 + 625 lumber |  |  | Sudden death: every 15s a random enemy unit anywhere on the map dies at once (not immune legendaries) |
| City of Decay | 780 + 1800 lumber · legendary |  |  | Aura: -10 regen for enemies within 200 tiles |

### Units

| Unit | HP | Armour | Damage | Cooldown | Range | Speed | Bounty | Abilities |
|---|---|---|---|---|---|---|---|---|
| Zombie | 265 | 3 medium | 31 chaos | 2 s | 0.4 | 2.3 | 3 | Aura: enemies within 2.5 tiles get -8 HP/s regeneration |
| Suffocated Zombie | 500 | 5 medium | 55 chaos | 2 s | 0.4 | 2.5 | 7 | Aura: enemies within 2.9 tiles get -12 HP/s regeneration; Poison: 8 dmg/s for 10s and 15% slow |
| Plague Bearer | 1050 | 6 medium | 105 chaos | 2 s | 0.5 | 2.6 | 13 | Aura: enemies within 3.5 tiles get -20 HP/s regeneration; Poison: 15 dmg/s for 15s and 30% slow; Regenerates 1.5 HP/s |
| Necromancer | 300 | 1 unarmored | 55 magic | 1.8 s | 3.8 | 2.7 | 7 | Regenerates 1 HP/s; Summons 1 Skeleton every 45s (they last 40s) |
| Mighty Necromancer | 550 | 3 unarmored | 75 magic | 1.6 s | 4 | 2.7 | 12 | Regenerates 1.5 HP/s; Pulverize: 25% chance to deal 70 damage to all enemies within 2 tiles; Summons 1 Skeleton Warrior every 30s (they last 40s) |
| Lich King | 900 | 5 unarmored | 120 magic | 1.8 s | 5 | 3 | 23 | Regenerates 3 HP/s; Pulverize: 10% chance to deal 200 damage to all enemies within 3 tiles; Soul steal: 15% chance per hit to kill the target outright and heal 50% of its HP; Immune: stuns, slows, hexes, freezes and control have no effect; Spell resistance: takes 70% less magic damage |
| Skeleton | 170 | 1 light | 11 normal | 1.2 s | 0.4 | 2.8 | 1 |  |
| Skeleton Warrior | 550 | 6 light | 45 normal | 1.3 s | 0.4 | 2.8 | 5 | Regenerates 1.5 HP/s; Bash: 15% chance to stun for 1s; Cleaving attack: each hit deals 25% of its damage to all enemies within 1.8 tiles of the target |
| Skeletal General | 750 | 8 light | 50 hero | 0.7 s | 0.5 | 2.8 | 1 | Aura: allies within 5 tiles get +20% damage; Regenerates 3.5 HP/s; Critical strike: 15% chance to deal 2× damage |
| Vampire | 425 | 3 hero | 48 pierce | 1.4 s | 0.5 | 3.2 | 7 | Aura: allies within 9 tiles get +0.3 lifesteal (melee); Lifesteal: heals for 70% of damage dealt; Regenerates 1 HP/s; Raise: every living unit it kills rises as a Lesser Vampire on its side |
| Vampire Lord | 650 | 4 hero | 73 pierce | 0.9 s | 0.5 | 3.1 | 15 | Aura: allies within 9 tiles get +0.3 lifesteal (melee); Lifesteal: heals for 100% of damage dealt; Regenerates 1 HP/s; Raise: every living unit it kills rises as a Vampire on its side |
| Lesser Vampire | 200 | 0 hero | 21 pierce | 1.4 s | 0.4 | 3 | 1 | Regenerates 1 HP/s |
| Banshee | 310 | 2 divine | 68 magic | 1.4 s | 3.5 | 3 | 9 | Aura: enemies within 4.5 tiles get -15% damage; Gale: slows its target by 30% for 35s |
| Flesh Golem | 1200 | 9 medium | 138 siege | 1.8 s | 0.6 | 3.2 | 12 | 1.5× damage against buildings; Pulverize: 35% chance to deal 125 damage to all enemies within 1.5 tiles |
| Bone Wyrm (flying) | 1200 | 5 light | 140 normal | 1.8 s | 3.3 | 3 | 16 | Gale: slows its target by 30% for 5s; Splash damage (radius 2.3) |

## Doomforge Pact (the map's Chaos race)

Chaos demons: cleaving chaos warriors, satyrs and quill demons, the immune twins, cursing succubi, chaos-born blood fiends, red dragons and burning infernals, with chaotic magic, a volcano, Hell's Fist and the Eraser.

- Chaos warriors and champions cleave; the champion's roar makes allies deal 25% more damage
- Quill demons' aura reflects 35% of melee damage; succubi curse their targets (35% less damage)
- Blood fiends are chaos-born: a random armour type and a random perk each
- Present of chaos: a random enemy explodes, dies, mutates into your Mutation, is hexed, hurt, stunned, strengthened, or nothing happens
- Legendaries: the Twins of Serenity, Hell's Fist (cripples a building for 6 minutes) and the Eraser (kills a whole enemy unit type)

### Buildings

| Building | Cost | Trains | Upgrades into | Abilities |
|---|---|---|---|---|
| Lesser Demon Cage | 144 | Satyr every 21 s | Greater Demon Cage |  |
| → Greater Demon Cage | 276 | Quill Demon every 32 s | Serenity |  |
| → → Serenity | 660 + 1600 lumber · legendary | Twin Smiley every 60 s |  |  |
| Chaos Citadel | 192 | Chaos Warrior every 23 s | Greater Chaos Citadel |  |
| → Greater Chaos Citadel | 228 | Chaos Champion every 32 s |  |  |
| Altar of Greed | 276 | Succubus every 26 s |  |  |
| Fountain of Blood | 336 | Blood Fiend every 29 s |  |  |
| Dragon Nest | 420 | Red Dragon every 32 s |  |  |
| Demon Gate | 600 | Infernal every 40 s |  |  |
| Magic Tower Ruin | 240 + 330 lumber |  |  | Present of chaos: every 10s a random enemy unit anywhere on the map suffers one of eight fates: it explodes, dies (you get the bounty), turns into a Mutation fighting for you, is hexed, takes 500 damage, is stunned for 6s with 200 damage, is strengthened (+400 HP, +25 damage), or nothing happens |
| Volcano | 408 + 660 lumber |  |  | Cyclone: every 12s a storm settles on the nearest enemy anywhere on the map for 2.8s (100 damage/s and 0% slow in radius 2.5) |
| Treasure Chest | 420 + 500 lumber |  |  |  |
| Eraser | 420 + 1000 lumber · legendary |  | Eraser II | Erase: every 50s every enemy unit of a random type dies, anywhere on the map (immune legendaries are spared) |
| → Eraser II | 210 + 350 lumber · legendary |  | Eraser III | Erase: every 38s every enemy unit of a random type dies, anywhere on the map (immune legendaries are spared) |
| → → Eraser III | 210 + 350 lumber · legendary |  |  | Erase: every 25s every enemy unit of a random type dies, anywhere on the map (immune legendaries are spared) |
| Shrine of Destruction | 1020 + 1800 lumber · legendary |  |  | Frost bolt: every 40s a bolt hits the nearest enemy building anywhere on the map (400 damage in radius 1) and freezes it for 360s: no training, shooting or casting |

### Units

| Unit | HP | Armour | Damage | Cooldown | Range | Speed | Bounty | Abilities |
|---|---|---|---|---|---|---|---|---|
| Chaos Warrior | 400 | 5 medium | 38 normal | 1.4 s | 0.5 | 3.2 | 5 | Cleaving attack: each hit deals 25% of its damage to all enemies within 1.8 tiles of the target |
| Chaos Champion | 850 | 8 medium | 80 normal | 1.4 s | 0.6 | 3.2 | 11 | Aura: allies within 5.3 tiles get +25% damage; Critical strike: 10% chance to deal 2× damage; Cleaving attack: each hit deals 35% of its damage to all enemies within 2 tiles of the target |
| Satyr | 250 | 3 light | 28 normal | 1.4 s | 2.8 | 3.2 | 3 |  |
| Quill Demon | 700 | 4 light | 46 normal | 0.8 s | 3.1 | 3.2 | 11 | Aura: allies within 3.5 tiles get +0.4 melee damage reflected; Chain lightning: jumps between 2 enemies; Regenerates 1 HP/s |
| Twin Smiley | 450 | 15 divine | 101 chaos | 1 s | 5 | 3 | 21 | Gale: slows its target by 50% for 5s; Critical strike: 30% chance to deal 4× damage; Bash: 15% chance to stun for 2s; Immune: stuns, slows, hexes, freezes and control have no effect; Evasion: 15% chance that an attack against it misses; Spell resistance: takes 90% less magic damage |
| Twin Weeper | 450 | 15 divine | 101 chaos | 1 s | 0.5 | 3 | 21 | Aura: enemies within 4 tiles get -40 HP/s regeneration; Bash: 15% chance to stun for 2s; Cleaving attack: each hit deals 30% of its damage to all enemies within 4 tiles of the target; Immune: stuns, slows, hexes, freezes and control have no effect; Evasion: 15% chance that an attack against it misses; Spell resistance: takes 90% less magic damage |
| Succubus | 450 | 2 light | 70 magic | 1.5 s | 3.6 | 3.1 | 7 | Regenerates 1.5 HP/s; Weakening blows: its target deals 35% less damage for 45s |
| Blood Fiend | 570 | 5 medium | 55 chaos | 1.2 s | 0.5 | 3.5 | 9 | Regenerates 2 HP/s; Chaos-born: each one comes with a random armour type and a random perk (critical strike, evasion or demolish) |
| Red Dragon (flying) | 800 | 6 heavy | 70 chaos | 1.4 s | 4 | 3.2 | 11 | Splash damage (radius 2) |
| Infernal | 1600 | 7 heavy | 123 chaos | 1.4 s | 0.7 | 3 | 16 | Aura: enemies within 3 tiles get -33 HP/s regeneration; Regenerates 5 HP/s |
| Mutation | 600 | 4 medium | 50 normal | 1.5 s | 0.5 | 2.7 | 1 | Regenerates 1 HP/s |

## Tidecall Dominion (the map's Naga race)

Serpent folk of the deep and their murloc thralls: regenerating murlocs, cleaving naga, hydras that split, turtles, sirens, earthquakes, mind control and tsunamis, but no tower.

- Regeneration: murlocs heal 3–4 HP/s, hydras 5–10 HP/s
- Cleaving naga guardians and royal guards; murloc champions and assassins crit, bash and evade
- Sirens call lobsters; the Oracle of Sirens takes control of an enemy unit
- The deep: the pyramid shakes the earth (50% slow), the Tidal Guardian sends tsunamis
- No tower: the Dominion defends with its army and its special buildings

### Buildings

| Building | Cost | Trains | Upgrades into | Abilities |
|---|---|---|---|---|
| Murloc Camp | 204 | Murloc Warrior every 23 s | Murloc Village |  |
| → Murloc Village | 216 | Murloc Champion every 32 s | Murloc Fortress |  |
| → → Murloc Fortress | 228 | Murloc Assassin every 42 s |  |  |
| Swamp Well | 210 | Swamp Spitter every 23 s | Lernaean Fountain |  |
| → Lernaean Fountain | 870 + 1000 lumber · legendary | Ancient Hydra every 60 s |  |  |
| Temple of Snakes | 276 | Winged Serpent every 26 s |  |  |
| Spawning Grounds | 300 | Naga Guardian every 27 s | Royal Spawning Grounds |  |
| → Royal Spawning Grounds | 240 | Naga Royal Guard every 37 s |  |  |
| Reptile Pool | 336 | Dragon Turtle every 29 s |  |  |
| Naga Spring | 420 | Naga Siren every 32 s |  |  |
| Coral Statue | 300 + 480 lumber |  |  | Aura: +7.5 regen for allies within 7 tiles; Mends your team's buildings and castle within 7 tiles by 2.5 HP/s |
| Oracle of Sirens | 372 + 625 lumber |  |  | Control: every 16s the nearest enemy unit anywhere on the map with at most 100000 HP joins your side |
| Treasure Chest | 420 + 500 lumber |  |  |  |
| Ancient Pyramid | 432 + 600 lumber |  |  | Cyclone: every 10s a storm settles on the nearest enemy anywhere on the map for 10s (4 damage/s and 50% slow in radius 3) |
| Tidal Guardian | 900 + 1500 lumber · legendary |  |  | Tsunami: every 15s a wave rolls 20 tiles towards the enemy, 270 damage to every ground unit in its path |

### Units

| Unit | HP | Armour | Damage | Cooldown | Range | Speed | Bounty | Abilities |
|---|---|---|---|---|---|---|---|---|
| Murloc Warrior | 325 | 4 unarmored | 30 normal | 1.3 s | 0.4 | 2.8 | 4 | Regenerates 3.3 HP/s; Critical strike: 10% chance to deal 2× damage |
| Murloc Champion | 520 | 6 unarmored | 45 normal | 1.3 s | 0.5 | 2.8 | 7 | Regenerates 3.5 HP/s; Critical strike: 10% chance to deal 2× damage; Bash: 15% chance to stun for 2s and deal 25 extra damage; Cleaving attack: each hit deals 25% of its damage to all enemies within 1.8 tiles of the target; Evasion: 8% chance that an attack against it misses |
| Murloc Assassin | 750 | 8 unarmored | 63 normal | 1.3 s | 0.5 | 2.8 | 10 | Regenerates 3.8 HP/s; Critical strike: 20% chance to deal 2× damage; Bash: 15% chance to stun for 2s and deal 25 extra damage; Cleaving attack: each hit deals 30% of its damage to all enemies within 2 tiles of the target; Evasion: 15% chance that an attack against it misses |
| Swamp Spitter | 380 | 3 medium | 38 normal | 1.4 s | 3.3 | 2.8 | 6 | Poison: 4 dmg/s for 2s and 35% slow |
| Ancient Hydra | 1750 | 9 medium | 200 chaos | 1.5 s | 5 | 3.5 | 28 | Poison: 4 dmg/s for 2s and 35% slow; On death: releases 2 Hydra Heads; Splash damage (radius 2.5); Immune: stuns, slows, hexes, freezes and control have no effect; Spell resistance: takes 70% less magic damage |
| Hydra Head | 750 | 6 medium | 100 chaos | 1.5 s | 5 | 3.5 | 5 | Poison: 4 dmg/s for 2s and 35% slow; On death: releases 2 Lesser Hydras; Splash damage (radius 1.5); Regenerates 10 HP/s |
| Lesser Hydra | 350 | 3 medium | 50 chaos | 1.5 s | 5 | 3.5 | 2 | Poison: 2 dmg/s for 2s and 25% slow; Splash damage (radius 1.5); Regenerates 5 HP/s |
| Naga Guardian | 625 | 6 heavy | 73 pierce | 1.4 s | 0.6 | 2.8 | 8 | Cleaving attack: each hit deals 35% of its damage to all enemies within 2.3 tiles of the target |
| Naga Royal Guard | 1100 | 9 heavy | 110 pierce | 1.4 s | 0.7 | 2.8 | 14 | Critical strike: 10% chance to deal 2× damage; Cleaving attack: each hit deals 25% of its damage to all enemies within 2.6 tiles of the target |
| Naga Siren | 550 | 3 unarmored | 80 chaos | 1.6 s | 4 | 2.9 | 11 | Regenerates 2 HP/s; Summons 2 Lobsters every 60s (they last 45s) |
| Lobster | 360 | 2 heavy | 43 normal | 1.4 s | 0.4 | 3 | 3 | Critical strike: 10% chance to deal 3× damage; Hardened skin: blocks 18 damage of every attack |
| Dragon Turtle | 650 | 8 heavy | 95 siege | 1.8 s | 5.5 | 2.3 | 9 | Thorns: melee attackers take 60% of their damage back; Bash: 15% chance to stun for 2s and deal 25 extra damage |
| Winged Serpent (flying) | 450 | 2 light | 50 magic | 1.5 s | 4.2 | 3.3 | 7 | Chain lightning: jumps between 3 enemies |

## Blightroot Coven (the map's Corrupted race)

Corrupted ancients and fel demons: weakening treants, incinerating void walkers with armour-breaking auras, felhounds, infernal machines, drakes, an overtaking incubus, tentacles, the Well of Pain and the Eye of Corruption.

- Weakening blows: ents, treants and the annihilator make their targets deal 27% / 55% / 100% less damage
- Void walkers and keepers incinerate (each hit on the same target grows hotter) and break enemy armour around them
- Infernal machines and tanks detonate when they fall; the incubus can overtake what it hits
- Specials: tentacles around any enemy, the Well of Pain (200 damage every 4 s), the Eye of Corruption (−6 armour for every enemy unit)
- A corrupted protector tower with chaos splash

### Buildings

| Building | Cost | Trains | Upgrades into | Abilities |
|---|---|---|---|---|
| Corrupted Ancient of Battle | 150 | Corrupted Ent every 21 s | Corrupted Ancient of War |  |
| → Corrupted Ancient of War | 150 | Corrupted Treant every 27 s | Ancient of Annihilation |  |
| → → Ancient of Annihilation | 600 + 375 lumber · legendary | Corrupted Annihilator every 52 s |  |  |
| Void Portal | 228 | Void Walker every 24 s | Portal of the Abyss |  |
| → Portal of the Abyss | 228 | Void Keeper every 34 s |  |  |
| Nether Ancient | 282 | Nether Drake every 26 s | Shadow Ancient |  |
| → Shadow Ancient | 198 | Shadow Drake every 35 s |  |  |
| Felhound Shrine | 288 | Felhound every 27 s |  |  |
| Hell's Gate | 360 | Infernal Machine every 30 s | Hell's Portal |  |
| → Hell's Portal | 180 | Infernal Tank every 37 s |  |  |
| Demonic Statue | 624 | Incubus every 41 s |  |  |
| Corrupted Protector | 240 + 300 lumber |  |  | Attack: 65 chaos every 1.5 s, range 8, splash 2.3 |
| Forgotten One | 312 + 420 lumber |  |  | Tentacle prison: every 12s 6 tentacles burst from the ground around the nearest enemy anywhere on the map (they last 30s) |
| Well of Pain | 330 + 480 lumber |  |  | Light beam: every 4s a ray hits the nearest enemy unit anywhere on the map for 200 magic damage |
| Treasure Chest | 420 + 500 lumber |  |  |  |
| Eye of Corruption | 600 + 1350 lumber · legendary |  |  | Aura: -6 armor for enemies within 200 tiles |

### Units

| Unit | HP | Armour | Damage | Cooldown | Range | Speed | Bounty | Abilities |
|---|---|---|---|---|---|---|---|---|
| Corrupted Ent | 320 | 4 heavy | 26 normal | 1.4 s | 0.5 | 3 | 3 | Weakening blows: its target deals 27% less damage for 20s |
| Corrupted Treant | 640 | 5 heavy | 53 normal | 1.4 s | 0.6 | 3 | 8 | Critical strike: 10% chance to deal 2× damage; Cleaving attack: each hit deals 25% of its damage to all enemies within 1.8 tiles of the target; Weakening blows: its target deals 55% less damage for 20s |
| Corrupted Annihilator | 1800 | 8 heavy | 150 normal | 1.4 s | 0.8 | 3 | 23 | Regenerates 2 HP/s; Critical strike: 15% chance to deal 2× damage; Pulverize: 9% chance to deal 250 damage to all enemies within 2 tiles; Cleaving attack: each hit deals 40% of its damage to all enemies within 2.3 tiles of the target; Immune: stuns, slows, hexes, freezes and control have no effect; Spell resistance: takes 70% less magic damage; Weakening blows: its target deals 100% less damage for 20s |
| Void Walker | 375 | 2 light | 40 magic | 1.6 s | 3.8 | 2.9 | 6 | Aura: enemies within 4 tiles get -2 armour; Incinerate: each hit on the same target deals 7 more; a target killed explodes for 80 spell damage within 1.5 tiles |
| Void Keeper | 740 | 4 light | 80 magic | 1.6 s | 4 | 2.9 | 12 | Aura: enemies within 6.5 tiles get -4 armour; Regenerates 1.5 HP/s; Incinerate: each hit on the same target deals 7 more; a target killed explodes for 160 spell damage within 1.5 tiles |
| Felhound | 650 | 7 medium | 50 pierce | 1.4 s | 0.5 | 3.3 | 6 | Aura: allies within 9 tiles get +18% attack speed; Regenerates 1 HP/s |
| Infernal Machine | 600 | 3 heavy | 73 siege | 1.6 s | 6 | 2.9 | 10 | Revenge: when it falls it explodes for 100 damage within 2.3 tiles |
| Infernal Tank | 850 | 4 heavy | 80 siege | 1.4 s | 6 | 2.9 | 14 | Regenerates 1.1 HP/s; Cleaving attack: each hit deals 75% of its damage to all enemies within 1.5 tiles of the target; Revenge: when it falls it explodes for 150 damage within 2.8 tiles |
| Nether Drake (flying) | 425 | 2 medium | 68 magic | 1.8 s | 4 | 3.3 | 8 | Splash damage (radius 2.5) |
| Shadow Drake (flying) | 700 | 4 medium | 108 magic | 1.8 s | 4 | 3.3 | 13 | Splash damage (radius 2.5); Regenerates 1 HP/s |
| Incubus | 1000 | 4 medium | 103 chaos | 1.6 s | 5.3 | 3.2 | 16 | Splash damage (radius 2.1); Regenerates 2 HP/s; Overtake: 10% chance per hit to take control of the target for good |
| Tentacle | 225 | 0 medium | 21 normal | 1 s | 1.2 | 0 | 1 | Critical strike: 10% chance to deal 1.5× damage |

