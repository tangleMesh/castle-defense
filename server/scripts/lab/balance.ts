/**
 * Automatic balancer: plays the lab suites, tunes the balance multipliers in
 * shared/src/data/tuning.ts until the factions and bot levels are even, and writes a report.
 *
 *   npm run balance:check               measure only, change nothing; exit 1 if out of band and print the
 *                                       command that re-tunes just the failed stages (run this after a feature)
 *   npm run balance                     tune units, factions and bots; write tuning.ts + docs/balance-report.md
 *   npm run balance -- --full           the thorough run (~7 h with a dozen factions, all strategies)
 *   npm run balance -- --quick --dry    smoke test (~5 min), writes nothing
 *
 * The default run fits about 30 minutes (`--minutes`, a wall-clock budget): a random sample of
 * relevant games per stage (building duels, line-up pairings of every team size, the ladder), a
 * few tuning steps and one verification. Its numbers are noisier than a --full run's, so it moves
 * the knobs in smaller steps and leaves the strategy stage (measure only) to --full.
 *
 * Options: --no-adjudicate (play every game to the end) · --stages units,factions,bots,strategies · --strategy-seeds 4 · --strategy-levels normal,hard · --sizes 1,2,3,4 · --games 48 / --verify-games 120 (non-mirror
 * games per team size, per step / per verification) · --pairings 4 (line-up pairings per team size and step) · --iterations 8 · --tolerance 0.03 (faction win rate 50% ± this) · --reset (start
 * from an untuned game) · --out <file> · LAB_THREADS limits worker threads.
 *
 * How it works (see docs/balancing.md, "Automatic balancing"):
 *  1. units: building duels (no AI) — spawn buildings far outside 25–75% within their tier get
 *     their unit's hp/dmg nudged (±4% per step, cumulative 0.8–1.25).
 *  2. factions: hard bots, line-ups against each other at each team size. Each step plays a fresh
 *     sample of line-ups; all games so far feed a logistic fit of win rate against each faction's
 *     `power` (hp and dmg × sqrt(power)), and the step jumps to the fit's 50% point. A step within
 *     tolerance triggers a verification run of the full grid on fresh seeds.
 *  3. bots: adjacent ladder steps (brutal>hard>normal>easy) aim for ~80% by tuning the income of
 *     brutal / normal / easy (fitted the same way); hard is the anchor and keeps income 1.
 *  4. strategies (measure only): normal and hard bots against human-style strategies (pure air,
 *     swarm, turtle, rush, …). A blind spot fails the check; the fix belongs in the AI.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  AI_LEVELS, BUILDINGS, COMMITTED_TUNING, FACTION_IDS, NEUTRAL_TUNING, SPARRING, UNITS, compKey, compositions, duelJobs, formatReport, ladderMatrix,
  fitLogistic, fitPower, fitTarget, strategyMatrix, summarize, summarizeLadder, tierOf, wilson,
  type AiLevel, type FactionId, type FitPoint, type LabPlayer, type MatrixJob, type MatrixReport, type Rate, type Tuning,
} from '@bc/shared';
import { LabPool, progress } from './pool';

const argv = process.argv.slice(2);
const arg = (name: string, def: string) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : def; };
const flag = (name: string) => argv.includes(`--${name}`);
const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const r3 = (v: number) => Math.round(v * 1000) / 1000;

const quick = flag('quick');
const full = flag('full');
/** Wall-clock budget: tuning steps stop early to leave time for the verification. */
const minutes = Number(arg('minutes', full ? '600' : quick ? '8' : '30'));
const tStart = Date.now();
const elapsed = () => (Date.now() - tStart) / 60_000;
/** Pick a default by mode: the 30-minute run, --quick or --full. */
const by = <T,>(normal: T, q: T, f: T): T => (full ? f : quick ? q : normal);
const check = flag('check');
const dry = flag('dry') || check;
const stages = arg('stages', full ? 'units,factions,bots,strategies' : 'units,factions,bots').split(',');
const sizes = arg('sizes', quick ? '1,2' : '1,2,3,4').split(',').map(Number);
/** Non-mirror games per team size: per tuning step, and per verification of the full grid. */
// Scaled with the number of factions (each faction should appear in a similar number of games).
const NF = Math.max(4, FACTION_IDS.length);
const stepGames = Number(arg('games', String(by(16, 8, 12 * NF))));
const verifyGames = Number(arg('verify-games', String(by(30, 16, 30 * NF))));
const iterations = Number(arg('iterations', String(by(3, 2, 8))));
const tol = Number(arg('tolerance', '0.03'));
// Line-up pairings per team size in a tuning step: enough that every faction plays in each step.
// (the 30-minute run: one game per side of each pairing)
const pairingsPerSize = Number(arg('pairings', String(full ? Math.max(4, 2 * FACTION_IDS.length) : Math.ceil(stepGames / 2))));
const botSeeds = Number(arg('bot-seeds', String(by(1, 1, 6))));
const strategySeeds = Number(arg('strategy-seeds', quick ? '2' : '4'));
const strategyLevels = arg('strategy-levels', 'normal,hard').split(',') as AiLevel[];
const outFile = arg('out', dry ? '' : 'docs/balance-report.md');
const LADDER_TARGET = 0.8, LADDER_BAND: [number, number] = [0.7, 0.9];

