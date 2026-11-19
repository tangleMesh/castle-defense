# Castle Defense · automatic balance report

Version 0.44.0+9 (balance revision 8 → 9)

2026-11-19T22:45:15.156Z · tuning run · stages units, factions, bots · 26 min

- Faction power: ironvow 0.890 (early 1.030) · thornwild 1.234 (early 0.970) · shardbound 0.963 (early 1.163) · cogspark 1.115 (early 1.197) · duskmoon 0.865 (early 1.197) · bloodtusk 1.160 (early 0.913) · sunspire 0.867 (early 0.914) · frostmark 0.930 (early 1.030) · gravewake 0.921 · doomforge 1.089 (early 0.970) · tidecall 1.138 (early 0.887) · blightroot 0.918 (early 0.888)
- Bot income: easy 0.92 · normal 0.86 · hard 1.00 · brutal 1.18
- Unit multipliers: Corrupted Annihilator ×0.852/0.852, Infernal Tank ×0.961/0.961, Corrupted Treant ×0.923/0.923, Axemaster ×1.041/1.041, Troll Berserker ×0.923/0.923, Catapult ×0.852/0.852, Forest Trapper ×1.041/1.041, Grunt ×1.083/1.083, Spellbreaker Kodo ×1.083/1.083, Troll Trapper ×0.961/0.961, Veteran Grunt ×1.041/1.041, Wyvern Rider ×0.887/0.887, Assault Tank ×1.083/1.083, Flame Sergeant ×0.961/0.961, Heavy Tank ×0.961/0.961, Iron Golem ×0.961/0.961, Light Tank ×0.887/0.887, Rocket Tank ×0.887/0.887, Chaos Warrior ×0.887/0.887, Quill Demon ×0.923/0.923, Red Dragon ×0.852/0.852, Twin of Serenity ×0.887/0.887, Assassin ×1.041/1.041, Glaive Thrower ×1.041/1.041, Avenging Spirit ×1.083/1.083, Ice Queen ×0.887/0.887, Raging Rime Thrower ×0.819/0.819, Rime Thrower ×0.961/0.961, Wendigo ×0.923/0.923, Frost Wolf ×1.083/1.083, Bone Wyrm ×1.041/1.041, Flesh Golem ×0.852/0.852, Suffocated Zombie ×1.041/1.041, Lich King ×1/1, Mighty Necromancer ×0.852/0.852, Necromancer ×0.961/0.961, Skeleton ×1.041/1.041, Vampire ×0.961/0.961, Zombie ×1.041/1.041, Halberdier ×1.127/1.127, Lancer ×0.961/0.961, Mangonel ×1.25/1.25, Militia ×1.25/1.25, Thunderhawk ×1.041/1.041, Blaze Elemental ×0.852/0.852, Deepwater Spirit ×0.852/0.852, Rill Spirit ×1.041/1.041, Spark Elemental ×1.041/1.041, Stone Elemental ×1.083/1.083, Thunder Elemental ×1.041/1.041, Tide Spirit ×1.083/1.083, Dragonhawk Rider ×0.887/0.887, Elder Blademaster ×0.923/0.923, Dragon Turtle ×0.887/0.887, Ancient Hydra ×0.887/0.887, Murloc Warrior ×0.852/0.852, Murloc Assassin ×0.923/0.923, Murloc Champion ×0.923/0.923, Naga Royal Guard ×0.923/0.923, Naga Siren ×0.961/0.961, Swamp Spitter ×0.923/0.923, Winged Serpent ×0.887/0.887, Stonehide Giant ×0.902/0.902, Briarling ×1.221/1.221, Dusk Moth ×0.887/0.887, Jade Wyrm ×1.173/1.173, Storm Shaman ×1.041/1.041, Stormcaller ×1.041/1.041, Stormhorn ×1.083/1.083, Grove Keeper ×0.887/0.887, Tempest Caller ×0.961/0.961, Thorn Archer ×0.887/0.887, Thunder Stag ×0.8/0.8, Vineling ×1.127/1.127, Naga Guardian ×0.961/0.961
- shared/src/data/tuning.ts updated

## 1 · Unit outliers (building duels)

