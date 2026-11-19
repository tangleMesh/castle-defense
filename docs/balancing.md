# Balancing with the simulation lab

The lab (`shared/src/lab`, CLI in `server/scripts/lab`) plays complete matches of the real
simulation with bots, without network or rendering, on every CPU core. It answers three questions:

1. **Are the factions balanced?** Every line-up against every other, in 1v1 and in teams.
2. **Are the bots good?** Each difficulty must beat the one below, and the hard bot must beat
   human-style strategies, not just copies of itself.
3. **Is each building worth its price?** Building duels compare raw unit value per gold, tier by
   tier, independent of how well the bots play.

Everything is derived from `FACTIONS`, so a new faction is included automatically.

## Commands

```bash
npm run lab -- all [--seeds 3]                 # everything below → lab-report.md; --strict exits 1 when out of band
npm run lab -- factions [--level hard] [--sizes 1,2,3] [--seeds 8] [--band 0.35,0.65]
npm run lab -- ladder [--seeds 3] [--min 0.7]  # brutal > hard > normal > easy, per faction pairing
npm run lab -- sparring [--seeds 3]            # hard vs turtle / ranged / swarm / air / greed / tech / scout / rush …
npm run lab -- duels [--budget 400]            # same-tier buildings, equal gold, no AI
npm run lab -- arena --b '{"place":"front"}' [--blevel hard] [--level hard]   # AI variant B vs A
npm run lab -- tune --variants '[{"rescueAt":3},{"think":5}]'                   # several variants vs the plain level
npm run lab -- search --n 24 --verify 8        # random search over AI profile parameters
```

Every command takes `--patch` to try a change **without editing the faction files**:

```bash
npm run lab -- factions --sizes 1,2 --seeds 8 --patch '{"tw_burrow.spawn.interval":26,"tw_vineling.hp":95}'
```

Keys are `<building or unit id>.<field path>`. `LAB_THREADS=2` limits the worker count.

## Automatic balancing

```bash
npm run balance:check                # measure only; exit 1 if out of band and print the stages to re-tune
npm run balance -- --stages factions # re-tune only what failed (units | factions | bots, comma-separated)
npm run balance                      # all stages, then write shared/src/data/tuning.ts and docs/balance-report.md
npm run balance -- --quick --dry     # smoke test (~5 min), writes nothing
npm run balance -- --stages factions --sizes 1,2,3,4 --games 144 --verify-games 360 --pairings 24 --iterations 8 --tolerance 0.03
npm run balance -- --reset           # start from an untuned game (after a big redesign)
```

**Workflow:** after any change that can move balance, run `npm run balance:check`:
- a new building or unit
- a stat or cost change
- a new mechanic
- an AI change

If it fails, it prints the exact command that re-tunes only the failed stages, for example
`--stages bots` after an AI change. Each stage starts from the committed tuning, so a small change usually needs
one or two steps. Review the diff of `tuning.ts` and `docs/balance-report.md`, then commit both.

**Versioning:** each run that changes the tuning raises `revision` in `tuning.ts` by 1. The game shows it after the
game version (`v0.21.0+2`), so players and testers can tell a balance change from a game change. Commit a balance run
without touching `package.json`; the revision never resets.

**What it changes:** only `shared/src/data/tuning.ts`, a small generated file of multipliers on top of
the hand-written faction files. It's applied at load time (`applyUnitTuning` in `shared/src/data/index.ts`),
so the game, the bots, the tooltips and the lab all use the tuned values. The faction files stay the design intent.

| Stage | Measures | Knob |
|---|---|---|
| 1 · units | building duels, same tier, equal gold, no AI | unit hp and dmg of clear outliers (outside 25–75%): ±4% per step, 0.8–1.25 in total. Support, siege, anti-air and champion units are skipped and listed instead |
| 2 · factions | every line-up against every other at 1v1–4v4, both sides, hard bots | faction `power`: hp and dmg of every unit × √power. Faction `early`: the same, on top, for first-tier units only (buildable spawners and what their units burst into), steered by the gap between small (1v1, 2v2) and big games (3v3, 4v4): short games are decided by the first tier, long ones by upgrades and specials. Verification wants that gap within ±15% |
| 3 · bots | brutal>hard, hard>normal, normal>easy, all faction pairings | income of brutal / normal / easy (hard stays 1, so stage 2 is unaffected); target ~80% |
| 4 · strategies | normal and hard bots against human-style strategies (pure air, swarm, turtle, rush, …; `sparring.ts`) played by the same level's brain, every faction pairing | none: measure only. A bot that wins less than 40% against one strategy (95% CI below 50%) fails the check |

The game snowballs, so single results are noisy, and small changes can flip a matchup. Three things keep a run short:

- **Every game counts.** All games of a run feed a logistic fit of win rate against the knob (`shared/src/lab/fit.ts`).
  Each step jumps to the fit's target, at most ±6% power or ±15% income per step. While the knob has barely moved,
  a prior on the slope keeps the steps cautious; once there is data at several settings, the fit takes over.
- **Equal games per team size.** The faction rate is the average of the four team sizes, so each size gets about the
  same number of games (`--games` per step, `--verify-games` per verification). Seeding every pairing equally gave
  1v1 only 20 of 512 games while it counted for a quarter of the result. Cheap 1v1 games now carry the same weight
  as expensive 4v4 ones, which makes verifications both more precise and faster.
