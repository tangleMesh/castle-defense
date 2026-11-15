import { foliage } from './structures';
import { css, fillPoly, grad, lit, mix, rng, softEllipse, type Ctx } from './paint';


/** Painted nature props: pines, broadleaf trees, bushes and boulders. Foot at (w/2, footY). */

export const PROP_SIZE = {
  pine: { w: 70, h: 124, footY: 116 },
  oak: { w: 84, h: 112, footY: 104 },
  bush: { w: 44, h: 32, footY: 26 },
  rock: { w: 76, h: 64, footY: 50 },
};

export function paintPine(ctx: Ctx, seed: number) {
  const { w, footY } = PROP_SIZE.pine;
  const r = rng(seed);
  const cx = w / 2, by = footY;
  const base = mix(0x1e3a28, 0x2a4a2a, r());
  softEllipse(ctx, cx, by, 16, 6, 0x000000, 0.35);
  // trunk
  ctx.fillStyle = grad(ctx, cx - 3, 0, cx + 3, 0, [[0, 0x6a4a2e], [1, 0x3a2414]]);
  ctx.fillRect(cx - 2.5, by - 22, 5, 22);
  const tiers = 5;
  for (let k = 0; k < tiers; k++) {
    const t = k / (tiers - 1);
    const half = 26 - t * 18 + r() * 3;
    const bot = by - 14 - k * 17, top = bot - 30 + t * 6;
    const pts: Array<[number, number]> = [[cx, top]];
    // drooping, jagged lower edge
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      const x = cx + half * (s * 2 - 1) * 1.0;
      const sag = Math.sin(s * Math.PI) * 4;
      pts.push([x, bot + sag + (i % 2 ? -3 - r() * 2 : 1)]);
    }
    ctx.save();
    ctx.translate(2.5, 3);
    fillPoly(ctx, pts, css(0x0a1408, 0.45));
    ctx.restore();
    fillPoly(ctx, pts, grad(ctx, cx - half, top, cx + half, bot, [[0, lit(base, 1.25 + t * 0.1)], [0.45, lit(base, 0.95)], [1, lit(base, 0.55)]]));
    // needle strokes
    ctx.save();
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.clip();
    for (let i = 0; i < 70; i++) {
      const x = cx + (r() - 0.5) * half * 2, y = top + r() * (bot - top + 4);
      const lightT = (cx - x) / half * 0.5 + 0.5;
      ctx.strokeStyle = css(lit(mix(base, 0x6a8a40, 0.2), 0.6 + lightT * 0.7), 0.7);
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (x < cx ? -2.5 : 2.5), y + 2.5); ctx.stroke();
    }
    ctx.restore();
  }
}

export function paintOak(ctx: Ctx, seed: number) {
  const { w, footY } = PROP_SIZE.oak;
  const r = rng(seed);
  const cx = w / 2, by = footY;
  const leaf = mix(0x3a6a2a, 0x5a7a2a, r());
  softEllipse(ctx, cx, by, 18, 7, 0x000000, 0.35);
  ctx.fillStyle = grad(ctx, cx - 4, 0, cx + 4, 0, [[0, 0x7a5a38], [0.4, 0x5e4228], [1, 0x34200f]]);
  ctx.beginPath(); ctx.moveTo(cx - 5, by); ctx.quadraticCurveTo(cx - 2, by - 20, cx - 3, by - 40); ctx.lineTo(cx + 3, by - 40); ctx.quadraticCurveTo(cx + 2, by - 20, cx + 5, by); ctx.fill();
  ctx.strokeStyle = css(0x4a3220); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx, by - 30); ctx.quadraticCurveTo(cx + 8, by - 38, cx + 14, by - 50); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, by - 32); ctx.quadraticCurveTo(cx - 8, by - 40, cx - 12, by - 52); ctx.stroke();
  foliage(ctx, cx, by - 62, 30 + r() * 6, 26 + r() * 5, leaf, seed + 1);
}

