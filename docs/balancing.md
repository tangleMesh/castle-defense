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

## Reading the numbers

- Win rates come with **95% Wilson intervals**. With 16 games the interval is roughly ±25%, so
  don't chase single digits: a pairing is only clearly off when the whole interval is outside
  the band (default 35–65%). Use `--seeds 12` or more before concluding anything.
- **Mirror pairings** (same line-up on both sides) and the **left-side rate** should be close to
  50%. If they aren't, something in the simulation or the bots favours one side (the map is
  point-symmetric; see the notes on tie-breaking in `grid.ts`, `movement.ts`, `combat.ts`).
- **Ladder**: each level should win at least 70% against the one below.
- **Sparring**: the "control" row is the plain hard bot against itself on the same seeds. A strategy
  is only a problem when hard wins clearly less against it than against the control.
- **Duels** are winner-take-all and noisy for expensive tiers (one unit per side). Treat
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