Iteration 1:
- Lich Citadel 12% → Lich King ×1.000 hp, ×1.000 dmg
- Tank Factory 100% → Light Tank ×0.887 hp, ×0.887 dmg
- Great Igloo 100% → Raging Rime Thrower ×0.819 hp, ×0.819 dmg
- Briar Burrow 14% → Briarling ×1.221 hp, ×1.221 dmg
- Elder Grove 79% → Grove Keeper ×0.887 hp, ×0.887 dmg
- Spawning Grounds 77% → Naga Guardian ×0.961 hp, ×0.961 dmg
- Thorn Archers' Grove 85% → Thorn Archer ×0.887 hp, ×0.887 dmg
- Blaze Altar 99% → Blaze Elemental ×0.852 hp, ×0.852 dmg
- Snowy Rocks 3% → Frost Wolf ×1.083 hp, ×1.083 dmg
- Rocket Tank Factory 100% → Rocket Tank ×0.887 hp, ×0.887 dmg
- Siege Yard 18% → Mangonel ×1.250 hp, ×1.250 dmg
- Spellbreaker Pen 23% → Spellbreaker Kodo ×1.083 hp, ×1.083 dmg
- Standing Stones 18% → Stonehide Giant ×0.902 hp, ×0.902 dmg
- Deepwater Fountain 100% → Deepwater Spirit ×0.852 hp, ×0.852 dmg
- Temple of Snakes 88% → Winged Serpent ×0.887 hp, ×0.887 dmg
- Moth Hive 100% → Dusk Moth ×0.887 hp, ×0.887 dmg
- Jade Wyrm Roost 0% → Jade Wyrm ×1.173 hp, ×1.173 dmg
- Orc Siege Works 100% → Catapult ×0.852 hp, ×0.852 dmg

## 2 · Factions (hard bots, all line-ups, team sizes 1/2/3/4)

Tuning steps play a sample of 8 line-up pairings per team size (drawn at random); verification plays the full grid.

| Step | power | win rate | games | fitted slope |
|---|---|---|---|---|
| 1 | ironvow 0.881 (early 1.030) · thornwild 1.202 · shardbound 0.979 (early 1.198) · cogspark 1.098 (early 1.162) · duskmoon 0.895 (early 1.127) · bloodtusk 1.131 (early 0.941) · sunspire 0.903 (early 0.970) · frostmark 0.939 · gravewake 0.954 · doomforge 1.060 (early 0.941) · tidecall 1.086 (early 0.861) · blightroot 0.930 (early 0.888) | ironvow 49% · thornwild 43% · shardbound 67% · cogspark 45% · duskmoon 57% · bloodtusk 34% · sunspire 71% · frostmark 54% · gravewake 72% · doomforge 56% · tidecall 42% · blightroot 44% | 64 | 12 |
| 2 | ironvow 0.888 (early 1.030) · thornwild 1.233 · shardbound 0.944 (early 1.163) · cogspark 1.121 (early 1.197) · duskmoon 0.879 (early 1.127) · bloodtusk 1.182 (early 0.941) · sunspire 0.871 (early 0.941) · frostmark 0.929 (early 0.970) · gravewake 0.920 · doomforge 1.045 (early 0.941) · tidecall 1.121 (early 0.861) · blightroot 0.951 (early 0.888) | ironvow 42% · thornwild 43% · shardbound 45% · cogspark 52% · duskmoon 63% · bloodtusk 56% · sunspire 52% · frostmark 47% · gravewake 44% · doomforge 35% · tidecall 25% · blightroot 74% | 64 | 15 |
| 3 | ironvow 0.892 (early 1.030) · thornwild 1.240 · shardbound 0.952 (early 1.163) · cogspark 1.105 (early 1.197) · duskmoon 0.866 (early 1.161) · bloodtusk 1.171 (early 0.941) · sunspire 0.866 (early 0.941) · frostmark 0.939 · gravewake 0.917 · doomforge 1.069 (early 0.970) · tidecall 1.158 (early 0.887) · blightroot 0.918 (early 0.888) | ironvow 57% · thornwild 67% · shardbound 43% · cogspark 46% · duskmoon 48% · bloodtusk 67% · sunspire 54% · frostmark 55% · gravewake 52% · doomforge 31% · tidecall 63% · blightroot 56% | 64 | 15 |
| final | ironvow 0.890 (early 1.030) · thornwild 1.234 (early 0.970) · shardbound 0.963 (early 1.163) · cogspark 1.115 (early 1.197) · duskmoon 0.865 (early 1.197) · bloodtusk 1.160 (early 0.913) · sunspire 0.867 (early 0.914) · frostmark 0.930 (early 1.030) · gravewake 0.921 · doomforge 1.089 (early 0.970) · tidecall 1.138 (early 0.887) · blightroot 0.918 (early 0.888) | ironvow 49% · thornwild 44% · shardbound 56% · cogspark 52% · duskmoon 48% · bloodtusk 50% · sunspire 52% · frostmark 67% · gravewake 63% · doomforge 36% · tidecall 60% · blightroot 38% | 152 | |