const tuning: Tuning = structuredClone(flag('reset') ? NEUTRAL_TUNING : COMMITTED_TUNING);
const startTuning = structuredClone(tuning);
const pool = new LabPool();
const out: string[] = [];
const problems: string[] = [];   // the balancer's job: fail --check
const design: string[] = [];     // knobs can't fix these: a human should look
/** Stages whose check failed: `--check` prints the command that re-tunes just these. */
const failed = new Set<string>();
let seedCounter = 0;
/** Fresh, never reused seed base for every measurement. */
const freshSeeds = () => 200_000 + 1_000_003 * ++seedCounter;

/**
 * Deterministic random sample of `n` jobs (all of them if there are fewer). The ladder, strategy
 * and duel grids grow with the square of the faction count; a fixed game budget keeps a run of a
 * dozen factions to a few hours while every faction still shows up in about the same share of games.
 */
function sampleJobs<T>(jobs: T[], n: number, seed: number): T[] {
  if (jobs.length <= n) return jobs;
  let r = (seed * 7919 + 13) >>> 0;
  const rnd = () => ((r = (r * 1664525 + 1013904223) >>> 0) / 4294967296);
  const a = jobs.slice();
  for (let i = a.length - 1; i > 0; i--) { const t = Math.floor(rnd() * (i + 1)); [a[i], a[t]] = [a[t], a[i]]; }
  return a.slice(0, n);
}
/** Game budgets of the 4-faction runs these stages were designed with. */
const LADDER_GAMES_PER_SEED = 32, STRATEGY_GAMES_PER_SEED = 32, DUEL_BUDGET = by(400, 300, 2000);
const unitIterations = by(1, 1, 4);

/** End decided games early (shared/src/lab/match.ts `decided`): the balancer only needs winners. */
const adjudicate = !flag('no-adjudicate');

async function play(label: string, jobs: MatrixJob[]) {
  pool.tuning = structuredClone(tuning);
  pool.done = 0; pool.total = 0; pool.onProgress = progress(label);
  return Promise.all(jobs.map((j) => pool.match(adjudicate ? { ...j, adjudicate } : j)));
}

// ------------------------------------------------------------------ measurements

interface FactionMeasure {
  /** Per faction: non-mirror win rate averaged over team sizes (the tuning target). */
  overall: Record<string, number>;
  /** Standard error of `overall` (each size's rate weighs a quarter, whatever its game count). */
  se: Record<string, number>;
  bySize: Map<number, MatrixReport>;
  all: MatrixReport;
  games: number;
}

/**
 * Plays the faction matrix with about `gamesPerSize` non-mirror games per team size: the metric
 * averages the sizes with equal weight, so each needs a similar sample (with seeds per pairing,
 * 1v1 had 20 games against 200 for 4v4 and dominated the noise). 1v1 games are also the cheapest.
 *
 * `subset` (a per-iteration seed) plays only `--pairings` line-up pairings per team size, drawn
 * uniformly at random and fresh each iteration, so on average a step measures the same thing as the
 * full grid (always including pure vs pure biased steps by 10–20 points). The full grid verifies
 * (sampled the same way when it has more pairings than the verification budget).
 */
