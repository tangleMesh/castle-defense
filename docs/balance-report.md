# Castle Defense · automatic balance report

Version 0.26.3+7 (balance revision 6 → 7)

2026-11-18T14:42:47.402Z · tuning run · stages units, factions, bots, strategies · 57 min

- Faction power: ironvow 0.901 (early 0.970) · thornwild 1.110 (early 1.030)
- Bot income: easy 1.00 · normal 0.94 · hard 1.00 · brutal 1.18
- Unit multipliers: Lancer ×0.961/0.961, Mangonel ×1.127/1.127, Militia ×1.126/1.126, Stonehide Giant ×0.8/0.8, Tempest Caller ×0.961/0.961, Thunder Stag ×0.8/0.8
- shared/src/data/tuning.ts updated

## 1 · Unit outliers (building duels)

Iteration 1:
- Standing Stones 75% → Stonehide Giant ×0.800 hp, ×0.800 dmg
- Stag Den 82% → Thunder Stag ×0.800 hp, ×0.800 dmg

Iteration 2:
- Stag Den 82% → Thunder Stag ×0.800 hp, ×0.800 dmg

Iteration 3:
- Stag Den 82% → Thunder Stag ×0.800 hp, ×0.800 dmg

Iteration 4:
- Stag Den 82% → Thunder Stag ×0.800 hp, ×0.800 dmg

## 2 · Factions (hard bots, all line-ups, team sizes 1/2/3/4)

Tuning steps play a sample of 4 line-up pairings per team size (drawn at random); verification plays the full grid.

| Step | power | win rate | games | fitted slope |
|---|---|---|---|---|
| 1 | ironvow 0.901 (early 0.970) · thornwild 1.110 (early 1.030) | ironvow 52% · thornwild 49% | 192 | |
| 1 ✓ verify | ironvow 0.901 (early 0.970) · thornwild 1.110 (early 1.030) | ironvow 53% · thornwild 47% | 646 | |

Power now: ironvow 0.901 (early 0.970) · thornwild 1.110 (early 1.030)

### Faction win rate per team size (verification run)

| Team size | ironvow | thornwild | games |
|---|---|---|---|
| 1v1 | 68% (59%–75%) | 33% (25%–41%) | 200 |
| 2v2 | 50% (41%–59%) | 50% (41%–59%) | 162 |
| 3v3 | 48% (39%–57%) | 52% (43%–61%) | 144 |
| 4v4 | 48% (39%–57%) | 52% (43%–61%) | 140 |
| **average** | **53%** | **47%** | 646 |

Small (1v1, 2v2) minus big games (3v3, 4v4): ironvow +11% · thornwild -11% (the `early` knob targets ±15%)

## 3 · Bot levels (1v1, all faction pairings)

Target: the higher level wins ~80% (band 70%–90%). Hard keeps income 1.

| Iteration | income | brutal>hard | hard>normal | normal>easy |
|---|---|---|---|---|
| 1 | easy 1.00 · normal 0.94 · hard 1.00 · brutal 1.18 | 81% | 85% | 90% |

Income now: easy 1.00 · normal 0.94 · hard 1.00 · brutal 1.18

## 4 · Bots against human-style strategies (1v1)

Each strategy is the same level's brain pushed towards one style (shared/src/lab/sparring.ts). The bot should win about half of these games or more; below 40% with the whole 95% CI under 50% it has a blind spot.

### normal

| strategy | normal wins | 95% CI | vs ironvow | vs thornwild | games |
|---|---|---|---|---|---|
| swarm | 41% | 26%–58% | 44% | 38% | 32 |
| melee | 44% | 28%–61% | 44% | 44% | 32 |
| siege | 47% | 31%–64% | 38% | 56% | 32 |
| tech | 50% | 34%–66% | 44% | 56% | 32 |
| rush | 50% | 34%–66% | 38% | 63% | 32 |
| air | 59% | 42%–74% | 50% | 69% | 32 |
| ranged | 63% | 45%–77% | 81% | 44% | 32 |
| turtle | 67% | 50%–81% | 63% | 72% | 32 |
| scout | 72% | 55%–84% | 69% | 75% | 32 |
| greed | 78% | 61%–89% | 88% | 69% | 32 |

### hard

| strategy | hard wins | 95% CI | vs ironvow | vs thornwild | games |
|---|---|---|---|---|---|
| ranged | 41% | 26%–58% | 50% | 31% | 32 |
| rush | 44% | 28%–61% | 50% | 38% | 32 |
| scout | 50% | 34%–66% | 56% | 44% | 32 |
| swarm | 53% | 36%–69% | 44% | 63% | 32 |
| turtle | 56% | 39%–72% | 47% | 66% | 32 |
| tech | 59% | 42%–74% | 63% | 56% | 32 |
| melee | 63% | 45%–77% | 50% | 75% | 32 |
| air | 63% | 45%–77% | 63% | 63% | 32 |
| siege | 66% | 48%–80% | 56% | 75% | 32 |
| greed | 84% | 68%–93% | 75% | 94% | 32 |

## ✓ Factions, bot levels and strategies within band

## Needs a design look (knobs can't fix these)

- Chapel scores 0% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Arbalest Range scores 9% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Cathedral scores 6% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Knight Stables scores 76% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Sun Citadel scores 0% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Elder Heartwood scores 90% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Waking Heartwood scores 80% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- World Root scores 100% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Radiant Citadel scores 0% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)

