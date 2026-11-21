/**
 * A small multilayer perceptron (ReLU hidden layers, sigmoid or softmax output) with Adam, in plain
 * TypeScript. Big enough for the bots' value and policy models (a few thousand weights), small
 * enough to train in the background without a GPU and to run every decision without a cost.
 */
export interface MlpJson {
  sizes: number[];
  out: 'sigmoid' | 'softmax';
  /** Per layer: weights (rows = outputs) flattened, then biases. */
  w: number[][];
  b: number[][];
}

export class Mlp {
  readonly sizes: number[];
  readonly out: 'sigmoid' | 'softmax';
  w: Float64Array[];
  b: Float64Array[];
  private m: { w: Float64Array[]; b: Float64Array[] };
  private v: { w: Float64Array[]; b: Float64Array[] };
  private t = 0;

  constructor(sizes: number[], out: 'sigmoid' | 'softmax', seed = 1) {
    this.sizes = sizes;
    this.out = out;
    let s = seed >>> 0 || 1;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    this.w = []; this.b = [];
    for (let l = 0; l + 1 < sizes.length; l++) {
      const fanIn = sizes[l], n = sizes[l] * sizes[l + 1];
      const scale = Math.sqrt(2 / fanIn);
      this.w.push(Float64Array.from({ length: n }, () => (rnd() * 2 - 1) * scale));
      this.b.push(new Float64Array(sizes[l + 1]));
    }
    const zeros = () => ({ w: this.w.map((a) => new Float64Array(a.length)), b: this.b.map((a) => new Float64Array(a.length)) });
    this.m = zeros(); this.v = zeros();
  }

  static fromJSON(j: MlpJson): Mlp {
    const n = new Mlp(j.sizes, j.out);
    n.w = j.w.map((a) => Float64Array.from(a));
    n.b = j.b.map((a) => Float64Array.from(a));
    return n;
  }

  toJSON(): MlpJson {
    const r = (a: Float64Array) => Array.from(a, (x) => Math.round(x * 1e5) / 1e5);
    return { sizes: this.sizes, out: this.out, w: this.w.map(r), b: this.b.map(r) };
  }

  /** Activations of every layer (input first). */
  private forwardAll(x: ArrayLike<number>): Float64Array[] {
    const acts = [Float64Array.from(x)];
    for (let l = 0; l < this.w.length; l++) {
      const a = acts[l], nIn = this.sizes[l], nOut = this.sizes[l + 1], W = this.w[l], B = this.b[l];
      const z = new Float64Array(nOut);
      for (let o = 0; o < nOut; o++) {
        let sum = B[o];
        for (let i = 0; i < nIn; i++) sum += W[o * nIn + i] * a[i];
        z[o] = l + 1 < this.w.length ? Math.max(0, sum) : sum;
      }
      acts.push(z);
    }
    const last = acts[acts.length - 1];
    if (this.out === 'sigmoid') for (let i = 0; i < last.length; i++) last[i] = 1 / (1 + Math.exp(-last[i]));
    else {
      const mx = Math.max(...last);
      let sum = 0;
      for (let i = 0; i < last.length; i++) { last[i] = Math.exp(last[i] - mx); sum += last[i]; }
      for (let i = 0; i < last.length; i++) last[i] /= sum;
    }
    return acts;
  }

  predict(x: ArrayLike<number>): Float64Array {
    return this.forwardAll(x).at(-1)!;
  }

  /**
   * One Adam step on a mini-batch. Targets: for sigmoid a value in [0, 1] per output, for softmax
   * the class index. Returns the batch's mean cross-entropy loss.
   */
  trainBatch(xs: ArrayLike<number>[], ys: number[], weights?: number[], lr = 0.003): number {
    const gw = this.w.map((a) => new Float64Array(a.length)), gb = this.b.map((a) => new Float64Array(a.length));
    let loss = 0, wsum = 0;
    for (let k = 0; k < xs.length; k++) {
      const sw = weights?.[k] ?? 1;
      wsum += sw;
      const acts = this.forwardAll(xs[k]);
      const outA = acts[acts.length - 1];
      // dL/dz at the output for cross-entropy with sigmoid / softmax.
      let delta = new Float64Array(outA.length);
      if (this.out === 'sigmoid') {
        const y = ys[k], p = Math.min(1 - 1e-7, Math.max(1e-7, outA[0]));
        loss -= sw * (y * Math.log(p) + (1 - y) * Math.log(1 - p));
        delta[0] = (outA[0] - y) * sw;
      } else {
        const c = ys[k];
        loss -= sw * Math.log(Math.max(1e-7, outA[c]));
        for (let i = 0; i < outA.length; i++) delta[i] = (outA[i] - (i === c ? 1 : 0)) * sw;
      }
      for (let l = this.w.length - 1; l >= 0; l--) {
        const a = acts[l], nIn = this.sizes[l], nOut = this.sizes[l + 1], W = this.w[l];
        const prev = new Float64Array(nIn);
        for (let o = 0; o < nOut; o++) {
          const d = delta[o];
          if (d === 0) continue;
          gb[l][o] += d;
          for (let i = 0; i < nIn; i++) { gw[l][o * nIn + i] += d * a[i]; prev[i] += d * W[o * nIn + i]; }
        }
        if (l > 0) for (let i = 0; i < nIn; i++) if (a[i] <= 0) prev[i] = 0; // ReLU
        delta = prev;
      }
    }
    // Adam.
    this.t++;
    const b1 = 0.9, b2 = 0.999, eps = 1e-8, c1 = 1 - b1 ** this.t, c2 = 1 - b2 ** this.t;
    const upd = (p: Float64Array, g: Float64Array, m: Float64Array, v: Float64Array) => {
      for (let i = 0; i < p.length; i++) {
        const gi = g[i] / Math.max(1e-9, wsum) + (p.length > 1 ? 1e-5 * p[i] : 0);
        m[i] = b1 * m[i] + (1 - b1) * gi;
        v[i] = b2 * v[i] + (1 - b2) * gi * gi;
        p[i] -= (lr * (m[i] / c1)) / (Math.sqrt(v[i] / c2) + eps);
      }
    };
    for (let l = 0; l < this.w.length; l++) { upd(this.w[l], gw[l], this.m.w[l], this.v.w[l]); upd(this.b[l], gb[l], this.m.b[l], this.v.b[l]); }
    return loss / Math.max(1e-9, wsum);
  }

  /** Mean cross-entropy on a set (validation). */
  loss(xs: ArrayLike<number>[], ys: number[], weights?: number[]): number {
    let loss = 0, wsum = 0;
    for (let k = 0; k < xs.length; k++) {
      const sw = weights?.[k] ?? 1, p = this.predict(xs[k]);
      wsum += sw;
      if (this.out === 'sigmoid') { const q = Math.min(1 - 1e-7, Math.max(1e-7, p[0])); loss -= sw * (ys[k] * Math.log(q) + (1 - ys[k]) * Math.log(1 - q)); }
      else loss -= sw * Math.log(Math.max(1e-7, p[ys[k]]));
    }
    return loss / Math.max(1e-9, wsum);
  }
}
