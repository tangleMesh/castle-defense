# Changelog

Castle Defense versions look like `0.21.0+2`, shown in the lower-right corner of the game:

- `0.21.0` is the **game version** ([semantic versioning](https://semver.org), root `package.json`): new features bump the minor version, bug fixes the patch version. Balance runs never change it.
- `+2` is the **balance revision** (`revision` in `shared/src/data/tuning.ts`): `npm run balance` adds 1 whenever it writes a changed tuning. It never resets, not even when the game version changes.

So `0.21.0+2 → 0.21.0+3` is a pure balance change, and `0.21.0+3 → 0.22.0+3` is a game change with the same balance. Balance-only releases have headings like `## 0.21.0+3 · balance`.

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
