# Bots and the background learner

## Layers (`shared/src/ai/`)

| Module | What it does |
|---|---|
| `ai.ts` | `AiPlayer`, the bot: economy and build planner, counters against the scouted army, anti-air, rescue strike, repairs, items, placement. It issues the same commands a human client sends. |
| `persona.ts` | A personality per bot (seeded): skill 0–1.5, style (aggression, tech, economy, defence, air) and temperament (tilt, stubbornness, chattiness). `personaProfile()` turns it into the planner's settings; skill 0 / 0.5 / 1 match the old Easy / Normal / Hard. |
| `strategy.ts` | Game plans (rush, eco, tech, turtle, air, balanced), plan choice by Thompson sampling over learned win rates weighed by taste, enemy-plan recognition from fog-legal sightings, counter plans. |
| `human.ts` | Human-like input in real matches: log-normal reaction times, an APM limit, attention lapses, chat. Off in the lab, so lab results stay deterministic. |
| `calibration.ts` | The skill ↔ Elo curve; `skillForElo()` gives an Auto bot its skill from its target Elo. |
| `features.ts`, `mlp.ts`, `models.ts`, `recorder.ts` | The game as one player sees it (30 numbers, fog of war respected), a small MLP with Adam, the live models (value: P(win the round); policy: next building category), and the recorder that turns games into training samples. |
| `learning.ts` | Pure update rules: strategy stats with forgetting, Elo-style skill-bucket calibration, a monotone curve. |

`shared/src/elo.ts` `botTargets()` gives each Auto bot the Elo that makes the teams' averages equal.

## Fair play

Bots never get advantages a player can't have:
- **Economy:** income is the same for every level (`AI_INCOME` is all 1, not tunable).
- **Vision:** bots see what a player of their team would see. That means the fog of war, and no stealthed enemy units, for scouting, rescue strikes, saving buildings and the models' features alike.
- **Commands:** they send the same commands a client sends.
- **Speed:** in real matches they react with human reaction times and a limited number of actions per minute.

Difficulty comes only from how well they play.

## Matchmaking bots (`server/src/matchmaking.ts`)

When a ranked search doesn't find enough real players within its semi-random wait, the free slots go to bot accounts.
- **Accounts:** these are regular-looking players (`users` with `bot: true`, which can't sign in) with names, ratings and a match history, and their Elo moves with results.
- **Choice:** the matchmaker usually picks a random free account whose rating is near the target Elo that makes the match fair (`botTargets`, ±90). One time in four (`newBotChance`), or when none fits, it creates a brand-new account, so the pool of bot players grows over time.
- **Play:** the AI plays it at that target's skill.
- **Visibility:** to clients they are ordinary accounts.

## The learner (`server/src/learner/`)

- **Self-play worker:** a worker thread at the lowest CPU priority plays one bot game after another: 1v1 or 2v2, random factions, skills and personalities.
  - **When it runs:** on the live server (`LEARNER=always`) continuously, one game right after another, at the lowest CPU priority; off by default and in dev. In `idle` mode only while no real match is running and the machine is quiet; otherwise the game pauses mid-way.
  - **Rate:** unlimited by default; `LEARNER_GAMES_PER_HOUR` can set a cap.
- **What it learns:**
  - **Strategy stats:** which plans win, per faction and against which enemy plan. Old results fade, so balance changes and new habits show up.
  - **Skill calibration:** Elo per skill level. Real matches against humans count 4× as much as self-play, because human ratings anchor the scale.
  - **Models:**
    - Value and policy MLPs are trained on self-play samples (policy: strong winners only) and on human samples from real matches. Human samples are stored in the `botSamples` collection, because human play is what makes bots play like people.
    - A candidate model replaces the current one only if it predicts held-out games better.
    - Self-play also pits bots with models against bots without (A/B). If the model side wins under 45% over 80+ games, the models are switched off until a better one arrives.
- **State:** stored in MongoDB (`learner` collection), with the last 5 model versions kept for rollback.

### Settings and endpoints

| | |
|---|---|
| `LEARNER=off\|idle\|always` | off (default, and in dev): only use what was learned; idle: self-play only when the server is quiet; always (the live deployment): self-play continuously, one game after another (lowest CPU priority) |
| `LEARNER_GAMES_PER_HOUR` | optional upper limit of self-play games per hour (default 0 = unlimited) |
| `LEARNER_TRAIN_VALUE`, `LEARNER_TRAIN_POLICY` | new samples before a training attempt (default 3000 / 1500) |
| `GET /api/learner` | status: games, skill curve, best openings per faction, model version, A/B win rate, and `strength` (see below) |
| `POST /api/learner/rollback` `{ version }` | back to an earlier model version (header `x-admin-token` = `ADMIN_TOKEN`) |
| `POST /api/learner/models` `{ enabled }` | switch the models off or on (same header) |

## How good are the bots? (`GET /api/learner` → `strength`)

| Field | Meaning |
|---|---|
| `summary` | One sentence: the benchmark win rate and the Elo of the strongest and the Hard-level bot |
| `vsOriginalHard` | Every 5th self-play game is a benchmark: the learning Auto bot at skill 1 (Hard strength, with plans, experience and models) vs the original Hard bot that never learns, on the same faction. `winRate` over the last ~200 games (50% = no better; above = the learning helped), `allTimeWinRate`, and a `trend` point every 50 benchmark games |
| `eloScale` | The Elo the bots really play at (strongest, Hard-level, Normal-level, weakest), calibrated from results; real matches count most |
| `vsHumans` | Real matches with only bots on one side and only people on the other: the bots' win rate and the win rate Elo expected (equal = calibrated) |
| `models` | How often the live models are right on held-out samples. Value: who wins the round (50% = guessing). Policy: which of 10 kinds of building comes next (10% = guessing) |

