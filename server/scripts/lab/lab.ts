/**
 * Simulation lab CLI — balance and AI quality checks on the real simulation.
 *
 *   npm run lab -- factions [--level hard] [--sizes 1,2] [--seeds 4] [--band 0.35,0.65] [--profile '{"place":"back"}']
 *       Every faction line-up against every other (1v1, 2v2 with mixed teams, …), both sides.
 *   npm run lab -- ladder [--seeds 3]
 *       Difficulty ladder: hard > normal > easy for every faction pairing.
 *   npm run lab -- duels [--budget 400]
 *       Building duels per tier (equal gold, no AI): raw unit value across factions.
 *   npm run lab -- arena --b '{"think":5}' [--a '{}'] [--level hard] [--seeds 6]
 *       AI variant B against variant A (profile overrides as JSON), all faction pairings.
 *   npm run lab -- tune --variants '[{"think":5},{"safeSpots":true}]' [--level hard] [--seeds 4]
 *       Score several profile variants against the unmodified level (B-win rate each).
 *   npm run lab -- sparring [--level hard] [--seeds 3] [--min 0.55]
 *       The level against every sparring partner (human-style strategies, see shared/src/lab/sparring.ts).
 *   npm run lab -- search [--level hard] [--n 16] [--seeds 3] [--verify 8] [--space '{"think":[3,5,10]}']
 *       Random search over profile parameters against the plain level; the best few are
 *       re-checked on fresh seeds. Prints a ready-to-paste profile.
 *   npm run lab -- all [--seeds 3]
 *       factions + ladder + duels; writes lab-report.md. Exit code 1 if anything is out of band.
 *
 * Every command accepts --patch '{"<building or unit id>.<field path>": value, …}' to try balance
 * changes without editing the faction files, e.g. --patch '{"tw_burrow.spawn.interval":24}'.
 *
 * Add --strict to exit with code 1 when results fall outside the bands (for CI).
 * LAB_THREADS limits the worker count (default: all cores).
 */
import { writeFileSync } from 'node:fs';
import {
  AI_LEVELS, BUILDINGS, SPARRING, FACTION_IDS, duelJobs, factionMatrix, formatReport, ladderMatrix, summarize, summarizeLadder, wilson,
  type AiLevel, type FactionId, type LabMatch, type MatrixJob, type Profile,
} from '@bc/shared';
import { LabPool, progress } from './pool';

const argv = process.argv.slice(2);
const cmd = argv[0] ?? 'all';
const arg = (name: string, def: string) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : def; };
const flag = (name: string) => argv.includes(`--${name}`);
const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

// --patch '{"tw_burrow.spawn.interval":24,"tw_spider.hp":90}': what-if changes to building / unit data.
const patch = JSON.parse(arg('patch', '{}')) as Record<string, unknown>;
const pool = new LabPool(undefined, patch);
const problems: string[] = [];
const out: string[] = [`# Castle Defense balance report`, '', `${new Date().toISOString()} · factions: ${FACTION_IDS.join(', ')}${Object.keys(patch).length ? ` · patch ${JSON.stringify(patch)}` : ''}`, ''];

async function runJobs(label: string, jobs: MatrixJob[]) {
  pool.done = 0; pool.total = 0;
  pool.onProgress = progress(label);
  return Promise.all(jobs.map((j) => pool.match(j)));
}

async function factions() {
  const level = arg('level', 'hard') as AiLevel;
  const sizes = arg('sizes', '1,2').split(',').map(Number);
  const band = arg('band', '0.35,0.65').split(',').map(Number) as [number, number];
  const jobs = factionMatrix({ sizes, level, seeds: Number(arg('seeds', '4')), profile: JSON.parse(arg('profile', '{}')) });
  const report = summarize(jobs, await runJobs(`factions (${level})`, jobs));
  out.push(formatReport(`Faction matrix — ${level} bots, team sizes ${sizes.join('/')}`, report, band), '');
  for (const p of report.pairings) {
    if (p.a !== p.b && (p.rate < band[0] || p.rate > band[1])) problems.push(`${p.a} vs ${p.b}: ${pct(p.rate)} (band ${pct(band[0])}–${pct(band[1])})`);
  }
  for (const [f, v] of Object.entries(report.factions)) {
    if (v.rate < band[0] + 0.05 || v.rate > band[1] - 0.05) problems.push(`faction ${f} overall ${pct(v.rate)}`);
  }
}