async function measureFactions(label: string, gamesPerSize: number, opts: { mirrors?: boolean; subset?: number } = {}): Promise<FactionMeasure> {
  const base = freshSeeds();
  let r = ((opts.subset ?? 0) * 7919 + 17) >>> 0;
  const rnd = () => ((r = (r * 1664525 + 1013904223) >>> 0) / 4294967296);
  const jobs: MatrixJob[] = [];
  const team = (c: FactionId[]): LabPlayer[] => c.map((faction) => ({ faction, level: 'hard' as AiLevel }));
  const pushPair = (a: FactionId[], b: FactionId[], seeds: number, seedBase: number) => {
    for (let k = 0; k < seeds; k++) for (const swap of [false, true]) {
      const [x, y] = swap ? [b, a] : [a, b];
      jobs.push({ teams: [team(x), team(y)], seed: seedBase + jobs.length * 7919 + k, key: [compKey(x), compKey(y)] });
    }
  };
  sizes.forEach((size, si) => {
    const sizeBase = base + si * 100_003;
    // Line-ups of this size; with a dozen factions 4v4 alone has ~1,400 of them (~930k pairings),
    // so pairings are drawn at random instead of enumerating the grid.
    const comps = compositions(size);
    const total = (comps.length * (comps.length - 1)) / 2;
    // Steps play a sample of pairings; verification plays the full grid while it fits the budget,
    // else a fresh random sample of it.
    const limit = opts.subset !== undefined ? pairingsPerSize : Math.max(pairingsPerSize, Math.ceil(gamesPerSize / 2));
    if (opts.subset === undefined) r = (base + si * 7919) >>> 0;
    const pairs: Array<[number, number]> = [];
    if (total <= limit) {
      for (let i = 0; i < comps.length; i++) for (let j = i + 1; j < comps.length; j++) pairs.push([i, j]);
    } else {
      const seen = new Set<number>();
      while (pairs.length < limit) {
        const i = Math.floor(rnd() * comps.length), j = Math.floor(rnd() * comps.length);
        if (i === j) continue;
        const [lo, hi] = i < j ? [i, j] : [j, i];
        if (seen.has(lo * comps.length + hi)) continue;
        seen.add(lo * comps.length + hi); pairs.push([lo, hi]);
      }
    }
    const n = Math.max(1, Math.round(gamesPerSize / (2 * pairs.length)));
    for (const [i, j] of pairs) pushPair(comps[i], comps[j], n, sizeBase);
    // Mirror matches only feed the side check, so fewer of them (and of the line-ups) are enough.
    if (opts.mirrors) {
      const order = comps.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) { const t = Math.floor(rnd() * (i + 1)); [order[i], order[t]] = [order[t], order[i]]; }
      for (const i of order.slice(0, Math.max(4, Math.ceil(limit / 4)))) pushPair(comps[i], comps[i], Math.max(1, Math.round(n / 3)), sizeBase + 50_000);
    }
  });
  const res = await play(label, jobs);
  const bySize = new Map<number, MatrixReport>();
  for (const size of sizes) {
    const idx = jobs.map((j, i) => (j.teams[0].length === size ? i : -1)).filter((i) => i >= 0);
    bySize.set(size, summarize(idx.map((i) => jobs[i]), idx.map((i) => res[i])));
  }
  const overall: Record<string, number> = {}, se: Record<string, number> = {};
  for (const f of FACTION_IDS) {
    const rates = [...bySize.values()].map((r) => r.factions[f]).filter((v): v is Rate => v !== undefined);
    overall[f] = rates.reduce((a, v) => a + v.rate, 0) / Math.max(1, rates.length);
    se[f] = Math.sqrt(rates.reduce((a, v) => a + ((v.ci[1] - v.ci[0]) / 3.92) ** 2, 0)) / Math.max(1, rates.length);
  }
  return { overall, se, bySize, all: summarize(jobs, res), games: jobs.length };
}

async function measureLadder(label: string, n: number) {
  const steps: Array<{ hi: AiLevel; lo: AiLevel; rate: Rate; pairings: Array<{ key: string } & Rate> }> = [];
  for (let i = AI_LEVELS.length - 1; i > 0; i--) {
    const hi = AI_LEVELS[i], lo = AI_LEVELS[i - 1];
    const base = freshSeeds();
    const jobs = sampleJobs(ladderMatrix({ hi, lo, seeds: n, seedBase: base }), n * LADDER_GAMES_PER_SEED, base);
    const sum = summarizeLadder(jobs, await play(`${label} ${hi}>${lo}`, jobs));
    steps.push({ hi, lo, rate: sum.total, pairings: sum.pairings });
  }
  return steps;
}

async function measureDuels() {
  const jobs = sampleJobs(duelJobs(400), DUEL_BUDGET, freshSeeds());
  pool.tuning = structuredClone(tuning);
  pool.done = 0; pool.total = 0; pool.onProgress = progress('duels');
  const res = await Promise.all(jobs.map(async (j) => {
    const rs = await Promise.all([pool.duel(j.a, j.b, 7), pool.duel(j.b, j.a, 7), pool.duel(j.a, j.b, 19), pool.duel(j.b, j.a, 19)]);
    return (rs[0].score + (1 - rs[1].score) + rs[2].score + (1 - rs[3].score)) / 4;
  }));
  const per = new Map<string, { s: number; n: number }>();
  jobs.forEach((j, i) => {
    for (const [id, s] of [[j.a.building, res[i]], [j.b.building, 1 - res[i]]] as Array<[string, number]>) {
      const e = per.get(id) ?? { s: 0, n: 0 }; e.s += s; e.n++; per.set(id, e);
    }
  });
  return new Map([...per].map(([id, e]) => [id, e.s / e.n]));
}

// ------------------------------------------------------------------ formatting

const factionLine = (m: FactionMeasure) => FACTION_IDS.map((f) => `${f} ${pct(m.overall[f])}`).join(' · ');
const powerLine = () => FACTION_IDS.map((f) => `${f} ${(tuning.factions[f]?.power ?? 1).toFixed(3)}${(tuning.factions[f]?.early ?? 1) !== 1 ? ` (early ${tuning.factions[f]!.early!.toFixed(3)})` : ''}`).join(' · ');
/**
 * How much better a faction does in small games (1v1, 2v2) than in big ones (3v3, 4v4): short
 * games are decided by the first tier, long ones by upgrades, elites and specials. 0 with only
 * small or only big sizes measured.
 */
