/**
 * Balance matrices: which matches to play and how to read the results.
 * Everything is derived from FACTION_IDS, so a new faction is covered automatically.
 */
import type { AiLevel, Profile } from '../ai/ai';
import { FACTION_IDS, type FactionId } from '../data';
import type { LabMatch, LabPlayer, LabResult } from './match';

/** All team line-ups of `size` players (combinations with repetition), e.g. [iv,iv], [iv,tw], [tw,tw]. */
export function compositions(size: number, factions: readonly FactionId[] = FACTION_IDS): FactionId[][] {
  const out: FactionId[][] = [];
  const rec = (start: number, acc: FactionId[]) => {
    if (acc.length === size) { out.push(acc); return; }
    for (let i = start; i < factions.length; i++) rec(i, [...acc, factions[i]]);
  };
  rec(0, []);
  return out;
}

export const compKey = (c: readonly FactionId[]) => c.join('+');

export interface MatrixJob extends LabMatch {
  /** Line-up keys of team 0 and team 1. */
  key: [string, string];
}

/**
 * Every pairing of line-ups (each unordered pair once, mirrors included), played from both
 * sides of the map with `seeds` different seeds. All players use `level`.
 */
export function factionMatrix(opts: { sizes: number[]; level: AiLevel; seeds: number; factions?: readonly FactionId[]; maxMinutes?: number; seedBase?: number; profile?: Partial<Profile> }): MatrixJob[] {
  const jobs: MatrixJob[] = [];
  let n = 0;
  for (const size of opts.sizes) {
    const comps = compositions(size, opts.factions);
    for (let i = 0; i < comps.length; i++) {
      for (let j = i; j < comps.length; j++) {
        for (let s = 0; s < opts.seeds; s++) {
          for (const swap of [false, true]) {
            const [a, b] = swap ? [comps[j], comps[i]] : [comps[i], comps[j]];
            const team = (c: FactionId[]): LabPlayer[] => c.map((faction) => ({ faction, level: opts.level, profile: opts.profile }));
            jobs.push({ teams: [team(a), team(b)], seed: (opts.seedBase ?? 1000) + n++ * 7919 + s, key: [compKey(a), compKey(b)], maxMinutes: opts.maxMinutes });
          }
        }
      }
    }
  }
  return jobs;
}

/** Difficulty ladder: `hi` vs `lo` for every faction pairing, both sides. */
export function ladderMatrix(opts: { hi: AiLevel; lo: AiLevel; seeds: number; factions?: readonly FactionId[]; maxMinutes?: number; seedBase?: number }): MatrixJob[] {
  const fs = opts.factions ?? FACTION_IDS;
  const jobs: MatrixJob[] = [];
  let n = 0;
  for (const fh of fs) for (const fl of fs) for (let s = 0; s < opts.seeds; s++) for (const swap of [false, true]) {
    const hi: LabPlayer = { faction: fh, level: opts.hi, tag: 'hi' }, lo: LabPlayer = { faction: fl, level: opts.lo, tag: 'lo' };
    jobs.push({ teams: swap ? [[lo], [hi]] : [[hi], [lo]], seed: (opts.seedBase ?? 5000) + n++ * 7919 + s, key: [`${opts.hi}:${fh}`, `${opts.lo}:${fl}`], maxMinutes: opts.maxMinutes });
  }
  return jobs;
}

// ---------------------------------------------------------------- statistics

