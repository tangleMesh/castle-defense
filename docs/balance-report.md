# Castle Defense · automatic balance report

Version 0.24.0+4 (balance revision 3 → 4)

2026-11-17T20:12:50.152Z · tuning run · stages units, factions, bots, strategies · 73 min

- Faction power: ironvow 0.911 · thornwild 1.098
- Bot income: easy 1.00 · normal 0.92 · hard 1.00 · brutal 1.12
- Unit multipliers: Stonehide Giant ×0.887/0.887, Thunder Stag ×0.852/0.852, Mangonel ×1.083/1.083, Tempest Caller ×1.041/1.041, Lancer ×0.961/0.961
- shared/src/data/tuning.ts updated

## 1 · Unit outliers (building duels)

Iteration 1:
- Standing Stones 83% → Stonehide Giant ×0.961 hp, ×0.961 dmg
- Stag Den 85% → Thunder Stag ×0.961 hp, ×0.961 dmg
- Siege Yard 24% → Mangonel ×1.041 hp, ×1.041 dmg
- Tempest Circle 24% → Tempest Caller ×1.041 hp, ×1.041 dmg

Iteration 2:
- Standing Stones 83% → Stonehide Giant ×0.923 hp, ×0.923 dmg
- Stag Den 83% → Thunder Stag ×0.923 hp, ×0.923 dmg
- Siege Yard 24% → Mangonel ×1.083 hp, ×1.083 dmg

Iteration 3:
- Stag Den 83% → Thunder Stag ×0.887 hp, ×0.887 dmg
- Lancer Stables 83% → Lancer ×0.961 hp, ×0.961 dmg

Iteration 4:
- Standing Stones 75% → Stonehide Giant ×0.887 hp, ×0.887 dmg
- Stag Den 83% → Thunder Stag ×0.852 hp, ×0.852 dmg

## 2 · Factions (hard bots, all line-ups, team sizes 1/2/3/4)

Tuning steps play a sample of 4 line-up pairings per team size (drawn at random); verification plays the full grid.

| Step | power | win rate | games | fitted slope |
|---|---|---|---|---|
| 1 | ironvow 1.000 · thornwild 1.000 | ironvow 73% · thornwild 26% | 192 | 30 |
| 2 | ironvow 0.967 · thornwild 1.034 | ironvow 68% · thornwild 31% | 192 | 8 |
| 3 | ironvow 0.911 · thornwild 1.098 | ironvow 53% · thornwild 47% | 192 | |
| 3 ✓ verify | ironvow 0.911 · thornwild 1.098 | ironvow 46% · thornwild 54% | 646 | |

Power now: ironvow 0.911 · thornwild 1.098

### Faction win rate per team size (verification run)

| Team size | ironvow | thornwild | games |
|---|---|---|---|
| 1v1 | 20% (14%–28%) | 80% (72%–86%) | 200 |
| 2v2 | 39% (31%–48%) | 61% (52%–69%) | 162 |
| 3v3 | 61% (52%–69%) | 39% (31%–48%) | 144 |
| 4v4 | 65% (56%–73%) | 35% (27%–44%) | 140 |
| **average** | **46%** | **54%** | 646 |

## 3 · Bot levels (1v1, all faction pairings)

Target: the higher level wins ~80% (band 70%–90%). Hard keeps income 1.

| Iteration | income | brutal>hard | hard>normal | normal>easy |
|---|---|---|---|---|
| 1 | easy 1.00 · normal 1.00 · hard 1.00 · brutal 1.30 | 98% | 65% | 88% |
| 2 | easy 1.00 · normal 0.92 · hard 1.00 · brutal 1.12 | 81% | 90% | 75% |

Income now: easy 1.00 · normal 0.92 · hard 1.00 · brutal 1.12

## 4 · Bots against human-style strategies (1v1)

Each strategy is the same level's brain pushed towards one style (shared/src/lab/sparring.ts). The bot should win about half of these games or more; below 40% with the whole 95% CI under 50% it has a blind spot.

### normal