function spreadOf(m: FactionMeasure, f: string): number {
  const avg = (pick: (size: number) => boolean) => {
    const r = [...m.bySize].filter(([size]) => pick(size)).map(([, rep]) => rep.factions[f]?.rate).filter((v): v is number => v !== undefined);
    return r.length ? r.reduce((a, b) => a + b, 0) / r.length : NaN;
  };
  const d = avg((n) => n <= 2) - avg((n) => n >= 3);
  return Number.isNaN(d) ? 0 : d;
}
/** Share of `early` counted as faction strength in the power fit. */
const EARLY_WEIGHT = 0.5;
/** Allowed small-vs-big gap before `early` has to move (and before a verification counts). */
const SPREAD_TOL = 0.15;
const incomeLine = () => AI_LEVELS.map((l) => `${l} ${(tuning.aiIncome[l] ?? (l === 'brutal' ? 1.3 : 1)).toFixed(2)}`).join(' · ');

function sizeTable(m: FactionMeasure) {
  const lines = ['| Team size | ' + FACTION_IDS.join(' | ') + ' | games |', '|---|' + FACTION_IDS.map(() => '---|').join('') + '---|'];
  for (const [size, r] of m.bySize) {
    lines.push(`| ${size}v${size} | ${FACTION_IDS.map((f) => { const v = r.factions[f]; return v ? `${pct(v.rate)} (${pct(v.ci[0])}–${pct(v.ci[1])})` : '–'; }).join(' | ')} | ${r.pairings.reduce((a, p) => a + p.games, 0)} |`);
  }
  lines.push(`| **average** | ${FACTION_IDS.map((f) => `**${pct(m.overall[f])}**`).join(' | ')} | ${m.games} |`);
  return lines.join('\n');
}

// ------------------------------------------------------------------ stages

/** Stage 1: building duels. Clear outliers within their tier get their unit nudged. */
async function stageUnits() {
  out.push('## 1 · Unit outliers (building duels)', '');
  // Units whose value doesn't show in a straight fight are left alone.
  const eligible = (bid: string) => {
    const b = BUILDINGS[bid], u = b.spawn && UNITS[b.spawn.unit];
    return !!u && tierOf(b) !== 'special' && !u.heal && !u.structuresOnly && !u.aura && !u.airOnly && !u.stealth;
  };
  for (let k = 1; k <= unitIterations; k++) {
    const scores = await measureDuels();
    const outliers = [...scores].filter(([id, s]) => (s < 0.25 || s > 0.75) && eligible(id));
    const skipped = [...scores].filter(([id, s]) => (s < 0.25 || s > 0.75) && !eligible(id));
    if (k === 1) for (const [id, s] of skipped) design.push(`${BUILDINGS[id].name} scores ${pct(s)} in duels but isn't auto-tuned (support/siege/anti-air/champion unit)`);
    if (!outliers.length) { out.push(`Iteration ${k}: no outliers.`, ''); break; }
    if (check) {
      failed.add('units');
      out.push('Outliers (not changed, check only):', ...outliers.map(([id, s]) => `- ${BUILDINGS[id].name} ${pct(s)}`), '');
      break;
    }
    const changes: string[] = [];
    for (const [id, s] of outliers) {
      const unit = BUILDINGS[id].spawn!.unit;
      const cur = tuning.units[unit] ?? {};
      const step = Math.exp(clamp(-0.3 * (s - 0.5), -0.04, 0.04));
      const hp = r3(clamp((cur.hp ?? 1) * step, 0.8, 1.25)), dmg = r3(clamp((cur.dmg ?? 1) * step, 0.8, 1.25));
      tuning.units[unit] = { hp, dmg };
      changes.push(`${BUILDINGS[id].name} ${pct(s)} → ${UNITS[unit].name} ×${hp.toFixed(3)} hp, ×${dmg.toFixed(3)} dmg`);
    }
    out.push(`Iteration ${k}:`, ...changes.map((c) => `- ${c}`), '');
  }
}

