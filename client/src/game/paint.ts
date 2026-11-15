/**
 * Canvas 2D painting toolkit for the procedural art: deterministic noise, colour helpers and
 * canvases that work in logical pixels while rasterising at a chosen resolution.
 */

export type Ctx = CanvasRenderingContext2D;

/** Small deterministic PRNG. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function hash2(x: number, y: number, seed = 0): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Value noise in [0, 1]; `period` makes it tile (in lattice units). */
export function noise(x: number, y: number, seed = 0, period = 0): number {
  const ix = Math.floor(x), iy = Math.floor(y), fx = smooth(x - ix), fy = smooth(y - iy);
  const w = (v: number) => (period ? ((v % period) + period) % period : v);
  const a = hash2(w(ix), w(iy), seed), b = hash2(w(ix + 1), w(iy), seed);
  const c = hash2(w(ix), w(iy + 1), seed), d = hash2(w(ix + 1), w(iy + 1), seed);
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}

/** Fractal noise in [0, 1]. */
export function fbm(x: number, y: number, seed = 0, octaves = 4, period = 0): number {
  let v = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    v += amp * noise(x * f, y * f, seed + i * 31, period ? period * f : 0);
    norm += amp; amp *= 0.5; f *= 2;
  }
  return v / norm;
}

// ------------------------------------------------------------------ colour

export type RGB = [number, number, number];

export const rgb = (c: number): RGB => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
export const hex = ([r, g, b]: RGB): number => (clamp255(r) << 16) | (clamp255(g) << 8) | clamp255(b);
const clamp255 = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

export function css(c: number, a = 1): string {
  const [r, g, b] = rgb(c);
  return a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`;
}

export function shade(c: number, f: number): number {
  const [r, g, b] = rgb(c);
  return hex([r * f, g * f, b * f]);
}

export function mix(a: number, b: number, t: number): number {
  const A = rgb(a), B = rgb(b);
  return hex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

/** Warm the lit side, cool the shadow side: painterly shading instead of plain darkening. */
export function lit(c: number, f: number): number {
  if (f >= 1) return mix(shade(c, f), 0xffe8b0, Math.min(0.35, (f - 1) * 0.8));
  return mix(shade(c, f), 0x1a2040, Math.min(0.4, (1 - f) * 0.45));
}

// ------------------------------------------------------------------ canvases

export interface Paper { canvas: HTMLCanvasElement; ctx: Ctx; w: number; h: number; res: number }

/** A canvas of w×h logical px rasterised at `res` device px per logical px. */
export function paper(w: number, h: number, res: number): Paper {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(w * res));
  canvas.height = Math.max(1, Math.ceil(h * res));
  const ctx = canvas.getContext('2d', { willReadFrequently: false })!;
  ctx.scale(res, res);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  return { canvas, ctx, w, h, res };
}

export function path(ctx: Ctx, pts: ReadonlyArray<readonly [number, number]>) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

export function fillPoly(ctx: Ctx, pts: ReadonlyArray<readonly [number, number]>, style: string | CanvasGradient | CanvasPattern) {
  path(ctx, pts);
  ctx.fillStyle = style;
  ctx.fill();
}

/** Linear gradient between two points with colour stops given as [t, colour, alpha?]. */
export function grad(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: Array<[number, number, number?]>) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [t, c, a] of stops) g.addColorStop(t, css(c, a ?? 1));
  return g;
}

export function radial(ctx: Ctx, x: number, y: number, r: number, stops: Array<[number, number, number?]>) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  for (const [t, c, a] of stops) g.addColorStop(t, css(c, a ?? 1));
  return g;
}

/** Soft ellipse (blurred via gradient), e.g. contact shadows and glows. */
export function softEllipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, color: number, alpha: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.fillStyle = radial(ctx, 0, 0, rx, [[0, color, alpha], [0.55, color, alpha * 0.6], [1, color, 0]]);
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Whether the canvas `filter` property (blur) is supported (Safari < 18 lacks it). */
export const HAS_FILTER = typeof document !== 'undefined'
  && (() => { const c = document.createElement('canvas').getContext('2d') as Ctx & { filter?: string }; return !!c && 'filter' in c; })();

/** Blur a canvas into a new one (falls back to a cheap multi-offset blur). */
export function blurred(src: HTMLCanvasElement, px: number): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = src.width; out.height = src.height;
  const ctx = out.getContext('2d')!;
  if (HAS_FILTER) {
    ctx.filter = `blur(${px}px)`;
    ctx.drawImage(src, 0, 0);
    ctx.filter = 'none';
  } else {
    const n = 8;
    ctx.globalAlpha = 1 / n * 1.6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      ctx.drawImage(src, Math.cos(a) * px * 0.7, Math.sin(a) * px * 0.7);
    }
    ctx.globalAlpha = 1;
  }
  return out;
}
