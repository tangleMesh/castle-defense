# Castle Defense

A multiplayer browser game in the style of the classic WC3 *castle* custom maps. Two teams, with up to 4 players each, defend their own castle. Every player commands one builder. Your buildings train units, and those units march on the enemy castle by themselves.

- **Spawn buildings** train one unit at a time on a timer. Many of them can be upgraded (some offer a choice of two upgrades).
- **Aura and utility buildings** add damage or regeneration auras, slow enemies, defend with towers, or raise your income.
- **Sapphires** (the map's legendary limit): every player starts each round with 1 and can buy more in the castle shop for 1,800 gold. Each legendary building needs one.
- **Twelve factions, copied from the castleFight map** (the author's Warcraft III map): every race with the map's build list, upgrade trees, costs, hit points, damage, ranges, spawn times, bounties and abilities, under our own names and looks. See [docs/factions.md](docs/factions.md) for every number:
  - *Ironvow* (Human): footmen and evasive defenders, crusaders, paladins and the legendary Holy Warrior, gryphon riders, warlocks, snipers, marksmen and heavy gunners, mortars, the Gjallarhorn, long-range artillery and the Heroic Shrine.
  - *Thornwild* (Nature): poisonous spiders that split when they die, furbolg shamans, dryads and keepers of the grove with their treants, slumbering bears, emerald dragons, mountain giants, the Ancient of Gale, the Ancient Guardian and the Ancient of Wonders.
  - *Shardbound* (Elemental): water spirits that most attacks pass through, wind elementals that ground enemy flyers, fire elementals that split, lightning that arcs to several targets, earth elementals that hit harder the healthier they are, the legendary Master of Elements and the Linker.
  - *Cogspark* (Mechanical): flamegunners, armoured tanks that shrug off small hits, mine layers, rotor- and gyrocopters hunting flyers, iron and adamant golems, shredders, lunatic goblins, the legendary Goliath, energy shields and the Power Plant.
  - *Duskmoon* (Night Elf): huntresses, multishot rangers and the legendary Amazon, druids that entangle, stealthy assassins backstabbing casters, vengeful spirits, glaive throwers, faerie dragons, Elune's Lantern, the Silver Glade, the Obelisk of Wilderness and the Starfall Obelisk.
  - *Bloodtusk* (Orc): critical axes, berserk trolls that ensnare flyers, kodo riders with auras, wyverns, shamans, a catapult, a blessing totem and a totem that freezes every enemy.
  - *Sunspire* (Elf): evasive archers with headshots, critical-striking blademasters, sorceresses and the legendary Wizard calling chain lightning, bouncing bloodthirsters, ballistae, dragonhawks, the Obelisk of Light, the City of Magic and the Golden Shrine.
  - *Frostmark* (Northern): wolves, bears and magnataurs, pulverizing wendigos, ice trolls that freeze their targets, the Ice Queen, rime throwers, azure drakes, frost launchers that freeze buildings and the World Freezer.
  - *Gravewake* (Undead): rotting zombies and plague bearers, necromancers raising skeletons, the soul-stealing Lich King, vampires that turn their victims, banshees, flesh golems, frost wyrms, a death pit and the City of Decay.
  - *Doomforge* (Chaos): cleaving chaos warriors, satyrs and quill demons, the immune twins, cursing succubi, chaos-born blood fiends, red dragons and burning infernals, with chaotic magic, a volcano, Hell's Fist and the Eraser.
  - *Tidecall* (Naga): regenerating murlocs, cleaving naga, hydras that split, turtles, sirens, earthquakes, mind control and tsunamis, but no tower.
  - *Blightroot* (Corrupted): weakening treants, incinerating void walkers with armour-breaking auras, felhounds, infernal machines, drakes, an overtaking incubus, tentacles, the Well of Pain and the Eye of Corruption.
- **Repair**: select a damaged building of yours and press Repair (R), or right-click it. Your builder walks over and repairs it, one building at a time: it's free, but slow (a full repair takes 120 s). The builder can also repair your castle (select it or right-click it): 11 HP/s per builder (teammates' builders stack). It slows down snowballing: a base that holds can mend itself.
- **Rescue strike** (on your builder's command card, or `T`): once per round, call down sunfire anywhere in your own build zone. It kills every enemy unit in a large circle (7 tiles), including whatever would hatch from them, such as a Giant Spider's Forest Spiders.
- **Castle shop** (the castleFight map's items, our names; press `B` or click your castle). Permanent items stay with your builder until the round ends (six slots); consumables work the moment you buy them. Some unlock later in the round and each restocks a while after you buy it:
  - *Spark Staff* (180 gold, 300 lumber): your builder shoots a spark at a nearby enemy every second (60 spell damage).
  - *Stoneskin Scroll* (180): allies near your builder heal 400 HP and get +8 armor for 30 s.
  - *Mason's Rune* (120): buildings near your builder regain 5 HP/s; runes stack.
  - *Storm Orb* (660, from minute 15): every 60 s your builder throws a chain lightning (10 targets, 1000 damage to the first).
  - *Rhythm Engine* (720): your team's units move 15% faster and attack 30% faster.
  - *Thunder Drums* (780): +33% damage for your team's units.
  - *Fury Shard* (720, from minute 5) / *Rage Heart* (1680, from minute 10): double / quadruple team damage for 30 s.
  - *Sapphire* (1800, the map's Cheese): one more legendary building.

  The team-wide items don't stack within a team. Normal and Hard bots buy items too.

- **Economy (the castleFight map's, with every gold amount × 1.2)**: every round starts with 300 gold and 125 lumber. All gold prices, bounties and bonuses are the map's × 1.2 (`GOLD_FACTOR`); lumber stays as in the map. Income comes every 10 s: 6 gold plus 2% of the value of your spawn buildings (towers and legendaries pay less), raised by Treasure Chests (+25% for the first, each further one 15% less). Kills pay the unit's bounty. **Lumber** is earned by finishing buildings and upgrades (their value) and pays for towers, Treasure Chests and legendary buildings.
- **Fast rounds** (about 5–7 minutes): castles have 5000 HP but no attack of their own, so units, towers and the rescue strike are the only defence. You can build behind your castle, but a 2-tile ring around it stays free so nothing hides behind it or blocks the path. Income buildings stack up to +30%. Your last hits show a small floating "+gold" popup.
- **Fog of war**: you always see your own base area. Beyond it you only see a 24×24 tile area around each unit on your team. The server only sends each team what it can see. Enemy buildings you've spotted stay on the map as greyed-out "last seen" ghosts. Between rounds the whole map is revealed.
- **Map**: 110×40 tiles, castle to castle from left to right. Each team builds in a 30-tile-wide zone at its end; the 48-tile neutral middle is split into three lanes by rock outcrops.
- **Best-of rounds**: a round ends when a castle falls. Each new round starts on a fresh map with a new builder, fresh gold and a refreshed rescue strike, after a 5-second countdown in which nobody can build yet, so everyone gets the same start.
- **Invite friends**: every lobby game has a short invite code. Share the code or the invite link (`…/?join=CODE`) in Discord or any chat: the link takes your friends straight into the game (after signing in), and the code works in the lobby's "Got an invite?" box.
- **Game modes**: *Standard*: every player picks a faction, each faction at most once per team. *Random factions*: everyone gets a random faction each round, never twice in a team. *Mirror*: each round both teams get the same random factions.
- **Statistics & Elo**: after the final round a statistics page shows every player's kills, losses, gold, castle damage and strikes, the rounds, and each account's Elo change. Accounts start at 1000; a team's rating is its players' average, and bots count as Easy 800, Normal 1000, Hard 1200, Brutal 1400. The lobby shows your rating, its change per battle and a chart of your progress.
- **2D or 3D graphics**: every player picks their own view, from the lobby header or the in-game menu (F10); the choice is saved in the browser. 3D (three.js, loaded only when used) shows real terrain, rocks, a forest, the castles and every building as 3D models: each building style has its own procedural shape in its colours. Units stay the painted sprites, standing upright in the 3D world (2.5D). Controls, camera, minimap and HUD work the same in both views.
- **Computer players**: the host can fill any slot with an AI and pick its faction and team. The AI runs on the server and sends the same commands a player would, under the same fog of war.
  - *Auto* (default) plays as strong as the humans in the game: every Auto bot gets a target Elo that makes both teams' averages equal (a lone player meets a bot of their own Elo; with bots on both sides everyone aims at the humans' average), and its skill follows that Elo. It counts with that Elo in the rating update.
  - Every bot has its own **personality** (aggressive or greedy, tech or spam, defensive, loves flyers, stubborn or adaptive, chatty or quiet), plans its round (rush, eco, tech, turtle, air or balanced), reads the enemy's plan from what it has seen and switches to a counter, and goes all-in or turtles when it's clearly behind.
  - In real matches bots act like people: human reaction times, limited actions per minute, attention lapses, and a bit of chat ("gl hf", "gg", answers to greetings).
  - The fixed levels *Easy*, *Normal*, *Hard* and *Brutal* remain. Brutal openly cheats (+30% income, no fog of war). Every bot fires its strike to save a team building that is about to fall. Bots rejoin automatically when a saved game is resumed.
- **Bots that keep learning**: a background learner ([docs/bots.md](docs/bots.md)) learns from every real match and, while the server is idle, from self-play games at the lowest CPU priority: which plans win per faction, how strong each skill level is on the Elo scale, and small neural models (win chance, what good players build next) that are only kept when they beat the current ones. Status: `GET /api/learner`.
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