/** Stage 2: faction power, by stochastic approximation on the full line-up matrix. */
async function stageFactions(): Promise<FactionMeasure> {
  out.push('## 2 · Factions (hard bots, all line-ups, team sizes ' + sizes.join('/') + ')', '');
  const lp: Record<string, number> = Object.fromEntries(FACTION_IDS.map((f) => [f, Math.log(tuning.factions[f]?.power ?? 1)]));
  // Second knob per faction: the strength of its first tier, against the small-vs-big-game gap.
  const le: Record<string, number> = Object.fromEntries(FACTION_IDS.map((f) => [f, Math.log(tuning.factions[f]?.early ?? 1)]));
  // The fit works relative to the starting tuning (its intercept prior then means "the current
  // tuning is about right", not "power 1.0 is balanced"), and counts half of `early` as strength:
  // the first tier is roughly half of what a faction fields over a game.
  const lp0 = { ...lp }, le0 = { ...le };
  const strength = (f: string) => lp[f] - lp0[f] + EARLY_WEIGHT * (le[f] - le0[f]);
  const setPower = () => {
    const mean = FACTION_IDS.reduce((a, f) => a + lp[f], 0) / FACTION_IDS.length;
    for (const f of FACTION_IDS) {
      lp[f] -= mean;
      const early = r3(Math.exp(le[f]));
      tuning.factions[f] = { power: r3(Math.exp(lp[f])), ...(early !== 1 ? { early } : {}) };
    }
  };
  // Proportional steps (≤ ±3% per step, 0.75–1.33 in total), only for a gap beyond the tolerance:
  // a step sample's small-vs-big gap has a ±7% standard error, so smaller gaps are mostly noise.
  const stepEarly = (m: FactionMeasure) => {
    if (sizes.length < 2) return;
    for (const f of FACTION_IDS) {
      const d = spreadOf(m, f);
      if (Math.abs(d) > SPREAD_TOL) le[f] = clamp(le[f] + clamp(-0.2 * d, -0.03, 0.03), Math.log(0.75), Math.log(1.33));
    }
    setPower();
  };
  const spreadOk = (m: FactionMeasure) => sizes.length < 2 || FACTION_IDS.every((f) => Math.abs(spreadOf(m, f)) <= SPREAD_TOL);
  // Every measurement so far feeds a logistic fit of win rate against power (shared/src/lab/fit.ts);
  // each step jumps to the fit's 50% point (at most ±6% power per step).
  const points: FitPoint[] = [];
  const record = (m: FactionMeasure) => FACTION_IDS.forEach((f, g) => {
    // Effective sample size of the size-averaged rate (from its standard error).
    const n = m.se[f] > 0 ? 0.25 / m.se[f] ** 2 : 0;
    if (n) points.push({ group: g, x: strength(f), rate: clamp(m.overall[f], 0.02, 0.98), n });
  });
  const step = () => {
    const fit = fitPower(points, FACTION_IDS.length);
    const b = fit.b;
    const before = { ...lp };
    // Up to ±6% power per step (the fit's prior slope keeps noisy samples from overshooting).
    const cap = 0.06;
    FACTION_IDS.forEach((f, g) => { lp[f] += clamp(-fit.a[g] / b - strength(f), -cap, cap); });
    setPower();
    return { b, moved: Math.max(...FACTION_IDS.map((f) => Math.abs(lp[f] - before[f]))) };
  };
  const ok = (m: FactionMeasure) => FACTION_IDS.every((f) => Math.abs(m.overall[f] - 0.5) <= tol);
  // The verification passes when every faction is within tolerance or statistically
  // indistinguishable from 50% (its 95% CI holds 50%), but never beyond ±5%.
  const verifiedOk = (m: FactionMeasure) => FACTION_IDS.every((f) => {
    const dev = Math.abs(m.overall[f] - 0.5);
    return dev <= tol || (dev <= 0.05 && dev <= 1.96 * m.se[f]);
  });
  out.push(`Tuning steps play a sample of ${pairingsPerSize} line-up pairings per team size (drawn at random); verification plays the full grid.`, '');
  out.push('| Step | power | win rate | games | fitted slope |', '|---|---|---|---|---|');
  let verified: FactionMeasure | null = null;
  for (let k = 1; k <= iterations && !check; k++) {
    // Keep about a third of the budget for the verification and the bot ladder.
    if (k > 1 && elapsed() > minutes * 0.6) { out.push(`| … | time budget: ${elapsed().toFixed(0)} of ${minutes} min used, on to the verification | | | |`); break; }
    const m = await measureFactions(`factions #${k}`, stepGames, { subset: k });
    record(m);
    const row = `| ${k} | ${powerLine()} | ${factionLine(m)} | ${m.games} |`;
    process.stderr.write(`  power ${powerLine()} → ${factionLine(m)}\n`);
    // Verify when this sample looks balanced, or when the fit has settled: a single sample is
    // noisy (±8% at 160 games), so waiting for one to land within tolerance can take many steps.
    let verifyNow = ok(m);
    if (verifyNow) out.push(`${row} |`);
    else {
      const { b, moved } = step();
      verifyNow = k >= 3 && moved < 0.005;
      out.push(`${row} ${b.toFixed(0)}${verifyNow ? ' (fit settled)' : ''} |`);
    }
    // The first-tier knob follows the gap between small and big games; while it is large, it keeps moving.
    if (!spreadOk(m)) { stepEarly(m); verifyNow = false; }
    if (verifyNow) {
      const v = await measureFactions(`verify #${k}`, verifyGames, { mirrors: true });
      record(v);
      out.push(`| ${k} ✓ verify | ${powerLine()} | ${factionLine(v)} | ${v.games} | |`);
      process.stderr.write(`  verify → ${factionLine(v)}\n`);
      if (verifiedOk(v) && spreadOk(v)) { verified = v; break; }
      step();
      stepEarly(v);
    }
  }
  if (!verified) {
    verified = await measureFactions('factions verify', verifyGames, { mirrors: true });
    if (!check) out.push(`| final | ${powerLine()} | ${factionLine(verified)} | ${verified.games} | |`);
  }
  out.push('', `Power now: ${powerLine()}`, '', '### Faction win rate per team size (verification run)', '', sizeTable(verified), '',
    `Small (1v1, 2v2) minus big games (3v3, 4v4): ${FACTION_IDS.map((f) => `${f} ${spreadOf(verified!, f) >= 0 ? '+' : ''}${pct(spreadOf(verified!, f))}`).join(' · ')} (the \`early\` knob targets ±${pct(SPREAD_TOL)})`, '');
  for (const f of FACTION_IDS) {
    const gap = spreadOf(verified, f);
    if (Math.abs(gap) > SPREAD_TOL) { failed.add('factions'); problems.push(`faction ${f} does ${pct(Math.abs(gap))} ${gap > 0 ? 'better' : 'worse'} in small games (1v1, 2v2) than in big ones (3v3, 4v4) (want within ±${pct(SPREAD_TOL)})`); }
    if (Math.abs(verified.overall[f] - 0.5) > Math.max(tol, 0.05)) { failed.add('factions'); problems.push(`faction ${f} wins ${pct(verified.overall[f])} overall (want 50% ± ${pct(Math.max(tol, 0.05))})`); }
    for (const [size, r] of verified.bySize) {
      const v = r.factions[f];
      if (v && (v.ci[1] < 0.4 || v.ci[0] > 0.6)) design.push(`${f} wins ${pct(v.rate)} at ${size}v${size} (CI ${pct(v.ci[0])}–${pct(v.ci[1])}): size-dependent${Math.abs(le[f]) >= Math.log(1.32) ? ', and the early knob is at its limit' : ''}`);
    }
  }
  for (const p of verified.all.pairings) {
    if (p.a !== p.b && (p.ci[1] < 0.3 || p.ci[0] > 0.7)) design.push(`${p.a} vs ${p.b}: ${pct(p.rate)} (CI ${pct(p.ci[0])}–${pct(p.ci[1])})`);
  }
  const side = verified.all.side;
  if (side.ci[0] > 0.5 || side.ci[1] < 0.5) design.push(`left side wins ${pct(side.rate)} (CI ${pct(side.ci[0])}–${pct(side.ci[1])}): the map or the simulation favours one side`);
  return verified;
}