async function ladder() {
  const seeds = Number(arg('seeds', '3'));
  const min = Number(arg('min', '0.7'));
  out.push('## Difficulty ladder', '', '| Higher | Lower | higher wins | 95% CI | games |', '|---|---|---|---|---|');
  for (let i = AI_LEVELS.length - 1; i > 0; i--) {
    for (let j = i - 1; j >= 0; j--) {
      const hi = AI_LEVELS[i], lo = AI_LEVELS[j];
      const jobs = ladderMatrix({ hi, lo, seeds });
      const s = summarizeLadder(jobs, await runJobs(`ladder ${hi} vs ${lo}`, jobs));
      for (const p of s.pairings) out.push(`| ${p.key.split(' vs ')[0]} | ${p.key.split(' vs ')[1]} | ${pct(p.rate)} | ${pct(p.ci[0])}–${pct(p.ci[1])} | ${p.games} |`);
      out.push(`| **${hi}** | **${lo}** | **${pct(s.total.rate)}** | ${pct(s.total.ci[0])}–${pct(s.total.ci[1])} | ${s.total.games} |`);
      if (s.total.rate < min) problems.push(`${hi} beats ${lo} only ${pct(s.total.rate)} (want ≥ ${pct(min)})`);
      for (const p of s.pairings) if (p.rate < 0.5) problems.push(`${p.key}: higher level wins only ${pct(p.rate)}`);
    }
  }
  out.push('');
}

async function duels() {
  const budget = Number(arg('budget', '400'));
  const jobs = duelJobs(budget);
  pool.done = 0; pool.total = 0; pool.onProgress = progress('duels');
  // Each duel from both sides, two seeds.
  const res = await Promise.all(jobs.map(async (j) => {
    const rs = await Promise.all([pool.duel(j.a, j.b, 7), pool.duel(j.b, j.a, 7), pool.duel(j.a, j.b, 19), pool.duel(j.b, j.a, 19)]);
    return (rs[0].score + (1 - rs[1].score) + rs[2].score + (1 - rs[3].score)) / 4;
  }));
  out.push(`## Building duels (≈${budget} gold per side; elite/special ×2.5)`, '', 'Score of A against B: 100% = A always wins, 50% = even. Rows are A.', '');
  const byTier = new Map<string, Array<{ a: string; b: string; s: number }>>();
  jobs.forEach((j, i) => { const l = byTier.get(j.tier) ?? []; l.push({ a: `${j.a.count}× ${BUILDINGS[j.a.building].name}`, b: `${j.b.count}× ${BUILDINGS[j.b.building].name}`, s: res[i] }); byTier.set(j.tier, l); });
  const avg: Record<string, { s: number; n: number }> = {};
  for (const [tier, list] of byTier) {
    out.push(`### ${tier}`, '', '| A | B | A score |', '|---|---|---|');
    for (const d of list) out.push(`| ${d.a} | ${d.b} | ${pct(d.s)} |`);
    const m = list.reduce((a, d) => a + d.s, 0) / list.length;
    out.push(`| **average** | | **${pct(m)}** |`, '');
    avg[tier] = { s: m, n: list.length };
  }
  // Each building's average across its opponents, to spot outliers.
  const per = new Map<string, { s: number; n: number }>();
  jobs.forEach((j, i) => {
    for (const [id, s] of [[j.a.building, res[i]], [j.b.building, 1 - res[i]]] as Array<[string, number]>) {
      const e = per.get(id) ?? { s: 0, n: 0 }; e.s += s; e.n++; per.set(id, e);
    }
  });
  out.push('### Per building (average score against all same-tier enemy buildings)', '', '| Building | faction | tier score |', '|---|---|---|');
  for (const [id, e] of [...per.entries()].sort((x, y) => y[1].s / y[1].n - x[1].s / x[1].n)) {
    const v = e.s / e.n;
    out.push(`| ${BUILDINGS[id].name} | ${BUILDINGS[id].faction} | ${pct(v)}${v > 0.85 || v < 0.15 ? ' ⚠' : ''} |`);
  }
  out.push('');
}

