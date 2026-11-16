/**
 * Automatic balancer: plays the lab suites, tunes the balance multipliers in
 * shared/src/data/tuning.ts until the factions and bot levels are even, and writes a report.
 *
 *   npm run balance:check               measure only, change nothing; exit 1 if out of band and print the
 *                                       command that re-tunes just the failed stages (run this after a feature)
 *   npm run balance                     tune units, factions and bots; write tuning.ts + docs/balance-report.md
 *   npm run balance -- --quick --dry    smoke test (~5 min), writes nothing
 *
 * Options: --stages units,factions,bots · --sizes 1,2,3,4 · --seeds 4 (per pairing and side, per
 * step) · --pairings 4 (line-up pairings per team size and step) · --iterations 8 · --tolerance 0.03 (faction win rate 50% ± this) · --reset (start
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
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  AI_LEVELS, BUILDINGS, COMMITTED_TUNING, FACTION_IDS, NEUTRAL_TUNING, UNITS, duelJobs, factionMatrix, formatReport, ladderMatrix,
  fitLogistic, fitTarget, summarize, summarizeLadder, tierOf,
  type AiLevel, type FitPoint, type MatrixJob, type MatrixReport, type Rate, type Tuning,
} from '@bc/shared';
import { LabPool, progress } from './pool';

const argv = process.argv.slice(2);
const arg = (name: string, def: string) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : def; };
const flag = (name: string) => argv.includes(`--${name}`);
const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const r3 = (v: number) => Math.round(v * 1000) / 1000;

const quick = flag('quick');
const check = flag('check');
const dry = flag('dry') || check;
const stages = arg('stages', 'units,factions,bots').split(',');
const sizes = arg('sizes', quick ? '1,2' : '1,2,3,4').split(',').map(Number);
const seeds = Number(arg('seeds', quick ? '2' : '4'));
const verifySeeds = Number(arg('verify-seeds', String(Math.round(seeds * 2.5))));
const iterations = Number(arg('iterations', quick ? '3' : '8'));
const tol = Number(arg('tolerance', '0.03'));
const pairingsPerSize = Number(arg('pairings', '4'));
const botSeeds = Number(arg('bot-seeds', quick ? '2' : '6'));
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

async function play(label: string, jobs: MatrixJob[]) {
  pool.tuning = structuredClone(tuning);
  pool.done = 0; pool.total = 0; pool.onProgress = progress(label);
  return Promise.all(jobs.map((j) => pool.match(j)));
}

// ------------------------------------------------------------------ measurements

interface FactionMeasure {
  /** Per faction: non-mirror win rate averaged over team sizes (the tuning target). */
  overall: Record<string, number>;
  bySize: Map<number, MatrixReport>;
  all: MatrixReport;
  games: number;
}

/**
 * Plays the faction matrix. `subset` (a per-iteration seed) plays only `--pairings` line-up pairings
 * per team size, drawn uniformly at random and fresh each iteration, so on average a step measures
 * the same thing as the full grid (which is for verification). Always including pure vs pure
 * over-weighted those line-ups: steps and verifications disagreed by 10–20 points on the 110×40 map.
 */
async function measureFactions(label: string, n: number, opts: { mirrors?: boolean; subset?: number } = {}): Promise<FactionMeasure> {
  const base = freshSeeds();
  let jobs = factionMatrix({ sizes, level: 'hard', seeds: n, seedBase: base }).filter((j) => j.key[0] !== j.key[1]);
  if (opts.subset !== undefined) {
    let r = (opts.subset * 7919 + 17) >>> 0;
    const rnd = () => ((r = (r * 1664525 + 1013904223) >>> 0) / 4294967296);
    const canon = (j: MatrixJob) => [...j.key].sort().join('|');
    const keep = new Set<string>();
    for (const size of sizes) {
      const keys = [...new Set(jobs.filter((j) => j.teams[0].length === size).map(canon))];
      for (let i = keys.length - 1; i > 0; i--) { const t = Math.floor(rnd() * (i + 1)); [keys[i], keys[t]] = [keys[t], keys[i]]; }
      for (const k of keys.slice(0, pairingsPerSize)) keep.add(k);
    }
    jobs = jobs.filter((j) => keep.has(canon(j)));
  }
  // Mirror matches only feed the side check, so fewer of them are enough.
  if (opts.mirrors) jobs.push(...factionMatrix({ sizes, level: 'hard', seeds: Math.max(2, Math.ceil(n / 3)), seedBase: base + 500_000 }).filter((j) => j.key[0] === j.key[1]));
  const res = await play(label, jobs);
  const bySize = new Map<number, MatrixReport>();
  for (const size of sizes) {
    const idx = jobs.map((j, i) => (j.teams[0].length === size ? i : -1)).filter((i) => i >= 0);
    bySize.set(size, summarize(idx.map((i) => jobs[i]), idx.map((i) => res[i])));
  }
  const overall: Record<string, number> = {};
  for (const f of FACTION_IDS) {
    const rates = [...bySize.values()].map((r) => r.factions[f]?.rate).filter((v): v is number => v !== undefined);
    overall[f] = rates.reduce((a, b) => a + b, 0) / Math.max(1, rates.length);
  }
  return { overall, bySize, all: summarize(jobs, res), games: jobs.length };
}

