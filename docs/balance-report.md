# Castle Defense · automatic balance report

Version 0.21.2+2 (balance revision 1 → 2)

2026-11-16T21:54:00.626Z · tuning run · stages units, factions, bots · 182 min

- Faction power: ironvow 0.979 · thornwild 1.021
- Bot income: easy 0.79 · normal 0.94 · hard 1.00 · brutal 1.30
- Unit multipliers: Arbalester ×1.173/1.173, Vow Knight ×0.961/0.961, Elder Stag ×0.852/0.852, Tempest Caller ×1.041/1.041, Thunder Stag ×0.852/0.852, Lancer ×0.961/0.961, Halberdier ×1.041/1.041
- shared/src/data/tuning.ts updated

## 1 · Unit outliers (building duels)

Iteration 1:
- Lancer Stables 79% → Lancer ×0.961 hp, ×0.961 dmg
- Great Stag Den 89% → Elder Stag ×0.887 hp, ×0.887 dmg
- Halberd Hall 20% → Halberdier ×1.041 hp, ×1.041 dmg

Iteration 2:
- Great Stag Den 79% → Elder Stag ×0.852 hp, ×0.852 dmg

Iteration 3: no outliers.

## 2 · Factions (hard bots, all line-ups, team sizes 1/2/3/4)

Tuning steps play a sample of 4 line-up pairings per team size (drawn at random); verification plays the full grid.

| Step | power | win rate | games | fitted slope |
|---|---|---|---|---|
| 1 | ironvow 0.977 · thornwild 1.024 | ironvow 38% · thornwild 62% | 192 | 30 |
| 2 | ironvow 0.993 · thornwild 1.007 | ironvow 57% · thornwild 42% | 192 | 44 |
| 3 | ironvow 0.987 · thornwild 1.013 | ironvow 55% · thornwild 44% | 192 | 46 (fit settled) |
| 3 ✓ verify | ironvow 0.985 · thornwild 1.015 | ironvow 58% · thornwild 42% | 646 | |
| 4 | ironvow 0.982 · thornwild 1.018 | ironvow 54% · thornwild 44% | 192 | 42 (fit settled) |
| 4 ✓ verify | ironvow 0.981 · thornwild 1.019 | ironvow 56% · thornwild 44% | 646 | |
| 5 | ironvow 0.979 · thornwild 1.022 | ironvow 47% · thornwild 53% | 192 | 38 (fit settled) |
| 5 ✓ verify | ironvow 0.979 · thornwild 1.021 | ironvow 54% · thornwild 46% | 646 | |

Power now: ironvow 0.979 · thornwild 1.021

### Faction win rate per team size (verification run)

| Team size | ironvow | thornwild | games |
|---|---|---|---|
| 1v1 | 54% (45%–63%) | 46% (37%–55%) | 200 |
| 2v2 | 38% (29%–46%) | 63% (54%–71%) | 162 |
| 3v3 | 61% (52%–69%) | 39% (31%–48%) | 144 |
| 4v4 | 63% (54%–71%) | 37% (29%–46%) | 140 |
| **average** | **54%** | **46%** | 646 |

## 3 · Bot levels (1v1, all faction pairings)

Target: the higher level wins ~80% (band 70%–90%). Hard keeps income 1.

| Iteration | income | brutal>hard | hard>normal | normal>easy |
|---|---|---|---|---|
| 1 | easy 1.00 · normal 1.00 · hard 1.00 · brutal 1.30 | 88% | 75% | 69% |
| 2 | easy 0.94 · normal 1.00 · hard 1.00 · brutal 1.30 | 88% | 63% | 73% |
| 3 | easy 0.94 · normal 0.94 · hard 1.00 · brutal 1.30 | 81% | 85% | 63% |
| 4 | easy 0.84 · normal 0.94 · hard 1.00 · brutal 1.30 | 81% | 90% | 67% |
| 5 | easy 0.79 · normal 0.94 · hard 1.00 · brutal 1.30 | 88% | 73% | 88% |

Income now: easy 0.79 · normal 0.94 · hard 1.00 · brutal 1.30

## ✓ Factions and bot levels within band

## Needs a design look (knobs can't fix these)

- Boulder Ram Pen scores 23% in duels but isn't auto-tuned (support/siege/champion unit)
- Cathedral scores 25% in duels but isn't auto-tuned (support/siege/champion unit)
- Sanctum of Dawn scores 100% in duels but isn't auto-tuned (support/siege/champion unit)
- Sun Citadel scores 13% in duels but isn't auto-tuned (support/siege/champion unit)
- World Root scores 83% in duels but isn't auto-tuned (support/siege/champion unit)
- Radiant Citadel scores 7% in duels but isn't auto-tuned (support/siege/champion unit)
- ironvow+thornwild vs thornwild+thornwild: 8% (CI 3%–20%)
- ironvow+ironvow+ironvow vs ironvow+thornwild+thornwild: 95% (CI 76%–99%)
- ironvow+ironvow+ironvow vs thornwild+thornwild+thornwild: 95% (CI 76%–99%)
- ironvow+ironvow+ironvow+ironvow vs ironvow+ironvow+ironvow+thornwild: 0% (CI 0%–24%)
- left side wins 55% (CI 51%–59%): the map or the simulation favours one side

## All line-ups (verification run, 646 games)