/** 95% Wilson score interval of a win rate. */
export function wilson(wins: number, n: number): [number, number] {
  if (!n) return [0, 1];
  const z = 1.96, p = wins / n;
  const d = 1 + z * z / n;
  const c = (p + z * z / (2 * n)) / d;
  const h = (z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}

export interface Rate { wins: number; games: number; rate: number; ci: [number, number] }
const rate = (wins: number, games: number): Rate => ({ wins, games, rate: games ? wins / games : 0, ci: wilson(wins, games) });

export interface MatrixReport {
  /** Win rate of line-up A against line-up B (draws count half). */
  pairings: Array<{ a: string; b: string } & Rate & { minutes: number }>;
  /** Per faction: share of games won by teams containing it, weighted by its share of the team (mirrors excluded). */
  factions: Record<string, Rate>;
  /** Left side (team 0) win rate: map asymmetry check. */
  side: Rate;
  draws: number;
  avgMinutes: number;
}

export function summarize(jobs: MatrixJob[], results: LabResult[]): MatrixReport {
  const pair = new Map<string, { a: string; b: string; w: number; n: number; min: number }>();
  const fac: Record<string, { w: number; n: number }> = {};
  let side = 0, decided = 0, draws = 0, minutes = 0;
  jobs.forEach((job, i) => {
    const r = results[i];
    minutes += r.minutes;
    const score0 = r.winner === null ? 0.5 : r.winner === 0 ? 1 : 0;
    if (r.winner === null) draws++; else { decided++; if (r.winner === 0) side++; }
    // Pairing keyed in a canonical order.
    const [k0, k1] = job.key;
    const flip = k0 > k1;
    const a = flip ? k1 : k0, b = flip ? k0 : k1;
    const e = pair.get(`${a}|${b}`) ?? { a, b, w: 0, n: 0, min: 0 };
    e.w += flip ? 1 - score0 : score0; e.n++; e.min += r.minutes;
    pair.set(`${a}|${b}`, e);
    if (k0 === k1) return; // mirrors say nothing about faction strength
    for (const team of [0, 1] as const) {
      const comp = job.teams[team];
      const score = team === 0 ? score0 : 1 - score0;
      for (const p of comp) {
        const f = (fac[p.faction] ??= { w: 0, n: 0 });
        f.w += score / comp.length; f.n += 1 / comp.length;
      }
    }
  });
  return {
    pairings: [...pair.values()].map((e) => ({ a: e.a, b: e.b, ...rate(e.w, e.n), minutes: e.min / e.n })),
    factions: Object.fromEntries(Object.entries(fac).map(([k, v]) => [k, rate(v.w, v.n)])),
    side: rate(side, decided),
    draws,
    avgMinutes: results.length ? minutes / results.length : 0,
  };
}

const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

/** Human-readable report (Markdown). Pairings outside [lo, hi] are flagged. */
export function formatReport(title: string, r: MatrixReport, band: [number, number] = [0.35, 0.65]): string {
  const lines = [`## ${title}`, '', '| Line-up A | Line-up B | A wins | 95% CI | games | avg min | |', '|---|---|---|---|---|---|---|'];
  for (const p of r.pairings.sort((x, y) => x.a.localeCompare(y.a) || x.b.localeCompare(y.b))) {
    const mirror = p.a === p.b;
    const flag = !mirror && (p.rate < band[0] || p.rate > band[1]) ? '⚠' : '';
    lines.push(`| ${p.a} | ${p.b} | ${pct(p.rate)} | ${pct(p.ci[0])}–${pct(p.ci[1])} | ${p.games} | ${p.minutes.toFixed(1)} | ${mirror ? 'mirror' : flag} |`);
  }
  lines.push('', '| Faction | win rate (non-mirror) | 95% CI | weighted games |', '|---|---|---|---|');
  for (const [f, v] of Object.entries(r.factions)) lines.push(`| ${f} | ${pct(v.rate)} | ${pct(v.ci[0])}–${pct(v.ci[1])} | ${v.games.toFixed(1)} |`);
  lines.push('', `Left side wins ${pct(r.side.rate)} (CI ${pct(r.side.ci[0])}–${pct(r.side.ci[1])}) · draws ${r.draws} · avg ${r.avgMinutes.toFixed(1)} min`);
  return lines.join('\n');
}

/** Ladder summary: how often the higher level wins, per faction pairing. */
export function summarizeLadder(jobs: MatrixJob[], results: LabResult[]) {
  const m = new Map<string, { w: number; n: number }>();
  let tw = 0, tn = 0;
  jobs.forEach((job, i) => {
    const r = results[i];
    const hiTeam = job.teams[0][0].tag === 'hi' ? 0 : 1;
    const score = r.winner === null ? 0.5 : r.winner === hiTeam ? 1 : 0;
    const k = `${job.key[0]} vs ${job.key[1]}`;
    const e = m.get(k) ?? { w: 0, n: 0 };
    e.w += score; e.n++; m.set(k, e);
    tw += score; tn++;
  });
  return { pairings: [...m.entries()].map(([k, v]) => ({ key: k, ...rate(v.w, v.n) })), total: rate(tw, tn) };
}
