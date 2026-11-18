# Castle Defense · automatic balance report

Version 0.26.0+6 (balance revision 5 → 6)

2026-11-18T09:30:24.374Z · tuning run · stages units, factions, bots, strategies · 84 min

- Faction power: ironvow 0.901 (early 0.970) · thornwild 1.110 (early 1.030)
- Bot income: easy 1.00 · normal 0.94 · hard 1.00 · brutal 1.18
- Unit multipliers: Lancer ×0.961/0.961, Militia ×1.126/1.126, Mangonel ×1.127/1.127, Stonehide Giant ×0.819/0.819, Tempest Caller ×0.961/0.961, Thunder Stag ×0.8/0.8
- shared/src/data/tuning.ts updated

## 1 · Unit outliers (building duels)

Iteration 1:
- Militia Hall 24% → Militia ×1.082 hp, ×1.082 dmg
- Stag Den 75% → Thunder Stag ×0.800 hp, ×0.800 dmg

Iteration 2:
- Militia Hall 23% → Militia ×1.126 hp, ×1.126 dmg
- Stag Den 81% → Thunder Stag ×0.800 hp, ×0.800 dmg

Iteration 3:
- Stag Den 83% → Thunder Stag ×0.800 hp, ×0.800 dmg

Iteration 4:
- Stag Den 83% → Thunder Stag ×0.800 hp, ×0.800 dmg

## 2 · Factions (hard bots, all line-ups, team sizes 1/2/3/4)

Tuning steps play a sample of 4 line-up pairings per team size (drawn at random); verification plays the full grid.

| Step | power | win rate | games | fitted slope |
|---|---|---|---|---|
| 1 | ironvow 0.914 · thornwild 1.094 (early 1.030) | ironvow 60% · thornwild 39% | 192 | 30 |
| 2 | ironvow 0.901 (early 0.970) · thornwild 1.110 (early 1.030) | ironvow 52% · thornwild 48% | 192 | |
| 2 ✓ verify | ironvow 0.901 (early 0.970) · thornwild 1.110 (early 1.030) | ironvow 52% · thornwild 48% | 646 | |

Power now: ironvow 0.901 (early 0.970) · thornwild 1.110 (early 1.030)

### Faction win rate per team size (verification run)

| Team size | ironvow | thornwild | games |
|---|---|---|---|
| 1v1 | 59% (50%–68%) | 41% (32%–50%) | 200 |
| 2v2 | 48% (39%–57%) | 52% (43%–61%) | 162 |
| 3v3 | 50% (41%–59%) | 50% (41%–59%) | 144 |
| 4v4 | 51% (43%–60%) | 49% (40%–57%) | 140 |
| **average** | **52%** | **48%** | 646 |

Small (1v1, 2v2) minus big games (3v3, 4v4): ironvow +3% · thornwild -3% (the `early` knob targets ±15%)

## 3 · Bot levels (1v1, all faction pairings)

Target: the higher level wins ~80% (band 70%–90%). Hard keeps income 1.

| Iteration | income | brutal>hard | hard>normal | normal>easy |
|---|---|---|---|---|
| 1 | easy 1.00 · normal 0.92 · hard 1.00 · brutal 1.12 | 92% | 92% | 85% |
| 2 | easy 1.00 · normal 1.00 · hard 1.00 · brutal 1.02 | 65% | 65% | 90% |
| 3 | easy 1.00 · normal 0.96 · hard 1.00 · brutal 1.07 | 69% | 73% | 96% |
| 4 | easy 1.00 · normal 0.96 · hard 1.00 · brutal 1.08 | 68% | 67% | 90% |
| 5 | easy 1.00 · normal 0.94 · hard 1.00 · brutal 1.10 | 56% | 79% | 90% |
| 6 | easy 1.00 · normal 0.94 · hard 1.00 · brutal 1.15 | 81% | 90% | 92% |
| 7 | easy 1.00 · normal 0.94 · hard 1.00 · brutal 1.15 | 69% | 77% | 85% |
| 8 | easy 1.00 · normal 0.94 · hard 1.00 · brutal 1.18 | 81% | 86% | 86% |

