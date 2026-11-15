# Changelog

Bastion Clash follows [semantic versioning](https://semver.org): new features bump the minor version, bug fixes the patch version. The version is set in the root `package.json` and shown in the lower-right corner of the game.

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