Power now: ironvow 0.890 (early 1.030) · thornwild 1.234 (early 0.970) · shardbound 0.963 (early 1.163) · cogspark 1.115 (early 1.197) · duskmoon 0.865 (early 1.197) · bloodtusk 1.160 (early 0.913) · sunspire 0.867 (early 0.914) · frostmark 0.930 (early 1.030) · gravewake 0.921 · doomforge 1.089 (early 0.970) · tidecall 1.138 (early 0.887) · blightroot 0.918 (early 0.888)

### Faction win rate per team size (verification run)

| Team size | ironvow | thornwild | shardbound | cogspark | duskmoon | bloodtusk | sunspire | frostmark | gravewake | doomforge | tidecall | blightroot | games |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1v1 | 50% (9%–91%) | 33% (10%–70%) | 83% (44%–97%) | 67% (30%–90%) | 60% (31%–83%) | 50% (9%–91%) | 50% (15%–85%) | 100% (34%–100%) | 67% (30%–90%) | 17% (3%–56%) | 50% (9%–91%) | 13% (2%–47%) | 38 |
| 2v2 | 50% (15%–85%) | 60% (23%–88%) | 58% (24%–86%) | 39% (15%–69%) | 44% (19%–73%) | 50% (13%–87%) | 50% (13%–87%) | 63% (22%–91%) | 83% (31%–98%) | 25% (6%–64%) | 75% (20%–97%) | 50% (19%–81%) | 38 |
| 3v3 | 36% (9%–75%) | 42% (11%–80%) | 40% (14%–74%) | 58% (20%–89%) | 50% (16%–84%) | 50% (12%–88%) | 58% (28%–83%) | 50% (12%–88%) | 42% (11%–80%) | 54% (24%–81%) | 61% (26%–88%) | 50% (15%–85%) | 38 |
| 4v4 | 60% (23%–88%) | 42% (14%–76%) | 44% (16%–77%) | 44% (7%–88%) | 38% (8%–81%) | 50% (15%–85%) | 52% (23%–80%) | 57% (22%–86%) | 61% (25%–88%) | 50% (16%–84%) | 56% (19%–87%) | 41% (13%–76%) | 38 |
| **average** | **49%** | **44%** | **56%** | **52%** | **48%** | **50%** | **52%** | **67%** | **63%** | **36%** | **60%** | **38%** | 152 |

Small (1v1, 2v2) minus big games (3v3, 4v4): ironvow +2% · thornwild +5% · shardbound +29% · cogspark +2% · duskmoon +8% · bloodtusk +0% · sunspire -5% · frostmark +28% · gravewake +23% · doomforge -31% · tidecall +4% · blightroot -14% (the `early` knob targets ±15%)

## 3 · Bot levels (1v1, all faction pairings)

Target: the higher level wins ~80% (band 70%–90%). Hard keeps income 1.

| Iteration | income | brutal>hard | hard>normal | normal>easy |
|---|---|---|---|---|
| 1 | easy 0.92 · normal 0.86 · hard 1.00 · brutal 1.18 | 88% | 78% | 72% |

Income now: easy 0.92 · normal 0.86 · hard 1.00 · brutal 1.18

## ✗ Out of band

