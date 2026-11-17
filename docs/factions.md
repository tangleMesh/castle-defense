# Factions

Both factions follow the structure and numbers of two races of a classic Warcraft III castle-fight map:
- Ironvow follows the "human" race.
- Thornwild follows the "nature" race.

We took their tech trees, stat ratios and signature mechanics. Names, look and theme are our own; no text or art was copied.

## How the numbers were translated

| Map value | Castle Defense |
|---|---|
| Hit points | about 1 : 1 |
| Damage per second | × 0.6 (our fights last longer) |
| Range, movement speed | ÷ 100 (500 range → 5 tiles, 270 speed → 2.7) |
| Training time | about × 0.9 → spawn interval |
| Gold cost | relative prices within a race kept, scaled to our economy (first spawner ≤ 100 gold) |
| "Unarmored" armour | medium or light (we have four armour types) |
| Chance-based abilities (20% crit, 15% evade…) | every n-th attack (crit every 5th, evade every 7th…): same average, deterministic, mirror matches stay mirrored |

After translating, building duels (`npm run lab -- duels`) caught the clear outliers, and `npm run balance` tuned the rest
(see `docs/balance-report.md`).

## Ironvow ("human")

| Ironvow | Inspired by | Notes |
|---|---|---|
| Militia Hall → Shield Hall / Halberd Hall | barracks → stronghold (footman → defender) | Shieldbearers: half damage from ranged attacks, evade every 7th blow, +2 armour aura. Halberd Hall is Ironvow's own (2× vs heavy) |
| Crossbow Lodge → Arbalest Range / Powder Range | sniper nest → marksmen (anti-air) / gunners (ground splash) | Arbalesters only shoot flyers, every 3rd bolt ×3. Grenadiers splash, every 5th ×2 |
| Siege Yard | weapon lab (mortar) | fragile, very long range, splash |
| Lancer Stables → Knight Stables → Paladin Chapter | chapel → church → holy altar | bash (stun) and armour auras; the charge is Ironvow's own |
| Chapel → Cathedral → Sanctum | (Ironvow's own) | the only healers in the game |
| Thunderhawk Roost | gryphon rock | flyer with magic bolts, bash every 7th, lightning chain every 10th |
| War Horn | war horn | +25% attack speed aura |
| Bastion Tower → Cannon Bastion / Siege Battery | watch tower; artillery | the Siege Battery shells the nearest enemy building every 15 s |
| Counting House | treasure box | +20% income |
| Sun Citadel | (Ironvow's own champion line) | |

## Thornwild ("nature")

| Thornwild | Inspired by | Notes |
|---|---|---|
| Burrow → Briar Burrow / Gnasher Warren | spider egg clutch → nest | two at a time, poison, burst into Sproutlings on death |
| Thorn Archers' Grove → Elder Grove | ancient of growth → ancient of life (dryad → keeper of the grove) | the Grove Keeper calls two thorny Treantlings every 24 s |
| Shaman Hut → Storm Lodge → Tempest Circle | furbolg hut → abode | lightning chains (our own twist) |
| Standing Stones | monolith (mountain giant) | Stonehide Giant: hardened skin (blocks 5 per hit), slam every 3rd blow, 1.3× vs buildings |
| Stag Den → Great Stag Den → Wild Hunt | ancient of slumber → hibernation (bear) | critical blows, bash, trample |
| Moth Hive → Jade Wyrm Roost | (swarm is ours) → emerald dragon roost | armoured flyer with splashing magic breath |
| Mossheart → Howling Hollow | ancient of gale | keeps the regen aura, drops a cyclone (damage + 25% slow) every 14 s |
| Strangle-Root | ancient protector | slowing aura and splashing siege boulders |
| Trophy Totem | (Thornwild's own) | +50% bounties |
| Elder Heartwood | (Thornwild's own treant line) | |

## Ability reference

All of these are fields on `UnitDef` / `BuildingDef` (`shared/src/data/types.ts`). They are handled in `shared/src/sim/combat.ts` and `shared/src/sim/powers.ts`, tested in `shared/test/abilities.test.ts`, and described in tooltips by `unitAbilities` / `powerText`.

| Field | Effect |
|---|---|
| `crit: { every, mult }` | every n-th attack deals `mult`× damage |
| `bash: { every, stun }` | every n-th attack stuns a unit for `stun` s |
| `slam: { every, dmg, radius }` | every n-th attack also hits ground units around the target |
| `storm: { every, dmg, jumps }` | every n-th attack calls a lightning chain |
| `evade: n` | every n-th attack against the unit misses |
| `rangedResist` | share of ranged damage ignored |
| `block` | flat damage off every attack (at least 25% gets through) |
| `airOnly` | attacks flyers only |
| `summon: { unit, count, every, ttl }` | calls helpers that fade after `ttl` s |
| aura `stat: 'haste'` | attack speed |
| building `power` | `bombard` (shell on the nearest enemy building) or `cyclone` (damage + slow zone on the nearest enemy) |