## All line-ups (verification run, 646 games)

| Line-up A | Line-up B | A wins | 95% CI | games | avg min | |
|---|---|---|---|---|---|---|
| ironvow | ironvow | 30% | 18%–45% | 40 | 11.3 | mirror |
| ironvow | thornwild | 68% | 59%–75% | 120 | 14.6 |  |
| ironvow+ironvow | ironvow+ironvow | 64% | 39%–84% | 14 | 12.7 | mirror |
| ironvow+ironvow | ironvow+thornwild | 33% | 20%–48% | 40 | 12.2 |  |
| ironvow+ironvow | thornwild+thornwild | 60% | 45%–74% | 40 | 14.5 |  |
| ironvow+ironvow+ironvow | ironvow+ironvow+ironvow | 33% | 10%–70% | 6 | 12.6 | mirror |
| ironvow+ironvow+ironvow | ironvow+ironvow+thornwild | 35% | 18%–57% | 20 | 13.1 |  |
| ironvow+ironvow+ironvow | ironvow+thornwild+thornwild | 30% | 15%–52% | 20 | 13.7 |  |
| ironvow+ironvow+ironvow | thornwild+thornwild+thornwild | 60% | 39%–78% | 20 | 17.2 |  |
| ironvow+ironvow+ironvow+ironvow | ironvow+ironvow+ironvow+ironvow | 25% | 5%–70% | 4 | 12.1 | mirror |
| ironvow+ironvow+ironvow+ironvow | ironvow+ironvow+ironvow+thornwild | 17% | 5%–45% | 12 | 12.5 | ⚠ |
| ironvow+ironvow+ironvow+ironvow | ironvow+ironvow+thornwild+thornwild | 25% | 9%–53% | 12 | 14.3 | ⚠ |
| ironvow+ironvow+ironvow+ironvow | ironvow+thornwild+thornwild+thornwild | 33% | 14%–61% | 12 | 17.7 |  |
| ironvow+ironvow+ironvow+ironvow | thornwild+thornwild+thornwild+thornwild | 58% | 32%–81% | 12 | 18.0 |  |
| ironvow+ironvow+ironvow+thornwild | ironvow+ironvow+ironvow+thornwild | 50% | 15%–85% | 4 | 14.9 | mirror |
| ironvow+ironvow+ironvow+thornwild | ironvow+ironvow+thornwild+thornwild | 33% | 14%–61% | 12 | 15.7 |  |
| ironvow+ironvow+ironvow+thornwild | ironvow+thornwild+thornwild+thornwild | 50% | 25%–75% | 12 | 14.8 |  |
| ironvow+ironvow+ironvow+thornwild | thornwild+thornwild+thornwild+thornwild | 75% | 47%–91% | 12 | 14.7 | ⚠ |
| ironvow+ironvow+thornwild | ironvow+ironvow+thornwild | 67% | 30%–90% | 6 | 14.8 | mirror |
| ironvow+ironvow+thornwild | ironvow+thornwild+thornwild | 45% | 26%–66% | 20 | 14.6 |  |
| ironvow+ironvow+thornwild | thornwild+thornwild+thornwild | 45% | 26%–66% | 20 | 16.8 |  |
| ironvow+ironvow+thornwild+thornwild | ironvow+ironvow+thornwild+thornwild | 50% | 15%–85% | 4 | 15.0 | mirror |
| ironvow+ironvow+thornwild+thornwild | ironvow+thornwild+thornwild+thornwild | 33% | 14%–61% | 12 | 15.8 |  |
| ironvow+ironvow+thornwild+thornwild | thornwild+thornwild+thornwild+thornwild | 42% | 19%–68% | 12 | 17.3 |  |
| ironvow+thornwild | ironvow+thornwild | 57% | 33%–79% | 14 | 13.7 | mirror |
| ironvow+thornwild | thornwild+thornwild | 48% | 33%–63% | 40 | 12.1 |  |
| ironvow+thornwild+thornwild | ironvow+thornwild+thornwild | 83% | 44%–97% | 6 | 13.9 | mirror |
| ironvow+thornwild+thornwild | thornwild+thornwild+thornwild | 55% | 34%–74% | 20 | 13.8 |  |
| ironvow+thornwild+thornwild+thornwild | ironvow+thornwild+thornwild+thornwild | 25% | 5%–70% | 4 | 14.8 | mirror |
| ironvow+thornwild+thornwild+thornwild | thornwild+thornwild+thornwild+thornwild | 50% | 25%–75% | 12 | 15.9 |  |
| thornwild | thornwild | 55% | 40%–69% | 40 | 15.0 | mirror |
| thornwild+thornwild | thornwild+thornwild | 71% | 45%–88% | 14 | 14.7 | mirror |
| thornwild+thornwild+thornwild | thornwild+thornwild+thornwild | 67% | 30%–90% | 6 | 19.3 | mirror |
| thornwild+thornwild+thornwild+thornwild | thornwild+thornwild+thornwild+thornwild | 0% | 0%–49% | 4 | 16.0 | mirror |

| Faction | win rate (non-mirror) | 95% CI | weighted games |
|---|---|---|---|
| ironvow | 53% | 49%–58% | 480.0 |
| thornwild | 47% | 42%–51% | 480.0 |

Left side wins 50% (CI 46%–54%) · draws 0 · avg 14.3 min
