import { MAP, ROCK_GRID } from '@bc/shared';
import { WORLD, toScreen, toTile } from './iso';
import { css, fbm, hash2, mix, noise, paper, rng, softEllipse, type Ctx } from './paint';

/**
 * Hand-painted ground for the battlefield: one continuous painting instead of a tile grid.
 * Colour fields come from fractal noise in tile space (so blotches follow the iso perspective),
 * then thousands of grass strokes, pebbles and wheel ruts add texture.
 */

const GRASS = [0x34502a, 0x44612e, 0x55703a, 0x6a7a40, 0x7e7c4a];
const DIRT = { base: 0x8a6c47, dark: 0x5e4630, light: 0xb0905e };

function ramp(stops: number[], t: number): number {
  const x = Math.max(0, Math.min(0.9999, t)) * (stops.length - 1);
  const i = Math.floor(x);
  return mix(stops[i], stops[i + 1], x - i);
}

/** The dirt road between the castles: centre line meanders gently; width ~3.4 tiles. */
const c0 = MAP.castles[0], c1 = MAP.castles[1];
const roadY = (x: number) => c0.y + c0.h / 2 + Math.sin(x * 0.17) * 0.55 + Math.sin(x * 0.061 + 1.3) * 0.7;
const ROAD_X0 = c0.x + c0.w - 0.5, ROAD_X1 = c1.x + 0.5;

/** 0 = grass … 1 = road, with a ragged edge. */
export function roadMask(tx: number, ty: number): number {
  if (tx < ROAD_X0 - 2 || tx > ROAD_X1 + 2) return 0;
  const endFade = Math.min(1, (tx - (ROAD_X0 - 1.5)) / 2, ((ROAD_X1 + 1.5) - tx) / 2);
  if (endFade <= 0) return 0;
  const d = Math.abs(ty - roadY(tx));
  const edge = 1.55 + (fbm(tx * 0.6, ty * 0.6, 91, 3) - 0.5) * 1.1;
  return Math.max(0, Math.min(1, (edge - d) / 0.45)) * endFade;
}

/** Soft mask of the playable map (feathered over ~0.7 tiles at the edges). */
function mapMask(tx: number, ty: number): number {
  const e = Math.min(tx, ty, MAP.width - tx, MAP.height - ty);
  return Math.max(0, Math.min(1, (e + 0.35) / 0.7));
}

export const GROUND_PAD = 48;

export interface GroundPainting { canvas: HTMLCanvasElement; x0: number; y0: number; res: number }

export function paintGround(res: number): GroundPainting {
  const x0 = WORLD.minX - GROUND_PAD, y0 = WORLD.minY - GROUND_PAD;
  const W = WORLD.maxX - WORLD.minX + GROUND_PAD * 2, H = WORLD.maxY - WORLD.minY + GROUND_PAD * 2;
  const p = paper(W, H, res);
  const ctx = p.ctx;
  ctx.translate(-x0, -y0);

  // 1) Colour field at quarter resolution, upscaled smoothly.
  const Q = 4;
  const fw = Math.ceil(W / Q), fh = Math.ceil(H / Q);
  const field = document.createElement('canvas');
  field.width = fw; field.height = fh;
  const fctx = field.getContext('2d')!;
  const img = fctx.createImageData(fw, fh);
  for (let j = 0; j < fh; j++) {
    for (let i = 0; i < fw; i++) {
      const wx = x0 + i * Q, wy = y0 + j * Q;
      const t = toTile(wx, wy);
      const m = mapMask(t.x, t.y);
      const o = (j * fw + i) * 4;
      if (m <= 0) { img.data[o + 3] = 0; continue; }
      // Large meadow variation + medium patches + a hint of sunlit dry grass.
      const n1 = fbm(t.x * 0.07, t.y * 0.07, 11, 4);
      const n2 = fbm(t.x * 0.35, t.y * 0.35, 12, 3);
      let c = ramp(GRASS, 0.15 + n1 * 0.7 + (n2 - 0.5) * 0.35);
      const dry = Math.max(0, fbm(t.x * 0.12, t.y * 0.12, 13, 3) - 0.62) * 2.2;
      c = mix(c, 0x9a9050, Math.min(0.5, dry));
      const r = roadMask(t.x, t.y);
      if (r > 0) {
        const d = fbm(t.x * 0.8, t.y * 0.8, 14, 3);
        const dirt = mix(mix(DIRT.dark, DIRT.base, 0.4 + d * 0.6), DIRT.light, Math.max(0, d - 0.6));
        // Trampled, darker grass right at the road edge.
        c = mix(mix(c, 0x55502c, Math.min(1, r * 2) * 0.5), dirt, r);
      }
      // Build zones: a faint team tint.
      for (const team of [0, 1] as const) {
        const z = MAP.zones[team];
        if (t.x >= z.x && t.x < z.x + z.w && t.y >= z.y && t.y < z.y + z.h) c = mix(c, team ? 0x8a5a40 : 0x506a70, 0.06);
      }
      img.data[o] = (c >> 16) & 255; img.data[o + 1] = (c >> 8) & 255; img.data[o + 2] = c & 255;
      img.data[o + 3] = Math.round(m * 255);
    }
  }
  fctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(field, x0, y0, fw * Q, fh * Q);

  // Clip all detail to the map (slightly inside the feathered edge).
  const corner = (x: number, y: number) => toScreen(x, y);
  ctx.save();
  ctx.beginPath();
  const a = corner(0.2, 0.2), b = corner(MAP.width - 0.2, 0.2), c = corner(MAP.width - 0.2, MAP.height - 0.2), d = corner(0.2, MAP.height - 0.2);
  ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath();
  ctx.clip();

  paintRoadDetail(ctx);
  paintGrassDetail(ctx, W * H);
  paintRockShadows(ctx);
  ctx.restore();
  return { canvas: p.canvas, x0, y0, res };
}