| strategy | normal wins | 95% CI | vs ironvow | vs thornwild | games |
|---|---|---|---|---|---|
| ranged | 41% | 26%–58% | 50% | 31% | 32 |
| melee | 44% | 28%–61% | 44% | 44% | 32 |
| greed | 44% | 28%–61% | 44% | 44% | 32 |
| tech | 44% | 28%–61% | 38% | 50% | 32 |
| scout | 44% | 28%–61% | 63% | 25% | 32 |
| turtle | 47% | 31%–64% | 50% | 44% | 32 |
| siege | 50% | 34%–66% | 50% | 50% | 32 |
| rush | 50% | 34%–66% | 50% | 50% | 32 |
| swarm | 53% | 36%–69% | 56% | 50% | 32 |
| air | 53% | 36%–69% | 69% | 38% | 32 |

### hard

| strategy | hard wins | 95% CI | vs ironvow | vs thornwild | games |
|---|---|---|---|---|---|
| ranged | 31% | 18%–49% | 56% | 6% | 32 |
| scout | 34% | 20%–52% | 38% | 31% | 32 |
| swarm | 44% | 28%–61% | 69% | 19% | 32 |
| rush | 44% | 28%–61% | 63% | 25% | 32 |
| melee | 53% | 36%–69% | 81% | 25% | 32 |
| tech | 53% | 36%–69% | 81% | 25% | 32 |
| siege | 59% | 42%–74% | 75% | 44% | 32 |
| air | 75% | 58%–87% | 56% | 94% | 32 |
| turtle | 100% | 89%–100% | 100% | 100% | 32 |
| greed | 100% | 89%–100% | 100% | 100% | 32 |

## Next step

A bot loses to a single strategy (stage 4): no multiplier fixes that. Teach the bot to counter it (shared/src/ai/ai.ts, e.g. `counterFactor` / `antiAirGap`) or change the faction, then re-check with `npm run balance:check -- --stages strategies`.

## ✗ Out of band

- hard bot loses to the "ranged" strategy: wins 31% (CI 18%–49%), worst against thornwild ranged (6%)

## Needs a design look (knobs can't fix these)

- Chapel scores 17% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Arbalest Range scores 9% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Knight Stables scores 90% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Sanctum of Dawn scores 99% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Sun Citadel scores 12% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- World Root scores 98% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Radiant Citadel scores 13% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- ironvow wins 20% at 1v1 (CI 14%–28%): size-dependent, a single power knob can't fix it
- thornwild wins 80% at 1v1 (CI 72%–86%): size-dependent, a single power knob can't fix it
- ironvow vs thornwild: 20% (CI 14%–28%)
- ironvow+ironvow+ironvow+ironvow vs thornwild+thornwild+thornwild+thornwild: 100% (CI 76%–100%)
- ironvow+ironvow+ironvow+thornwild vs thornwild+thornwild+thornwild+thornwild: 100% (CI 76%–100%)
- left side wins 56% (CI 52%–60%): the map or the simulation favours one side

## All line-ups (verification run, 646 games)

