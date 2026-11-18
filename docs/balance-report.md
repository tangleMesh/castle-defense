# Castle Defense · automatic balance report

Version 0.25.0+5

2026-11-18T03:00:41.809Z · check only · stages factions · 23 min

- Faction power: ironvow 0.914 · thornwild 1.094 (early 1.030)
- Bot income: easy 1.00 · normal 0.92 · hard 1.00 · brutal 1.12
- Unit multipliers: Lancer ×0.961/0.961, Militia ×1.04/1.04, Mangonel ×1.127/1.127, Stonehide Giant ×0.819/0.819, Tempest Caller ×0.961/0.961, Thunder Stag ×0.8/0.8

## Hand adjustment after the run

The full balancer run (`npm run balance`) reached 53% / 47% overall, but 1v1 sat at Ironvow 73%. Its duel stage had given the Militia +8%,
and the 1v1 game between hard bots hinges on that opening: Militia ±4% or Ironvow power ±1.5% swings 1v1 by about 20 points.
The shipped tuning keeps the run's unit multipliers except Militia (+4% instead of +8%) and sits between two measured power settings:

| Ironvow power · Militia | 1v1 | 2v2 | 3v3 | 4v4 | overall |
|---|---|---|---|---|---|
| 0.898 · ×1.083 (run result) | 73% | 41% | 51% | 48% | 53% |
| 0.898 · ×1.04 | 48% | 37% | 44% | 44% | 43% |
| 0.930 · ×1.04 | 70% | 42% | 46% | 50% | 52% |
| **0.914 · ×1.04 (shipped)** | **50%** | **37%** | **45%** | **43%** | **44%** |

Overall Ironvow stays a few points short, mostly from 2v2. Evening it out needs a design change rather than a global knob (see "Needs a design look").

## 1 · Unit outliers (building duels)

Iteration 1:
- Militia Hall 17% → Militia ×1.041 hp, ×1.041 dmg
- Standing Stones 83% → Stonehide Giant ×0.852 hp, ×0.852 dmg
- Stag Den 87% → Thunder Stag ×0.819 hp, ×0.819 dmg
- Siege Yard 23% → Mangonel ×1.127 hp, ×1.127 dmg
- Tempest Circle 89% → Tempest Caller ×1.000 hp, ×1.000 dmg

Iteration 2:
- Militia Hall 17% → Militia ×1.083 hp, ×1.083 dmg
- Standing Stones 77% → Stonehide Giant ×0.819 hp, ×0.819 dmg
- Stag Den 83% → Thunder Stag ×0.800 hp, ×0.800 dmg
- Tempest Circle 78% → Tempest Caller ×0.961 hp, ×0.961 dmg

Iteration 3:
- Stag Den 78% → Thunder Stag ×0.800 hp, ×0.800 dmg

Iteration 4:
- Stag Den 78% → Thunder Stag ×0.800 hp, ×0.800 dmg

## 2 · Factions (hard bots, all line-ups, team sizes 1/2/3/4)

Tuning steps play a sample of 4 line-up pairings per team size (drawn at random); verification plays the full grid.

| Step | power | win rate | games | fitted slope |
|---|---|---|---|---|

Power now: ironvow 0.914 · thornwild 1.094 (early 1.030)

### Faction win rate per team size (verification run)

| Team size | ironvow | thornwild | games |
|---|---|---|---|
| 1v1 | 50% (41%–59%) | 50% (41%–59%) | 200 |
| 2v2 | 37% (29%–46%) | 63% (54%–71%) | 162 |
| 3v3 | 45% (37%–54%) | 55% (46%–63%) | 144 |
| 4v4 | 43% (35%–52%) | 57% (48%–65%) | 140 |
| **average** | **44%** | **56%** | 646 |

Small (1v1, 2v2) minus big games (3v3, 4v4): ironvow -1% · thornwild +1% (the `early` knob targets ±15%)

## 3 · Bot levels (1v1, all faction pairings)

