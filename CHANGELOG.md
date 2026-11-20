# Changelog

Castle Defense versions look like `0.21.0+2`, shown in the lower-right corner of the game:

- `0.21.0` is the **game version** ([semantic versioning](https://semver.org), root `package.json`): new features bump the minor version, bug fixes the patch version. Balance runs never change it.
- `+2` is the **balance revision** (`revision` in `shared/src/data/tuning.ts`): `npm run balance` adds 1 whenever it writes a changed tuning. It never resets, not even when the game version changes.

So `0.21.0+2 → 0.21.0+3` is a pure balance change, and `0.21.0+3 → 0.22.0+3` is a game change with the same balance. Balance-only releases have headings like `## 0.21.0+3 · balance`.

## 0.46.4

- **Blightroot Coven copied exactly from the map's Corrupted race:**
  - **Values:** all values, costs, lumber and upgrades are the map's.
  - **Weakening blows:** ents −27%, treants −55%, and the legendary Annihilator −100% (its target deals no damage for 20 s). The Annihilator is also immune, cleaves, crits and impales.
  - **Void walkers and keepers incinerate:** each hit on the same target deals 7 more, and a target they kill explodes. Their auras take 2 / 4 armour from nearby enemies.
  - **Other units:**
    - Felhounds give +18% attack speed to allies within 9 tiles.
    - Infernal machines and tanks detonate when destroyed.
    - Drakes' bolts splash.
    - The Incubus has a 10% chance per hit to take control of its target.
  - **Specials:**
    - Tentacles (6, around any enemy).
    - Well of Pain: 200 spell damage every 4 s, map-wide.
    - Eye of Corruption (legendary): −6 armour for every enemy unit; its upgrade is gone (the map has none).
    - Corrupted Protector tower with chaos splash.

## 0.46.3

- **Doomforge Pact copied exactly from the map's Chaos race:**
  - **Values:** all values, costs, lumber and upgrades are the map's.
  - **Units:**
    - Chaos Warriors and Champions cleave; the Champion's roar gives allies +25% damage.
    - Quill Demons' quills bounce, and their aura reflects 35% of melee damage.
    - Succubi curse (−35% damage for 45 s).
    - Blood Fiends are chaos-born: each gets a random armour type and a random perk.
    - Infernals hit flyers and burn every enemy within 3 tiles (33 damage per second).
  - **Serenity (legendary) trains both Twins:**
    - Twin Smiley: ranged, 30% crit at 4×, a slowing clap.
    - Twin Weeper: melee cleave and poison gas, with its own look.
    - Both are immune, divine-armoured and resist 90% of spells.
  - **Specials:**
    - Present of Chaos has the map's eight random fates, including turning the target into your new Mutation unit (own look).
    - Volcano: 100 damage per second for 2.75 s.
    - Hell's Fist (legendary): 400 damage, and the building is disabled for 6 minutes.
    - Eraser (legendary, two upgrades, 50 / 37.5 / 25 s): kills every enemy unit of a random type, map-wide.

## 0.46.2

- **Bloodtusk Horde copied exactly from the map's Orc race:**
  - **Values:** all costs, lumber, HP, armour, damage, cooldowns, ranges, speeds, spawn times, bounties and upgrades are the map's.
  - **Units:**
    - Veterans crit 25% (2×); Axemasters crit 30% (3×) and pulverize (35%, 130 damage).
    - Spellbreakers resist 80% of spell damage.
    - War Drum and Shield Bearer riders have +30% damage and +4 armour auras (9 tiles).
    - Wyverns carry a light poison.
    - The catapult's burning ammo deals 48 damage per second.
  - **Berserk, as in the map:** trolls rampage after every kill, with +200% attack speed for 6 s and 10% more damage taken.
  - **Ensnare:** Troll Trappers bind a flyer to the ground for 16 s, so melee can hit it. The legendary Forest Trapper ensnares up to five and is immune.
  - **Ceremonial Totem (Tribal Blessing):** every 10 s a random unit permanently gains +20 damage, +200 HP, +3 armour and +20% attack speed, plus a crit, evasion or demolish perk.
  - **Serpent Rock:** 30 damage per second and a 20% slow for 5 s.
  - **Anti-air tower:** 175 DPS against flyers, 37 against ground.
  - **Stasis Totem (legendary):** freezes every enemy unit on the map for 4.5 s every 40 s. Its second stage is gone (the map has none).

## 0.46.1

- **Tidecall Dominion copied exactly from the map's Naga race:**
  - **Values:** costs, lumber, HP, armour and armour types, damage, cooldowns, ranges, speeds, spawn times, bounties, regeneration and upgrades are the map's.
  - **One at a time:** murlocs come one at a time, as in the map.
  - **Hydras:** the Ancient Hydra (legendary) splits into two Hydras, and each of those splits into two Lesser Hydras (new).
  - **Abilities with the map's chances:**
    - Murloc Champions and Assassins cleave, bash, evade and crit.
    - Naga Guardians and Royal Guards cleave.
    - Lobsters crit and have a hard shell.
    - Dragon Turtles bash and reflect 60% of melee damage.
    - Winged Serpents' bolts bounce.
  - **Specials:**
    - Earthquake: 40 spell damage and a 50% slow for 10 s.
    - Oracle of Sirens: controls any non-immune unit.
    - Coral Statue: 7.5 HP/s for units, 2.5 HP/s for buildings.
    - Tidal Guardian (legendary): a 270-damage tsunami.
    - The Tidal Titan upgrade is gone (the map has none).
- **New mechanics:**
  - Cleaving attacks: a share of each hit to enemies around the target.
  - Immune units: no stuns, slows, hexes, freezes, weakening or control.

## 0.46.0

- **Game rules copied from the castleFight map** (first step of the exact map copy; the races follow version by version):
  - **Damage table:** the map's attack-type × armour-type table, with its extra armour types (unarmoured, hero, divine) and attack types (hero, spells). Ability damage is spell damage, and spell resistance reduces it.
  - **Real chances:** critical strikes, evasion, bash (now with its bonus damage), pulverize and chain lightning use the map's percentages, rolled with a seeded random generator. Mirror-image fights still get mirror-image luck.
  - **Economy:**
    - 250 gold and 125 lumber to start.
    - Income every 10 s: 5 + 2% of your buildings' value (each building can have its own rate), times the Treasure Chest bonus.
    - Kill bounties are paid in full.
    - The first four players to finish a building get 20/15/10/5 gold.
  - **Lumber (new resource):**
    - Earned by finishing buildings and upgrades (their value).
    - Pays for towers, Treasure Chests and legendary buildings.
    - Shown in the top bar and on building costs.
  - **Treasure Chest (every faction):** 350 gold + 500 lumber, +25% income, each further one 15% less. Fragile (650 HP).
  - **Castle:** 5000 HP.
  - **Shop:** the map's items under our own names: Spark Staff, Stoneskin Scroll, Mason's Rune, Storm Orb, Rhythm Engine, Thunder Drums, Fury Shard and Rage Heart, plus the Sapphire (the map's Cheese). Consumables, unlock times and restocks work as in the map. Six item slots.
  - **No balance multipliers:** the game uses the map's own values from now on.
  - **Repair:** a full builder repair takes 120 s, now independent of build time.
  - **Command card:** the rescue strike is in the top bar and on T, which frees a builder slot for eleven buildings.

## 0.45.1

- **3D view fixes:**
  - **Camera:** it moves again with the screen edge, the arrow keys and middle-drag, and the minimap's view rectangle follows. The hidden 2D camera had stopped updating its position.
  - **Impact flashes:** flashes from projectiles that hit now disappear. Effects started by other effects were lost from the update list and stayed on the map.

## 0.45.0

- **Graphics option: 2D or 3D, chosen by each player.**
  - **Where to switch:** the lobby header or the in-game menu (F10). The choice is saved in your browser; other players keep their own.
  - **What's 3D:**
    - Terrain with a road and the build zones, faceted rocks, a forest around the battlefield, sunlight and shadows, and fog of war.
    - Both castles: walls, towers in the team colour, flags.
    - Every building: each of the 111 styles is a procedural 3D model built from its archetype (tower, hut, temple, portal, well, crystal, factory, citadel, …) with its own proportions and colours. Buildings rise while under construction and fly their team's flag.
  - **Units:** they stay the painted sprites, standing upright in the 3D world (2.5D), with walk and attack frames, team rings and shadows.
  - **Effects:** projectiles, chain lightning, beams, storms, shells, mines, strikes, heals, deaths and floating gold.
  - **Overlays:** health bars, selection, the placement ghost and rescue targeting.
  - **Unchanged:** controls, camera, minimap and HUD work exactly as in 2D.
  - **Download:** three.js loads only when someone switches to 3D.

## 0.44.0+9 · balance

- **Second 12-faction run.** Final check: Frostmark 67%, Gravewake 63%, Tidecall 60%, Doomforge 36%, Blightroot 38%. The other seven factions are within 44–56%.

## 0.44.0+8 · balance

- **First balancer run with all twelve factions,** using the 30-minute mode.
- **Unit tuning:** duel outliers adjusted, for example Tidecall's murlocs and Royal Guards, Gravewake's Flesh Golem, Ironvow Militia and Mangonel.
- **Faction power:** values for every faction, and the Normal bot gets 0.86 income.
- **Not converged yet:** the final check (152 games) still has Gravewake at 72%, Frostmark 62% and Thornwild 63%, with Doomforge at 32% and Blightroot 39%. Each run moves a faction at most about 12%, so more runs follow.

## 0.44.0

- **Statistics page after the final round:**
  - **Per player:** kills, units lost, gold earned, castle damage and rescue strikes over the whole match, the factions they played, and their Elo change.
  - **Per round:** the winner, the duration, each team's kills, and the drawn factions in random and mirror modes.
  - **Highlights:** the best value in each column is marked.
- **Elo rating for accounts:**
  - **Start:** every account starts at 1000.
  - **Team rating:** the average of its players. Bots count with a fixed rating: Easy 800, Normal 1000, Hard 1200, Brutal 1400.
  - **After a match:** every human on a team gains or loses K = 32 × (result − expected), so an upset earns more.
  - **Peak:** the highest rating is kept.
- **Progress in the lobby:**
  - The rating badge next to your name, with your peak in its tooltip.
  - The rating change on every recent battle.
  - A chart of your rating over your recent matches.
- **Match history** also stores units lost, castle damage, factions per round and the ratings before and after.

## 0.43.1

- **Multi-target attacks are limited to the attacker's own reach.**
  - Chain lightning, storms and bouncing tower shots jump only to enemies within the attacker's range + 2 tiles.
  - Before, each jump could reach 3.5 tiles from the last victim, so a chain could wander across a whole line of units.
  - Multi-shot volleys already measured from the shooter.

## 0.43.0

- **City of Magic works like a real polymorph, map-wide:**
  - Every 10 s the toughest enemy unit anywhere on the map turns into a harmless sheep for 5 s.
  - Before, its 12-tile range rarely reached anything, and the victim only got a pink puff and a freeze.
  - Sheep get their own sprite.
- **Golden Shrine of Grace and Radiant Shrine are map-wide:** every 5th / 3rd unit of your team that falls anywhere rises again.

## 0.42.2

- **Bloodtusk kodos weaker:**
  - Kodo HP 1050 → 890.
  - Spellbreaker, War Drum and Shield Bearer riders: HP 1250 → 1060, damage 25 → 22.
  - War Drum aura +20% → +15% damage.
  - Shield Bearer aura +4 → +3 armour.

## 0.42.1

- **Warden's Crossbow is much stronger and cheaper:** 150 gold instead of 200, and 100 pierce damage per bolt (one per second) instead of 30.

## 0.42.0

- **Cogspark Mine Layers lay real mines.** Every 5 s the tank buries a mine where it stands, whether marching or fighting.
  - **Hidden:** enemies can't see mines. Your own team sees them as small plates with a blinking fuse.
  - **Trigger:** the first enemy ground unit that steps on one sets it off for 90 siege damage to every enemy ground unit within 1.5 tiles.
  - **Limits:** mines last 45 s, and each Mine Layer keeps at most 4 armed. Mines stay after the tank dies.
  - **Replaces** the old every-4th-attack ground blast.

## 0.41.0

- **Duskmoon assassins work like the map's: stealth hunters.**
  - **Invisible from spawn:** while hidden, enemies don't see them at all. Units, towers and targeted spells can't pick them, but area damage still hurts.
  - **Slip through the front line:** while hidden they pass through enemy bodies.
  - **Hunt the back line:** they ignore frontline fighters and go for the toughest caster, healer, aura carrier, summoner or ranged unit within 8 tiles. Inside the enemy build zone they attack anything.
  - **Strike from the shadows:** the hit reveals them and deals ×3 damage (Royal Assassins ×4).
  - **Vanish again:** they stay visible for 4 s after their last blow (Royal 3 s), then disappear with their backstab ready.
  - **Your own hidden assassins** shimmer faintly on your screen.
- **The balancer doesn't auto-tune stealth units from building duels,** which can't measure what they're for.

## 0.40.0

- **Special buildings reach the whole map.** Their powers used to stop at the edge of their own build zone, so bombards could never reach an enemy building. They now hit the nearest valid enemy anywhere on the map, which is the most advanced attacker:
  - Bombards: Siege Battery, frost bolts, Hell's Fist.
  - Every storm, blizzard and meteor shower.
  - Sudden death, control, present of chaos and the tentacle prison.
- **Some powers stay local, since they'd be overpowered everywhere:**
  - Light beams and hexes act like towers.
  - Stasis works around its totem.
  - The tsunami rolls out from its building.
  - Erase would wipe a whole unit type across the map.
- **Shorter freezes to make up for the range:**
  - Frost Launcher: 4 s instead of 6.
  - Greater Frost Launcher: 6 s instead of 9.
  - Hell's Fist: 12 s instead of 20.
- **Tooltips and descriptions say "anywhere on the map".**

## 0.39.1

- **Stats reset every round.** The in-game scoreboard and overview (kills, units lost, gold earned, castle damage, rescue strikes) count the current round only.
- **Match totals are kept.** Match history and profile stats still add up all rounds of the match.

## 0.39.0

- **In-game chat with team and all channels:**
  - **Enter:** chats with your allies.
  - **Shift+Enter:** chats with every player in the match, enemies included.
  - **Labels:** messages are tagged [Allies] or [All], and the input box shows which channel you're typing to.

## 0.38.0

- **New game mode: Mirror.** Each round both teams get the same random factions, never one faction twice in a team.
- **Each faction at most once per team, in every mode:**
  - **Lobby:** factions a teammate plays are greyed out, with the teammate named in the tooltip.
  - **Server:** refuses a taken faction.
  - **Free faction picked automatically:** when you join a room or switch teams, and for new bots.
  - **Bots:** their faction menu marks taken factions.
  - **Random mode:** draws without repeats per team.
- **The balancing lab's team line-ups follow the same rule,** so no "Ironvow + Ironvow" teams.

## 0.37.2

- **Castle shop: team-wide items no longer stack.** An item a teammate already carries (Horn of Valor, Aegis Charm, Verdant Chalice, War Drum, Bulwark Seal) is greyed out, with a tooltip naming the carrier. The server refuses the purchase too, and bots skip it.
- **Items with a personal effect can still be bought by every teammate:** Warden's Crossbow, Mason's Hammer, and Pathfinder Boots, which also speed up the buyer's own builder.

## 0.37.1

- **Tidier numbers in the UI:**
  - Values from 10 up show as whole numbers, smaller ones with at most one decimal, so a tuned poison reads 4.2 dmg/s instead of 4.2312….
  - HP bars show whole HP.
- **Building tooltips and the info panel show upgrade paths:** "⬆ Upgradable into Shield Hall (…g) or Halberd Hall (…g)", with sapphire costs.

## 0.37.0

- **Economy:**
  - Every round starts with 150 gold instead of 100.
  - Warden's Crossbow costs 200 instead of 540, so it is a cheap early pick.
- **Repair is a bit slower:**
  - A full repair of a building takes 9× its build time instead of 8×.
  - Builders repair the castle at 11 HP/s instead of 12.
- **Fix: a unit killed in the same tick as its own blow is due now still strikes,** whichever side the game handles first that tick. Before, two archers finishing each other off could leave one standing depending on processing order.

## 0.36.1

- **Doomforge, Tidecall and Blightroot tuning after building duels.**
  - **Tidecall, weaker:**
    - −10% HP and damage: Murloc Warriors, Murloc Champions, the Ancient Hydra and its heads, and Royal Guards.
    - −5% HP and damage: Spitters, Sirens, Assassins, Guardians and Winged Serpents.
  - **Doomforge:**
    - The Chaos Champion has −14% HP and damage.
    - The Twins and the Red Dragon have −5%.
    - The Satyr has +7%.
  - **Blightroot:**
    - The Corrupted Annihilator has −14% HP and damage.
    - The Corrupted Ent has +7%.

## 0.36.0

- **Every faction has its own builder**, in its race's style:
  - Ironvow: a mason
  - Thornwild: a treeling gardener
  - Shardbound: a floating crystal apprentice
  - Cogspark: a goblin tinker
  - Duskmoon: a moon wisp
  - Bloodtusk: an orc peon
  - Sunspire: an elf artisan
  - Frostmark: a fur-clad dwarf
  - Gravewake: a hooded acolyte
  - Doomforge: an imp
  - Tidecall: a murloc thrall
  - Blightroot: a blighted cultist
- **Each builder raises its tool while working.**
- **Leaner faction picker in the lobby:**
  - Each faction shows only a builder portrait and its name.
  - The selected faction's description and traits appear in a details panel below the picker.

## 0.35.1

- **Frostmark and Gravewake tuning after building duels.**
  - **Frostmark, weaker:**
    - Wendigos and Ancient Wendigos: less HP, damage and pulverise; the howl is now −20%.
    - Magnataur: rarer, smaller crits and a weaker stomp.
    - Rime Throwers: less damage.
  - **Frostmark, stronger:** Frost Wolves.
  - **Gravewake, weaker:**
    - Necromancers raise their skeletons every 18 s instead of 14 s, and the skeletons last 16 s.
    - Flesh Golem: pulverises every 4th blow.
    - Bone Wyrm and Lich King: less damage.
    - Vampire Lords: less lifesteal.
  - **Gravewake, stronger:** zombies, skeletons, vampires and banshees.

## 0.35.0

- **New faction: Blightroot Coven**, after the castle-fight map's corrupted race. All twelve races of the map are now in the game.
  - **Units:** corrupted ents, then treants, then the elite Annihilator, whose blows weaken their target; void walkers and keepers whose aura rots enemy armour; felhounds with an attack-speed aura; infernal machines and tanks that detonate when destroyed; nether and shadow drakes; the incubus.
  - **Buildings:** a chaos splash tower; the Forgotten One, which raises tentacles around the enemy; the Well of Pain; and the Eye of Corruption special, which strips armour from every enemy unit on the battlefield.
  - **Look:** rotten treants with fel-green cracks, violet void walkers, tendrilled felhounds, spider-legged infernal machines, smoky drakes, a horned incubus and tentacles. Buildings are corrupted ancients (dead trees with glowing faces), broken void rings, a fel shrine with a hound skull, a hellgate furnace, a winged demon statue, a protector tree clutching a boulder, a toothed maw, a well of pain and a giant bloodshot eye on roots, all on blighted ground.
- **New mechanics:**
  - weakening blows;
  - the tentacle power.
- **Fix:** weakening auras on enemies (−damage, −armour) now stack with the enemy's own boosts instead of being overwritten by them.

## 0.34.0

- **New faction: Tidecall Dominion**, after the castle-fight map's naga race.
  - **Trait:** every unit regenerates 3 HP/s. Like the map's race, there is no tower.
  - **Units:** murlocs in pairs, from warriors to champions to assassins; swamp spitters, then the elite Ancient Hydra, which splits into two heads when it falls; naga guardians and royal guards; sirens who call lobsters; dragon turtles; winged serpents.
  - **Buildings:** the Coral Statue (regeneration aura, mends buildings); the Ancient Pyramid's earthquake; the Oracle of Sirens, which charms an enemy unit to your side; and the Tidal Guardian special, whose tsunami hits every ground enemy in its path.
  - **Look:** fish-headed murlocs, a toad-like spitter, the many-headed hydra, serpent-tailed naga with tridents, lobsters, spiked dragon turtles and winged serpents. Buildings are stilt huts over a tide pool, swamp wells, spawning pools with serpent arches, a coral throne, a lagoon, a serpent temple, a coral-grown statue, a stepped pyramid, a spiral shell oracle and a colossal naga rising from a frozen wave, all on wet sand.
- **New mechanics:**
  - **charm:** a unit changes sides; the client recolours it;
  - **tsunami:** line damage, with a rolling wave effect.

## 0.33.0

- **New faction: Doomforge Pact**, after the castle-fight map's chaos race.
  - **Chaos damage:** nearly every demon attacks with it, which hits every armour type fully. Like the map's race, the Pact has no tower and no siege unit.
  - **Units:** chaos warriors, then champions with a damage roar; satyrs, then quill demons, then the Twins (elite); succubi whose curse weakens enemies; blood fiends with lifesteal; red dragons; infernals that burn everything around them.
  - **Buildings:** the Magic Tower Ruin, whose present of chaos is in turn a blast, a stun, death or nothing; a volcano; the Shrine of Destruction, which cripples enemy buildings; and the Eraser special, which wipes out every enemy unit of the most numerous kind.
  - **Look:** horned red demons, goat-legged satyrs, a quill beast, the laughing-and-weeping twins, a winged succubus, blood fiends, a red dragon and a fel-burning infernal. Buildings are spiked obsidian citadels, brass demon cages, a golden altar, a fountain of blood, a lava crag nest, a fel-green demon gate, a shattered magic tower, a volcano, a stone fist and the void-eyed Eraser monolith, all on cracked obsidian with lava veins.
- **New mechanics:**
  - the cycling chaos power;
  - the erase power.

## 0.32.0

- **New faction: Gravewake Legion**, after the castle-fight map's undead race.
  - **Units:** zombies with a rotting bite, then plague bearers whose cloud rots nearby enemies; necromancers who raise skeletons, then the Lich King who raises death knights; vampires with lifesteal, whose lords call bats; banshees whose fear weakens enemies; the flesh golem; the flying bone wyrm.
  - **Buildings:** a skull pile that raises skeletons; the Turret of Souls; the Death Pit, which slays the nearest weak enemy outright; and the City of Decay special, which rots every enemy unit on the battlefield.
  - **Look:** zombies, robed necromancers with skull staffs, a crowned floating lich, skeletons, pale vampires and bats, banshees, a stitched golem and a skeletal wyrm. Buildings are a rotting hay cart and barns, rib-arched bone temples, a crypt, a graveyard, a haunted mine, a slaughterhouse, a dragon's ribcage, skull piles, a death pit and a rot-spewing necropolis, all on dead earth.
- **New mechanics:**
  - decay auras (enemies lose HP every second);
  - the slay power, with a dark ray and a violet burst.

## 0.31.1

- **Bloodtusk and Sunspire tuning after building duels.** The hand-converted values had clear outliers.
  - **Bloodtusk, weaker:**
    - Forest Trapper: less damage, smaller nets, less regeneration.
    - Axemaster: double crits every 4th blow instead of 2.5× every 3rd.
    - Troll Berserker: less damage.
  - **Bloodtusk, stronger:** grunts, veterans, kodos and the kodo riders.
  - **Sunspire, weaker:**
    - Elder Blademaster: 2.5× crit every 4th strike.
    - Blood Mage: less damage.
    - Sorceress and Wizard: weaker lightning and heals.
    - Master Archer, Dragonhawk Rider and Archer: slightly less damage.

## 0.31.0

- **New faction: Frostmark Clans**, after the castle-fight map's northern race.
  - **Units:** frost wolves, then polar bears, then magnataurs, which cleave, crit and stomp; wendigos, whose ancient form howls nearby enemies 25% weaker; ice-hurling yetis; ice trolls with frost armour for allies; the Ice Queen with frost novas; azure drakes with chilling breath.
  - **Buildings:** an icy splash tower; the Chilling Mushroom, which freezes the toughest flyer; frost launchers whose bolts freeze enemy buildings, so they stop training, shooting and casting for a while; and the World Freezer special, which calls long blizzards.
  - **Look:** white wolves and bears, a tusked magnataur, shaggy wendigos, yetis, blue ice trolls, a crowned ice queen and drakes. Buildings are snow-capped rocks, a glacier cave, igloos, fur huts, a crystal palace, a frozen crag, an ice tower, glowing mushrooms, trebuchets and a crown of ice, all on packed snow.
- **New mechanics:**
  - frozen buildings;
  - an anti-air freezing blast;
  - auras that weaken enemies.

## 0.30.0

- **New faction: Sunspire Concord**, after the castle-fight map's elf race (the high elves of the Elven Union).
  - **Units:** archers with headshots, then master archers; lightning-fast blademasters with crits and evasion; sorceresses who heal allies and call chain lightning, then wizards; blood mages whose fire bolts bounce; a ballista; dragonhawk riders that call solar flares.
  - **Buildings:** the Arcane Tower (five targets per volley), the City of Magic (hexes the toughest enemy), the Obelisk of Light (a sunbeam every 4 s), and the Golden Shrine special, which raises every 5th fallen ally nearby.
  - **Look:** golden-haired elves in crimson and gold, a gilded ballista and fiery dragonhawks. Buildings are white marble with golden domes and spires, a flaming ring portal, an orb-crowned tower, a little city skyline, a sun obelisk and a colonnaded shrine with a winged statue.
- **New mechanics:**
  - tower multi-shot;
  - the hex and light-beam powers;
  - reviving shrines.
  Each comes with its own effect: a pink puff, a golden ray, a column of light.

## 0.29.1

- **Duskmoon tuning after building duels** (the hand-converted values had some outliers):
  - Avatar of Vengeance: less HP, damage, lifesteal and death blast; dodges every 4th blow instead of every 3rd.
  - Avenging Spirit: also weaker, and dodges every 5th blow.
  - Druids and Sage Druids: less damage, and their entangle slows by 40% / 50% instead of 50% / 60%.
  - Glaive Thrower and Huntress: slightly less damage.
  - Ranger and Amazon: a bit stronger.

## 0.29.0

- **New faction: Bloodtusk Horde**, after the castle-fight map's orc race.
  - **Units:** grunts, then veterans, then axemasters, all with critical blows; axe-throwing troll berserkers that attack twice as fast below half health, then trappers whose nets stun; kodo beasts with three rider upgrades (spell-resistant, war drum or shield bearer); wyvern riders; shamans with a damage aura, then spirit walkers that call lightning; catapults with burning shells.
  - **Buildings:** a ceremonial totem (+20% attack speed), a serpent rock that spits poison, the Spear Tower (triple damage against flyers), and the Stasis Totem special, which freezes every enemy unit around it.
  - **Look:** green orcs with tusks and topknots, blue trolls with mohawks, shaggy kodos, leathery wyverns and a spiked catapult. Buildings are hide longhouses with spikes and skull banners, stilt huts, palisade pens, a rock roost, painted tepees, a carved totem pole, a stone serpent, a spear tower and a frost-rune totem, all on red earth.
- **New mechanics:**
  - berserk (attacks faster when hurt);
  - magic resistance;
  - tower bonus damage against a target class;
  - the stasis power (with an icy shockwave effect).

## 0.28.0

- **New faction: Duskmoon Covenant**, after the castle-fight map's night elf race. As with the other factions, the map gives the structure and numbers; names, text and look are our own.
  - **Units:** huntresses, then rangers, then amazons, whose volleys hit 3 / 5 enemies; druids that entangle; assassins that backstab; avenging spirits that pierce armour and explode when they fall; glaive throwers whose glaive bounces; healing faerie dragons.
  - **Buildings:** an aura that blocks part of every hit, the moonbeam lantern tower, the Moonstone Cache (+20% income), and the Starfall Obelisk special, which rains stars on the enemy instead of training a champion.
  - **Trait:** every unit dodges every 8th blow.
  - **Look:** lavender-skinned elves with moon tattoos, ghostly spirits and butterfly-winged faerie dragons. Buildings are curved silver-and-bark elven halls with crescent tips, a moon arch, haunted ruins, a moonwell, a lantern post and a starfall observatory, all on moonlit grass.
- **New mechanics:**
  - multi-shot;
  - death blasts;
  - a block aura;
  - a faction-wide evasion trait.
- Sprite code for new factions now lives in its own module per race (`client/src/game/races/`).
- The Ironvow trait no longer claims to be the only faction with healers.

## 0.27.1

- **Shardbound and Cogspark get their own look.** Every unit and building is painted in its own style, inspired by the castle-fight map's elementals and mechanical race. Before, they reused the existing shapes in new colours.
  - **Shardbound units:**
    - water spirits rising from a wave;
    - wind vortices;
    - living flames (horned Blaze Elementals, small Cinders);
    - floating lightning crystals;
    - boulder elementals with crystal veins;
    - a robed Master of Elements with four orbiting element orbs;
    - the Avatar champions (rock legs, a molten core, a water arm and a lightning fist).
  - **Shardbound buildings** stand on violet flagstones with crystal shards: fountains, wind cages, fire altars, storm pillars, rock piles with a glowing fissure, floating codices, an obelisk, a guard tower with orbiting boulders, a mana well and the four-pillar Nexus.
  - **Cogspark units:**
    - goblins with ears and goggles: flamegunners with fuel tanks, and Lunatic Goblins with a lit keg overhead;
    - tracked tanks in five builds;
    - rotorcraft;
    - clockwork golems;
    - a saw-bladed Shredder;
    - Goliath mechs with missile pods.
  - **Cogspark buildings** stand on hazard-striped steel decks: corrugated factories with sawtooth roofs and smokestacks, Quonset hangars, a demolition bunker with powder barrels, shield-dome generators, a coil tower, a scrap heap with a crane, a brass-domed exchange and the Goliath foundry.

## 0.27.0

- **Two new factions**, modelled on the next two races of the classic castle-fight map, the elementals and the mechanical race. As before, we took only the structure and numbers; names, text and look are our own.
  - **Shardbound Conclave** (elementals): ten buildings and 17 units.
    - Water spirits that shrug off ranged damage.
    - Wind elementals that fly and shoot only flyers, with gusts that slow.
    - Fire that breathes every 5th attack and splits into Cinders when it dies.
    - Chain-lightning elementals with a crackling shield.
    - Slow siege earth elementals.
    - A Codex that casts a monsoon, then upgrades into a ground blizzard or a meteor shower that only hits flyers.
    - An armour obelisk, a guard tower, a Mana Well (+20% income) and the Elemental Nexus champion line.
  - **Cogspark Syndicate** (mechanical): ten buildings and 16 units, and every building has +2 armour.
    - Flamegunners with splash.
    - A tank factory with three upgrade lines (mine layers, assault tanks, heavy tanks, then rocket tanks); tank plating blocks a flat part of every hit.
    - Rotorcopters and gyrocopters that stun.
    - Golems and shredders.
    - Lunatic Goblins that explode.
    - Shield generators, an Energy Tower whose shots bounce, a Spare Part Heap that mends buildings and the castle, a Scrap Exchange (+15% income) and the Goliath champion line.
- **New mechanics:**
  - suicide attackers;
  - tower shots that bounce between enemies;
  - meteor showers (storms on flyers only);
  - buildings that mend other buildings.
- **Fix:** ground cyclones no longer slow flyers flying over them.
- **Lobby and bots:** random factions and bot factions now pick from all four. The lobby shows all four faction cards.
- **Balancer:** verification samples line-up pairings at big team sizes. With four factions, 4v4 alone has about 600 pairings, so the team sizes now stay evenly weighted.

## 0.26.3+7 · balance

- Rebalanced after free repair, slower repair and stacking castle repair. Stonehide Giant −20% (was −18%); everything else is unchanged.
- Hard bots (verification): Ironvow wins 68% in 1v1, 50% in 2v2, 48% in 3v3, 48% in 4v4, and 53% overall.
- Bot ladder: Brutal beats Hard 81%, Hard beats Normal 85%, Normal beats Easy 90%.
- Known issue: 1v1 favours Ironvow. Its Militia opening decides most 1v1 games. A smaller Militia buff evens 1v1 but drops Ironvow to about 40% in 2v2, so it needs a design change rather than a knob.

## 0.26.3

- **Castle repair stacks:** every builder on the castle adds its 12 HP/s. A bigger team also faces more enemy units.

## 0.26.2

- **Builder repair is half as fast:** a full repair takes 8× the build time, about 12 HP/s on a tower.
- **The builder can repair your castle**, for free, at 12 HP/s: about 11 minutes from half to full. Use Repair castle on the castle's card, or right-click the castle. Several builders on one castle don't stack, so a 4v4 castle can't be healed out of reach. Bots repair their castle too when their builder is idle.

## 0.26.1

- **Builder repair is free now, and slower to make up for it.** A full repair takes 4× the build time (was 2.5×, at 35% of the price). That is about 25 HP/s on a tower: enough to mend a base between waves, but not enough to out-heal a push. The Mason's Hammer (5 HP/s on every nearby building) still stacks with it.

## 0.26.0+6 · balance

- Rebalanced after repair and the tower buff. Every check passes.
- Faction power: Ironvow 0.901 (its first tier ×0.97), Thornwild 1.110 (its first tier ×1.03). Militia +12.6% (was +4%).
- Hard bots (verification): Ironvow wins 59% in 1v1, 48% in 2v2, 50% in 3v3, 51% in 4v4, and 52% overall.
- Bot ladder: Brutal beats Hard 81%, Hard beats Normal 86%, Normal beats Easy 86%. Bot income: Normal 0.94, Brutal 1.18.
- No bot level has a blind spot against a single strategy. The rush weakness of 0.25.0 is gone (Hard now wins 56% against rushes).

## 0.26.0

- **Builder repair.** Select a damaged building of yours and press Repair (R), or right-click it. The builder walks over and repairs it, one building at a time.
  - A full repair takes 2.5× the build time (about 40 HP/s on a tower) and costs 35% of the gold invested. This follows the classic castle-fight builders: their repair takes 1.5× the build time and costs 35% of the price; ours is slower because our build times are short.
  - Without gold, a repair pauses until income arrives.
  - Bots repair too: Easy below 30% HP, Normal below 60%, Hard and Brutal below 75%.
- **Mason's Hammer** (420 gold, was 450) is now the slow area repair: every building of your team within 6 tiles of the builder regains 5 HP/s, for free. It no longer heals the castle. It is inspired by the map's Rune of Repair.
- **Towers hit hard now.** They used to kill one medium unit in 20+ seconds.
  - Bastion Tower: 75 pierce (was 32).
  - Cannon Bastion: 90 normal damage every 2 s with a wider splash. It was siege, which does only half damage to Thornwild's medium armour.
  - Strangle-Root: 115 siege (was 52).
  - Planning bots also build an extra tower per 6 spawners, and up to 3 under pressure.
- **Rescue strike:** 7-tile circle (was 6). It can now target anywhere in your own build zone, the same area your builder can build in.

## 0.25.0+5 · balance

- Balancer fix: the power fit now works relative to the starting tuning, and counts the `early` knob as strength. The `early` knob now moves only beyond its tolerance. The first run with the old fit drifted to Ironvow 30% and was discarded.
- Faction power: Ironvow 0.914, Thornwild 1.094 (Thornwild's first tier ×1.03).
- Units: Militia +4%, Mangonel +13%, Stonehide Giant −18%, Tempest Caller −4%, Thunder Stag −20%, Lancer −4%.
- Hard bots (verification): Ironvow wins 50% in 1v1, 37% in 2v2, 45% in 3v3, 43% in 4v4, and 44% overall. 1v1 is very sensitive to the opening: Militia +8%, as the balancer proposed, put Ironvow at 73% in 1v1, so it was hand-tuned down (see `docs/balance-report.md`).
- Bot ladder unchanged and in band: Brutal beats Hard 81%, Hard beats Normal 88%, Normal beats Easy 90%.

## 0.25.0
**Bots build varied armies**
- **Before:** bots only looked about 15 s ahead. Early income is around 1 gold/s, so the cheapest spawner was the only thing in reach: Normal and Hard bots built Militia Hall after Militia Hall (or Burrow after Burrow) and never upgraded.
- **Now, Normal and Hard plan:**
  - Every option is rated by value per gold, discounted only by how much extra gold it still needs compared with the soonest affordable one.
  - Each further copy of the same building is worth less.
  - Each round, every bot draws a doctrine: a random preference for melee, ranged, air, swarm, siege, towers, upgrades and so on. No two rounds look alike, and the counter logic still answers what the enemy fields.
  - Under pressure, or for the very first spawner, they buy right away.
- **Result in the lab:** the 1v1 gap between the factions disappeared. Ironvow won 20% of 1v1 games when its bots spammed Militia and wins 48% now. The Hard bot also no longer has a significant blind spot against human-style strategies.

**Fixed**
- **Buildings and the castle looked broken:** the left wall was missing, and the right wall was painted in front of the front wall. The camera tilt and the building art disagreed about which side wall faces the viewer. The battlefield now leans the other way, so every building shows its front wall, its shaded east wall on the right and its roof, as painted.
- **Side bias:**
  - **First-building bonus:** players who finish their first building on the same tick (common since the start countdown) now share the bonus place. Before, the left side got 20 gold and the right side 15.
  - **Burst positions:** units bursting on the exact centre line no longer burst in non-mirrored directions.
  - **Measured:** the left side now wins 48% (CI 44–52%), down from 56%.

**Balancer**
- **New `early` knob per faction:** it scales first-tier units (buildable spawners and what their units burst into) on top of `power`, steered by the gap between small games (1v1, 2v2) and big ones (3v3, 4v4).
- **Checks:**
  - `balance:check` now fails when that gap is over 15%.
  - The mirror-symmetry test also compares gold and runs for 90 s.

## 0.24.0+4 · balance
First balancer run for the reworked factions. It started from an untuned game and took 73 min; the full report is in docs/balance-report.md.
- **Factions:** Ironvow power 0.911, Thornwild 1.098. Untuned, Ironvow won 73%. Verified at 46% / 54% over 646 games, which is even within the margin.
- **Team sizes still differ.** Ironvow wins 20% in 1v1, 39% in 2v2, 61% in 3v3 and 65% in 4v4. One power knob per faction can only even out the average, so this needs a design change.
- **Units:**
  - Stonehide Giant ×0.89
  - Thunder Stag ×0.85
  - Lancer ×0.96
  - Mangonel ×1.08
  - Tempest Caller ×1.04
- **Bots:** Normal income 0.92 and Brutal 1.12 (was 1.30); Easy returns to 1.0. Brutal beats Hard 81% of the time, Hard beats Normal 90% and Normal beats Easy 75%.
- **Strategies:** Hard wins only 6% against Thornwild players who mass ranged units, and 19% against Thornwild swarms. Against Ironvow it does well.

## 0.24.0
**Factions reworked after the classic castle-fight races.** Ironvow follows the "human" race and Thornwild the "nature" race of a well-known Warcraft III castle-fight map. Its tech trees, stat ratios and signature abilities were translated to our scale: hit points about 1:1, damage per second ×0.6, range and speed ÷100, training times about 0.9×. Names, look and theme stay our own. Full overview: docs/factions.md.

*New mechanics* (all deterministic, so mirror matches stay mirror images):
- **Critical strike:** every n-th blow deals extra damage.
- **Bash:** every n-th blow stuns; stunned units glow pale blue.
- **Slam:** every n-th blow also hits the ground around the target.
- **Storm:** every n-th blow calls a lightning chain.
- **Evasion:** every n-th attack against the unit misses.
- **Shield wall:** half damage from ranged attacks.
- **Hardened skin:** blocks a flat amount of every hit.
- **Anti-air:** units that only shoot flyers.
- **Summons:** units that call helpers, which fade after a while.
- **Attack-speed aura.**
- **Building powers:**
  - Bombard: a shell arcs over the battlefield onto the nearest enemy building.
  - Cyclone: a whirlwind that damages and slows enemies.

*Ironvow*
- **Militia** wear heavy armour (4).
- **Shieldbearers** take half damage from ranged attacks, evade every 7th blow and still give nearby allies +2 armour.
- **Crossbow Lodge** has two upgrades:
  - Arbalest Range: anti-air only, very long range, triple damage on every 3rd bolt.
  - Powder Range (new): Grenadiers with splash bombs against ground units.
- **Mangonel:** fragile, very long range.
- **Cavalry line** follows the crusader → paladin → holy-warrior ratios:
  - Lancers stun with every 5th blow.
  - Vow Knights give +3 armour.
  - Paladins stun every 3rd blow and give +4 armour.
- **Thunderhawk Roost** replaces the Skyhawk Roost: sturdy flyers with holy bolts against air and ground. Every 7th bolt stuns and every 10th calls a lightning chain.
- **War Horn** replaces the War Banner: +25% attack speed instead of +20% damage.
- **Bastion Tower** is sturdier with more range. It can now also upgrade into a **Siege Battery** (new) that shells the nearest enemy building within 30 tiles every 15 s.
- **Counting House:** 180 gold, +20% income.

*Thornwild*
- **Vinelings** are bigger (120 HP) and their bites poison.
- **Briarlings** also burst into Sproutlings.
- **Gnashers** land a critical bite every 4th attack.
- **Thorn Archers** are tougher.
- **Elder Grove** now spawns a **Grove Keeper** that calls two thorny Treantlings every 24 s.
- **Storm Shamans and Stormcallers** are tougher.
- **Standing Stones** replace the Boulder Ram Pen. Their **Stonehide Giant** has hardened skin (blocks 5 per hit), slams the ground every 3rd blow and hits buildings 30% harder.
- **Stags** land critical blows and stun.
- **Moth Hive** upgrades into the **Jade Wyrm Roost** (new): an armoured flyer with splashing magic breath.
- **Mossheart** upgrades into the **Howling Hollow** (new): it keeps the regrowth aura and drops a cyclone on the nearest enemy every 14 s.
- **Strangle-Root** hurls splashing boulders.

Old ids were kept where a role changed (e.g. `tw_boulder_ram` is the Stonehide Giant), so saved matches still load.

## 0.23.0
- **Start countdown:** every round begins with 5 seconds in which the game stands still and nobody can build. Everyone gets the same chance at the first building, however fast their connection or loading. A large countdown shows the seconds left. Commands sent during it are refused with a short note. The countdown only begins once every player has loaded the battlefield (at most 20 s; a "Getting ready" screen names who is still loading), so slow loaders don't lose their 5 seconds.
- **Health bars by side:** your own units and buildings have green bars, your allies' teal, and the enemy's red. The length of the bar shows the health. Before, the colour showed health, so crowded fights were hard to read.
- **Rescue strike:**
  - Its circle is larger: radius 5 → 6 tiles.
  - Units it kills no longer release what would hatch from them, such as a Vineling's Sproutlings or a treant's Saplings, so the strike really clears its area.

## 0.22.0+3 · balance
First balancer run with the new bots (42 min instead of 182; full report in docs/balance-report.md).
- **Factions:** no change needed. Verified at Ironvow 54% / Thornwild 46% over 646 games, statistically even.
- **Bots:** Easy income 0.79 → 0.89, because the smarter Normal beat it 94% of the time. Brutal beats Hard 79%, Hard beats Normal 88%, Normal beats Easy 85%.
- **Strategies:** no bot level has a blind spot any more. Hard beats pure air, turtle and greed 100% of the time. Normal is clearly weaker against Thornwild strategists (13–44%) than against Ironvow ones (56–81%).

## 0.22.0
**Bots react to flyers**
- Bots now count how many of their spawners can hit flyers and keep that share in line with the share of flyers in the enemy army (up to 75%). Hard saves up to ~40 s of income and Normal ~25 s for an anti-air building instead of buying another ground spawner. Easy reacts too, but only every other decision.
- Bots remember what they have seen: flyers that died at the walls still count for a minute, and scouted spawn buildings count while they stand. Before, a wave that had just died was forgotten at once.
- Normal no longer buys whatever is cheapest the moment it can. It picks from what it can afford within ~15 s, with some randomness, and saves up for that pick.
- Pure flyers (moths) beat the Hard bot 69% of the time before. Now they win 0% (48 games). The other strategies are unchanged.

**Simulation lab**
- New balancer stage 4 · strategies, which only measures. Normal and Hard bots play every human-style strategy (pure air, swarm, turtle, rush, …) for every faction pairing. A bot that clearly loses to one strategy fails `npm run balance:check`, and the report names the strategy and faction. Multipliers can't fix that kind of gap, so the report points at the AI.
- Lab games run ~27% faster with identical results:
  - Units look for buildings in a cached list instead of scanning every entity.
  - Teammates share one vision grid.
  - The bot caches its unit scores.
- The balancer ends games once they are decided: one castle at least 20 points healthier, plus 1.2× the base value and the bigger army. In 220 traced games, this rule ended 217 early and named the wrong winner in none, saving ~7% of the playing time. `--no-adjudicate` turns it off.

## 0.21.2+2 · balance
First tuning for the 110×40 map (`npm run balance`, 182 min; full report in docs/balance-report.md).
- **Factions:** Ironvow power 1.008 → 0.979, Thornwild 0.992 → 1.021. The wider map favoured Ironvow (65% before tuning). Verified at 54% / 46% over 646 games, statistically even.
- **Units:** Lancer −4% and Elder Stag −15% (were 79% and 89% in duels); Halberdier +4% (20%).
- **Bots:** Easy income 1.00 → 0.79 and Normal 1.00 → 0.94, so each level clearly beats the one below. Brutal beats Hard 88%, Hard beats Normal 73%, Normal beats Easy 88%.
- Still uneven by team size: Ironvow wins 54% in 1v1, 38% in 2v2, 61% in 3v3 and 63% in 4v4. One power value per faction can only even out the average.

**Simulation lab**
- The balancer plays about the same number of games per team size (`--games`, `--verify-games`) and computes the uncertainty of the size-averaged win rate correctly. Before, 1v1 got 20 of 512 verification games but a quarter of the weight, so verifications scattered by ±8 points instead of the assumed ±3.

## 0.21.1
- The version label in the lower-right corner is larger and brighter (13 px instead of 10 px), so it's readable.

## 0.21.0
**Version label with balance revision**
- The version in the corner now reads e.g. `v0.21.0+1`: game version plus balance revision (see above). The balancer raises the revision whenever it writes a changed tuning, and its report and `tuning.ts` header name the full version.

**Simulation lab**
- Balancer tuning steps now draw line-up pairings uniformly at random. Before, every step included pure vs pure, which over-weighted those line-ups: on the 110×40 map, steps and full-grid verifications disagreed by 10–20 points, and the fit stalled between them.

## 0.20.0
**Bigger, horizontal map**
- The battlefield now runs straight from left to right on screen: a front 3/4 view, with the camera looking at the field from the south, replaces the diagonal isometric view. Buildings show their front wall, a narrow side wall and their roof; the castle gate faces the viewer.
- Map 80×28 → 110×40 tiles. Build zones 27×26 → 30×38 (+60% building area), and the neutral middle is twice as wide (24 → 48 tiles). Rocks are redrawn as three lanes around a centre boulder, point-symmetric as before.
- The minimap follows the new 5:1 shape.
- Games saved on the old map can't be resumed (the lobby says so instead of loading a broken game).

**Fairness**
- Regeneration and poison now tick for all units before anyone attacks. Before, the outcome depended on processing order: a unit hit before its own turn regenerated, one hit after didn't. Two mirrored units meeting in the exact centre of the new map exposed it.

**Simulation lab**
- The balancer's report flags a faction whose bot falls behind on one ladder step, such as Hard Thornwild beating Easy Ironvow only about 50% (true before this release too).

## 0.19.0
**Automatic balancer** (`npm run balance`)
- One command plays every line-up against every other at 1v1–4v4 (pure, mixed and mirror teams, both map sides), building duels and the bot difficulty ladder. It then tunes the balance and verifies the result on fresh seeds.
- Changes go only into a small generated file of multipliers, `shared/src/data/tuning.ts`: faction power, outlier units and bot income per level. The hand-written faction data stays the design intent. The game, tooltips and lab all use the tuned values.
- Writes `docs/balance-report.md`, which also lists what knobs can't fix (size-dependent strength, lopsided line-ups, side bias, support units) as items for a design look.
- Every game counts: a logistic fit of win rate against power and income over all games of a run picks each step.
- Tuning steps play a random sample of line-ups per team size; only verification plays the full grid.
- Verification passes when results are statistically indistinguishable from 50% (within ±5%).
- `npm run balance:check` measures only, exits 1 when out of band and prints the command that re-tunes just the failed stages (e.g. `--stages bots` after an AI change). `--quick --dry` is a 5-minute smoke test. See docs/balancing.md, "Automatic balancing".

## 0.18.1
- Renamed the game to **Castle Defense** (title, login/lobby screens, README, package name). The MongoDB database keeps its name `bastion_clash`, so existing accounts and saved games stay intact.

## 0.18.0
**Rescue strike pays out**
- Units killed by a rescue strike now count as regular kills of the player who cast it and pay the full gold bounty (plus Trophy Totem bonuses). The strike now also turns the defender's moment of need into gold, a small comeback lever.

**Fairness**
- The left side still won ~55–59% in larger test runs. Remaining causes fixed: units moved one after another within a tick, so a unit chasing an enemy reacted to where it had *already* stepped (now all units decide from start-of-tick positions and move together); separation pushes were applied in list order (now all at once); spawn jitter and the Vineling/treant burst came from one shared random stream (now mirror-symmetric draws). Two identical bots in a mirror match now stay exact mirror images through the opening and first clashes (new test `symmetry.test.ts`). Left side over 576 games: 52%.

**Bots**
- Teammate bots no longer fire their rescue strikes one tick apart into the same wave (the old guard only covered the very same tick).

**Balance**
- Vineling damage 5.5 → 5. Burrows outclassed every basic Ironvow building at equal gold, which made two Thornwild players nearly unbeatable in 2v2 (Ironvow+Ironvow won 6–16% against them).

**Simulation lab**
- Building duels now give both sides the same gold (within ~5%); before, counts were rounded per side, e.g. 4 Militia Halls (360 g) against 5 Burrows (425 g).

## 0.17.0
**Stronger bots**
- New **Brutal** difficulty: Hard's brain with instant reactions, no fog of war and +30% income (an openly cheating bot for veterans).
- Hard bots build their base behind the castle and strike early waves before they snowball (found with the new simulation lab: each change wins about 65–70% against the old Hard bot). Normal bots counter your army and aim their strikes better; Easy bots idle less and react faster.
- Teammate bots no longer burn both rescue strikes on the same wave in the same instant.
- Ladder now: Brutal beats Hard ~90%, Hard beats Normal ~78%, Normal beats Easy ~72%.

**Fairness fixes (found by the lab's mirror-match checks)**
- The left side won ~65% of identical matches. Causes fixed: bots on team 0 always decided a few ticks earlier; the first player's commands always applied first; units spawning exactly on tile edges took non-mirrored paths; path tie-breaks and edge collisions weren't point-symmetric; whoever acted first in a tick won even trades (now a unit killed in a tick still lands its blow). Left side now wins ~50%.
- Kill bounties no longer have a 1-gold minimum (swarms fed the enemy far more gold than elite armies); Sproutlings give no bounty.

**Balance**
- Treants deal normal damage (×1.8 against buildings) and have medium armour; Tempest Caller, Stormcaller and Stormhorn retuned; High Saint heals less; Burrow every 25 s, Vinelings 90 HP.

**Simulation lab** (`npm run lab`, see docs/balancing.md)
- Faction matrix over every line-up (1v1, 2v2 mixed teams, …) from both sides, with 95% confidence intervals; difficulty ladder; sparring against human-style strategies (turtle, ranged, swarm, air, siege, greed, tech, scout, rush); building duels per tier; AI arena, tuning and random search over bot profiles; `--patch` for what-if balance changes without editing data. Runs on all CPU cores.
- New generic tests for every faction's data (references, command card, opening, anti-air, sapphire gating, price ranges) and an opt-in statistical balance gate (`BALANCE=1`).

## 0.16.1
- Tests: fixed the long-standing "flaky" AI end-to-end test. It waited to *see* 4 buildings, but under fog of war the human only sees its own team's, so a quick defeat of its bot ally left it waiting forever. It now waits for the ally's first building early in the round. The failure messages of the test bots also show the last snapshot state.

## 0.16.0
- **Sapphires**, a rare second resource: every player starts each round with exactly 1, shown next to the gold. A further sapphire costs 1,500 gold in the castle shop (slot Z).
- Special buildings cost a sapphire on top of their gold (this replaces the old "one per player" rule). Cancelling a construction returns the sapphire.
- **Elite upgrades** for spawn buildings, each costing a sapphire: Ironvow Knight Stables → Paladin Chapter (Paladins: 3× charge, healing aura) and Cathedral → Sanctum of Dawn (High Saint: mighty heals, +2 armour aura); Thornwild Great Stag Den → Wild Hunt Grove (Stormhorn: huge trample, lifesteal) and Storm Lodge → Tempest Circle (Tempest Caller: venomous lightning jumping between 7 enemies).
- Buttons of sapphire buildings carry a gem badge; tooltips list the sapphire cost. Bots buy a sapphire when rich.
- Chain lightning of poisonous casters now poisons every enemy it hits.

## 0.15.0
Factions now play very differently.
- **Ironvow Order** (few but elite): Masonry (+1 armour on all buildings); the only healers; Shieldbearers project a shield wall (+3 armour to nearby allies); Halberdiers deal double damage to heavy armour; Lancers and Vow Knights charge (the first blow after marching hits 2× / 2.5×); Arbalesters ignore armour; Skyhawks deal double damage to flyers; the Bastion Tower upgrades into a splash-damage Cannon Bastion; champions carry a damage aura.
- **Thornwild Circle** (the swarm): every unit regenerates 1.5 HP/s and every building 4 HP/s; Burrows release two Vinelings at a time, and fallen Vinelings burst into two Sproutlings; Briarlings reflect melee damage (thorns); Gnashers heal from the damage they deal; Thorn Archers, Sylvan Snipers and Dusk Moths poison (damage over time and a slow, shown as a green tint); Moth Hives release clouds of three moths; Stags trample; fallen treants leave Saplings behind; Shamans lost their heals; the Amber Shrine became the Trophy Totem (+50% kill bounties instead of income); Strangle-Root hits harder as the faction's only defence.
- Tooltips and the info panel list every unit ability; the lobby shows each faction's traits.
- Balance pass for the new abilities (measured with bot-vs-bot simulations); smarter hard bots: they read what the enemy's attacks are strong against, avoid flooding fragile chaff, respect enemy splash and save up for anti-air when needed.

## 0.14.1
- Fix: zooming with a touchpad (e.g. MacBook) is smooth instead of far too fast: zoom now follows the scroll distance, and pinch-to-zoom zooms the map rather than the page.
- Fix: a newly finished (or upgraded) spawn building starts its training bar from zero and runs its own full cycle, instead of starting half-way; each building keeps its own rhythm.
- Lobby: mode cards get more room; faction dots are neutral in Random factions mode.

## 0.14.0
- Game modes, set by the host in the game lobby (or when creating a game): **Standard** (everyone picks a faction) and **Random factions** (every player gets a random faction at the start of each round, announced in the round message). The mode is shown in the game list, the room and the top bar, and is kept in saved games.

## 0.13.1
- Fix: units and buildings reveal twice as much of the fog of war (12 tiles each way, a 24×24 area instead of 12×12).
- Fix: the builder can no longer leave its own build zone; move orders beyond it stop at the border.

## 0.13.0
- First-building bonus: each round, the first three players to finish a building get +20, +15 and +10 gold (once per player; upgrades don't count). Everyone sees an announcement.

## 0.12.1
- Fix: the Menu button in the top bar now opens the menu on click (the bar was redrawn several times a second, which swallowed clicks; F10 still works).

## 0.12.0
- Countryside: painted ponds with reeds, lily pads and glinting water; trees sway in the wind; fireflies drift along the forest edge.
- The ruined castle is repainted: jagged masonry walls, broken towers, the stump of the keep, heaps of stone blocks and charred beams.
- Smaller, warmer hit sparks; the round label in the top bar no longer wraps on narrow windows.

## 0.11.0
- Rescue strike: a glowing rune circle burns into the ground while the strike charges, golden motes rise, the sunbeam fades softly into the ground, and the strike leaves scorched earth with dying embers and a ring of dust.
- Thornwild units polished: the dusk moth spreads four patterned wings, the boulder ram has a proper horned head, treants wear a painted leaf crown.

## 0.10.0
- Visual overhaul, part 3 (interface): dark tooled-leather console and top bar with gilded trim, filigree-cornered panels, bronze command buttons, parchment tooltips, engraved buttons, restyled scoreboard, dialogs, lobby and login.
- Command-card and portrait icons are cropped to the painted art; the minimap shows the painted battlefield.
- Framed health bars with a team-colour cap; hits land on the side of a building facing the attacker; new units fade in with a puff of dust; the selection ring pulses.

## 0.9.0
- Visual overhaul, part 2: every unit repainted (shaded figures with outlines, faction gear: shields, halberds, crossbows, bows, staves, lances, champion halo, treants, boulder rams, moths and hawks) with 4-frame walk cycles and an attack pose for melee, ranged, casters and healers.
- Micro-animations: idle breathing, fallen units topple and fade, arrows follow their arc, magic orbs leave glowing trails, boulders tumble and raise dust, construction sites throw dust and sparks.
- Ambient life: grass swaying in passing gusts, flocks of birds with shadows racing over the ground, butterflies, slow shafts of sunlight.

## 0.8.0
- Visual overhaul, part 1: a hand-painted battlefield (no tile grid) with meadow colour variation, grass strokes, wildflower drifts and a winding dirt road with wheel ruts, pebbles and puddles.
- Buildings and castles repainted with real materials: masonry, half-timbering, planks, slate, shingle and thatch roofs, glowing windows, chimneys, domes, round towers and a castle with keep, gatehouse, courtyard and team banner.
- Soft cast shadows (late-afternoon sun), waving team pennants, flickering braziers and torches, chimney smoke.
- Painted forest, bushes and boulders; soft-edged fog of war; warm colour grade, vignette, drifting cloud shadows and pollen motes.

## 0.7.0
- Builder items cost 3× as much (420–720 gold): true late-game purchases.
- Mason's Hammer repairs 10 HP/s (was 30).
- Removed the Far-Seer Spyglass and the Signal Flare. New: *War Drum* (team spawn buildings train 15% faster) and *Bulwark Seal* (+4 armor for team buildings and the castle).
- Items are passive only now, so the 1–3 item keys are gone.

## 0.6.0
- Castle shop: eight expensive late-game items for the builder (press B or click your castle). The builder carries up to 3 until the round ends: team-wide damage, armor, regeneration and speed auras, a crossbow so the builder shoots enemies, a repair hammer, a spyglass for longer sight, and a single-use flare that restores the rescue strike.
- Item bag above the command card (keys 1–3), items in the builder info panel and the Tab scoreboard, range rings for the crossbow and hammer.
- Bots buy items in long rounds; Hard bots carry a flare when their castle is in trouble.

## 0.5.3
- Fix: units standing in front of a castle's (or large building's) side were drawn behind it; they now always appear in front.

## 0.5.2
- Fix: the castle-collapse cinematic is timed in real time, so it stays in step with the server on slow machines, and it stops cleanly if the next round starts early.

## 0.5.1
- Fix: the dev server now picks up version bumps immediately (the corner label showed an old version).

## 0.5.0
- Medieval look: titles, buttons, banners, labels and floating combat texts use the MedievalSharp font; descriptions, tooltips and tables keep the readable Alegreya Sans.

## 0.4.0
- Every unit (own and enemy) always shows its health bar. Alt now reveals all building health bars.

## 0.3.0
- Spawn buildings show a "next unit" timer bar when selected (above the building and in the info panel).

## 0.2.0
- Version number shown in the lower-right corner.

## 0.1.0
- First backed-up version: multiplayer castle auto-battler with lobby, AI bots, fog of war, rounds, persistence, countryside around the map and the castle-collapse cinematic.