/** Stage 3: bot difficulty ladder via the income of brutal / normal / easy. */
async function stageBots() {
  out.push('## 3 · Bot levels (1v1, all faction pairings)', '', `Target: the higher level wins ~${pct(LADDER_TARGET)} (band ${pct(LADDER_BAND[0])}–${pct(LADDER_BAND[1])}). Hard keeps income 1.`, '');
  // Which level's income moves each step, its sign (+1: more income = higher wins more), and limits.
  const knob: Record<string, { level: AiLevel; sign: 1 | -1; lo: number; hi: number }> = {
    'brutal>hard': { level: 'brutal', sign: 1, lo: 1, hi: 1.8 },
    'hard>normal': { level: 'normal', sign: -1, lo: 0.6, hi: 1 },
    'normal>easy': { level: 'easy', sign: -1, lo: 0.4, hi: 1 },
  };
  const inc = (l: AiLevel) => tuning.aiIncome[l] ?? (l === 'brutal' ? 1.3 : 1);
  const inBand = (r: number) => r >= LADDER_BAND[0] && r <= LADDER_BAND[1];
  out.push('| Iteration | income | ' + Object.keys(knob).join(' | ') + ' |', '|---|---|' + Object.keys(knob).map(() => '---|').join(''));
  // Same as for factions: all ladder games so far feed one logistic fit per step (x = ±log income).
  const keys = Object.keys(knob);
  const points: FitPoint[] = [];
  let last: Awaited<ReturnType<typeof measureLadder>> = [];
  const maxIt = check ? 1 : Math.min(iterations, full ? iterations : 2);
  for (let k = 1; k <= maxIt; k++) {
    const final = k === maxIt;
    last = await measureLadder(`ladder #${k}`, botSeeds * (final && full ? 2 : 1));
    out.push(`| ${k} | ${incomeLine()} | ${last.map((s) => `${pct(s.rate.rate)}`).join(' | ')} |`);
    process.stderr.write(`  income ${incomeLine()} → ${last.map((s) => `${s.hi}>${s.lo} ${pct(s.rate.rate)}`).join(' · ')}\n`);
    for (const s of last) {
      const g = keys.indexOf(`${s.hi}>${s.lo}`), kn = knob[keys[g]];
      points.push({ group: g, x: kn.sign * Math.log(inc(kn.level)), rate: clamp(s.rate.rate, 0.02, 0.98), n: s.rate.games });
    }
    if (last.every((s) => inBand(s.rate.rate)) || final) break;
    // Out of time: keep this round's measurement rather than overrun the budget.
    if (elapsed() > minutes * 0.85) { out.push(`| … | time budget: ${elapsed().toFixed(0)} of ${minutes} min used | | | |`); break; }
    for (const s of last) {
      if (inBand(s.rate.rate)) continue;
      const g = keys.indexOf(`${s.hi}>${s.lo}`), kn = knob[keys[g]];
      const fit = fitLogistic(points.filter((p) => p.group === g).map((p) => ({ ...p, group: 0 })), 1, { b0: 10, bSd: 6 });
      const x = kn.sign * Math.log(inc(kn.level));
      const nx = x + clamp(fitTarget({ a: fit.a, b: Math.max(fit.b, 3) }, 0, LADDER_TARGET) - x, -0.15, 0.15);
      tuning.aiIncome[kn.level] = r3(clamp(Math.exp(kn.sign * nx), kn.lo, kn.hi));
    }
  }
  out.push('', `Income now: ${incomeLine()}`, '');
  for (const s of last) {
    // Income can only move a level as a whole; one faction's bot falling behind is an AI problem.
    for (const p of s.pairings) if (p.ci[1] < 0.6) design.push(`${p.key}: the higher level wins only ${pct(p.rate)} (CI ${pct(p.ci[0])}–${pct(p.ci[1])}), so this faction's bot plays weaker`);
    if (s.rate.rate < 0.65) { failed.add('bots'); problems.push(`${s.hi} beats ${s.lo} only ${pct(s.rate.rate)} (want ${pct(LADDER_BAND[0])}–${pct(LADDER_BAND[1])})`); }
    else if (!inBand(s.rate.rate)) design.push(`${s.hi} beats ${s.lo} ${pct(s.rate.rate)} (band ${pct(LADDER_BAND[0])}–${pct(LADDER_BAND[1])}; income limits reached or noise)`);
  }
}