Target: the higher level wins ~80% (band 70%–90%). Hard keeps income 1.

| Iteration | income | brutal>hard | hard>normal | normal>easy |
|---|---|---|---|---|
| 1 | easy 1.00 · normal 0.92 · hard 1.00 · brutal 1.12 | 81% | 88% | 90% |

Income now: easy 1.00 · normal 0.92 · hard 1.00 · brutal 1.12

## 4 · Bots against human-style strategies (1v1)

Each strategy is the same level's brain pushed towards one style (shared/src/lab/sparring.ts). The bot should win about half of these games or more; below 40% with the whole 95% CI under 50% it has a blind spot.

### normal

| strategy | normal wins | 95% CI | vs ironvow | vs thornwild | games |
|---|---|---|---|---|---|
| siege | 34% | 20%–52% | 31% | 38% | 32 |
| tech | 34% | 20%–52% | 50% | 19% | 32 |
| swarm | 44% | 28%–61% | 63% | 25% | 32 |
| rush | 44% | 28%–61% | 56% | 31% | 32 |
| melee | 47% | 31%–64% | 50% | 44% | 32 |
| scout | 47% | 31%–64% | 63% | 31% | 32 |
| ranged | 56% | 39%–72% | 75% | 38% | 32 |
| air | 59% | 42%–74% | 56% | 63% | 32 |
| greed | 63% | 45%–77% | 69% | 56% | 32 |
| turtle | 70% | 53%–83% | 75% | 66% | 32 |

### hard

| strategy | hard wins | 95% CI | vs ironvow | vs thornwild | games |
|---|---|---|---|---|---|
| rush | 22% | 11%–39% | 19% | 25% | 32 |
| ranged | 38% | 23%–55% | 50% | 25% | 32 |
| swarm | 47% | 31%–64% | 50% | 44% | 32 |
| siege | 47% | 31%–64% | 25% | 69% | 32 |
| scout | 56% | 39%–72% | 44% | 69% | 32 |
| air | 59% | 42%–74% | 44% | 75% | 32 |
| tech | 59% | 42%–74% | 63% | 56% | 32 |
| melee | 63% | 45%–77% | 63% | 63% | 32 |
| greed | 84% | 68%–93% | 75% | 94% | 32 |
| turtle | 94% | 80%–98% | 94% | 94% | 32 |

## Next step

Re-tune only what failed:

```bash
npm run balance -- --stages factions
```

## ✗ Out of band

- faction ironvow wins 44% overall (want 50% ± 5%)
- faction thornwild wins 56% overall (want 50% ± 5%)

## All line-ups (verification run, 646 games)