Income now: easy 1.00 · normal 0.94 · hard 1.00 · brutal 1.18

## 4 · Bots against human-style strategies (1v1)

Each strategy is the same level's brain pushed towards one style (shared/src/lab/sparring.ts). The bot should win about half of these games or more; below 40% with the whole 95% CI under 50% it has a blind spot.

### normal

| strategy | normal wins | 95% CI | vs ironvow | vs thornwild | games |
|---|---|---|---|---|---|
| scout | 38% | 23%–55% | 44% | 31% | 32 |
| ranged | 47% | 31%–64% | 81% | 13% | 32 |
| swarm | 47% | 31%–64% | 38% | 56% | 32 |
| melee | 50% | 34%–66% | 50% | 50% | 32 |
| tech | 53% | 36%–69% | 56% | 50% | 32 |
| siege | 63% | 45%–77% | 81% | 44% | 32 |
| rush | 63% | 45%–77% | 56% | 69% | 32 |
| turtle | 66% | 48%–80% | 66% | 66% | 32 |
| air | 66% | 48%–80% | 75% | 56% | 32 |
| greed | 81% | 65%–91% | 69% | 94% | 32 |

### hard

| strategy | hard wins | 95% CI | vs ironvow | vs thornwild | games |
|---|---|---|---|---|---|
| ranged | 38% | 23%–55% | 63% | 13% | 32 |
| tech | 38% | 23%–55% | 44% | 31% | 32 |
| scout | 44% | 28%–61% | 25% | 63% | 32 |
| air | 47% | 31%–64% | 25% | 69% | 32 |
| siege | 50% | 34%–66% | 63% | 38% | 32 |
| swarm | 53% | 36%–69% | 25% | 81% | 32 |
| rush | 56% | 39%–72% | 31% | 81% | 32 |
| melee | 66% | 48%–80% | 56% | 75% | 32 |
| turtle | 70% | 53%–83% | 56% | 84% | 32 |
| greed | 94% | 80%–98% | 94% | 94% | 32 |

## ✓ Factions, bot levels and strategies within band

## Needs a design look (knobs can't fix these)

- Chapel scores 0% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Arbalest Range scores 9% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Cathedral scores 13% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Knight Stables scores 77% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Sun Citadel scores 0% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Elder Heartwood scores 87% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- World Root scores 100% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Radiant Citadel scores 0% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)

## All line-ups (verification run, 646 games)

