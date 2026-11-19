# Castle Defense · automatic balance report

Version 0.44.0+8 (balance revision 7 → 8)

2026-11-19T22:18:20.029Z · tuning run · stages units, factions, bots · 26 min

- Faction power: ironvow 0.881 (early 1.030) · thornwild 1.202 · shardbound 0.979 (early 1.198) · cogspark 1.098 (early 1.162) · duskmoon 0.895 (early 1.127) · bloodtusk 1.131 (early 0.941) · sunspire 0.903 (early 0.970) · frostmark 0.939 · gravewake 0.954 · doomforge 1.060 (early 0.941) · tidecall 1.086 (early 0.861) · blightroot 0.930 (early 0.888)
- Bot income: easy 0.92 · normal 0.86 · hard 1.00 · brutal 1.18
- Unit multipliers: Corrupted Annihilator ×0.852/0.852, Infernal Tank ×0.961/0.961, Corrupted Treant ×0.923/0.923, Axemaster ×1.041/1.041, Troll Berserker ×0.923/0.923, Catapult ×0.887/0.887, Forest Trapper ×1.041/1.041, Grunt ×1.083/1.083, Veteran Grunt ×1.041/1.041, Wyvern Rider ×0.887/0.887, Assault Tank ×1.083/1.083, Flame Sergeant ×0.961/0.961, Heavy Tank ×0.961/0.961, Iron Golem ×0.961/0.961, Light Tank ×0.923/0.923, Rocket Tank ×0.923/0.923, Chaos Warrior ×0.887/0.887, Quill Demon ×0.923/0.923, Red Dragon ×0.852/0.852, Twin of Serenity ×0.887/0.887, Assassin ×1.041/1.041, Avenging Spirit ×1.083/1.083, Ice Queen ×0.887/0.887, Raging Rime Thrower ×0.852/0.852, Rime Thrower ×0.961/0.961, Wendigo ×0.923/0.923, Frost Wolf ×1.041/1.041, Bone Wyrm ×1.041/1.041, Flesh Golem ×0.852/0.852, Suffocated Zombie ×1.041/1.041, Mighty Necromancer ×0.852/0.852, Necromancer ×0.961/0.961, Skeleton ×1.041/1.041, Vampire ×0.961/0.961, Zombie ×1.041/1.041, Halberdier ×1.127/1.127, Lancer ×0.961/0.961, Mangonel ×1.25/1.25, Militia ×1.25/1.25, Thunderhawk ×1.041/1.041, Blaze Elemental ×0.887/0.887, Deepwater Spirit ×0.887/0.887, Rill Spirit ×1.041/1.041, Spark Elemental ×1.041/1.041, Stone Elemental ×1.083/1.083, Thunder Elemental ×1.041/1.041, Tide Spirit ×1.083/1.083, Dragonhawk Rider ×0.887/0.887, Elder Blademaster ×0.923/0.923, Dragon Turtle ×0.887/0.887, Ancient Hydra ×0.887/0.887, Murloc Warrior ×0.852/0.852, Murloc Assassin ×0.923/0.923, Murloc Champion ×0.923/0.923, Naga Royal Guard ×0.923/0.923, Naga Siren ×0.961/0.961, Swamp Spitter ×0.923/0.923, Winged Serpent ×0.923/0.923, Stonehide Giant ×0.867/0.867, Briarling ×1.173/1.173, Dusk Moth ×0.923/0.923, Jade Wyrm ×1.127/1.127, Storm Shaman ×1.041/1.041, Stormcaller ×1.041/1.041, Stormhorn ×1.083/1.083, Grove Keeper ×0.923/0.923, Tempest Caller ×0.961/0.961, Thorn Archer ×0.923/0.923, Thunder Stag ×0.8/0.8, Vineling ×1.127/1.127, Lich King ×0.961/0.961, Glaive Thrower ×1.041/1.041, Spellbreaker Kodo ×1.041/1.041, Troll Trapper ×0.961/0.961
- shared/src/data/tuning.ts updated

## 1 · Unit outliers (building duels)