/**
 * Stage 4 (measure only): each bot level against human-style strategies (sparring.ts) played by the
 * same level's brain. A bot that loses clearly to one strategy, e.g. pure flyers when it never builds
 * anti-air, is an exploit players will find. No multiplier can fix that, so it fails the check and
 * points at the bot (or the faction) instead.
 */
async function stageStrategies() {
  out.push('## 4 · Bots against human-style strategies (1v1)', '',
    'Each strategy is the same level\'s brain pushed towards one style (shared/src/lab/sparring.ts). The bot should win about half of these games or more; '
    + 'below 40% with the whole 95% CI under 50% it has a blind spot.', '');
  for (const level of strategyLevels) {
    const base = freshSeeds();
    const all = strategyMatrix({ level, partners: SPARRING, seeds: strategySeeds, seedBase: base });
    // The same budget for every strategy, whatever the number of faction pairings.
    const jobs = Object.keys(SPARRING).flatMap((name, k) => sampleJobs(all.filter((j) => j.key[1].startsWith(`${name}:`)), strategySeeds * STRATEGY_GAMES_PER_SEED, base + k));
    const res = await play(`strategies (${level})`, jobs);
    // Per strategy, and per strategist faction (which faction's version of it is the problem).
    const agg = new Map<string, { w: number; n: number; by: Map<string, { w: number; n: number }> }>();
    jobs.forEach((j, i) => {
      const botTeam = j.teams[0][0].tag === 'bot' ? 0 : 1;
      const [name, fp] = j.key[1].split(':');
      const w = res[i].winner === null ? 0.5 : res[i].winner === botTeam ? 1 : 0;
      const a = agg.get(name) ?? { w: 0, n: 0, by: new Map() };
      a.w += w; a.n++;
      const b = a.by.get(fp) ?? { w: 0, n: 0 }; b.w += w; b.n++; a.by.set(fp, b);
      agg.set(name, a);
    });
    out.push(`### ${level}`, '', `| strategy | ${level} wins | 95% CI | ${FACTION_IDS.map((f) => `vs ${f}`).join(' | ')} | games |`, `|---|---|---|${FACTION_IDS.map(() => '---|').join('')}---|`);
    for (const [name, a] of [...agg].sort((x, y) => x[1].w / x[1].n - y[1].w / y[1].n)) {
      const rate = a.w / a.n, ci = wilson(a.w, a.n);
      out.push(`| ${name} | ${pct(rate)} | ${pct(ci[0])}–${pct(ci[1])} | ${FACTION_IDS.map((f) => { const b = a.by.get(f); return b ? pct(b.w / b.n) : '–'; }).join(' | ')} | ${a.n} |`);
      if (rate < 0.4 && ci[1] < 0.5) {
        failed.add('strategies');
        const worst = [...a.by].sort((x, y) => x[1].w / x[1].n - y[1].w / y[1].n)[0];
        problems.push(`${level} bot loses to the "${name}" strategy: wins ${pct(rate)} (CI ${pct(ci[0])}–${pct(ci[1])}), worst against ${worst[0]} ${name} (${pct(worst[1].w / worst[1].n)})`);
      }
    }
    out.push('');
  }
}

// ------------------------------------------------------------------ output

const gameVersion = JSON.parse(readFileSync('package.json', 'utf8')).version as string;