| Line-up A | Line-up B | A wins | 95% CI | games | avg min | |
|---|---|---|---|---|---|---|
| ironvow | ironvow | 75% | 60%–86% | 40 | 9.2 | mirror |
| ironvow | thornwild | 54% | 45%–63% | 120 | 9.4 |  |
| ironvow+ironvow | ironvow+ironvow | 64% | 39%–84% | 14 | 14.4 | mirror |
| ironvow+ironvow | ironvow+thornwild | 48% | 33%–63% | 40 | 9.2 |  |
| ironvow+ironvow | thornwild+thornwild | 35% | 22%–50% | 40 | 9.2 |  |
| ironvow+ironvow+ironvow | ironvow+ironvow+ironvow | 0% | 0%–39% | 6 | 17.1 | mirror |
| ironvow+ironvow+ironvow | ironvow+ironvow+thornwild | 45% | 26%–66% | 20 | 13.3 |  |
| ironvow+ironvow+ironvow | ironvow+thornwild+thornwild | 95% | 76%–99% | 20 | 10.5 | ⚠ |
| ironvow+ironvow+ironvow | thornwild+thornwild+thornwild | 95% | 76%–99% | 20 | 9.6 | ⚠ |
| ironvow+ironvow+ironvow+ironvow | ironvow+ironvow+ironvow+ironvow | 50% | 15%–85% | 4 | 19.0 | mirror |
| ironvow+ironvow+ironvow+ironvow | ironvow+ironvow+ironvow+thornwild | 0% | 0%–24% | 12 | 14.8 | ⚠ |
| ironvow+ironvow+ironvow+ironvow | ironvow+ironvow+thornwild+thornwild | 83% | 55%–95% | 12 | 12.7 | ⚠ |
| ironvow+ironvow+ironvow+ironvow | ironvow+thornwild+thornwild+thornwild | 92% | 65%–99% | 12 | 10.1 | ⚠ |
| ironvow+ironvow+ironvow+ironvow | thornwild+thornwild+thornwild+thornwild | 83% | 55%–95% | 12 | 10.2 | ⚠ |
| ironvow+ironvow+ironvow+thornwild | ironvow+ironvow+ironvow+thornwild | 75% | 30%–95% | 4 | 11.4 | mirror |
| ironvow+ironvow+ironvow+thornwild | ironvow+ironvow+thornwild+thornwild | 67% | 39%–86% | 12 | 12.6 |  |
| ironvow+ironvow+ironvow+thornwild | ironvow+thornwild+thornwild+thornwild | 92% | 65%–99% | 12 | 10.6 | ⚠ |
| ironvow+ironvow+ironvow+thornwild | thornwild+thornwild+thornwild+thornwild | 92% | 65%–99% | 12 | 10.3 | ⚠ |
| ironvow+ironvow+thornwild | ironvow+ironvow+thornwild | 67% | 30%–90% | 6 | 12.5 | mirror |
| ironvow+ironvow+thornwild | ironvow+thornwild+thornwild | 70% | 48%–85% | 20 | 10.4 |  |
| ironvow+ironvow+thornwild | thornwild+thornwild+thornwild | 45% | 26%–66% | 20 | 9.1 |  |
| ironvow+ironvow+thornwild+thornwild | ironvow+ironvow+thornwild+thornwild | 75% | 30%–95% | 4 | 11.3 | mirror |
| ironvow+ironvow+thornwild+thornwild | ironvow+thornwild+thornwild+thornwild | 42% | 19%–68% | 12 | 9.4 |  |
| ironvow+ironvow+thornwild+thornwild | thornwild+thornwild+thornwild+thornwild | 50% | 25%–75% | 12 | 10.0 |  |
| ironvow+thornwild | ironvow+thornwild | 79% | 52%–92% | 14 | 8.9 | mirror |
| ironvow+thornwild | thornwild+thornwild | 8% | 3%–20% | 40 | 6.3 | ⚠ |
| ironvow+thornwild+thornwild | ironvow+thornwild+thornwild | 67% | 30%–90% | 6 | 9.7 | mirror |
| ironvow+thornwild+thornwild | thornwild+thornwild+thornwild | 10% | 3%–30% | 20 | 8.5 | ⚠ |
| ironvow+thornwild+thornwild+thornwild | ironvow+thornwild+thornwild+thornwild | 50% | 15%–85% | 4 | 11.2 | mirror |
| ironvow+thornwild+thornwild+thornwild | thornwild+thornwild+thornwild+thornwild | 75% | 47%–91% | 12 | 10.4 | ⚠ |
| thornwild | thornwild | 55% | 40%–69% | 40 | 8.1 | mirror |
| thornwild+thornwild | thornwild+thornwild | 64% | 39%–84% | 14 | 8.7 | mirror |
| thornwild+thornwild+thornwild | thornwild+thornwild+thornwild | 67% | 30%–90% | 6 | 9.5 | mirror |
| thornwild+thornwild+thornwild+thornwild | thornwild+thornwild+thornwild+thornwild | 100% | 51%–100% | 4 | 10.9 | mirror |

| Faction | win rate (non-mirror) | 95% CI | weighted games |
|---|---|---|---|
| ironvow | 54% | 49%–58% | 480.0 |
| thornwild | 46% | 42%–51% | 480.0 |

Left side wins 55% (CI 51%–59%) · draws 0 · avg 9.8 min