Iteration 1:
- Lich Citadel 100% → Lich King ×0.961 hp, ×0.961 dmg
- Tank Factory 100% → Light Tank ×0.923 hp, ×0.923 dmg
- Great Igloo 100% → Raging Rime Thrower ×0.852 hp, ×0.852 dmg
- Pillaged Hut 6% → Avenging Spirit ×1.083 hp, ×1.083 dmg
- Briar Burrow 0% → Briarling ×1.173 hp, ×1.173 dmg
- Elder Grove 83% → Grove Keeper ×0.923 hp, ×0.923 dmg
- Hall of the Eldest 85% → Elder Blademaster ×0.923 hp, ×0.923 dmg
- Dragonhawk Portal 79% → Dragonhawk Rider ×0.887 hp, ×0.887 dmg
- Thorn Archers' Grove 85% → Thorn Archer ×0.923 hp, ×0.923 dmg
- Blaze Altar 100% → Blaze Elemental ×0.887 hp, ×0.887 dmg
- Glaive Works 21% → Glaive Thrower ×1.041 hp, ×1.041 dmg
- Temple of Necromancy 78% → Mighty Necromancer ×0.852 hp, ×0.852 dmg
- Rocket Tank Factory 100% → Rocket Tank ×0.923 hp, ×0.923 dmg
- Wyvern Roost 83% → Wyvern Rider ×0.887 hp, ×0.887 dmg
- Siege Yard 21% → Mangonel ×1.250 hp, ×1.250 dmg
- Spellbreaker Pen 22% → Spellbreaker Kodo ×1.041 hp, ×1.041 dmg
- Dragon Nest 80% → Red Dragon ×0.852 hp, ×0.852 dmg
- Trappers' Hut 80% → Troll Trapper ×0.961 hp, ×0.961 dmg
- Standing Stones 14% → Stonehide Giant ×0.867 hp, ×0.867 dmg
- Deepwater Fountain 100% → Deepwater Spirit ×0.887 hp, ×0.887 dmg
- Moth Hive 100% → Dusk Moth ×0.923 hp, ×0.923 dmg
- Jade Wyrm Roost 0% → Jade Wyrm ×1.127 hp, ×1.127 dmg
- Halberd Hall 20% → Halberdier ×1.127 hp, ×1.127 dmg
- Orc Siege Works 100% → Catapult ×0.887 hp, ×0.887 dmg

## 2 · Factions (hard bots, all line-ups, team sizes 1/2/3/4)

Tuning steps play a sample of 8 line-up pairings per team size (drawn at random); verification plays the full grid.

| Step | power | win rate | games | fitted slope |
|---|---|---|---|---|
| 1 | ironvow 0.859 (early 1.030) · thornwild 1.178 (early 1.030) · shardbound 0.997 (early 1.198) · cogspark 1.121 (early 1.197) · duskmoon 0.905 (early 1.061) · bloodtusk 1.109 (early 0.999) · sunspire 0.897 (early 0.970) · frostmark 0.927 · gravewake 0.989 (early 0.942) · doomforge 1.067 (early 0.970) · tidecall 1.058 (early 0.861) · blightroot 0.950 (early 0.836) | ironvow 42% · thornwild 38% · shardbound 60% · cogspark 61% · duskmoon 44% · bloodtusk 43% · sunspire 46% · frostmark 49% · gravewake 69% · doomforge 78% · tidecall 46% · blightroot 48% | 64 | 12 |
| 2 | ironvow 0.883 (early 1.030) · thornwild 1.226 (early 1.061) · shardbound 0.965 (early 1.198) · cogspark 1.079 (early 1.197) · duskmoon 0.923 (early 1.093) · bloodtusk 1.136 (early 0.969) · sunspire 0.908 · frostmark 0.932 (early 0.970) · gravewake 0.950 (early 0.942) · doomforge 1.025 (early 0.941) · tidecall 1.073 (early 0.861) · blightroot 0.956 (early 0.861) | ironvow 42% · thornwild 68% · shardbound 50% · cogspark 42% · duskmoon 71% · bloodtusk 49% · sunspire 43% · frostmark 54% · gravewake 34% · doomforge 31% · tidecall 42% · blightroot 65% | 64 | 19 |
| 3 | ironvow 0.882 (early 1.030) · thornwild 1.187 (early 1.030) · shardbound 0.972 (early 1.198) · cogspark 1.098 (early 1.197) · duskmoon 0.896 (early 1.093) · bloodtusk 1.143 (early 0.969) · sunspire 0.908 · frostmark 0.936 (early 0.970) · gravewake 0.969 (early 0.971) · doomforge 1.049 (early 0.941) · tidecall 1.081 (early 0.861) · blightroot 0.935 (early 0.888) | ironvow 53% · thornwild 50% · shardbound 41% · cogspark 52% · duskmoon 54% · bloodtusk 67% · sunspire 60% · frostmark 47% · gravewake 59% · doomforge 39% · tidecall 44% · blightroot 44% | 64 | 20 |
| final | ironvow 0.881 (early 1.030) · thornwild 1.202 · shardbound 0.979 (early 1.198) · cogspark 1.098 (early 1.162) · duskmoon 0.895 (early 1.127) · bloodtusk 1.131 (early 0.941) · sunspire 0.903 (early 0.970) · frostmark 0.939 · gravewake 0.954 · doomforge 1.060 (early 0.941) · tidecall 1.086 (early 0.861) · blightroot 0.930 (early 0.888) | ironvow 55% · thornwild 63% · shardbound 52% · cogspark 46% · duskmoon 48% · bloodtusk 56% · sunspire 50% · frostmark 62% · gravewake 72% · doomforge 32% · tidecall 44% · blightroot 39% | 152 | |

