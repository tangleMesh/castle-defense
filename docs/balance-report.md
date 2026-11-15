# Castle Defense · automatic balance report

2026-11-15T22:56:17.906Z · tuning run · stages units, factions, bots · 89 min

- Faction power: ironvow 1.008 · thornwild 0.992
- Bot income: easy 1.00 · normal 1.00 · hard 1.00 · brutal 1.30
- Unit multipliers: Thunder Stag ×0.852/0.852, Elder Stag ×0.923/0.923, Arbalester ×1.173/1.173, Tempest Caller ×1.041/1.041, Vow Knight ×0.961/0.961
- shared/src/data/tuning.ts updated

## 1 · Unit outliers (building duels)

Iteration 1:
- Stag Den 85% → Thunder Stag ×0.961 hp, ×0.961 dmg
- Great Stag Den 85% → Elder Stag ×0.961 hp, ×0.961 dmg
- Arbalest Range 20% → Arbalester ×1.041 hp, ×1.041 dmg
- Tempest Circle 0% → Tempest Caller ×1.041 hp, ×1.041 dmg

Iteration 2:
- Stag Den 77% → Thunder Stag ×0.923 hp, ×0.923 dmg
- Arbalest Range 20% → Arbalester ×1.083 hp, ×1.083 dmg
- Knight Stables 78% → Vow Knight ×0.961 hp, ×0.961 dmg

Iteration 3:
- Stag Den 76% → Thunder Stag ×0.887 hp, ×0.887 dmg
- Great Stag Den 82% → Elder Stag ×0.923 hp, ×0.923 dmg
- Arbalest Range 20% → Arbalester ×1.127 hp, ×1.127 dmg

Iteration 4:
- Stag Den 76% → Thunder Stag ×0.852 hp, ×0.852 dmg
- Arbalest Range 22% → Arbalester ×1.173 hp, ×1.173 dmg

## 2 · Factions (hard bots, all line-ups, team sizes 1/2/3/4)

Tuning steps play a sample of 4 line-up pairings per team size (pure vs pure + random others); verification plays the full grid.

| Step | power | win rate | games | fitted slope |
|---|---|---|---|---|
| 1 | ironvow 1.000 · thornwild 1.000 | ironvow 51% · thornwild 50% | 96 | |
| 1 ✓ verify | ironvow 1.000 · thornwild 1.000 | ironvow 43% · thornwild 57% | 512 | |
| 2 | ironvow 1.008 · thornwild 0.992 | ironvow 42% · thornwild 59% | 96 | 15 |
| 3 | ironvow 1.018 · thornwild 0.982 | ironvow 56% · thornwild 43% | 96 | 24 |
| 4 | ironvow 1.011 · thornwild 0.989 | ironvow 46% · thornwild 52% | 96 | 22 |
| 5 | ironvow 1.012 · thornwild 0.988 | ironvow 56% · thornwild 43% | 96 | 26 |
| 6 | ironvow 1.010 · thornwild 0.990 | ironvow 45% · thornwild 55% | 96 | 24 |
| 7 | ironvow 1.011 · thornwild 0.989 | ironvow 63% · thornwild 37% | 96 | 29 |
| 8 | ironvow 1.009 · thornwild 0.991 | ironvow 55% · thornwild 47% | 96 | 29 |
| final | ironvow 1.008 · thornwild 0.992 | ironvow 47% · thornwild 53% | 512 | |

Power now: ironvow 1.008 · thornwild 0.992

### Faction win rate per team size (verification run)

| Team size | ironvow | thornwild | games |
|---|---|---|---|
| 1v1 | 35% (18%–57%) | 65% (43%–82%) | 36 |
| 2v2 | 41% (29%–53%) | 59% (47%–71%) | 84 |
| 3v3 | 51% (42%–60%) | 49% (40%–58%) | 152 |
| 4v4 | 60% (53%–67%) | 40% (33%–47%) | 240 |
| **average** | **47%** | **53%** | 512 |

## 3 · Bot levels (1v1, all faction pairings)

Target: the higher level wins ~80% (band 70%–90%). Hard keeps income 1.

| Iteration | income | brutal>hard | hard>normal | normal>easy |
|---|---|---|---|---|
| 1 | easy 1.00 · normal 1.00 · hard 1.00 · brutal 1.30 | 90% | 81% | 75% |

Income now: easy 1.00 · normal 1.00 · hard 1.00 · brutal 1.30

## ✓ Factions and bot levels within band

## Needs a design look (knobs can't fix these)

- Sanctum of Dawn scores 100% in duels but isn't auto-tuned (support/siege/champion unit)
- Sun Citadel scores 18% in duels but isn't auto-tuned (support/siege/champion unit)
- World Root scores 83% in duels but isn't auto-tuned (support/siege/champion unit)
- ironvow+thornwild vs thornwild+thornwild: 0% (CI 0%–16%)
- ironvow+ironvow+ironvow+ironvow vs thornwild+thornwild+thornwild+thornwild: 95% (CI 76%–99%)
- left side wins 56% (CI 51%–60%): the map or the simulation favours one side

## All line-ups (verification run, 512 games)