/** B-win rate of a variant against the plain level, over every faction pairing and both sides. */
async function arenaScore(level: AiLevel, B: Partial<Profile>, seeds: number, seedBase = 9000, A: Partial<Profile> = {}, levelA: AiLevel = level): Promise<{ rate: number; games: number }> {
  const jobs: LabMatch[] = [];
  let n = 0;
  for (const fa of FACTION_IDS) for (const fb of FACTION_IDS) for (let s = 0; s < seeds; s++) for (const swap of [false, true]) {
    const a = { faction: fa as FactionId, level: levelA, profile: A, tag: 'A' }, b = { faction: fb as FactionId, level, profile: B, tag: 'B' };
    jobs.push({ teams: swap ? [[b], [a]] : [[a], [b]], seed: seedBase + n++ * 7919 });
  }
  const res = await Promise.all(jobs.map((j) => pool.match(j)));
  let w = 0;
  jobs.forEach((j, i) => { const bt = j.teams[0][0].tag === 'B' ? 0 : 1; w += res[i].winner === null ? 0.5 : res[i].winner === bt ? 1 : 0; });
  return { rate: w / jobs.length, games: jobs.length };
}

async function tune() {
  const level = arg('level', 'hard') as AiLevel;
  const seeds = Number(arg('seeds', '4'));
  const variants = JSON.parse(arg('variants', '[]')) as Array<Partial<Profile>>;
  pool.done = 0; pool.total = 0; pool.onProgress = progress('tune');
  const scores = await Promise.all(variants.map(async (v) => ({ v, ...(await arenaScore(level, v, seeds)) })));
  out.push(`## Tuning against plain ${level}`, '', '| variant | wins vs plain | 95% CI | games |', '|---|---|---|---|');
  for (const s of scores.sort((a, b) => b.rate - a.rate)) {
    const ci = wilson(s.rate * s.games, s.games);
    out.push(`| \`${JSON.stringify(s.v)}\` | ${pct(s.rate)} | ${pct(ci[0])}–${pct(ci[1])} | ${s.games} |`);
  }
  out.push('');
}

async function sparring() {
  const level = arg('level', 'hard') as AiLevel;
  const seeds = Number(arg('seeds', '3'));
  const min = Number(arg('min', '0.55'));
  pool.done = 0; pool.total = 0; pool.onProgress = progress(`sparring (${level})`);
  // B = sparring partner (hard brain + strategy bias), A = the level under test.
  // Control: the plain hard bot on the same seeds. Identical bots don't score exactly 50% on a
  // finite seed set, so strategies are judged relative to this baseline.
  const entries: Array<[string, Partial<Profile>]> = [['(control: plain hard)', {}], ...Object.entries(SPARRING)];
  const rows = await Promise.all(entries.map(async ([name, p]) => ({ name, ...(await arenaScore('hard', p, seeds, 12000, {}, level)) })));
  const control = 1 - rows[0].rate;
  out.push(`## Sparring: ${level} bot against human-style strategies`, '', `Strategies are the hard brain pushed towards one style (shared/src/lab/sparring.ts). A strategy is flagged when ${level} wins less than ${pct(min)} and clearly less than against the control.`, '', '| strategy | ' + level + ' wins | 95% CI | games |', '|---|---|---|---|');
  let tot = 0;
  for (const r of rows.slice(1).sort((a, b) => b.rate - a.rate).concat(rows[0])) {
    const win = 1 - r.rate, ci = wilson(win * r.games, r.games);
    if (r !== rows[0]) tot += win;
    out.push(`| ${r.name} | ${pct(win)} | ${pct(ci[0])}–${pct(ci[1])} | ${r.games} |`);
    if (r !== rows[0] && win < min && win < control - 0.1) problems.push(`${level} loses to the ${r.name} strategy (${pct(win)} wins, control ${pct(control)})`);
  }
  out.push(`| **all strategies** | **${pct(tot / (rows.length - 1))}** | | |`, '');
}

const SEARCH_SPACE: Record<string, unknown[]> = {
  place: ['castle', 'back', 'front'], think: [3, 5, 10], maxQueue: [2, 3], upgradeAfter: [2, 3, 5, 8], upgradeBias: [0.7, 1, 1.5],
  rangedShare: [0, 0.25, 0.4, 0.6], specialAt: [5, 8, 12], saveForSpecial: [0, 20, 40], rescueAt: [5, 8, 12], counter: [true, false], safeSpots: [true, false],
};