async function measureLadder(label: string, n: number) {
  const steps: Array<{ hi: AiLevel; lo: AiLevel; rate: Rate; pairings: Array<{ key: string } & Rate> }> = [];
  for (let i = AI_LEVELS.length - 1; i > 0; i--) {
    const hi = AI_LEVELS[i], lo = AI_LEVELS[i - 1];
    const jobs = ladderMatrix({ hi, lo, seeds: n, seedBase: freshSeeds() });
    const sum = summarizeLadder(jobs, await play(`${label} ${hi}>${lo}`, jobs));
    steps.push({ hi, lo, rate: sum.total, pairings: sum.pairings });
  }
  return steps;
}

async function measureDuels() {
  const jobs = duelJobs(400);
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
const powerLine = () => FACTION_IDS.map((f) => `${f} ${(tuning.factions[f]?.power ?? 1).toFixed(3)}`).join(' · ');
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
    return !!u && tierOf(b) !== 'special' && !u.heal && !u.structuresOnly && !u.aura;
  };
  for (let k = 1; k <= (quick ? 2 : 4); k++) {
    const scores = await measureDuels();
    const outliers = [...scores].filter(([id, s]) => (s < 0.25 || s > 0.75) && eligible(id));
    const skipped = [...scores].filter(([id, s]) => (s < 0.25 || s > 0.75) && !eligible(id));
    if (k === 1) for (const [id, s] of skipped) design.push(`${BUILDINGS[id].name} scores ${pct(s)} in duels but isn't auto-tuned (support/siege/champion unit)`);
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
  const setPower = () => {
    const mean = FACTION_IDS.reduce((a, f) => a + lp[f], 0) / FACTION_IDS.length;
    for (const f of FACTION_IDS) { lp[f] -= mean; tuning.factions[f] = { power: r3(Math.exp(lp[f])) }; }
  };
  // Every measurement so far feeds a logistic fit of win rate against power (shared/src/lab/fit.ts);
  // each step jumps to the fit's 50% point (at most ±6% power per step).
  const points: FitPoint[] = [];
  const record = (m: FactionMeasure) => FACTION_IDS.forEach((f, g) => {
    const n = m.all.factions[f]?.games ?? 0;
    if (n) points.push({ group: g, x: lp[f], rate: clamp(m.overall[f], 0.02, 0.98), n });
  });
  const step = () => {
    const fit = fitLogistic(points, FACTION_IDS.length, { b0: 30, bSd: 15 });
    const b = Math.max(fit.b, 8); // never trust a flat or inverted slope
    const before = { ...lp };
    FACTION_IDS.forEach((f, g) => { lp[f] += clamp(-fit.a[g] / b - lp[f], -0.06, 0.06); });
    setPower();
    return { b, moved: Math.max(...FACTION_IDS.map((f) => Math.abs(lp[f] - before[f]))) };
  };
  const ok = (m: FactionMeasure) => FACTION_IDS.every((f) => Math.abs(m.overall[f] - 0.5) <= tol);
  // The verification passes when every faction is within tolerance or statistically
  // indistinguishable from 50% (its 95% CI holds 50%), but never beyond ±5%.
  const verifiedOk = (m: FactionMeasure) => FACTION_IDS.every((f) => {
    const dev = Math.abs(m.overall[f] - 0.5), ci = m.all.factions[f]?.ci ?? [0, 1];
    return dev <= tol || (dev <= 0.05 && ci[0] <= 0.5 && ci[1] >= 0.5);
  });
  out.push(`Tuning steps play a sample of ${pairingsPerSize} line-up pairings per team size (drawn at random); verification plays the full grid.`, '');
  out.push('| Step | power | win rate | games | fitted slope |', '|---|---|---|---|---|');
  let verified: FactionMeasure | null = null;
  for (let k = 1; k <= iterations && !check; k++) {
    const m = await measureFactions(`factions #${k}`, seeds, { subset: k });
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
    if (verifyNow) {
      const v = await measureFactions(`verify #${k}`, verifySeeds, { mirrors: true });
      record(v);
      out.push(`| ${k} ✓ verify | ${powerLine()} | ${factionLine(v)} | ${v.games} | |`);
      process.stderr.write(`  verify → ${factionLine(v)}\n`);
      if (verifiedOk(v)) { verified = v; break; }
      step();
    }
  }
  if (!verified) {
    verified = await measureFactions('factions verify', verifySeeds, { mirrors: true });
    if (!check) out.push(`| final | ${powerLine()} | ${factionLine(verified)} | ${verified.games} | |`);
  }
  out.push('', `Power now: ${powerLine()}`, '', '### Faction win rate per team size (verification run)', '', sizeTable(verified), '');
  for (const f of FACTION_IDS) {
    if (Math.abs(verified.overall[f] - 0.5) > Math.max(tol, 0.05)) { failed.add('factions'); problems.push(`faction ${f} wins ${pct(verified.overall[f])} overall (want 50% ± ${pct(Math.max(tol, 0.05))})`); }
    for (const [size, r] of verified.bySize) {
      const v = r.factions[f];
      if (v && (v.ci[1] < 0.4 || v.ci[0] > 0.6)) design.push(`${f} wins ${pct(v.rate)} at ${size}v${size} (CI ${pct(v.ci[0])}–${pct(v.ci[1])}): size-dependent, a single power knob can't fix it`);
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
  const maxIt = check ? 1 : iterations;
  for (let k = 1; k <= maxIt; k++) {
    const final = k === maxIt;
    last = await measureLadder(`ladder #${k}`, botSeeds * (final ? 2 : 1));
    out.push(`| ${k} | ${incomeLine()} | ${last.map((s) => `${pct(s.rate.rate)}`).join(' | ')} |`);
    process.stderr.write(`  income ${incomeLine()} → ${last.map((s) => `${s.hi}>${s.lo} ${pct(s.rate.rate)}`).join(' · ')}\n`);
    for (const s of last) {
      const g = keys.indexOf(`${s.hi}>${s.lo}`), kn = knob[keys[g]];
      points.push({ group: g, x: kn.sign * Math.log(inc(kn.level)), rate: clamp(s.rate.rate, 0.02, 0.98), n: s.rate.games });
    }
    if (last.every((s) => inBand(s.rate.rate)) || final) break;
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
    '  // Balance revision: +1 per balancer run that changed the tuning, never reset (version 0.20.0+N).',
    `  revision: ${revision},`,
    '  factions: {',
    ...FACTION_IDS.map((f) => `    ${f}: { power: ${tuning.factions[f]?.power ?? 1} },`),
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
const next = [...failed];
if (failed.has('units') && !failed.has('factions')) next.splice(next.indexOf('units') + 1, 0, 'factions');
const nextStep = check
  ? (next.length ? ['## Next step', '', 'Re-tune only what failed:', '', '```bash', `npm run balance -- --stages ${next.join(',')}`, '```', ''] : ['## Next step', '', 'Nothing to do: everything checked is within band.', ''])
  : [];
const tail = [
  ...nextStep,
  problems.length ? '## ✗ Out of band' : '## ✓ Factions and bot levels within band', '', ...problems.map((p) => `- ${p}`), ...(problems.length ? [''] : []),
  ...(design.length ? ['## Needs a design look (knobs can\'t fix these)', '', ...design.map((p) => `- ${p}`), ''] : []),
  ...(fm ? [formatReport(`All line-ups (verification run, ${fm.games} games)`, fm.all, [0.3, 0.7]), ''] : []),
];
const text = [...head, ...out, ...tail].join('\n');
console.log(text);
if (outFile) writeFileSync(outFile, text);
if (!dry && changed) writeTuning(fm, revision);
if (check && failed.size) { process.stderr.write(`\nOut of band: npm run balance -- --stages ${next.join(',')}\n`); process.exit(1); }
