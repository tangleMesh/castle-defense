# Changelog

Bastion Clash follows [semantic versioning](https://semver.org): new features bump the minor version, bug fixes the patch version. The version is set in the root `package.json` and shown in the lower-right corner of the game.

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
