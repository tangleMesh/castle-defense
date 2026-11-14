# Bastion Clash

A multiplayer browser game in the style of the classic WC3 *castle* custom maps. Two teams, with up to 4 players each, defend their own castle. Every player commands one builder. Your buildings train units, and those units march on the enemy castle by themselves.

- **Spawn buildings** train one unit at a time on a timer. Many of them can be upgraded (some offer a choice of two upgrades).
- **Aura and utility buildings** add damage or regeneration auras, slow enemies, defend with towers, or raise your income.
- **One special building per player**: the expensive Sun Citadel or Elder Heartwood. It summons a champion and can be upgraded twice.
- **Rescue strike**: once per round, call down sunfire near your own castle. It kills every enemy unit in a large circle.
- **Gold only**: you earn income every 10 s (a small base amount plus 1.5% of the value of the buildings you own) and a small bounty for each kill. Each round starts with 100 gold, enough for one cheap spawn building.
- **Fast rounds** (about 5–7 minutes): castles have 8000 HP but no attack of their own, so units, towers and the rescue strike are the only defence. You can build behind your castle, but a 2-tile ring around it stays free so nothing hides behind it or blocks the path. Income buildings stack up to +30%. Your last hits show a small floating "+gold" popup.
- **Fog of war**: you always see your own base area. Beyond it you only see a 12×12 tile area around each unit on your team. The server only sends each team what it can see. Enemy buildings you've spotted stay on the map as greyed-out "last seen" ghosts. Between rounds the whole map is revealed.
- **Best-of rounds**: a round ends when a castle falls. Each new round starts on a fresh map with a new builder, fresh gold and a refreshed rescue strike.
- **Computer players**: the host can fill any slot with an AI at *Easy*, *Normal* or *Hard* difficulty and pick its faction and team. The AI runs on the server and sends the same commands a player would, with no gold or vision cheats. Hard counters your army composition, plans its economy, and saves the rescue strike for big waves. Every bot fires its strike to save a team building that is about to fall. Bots rejoin automatically when a saved game is resumed.
- **Factions**: *Ironvow Order* (soldiers, siege, sunfire) and *Thornwild Circle* (swarms, beasts, lightning, treants).
- **Persistence**: accounts, stats, match history, and live match snapshots in MongoDB. A host can **save & exit** and resume the match another day with the same players. Matches that a server crash or restart interrupts also become resumable.

## Versioning

The game uses semantic versioning. The current version is in the root `package.json`, shown in the lower-right corner of the game, and every release is listed in [CHANGELOG.md](CHANGELOG.md).

## Stack

| Part | Tech |
| --- | --- |
| `shared/` | Deterministic simulation (20 Hz), game data, protocol (zod), all TypeScript |
| `server/` | Node 24, fastify (REST + static), `ws` websockets, MongoDB driver |
| `client/` | Phaser 3 isometric renderer with all art generated procedurally at runtime, plus a DOM HUD. Built with Vite |

The server is authoritative. Clients send only intents (move, build, upgrade, sell, rescue). The server steps the simulation and broadcasts compact snapshots at 10 Hz, and clients interpolate between them.

## Run with Docker (recommended)

```bash
docker compose up --build
# open http://localhost:3000
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
npm run balance      # offline bot-vs-bot win rates per faction / side
npm run balance:ai   # offline AI difficulty ladder (easy / normal / hard)
```

To run the bot scenarios against a real MongoDB-backed deployment:

```bash
TICK_MS=2 docker compose up -d --build
BASE_URL=http://localhost:3000 RESTART_CMD="docker compose restart server" npm run bots
```

## Controls

| Input | Action |
| --- | --- |
| Right-click | Move builder (cancels its queue) |
| Left-click | Select a unit or building |
| `Q W E R / A S D F / Z X C V` | Command card (build, upgrade, rescue strike, stop/sell) |
| Shift + click | Queue several buildings |
| `T` | Rescue strike targeting |
| `F1` / Space / Backspace | Select builder / center on builder / center on castle |
| Arrows, screen edge, middle-drag, wheel | Camera |
| Alt | Show all health bars |
| Tab (hold) | Scoreboard: army, buildings, special, kills, losses, castle damage, income, gold, strikes |
| Enter | Chat |
| F10 / Esc | Menu (pause vote, save & exit, leave) |

## Layout

```
shared/src/data/factions/*.ts   buildings & units (data-driven; add a faction by adding a file)
shared/src/sim/                 sim.ts (step loop), combat, movement (flow fields), economy,
                                placement, rescue, rounds, auras, spawning, snapshot
server/src/                     app.ts (http+ws), lobby.ts, matchRoom.ts, persistence/
client/src/                     game/ (scene, textures, session, iso), ui/ (hud, lobby, auth)
```
