/**
 * Logistic fit for the automatic balancer: win rate against a knob (faction power, bot income),
 * using every game played so far instead of only the latest batch.
 *
 * Model: logit(rate) = a_g + b · x, one intercept per group g (e.g. per faction) and a shared
 * slope b. The slope has a Gaussian prior (b0 ± bSd) so the first steps, when x has barely moved,
 * behave like a cautious fixed-gain step; as data at different x piles up, the fit takes over.
 */
export interface FitPoint {
  group: number;
  /** Knob value when the games were played (log scale). */
  x: number;
  /** Observed win rate (draws count half). */
  rate: number;
  /** Number of games (may be fractional, e.g. team-share weighted). */
  n: number;
}

export interface Fit { a: number[]; b: number }

const sigmoid = (v: number) => 1 / (1 + Math.exp(-v));
export const logit = (p: number) => Math.log(p / (1 - p));

/** Newton's method on the penalised log-likelihood. */
export function fitLogistic(points: FitPoint[], groups: number, prior: { b0: number; bSd: number; aSd?: number }): Fit {
  const k = groups + 1;
  const theta = new Array<number>(k).fill(0);
  theta[groups] = prior.b0;
  const aVar = (prior.aSd ?? 3) ** 2, bVar = prior.bSd ** 2;
  for (let it = 0; it < 50; it++) {
    const g = new Array<number>(k).fill(0);
    const H = Array.from({ length: k }, () => new Array<number>(k).fill(0));
    for (const p of points) {
      const pr = sigmoid(theta[p.group] + theta[groups] * p.x);
      const w = p.n * pr * (1 - pr), r = p.n * (p.rate - pr);
      g[p.group] += r; g[groups] += r * p.x;
      H[p.group][p.group] -= w; H[p.group][groups] -= w * p.x; H[groups][p.group] -= w * p.x; H[groups][groups] -= w * p.x * p.x;
    }
    for (let i = 0; i < groups; i++) { g[i] -= theta[i] / aVar; H[i][i] -= 1 / aVar; }
    g[groups] -= (theta[groups] - prior.b0) / bVar; H[groups][groups] -= 1 / bVar;
    const step = solve(H, g.map((v) => -v));
    let max = 0;
    for (let i = 0; i < k; i++) { theta[i] += step[i]; max = Math.max(max, Math.abs(step[i])); }
    if (max < 1e-9) break;
  }
  return { a: theta.slice(0, groups), b: theta[groups] };
}

/**
 * The balancer's faction-power fit: a shared slope with prior 12 ± 8 (measured with a dozen
 * factions: −7% power took Sunspire from ~71% to ~58%, about 10 per unit of log power). A flat,
 * inverted or exploding fitted slope is noise (many factions, small power changes, few games
 * each): its intercepts would point the wrong way (a losing faction weakened further) or freeze
 * every faction at its starting power, so the fit is redone with the slope held at 12.
 */
export const FIT_SLOPE = 12;
export function fitPower(points: FitPoint[], groups: number): Fit {
  const fit = fitLogistic(points, groups, { b0: FIT_SLOPE, bSd: 8 });
  return fit.b >= 5 && fit.b <= 40 ? fit : fitLogistic(points, groups, { b0: FIT_SLOPE, bSd: 0.5 });
}

/** Knob value at which `group` is predicted to win `target`. */
export function fitTarget(fit: Fit, group: number, target: number): number {
  return (logit(target) - fit.a[group]) / fit.b;
}

/** Gaussian elimination with partial pivoting (tiny systems only). */
function solve(A: number[][], y: number[]): number[] {
  const n = y.length;
  const M = A.map((row, i) => [...row, y[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let j = c; j <= n; j++) M[r][j] -= f * M[c][j];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let j = r + 1; j < n; j++) s -= M[r][j] * x[j];
    x[r] = s / M[r][r];
  }
  return x;
}
