# Factions

All four factions follow the structure and numbers of races of a classic Warcraft III castle-fight map:
- Ironvow follows the "human" race.
- Thornwild follows the "nature" race.
- Shardbound follows the "elemental" race.
- Cogspark follows the "mechanical" race.
- Duskmoon follows the "night elf" race.
- Bloodtusk follows the "orc" race.
- Sunspire follows the "elf" race (the high elves of the Elven Union).
- Frostmark follows the "northern" race.
- Gravewake follows the "undead" race.
- Doomforge follows the "chaos" race.
- Tidecall follows the "naga" race.
- Blightroot follows the "corrupted" race.

We took their tech trees, stat ratios and signature mechanics. Names, look and theme are our own; no text or art was copied.

## How the numbers were translated

| Map value | Castle Defense |
|---|---|
| Hit points | about 1 : 1 for basic units (×0.7–0.8 for later ones); elites and champions get our own, much higher values |
| Damage per second | × 0.6 (our fights last longer) |
| Range, movement speed | ÷ 100 (500 range → 5 tiles, 270 speed → 2.7) |
| Training time | about × 0.9 → spawn interval |
| Gold cost | relative prices within a race kept, scaled to our economy (first spawner ≤ 100 gold) |
| "Unarmored" armour | medium or light (we have four armour types) |
| Chance-based abilities (20% crit, 15% evade…) | every n-th attack (crit every 5th, evade every 7th…): same average, deterministic, mirror matches stay mirrored |

After translating, building duels (`npm run lab -- duels`) caught the clear outliers, and `npm run balance` tuned the rest
(see `docs/balance-report.md`).

## Ironvow ("human")

