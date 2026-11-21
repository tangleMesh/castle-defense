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

## The learner (`server/src/learner/`)

- **Self-play worker:** a worker thread at the lowest CPU priority plays one bot game after another: 1v1 or 2v2, random factions, skills and personalities.
  - **When it runs:** only while no real match is running, the event loop is calm and the load is low. Otherwise the game pauses mid-way.
  - **Rate:** at most `LEARNER_GAMES_PER_HOUR` games an hour (default 400), spaced out.
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
| `LEARNER=off\|idle\|always` | off: only use what was learned; idle (default): self-play when the server is quiet; always: self-play continuously (still lowest priority) |
| `LEARNER_GAMES_PER_HOUR` | upper limit of self-play games per hour (default 400) |
| `LEARNER_TRAIN_VALUE`, `LEARNER_TRAIN_POLICY` | new samples before a training attempt (default 3000 / 1500) |
| `GET /api/learner` | status: games, skill curve, best openings per faction, model version, A/B win rate |
| `POST /api/learner/rollback` `{ version }` | back to an earlier model version (header `x-admin-token` = `ADMIN_TOKEN`) |
| `POST /api/learner/models` `{ enabled }` | switch the models off or on (same header) |
