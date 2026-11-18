# Castle Defense

A multiplayer browser game in the style of the classic WC3 *castle* custom maps. Two teams, with up to 4 players each, defend their own castle. Every player commands one builder. Your buildings train units, and those units march on the enemy castle by themselves.

- **Spawn buildings** train one unit at a time on a timer. Many of them can be upgraded (some offer a choice of two upgrades).
- **Aura and utility buildings** add damage or regeneration auras, slow enemies, defend with towers, or raise your income.
- **Sapphires**: a rare second resource. Every player starts each round with 1 and can buy more in the castle shop for 1,500 gold. Special buildings (each faction's champion building, upgradable twice) and elite upgrades of spawn buildings cost a sapphire on top of their gold.
- **Four distinct factions**, each modelled on a classic castle-fight race, see [docs/factions.md](docs/factions.md):
  - *Ironvow* (human) fights in elite formations with shield walls, healers, gunpowder, artillery and stunning cavalry.
  - *Thornwild* (nature) swarms with poison, thorns, summoned treants, stone giants, cyclones, regrowth and a kill-bounty economy.
  - *Shardbound* (elementals) binds missile-proof water spirits, sky-hunting wind, splitting fire, chain lightning and siege earth, and its storm books rain on the ground or burn the sky.
  - *Cogspark* (mechanical) fields flamegunners, plated tanks, rotorcraft, golems and suicide goblins, with shield generators, a bouncing energy tower and scrap heaps that mend buildings.
- **Repair**: select a damaged building of yours and press Repair (R), or right-click it. Your builder walks over and repairs it, one building at a time: it's free, but slow (a full repair takes 8× the build time, about 12 HP/s on a tower). The builder can also repair your castle (select it or right-click it): 12 HP/s per builder (teammates' builders stack). It slows down snowballing: a base that holds can mend itself.
- **Rescue strike**: once per round, call down sunfire anywhere in your own build zone. It kills every enemy unit in a large circle (7 tiles), including whatever would hatch from them, such as a Vineling's Sproutlings.
- **Castle shop**: expensive late-game items for your builder (press `B` or click your castle). The builder carries up to 3 until the round ends:
  - *Horn of Valor* (660): +20% damage for every unit of your team.
  - *Aegis Charm* (600): +3 armor for every unit of your team.
  - *Verdant Chalice* (540): every unit of your team regenerates 4 HP/s.
  - *Pathfinder Boots* (420): your team's units move 15% faster, your builder 30%.
  - *War Drum* (720): every spawn building of your team trains units 15% faster.
  - *Bulwark Seal* (480): +4 armor for every building of your team and the castle.
  - *Warden's Crossbow* (540): your builder shoots nearby enemy units (it stays invulnerable).
  - *Mason's Hammer* (420): every building of your team within 6 tiles of your builder regains 5 HP/s, for free.

  The team-wide items work anywhere on the map and add to building auras. The same item carried by two teammates doesn't stack. Normal and Hard bots buy items when a round runs long and they can afford them.
- **Gold only**: you earn income every 10 s (a small base amount plus 1.5% of the value of the buildings you own) and a small bounty for each kill. Each round starts with 100 gold, enough for one cheap spawn building.
- **Fast rounds** (about 5–7 minutes): castles have 8000 HP but no attack of their own, so units, towers and the rescue strike are the only defence. You can build behind your castle, but a 2-tile ring around it stays free so nothing hides behind it or blocks the path. Income buildings stack up to +30%. Your last hits show a small floating "+gold" popup.
- **Fog of war**: you always see your own base area. Beyond it you only see a 24×24 tile area around each unit on your team. The server only sends each team what it can see. Enemy buildings you've spotted stay on the map as greyed-out "last seen" ghosts. Between rounds the whole map is revealed.
- **Map**: 110×40 tiles, castle to castle from left to right. Each team builds in a 30-tile-wide zone at its end; the 48-tile neutral middle is split into three lanes by rock outcrops.
- **Best-of rounds**: a round ends when a castle falls. Each new round starts on a fresh map with a new builder, fresh gold and a refreshed rescue strike, after a 5-second countdown in which nobody can build yet, so everyone gets the same start.
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