export function paintBush(ctx: Ctx, seed: number, flowers: boolean) {
  const { w, footY } = PROP_SIZE.bush;
  const r = rng(seed);
  softEllipse(ctx, w / 2, footY, 16, 5, 0x000000, 0.3);
  foliage(ctx, w / 2, footY - 9, 15, 9, mix(0x3a6a2a, 0x4a7a30, r()), seed);
  if (flowers) {
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = css(i % 2 ? 0xe8d8f0 : 0xd85a6a);
      ctx.beginPath(); ctx.arc(w / 2 + (r() - 0.5) * 22, footY - 9 + (r() - 0.6) * 14, 1.2, 0, Math.PI * 2); ctx.fill();
    }
  }
}

/** Weathered boulders: rounded lumps lit from the upper left, with flat sunlit tops, cracks, moss and lichen. */
export function paintRock(ctx: Ctx, seed: number) {
  const { w, footY } = PROP_SIZE.rock;
  const r = rng(seed);
  const cx = w / 2, by = footY - 8;
  softEllipse(ctx, cx + 3, by + 3, 30, 12, 0x000000, 0.38);
  const lumps = 2 + Math.floor(r() * 3);
  const list: Array<[number, number, number, number]> = [];
  for (let k = 0; k < lumps; k++) list.push([cx + (r() - 0.5) * 34, by + (r() - 0.3) * 8, 9 + r() * 11, 7 + r() * 12]);
  // back to front
  list.sort((a, b) => a[1] - b[1]);
  for (const [lx, ly, rx, hgt] of list) {
    const base = mix(0x8e877a, 0x6a6660, r());
    const top = ly - hgt;
    // body: an irregular rounded shape
    const pts: Array<[number, number]> = [];
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = Math.PI + (i / (n - 1)) * Math.PI;
      const rr = 0.85 + r() * 0.2;
      pts.push([lx + Math.cos(a) * rx * rr, ly + Math.sin(a) * (hgt + rx * 0.2) * rr]);
    }
    pts.push([lx + rx * 0.9, ly + 1], [lx, ly + rx * 0.32], [lx - rx * 0.9, ly + 1]);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.closePath();
    ctx.fillStyle = grad(ctx, lx - rx, top, lx + rx, ly, [[0, lit(base, 1.3)], [0.45, lit(base, 0.95)], [1, lit(base, 0.5)]]);
    ctx.fill();
    ctx.clip();
    // a flat, sunlit top plane
    ctx.fillStyle = css(lit(base, 1.25), 0.55);
    ctx.beginPath(); ctx.ellipse(lx - rx * 0.2, top + hgt * 0.25, rx * 0.55, hgt * 0.22 + 2, -0.3, 0, Math.PI * 2); ctx.fill();
    // lichen speckles and moss on top
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = css(r() < 0.5 ? 0xb8b090 : 0x6a8a3a, 0.35 + r() * 0.3);
      ctx.beginPath(); ctx.ellipse(lx + (r() - 0.6) * rx * 1.4, top + r() * hgt * 0.7, 0.8 + r() * 1.8, 0.6 + r(), 0, 0, Math.PI * 2); ctx.fill();
    }
    // shade at the base (contact)
    ctx.fillStyle = grad(ctx, 0, ly - 4, 0, ly + rx * 0.35, [[0, 0x000000, 0], [1, 0x000000, 0.4]]);
    ctx.fillRect(lx - rx, ly - 4, rx * 2, rx);
    ctx.restore();
    ctx.strokeStyle = css(0x2a2620, 0.55); ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(lx + rx * 0.1, top + 3); ctx.lineTo(lx + rx * 0.25 + r() * 3, top + hgt * 0.5); ctx.lineTo(lx + rx * 0.15, ly - 1); ctx.stroke();
  }
  // grass hugging the base
  for (let i = 0; i < 16; i++) {
    const gx = cx + (r() - 0.5) * 50, gy = by + 2 + r() * 5;
    ctx.strokeStyle = css(r() < 0.5 ? 0x4a6a2a : 0x6a8a3a, 0.9); ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + (r() - 0.5) * 2, gy - 3 - r() * 3); ctx.stroke();
  }
}
