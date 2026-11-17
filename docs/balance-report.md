# Castle Defense · automatic balance report

Version 0.22.0+3 (balance revision 2 → 3)

2026-11-17T09:48:15.323Z · tuning run · stages units, factions, bots, strategies · 42 min

- Faction power: ironvow 0.979 · thornwild 1.021
- Bot income: easy 0.89 · normal 0.94 · hard 1.00 · brutal 1.30
- Unit multipliers: Arbalester ×1.173/1.173, Halberdier ×1.041/1.041, Vow Knight ×0.961/0.961, Lancer ×0.961/0.961, Elder Stag ×0.852/0.852, Tempest Caller ×1.041/1.041, Thunder Stag ×0.852/0.852
- shared/src/data/tuning.ts updated

## 1 · Unit outliers (building duels)

Iteration 1: no outliers.

## 2 · Factions (hard bots, all line-ups, team sizes 1/2/3/4)

Tuning steps play a sample of 4 line-up pairings per team size (drawn at random); verification plays the full grid.

| Step | power | win rate | games | fitted slope |
|---|---|---|---|---|
| 1 | ironvow 0.979 · thornwild 1.021 | ironvow 48% · thornwild 52% | 192 | |
| 1 ✓ verify | ironvow 0.979 · thornwild 1.021 | ironvow 54% · thornwild 46% | 646 | |

Power now: ironvow 0.979 · thornwild 1.021

### Faction win rate per team size (verification run)

| Team size | ironvow | thornwild | games |
|---|---|---|---|
| 1v1 | 58% (49%–67%) | 42% (33%–51%) | 200 |
| 2v2 | 39% (31%–48%) | 61% (52%–69%) | 162 |
| 3v3 | 56% (47%–64%) | 44% (36%–53%) | 144 |
| 4v4 | 63% (54%–71%) | 37% (29%–46%) | 140 |
| **average** | **54%** | **46%** | 646 |

## 3 · Bot levels (1v1, all faction pairings)

Target: the higher level wins ~80% (band 70%–90%). Hard keeps income 1.

| Iteration | income | brutal>hard | hard>normal | normal>easy |
|---|---|---|---|---|
| 1 | easy 0.79 · normal 0.94 · hard 1.00 · brutal 1.30 | 83% | 88% | 94% |
| 2 | easy 0.89 · normal 0.94 · hard 1.00 · brutal 1.30 | 79% | 88% | 85% |

Income now: easy 0.89 · normal 0.94 · hard 1.00 · brutal 1.30

## 4 · Bots against human-style strategies (1v1)

Each strategy is the same level's brain pushed towards one style (shared/src/lab/sparring.ts). The bot should win about half of these games or more; below 40% with the whole 95% CI under 50% it has a blind spot.

### normal

| strategy | normal wins | 95% CI | vs ironvow | vs thornwild | games |
|---|---|---|---|---|---|
| melee | 41% | 26%–58% | 56% | 25% | 32 |
| siege | 41% | 26%–58% | 63% | 19% | 32 |
| greed | 41% | 26%–58% | 69% | 13% | 32 |
| scout | 50% | 34%–66% | 81% | 19% | 32 |
| swarm | 53% | 36%–69% | 69% | 38% | 32 |
| air | 53% | 36%–69% | 81% | 25% | 32 |
| rush | 53% | 36%–69% | 75% | 31% | 32 |
| turtle | 56% | 39%–72% | 69% | 44% | 32 |
| ranged | 56% | 39%–72% | 81% | 31% | 32 |
| tech | 59% | 42%–74% | 81% | 38% | 32 |

### hard

| strategy | hard wins | 95% CI | vs ironvow | vs thornwild | games |
|---|---|---|---|---|---|
| ranged | 44% | 28%–61% | 38% | 50% | 32 |
| swarm | 44% | 28%–61% | 50% | 38% | 32 |
| rush | 44% | 28%–61% | 31% | 56% | 32 |
| scout | 47% | 31%–64% | 44% | 50% | 32 |
| melee | 53% | 36%–69% | 44% | 63% | 32 |
| tech | 66% | 48%–80% | 63% | 69% | 32 |
| siege | 72% | 55%–84% | 44% | 100% | 32 |
| turtle | 100% | 89%–100% | 100% | 100% | 32 |
| air | 100% | 89%–100% | 100% | 100% | 32 |
| greed | 100% | 89%–100% | 100% | 100% | 32 |

## ✓ Factions, bot levels and strategies within band

## Needs a design look (knobs can't fix these)

- Boulder Ram Pen scores 25% in duels but isn't auto-tuned (support/siege/champion unit)
- Cathedral scores 25% in duels but isn't auto-tuned (support/siege/champion unit)
- Sanctum of Dawn scores 100% in duels but isn't auto-tuned (support/siege/champion unit)
- Sun Citadel scores 10% in duels but isn't auto-tuned (support/siege/champion unit)
- World Root scores 83% in duels but isn't auto-tuned (support/siege/champion unit)
- Radiant Citadel scores 13% in duels but isn't auto-tuned (support/siege/champion unit)
- Dawn Throne scores 76% in duels but isn't auto-tuned (support/siege/champion unit)
- ironvow+thornwild vs thornwild+thornwild: 10% (CI 4%–23%)
- ironvow+ironvow+ironvow+ironvow vs ironvow+ironvow+ironvow+thornwild: 0% (CI 0%–24%)
- left side wins 54% (CI 51%–58%): the map or the simulation favours one side

