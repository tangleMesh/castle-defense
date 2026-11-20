# Castle Defense

A multiplayer browser game in the style of the classic WC3 *castle* custom maps. Two teams, with up to 4 players each, defend their own castle. Every player commands one builder. Your buildings train units, and those units march on the enemy castle by themselves.

- **Spawn buildings** train one unit at a time on a timer. Many of them can be upgraded (some offer a choice of two upgrades).
- **Aura and utility buildings** add damage or regeneration auras, slow enemies, defend with towers, or raise your income.
- **Sapphires** (the map's legendary limit): every player starts each round with 1 and can buy more in the castle shop for 1,500 gold. Each legendary building needs one.
- **Distinct factions**, each modelled on a classic castle-fight race, see [docs/factions.md](docs/factions.md):
  - *Ironvow* (human) fights in elite formations with shield walls, healers, gunpowder, artillery and stunning cavalry.
  - *Thornwild* (nature) swarms with poison, thorns, summoned treants, stone giants, cyclones, regrowth and a kill-bounty economy.
  - *Shardbound* (elementals) binds missile-proof water spirits, sky-hunting wind, splitting fire, chain lightning and siege earth, and its storm books rain on the ground or burn the sky.
  - *Duskmoon* (night elves) fights with evasive archers whose volleys hit several enemies, entangling druids, backstabbing assassins, vengeful spirits that explode when they fall, healing faerie dragons and a starfall obelisk.
  - *Bloodtusk* (orcs) brings tough axes, raging troll berserkers, kodo beasts with three kinds of riders, wyverns, shamans, a poison-spitting serpent rock and a stasis totem that freezes armies.
  - *Sunspire* (high elves) has sharpshooting archers, lightning-fast blademasters, healing sorceresses who call chain lightning, dragonhawks, a hexing City of Magic, an Obelisk of Light and a golden shrine that raises the fallen.
  - *Frostmark* (northerners) sends wolves, polar bears and magnataurs, wendigos that howl enemies weaker, ice trolls with frost armour, an ice queen, azure drakes, and frost launchers that freeze enemy buildings solid.
  - *Gravewake* (undead) raises rotting zombies, skeleton-summoning necromancers and a lich, vampires, wailing banshees, a flesh golem and a bone wyrm, with a death pit that slays and a City of Decay that rots every enemy on the field.
  - *Doomforge* (chaos demons) hits every armour type fully with chaos damage: chaos warriors, satyrs and quill demons, the twins, succubi, blood fiends, red dragons and infernals. It has no tower and no siege, but a magic ruin that curses, a volcano, a shrine that cripples buildings and an Eraser that wipes out a whole kind of enemy.
  - *Tidecall* (naga) fights with regenerating murlocs in pairs, naga guardians, sirens with lobsters, dragon turtles, winged serpents and an elite hydra. It has no tower, but an oracle that turns enemies, an earthquake pyramid and a tidal guardian whose tsunamis sweep the field.
  - *Blightroot* (corrupted) fields treants whose blows weaken, void walkers that rot armour, felhounds, infernal machines that detonate, drakes and an incubus, with tentacles from the deep, a well of pain and an Eye of Corruption that strips every enemy's armour.
  - *Cogspark* (mechanical) fields flamegunners, plated tanks, rotorcraft, golems and suicide goblins, with shield generators, a bouncing energy tower and scrap heaps that mend buildings.
- **Repair**: select a damaged building of yours and press Repair (R), or right-click it. Your builder walks over and repairs it, one building at a time: it's free, but slow (a full repair takes 120 s). The builder can also repair your castle (select it or right-click it): 11 HP/s per builder (teammates' builders stack). It slows down snowballing: a base that holds can mend itself.
- **Rescue strike**: once per round, call down sunfire anywhere in your own build zone. It kills every enemy unit in a large circle (7 tiles), including whatever would hatch from them, such as a Vineling's Sproutlings.
- **Castle shop** (the castleFight map's items, our names; press `B` or click your castle). Permanent items stay with your builder until the round ends (six slots); consumables work the moment you buy them. Some unlock later in the round and each restocks a while after you buy it:
  - *Spark Staff* (150 gold, 300 lumber): your builder shoots a spark at a nearby enemy every second (60 spell damage).
  - *Stoneskin Scroll* (150): allies near your builder heal 400 HP and get +8 armor for 30 s.
  - *Mason's Rune* (100): buildings near your builder regain 5 HP/s; runes stack.
  - *Storm Orb* (550, from minute 15): every 60 s your builder throws a chain lightning (10 targets, 1000 damage to the first).
  - *Rhythm Engine* (600): your team's units move 15% faster and attack 30% faster.
  - *Thunder Drums* (650): +33% damage for your team's units.
  - *Fury Shard* (600, from minute 5) / *Rage Heart* (1400, from minute 10): double / quadruple team damage for 30 s.
  - *Sapphire* (1500, the map's Cheese): one more legendary building.

  The team-wide items don't stack within a team. Normal and Hard bots buy items too.

- **Economy (as in the castleFight map)**: every round starts with 250 gold and 125 lumber. Income comes every 10 s: 5 gold plus 2% of the value of your spawn buildings (towers and legendaries pay less), raised by Treasure Chests (+25% for the first, each further one 15% less). Kills pay the unit's bounty. **Lumber** is earned by finishing buildings and upgrades (their value) and pays for towers, Treasure Chests and legendary buildings.
- **Fast rounds** (about 5–7 minutes): castles have 5000 HP but no attack of their own, so units, towers and the rescue strike are the only defence. You can build behind your castle, but a 2-tile ring around it stays free so nothing hides behind it or blocks the path. Income buildings stack up to +30%. Your last hits show a small floating "+gold" popup.
- **Fog of war**: you always see your own base area. Beyond it you only see a 24×24 tile area around each unit on your team. The server only sends each team what it can see. Enemy buildings you've spotted stay on the map as greyed-out "last seen" ghosts. Between rounds the whole map is revealed.
- **Map**: 110×40 tiles, castle to castle from left to right. Each team builds in a 30-tile-wide zone at its end; the 48-tile neutral middle is split into three lanes by rock outcrops.
- **Best-of rounds**: a round ends when a castle falls. Each new round starts on a fresh map with a new builder, fresh gold and a refreshed rescue strike, after a 5-second countdown in which nobody can build yet, so everyone gets the same start.
- **Game modes**: *Standard*: every player picks a faction, each faction at most once per team. *Random factions*: everyone gets a random faction each round, never twice in a team. *Mirror*: each round both teams get the same random factions.
- **Statistics & Elo**: after the final round a statistics page shows every player's kills, losses, gold, castle damage and strikes, the rounds, and each account's Elo change. Accounts start at 1000; a team's rating is its players' average, and bots count as Easy 800, Normal 1000, Hard 1200, Brutal 1400. The lobby shows your rating, its change per battle and a chart of your progress.
- **2D or 3D graphics**: every player picks their own view, from the lobby header or the in-game menu (F10); the choice is saved in the browser. 3D (three.js, loaded only when used) shows real terrain, rocks, a forest, the castles and every building as 3D models: each building style has its own procedural shape in its colours. Units stay the painted sprites, standing upright in the 3D world (2.5D). Controls, camera, minimap and HUD work the same in both views.
- **Computer players**: the host can fill any slot with an AI at *Easy*, *Normal*, *Hard* or *Brutal* difficulty and pick its faction and team. The AI runs on the server and sends the same commands a player would. Easy, Normal and Hard don't cheat; Hard counters your army composition, builds a safe base behind its castle, plans its economy and strikes early waves before they snowball. *Brutal* openly cheats: +30% income, no fog of war and instant reactions. Every bot fires its strike to save a team building that is about to fall. Bots rejoin automatically when a saved game is resumed.
- **Abilities**: units have every-n-th-blow abilities (critical strikes, stuns, slams, lightning, evasion), some explode, and some buildings cast powers (artillery shells, cyclones, meteor showers) or mend nearby buildings.
- **Persistence**: accounts, stats, match history, and live match snapshots in MongoDB. A host can **save & exit** and resume the match another day with the same players. Matches that a server crash or restart interrupts also become resumable.

## Versioning

The game uses semantic versioning. The current version is in the root `package.json`, shown in the lower-right corner of the game, and every release is listed in [CHANGELOG.md](CHANGELOG.md).

## Stack

| Part | Tech |
| --- | --- |
| `shared/` | Deterministic simulation (20 Hz), game data, protocol (zod), all TypeScript |
| `server/` | Node 24, fastify (REST + static), `ws` websockets, MongoDB driver |
| `client/` | Phaser 3 renderer (front 3/4 view, battlefield left to right) with all art generated procedurally at runtime, plus a DOM HUD. Built with Vite |

The server is authoritative. Clients send only intents (move, build, upgrade, sell, rescue, buy). The server steps the simulation and broadcasts compact snapshots at 10 Hz, and clients interpolate between them.

## Run with Docker (recommended)

```bash
docker compose up --build
# open http://localhost:5173 (HOST_PORT=… to use another port)
```

## Local development

```bash
npm install
docker run -d -p 27017:27017 --name bc-mongo mongo:7   # or any MongoDB
npm run dev:server         # API + websocket on :3000 (tsx watch)
npm run dev:client         # Vite on :5173, proxies /api and /ws to :3000
```

No MongoDB at hand? Run `npm run build && npm run dev:memory` to get a server with in-memory persistence (nothing is kept after a restart).

## Tests

```bash
npm test             # simulation unit tests + websocket end-to-end tests (in-memory DB, accelerated ticks)
npm run typecheck
npm run balance      # auto-tune factions, units and bot levels → shared/src/data/tuning.ts + docs/balance-report.md
npm run balance -- --check   # only check (incl. bots vs human-style strategies), exit 1 when out of band
npm run lab -- all   # balance + AI report (faction matrix, difficulty ladder, sparring, duels) → lab-report.md
BALANCE=1 npx vitest run shared/test/lab.test.ts   # slow statistical balance gate
```

The **simulation lab** plays thousands of headless bot matches on all CPU cores to keep factions balanced and bots strong. See [docs/balancing.md](docs/balancing.md) for the workflow, especially when adding a new faction.

```bash
```

To run the bot scenarios against a real MongoDB-backed deployment:

```bash
TICK_MS=2 docker compose up -d --build
BASE_URL=http://localhost:5173 RESTART_CMD="docker compose restart server" npm run bots
```

## Controls

| Input | Action |
| --- | --- |
| Right-click | Move builder (cancels its queue); on an own damaged building: repair it |
| Left-click | Select a unit or building |
| `Q W E R / A S D F / Z X C V` | Command card (build, upgrade, repair, rescue strike, stop/sell) |
| Shift + click | Queue several buildings |
| `T` | Rescue strike targeting |
| `B` | Castle shop (builder items) |
| `F1` / Space / Backspace | Select builder / center on builder / center on castle |
| Arrows, screen edge, middle-drag, wheel | Camera |
| Alt | Show all building health bars (unit health bars are always shown) |
| Tab (hold) | Scoreboard: army, buildings, special, items, kills, losses, castle damage, income, gold, strikes |
| Enter | Chat |
| F10 / Esc | Menu (pause vote, save & exit, leave) |

## Layout

```
shared/src/data/factions/*.ts   buildings & units (data-driven; add a faction by adding a file)
shared/src/sim/                 sim.ts (step loop), combat, movement (flow fields), economy,
                                placement, rescue, rounds, auras, items, spawning, snapshot
shared/src/data/items.ts        castle-shop items for the builder
server/src/                     app.ts (http+ws), lobby.ts, matchRoom.ts, persistence/
client/src/                     game/ (scene, textures, session, iso), ui/ (hud, lobby, auth)
```