| Line-up A | Line-up B | A wins | 95% CI | games | avg min | |
|---|---|---|---|---|---|---|
| ironvow | ironvow | 68% | 52%–80% | 40 | 10.8 | mirror |
| ironvow | thornwild | 59% | 50%–68% | 120 | 14.6 |  |
| ironvow+ironvow | ironvow+ironvow | 57% | 33%–79% | 14 | 12.0 | mirror |
| ironvow+ironvow | ironvow+thornwild | 35% | 22%–50% | 40 | 13.2 |  |
| ironvow+ironvow | thornwild+thornwild | 55% | 40%–69% | 40 | 15.3 |  |
| ironvow+ironvow+ironvow | ironvow+ironvow+ironvow | 83% | 44%–97% | 6 | 11.6 | mirror |
| ironvow+ironvow+ironvow | ironvow+ironvow+thornwild | 35% | 18%–57% | 20 | 13.4 |  |
| ironvow+ironvow+ironvow | ironvow+thornwild+thornwild | 20% | 8%–42% | 20 | 15.8 | ⚠ |
| ironvow+ironvow+ironvow | thornwild+thornwild+thornwild | 55% | 34%–74% | 20 | 16.9 |  |
| ironvow+ironvow+ironvow+ironvow | ironvow+ironvow+ironvow+ironvow | 75% | 30%–95% | 4 | 12.9 | mirror |
| ironvow+ironvow+ironvow+ironvow | ironvow+ironvow+ironvow+thornwild | 25% | 9%–53% | 12 | 12.3 | ⚠ |
| ironvow+ironvow+ironvow+ironvow | ironvow+ironvow+thornwild+thornwild | 42% | 19%–68% | 12 | 14.2 |  |
| ironvow+ironvow+ironvow+ironvow | ironvow+thornwild+thornwild+thornwild | 33% | 14%–61% | 12 | 17.3 |  |
| ironvow+ironvow+ironvow+ironvow | thornwild+thornwild+thornwild+thornwild | 67% | 39%–86% | 12 | 18.2 |  |
| ironvow+ironvow+ironvow+thornwild | ironvow+ironvow+ironvow+thornwild | 50% | 15%–85% | 4 | 11.9 | mirror |
| ironvow+ironvow+ironvow+thornwild | ironvow+ironvow+thornwild+thornwild | 33% | 14%–61% | 12 | 15.2 |  |
| ironvow+ironvow+ironvow+thornwild | ironvow+thornwild+thornwild+thornwild | 50% | 25%–75% | 12 | 15.6 |  |
| ironvow+ironvow+ironvow+thornwild | thornwild+thornwild+thornwild+thornwild | 75% | 47%–91% | 12 | 17.1 | ⚠ |
| ironvow+ironvow+thornwild | ironvow+ironvow+thornwild | 33% | 10%–70% | 6 | 12.3 | mirror |
| ironvow+ironvow+thornwild | ironvow+thornwild+thornwild | 50% | 30%–70% | 20 | 14.6 |  |
| ironvow+ironvow+thornwild | thornwild+thornwild+thornwild | 75% | 53%–89% | 20 | 15.5 | ⚠ |
| ironvow+ironvow+thornwild+thornwild | ironvow+ironvow+thornwild+thornwild | 50% | 15%–85% | 4 | 17.3 | mirror |
| ironvow+ironvow+thornwild+thornwild | ironvow+thornwild+thornwild+thornwild | 58% | 32%–81% | 12 | 17.2 |  |
| ironvow+ironvow+thornwild+thornwild | thornwild+thornwild+thornwild+thornwild | 67% | 39%–86% | 12 | 17.4 |  |
| ironvow+thornwild | ironvow+thornwild | 64% | 39%–84% | 14 | 14.7 | mirror |
| ironvow+thornwild | thornwild+thornwild | 43% | 29%–58% | 40 | 13.9 |  |
| ironvow+thornwild+thornwild | ironvow+thornwild+thornwild | 50% | 19%–81% | 6 | 16.0 | mirror |
| ironvow+thornwild+thornwild | thornwild+thornwild+thornwild | 60% | 39%–78% | 20 | 14.4 |  |
| ironvow+thornwild+thornwild+thornwild | ironvow+thornwild+thornwild+thornwild | 50% | 15%–85% | 4 | 16.3 | mirror |
| ironvow+thornwild+thornwild+thornwild | thornwild+thornwild+thornwild+thornwild | 33% | 14%–61% | 12 | 18.8 |  |
| thornwild | thornwild | 45% | 31%–60% | 40 | 13.8 | mirror |
| thornwild+thornwild | thornwild+thornwild | 36% | 16%–61% | 14 | 15.0 | mirror |
| thornwild+thornwild+thornwild | thornwild+thornwild+thornwild | 67% | 30%–90% | 6 | 18.8 | mirror |
| thornwild+thornwild+thornwild+thornwild | thornwild+thornwild+thornwild+thornwild | 50% | 15%–85% | 4 | 15.7 | mirror |

| Faction | win rate (non-mirror) | 95% CI | weighted games |
|---|---|---|---|
| ironvow | 52% | 48%–57% | 480.0 |
| thornwild | 48% | 43%–52% | 480.0 |

Left side wins 53% (CI 49%–57%) · draws 0 · avg 14.6 min