| Ironvow | Inspired by | Notes |
|---|---|---|
| Militia Hall → Shield Hall / Halberd Hall | barracks → stronghold (footman → defender) | Shieldbearers: half damage from ranged attacks, evade every 7th blow, +2 armour aura. Halberd Hall is Ironvow's own (2× vs heavy) |
| Crossbow Lodge → Arbalest Range / Powder Range | sniper nest → marksmen (anti-air) / gunners (ground splash) | Arbalesters only shoot flyers, every 3rd bolt ×3. Grenadiers splash, every 5th ×2 |
| Siege Yard | weapon lab (mortar) | fragile, very long range, splash |
| Lancer Stables → Knight Stables → Paladin Chapter | chapel → church → holy altar | bash (stun) and armour auras; the charge is Ironvow's own |
| Chapel → Cathedral → Sanctum | (Ironvow's own) | the only healers in the game |
| Thunderhawk Roost | gryphon rock | flyer with magic bolts, bash every 7th, lightning chain every 10th |
| War Horn | war horn | +25% attack speed aura |
| Bastion Tower → Cannon Bastion / Siege Battery | watch tower; artillery | the Siege Battery shells the nearest enemy building every 15 s |
| Counting House | treasure box | +20% income |
| Sun Citadel | (Ironvow's own champion line) | |

## Thornwild ("nature")

| Thornwild | Inspired by | Notes |
|---|---|---|
| Burrow → Briar Burrow / Gnasher Warren | spider egg clutch → nest | two at a time, poison, burst into Sproutlings on death |
| Thorn Archers' Grove → Elder Grove | ancient of growth → ancient of life (dryad → keeper of the grove) | the Grove Keeper calls two thorny Treantlings every 24 s |
| Shaman Hut → Storm Lodge → Tempest Circle | furbolg hut → abode | lightning chains (our own twist) |
| Standing Stones | monolith (mountain giant) | Stonehide Giant: hardened skin (blocks 5 per hit), slam every 3rd blow, 1.3× vs buildings |
| Stag Den → Great Stag Den → Wild Hunt | ancient of slumber → hibernation (bear) | critical blows, bash, trample |
| Moth Hive → Jade Wyrm Roost | (swarm is ours) → emerald dragon roost | armoured flyer with splashing magic breath |
| Mossheart → Howling Hollow | ancient of gale | keeps the regen aura, drops a cyclone (damage + 25% slow) every 14 s |
| Strangle-Root | ancient protector | slowing aura and splashing siege boulders |
| Trophy Totem | (Thornwild's own) | +50% bounties |
| Elder Heartwood | (Thornwild's own treant line) | |

## Shardbound ("elemental")

| Shardbound | Inspired by | Notes |
|---|---|---|
| Tidewell → Tide Fountain → Deepwater Fountain | water spring → golden → spellbound fountain | melee water spirits that shrug off ranged damage; the elite also evades |
| Gale Cage → Wind Monument → Zephyr Spire | trapped gale → wind stream → zephyr memorial | flyers that only shoot flyers; their gusts slow, the elite splashes |
| Ember Altar → Blaze Altar → Spire of Elder Lore | altar of fire → blaze → tower of elder knowledge | ranged magic fire; Blaze Elementals breathe fire every 5th attack and split into two Cinders; the Master of Elements calls storms and boosts nearby damage |
| Storm Pillar → St. Elmo's Pillar | pillar of globe-lightning → St. Elmo's fire | chain lightning (3 / 5 targets) and a crackling shield (thorns) |
| Rock Pile → Greater Fissure | rock pile → greater fissure | slow melee siege, pulverise every 5th / 4th blow |
| Codex of Conjuration → Codex of Storms / Codex of Meteors | books of conjuration → elemental rain / meteor shower | a small monsoon; then a big ground blizzard, or a meteor shower that only hits flyers |
| Obelisk of Elements | obelisk of elements | +3 armour aura (the map gives random enchantments) |
| Elemental Guard Tower | elemental guard tower | boulders, normal damage, air and ground |
| Mana Well | mana generator | +20% income |
| Elemental Nexus | (Shardbound's own champion line) | |

## Cogspark ("mechanical")

| Cogspark | Inspired by | Notes |
|---|---|---|
| Gun Smith → Arsenal | gun smith → arsenal | short-range flamegunners with splash; the sergeant throws grenades every 4th attack |
| Tank Factory → Mine Layer / Assault Tank / Heavy Tank → Rocket Tank | tank factory and its four upgrades | tank plating blocks a flat part of every hit; mines blast every 4th attack, assault tanks shell with splash, rocket tanks also hit flyers |
| Aircraft Factory → Bomber Factory | aircraft → bomber factory | rotorcopters only shoot flyers; gyrocopters also bomb the ground; both stun every 3rd attack |
| Golem Factory → Shredder Works / Adamant Forge | golem factory → precious golem factory; lumber mill (shredder) | armoured golems with pulverise and bash; shredders cut whole crowds |
| Demolition Lab | demolition lab | two Lunatic Goblins at a time that explode on their first attack |
| Shield Generator → Greater Shield Generator | blue → red shield generator | +2 / +4 armour aura |
| Energy Tower | energy tower | magic bolts that bounce between 3 enemies |
| Spare Part Heap | spare part heap (machinists that repair) | mends own buildings and the castle nearby, 6 HP/s |
| Scrap Exchange | (Cogspark's own) | +15% income |
| Goliath Works | protection center (goliath) | plated champion with splash missiles that also hit flyers, upgraded twice |

Trait: riveted plating, +2 armour on every Cogspark building (the map's power plant).

## Duskmoon ("night elf")

| Duskmoon | Inspired by | Notes |
|---|---|---|
| Hunters' Hall → Rangers' Hall → Amazons' Hall | hunter's hall → ranger's → amazon's hall | archers; rangers and amazons hit 3 / 5 enemies per volley (multi-shot) |
| Moon Shrine → Moon Altar | moon shrine → moon altar | druids whose bolts entangle (damage over time, 40–50% slow); the sage's roots grip groups |
| House of Shadows → Guild of Shadows | house → guild of shadows | assassins: evasion and a 3× / 4× backstab (first blow) |
| Pillaged Hut → Scorched Mansion | pillaged hut → scorched mansion | avenging spirits: armour-piercing, evasive, lifesteal; the avatar explodes when it falls |
| Glaive Works | night elf siege factory | glaive thrower: 9-tile siege, the glaive bounces between 4 enemies |
| Fountain of Wonders | fountain of wonders | faerie dragons: magic flyers that heal allies |
| Obelisk of the Wild | obelisk of wilderness | aura: every hit on nearby allies deals 4 less damage |
| Elune's Lantern | Elune's lantern | magic tower |
| Moonstone Cache | (Duskmoon's own) | +20% income |
| Starfall Obelisk → Elune's Wrath | starfall obelisk | the special: rains stars on the enemy army (no champion) |

Trait: every Duskmoon unit dodges every 8th blow (the map's night elves are fragile but evasive).

## Bloodtusk ("orc")

| Bloodtusk | Inspired by | Notes |
|---|---|---|
| Fighters' Hall → Veterans' Hall → Axemasters' Hall | fighters' hall → advanced → superior | grunts; veterans crit every 4th blow; axemasters crit 2.5× and pulverise every 3rd |
| Troll Hut → Trappers' Hut → Forest Trappers' Hole | troll hut → trapper's hut → forest trapper's hole | axe-throwing trolls that rage below half health (twice as fast); trappers ensnare (stun), the forest trapper catches groups and regenerates |
| Kodo Pen → Spellbreaker / War Drum / Shield Bearer Pen | kodo farm and its three rider upgrades | tanky kodos; riders with 60% magic resistance, a +20% damage aura or a +4 armour aura |
| Wyvern Roost | falcon-clan encampment | wyvern riders with poisoned spears |
| Shaman Tent → Spirit Lodge | shamanic tent → infostealer's place | casters with a damage aura; spirit walkers call lightning every 4th spell |
| Orc Siege Works | orcish siege factory | catapults with burning splash shells |
| Ceremonial Totem | ceremonial totem | +20% attack speed aura |
| Serpent Rock | serpent rock | spits a poison cloud (damage and slow) every 12 s |
| Spear Tower | anti-air tower | triple damage against flyers |
| Stasis Totem → Great Stasis Totem | stasis totem | the special: freezes every enemy unit nearby every 35 / 28 s |

## Sunspire ("elf")

| Sunspire | Inspired by | Notes |
|---|---|---|
| Archery Range → Archery Tower | archery range → archery tower | archers with headshots (crit every 10th / 5th arrow) and evasion |
| Hall of Honor → Hall of the Eldest | hall of honor → hall of the eldest | very fast blademasters with crits, evasion and some magic resistance |
| School of Wizardry → Tower of Supreme Magic | school of wizardry → tower of supreme magic | sorceresses / wizards: heal allies, chain lightning every 4th / 3rd spell |
| Blood Mage Academy | blood-elf war academy | bouncing fire bolts (3 targets) |
| Ballista Works | high-elf siege factory | long-range bolts with splash |
| Dragonhawk Portal | dragonhawk portal | armoured flyers with a solar flare every 4th strike |
| Arcane Tower | arcane tower | magic tower, five targets per volley |
| City of Magic | city of magic | hexes the toughest enemy (stunned for 5 s) every 10 s |
| Obelisk of Light | obelisk of light | light beam, 90 magic damage every 4 s |
| Golden Shrine of Grace → Radiant Shrine | golden shrine of justice | the special: every 5th / 3rd fallen ally nearby rises again |

## Frostmark ("northern")

| Frostmark | Inspired by | Notes |
|---|---|---|
| Snowy Rocks → Icy Rocks → Glacier | snowy rocks → icy rocks → glacier | frost wolves → polar bears (cleave) → magnataurs (cleave, triple crit, stomp) |
| Ice Claws → Frost Claws | ice claws → frost claws | wendigos that pulverise; the ancient one howls enemies weaker (−20% damage aura) |
| Igloo → Great Igloo | igloo → modern igloo | rime throwers (fast chilling ice shards) → raging throwers (3 targets) |
| Ice Troll Hut → Voodoo Lounge | ice troll hut → voodoo lounge | chilling casters that give nearby allies frost armour (+3 / +5) |
| Crystal Palace | crystal palace | the ice queen: chilling magic and a frost nova every 4th spell |
| Azure Nest | azure nest | armoured flying drakes with splashing, chilling breath |
| Icy Tower | icy tower | splash tower |
| Chilling Mushroom | chilling mushroom | freezes the toughest enemy flyer (4 s, 110 damage) every 6 s |
| Frost Launcher → Greater Frost Launcher | frost launcher → greater | frost bolts freeze enemy buildings: no training, shooting or casting |
| World Freezer → Eternal Winter | world freezer | the special: a long blizzard (damage and 50% slow) on the enemy army |

## Gravewake ("undead")

| Gravewake | Inspired by | Notes |
|---|---|---|
| Rotting Hay Cart → Tainted Farm → Defiled Granary | rotting hay cart → tainted farm → defiled granary | zombies with a rotting bite → plague bearers with a rotting cloud (8 HP/s aura) |
| Temple of Bone → Temple of Necromancy → Lich Citadel | temple of bone → necromancy → high citadel | necromancers raise skeletons (warriors, death knights); the lich resists magic |
| Crypt → Graveyard | crypt → graveyard | vampires with lifesteal; the lord calls bats |
| Haunted Mine | haunted mine | banshees: fear aura (−15% enemy damage), slowing chains, some magic resistance |
| Slaughterhouse | slaughter house | the flesh golem: siege, demolishes buildings, pulverises |
| Dragon Cemetery | dragon cemetery | the bone wyrm: flying, splashing frost breath |
| Skull Pile → Skull Shrine | skull pile → skull shrine | raises two skeletons (warriors) every 14 / 15 s |
| Turret of Souls | turret of souls | tower |
| Death Pit | death pit | slays the nearest enemy unit with up to 800 HP every 15 s |
| City of Decay → Necropolis | city of decay | the special: every enemy unit on the battlefield rots, 6 / 10 HP/s |

## Doomforge ("chaos")

| Doomforge | Inspired by | Notes |
|---|---|---|
| Chaos Citadel → Greater Chaos Citadel | chaos citadel → greater | chaos warriors (cleave) → champions (cleave, crit, +20% damage roar) |
| Lesser Demon Cage → Greater Demon Cage → Serenity | lesser → greater demon cage → serenity | satyrs → quill demons (bounce, thorns) → the twins (elite pair: crits, stuns, evasion, magic resistance) |
| Altar of Greed | altar of greed | succubi whose curse weakens enemies (−20% damage) |
| Fountain of Blood | fountain of blood | blood fiends with lifesteal |
| Dragon Nest | dragon nest | red dragons: flying, splash |
| Demon Gate | demon gate | infernals: tough, hit air, immolation (12 HP/s to enemies nearby) |
| Magic Tower Ruin | magic tower ruin | present of chaos: a blast, a stun, death or nothing, in turn |
| Volcano | volcano | eruption under the nearest enemies |
| Shrine of Destruction | shrine of destruction | Hell's Fist cripples the nearest enemy building for 12 s, anywhere on the map |
| Eraser → Eraser II → Eraser III | eraser | the special: kills every enemy unit of the most numerous kind (up to 1000 HP) |

Like the map's race: chaos damage (full against every armour type), no tower and no siege unit.

## Tidecall ("naga")

| Tidecall | Inspired by | Notes |
|---|---|---|
| Murloc Camp → Murloc Village → Murloc Fortress | murloc camp → village → fortress | murlocs in pairs: warriors → champions (cleave, evade, bash) → assassins |
| Swamp Well → Lernaean Fountain | swamp well → lernaean fountain | swamp spitters (35% slow) → the ancient hydra (elite: splash, poison, magic resistance, splits into two heads) |
| Spawning Grounds → Royal Spawning Grounds | spawning grounds → royal | naga guardians and royal guards with cleaving tridents |
| Naga Spring | naga spring | sirens: chaos bolts, they summon lobsters |
| Reptile Pool | reptile pool | dragon turtles: long-range siege, bash, thorny shell |
| Temple of Snakes | temple of snakes | winged serpents: flying, bouncing magic |
| Coral Statue | coral statue | +6 HP/s regeneration aura and mends buildings |
| Ancient Pyramid | ancient pyramide | earthquake: a 50% slow on the nearest enemies |
| Oracle of Sirens | oracle of sirens | charms the nearest enemy unit (up to 800 HP): it fights for you |
| Tidal Guardian → Tidal Titan | tidal guardian | the special: a tsunami that hits every ground enemy in its path |

Trait: every unit regenerates 3 HP/s. Like the map's race: no tower.

## Blightroot ("corrupted")

| Blightroot | Inspired by | Notes |
|---|---|---|
| Corrupted Ancient of Battle → of War → of Annihilation | corrupted ancient of battle → war → annihilation | corrupted ents → treants (cleave, crit) → the annihilator (elite: fan of spikes stuns); their blows weaken targets by 25 / 40 / 60% |
| Void Portal → Portal of the Abyss | void portal → portal of the abyss | void walkers / keepers: burning magic, −2 / −4 armour aura on enemies |
| Felhound Shrine | felhound shrine | felhounds with a +18% attack speed aura |
| Hell's Gate → Hell's Portal | hell's gate → hell's portal | infernal machines / tanks: long-range siege that detonate when destroyed |
| Nether Ancient → Shadow Ancient | nether ancient → shadow ancient | flying drakes with splashing breath |
| Demonic Statue | demonic statue | the incubus: long-range chaos splash |
| Corrupted Protector | corrupted protector | chaos splash tower |
| Forgotten One | forgotten one | tentacle prison: six tentacles around the nearest enemy |
| Well of Pain | well of pain | touch of pain: 100 damage every 4 s |
| Eye of Corruption → All-Seeing Eye | eye of corruption | the special: −5 / −8 armour on every enemy unit on the battlefield |

## Ability reference

All of these are fields on `UnitDef` / `BuildingDef` (`shared/src/data/types.ts`). They are handled in `shared/src/sim/combat.ts` and `shared/src/sim/powers.ts`, tested in `shared/test/abilities.test.ts`, and described in tooltips by `unitAbilities` / `powerText`.

| Field | Effect |
|---|---|
| `crit: { every, mult }` | every n-th attack deals `mult`× damage |
| `bash: { every, stun }` | every n-th attack stuns a unit for `stun` s |
| `slam: { every, dmg, radius }` | every n-th attack also hits ground units around the target |
| `storm: { every, dmg, jumps }` | every n-th attack calls a lightning chain |
| `evade: n` | every n-th attack against the unit misses |
| `rangedResist` | share of ranged damage ignored |
| `block` | flat damage off every attack (at least 25% gets through) |
| `airOnly` | attacks flyers only |
| `summon: { unit, count, every, ttl }` | calls helpers that fade after `ttl` s |
| `berserk: { below, haste }` | attacks `haste` faster below that share of its health |
| `magicResist` | share of magic damage ignored |
| building `attack.bonusVs` | tower damage multiplier against a target class |
| building `attack.multishot` | tower volleys strike several enemies |
| power `hex` / `beam` | stuns the toughest enemy in range / a ray of magic damage on the nearest |
| building `revive: { every, radius }` | every n-th own unit that falls nearby rises again |
| power `bombard` with `freeze` | the shell freezes buildings (and briefly units) it hits |
| power with `global` | reaches the whole map (nearest valid enemy anywhere): bombards, storms, sudden death, control, chaos, tentacles; beams, hexes, stasis, tsunami and erase stay local |
| power `hex` with `air` | freezes the toughest flyer and deals damage |
| aura with a negative value on `enemy` | weakens enemies (less damage / armour) |
| aura `regen` with a negative value on `enemy` | decay: enemies lose HP every second (no bounty) |
| power `slay` | kills the nearest enemy unit with at most `dmg` max HP |
| power `chaos` / `erase` | cycling fates on the nearest enemy / kills the most numerous enemy kind |
| power `charm` / `wave` | the nearest weak enemy changes sides / a tsunami along a line |
| `weaken: { mult, duration }` | the target deals less damage for a while |
| power `tentacles` | summons fading units in a ring around the nearest enemy |
| power `stasis` | stuns every enemy unit in range |
| `multishot: n` | every attack also strikes n − 1 further enemies in range |
| `deathBlast: { dmg, radius }` | explodes when it falls (not when smitten by a rescue strike) |
| aura `stat: 'block'` | flat damage off every hit on nearby allies |
| trait `unitEvade: n` | every unit of the faction without its own evasion dodges every n-th blow |
| `suicide: { radius }` | the first attack is an explosion of `dmg` on every enemy unit and building within `radius`; the unit dies, no bounty |
| aura `stat: 'haste'` | attack speed |
| building `power` | `bombard` (shell on the nearest enemy building) or `cyclone` (damage + slow zone on the nearest enemy; with `air`, a meteor shower on flyers only) |
| building `attack.chain` | tower shots bounce between that many enemies |
| building `mend: { hps, radius }` | mends own-team buildings and the castle nearby |