| Line-up A | Line-up B | A wins | 95% CI | games | avg min | |
|---|---|---|---|---|---|---|
| ironvow | ironvow | 65% | 50%–78% | 40 | 9.2 | mirror |
| ironvow | thornwild | 20% | 14%–28% | 120 | 8.9 | ⚠ |
| ironvow+ironvow | ironvow+ironvow | 64% | 39%–84% | 14 | 13.0 | mirror |
| ironvow+ironvow | ironvow+thornwild | 30% | 18%–45% | 40 | 11.6 |  |
| ironvow+ironvow | thornwild+thornwild | 40% | 26%–55% | 40 | 11.0 |  |
| ironvow+ironvow+ironvow | ironvow+ironvow+ironvow | 17% | 3%–56% | 6 | 13.7 | mirror |
| ironvow+ironvow+ironvow | ironvow+ironvow+thornwild | 30% | 15%–52% | 20 | 15.4 |  |
| ironvow+ironvow+ironvow | ironvow+thornwild+thornwild | 65% | 43%–82% | 20 | 12.7 |  |
| ironvow+ironvow+ironvow | thornwild+thornwild+thornwild | 90% | 70%–97% | 20 | 12.6 | ⚠ |
| ironvow+ironvow+ironvow+ironvow | ironvow+ironvow+ironvow+ironvow | 75% | 30%–95% | 4 | 14.1 | mirror |
| ironvow+ironvow+ironvow+ironvow | ironvow+ironvow+ironvow+thornwild | 33% | 14%–61% | 12 | 14.6 |  |
| ironvow+ironvow+ironvow+ironvow | ironvow+ironvow+thornwild+thornwild | 58% | 32%–81% | 12 | 14.8 |  |
| ironvow+ironvow+ironvow+ironvow | ironvow+thornwild+thornwild+thornwild | 75% | 47%–91% | 12 | 14.1 | ⚠ |
| ironvow+ironvow+ironvow+ironvow | thornwild+thornwild+thornwild+thornwild | 100% | 76%–100% | 12 | 13.0 | ⚠ |
| ironvow+ironvow+ironvow+thornwild | ironvow+ironvow+ironvow+thornwild | 50% | 15%–85% | 4 | 16.3 | mirror |
| ironvow+ironvow+ironvow+thornwild | ironvow+ironvow+thornwild+thornwild | 67% | 39%–86% | 12 | 16.4 |  |
| ironvow+ironvow+ironvow+thornwild | ironvow+thornwild+thornwild+thornwild | 75% | 47%–91% | 12 | 15.1 | ⚠ |
| ironvow+ironvow+ironvow+thornwild | thornwild+thornwild+thornwild+thornwild | 100% | 76%–100% | 12 | 13.8 | ⚠ |
| ironvow+ironvow+thornwild | ironvow+ironvow+thornwild | 33% | 10%–70% | 6 | 14.1 | mirror |
| ironvow+ironvow+thornwild | ironvow+thornwild+thornwild | 70% | 48%–85% | 20 | 13.6 |  |
| ironvow+ironvow+thornwild | thornwild+thornwild+thornwild | 70% | 48%–85% | 20 | 13.1 |  |
| ironvow+ironvow+thornwild+thornwild | ironvow+ironvow+thornwild+thornwild | 0% | 0%–49% | 4 | 16.1 | mirror |
| ironvow+ironvow+thornwild+thornwild | ironvow+thornwild+thornwild+thornwild | 92% | 65%–99% | 12 | 16.6 | ⚠ |
| ironvow+ironvow+thornwild+thornwild | thornwild+thornwild+thornwild+thornwild | 75% | 47%–91% | 12 | 15.3 | ⚠ |
| ironvow+thornwild | ironvow+thornwild | 50% | 27%–73% | 14 | 13.9 | mirror |
| ironvow+thornwild | thornwild+thornwild | 23% | 12%–38% | 40 | 9.7 | ⚠ |
| ironvow+thornwild+thornwild | ironvow+thornwild+thornwild | 50% | 19%–81% | 6 | 16.2 | mirror |
| ironvow+thornwild+thornwild | thornwild+thornwild+thornwild | 60% | 39%–78% | 20 | 12.2 |  |
| ironvow+thornwild+thornwild+thornwild | ironvow+thornwild+thornwild+thornwild | 75% | 30%–95% | 4 | 17.1 | mirror |
| ironvow+thornwild+thornwild+thornwild | thornwild+thornwild+thornwild+thornwild | 67% | 39%–86% | 12 | 14.7 |  |
| thornwild | thornwild | 57% | 42%–71% | 40 | 9.0 | mirror |
| thornwild+thornwild | thornwild+thornwild | 71% | 45%–88% | 14 | 11.3 | mirror |
| thornwild+thornwild+thornwild | thornwild+thornwild+thornwild | 83% | 44%–97% | 6 | 13.8 | mirror |
| thornwild+thornwild+thornwild+thornwild | thornwild+thornwild+thornwild+thornwild | 75% | 30%–95% | 4 | 16.1 | mirror |

| Faction | win rate (non-mirror) | 95% CI | weighted games |
|---|---|---|---|
| ironvow | 46% | 42%–51% | 480.0 |
| thornwild | 54% | 49%–58% | 480.0 |

Left side wins 56% (CI 52%–60%) · draws 0 · avg 11.9 min