function inMap(t: { x: number; y: number }) {
  return t.x > 0.3 && t.y > 0.3 && t.x < MAP.width - 0.3 && t.y < MAP.height - 0.3;
}

function paintGrassDetail(ctx: Ctx, area: number) {
  const r = rng(4242);
  // Soft darker clumps give the meadow body.
  for (let i = 0; i < area / 900; i++) {
    const wx = WORLD.minX + r() * (WORLD.maxX - WORLD.minX), wy = WORLD.minY + r() * (WORLD.maxY - WORLD.minY);
    const t = toTile(wx, wy);
    if (!inMap(t) || roadMask(t.x, t.y) > 0.3) continue;
    const dark = r() < 0.6;
    softEllipse(ctx, wx, wy, 6 + r() * 14, 3 + r() * 6, dark ? 0x2a4018 : 0x8aa048, dark ? 0.16 : 0.1);
  }
  // Grass strokes: short blades leaning slightly, lit from the upper left.
  const blades = area / 28;
  ctx.lineWidth = 1;
  for (let i = 0; i < blades; i++) {
    const wx = WORLD.minX + r() * (WORLD.maxX - WORLD.minX), wy = WORLD.minY + r() * (WORLD.maxY - WORLD.minY);
    const t = toTile(wx, wy);
    if (!inMap(t)) continue;
    const road = roadMask(t.x, t.y);
    if (road > 0.15 && r() < road * 1.2) continue;
    const n = noise(t.x * 0.3, t.y * 0.3, 77);
    const v = r();
    const col = v < 0.5 ? mix(0x2e4a1c, 0x3f5c24, n) : v < 0.95 ? mix(0x627f32, 0x7e9642, n) : mix(0xa8a85a, 0xc8b870, n);
    const len = 2.5 + r() * 4;
    const lean = (r() - 0.35) * 2.4;
    ctx.strokeStyle = css(col, 0.4 + r() * 0.35);
    ctx.lineWidth = 0.7 + r() * 0.7;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.quadraticCurveTo(wx + lean * 0.3, wy - len * 0.6, wx + lean, wy - len);
    ctx.stroke();
  }
  // Clover, tiny flowers and seed heads.
  const flowerCols = [0xf0e080, 0xffffff, 0xd890c8, 0x90b0f0, 0xf0a060];
  for (let i = 0; i < area / 1500; i++) {
    const wx = WORLD.minX + r() * (WORLD.maxX - WORLD.minX), wy = WORLD.minY + r() * (WORLD.maxY - WORLD.minY);
    const t = toTile(wx, wy);
    if (!inMap(t) || roadMask(t.x, t.y) > 0.05) continue;
    // Flowers grow in drifts.
    if (fbm(t.x * 0.2, t.y * 0.2, 21, 2) < 0.58) continue;
    const col = flowerCols[Math.floor(hash2(Math.floor(t.x / 3), Math.floor(t.y / 3), 5) * flowerCols.length)];
    const k = 2 + Math.floor(r() * 4);
    for (let j = 0; j < k; j++) {
      const fx = wx + (r() - 0.5) * 8, fy = wy + (r() - 0.5) * 4;
      ctx.fillStyle = css(0x1a2a10, 0.35); ctx.fillRect(fx + 0.4, fy + 0.6, 1.4, 1);
      ctx.fillStyle = css(col, 0.8); ctx.beginPath(); ctx.arc(fx, fy, 0.5 + r() * 0.5, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function paintRoadDetail(ctx: Ctx) {
  const r = rng(777);
  // Wheel ruts: two worn tracks along the centre line, plus a grassy median here and there.
  for (const off of [-0.55, 0.55]) {
    ctx.beginPath();
    for (let x = ROAD_X0 + 0.5; x <= ROAD_X1 - 0.5; x += 0.25) {
      const p = toScreen(x, roadY(x) + off + (noise(x * 0.8, off * 9, 3) - 0.5) * 0.18);
      if (x === ROAD_X0 + 0.5) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = css(DIRT.dark, 0.32); ctx.lineWidth = 4.5; ctx.stroke();
    ctx.strokeStyle = css(0x3e2c1c, 0.22); ctx.lineWidth = 1.6; ctx.stroke();
  }
  // Pebbles and dirt clods.
  for (let i = 0; i < 2600; i++) {
    const tx = ROAD_X0 + r() * (ROAD_X1 - ROAD_X0), ty = roadY(tx) + (r() - 0.5) * 3.6;
    const m = roadMask(tx, ty);
    if (m < 0.5) continue;
    const p = toScreen(tx, ty);
    const s = 0.6 + r() * 1.6;
    const c = r() < 0.5 ? 0x9a948a : mix(DIRT.dark, DIRT.light, r());
    ctx.fillStyle = css(0x2a1e12, 0.35); ctx.beginPath(); ctx.ellipse(p.x + 0.5, p.y + 0.6, s, s * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = css(c, 0.9); ctx.beginPath(); ctx.ellipse(p.x, p.y, s, s * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    if (s > 1.2) { ctx.fillStyle = css(0xffffff, 0.25); ctx.beginPath(); ctx.ellipse(p.x - s * 0.3, p.y - s * 0.2, s * 0.4, s * 0.25, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  // Puddles catching the sky.
  for (let i = 0; i < 9; i++) {
    const tx = ROAD_X0 + 4 + r() * (ROAD_X1 - ROAD_X0 - 8), ty = roadY(tx) + (r() - 0.5) * 1.2;
    const p = toScreen(tx, ty);
    const w = 7 + r() * 9;
    softEllipse(ctx, p.x, p.y, w + 3, w * 0.45 + 2, 0x3e2c1c, 0.35);
    ctx.fillStyle = css(0x7a8a98, 0.55); ctx.beginPath(); ctx.ellipse(p.x, p.y, w, w * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = css(0xd8e4ec, 0.35); ctx.beginPath(); ctx.ellipse(p.x - w * 0.25, p.y - w * 0.1, w * 0.45, w * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  }
}

function paintRockShadows(ctx: Ctx) {
  for (let y = 0; y < MAP.height; y++) for (let x = 0; x < MAP.width; x++) {
    if (!ROCK_GRID[y * MAP.width + x]) continue;
    const p = toScreen(x + 0.6, y + 0.6);
    softEllipse(ctx, p.x + 4, p.y + 2, 30, 15, 0x1a1408, 0.28);
    // Gravel and moss scattered around outcrops.
    const r = rng(x * 131 + y * 7);
    for (let i = 0; i < 10; i++) {
      const gx = p.x + (r() - 0.5) * 50, gy = p.y + (r() - 0.5) * 24;
      ctx.fillStyle = css(r() < 0.5 ? 0x8a867a : 0x5a6a34, 0.8);
      ctx.beginPath(); ctx.ellipse(gx, gy, 1 + r() * 1.5, 0.7 + r(), 0, 0, Math.PI * 2); ctx.fill();
    }
  }
}

/**
 * Seamless tile of wild meadow for the countryside around the map (repeats every `size` px).
 */
export function paintOuterTile(size: number, res: number): HTMLCanvasElement {
  const p = paper(size, size, res);
  const ctx = p.ctx;
  const Q = 4, n = size / Q;
  const field = document.createElement('canvas');
  field.width = n; field.height = n;
  const fctx = field.getContext('2d')!;
  const img = fctx.createImageData(n, n);
  const P = 8; // lattice period across the tile
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const u = (i / n) * P, v = (j / n) * P;
    const n1 = fbm(u, v, 31, 4, P), n2 = fbm(u * 4, v * 4, 32, 2, P * 4);
    const c = mix(ramp(GRASS, 0.08 + n1 * 0.6 + (n2 - 0.5) * 0.3), 0x2a4a22, 0.18);
    const o = (j * n + i) * 4;
    img.data[o] = (c >> 16) & 255; img.data[o + 1] = (c >> 8) & 255; img.data[o + 2] = c & 255; img.data[o + 3] = 255;
  }
  fctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  // Draw 3×3 so smoothing wraps seamlessly at the borders.
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) ctx.drawImage(field, a * size, b * size, size, size);
  const r = rng(99);
  const wrap = (fn: (ox: number, oy: number) => void) => { for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) fn(ox, oy); };
  for (let i = 0; i < (size * size) / 700; i++) {
    const x = r() * size, y = r() * size, rx = 6 + r() * 16, ry = 3 + r() * 7, dark = r() < 0.65;
    wrap((ox, oy) => softEllipse(ctx, x + ox, y + oy, rx, ry, dark ? 0x1e3414 : 0x7a9a40, dark ? 0.18 : 0.1));
  }
  for (let i = 0; i < (size * size) / 18; i++) {
    const x = r() * size, y = r() * size, v = r(), len = 3 + r() * 5, lean = (r() - 0.35) * 2.6;
    const col = v < 0.5 ? 0x2a4418 : v < 0.9 ? 0x5e7e30 : 0x9aa050;
    const a = 0.5 + r() * 0.4, lw = 0.7 + r() * 0.8;
    wrap((ox, oy) => {
      const X = x + ox, Y = y + oy;
      if (X < -8 || Y < -8 || X > size + 8 || Y > size + 8) return;
      ctx.strokeStyle = css(col, a); ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(X, Y); ctx.quadraticCurveTo(X + lean * 0.3, Y - len * 0.6, X + lean, Y - len); ctx.stroke();
    });
  }
  return p.canvas;
}
