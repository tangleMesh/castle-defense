import { describe, expect, it } from 'vitest';
import { fitLogistic, fitPower, fitTarget, logit, type FitPoint } from '../src/lab/fit';

describe('balancer logistic fit', () => {
  it('recovers intercepts and slope from plenty of data', () => {
    // True model: logit = 0.4 + 20x (group 0), -0.4 + 20x (group 1).
    const pts: FitPoint[] = [];
    for (const x of [-0.05, -0.02, 0, 0.02, 0.05]) for (const [g, a] of [[0, 0.4], [1, -0.4]]) {
      pts.push({ group: g, x, rate: 1 / (1 + Math.exp(-(a + 20 * x))), n: 5000 });
    }
    const f = fitLogistic(pts, 2, { b0: 5, bSd: 50 });
    expect(f.b).toBeCloseTo(20, 0);
    expect(f.a[0]).toBeCloseTo(0.4, 1);
    expect(fitTarget(f, 0, 0.5)).toBeCloseTo(-0.02, 2);
  });

  it('leans on the prior slope while the knob has barely moved', () => {
    const f = fitLogistic([{ group: 0, x: 0, rate: 0.6, n: 200 }], 1, { b0: 30, bSd: 15 });
    expect(f.b).toBeCloseTo(30, 0);
    expect(f.a[0]).toBeCloseTo(logit(0.6), 1);
    expect(fitTarget(f, 0, 0.5)).toBeCloseTo(-logit(0.6) / 30, 2);
  });
});

describe('fitPower', () => {
  it('never weakens a faction that keeps losing, even when noise inverts the slope', () => {
    // Four factions; group 2 loses at every power it was tried with, group 1 wins; the noise is
    // such that a free fit finds a negative slope.
    const pts: FitPoint[] = [
      { group: 0, x: 0, rate: 0.58, n: 60 }, { group: 1, x: 0, rate: 0.79, n: 60 }, { group: 2, x: 0, rate: 0.26, n: 60 }, { group: 3, x: 0, rate: 0.37, n: 60 },
      { group: 0, x: -0.03, rate: 0.61, n: 60 }, { group: 1, x: -0.04, rate: 0.56, n: 60 }, { group: 2, x: 0.05, rate: 0.22, n: 60 }, { group: 3, x: 0.02, rate: 0.6, n: 60 },
      { group: 0, x: -0.05, rate: 0.54, n: 60 }, { group: 1, x: -0.08, rate: 0.49, n: 60 }, { group: 2, x: 0.11, rate: 0.42, n: 60 }, { group: 3, x: 0.02, rate: 0.56, n: 60 },
      { group: 0, x: 0.01, rate: 0.6, n: 60 }, { group: 1, x: -0.02, rate: 0.58, n: 60 }, { group: 2, x: 0.05, rate: 0.33, n: 60 }, { group: 3, x: -0.04, rate: 0.46, n: 60 },
      { group: 0, x: 0.04, rate: 0.64, n: 60 }, { group: 1, x: 0.01, rate: 0.49, n: 60 }, { group: 2, x: -0.05, rate: 0.34, n: 60 }, { group: 3, x: -0.01, rate: 0.56, n: 60 },
    ];
    const f = fitPower(pts, 4);
    expect(f.b).toBeGreaterThan(4);
    // The loser's target power lies above where it was last measured, the winner's below.
    expect(-f.a[2] / f.b).toBeGreaterThan(-0.05);
    expect(-f.a[1] / f.b).toBeLessThan(0.01);
  });

  it('holds the slope when barely moved knobs make it explode', () => {
    // Twelve factions whose power hardly changed between two samples: a free fit can find a huge
    // slope, which would put every faction's target right at its last power.
    const pts: FitPoint[] = [];
    for (let g = 0; g < 12; g++) for (const [x, d] of [[0, 0], [0.002, 0.05]]) pts.push({ group: g, x: x * (g % 2 ? 1 : -1), rate: 0.3 + g * 0.04 + d * (g % 2 ? 1 : -1), n: 40 });
    const f = fitPower(pts, 12);
    expect(f.b).toBeLessThanOrEqual(40);
    // The strongest faction (group 11, ~74%) is pushed well down.
    expect(-f.a[11] / f.b).toBeLessThan(-0.03);
  });
});