- faction thornwild wins 44% overall (want 50% ± 5%)
- faction shardbound does 29% better in small games (1v1, 2v2) than in big ones (3v3, 4v4) (want within ±15%)
- faction shardbound wins 56% overall (want 50% ± 5%)
- faction frostmark does 28% better in small games (1v1, 2v2) than in big ones (3v3, 4v4) (want within ±15%)
- faction frostmark wins 67% overall (want 50% ± 5%)
- faction gravewake does 23% better in small games (1v1, 2v2) than in big ones (3v3, 4v4) (want within ±15%)
- faction gravewake wins 63% overall (want 50% ± 5%)
- faction doomforge does 31% worse in small games (1v1, 2v2) than in big ones (3v3, 4v4) (want within ±15%)
- faction doomforge wins 36% overall (want 50% ± 5%)
- faction tidecall wins 60% overall (want 50% ± 5%)
- faction blightroot wins 38% overall (want 50% ± 5%)

## Needs a design look (knobs can't fix these)

- Aircraft Factory scores 6% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Wind Monument scores 0% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Chapel scores 4% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Arbalest Range scores 2% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Greater Chaos Citadel scores 89% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Zephyr Spire scores 6% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Tower of Supreme Magic scores 22% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Gale Cage scores 0% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Sanctum of Dawn scores 0% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Shield Bearer Pen scores 23% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Defiled Granary scores 20% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Frost Claws scores 77% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Felhound Shrine scores 100% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Demon Gate scores 89% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Elder Heartwood scores 0% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Goliath Works scores 100% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Radiant Citadel scores 0% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- World Root scores 100% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)
- Voodoo Lounge scores 100% in duels but isn't auto-tuned (support/siege/anti-air/champion unit)

## All line-ups (verification run, 152 games)

