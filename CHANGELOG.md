# Changelog

Bastion Clash follows [semantic versioning](https://semver.org): new features bump the minor version, bug fixes the patch version. The version is set in the root `package.json` and shown in the lower-right corner of the game.

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