| Line-up A | Line-up B | A wins | 95% CI | games | avg min | |
|---|---|---|---|---|---|---|
| ironvow | ironvow | 53% | 37%–67% | 40 | 10.9 | mirror |
| ironvow | thornwild | 50% | 41%–59% | 120 | 10.3 |  |
| ironvow+ironvow | ironvow+ironvow | 43% | 21%–67% | 14 | 10.6 | mirror |
| ironvow+ironvow | ironvow+thornwild | 18% | 9%–32% | 40 | 10.2 | ⚠ |
| ironvow+ironvow | thornwild+thornwild | 38% | 24%–53% | 40 | 10.6 |  |
| ironvow+ironvow+ironvow | ironvow+ironvow+ironvow | 67% | 30%–90% | 6 | 11.3 | mirror |
| ironvow+ironvow+ironvow | ironvow+ironvow+thornwild | 35% | 18%–57% | 20 | 11.0 |  |
| ironvow+ironvow+ironvow | ironvow+thornwild+thornwild | 10% | 3%–30% | 20 | 11.7 | ⚠ |
| ironvow+ironvow+ironvow | thornwild+thornwild+thornwild | 75% | 53%–89% | 20 | 12.0 | ⚠ |
| ironvow+ironvow+ironvow+ironvow | ironvow+ironvow+ironvow+ironvow | 50% | 15%–85% | 4 | 13.5 | mirror |
| ironvow+ironvow+ironvow+ironvow | ironvow+ironvow+ironvow+thornwild | 17% | 5%–45% | 12 | 11.3 | ⚠ |
| ironvow+ironvow+ironvow+ironvow | ironvow+ironvow+thornwild+thornwild | 17% | 5%–45% | 12 | 12.6 | ⚠ |
| ironvow+ironvow+ironvow+ironvow | ironvow+thornwild+thornwild+thornwild | 17% | 5%–45% | 12 | 13.1 | ⚠ |
| ironvow+ironvow+ironvow+ironvow | thornwild+thornwild+thornwild+thornwild | 50% | 25%–75% | 12 | 13.4 |  |
| ironvow+ironvow+ironvow+thornwild | ironvow+ironvow+ironvow+thornwild | 25% | 5%–70% | 4 | 12.2 | mirror |
| ironvow+ironvow+ironvow+thornwild | ironvow+ironvow+thornwild+thornwild | 25% | 9%–53% | 12 | 12.9 | ⚠ |
| ironvow+ironvow+ironvow+thornwild | ironvow+thornwild+thornwild+thornwild | 58% | 32%–81% | 12 | 13.1 |  |
| ironvow+ironvow+ironvow+thornwild | thornwild+thornwild+thornwild+thornwild | 42% | 19%–68% | 12 | 14.0 |  |
| ironvow+ironvow+thornwild | ironvow+ironvow+thornwild | 67% | 30%–90% | 6 | 12.0 | mirror |
| ironvow+ironvow+thornwild | ironvow+thornwild+thornwild | 45% | 26%–66% | 20 | 12.3 |  |
| ironvow+ironvow+thornwild | thornwild+thornwild+thornwild | 35% | 18%–57% | 20 | 12.5 |  |
| ironvow+ironvow+thornwild+thornwild | ironvow+ironvow+thornwild+thornwild | 25% | 5%–70% | 4 | 14.3 | mirror |
| ironvow+ironvow+thornwild+thornwild | ironvow+thornwild+thornwild+thornwild | 33% | 14%–61% | 12 | 12.6 |  |
| ironvow+ironvow+thornwild+thornwild | thornwild+thornwild+thornwild+thornwild | 42% | 19%–68% | 12 | 13.1 |  |
| ironvow+thornwild | ironvow+thornwild | 57% | 33%–79% | 14 | 11.7 | mirror |
| ironvow+thornwild | thornwild+thornwild | 30% | 18%–45% | 40 | 9.9 |  |
| ironvow+thornwild+thornwild | ironvow+thornwild+thornwild | 50% | 19%–81% | 6 | 11.6 | mirror |
| ironvow+thornwild+thornwild | thornwild+thornwild+thornwild | 20% | 8%–42% | 20 | 12.4 | ⚠ |
| ironvow+thornwild+thornwild+thornwild | ironvow+thornwild+thornwild+thornwild | 75% | 30%–95% | 4 | 13.5 | mirror |
| ironvow+thornwild+thornwild+thornwild | thornwild+thornwild+thornwild+thornwild | 42% | 19%–68% | 12 | 13.5 |  |
| thornwild | thornwild | 53% | 37%–67% | 40 | 10.7 | mirror |
| thornwild+thornwild | thornwild+thornwild | 64% | 39%–84% | 14 | 11.5 | mirror |
| thornwild+thornwild+thornwild | thornwild+thornwild+thornwild | 67% | 30%–90% | 6 | 11.9 | mirror |
| thornwild+thornwild+thornwild+thornwild | thornwild+thornwild+thornwild+thornwild | 25% | 5%–70% | 4 | 16.1 | mirror |

| Faction | win rate (non-mirror) | 95% CI | weighted games |
|---|---|---|---|
| ironvow | 44% | 39%–48% | 480.0 |
| thornwild | 56% | 52%–61% | 480.0 |

Left side wins 52% (CI 48%–56%) · draws 0 · avg 11.4 min