async function search() {
  const level = arg('level', 'hard') as AiLevel;
  const n = Number(arg('n', '16')), seeds = Number(arg('seeds', '3')), verify = Number(arg('verify', '8'));
  const space = { ...SEARCH_SPACE, ...JSON.parse(arg('space', '{}')) } as Record<string, unknown[]>;
  let s = Number(arg('rng', '12345')) >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const cands: Array<Partial<Profile>> = Array.from({ length: n }, () => Object.fromEntries(Object.entries(space).map(([k, vs]) => [k, vs[Math.floor(rnd() * vs.length)]])) as Partial<Profile>);
  pool.done = 0; pool.total = 0; pool.onProgress = progress(`search (${n} candidates)`);
  const first = await Promise.all(cands.map(async (v) => ({ v, ...(await arenaScore(level, v, seeds)) })));
  first.sort((a, b) => b.rate - a.rate);
  pool.done = 0; pool.total = 0; pool.onProgress = progress('verify top 3');
  const top = await Promise.all(first.slice(0, 3).map(async (c) => ({ v: c.v, first: c.rate, ...(await arenaScore(level, c.v, verify, 31000)) })));
  out.push(`## Search against plain ${level}`, '', '| candidate | first pass | verified | 95% CI |', '|---|---|---|---|');
  for (const c of top.sort((a, b) => b.rate - a.rate)) {
    const ci = wilson(c.rate * c.games, c.games);
    out.push(`| \`${JSON.stringify(c.v)}\` | ${pct(c.first)} | ${pct(c.rate)} | ${pct(ci[0])}–${pct(ci[1])} |`);
  }
  out.push('', 'Rest of the first pass:', ...first.slice(3).map((c) => `- ${pct(c.rate)} \`${JSON.stringify(c.v)}\``), '');
}

async function arena() {
  const level = arg('level', 'hard') as AiLevel;
  const A = JSON.parse(arg('a', '{}')) as Partial<Profile>, B = JSON.parse(arg('b', '{}')) as Partial<Profile>;
  const lvB = arg('blevel', level) as AiLevel;
  const seeds = Number(arg('seeds', '6'));
  const jobs: LabMatch[] = [];
  let n = 0;
  for (const fa of FACTION_IDS) for (const fb of FACTION_IDS) for (let s = 0; s < seeds; s++) for (const swap of [false, true]) {
    const a = { faction: fa as FactionId, level, profile: A, tag: 'A' }, b = { faction: fb as FactionId, level: lvB, profile: B, tag: 'B' };
    jobs.push({ teams: swap ? [[b], [a]] : [[a], [b]], seed: 9000 + n++ * 7919 });
  }
  pool.done = 0; pool.total = 0; pool.onProgress = progress('arena');
  const res = await Promise.all(jobs.map((j) => pool.match(j)));
  let bw = 0;
  const per = new Map<string, { w: number; n: number }>();
  jobs.forEach((j, i) => {
    const bTeam = j.teams[0][0].tag === 'B' ? 0 : 1;
    const sc = res[i].winner === null ? 0.5 : res[i].winner === bTeam ? 1 : 0;
    bw += sc;
    const k = `B ${j.teams[bTeam][0].faction} vs A ${j.teams[1 - bTeam][0].faction}`;
    const e = per.get(k) ?? { w: 0, n: 0 }; e.w += sc; e.n++; per.set(k, e);
  });
  const ci = wilson(bw, jobs.length);
  out.push(`## Arena: B ${JSON.stringify(B)} (${lvB}) vs A ${JSON.stringify(A)} (${level})`, '');
  for (const [k, e] of per) out.push(`- ${k}: B wins ${pct(e.w / e.n)} of ${e.n}`);
  out.push(`- **B wins ${pct(bw / jobs.length)}** (CI ${pct(ci[0])}–${pct(ci[1])}) over ${jobs.length} games`, '');
}

try {
  if (cmd === 'factions') await factions();
  else if (cmd === 'ladder') await ladder();
  else if (cmd === 'duels') await duels();
  else if (cmd === 'arena') await arena();
  else if (cmd === 'tune') await tune();
  else if (cmd === 'sparring') await sparring();
  else if (cmd === 'search') await search();
  else if (cmd === 'all') { await factions(); await ladder(); await sparring(); await duels(); }
  else { console.error(`unknown command ${cmd}`); process.exit(2); }
} finally {
  await pool.close();
}
if (problems.length) out.push('## ⚠ Out of band', '', ...problems.map((p) => `- ${p}`), '');
else out.push('## ✓ Everything within band', '');
const text = out.join('\n');
console.log(text);
if (cmd === 'all' || flag('out')) writeFileSync(arg('out', 'lab-report.md'), text);
if (flag('strict') && problems.length) process.exit(1);