Power now: ironvow 0.881 (early 1.030) · thornwild 1.202 · shardbound 0.979 (early 1.198) · cogspark 1.098 (early 1.162) · duskmoon 0.895 (early 1.127) · bloodtusk 1.131 (early 0.941) · sunspire 0.903 (early 0.970) · frostmark 0.939 · gravewake 0.954 · doomforge 1.060 (early 0.941) · tidecall 1.086 (early 0.861) · blightroot 0.930 (early 0.888)

### Faction win rate per team size (verification run)

| Team size | ironvow | thornwild | shardbound | cogspark | duskmoon | bloodtusk | sunspire | frostmark | gravewake | doomforge | tidecall | blightroot | games |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1v1 | 50% (9%–91%) | 67% (30%–90%) | 83% (44%–97%) | 67% (30%–90%) | 50% (24%–76%) | 50% (9%–91%) | 50% (15%–85%) | 100% (34%–100%) | 83% (44%–97%) | 0% (0%–39%) | 0% (0%–66%) | 13% (2%–47%) | 38 |
| 2v2 | 50% (15%–85%) | 80% (38%–96%) | 50% (19%–81%) | 33% (12%–65%) | 39% (15%–69%) | 50% (13%–87%) | 50% (13%–87%) | 75% (30%–95%) | 83% (31%–98%) | 33% (10%–70%) | 75% (20%–97%) | 42% (14%–76%) | 38 |
| 3v3 | 50% (16%–84%) | 58% (20%–89%) | 40% (14%–74%) | 42% (11%–80%) | 50% (16%–84%) | 75% (24%–97%) | 58% (28%–83%) | 25% (3%–76%) | 50% (15%–85%) | 50% (22%–78%) | 50% (19%–81%) | 50% (15%–85%) | 38 |
| 4v4 | 70% (30%–93%) | 46% (16%–79%) | 37% (12%–71%) | 44% (7%–88%) | 54% (14%–89%) | 50% (15%–85%) | 42% (16%–73%) | 48% (17%–81%) | 70% (32%–92%) | 44% (13%–81%) | 50% (16%–84%) | 50% (18%–82%) | 38 |
| **average** | **55%** | **63%** | **52%** | **46%** | **48%** | **56%** | **50%** | **62%** | **72%** | **32%** | **44%** | **39%** | 152 |

Small (1v1, 2v2) minus big games (3v3, 4v4): ironvow -10% · thornwild +21% · shardbound +28% · cogspark +7% · duskmoon -8% · bloodtusk -13% · sunspire +0% · frostmark +51% · gravewake +23% · doomforge -31% · tidecall -13% · blightroot -23% (the `early` knob targets ±15%)

## 3 · Bot levels (1v1, all faction pairings)

Target: the higher level wins ~80% (band 70%–90%). Hard keeps income 1.

| Iteration | income | brutal>hard | hard>normal | normal>easy |
|---|---|---|---|---|
| 1 | easy 0.92 · normal 0.86 · hard 1.00 · brutal 1.18 | 81% | 69% | 66% |
| … | time budget: 26 of 30 min used | | | |

Income now: easy 0.92 · normal 0.86 · hard 1.00 · brutal 1.18

## ✗ Out of band