| Line-up A | Line-up B | A wins | 95% CI | games | avg min | |
|---|---|---|---|---|---|---|
| ironvow | ironvow | 50% | 22%–78% | 8 | 7.9 | mirror |
| ironvow | thornwild | 35% | 18%–57% | 20 | 8.3 |  |
| ironvow+ironvow | ironvow+ironvow | 63% | 31%–86% | 8 | 9.2 | mirror |
| ironvow+ironvow | ironvow+thornwild | 75% | 53%–89% | 20 | 7.5 | ⚠ |
| ironvow+ironvow | thornwild+thornwild | 35% | 18%–57% | 20 | 7.9 |  |
| ironvow+ironvow+ironvow | ironvow+ironvow+ironvow | 38% | 14%–69% | 8 | 10.4 | mirror |
| ironvow+ironvow+ironvow | ironvow+ironvow+thornwild | 45% | 26%–66% | 20 | 9.6 |  |
| ironvow+ironvow+ironvow | ironvow+thornwild+thornwild | 80% | 58%–92% | 20 | 9.4 | ⚠ |
| ironvow+ironvow+ironvow | thornwild+thornwild+thornwild | 70% | 48%–85% | 20 | 8.4 |  |
| ironvow+ironvow+ironvow+ironvow | ironvow+ironvow+ironvow+ironvow | 63% | 31%–86% | 8 | 16.5 | mirror |
| ironvow+ironvow+ironvow+ironvow | ironvow+ironvow+ironvow+thornwild | 40% | 22%–61% | 20 | 12.6 |  |
| ironvow+ironvow+ironvow+ironvow | ironvow+ironvow+thornwild+thornwild | 70% | 48%–85% | 20 | 10.1 |  |
| ironvow+ironvow+ironvow+ironvow | ironvow+thornwild+thornwild+thornwild | 90% | 70%–97% | 20 | 9.2 | ⚠ |
| ironvow+ironvow+ironvow+ironvow | thornwild+thornwild+thornwild+thornwild | 95% | 76%–99% | 20 | 8.7 | ⚠ |
| ironvow+ironvow+ironvow+thornwild | ironvow+ironvow+ironvow+thornwild | 88% | 53%–98% | 8 | 12.5 | mirror |
| ironvow+ironvow+ironvow+thornwild | ironvow+ironvow+thornwild+thornwild | 55% | 34%–74% | 20 | 9.4 |  |
| ironvow+ironvow+ironvow+thornwild | ironvow+thornwild+thornwild+thornwild | 75% | 53%–89% | 20 | 9.2 | ⚠ |
| ironvow+ironvow+ironvow+thornwild | thornwild+thornwild+thornwild+thornwild | 80% | 58%–92% | 20 | 8.6 | ⚠ |
| ironvow+ironvow+thornwild | ironvow+ironvow+thornwild | 63% | 31%–86% | 8 | 9.7 | mirror |
| ironvow+ironvow+thornwild | ironvow+thornwild+thornwild | 55% | 34%–74% | 20 | 8.7 |  |
| ironvow+ironvow+thornwild | thornwild+thornwild+thornwild | 15% | 5%–36% | 20 | 7.7 | ⚠ |
| ironvow+ironvow+thornwild+thornwild | ironvow+ironvow+thornwild+thornwild | 50% | 22%–78% | 8 | 9.2 | mirror |
| ironvow+ironvow+thornwild+thornwild | ironvow+thornwild+thornwild+thornwild | 65% | 43%–82% | 20 | 9.1 |  |
| ironvow+ironvow+thornwild+thornwild | thornwild+thornwild+thornwild+thornwild | 25% | 11%–47% | 20 | 7.7 | ⚠ |
| ironvow+thornwild | ironvow+thornwild | 63% | 31%–86% | 8 | 8.1 | mirror |
| ironvow+thornwild | thornwild+thornwild | 0% | 0%–16% | 20 | 5.8 | ⚠ |
| ironvow+thornwild+thornwild | ironvow+thornwild+thornwild | 38% | 14%–69% | 8 | 9.0 | mirror |
| ironvow+thornwild+thornwild | thornwild+thornwild+thornwild | 15% | 5%–36% | 20 | 7.3 | ⚠ |
| ironvow+thornwild+thornwild+thornwild | ironvow+thornwild+thornwild+thornwild | 63% | 31%–86% | 8 | 8.9 | mirror |
| ironvow+thornwild+thornwild+thornwild | thornwild+thornwild+thornwild+thornwild | 25% | 11%–47% | 20 | 8.4 | ⚠ |
| thornwild | thornwild | 50% | 22%–78% | 8 | 7.5 | mirror |
| thornwild+thornwild | thornwild+thornwild | 38% | 14%–69% | 8 | 7.0 | mirror |
| thornwild+thornwild+thornwild | thornwild+thornwild+thornwild | 25% | 7%–59% | 8 | 7.3 | mirror |
| thornwild+thornwild+thornwild+thornwild | thornwild+thornwild+thornwild+thornwild | 63% | 31%–86% | 8 | 8.8 | mirror |

| Faction | win rate (non-mirror) | 95% CI | weighted games |
|---|---|---|---|
| ironvow | 53% | 48%–58% | 400.0 |
| thornwild | 47% | 42%–52% | 400.0 |

Left side wins 56% (CI 51%–60%) · draws 0 · avg 8.8 min
