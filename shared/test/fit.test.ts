import { describe, expect, it } from 'vitest';
import { fitLogistic, fitTarget, logit, type FitPoint } from '../src/lab/fit';

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