- faction ironvow wins 55% overall (want 50% ± 5%)
- faction thornwild does 21% better in small games (1v1, 2v2) than in big ones (3v3, 4v4) (want within ±15%)
- faction thornwild wins 63% overall (want 50% ± 5%)
- faction shardbound does 28% better in small games (1v1, 2v2) than in big ones (3v3, 4v4) (want within ±15%)
- faction bloodtusk wins 56% overall (want 50% ± 5%)
- faction frostmark does 51% better in small games (1v1, 2v2) than in big ones (3v3, 4v4) (want within ±15%)
- faction frostmark wins 62% overall (want 50% ± 5%)
- faction gravewake does 23% better in small games (1v1, 2v2) than in big ones (3v3, 4v4) (want within ±15%)
- faction gravewake wins 72% overall (want 50% ± 5%)
- faction doomforge does 31% worse in small games (1v1, 2v2) than in big ones (3v3, 4v4) (want within ±15%)
- faction doomforge wins 32% overall (want 50% ± 5%)
- faction tidecall wins 44% overall (want 50% ± 5%)
- faction blightroot does 23% worse in small games (1v1, 2v2) than in big ones (3v3, 4v4) (want within ±15%)
- faction blightroot wins 39% overall (want 50% ± 5%)

## Needs a design look (knobs can't fix these)

- Aircraft Factory scores 6% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Wind Monument scores 1% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Chapel scores 0% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Arbalest Range scores 4% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Greater Chaos Citadel scores 89% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Zephyr Spire scores 6% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Tower of Supreme Magic scores 22% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Gale Cage scores 0% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Sanctum of Dawn scores 0% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Shield Bearer Pen scores 23% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Defiled Granary scores 20% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Cathedral scores 23% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Frost Claws scores 77% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Felhound Shrine scores 100% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Sun Citadel scores 0% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Resonant Nexus scores 100% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Demon Gate scores 91% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Elder Heartwood scores 0% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Goliath Works scores 100% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Radiant Citadel scores 0% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- World Root scores 100% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Voodoo Lounge scores 100% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- doomforge wins 0% at 1v1 (CI 0%–39%): size-dependent
- hard beats normal 69% (band 70%–90%; income limits reached or noise)
- normal beats easy 66% (band 70%–90%; income limits reached or noise)

## All line-ups (verification run, 152 games)