## All line-ups (verification run, 646 games)

| Line-up A | Line-up B | A wins | 95% CI | games | avg min | |
|---|---|---|---|---|---|---|
| ironvow | ironvow | 78% | 62%–88% | 40 | 8.2 | mirror |
| ironvow | thornwild | 58% | 49%–67% | 120 | 8.7 |  |
| ironvow+ironvow | ironvow+ironvow | 57% | 33%–79% | 14 | 13.1 | mirror |
| ironvow+ironvow | ironvow+thornwild | 40% | 26%–55% | 40 | 8.4 |  |
| ironvow+ironvow | thornwild+thornwild | 43% | 29%–58% | 40 | 8.2 |  |
| ironvow+ironvow+ironvow | ironvow+ironvow+ironvow | 17% | 3%–56% | 6 | 18.0 | mirror |
| ironvow+ironvow+ironvow | ironvow+ironvow+thornwild | 50% | 30%–70% | 20 | 11.3 |  |
| ironvow+ironvow+ironvow | ironvow+thornwild+thornwild | 85% | 64%–95% | 20 | 9.7 | ⚠ |
| ironvow+ironvow+ironvow | thornwild+thornwild+thornwild | 90% | 70%–97% | 20 | 9.7 | ⚠ |
| ironvow+ironvow+ironvow+ironvow | ironvow+ironvow+ironvow+ironvow | 25% | 5%–70% | 4 | 17.8 | mirror |
| ironvow+ironvow+ironvow+ironvow | ironvow+ironvow+ironvow+thornwild | 0% | 0%–24% | 12 | 13.3 | ⚠ |
| ironvow+ironvow+ironvow+ironvow | ironvow+ironvow+thornwild+thornwild | 92% | 65%–99% | 12 | 10.7 | ⚠ |
| ironvow+ironvow+ironvow+ironvow | ironvow+thornwild+thornwild+thornwild | 92% | 65%–99% | 12 | 9.9 | ⚠ |
| ironvow+ironvow+ironvow+ironvow | thornwild+thornwild+thornwild+thornwild | 92% | 65%–99% | 12 | 8.9 | ⚠ |
| ironvow+ironvow+ironvow+thornwild | ironvow+ironvow+ironvow+thornwild | 25% | 5%–70% | 4 | 11.9 | mirror |
| ironvow+ironvow+ironvow+thornwild | ironvow+ironvow+thornwild+thornwild | 83% | 55%–95% | 12 | 10.5 | ⚠ |
| ironvow+ironvow+ironvow+thornwild | ironvow+thornwild+thornwild+thornwild | 75% | 47%–91% | 12 | 10.5 | ⚠ |
| ironvow+ironvow+ironvow+thornwild | thornwild+thornwild+thornwild+thornwild | 83% | 55%–95% | 12 | 9.2 | ⚠ |
| ironvow+ironvow+thornwild | ironvow+ironvow+thornwild | 50% | 19%–81% | 6 | 9.6 | mirror |
| ironvow+ironvow+thornwild | ironvow+thornwild+thornwild | 65% | 43%–82% | 20 | 9.0 |  |
| ironvow+ironvow+thornwild | thornwild+thornwild+thornwild | 20% | 8%–42% | 20 | 8.0 | ⚠ |
| ironvow+ironvow+thornwild+thornwild | ironvow+ironvow+thornwild+thornwild | 75% | 30%–95% | 4 | 10.0 | mirror |
| ironvow+ironvow+thornwild+thornwild | ironvow+thornwild+thornwild+thornwild | 50% | 25%–75% | 12 | 9.6 |  |
| ironvow+ironvow+thornwild+thornwild | thornwild+thornwild+thornwild+thornwild | 50% | 25%–75% | 12 | 9.1 |  |
| ironvow+thornwild | ironvow+thornwild | 57% | 33%–79% | 14 | 7.9 | mirror |
| ironvow+thornwild | thornwild+thornwild | 10% | 4%–23% | 40 | 5.4 | ⚠ |
| ironvow+thornwild+thornwild | ironvow+thornwild+thornwild | 67% | 30%–90% | 6 | 8.9 | mirror |
| ironvow+thornwild+thornwild | thornwild+thornwild+thornwild | 10% | 3%–30% | 20 | 8.0 | ⚠ |
| ironvow+thornwild+thornwild+thornwild | ironvow+thornwild+thornwild+thornwild | 25% | 5%–70% | 4 | 9.1 | mirror |
| ironvow+thornwild+thornwild+thornwild | thornwild+thornwild+thornwild+thornwild | 75% | 47%–91% | 12 | 9.6 | ⚠ |
| thornwild | thornwild | 60% | 45%–74% | 40 | 7.3 | mirror |
| thornwild+thornwild | thornwild+thornwild | 64% | 39%–84% | 14 | 8.1 | mirror |
| thornwild+thornwild+thornwild | thornwild+thornwild+thornwild | 0% | 0%–39% | 6 | 9.6 | mirror |
| thornwild+thornwild+thornwild+thornwild | thornwild+thornwild+thornwild+thornwild | 50% | 15%–85% | 4 | 10.9 | mirror |

| Faction | win rate (non-mirror) | 95% CI | weighted games |
|---|---|---|---|
| ironvow | 54% | 50%–59% | 480.0 |
| thornwild | 46% | 41%–50% | 480.0 |

Left side wins 54% (CI 51%–58%) · draws 0 · avg 9.0 min