| Line-up A | Line-up B | A wins | 95% CI | games | avg min | |
|---|---|---|---|---|---|---|
| blightroot | cogspark | 0% | 0%–66% | 2 | 13.1 | ⚠ |
| blightroot | duskmoon | 0% | 0%–66% | 2 | 7.7 | ⚠ |
| blightroot | shardbound | 0% | 0%–66% | 2 | 10.8 | ⚠ |
| blightroot | sunspire | 50% | 9%–91% | 2 | 11.3 |  |
| bloodtusk | cogspark | 50% | 9%–91% | 2 | 19.3 |  |
| bloodtusk+blightroot | sunspire+gravewake | 0% | 0%–66% | 2 | 10.6 | ⚠ |
| bloodtusk+doomforge | cogspark+doomforge | 50% | 9%–91% | 2 | 12.7 |  |
| bloodtusk+doomforge+blightroot | shardbound+sunspire+tidecall | 0% | 0%–66% | 2 | 10.6 | ⚠ |
| bloodtusk+sunspire+blightroot | shardbound+cogspark+doomforge | 50% | 9%–91% | 2 | 11.0 |  |
| bloodtusk+sunspire+gravewake+tidecall | shardbound+duskmoon+sunspire+doomforge | 50% | 9%–91% | 2 | 11.9 |  |
| cogspark | thornwild | 50% | 9%–91% | 2 | 14.2 |  |
| cogspark+bloodtusk+sunspire | duskmoon+sunspire+doomforge | 100% | 34%–100% | 2 | 12.5 | ⚠ |
| cogspark+doomforge | shardbound+duskmoon | 50% | 9%–91% | 2 | 15.7 |  |
| cogspark+duskmoon | duskmoon+blightroot | 0% | 0%–66% | 2 | 9.6 | ⚠ |
| cogspark+duskmoon | thornwild+blightroot | 0% | 0%–66% | 2 | 10.5 | ⚠ |
| cogspark+duskmoon | thornwild+frostmark | 0% | 0%–66% | 2 | 10.0 | ⚠ |
| cogspark+duskmoon+blightroot | ironvow+thornwild+sunspire | 50% | 9%–91% | 2 | 11.8 |  |
| cogspark+frostmark | duskmoon+bloodtusk | 0% | 0%–66% | 2 | 19.6 | ⚠ |
| cogspark+frostmark | shardbound+doomforge | 100% | 34%–100% | 2 | 8.6 | ⚠ |
| cogspark+sunspire+doomforge | ironvow+gravewake+tidecall | 50% | 9%–91% | 2 | 12.5 |  |
| cogspark+sunspire+doomforge | thornwild+sunspire+tidecall | 100% | 34%–100% | 2 | 9.8 | ⚠ |
| cogspark+sunspire+gravewake+tidecall | thornwild+bloodtusk+gravewake+doomforge | 0% | 0%–66% | 2 | 14.0 | ⚠ |
| doomforge | duskmoon | 0% | 0%–66% | 2 | 8.6 | ⚠ |
| doomforge | frostmark | 0% | 0%–66% | 2 | 4.5 | ⚠ |
| doomforge | gravewake | 50% | 9%–91% | 2 | 6.0 |  |
| doomforge+blightroot | gravewake+tidecall | 0% | 0%–66% | 2 | 7.3 | ⚠ |
| duskmoon | duskmoon | 50% | 9%–91% | 2 | 15.6 | mirror |
| duskmoon | gravewake | 50% | 9%–91% | 2 | 7.5 |  |
| duskmoon | ironvow | 50% | 9%–91% | 2 | 9.0 |  |
| duskmoon | shardbound | 0% | 0%–66% | 2 | 9.5 | ⚠ |
| duskmoon+blightroot | thornwild+doomforge | 100% | 34%–100% | 2 | 13.0 | ⚠ |
| duskmoon+bloodtusk+sunspire | shardbound+sunspire+tidecall | 50% | 9%–91% | 2 | 13.7 |  |
| duskmoon+frostmark | duskmoon+frostmark | 50% | 9%–91% | 2 | 15.1 | mirror |
| duskmoon+gravewake+doomforge | duskmoon+gravewake+doomforge | 0% | 0%–66% | 2 | 11.1 | mirror |
| duskmoon+gravewake+doomforge | ironvow+duskmoon+doomforge | 50% | 9%–91% | 2 | 10.6 |  |
| duskmoon+sunspire | shardbound+cogspark | 0% | 0%–66% | 2 | 24.1 | ⚠ |
| duskmoon+sunspire | thornwild+frostmark | 50% | 9%–91% | 2 | 9.6 |  |
| duskmoon+sunspire+frostmark+doomforge | ironvow+cogspark+duskmoon+gravewake | 0% | 0%–66% | 2 | 11.0 | ⚠ |
| duskmoon+sunspire+frostmark+gravewake | duskmoon+sunspire+frostmark+gravewake | 50% | 9%–91% | 2 | 16.8 | mirror |
| frostmark+gravewake+tidecall+blightroot | ironvow+shardbound+bloodtusk+blightroot | 100% | 34%–100% | 2 | 11.6 | ⚠ |
| frostmark+tidecall+blightroot | shardbound+cogspark+blightroot | 100% | 34%–100% | 2 | 8.8 | ⚠ |
| gravewake | gravewake | 0% | 0%–66% | 2 | 5.3 | mirror |
| gravewake | thornwild | 100% | 34%–100% | 2 | 12.1 | ⚠ |
| ironvow | ironvow | 50% | 9%–91% | 2 | 11.2 | mirror |
| ironvow+blightroot | ironvow+shardbound | 0% | 0%–66% | 2 | 8.3 | ⚠ |
| ironvow+bloodtusk+frostmark+gravewake | thornwild+shardbound+frostmark+blightroot | 100% | 34%–100% | 2 | 10.3 | ⚠ |
| ironvow+duskmoon+gravewake | ironvow+duskmoon+gravewake | 75% | 20%–97% | 2 | 28.6 | mirror |
| ironvow+duskmoon+sunspire+gravewake | sunspire+frostmark+tidecall+blightroot | 50% | 9%–91% | 2 | 18.1 |  |
| ironvow+gravewake+tidecall | ironvow+gravewake+tidecall | 0% | 0%–66% | 2 | 11.1 | mirror |
| ironvow+shardbound | shardbound+cogspark | 50% | 9%–91% | 2 | 19.8 |  |
| ironvow+shardbound+doomforge+blightroot | shardbound+sunspire+gravewake+doomforge | 50% | 9%–91% | 2 | 13.3 |  |
| ironvow+shardbound+sunspire+frostmark | thornwild+shardbound+bloodtusk+blightroot | 100% | 34%–100% | 2 | 9.2 | ⚠ |
| ironvow+shardbound+tidecall | thornwild+duskmoon+doomforge | 0% | 0%–66% | 2 | 9.3 | ⚠ |
| ironvow+sunspire | ironvow+sunspire | 0% | 0%–66% | 2 | 10.5 | mirror |
| ironvow+sunspire+gravewake | ironvow+sunspire+tidecall | 0% | 0%–66% | 2 | 11.7 | ⚠ |
| ironvow+sunspire+tidecall+blightroot | ironvow+thornwild+duskmoon+doomforge | 100% | 34%–100% | 2 | 10.9 | ⚠ |
| ironvow+thornwild+duskmoon+doomforge | ironvow+thornwild+duskmoon+doomforge | 100% | 34%–100% | 2 | 14.0 | mirror |
| ironvow+thornwild+frostmark | shardbound+gravewake+tidecall | 0% | 0%–66% | 2 | 12.6 | ⚠ |
| ironvow+thornwild+sunspire+frostmark | thornwild+shardbound+bloodtusk+sunspire | 50% | 9%–91% | 2 | 16.9 |  |
| ironvow+thornwild+sunspire+tidecall | shardbound+sunspire+doomforge+blightroot | 50% | 9%–91% | 2 | 14.8 |  |
| ironvow+tidecall | thornwild+gravewake | 50% | 9%–91% | 2 | 11.1 |  |
| shardbound | sunspire | 50% | 9%–91% | 2 | 12.4 |  |
| shardbound+bloodtusk+gravewake+tidecall | thornwild+bloodtusk+frostmark+blightroot | 50% | 9%–91% | 2 | 12.9 |  |
| shardbound+duskmoon+sunspire+blightroot | shardbound+duskmoon+sunspire+blightroot | 50% | 9%–91% | 2 | 13.9 | mirror |
| shardbound+duskmoon+tidecall | shardbound+gravewake+doomforge | 50% | 9%–91% | 2 | 10.8 |  |
| shardbound+gravewake+doomforge | thornwild+frostmark+doomforge | 0% | 0%–66% | 2 | 11.1 | ⚠ |
| shardbound+sunspire+doomforge+tidecall | shardbound+sunspire+tidecall+blightroot | 100% | 34%–100% | 2 | 11.1 | ⚠ |
| sunspire+doomforge+blightroot | sunspire+doomforge+blightroot | 50% | 9%–91% | 2 | 10.2 | mirror |
| sunspire+doomforge+blightroot | thornwild+shardbound+frostmark | 100% | 34%–100% | 2 | 10.0 | ⚠ |
| thornwild | thornwild | 50% | 9%–91% | 2 | 14.0 | mirror |
| thornwild | tidecall | 50% | 9%–91% | 2 | 8.1 |  |
| thornwild+blightroot | thornwild+blightroot | 0% | 0%–66% | 2 | 17.3 | mirror |
| thornwild+cogspark+duskmoon+gravewake | thornwild+shardbound+sunspire+frostmark | 25% | 3%–80% | 2 | 27.6 | ⚠ |
| thornwild+cogspark+frostmark+doomforge | thornwild+frostmark+gravewake+blightroot | 50% | 9%–91% | 2 | 21.0 |  |
| thornwild+sunspire+frostmark+blightroot | thornwild+sunspire+frostmark+blightroot | 50% | 9%–91% | 2 | 15.6 | mirror |
| thornwild+tidecall | thornwild+tidecall | 100% | 34%–100% | 2 | 8.8 | mirror |

| Faction | win rate (non-mirror) | 95% CI | weighted games |
|---|---|---|---|
| shardbound | 56% | 37%–73% | 25.2 |
| sunspire | 53% | 34%–72% | 23.7 |
| thornwild | 44% | 25%–64% | 21.0 |
| cogspark | 51% | 31%–70% | 21.0 |
| duskmoon | 50% | 33%–68% | 26.7 |
| blightroot | 35% | 19%–55% | 23.5 |
| doomforge | 37% | 21%–57% | 24.5 |
| frostmark | 63% | 38%–83% | 14.2 |
| gravewake | 62% | 40%–80% | 18.5 |
| tidecall | 60% | 35%–80% | 14.5 |
| bloodtusk | 50% | 25%–75% | 11.7 |
| ironvow | 49% | 27%–71% | 15.7 |

Left side wins 47% (CI 40%–55%) · draws 2 · avg 12.4 min