function writeTuning(fm: FactionMeasure | null, revision: number) {
  const units = Object.entries(tuning.units).filter(([, u]) => (u.hp ?? 1) !== 1 || (u.dmg ?? 1) !== 1).sort(([a], [b]) => a.localeCompare(b));
  const body = [
    '// Generated by `npm run balance` (server/scripts/lab/balance.ts). Edit by hand only to reset.',
    `// ${new Date().toISOString().slice(0, 10)} · version ${gameVersion}+${revision}${fm ? ` · faction win rates ${factionLine(fm)}` : ''}`,
    "import type { Tuning } from './types';",
    '',
    'export const TUNING: Tuning = {',
    '  // Balance revision: +1 per balancer run that changed the tuning, never reset (shown as <game version>+N).',
    `  revision: ${revision},`,
    '  factions: {',
    ...FACTION_IDS.map((f) => `    ${f}: { power: ${tuning.factions[f]?.power ?? 1}${tuning.factions[f]?.early && tuning.factions[f]!.early !== 1 ? `, early: ${tuning.factions[f]!.early}` : ''} },`),
    '  },',
    '  units: {',
    ...units.map(([id, u]) => `    ${id}: { hp: ${u.hp ?? 1}, dmg: ${u.dmg ?? 1} },`),
    '  },',
    `  aiIncome: { ${AI_LEVELS.filter((l) => l !== 'hard').map((l) => `${l}: ${tuning.aiIncome[l] ?? (l === 'brutal' ? 1.3 : 1)}`).join(', ')} },`,
    '};',
    '',
  ].join('\n');
  writeFileSync('shared/src/data/tuning.ts', body);
}

const t0 = Date.now();
let fm: FactionMeasure | null = null;
try {
  if (stages.includes('units')) await stageUnits();
  if (stages.includes('factions')) fm = await stageFactions();
  if (stages.includes('bots')) await stageBots();
  if (stages.includes('strategies')) await stageStrategies();
} finally {
  await pool.close();
}

const changed = JSON.stringify(tuning) !== JSON.stringify(startTuning);
// The balance revision counts every written change and never resets (not even with --reset).
const oldRevision = COMMITTED_TUNING.revision ?? 0;
const revision = changed && !dry ? oldRevision + 1 : oldRevision;
tuning.revision = revision;
const head = [
  '# Castle Defense · automatic balance report', '',
  `Version ${gameVersion}+${revision}${revision !== oldRevision ? ` (balance revision ${oldRevision} → ${revision})` : ''}`, '',
  `${new Date().toISOString()} · ${check ? 'check only' : 'tuning run'} · stages ${stages.join(', ')} · ${((Date.now() - t0) / 60000).toFixed(0)} min`, '',
  `- Faction power: ${powerLine()}`,
  `- Bot income: ${incomeLine()}`,
  `- Unit multipliers: ${Object.entries(tuning.units).map(([id, u]) => `${UNITS[id]?.name ?? id} ×${u.hp}/${u.dmg}`).join(', ') || 'none'}`,
  ...(check ? [] : [`- ${changed ? (dry ? 'Changes found (dry run, tuning.ts not written)' : 'shared/src/data/tuning.ts updated') : 'No changes needed'}`]),
  '',
];
// After a check: which stages to re-tune (units feed into factions, so they go together).
const next = [...failed].filter((f) => f !== 'strategies');
if (failed.has('units') && !failed.has('factions')) next.splice(next.indexOf('units') + 1, 0, 'factions');
const aiHint = failed.has('strategies')
  ? ['A bot loses to a single strategy (stage 4): no multiplier fixes that. Teach the bot to counter it (shared/src/ai/ai.ts, e.g. `counterFactor` / `antiAirGap`) or change the faction, then re-check with `npm run balance:check -- --stages strategies`.', '']
  : [];
const nextStep = check
  ? ['## Next step', '', ...(next.length ? ['Re-tune only what failed:', '', '```bash', `npm run balance -- --stages ${next.join(',')}`, '```', ''] : failed.size ? [] : ['Nothing to do: everything checked is within band.', '']), ...aiHint]
  : aiHint.length ? ['## Next step', '', ...aiHint] : [];
const tail = [
  ...nextStep,
  problems.length ? '## ✗ Out of band' : '## ✓ Factions, bot levels and strategies within band', '', ...problems.map((p) => `- ${p}`), ...(problems.length ? [''] : []),
  ...(design.length ? ['## Needs a design look (knobs can\'t fix these)', '', ...design.map((p) => `- ${p}`), ''] : []),
  ...(fm ? [formatReport(`All line-ups (verification run, ${fm.games} games)`, fm.all, [0.3, 0.7]), ''] : []),
];
const text = [...head, ...out, ...tail].join('\n');
console.log(text);
if (outFile) writeFileSync(outFile, text);
if (!dry && changed) writeTuning(fm, revision);
if (check && failed.size) {
  if (next.length) process.stderr.write(`\nOut of band: npm run balance -- --stages ${next.join(',')}\n`);
  if (failed.has('strategies')) process.stderr.write('\nA bot loses to a single strategy: fix the AI (see the report), then npm run balance:check -- --stages strategies\n');
  process.exit(1);
}