- **Budgets scale with the factions.** Step and verification games (`--games` 12 / `--verify-games` 30 per faction and team size) and the pairings per step (`--pairings`, 2 per faction) grow with the number of factions. The ladder, the strategy stage and the building duels play a fixed random sample of their grids (which grow with the square of the faction count): the game budgets of the old 4-faction runs.
- **A sample per step, the full grid only to verify.** Each tuning step plays `--pairings` (default 2 per faction) line-up pairings per
  team size, on fresh seeds, drawn uniformly at random and re-drawn every step, so a step measures the same thing as the
  full grid on average. (Always including pure vs pure biased the steps against the verification by 10–20 points.)
- **Lenient verification.** A result only counts after a **verification run** of the full grid on new seeds with 2.5× the
  games. The verification starts as soon as a step lands within tolerance, or once the fit has settled: its step moves power by less than 0.5%, from step 3 on. It passes when each faction is within the tolerance, or within ±5% with a 95% CI that includes 50%.

- **Decided games end early.** A game is called once one castle is at least 20 points healthier and that team also
  has 1.2× the base value and the bigger army (`decided` in `shared/src/lab/match.ts`). The rule was fitted on 220 traced games:
  it ended 217 early and named the wrong winner in none, saving ~7% of the time. Games snowball fast, so earlier calls (from base value
  alone) start to pick wrong winners. `--no-adjudicate` plays every game to the end.

With 4 cores, a tuning step takes about 8 minutes and a verification about 20–25 minutes; 3v3 and 4v4 games are the slow ones.
`LAB_THREADS` and more cores scale almost linearly.

**What it can't fix** (listed under "Needs a design look" in the report):
- a faction that is strong at one team size and weak at another, beyond what `early` (0.75–1.33) can shift
- lopsided individual line-ups such as mixed teams against pure teams
- a side bias of the map
- support units whose value doesn't show in duels
- a bot with a blind spot (stage 4), e.g. it never built anti-air, so pure flyers beat it every time. The check
  fails and names the strategy and faction; teach the bot to counter it in `shared/src/ai/ai.ts`

These need a design or AI change. The lab commands above help find the cause.

Bots stand in for players: hard bots approximate competent play, but people find strategies bots don't use. So keep
an eye on `npm run lab -- sparring`, and on real games.

## Reading the numbers

- Win rates come with **95% Wilson intervals**. With 16 games the interval is roughly ±25%, so
  don't chase single digits: a pairing is only clearly off when the whole interval is outside
  the band (default 35–65%). Use `--seeds 12` or more before concluding anything.
- **Mirror pairings** (same line-up on both sides) and the **left-side rate** should be close to
  50%. If they aren't, something in the simulation or the bots favours one side (the map is
  point-symmetric; see the notes on tie-breaking in `grid.ts`, `movement.ts`, `combat.ts`).
  `shared/test/symmetry.test.ts` guards this exactly: two identical bots in a mirror match must
  stay mirror images through the opening and the first clashes. Rules that keep it that way:
  units decide from start-of-tick positions and move together, separation pushes are applied
  together, and random draws that affect positions use `sideRandom` with team-relative keys.
  Individual mirror rows still swing (±20% with 32 games, the game snowballs); judge the
  overall left-side rate.
- **Ladder**: each level should win at least 70% against the one below.
- **Sparring**: the "control" row is the plain hard bot against itself on the same seeds. A strategy
  is only a problem when hard wins clearly less against it than against the control.
- **Duels** field counts chosen so both sides invest the same gold (within ~5%). They are winner-take-all and noisy for expensive tiers (one unit per side). Treat
  scores above 85% or below 15% as a prompt to look closer, not as a verdict. Siege-only
  units (rams) score high there because they only hit buildings.

The game snowballs strongly: a single second on a spawn interval can swing a 1v1 win rate by
30 points. Prefer small steps, and confirm with a large sample.

## Adding a faction

1. Add `shared/src/data/factions/<id>.ts` and register it in `shared/src/data/index.ts`
   (`FACTIONS`) and in `FactionSchema` (`shared/src/protocol.ts`).
2. `npm test`: `shared/test/factionData.test.ts` checks the structure (references, command card,
   opening spawner, anti-air, sapphire gating, price ranges per tier) for every faction.
3. `npm run lab -- duels` to place each new building against its tier, then
   `npm run lab -- factions --sizes 1,2 --seeds 8` for real games, iterating with `--patch`.
4. Check the bots can play it: `npm run lab -- ladder` and `npm run lab -- sparring`.
   If the hard bot plays the new faction badly (e.g. loses to easy), look at
   `AiPlayer.options` / `spawnScore` and the per-faction placement (`placeBy`) in `shared/src/ai/ai.ts`.
5. Finish with `npm run lab -- all --seeds 6 --strict` and keep `lab-report.md` with the change.

## Tuning the bots

AI behaviour is driven by `Profile` (`shared/src/ai/ai.ts`). The lab can override any field per
bot, which is how the current hard profile was found (bases behind the castle, early rescue strikes).
`SPARRING` (`shared/src/lab/sparring.ts`) holds human-style strategies built from the hard brain
with strategy biases. Add one when players find a strategy that beats the bots, then make the
bots beat it.