| Line-up A | Line-up B | A wins | 95% CI | games | avg min | |
|---|---|---|---|---|---|---|
| blightroot | cogspark | 0% | 0%–66% | 2 | 8.1 | ⚠ |
| blightroot | duskmoon | 0% | 0%–66% | 2 | 7.1 | ⚠ |
| blightroot | shardbound | 0% | 0%–66% | 2 | 12.7 | ⚠ |
| blightroot | sunspire | 50% | 9%–91% | 2 | 12.0 |  |
| bloodtusk | cogspark | 50% | 9%–91% | 2 | 9.1 |  |
| bloodtusk+blightroot | sunspire+gravewake | 0% | 0%–66% | 2 | 10.4 | ⚠ |
| bloodtusk+doomforge | cogspark+doomforge | 50% | 9%–91% | 2 | 9.1 |  |
| bloodtusk+doomforge+blightroot | shardbound+sunspire+tidecall | 50% | 9%–91% | 2 | 9.4 |  |
| bloodtusk+sunspire+blightroot | shardbound+cogspark+doomforge | 50% | 9%–91% | 2 | 9.7 |  |
| bloodtusk+sunspire+gravewake+tidecall | shardbound+duskmoon+sunspire+doomforge | 50% | 9%–91% | 2 | 14.0 |  |
| cogspark | thornwild | 50% | 9%–91% | 2 | 13.3 |  |
| cogspark+bloodtusk+sunspire | duskmoon+sunspire+doomforge | 100% | 34%–100% | 2 | 11.9 | ⚠ |
| cogspark+doomforge | shardbound+duskmoon | 50% | 9%–91% | 2 | 20.1 |  |
| cogspark+duskmoon | duskmoon+blightroot | 0% | 0%–66% | 2 | 9.2 | ⚠ |
| cogspark+duskmoon | thornwild+blightroot | 0% | 0%–66% | 2 | 12.1 | ⚠ |
| cogspark+duskmoon | thornwild+frostmark | 0% | 0%–66% | 2 | 20.1 | ⚠ |
| cogspark+duskmoon+blightroot | ironvow+thornwild+sunspire | 0% | 0%–66% | 2 | 11.8 | ⚠ |
| cogspark+frostmark | duskmoon+bloodtusk | 0% | 0%–66% | 2 | 19.4 | ⚠ |
| cogspark+frostmark | shardbound+doomforge | 100% | 34%–100% | 2 | 11.5 | ⚠ |
| cogspark+sunspire+doomforge | ironvow+gravewake+tidecall | 50% | 9%–91% | 2 | 8.3 |  |
| cogspark+sunspire+doomforge | thornwild+sunspire+tidecall | 0% | 0%–66% | 2 | 16.7 | ⚠ |
| cogspark+sunspire+gravewake+tidecall | thornwild+bloodtusk+gravewake+doomforge | 0% | 0%–66% | 2 | 15.4 | ⚠ |
| doomforge | duskmoon | 0% | 0%–66% | 2 | 6.9 | ⚠ |
| doomforge | frostmark | 0% | 0%–66% | 2 | 4.9 | ⚠ |
| doomforge | gravewake | 0% | 0%–66% | 2 | 5.5 | ⚠ |
| doomforge+blightroot | gravewake+tidecall | 0% | 0%–66% | 2 | 8.0 | ⚠ |
| duskmoon | duskmoon | 50% | 9%–91% | 2 | 22.9 | mirror |
| duskmoon | gravewake | 0% | 0%–66% | 2 | 9.5 | ⚠ |
| duskmoon | ironvow | 50% | 9%–91% | 2 | 9.2 |  |
| duskmoon | shardbound | 0% | 0%–66% | 2 | 7.4 | ⚠ |
| duskmoon+blightroot | thornwild+doomforge | 50% | 9%–91% | 2 | 14.0 |  |
| duskmoon+bloodtusk+sunspire | shardbound+sunspire+tidecall | 100% | 34%–100% | 2 | 12.0 | ⚠ |
| duskmoon+frostmark | duskmoon+frostmark | 100% | 34%–100% | 2 | 13.1 | mirror |
| duskmoon+gravewake+doomforge | duskmoon+gravewake+doomforge | 0% | 0%–66% | 2 | 11.6 | mirror |
| duskmoon+gravewake+doomforge | ironvow+duskmoon+doomforge | 0% | 0%–66% | 2 | 10.4 | ⚠ |
| duskmoon+sunspire | shardbound+cogspark | 50% | 9%–91% | 2 | 21.8 |  |
| duskmoon+sunspire | thornwild+frostmark | 0% | 0%–66% | 2 | 14.6 | ⚠ |
| duskmoon+sunspire+frostmark+doomforge | ironvow+cogspark+duskmoon+gravewake | 0% | 0%–66% | 2 | 12.2 | ⚠ |
| duskmoon+sunspire+frostmark+gravewake | duskmoon+sunspire+frostmark+gravewake | 50% | 9%–91% | 2 | 14.9 | mirror |
| frostmark+gravewake+tidecall+blightroot | ironvow+shardbound+bloodtusk+blightroot | 100% | 34%–100% | 2 | 11.5 | ⚠ |
| frostmark+tidecall+blightroot | shardbound+cogspark+blightroot | 50% | 9%–91% | 2 | 13.4 |  |
| gravewake | gravewake | 0% | 0%–66% | 2 | 5.3 | mirror |
| gravewake | thornwild | 50% | 9%–91% | 2 | 12.5 |  |
| ironvow | ironvow | 0% | 0%–66% | 2 | 13.4 | mirror |
| ironvow+blightroot | ironvow+shardbound | 0% | 0%–66% | 2 | 8.2 | ⚠ |
| ironvow+bloodtusk+frostmark+gravewake | thornwild+shardbound+frostmark+blightroot | 100% | 34%–100% | 2 | 11.5 | ⚠ |
| ironvow+duskmoon+gravewake | ironvow+duskmoon+gravewake | 75% | 20%–97% | 2 | 26.1 | mirror |
| ironvow+duskmoon+sunspire+gravewake | sunspire+frostmark+tidecall+blightroot | 100% | 34%–100% | 2 | 15.3 | ⚠ |
| ironvow+gravewake+tidecall | ironvow+gravewake+tidecall | 50% | 9%–91% | 2 | 8.4 | mirror |
| ironvow+shardbound | shardbound+cogspark | 50% | 9%–91% | 2 | 15.1 |  |
| ironvow+shardbound+doomforge+blightroot | shardbound+sunspire+gravewake+doomforge | 100% | 34%–100% | 2 | 14.8 | ⚠ |
| ironvow+shardbound+sunspire+frostmark | thornwild+shardbound+bloodtusk+blightroot | 50% | 9%–91% | 2 | 11.6 |  |
| ironvow+shardbound+tidecall | thornwild+duskmoon+doomforge | 0% | 0%–66% | 2 | 11.6 | ⚠ |
| ironvow+sunspire | ironvow+sunspire | 0% | 0%–66% | 2 | 8.0 | mirror |
| ironvow+sunspire+gravewake | ironvow+sunspire+tidecall | 50% | 9%–91% | 2 | 11.1 |  |
| ironvow+sunspire+tidecall+blightroot | ironvow+thornwild+duskmoon+doomforge | 100% | 34%–100% | 2 | 10.7 | ⚠ |
| ironvow+thornwild+duskmoon+doomforge | ironvow+thornwild+duskmoon+doomforge | 100% | 34%–100% | 2 | 14.0 | mirror |
| ironvow+thornwild+frostmark | shardbound+gravewake+tidecall | 0% | 0%–66% | 2 | 9.2 | ⚠ |
| ironvow+thornwild+sunspire+frostmark | thornwild+shardbound+bloodtusk+sunspire | 100% | 34%–100% | 2 | 16.8 | ⚠ |
| ironvow+thornwild+sunspire+tidecall | shardbound+sunspire+doomforge+blightroot | 50% | 9%–91% | 2 | 16.5 |  |
| ironvow+tidecall | thornwild+gravewake | 50% | 9%–91% | 2 | 9.8 |  |
| shardbound | sunspire | 50% | 9%–91% | 2 | 10.3 |  |
| shardbound+bloodtusk+gravewake+tidecall | thornwild+bloodtusk+frostmark+blightroot | 50% | 9%–91% | 2 | 13.1 |  |
| shardbound+duskmoon+sunspire+blightroot | shardbound+duskmoon+sunspire+blightroot | 100% | 34%–100% | 2 | 16.1 | mirror |
| shardbound+duskmoon+tidecall | shardbound+gravewake+doomforge | 50% | 9%–91% | 2 | 10.5 |  |
| shardbound+gravewake+doomforge | thornwild+frostmark+doomforge | 50% | 9%–91% | 2 | 15.1 |  |
| shardbound+sunspire+doomforge+tidecall | shardbound+sunspire+tidecall+blightroot | 100% | 34%–100% | 2 | 13.2 | ⚠ |
| sunspire+doomforge+blightroot | sunspire+doomforge+blightroot | 100% | 34%–100% | 2 | 12.2 | mirror |
| sunspire+doomforge+blightroot | thornwild+shardbound+frostmark | 100% | 34%–100% | 2 | 11.9 | ⚠ |
| thornwild | thornwild | 50% | 9%–91% | 2 | 7.0 | mirror |
| thornwild | tidecall | 100% | 34%–100% | 2 | 9.1 | ⚠ |
| thornwild+blightroot | thornwild+blightroot | 0% | 0%–66% | 2 | 9.5 | mirror |
| thornwild+cogspark+duskmoon+gravewake | thornwild+shardbound+sunspire+frostmark | 75% | 20%–97% | 2 | 25.1 | ⚠ |
| thornwild+cogspark+frostmark+doomforge | thornwild+frostmark+gravewake+blightroot | 0% | 0%–66% | 2 | 20.4 | ⚠ |
| thornwild+sunspire+frostmark+blightroot | thornwild+sunspire+frostmark+blightroot | 100% | 34%–100% | 2 | 13.0 | mirror |
| thornwild+tidecall | thornwild+tidecall | 100% | 34%–100% | 2 | 10.8 | mirror |

| Faction | win rate (non-mirror) | 95% CI | weighted games |
|---|---|---|---|
| shardbound | 52% | 33%–70% | 25.2 |
| sunspire | 50% | 31%–69% | 23.7 |
| thornwild | 62% | 41%–80% | 21.0 |
| cogspark | 45% | 27%–66% | 21.0 |
| duskmoon | 47% | 29%–65% | 26.7 |
| blightroot | 35% | 19%–55% | 23.5 |
| doomforge | 33% | 18%–52% | 24.5 |
| frostmark | 59% | 34%–80% | 14.2 |
| gravewake | 72% | 50%–87% | 18.5 |
| tidecall | 47% | 24%–70% | 14.5 |
| bloodtusk | 56% | 30%–79% | 11.7 |
| ironvow | 56% | 33%–77% | 15.7 |

Left side wins 53% (CI 45%–61%) · draws 2 · avg 12.4 min
