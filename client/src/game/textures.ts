import Phaser from 'phaser';
import { BUILDINGS, CASTLE_SIZE, UNITS, type BuildingDef, type UnitDef } from '@bc/shared';
import { TEAM_COLORS, TH, TW } from './iso';

type G = Phaser.GameObjects.Graphics;

export function shade(c: number, f: number): number {
  const r = Math.min(255, Math.max(0, Math.round(((c >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((c >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((c & 255) * f)));
  return (r << 16) | (g << 8) | b;
}

function mix(a: number, b: number, t: number): number {
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t) << s;
  return ch(16) | ch(8) | ch(0);
}

/** Small deterministic PRNG for texture noise. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const P = (x: number, y: number) => new Phaser.Geom.Point(x, y);

function poly(g: G, color: number, pts: Array<[number, number]>, alpha = 1) {
  g.fillStyle(color, alpha);
  g.fillPoints(pts.map(([x, y]) => P(x, y)), true);
}

/**
 * Iso box whose bottom (front) corner sits at (ox, oy); footprint a×b tiles, height h px.
 * Returns the top-face points for further decoration.
 */
function box(g: G, ox: number, oy: number, a: number, b: number, h: number, top: number, wall: number) {
  const hw = TW / 2, hh = TH / 2;
  const bottom: [number, number] = [ox, oy];
  const right: [number, number] = [ox + b * hw, oy - b * hh];
  const left: [number, number] = [ox - a * hw, oy - a * hh];
  const topv: [number, number] = [ox + (b - a) * hw, oy - (a + b) * hh];
  const up = ([x, y]: [number, number]): [number, number] => [x, y - h];
  poly(g, shade(wall, 0.85), [left, bottom, up(bottom), up(left)]);
  poly(g, shade(wall, 0.62), [bottom, right, up(right), up(bottom)]);
  poly(g, top, [up(topv), up(right), up(bottom), up(left)]);
  // edge highlights
  g.lineStyle(1, shade(wall, 1.15), 0.6);
  g.lineBetween(bottom[0], bottom[1] - h, bottom[0], bottom[1]);
  return { left: up(left), right: up(right), bottom: up(bottom), top: up(topv), cx: ox + ((b - a) * hw) / 2, cy: oy - ((a + b) * hh) / 2 - h };
}

function pyramid(g: G, f: ReturnType<typeof box>, rise: number, color: number) {
  const apex: [number, number] = [f.cx, f.cy - rise];
  poly(g, shade(color, 0.7), [f.left, f.top, apex]);
  poly(g, shade(color, 0.8), [f.top, f.right, apex]);
  poly(g, shade(color, 1.05), [f.left, f.bottom, apex]);
  poly(g, shade(color, 0.78), [f.bottom, f.right, apex]);
}

function cylinder(g: G, cx: number, by: number, rx: number, h: number, color: number, topColor?: number) {
  const ry = rx / 2;
  g.fillStyle(shade(color, 0.7));
  g.fillEllipse(cx, by, rx * 2, ry * 2);
  g.fillRect(cx - rx, by - h, rx * 2, h);
  // lit left half
  g.fillStyle(shade(color, 0.9));
  g.fillRect(cx - rx, by - h, rx * 0.9, h);
  g.fillStyle(topColor ?? shade(color, 1.1));
  g.fillEllipse(cx, by - h, rx * 2, ry * 2);
}

function cone(g: G, cx: number, by: number, rx: number, h: number, color: number) {
  g.fillStyle(shade(color, 0.75));
  g.fillEllipse(cx, by, rx * 2, rx);
  poly(g, shade(color, 1.05), [[cx - rx, by], [cx, by + rx / 2], [cx, by - h]]);
  poly(g, shade(color, 0.8), [[cx, by + rx / 2], [cx + rx, by], [cx, by - h]]);
}

function crenels(g: G, f: ReturnType<typeof box>, color: number) {
  const n = 4;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    for (const [a, b] of [[f.left, f.bottom], [f.bottom, f.right]] as const) {
      const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
      g.fillStyle(shade(color, 0.95));
      g.fillRect(x - 2, y - 5, 4, 5);
    }
  }
}

function flagPole(g: G, x: number, y: number, h: number) {
  g.lineStyle(2, 0x3a2a1a);
  g.lineBetween(x, y, x, y - h);
}

// ------------------------------------------------------------------ resolution

/**
 * Textures are rasterised at the display's pixel density (2× on Retina) and drawn at
 * 1/TEX_RES scale, so sprites stay sharp instead of being upscaled by the browser.
 * All drawing code keeps working in logical pixels.
 */
export const TEX_RES = typeof window === 'undefined' ? 1 : Math.min(2, Math.max(1, Math.ceil(window.devicePixelRatio || 1)));

function hiGraphics(scene: Phaser.Scene): G {
  return scene.make.graphics({}, false).setScale(TEX_RES);
}

function gen(g: G, key: string, w: number, h: number) {
  g.generateTexture(key, Math.ceil(w * TEX_RES), Math.ceil(h * TEX_RES));
}

/** Logical (unscaled) height of a generated texture. */
export function texHeight(scene: Phaser.Scene, key: string): number {
  return (scene.textures.get(key).getSourceImage() as HTMLImageElement).height / TEX_RES;
}

// ------------------------------------------------------------------ terrain

function genTerrain(scene: Phaser.Scene) {
  const g = hiGraphics(scene);
  const tile = (key: string, base: number, seed: number, specks: number[], speckCount = 14) => {
    g.clear();
    const r = rng(seed);
    poly(g, base, [[TW / 2, 0], [TW, TH / 2], [TW / 2, TH], [0, TH / 2]]);
    for (let i = 0; i < speckCount; i++) {
      const u = r(), v = r();
      const x = (u - v) * (TW / 2) + TW / 2, y = (u + v) * (TH / 2);
      g.fillStyle(specks[i % specks.length], 0.55);
      g.fillRect(x, y, 2, 1 + (r() > 0.6 ? 1 : 0));
    }
    // subtle bevel on the lower edges
    g.lineStyle(1, shade(base, 0.82), 0.5);
    g.lineBetween(0, TH / 2, TW / 2, TH);
    g.lineBetween(TW / 2, TH, TW, TH / 2);
    gen(g, key, TW, TH);
  };
  const grass = [0x4e7f35, 0x527f37, 0x4a7a33, 0x56853a];
  grass.forEach((c, i) => tile(`g${i}`, c, 11 + i, [0x6a9a45, 0x3c6428, 0x7aa850]));
  const dirt = [0x8a7550, 0x84704c];
  dirt.forEach((c, i) => tile(`d${i}`, c, 31 + i, [0x6a5638, 0xa08a62, 0x75613f], 20));
  tile('z0', 0x5a7a3a, 41, [0x6a8a45, 0x47652c]);
  tile('z1', 0x5c7838, 42, [0x6a8a45, 0x47652c]);

  // rocks: irregular boulders, several variants so outcrops look natural
  for (let i = 0; i < 6; i++) {
    g.clear();
    const r = rng(77 + i * 13);
    const W = TW + 8, H = TH + 44;
    const cx = W / 2, by = H - TH / 2 - 2;
    const base = mix(0x7d7a70, 0x6a6458, r());
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(cx + 3, by + 3, TW * 0.95, TH * 0.8);
    const lumps = 2 + Math.floor(r() * 3);
    for (let k = 0; k < lumps; k++) {
      const lx = cx + (r() - 0.5) * 26, ly = by - 4 - r() * 6;
      const lw = 22 + r() * 22, lh = 16 + r() * 24;
      const c = shade(base, 0.85 + r() * 0.25);
      // body
      g.fillStyle(shade(c, 0.62)); g.fillEllipse(lx + 3, ly - lh / 2 + 3, lw, lh);
      g.fillStyle(c); g.fillEllipse(lx, ly - lh / 2, lw, lh);
      // lit top-left facet
      g.fillStyle(shade(c, 1.22)); g.fillEllipse(lx - lw * 0.15, ly - lh * 0.7, lw * 0.55, lh * 0.4);
      // crack
      g.lineStyle(1, shade(c, 0.5), 0.7);
      g.lineBetween(lx + lw * 0.1, ly - lh * 0.8, lx + lw * 0.2 - r() * 6, ly - lh * 0.3);
    }
    // moss tufts
    g.fillStyle(0x5a7a3a, 0.8);
    for (let k = 0; k < 3; k++) g.fillEllipse(cx + (r() - 0.5) * 40, by - r() * 4, 6 + r() * 6, 3);
    gen(g, `rock${i}`, W, H);
  }

  // Wild grass outside the battlefield: a bit darker and lusher than the playable map.
  const wild = [0x48782f, 0x4b7a31, 0x44722c, 0x507f35];
  wild.forEach((c, i) => tile(`w${i}`, c, 51 + i, [0x5f9040, 0x365c22, 0x6c9c48], 18));

  // Trees for the forest around the map: pines and broadleaf trees, plus low bushes.
  for (let i = 0; i < 3; i++) {
    g.clear();
    const r = rng(201 + i * 7);
    const W = 56, H = 96, cx = W / 2, by = H - 8;
    g.fillStyle(0x000000, 0.28); g.fillEllipse(cx + 4, by + 1, 40, 14);
    g.fillStyle(0x5a3e24); g.fillRect(cx - 3, by - 16, 6, 16);
    const base = mix(0x2f5a2a, 0x24502e, r());
    const tiers = 4;
    for (let k = 0; k < tiers; k++) {
      const w = 44 - k * 9 + r() * 4, top = by - 14 - (k + 1) * 18 - r() * 3, bot = by - 10 - k * 18;
      poly(g, shade(base, 0.7), [[cx, top], [cx + w / 2, bot], [cx - w / 2, bot]]);
      poly(g, shade(base, 1 + k * 0.06), [[cx, top], [cx - w / 2, bot], [cx - w / 2 + w * 0.42, bot - 2]]);
    }
    gen(g, `tree_p${i}`, W, H);
  }
  for (let i = 0; i < 3; i++) {
    g.clear();
    const r = rng(301 + i * 11);
    const W = 64, H = 84, cx = W / 2, by = H - 8;
    g.fillStyle(0x000000, 0.28); g.fillEllipse(cx + 5, by + 1, 48, 16);
    g.fillStyle(0x5e4228); g.fillRect(cx - 3, by - 24, 6, 24);
    const base = mix(0x3f7a2c, 0x5a8a30, r());
    for (let k = 0; k < 7; k++) {
      const bx = cx + (r() - 0.5) * 30, byy = by - 40 + (r() - 0.5) * 22, rr = 11 + r() * 8;
      g.fillStyle(shade(base, 0.68)); g.fillCircle(bx + 3, byy + 3, rr);
    }
    for (let k = 0; k < 7; k++) {
      const bx = cx + (r() - 0.5) * 28, byy = by - 42 + (r() - 0.5) * 20, rr = 10 + r() * 8;
      g.fillStyle(shade(base, 0.9 + r() * 0.2)); g.fillCircle(bx, byy, rr);
      g.fillStyle(shade(base, 1.25), 0.8); g.fillCircle(bx - rr * 0.35, byy - rr * 0.35, rr * 0.4);
    }
    gen(g, `tree_o${i}`, W, H);
  }
  for (let i = 0; i < 2; i++) {
    g.clear();
    const r = rng(401 + i * 5);
    const W = 36, H = 26, cx = W / 2, by = H - 5;
    g.fillStyle(0x000000, 0.25); g.fillEllipse(cx + 3, by, 30, 9);
    const base = i ? 0x3f6e2c : 0x4a7a30;
    for (let k = 0; k < 5; k++) {
      const bx = cx + (r() - 0.5) * 18, byy = by - 8 + (r() - 0.5) * 6, rr = 5 + r() * 4;
      g.fillStyle(shade(base, 0.75 + r() * 0.35)); g.fillCircle(bx, byy, rr);
    }
    if (i === 0) { g.fillStyle(0xd04a5a); g.fillCircle(cx - 4, by - 10, 1.5); g.fillCircle(cx + 5, by - 7, 1.5); }
    gen(g, `bush${i}`, W, H);
  }

  // decorative tufts / flowers
  g.clear();
  g.lineStyle(1, 0x6aa040);
  for (let i = 0; i < 5; i++) g.lineBetween(4 + i * 2, 10, 2 + i * 3, 2 + (i % 2) * 2);
  gen(g, 'tuft', 16, 12);
  g.clear();
  g.fillStyle(0x3f7a2a); g.fillRect(5, 4, 1, 6);
  g.fillStyle(0xf0e070); g.fillCircle(5, 3, 2);
  g.fillStyle(0xe06aa0); g.fillCircle(10, 5, 2);
  g.fillStyle(0x3f7a2a); g.fillRect(10, 6, 1, 4);
  gen(g, 'flowers', 14, 12);
  g.destroy();
}

// ------------------------------------------------------------------ buildings

export function buildingTexSize(size: number, height: number) {
  return { w: size * TW + 8, h: size * TH + height + 60 };
}

function drawBuilding(g: G, def: BuildingDef) {
  const m = def.model;
  const { w, h } = buildingTexSize(def.size, m.height);
  const ox = w / 2, oy = h - 4;
  const s = def.size;
  const wall = m.wall, roof = m.roof;
  // foundation slab
  box(g, ox, oy, s, s, 3, shade(0x6a6458, 1.05), 0x5a5448);
  const inset = (k: number) => [ox, oy - 3 - (TH * (s - k)) / 2] as const;

  switch (m.style) {
    case 'hall': {
      const [x, y] = inset(1.6);
      const f = box(g, x, y, 1.6, 1.6, m.height * 0.6, shade(wall, 1.1), wall);
      pyramid(g, f, m.height * 0.75, roof);
      g.fillStyle(0x2a1e14); g.fillRect(x - 14, y - 16, 7, 12); // door (left face)
      break;
    }
    case 'workshop': {
      const [x, y] = inset(1.7);
      const f = box(g, x, y, 1.7, 1.7, m.height * 0.55, shade(roof, 1), wall);
      poly(g, shade(roof, 0.8), [f.left, f.top, [f.top[0], f.top[1] - 10], [f.left[0], f.left[1] - 10]]);
      g.fillStyle(0x4a3424); g.fillRect(f.right[0] - 12, f.right[1] - 20, 5, 16); // chimney
      g.fillStyle(0x2a1e14); g.fillRect(x + 6, y - 14, 10, 10);
      break;
    }
    case 'stable': {
      const [x, y] = inset(1.75);
      const f = box(g, x, y, 1.75, 1.3, m.height * 0.6, shade(wall, 1.05), wall);
      pyramid(g, f, m.height * 0.5, roof);
      g.lineStyle(2, 0x5a3a20);
      g.lineBetween(x - 40, y - 10, x - 6, y + 4);
      break;
    }
    case 'tower': {
      const [x, y] = inset(1.1);
      const f = box(g, x, y, 1.1, 1.1, m.height, shade(wall, 1.15), wall);
      crenels(g, f, wall);
      g.fillStyle(0x1a1410); g.fillRect(x - 10, y - m.height * 0.6, 3, 7); g.fillRect(x + 7, y - m.height * 0.65, 3, 7);
      break;
    }
    case 'temple': {
      const [x, y] = inset(1.6);
      const f = box(g, x, y, 1.6, 1.6, m.height * 0.55, shade(wall, 1.1), wall);
      g.fillStyle(shade(roof, 0.85)); g.fillCircle(f.cx, f.cy - 4, 15);
      g.fillStyle(shade(roof, 1.15)); g.fillCircle(f.cx - 4, f.cy - 8, 7);
      g.lineStyle(2, roof); g.lineBetween(f.cx, f.cy - 18, f.cx, f.cy - 34);
      g.lineBetween(f.cx - 5, f.cy - 28, f.cx + 5, f.cy - 28);
      g.fillStyle(0x3a64b8, 0.8); g.fillRect(x - 18, y - 22, 6, 10);
      break;
    }
    case 'nest': {
      const [x, y] = inset(1);
      const f = box(g, x, y, 1, 1, m.height, shade(wall, 1.1), wall);
      g.fillStyle(shade(0x7a5a30, 0.9)); g.fillEllipse(f.cx, f.cy, 44, 18);
      g.fillStyle(shade(roof, 1)); g.fillEllipse(f.cx, f.cy - 4, 30, 11);
      g.lineStyle(1, 0x4a3018); g.strokeEllipse(f.cx, f.cy, 44, 18);
      break;
    }
    case 'banner': {
      const [x, y] = inset(1);
      box(g, x, y, 1, 1, 8, shade(wall, 1.1), wall);
      flagPole(g, x, y - 12, m.height + 10);
      poly(g, roof, [[x, y - m.height - 20], [x + 26, y - m.height - 14], [x + 22, y - m.height + 2], [x, y - m.height - 4]]);
      g.fillStyle(0xe0b84a); g.fillCircle(x + 12, y - m.height - 10, 3);
      break;
    }
    case 'citadel': {
      const [x, y] = inset(1.8);
      const f = box(g, x, y, 1.8, 1.8, m.height * 0.45, shade(wall, 1.05), wall);
      crenels(g, f, wall);
      const [kx, ky] = [f.cx, f.cy + 14];
      const k = box(g, kx, ky, 0.9, 0.9, m.height * 0.55, shade(wall, 1.1), shade(wall, 1.02));
      g.fillStyle(shade(roof, 0.85)); g.fillCircle(k.cx, k.cy - 4, 13);
      g.fillStyle(shade(roof, 1.2)); g.fillCircle(k.cx - 4, k.cy - 8, 6);
      cylinder(g, f.left[0] + 6, f.left[1] + 8, 7, 26, wall, roof);
      cylinder(g, f.right[0] - 6, f.right[1] + 8, 7, 26, wall, roof);
      g.fillStyle(0xffe890, 0.35); g.fillCircle(k.cx, k.cy - 8, 22);
      break;
    }
    case 'tree': {
      const [x, y] = inset(1.4);
      box(g, x, y, 1.4, 1.4, 4, shade(0x4a6a30, 1), 0x3a5428);
      g.fillStyle(shade(wall, 0.9)); g.fillRect(x - 6, y - m.height * 0.55 - 6, 12, m.height * 0.55);
      g.fillStyle(shade(wall, 0.7)); g.fillRect(x + 1, y - m.height * 0.55 - 6, 5, m.height * 0.55);
      const top = y - m.height * 0.55 - 6;
      const r = 12 + m.height * 0.22;
      g.fillStyle(shade(roof, 0.7)); g.fillCircle(x + 8, top + 2, r * 0.8);
      g.fillStyle(shade(roof, 0.85)); g.fillCircle(x - 10, top, r * 0.85);
      g.fillStyle(roof); g.fillCircle(x, top - r * 0.5, r);
      g.fillStyle(shade(roof, 1.25)); g.fillCircle(x - r * 0.35, top - r * 0.8, r * 0.45);
      break;
    }
    case 'hut': {
      const [x, y] = inset(1.4);
      cylinder(g, x, y - 18, 30, m.height * 0.45, wall);
      cone(g, x, y - 18 - m.height * 0.45, 36, m.height * 0.9, roof);
      g.fillStyle(0x1a1410); g.fillRect(x - 8, y - 18 - 14, 9, 13);
      g.lineStyle(2, 0xd0d0e0); g.lineBetween(x + 2, y - 18 - m.height * 1.35, x + 6, y - 18 - m.height * 1.6);
      break;
    }
    case 'mound': {
      const [x, y] = inset(1.6);
      g.fillStyle(shade(wall, 0.8)); g.fillEllipse(x, y - 22, 100, 46);
      g.fillStyle(wall); g.fillEllipse(x - 4, y - 26 - m.height * 0.3, 84, 38 + m.height);
      g.fillStyle(roof); g.fillEllipse(x - 8, y - 34 - m.height * 0.6, 60, 20 + m.height * 0.6);
      g.fillStyle(0x140c08); g.fillEllipse(x - 14, y - 16, 22, 14);
      break;
    }
    case 'shrine': {
      const [x, y] = inset(1.2);
      const f = box(g, x, y, 1.2, 1.2, 10, shade(wall, 1.15), wall);
      g.fillStyle(roof, 0.25); g.fillCircle(f.cx, f.cy - 18, 22);
      poly(g, shade(roof, 1.2), [[f.cx, f.cy - 40 - m.height * 0.4], [f.cx + 9, f.cy - 14], [f.cx, f.cy - 4], [f.cx - 9, f.cy - 14]]);
      poly(g, shade(roof, 0.8), [[f.cx, f.cy - 40 - m.height * 0.4], [f.cx + 9, f.cy - 14], [f.cx, f.cy - 4]]);
      break;
    }
  }
  return { w, h };
}

function drawCastle(g: G, team: 0 | 1) {
  const s = CASTLE_SIZE;
  const w = s * TW + 8, h = s * TH + 170;
  const ox = w / 2, oy = h - 4;
  const stone = 0x9a968a, roof = shade(TEAM_COLORS[team], 0.8);
  box(g, ox, oy, s, s, 4, 0x6a6458, 0x5a5448);
  const f = box(g, ox, oy - 4 - (TH * 0.3) / 2 * 2, s - 0.3, s - 0.3, 46, shade(stone, 1.1), stone);
  crenels(g, f, stone);
  // keep
  const k = box(g, f.cx, f.cy + 34, 1.8, 1.8, 70, shade(stone, 1.15), shade(stone, 1.05));
  crenels(g, k, stone);
  pyramid(g, k, 44, roof);
  // corner towers
  const towers: Array<[number, number]> = [f.top, f.left, f.right, f.bottom];
  for (const [tx, ty] of towers) {
    cylinder(g, tx, ty + 46 - 4, 13, 66, stone);
    cone(g, tx, ty - 24, 16, 34, roof);
  }
  // gate on the front-right face
  g.fillStyle(0x2a1e14);
  g.fillRect(f.bottom[0] + 26, f.bottom[1] + 22, 14, 20);
  return { w, h };
}

/** Collapsed castle: broken wall stubs, tower stumps, rubble and scorch marks (same canvas as the castle). */
function drawRuin(g: G, team: 0 | 1) {
  const s = CASTLE_SIZE;
  const w = s * TW + 8, h = s * TH + 170;
  const ox = w / 2, oy = h - 4;
  const stone = 0x8a867a, dark = 0x4a463e, roof = shade(TEAM_COLORS[team], 0.6);
  const r = rng(900 + team);
  // scorched ground
  g.fillStyle(0x1a1610, 0.55); g.fillEllipse(ox, oy - s * TH / 2, s * TW * 0.95, s * TH * 0.95);
  box(g, ox, oy, s, s, 4, 0x5a5448, 0x4a4438);
  const f = box(g, ox, oy - 4, s - 0.3, s - 0.3, 0, shade(stone, 0.8), stone);
  // jagged wall remains along the back edges
  const wall = (a: [number, number], b: [number, number], n: number) => {
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const x0 = a[0] + (b[0] - a[0]) * t0, y0 = a[1] + (b[1] - a[1]) * t0;
      const x1 = a[0] + (b[0] - a[0]) * t1, y1 = a[1] + (b[1] - a[1]) * t1;
      const h0 = 6 + r() * 26, h1 = 6 + r() * 26;
      poly(g, shade(stone, 0.7 + r() * 0.25), [[x0, y0], [x1, y1], [x1, y1 - h1], [x0, y0 - h0]]);
      g.lineStyle(1, shade(stone, 0.5), 0.6); g.lineBetween(x0, y0 - h0, x1, y1 - h1);
    }
  };
  wall(f.left, f.top, 6);
  wall(f.top, f.right, 6);
  // tower stumps
  for (const [tx, ty] of [f.top, f.left, f.right]) cylinder(g, tx, ty + 4, 13, 12 + r() * 20, shade(stone, 0.9), 0x3a362e);
  // collapsed keep: rubble mound
  const cx = f.cx, cy = f.cy + 8;
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    const x = cx + Math.cos(a) * d * 70, y = cy + Math.sin(a) * d * 34 - (1 - d) * 22;
    const rw = 6 + r() * 12, rh = 4 + r() * 7;
    g.fillStyle(shade(r() > 0.25 ? stone : dark, 0.6 + r() * 0.6)); g.fillEllipse(x, y, rw, rh);
  }
  // broken roof shards in team colour
  for (let i = 0; i < 9; i++) {
    const x = cx + (r() - 0.5) * 110, y = cy + (r() - 0.3) * 40;
    poly(g, shade(roof, 0.8 + r() * 0.4), [[x, y], [x + 8 + r() * 6, y - 3], [x + 4, y - 8 - r() * 5]]);
  }
  // a fallen tower lying across the front
  const fx = f.bottom[0] - 30, fy = f.bottom[1] - 6;
  poly(g, shade(stone, 0.75), [[fx, fy], [fx + 44, fy - 14], [fx + 50, fy - 4], [fx + 6, fy + 10]]);
  poly(g, shade(stone, 1.0), [[fx, fy], [fx + 44, fy - 14], [fx + 40, fy - 22], [fx - 4, fy - 8]]);
  // charred beams
  g.lineStyle(3, 0x2a1e14);
  for (let i = 0; i < 4; i++) { const x = cx + (r() - 0.5) * 80, y = cy + (r() - 0.5) * 24; g.lineBetween(x, y, x + 14 + r() * 10, y - 12 - r() * 10); }
  return { w, h };
}

// ------------------------------------------------------------------ units

export const UNIT_TEX = { w: 64, h: 72, footY: 64 };

function drawUnit(g: G, u: UnitDef) {
  const m = u.model;
  const s = m.scale;
  const cx = UNIT_TEX.w / 2, fy = UNIT_TEX.footY;
  const skin = 0xe0b890;
  const dark = shade(m.body, 0.6);
  const S = (v: number) => v * s;
  const humanoid = (h: number, robe = false) => {
    if (robe) {
      poly(g, m.body, [[cx - S(7), fy], [cx + S(7), fy], [cx + S(4), fy - S(h * 0.65)], [cx - S(4), fy - S(h * 0.65)]]);
      poly(g, dark, [[cx + S(1), fy], [cx + S(7), fy], [cx + S(4), fy - S(h * 0.65)], [cx + S(1), fy - S(h * 0.65)]], 0.5);
    } else {
      g.fillStyle(0x3a3028); g.fillRect(cx - S(4), fy - S(h * 0.35), S(3), S(h * 0.35)); g.fillRect(cx + S(1), fy - S(h * 0.35), S(3), S(h * 0.35));
      g.fillStyle(m.body); g.fillRoundedRect(cx - S(5), fy - S(h * 0.72), S(10), S(h * 0.42), S(2));
      g.fillStyle(dark, 0.5); g.fillRect(cx + S(1), fy - S(h * 0.72), S(4), S(h * 0.42));
    }
    g.fillStyle(skin); g.fillCircle(cx, fy - S(h * 0.82), S(3.6));
    g.fillStyle(m.accent); g.slice(cx, fy - S(h * 0.82), S(4), Math.PI, 0, false); g.fillPath();
    return fy - S(h * 0.6);
  };
  switch (m.shape) {
    case 'infantry': {
      const hy = humanoid(26);
      g.lineStyle(S(2), 0xd8dce0); g.lineBetween(cx + S(6), hy, cx + S(14), hy - S(10));
      g.fillStyle(m.accent); g.fillRect(cx - S(10), hy - S(4), S(5), S(9));
      break;
    }
    case 'shield': {
      const hy = humanoid(27);
      g.lineStyle(S(2), 0xd8dce0); g.lineBetween(cx + S(6), hy, cx + S(13), hy - S(9));
      g.fillStyle(m.accent); g.fillRoundedRect(cx - S(12), hy - S(9), S(10), S(16), S(3));
      g.fillStyle(0xe0b84a); g.fillCircle(cx - S(7), hy - S(1), S(2));
      break;
    }
    case 'polearm': {
      const hy = humanoid(27);
      g.lineStyle(S(1.5), 0x6a4a2a); g.lineBetween(cx + S(7), fy - S(2), cx + S(7), fy - S(40));
      poly(g, 0xd8dce0, [[cx + S(7), fy - S(40)], [cx + S(13), fy - S(34)], [cx + S(7), fy - S(31)]]);
      g.fillStyle(m.accent); g.fillRect(cx - S(5), hy - S(2), S(10), S(3));
      break;
    }
    case 'archer': {
      const hy = humanoid(25);
      g.lineStyle(S(1.5), 0x7a5228); g.beginPath(); g.arc(cx + S(6), hy - S(3), S(9), -1.2, 1.2); g.strokePath();
      g.lineStyle(1, 0xe8e0d0); g.lineBetween(cx + S(9.3), hy - S(11.4), cx + S(9.3), hy + S(5.4));
      g.fillStyle(m.accent); g.fillRect(cx - S(8), hy - S(8), S(3), S(10));
      break;
    }
    case 'caster': {
      const hy = humanoid(27, true);
      g.lineStyle(S(1.5), 0x6a4a2a); g.lineBetween(cx + S(8), fy, cx + S(8), fy - S(34));
      g.fillStyle(m.accent, 0.35); g.fillCircle(cx + S(8), fy - S(36), S(6));
      g.fillStyle(m.accent); g.fillCircle(cx + S(8), fy - S(36), S(3));
      void hy;
      break;
    }
    case 'cavalry': {
      // horse / stag
      g.fillStyle(shade(m.body, 0.6));
      for (const lx of [-9, -5, 5, 9]) g.fillRect(cx + S(lx), fy - S(9), S(2), S(9));
      g.fillStyle(m.body); g.fillEllipse(cx, fy - S(12), S(26), S(10));
      g.fillStyle(shade(m.body, 0.8)); g.fillEllipse(cx + S(13), fy - S(18), S(8), S(10));
      g.fillStyle(m.body); g.fillEllipse(cx + S(16), fy - S(21), S(7), S(5));
      // rider
      g.fillStyle(m.accent); g.fillRoundedRect(cx - S(4), fy - S(30), S(8), S(13), S(2));
      g.fillStyle(skin); g.fillCircle(cx, fy - S(33), S(3.4));
      g.fillStyle(m.accent); g.slice(cx, fy - S(33), S(3.8), Math.PI, 0, false); g.fillPath();
      g.lineStyle(S(1.5), 0xd8d0c0); g.lineBetween(cx - S(6), fy - S(20), cx + S(22), fy - S(30));
      break;
    }
    case 'siege': {
      g.fillStyle(0x5a3a20); g.fillRect(cx - S(14), fy - S(12), S(28), S(5));
      g.fillStyle(0x3a2a1a); g.fillCircle(cx - S(9), fy - S(4), S(4)); g.fillCircle(cx + S(9), fy - S(4), S(4));
      g.fillStyle(m.body); g.fillRect(cx - S(4), fy - S(22), S(8), S(12));
      g.lineStyle(S(2), shade(m.body, 1.2)); g.lineBetween(cx, fy - S(20), cx - S(14), fy - S(34));
      g.fillStyle(0x6a6a62); g.fillCircle(cx - S(15), fy - S(35), S(3.5));
      break;
    }
    case 'flyer': {
      const y = fy - S(30);
      poly(g, shade(m.body, 0.8), [[cx, y], [cx - S(18), y - S(8)], [cx - S(12), y + S(3)]]);
      poly(g, m.body, [[cx, y], [cx + S(18), y - S(10)], [cx + S(12), y + S(3)]]);
      g.fillStyle(m.accent); g.fillEllipse(cx, y + S(1), S(8), S(12));
      g.fillStyle(shade(m.accent, 1.2)); g.fillCircle(cx + S(2), y - S(5), S(3));
      break;
    }
    case 'beast': {
      g.fillStyle(shade(m.body, 0.6));
      for (const lx of [-6, -2, 3, 7]) g.fillRect(cx + S(lx), fy - S(6), S(2), S(6));
      g.fillStyle(m.body); g.fillEllipse(cx, fy - S(9), S(20), S(9));
      g.fillStyle(shade(m.body, 1.1)); g.fillEllipse(cx + S(10), fy - S(12), S(9), S(8));
      g.fillStyle(m.accent);
      for (let i = 0; i < 4; i++) poly(g, m.accent, [[cx - S(7) + i * S(4), fy - S(12)], [cx - S(5) + i * S(4), fy - S(19)], [cx - S(3) + i * S(4), fy - S(12)]]);
      g.fillStyle(0xffe060); g.fillCircle(cx + S(12), fy - S(13), S(1.2));
      break;
    }
    case 'ram': {
      g.fillStyle(0x3a2a1a);
      for (const lx of [-8, 6]) g.fillRect(cx + S(lx), fy - S(7), S(3), S(7));
      g.fillStyle(m.body); g.fillCircle(cx, fy - S(14), S(12));
      g.fillStyle(shade(m.body, 1.2)); g.fillCircle(cx - S(4), fy - S(18), S(5));
      g.fillStyle(shade(m.body, 0.7)); g.fillCircle(cx + S(5), fy - S(10), S(4));
      g.lineStyle(S(3), m.accent); g.beginPath(); g.arc(cx + S(10), fy - S(18), S(6), -1.5, 1.5); g.strokePath();
      break;
    }
    case 'giant': {
      g.fillStyle(shade(m.body, 0.55)); g.fillRect(cx - S(6), fy - S(12), S(5), S(12)); g.fillRect(cx + S(2), fy - S(12), S(5), S(12));
      g.fillStyle(m.body); g.fillRoundedRect(cx - S(9), fy - S(28), S(18), S(17), S(4));
      g.fillStyle(shade(m.body, 0.75)); g.fillRect(cx + S(2), fy - S(28), S(7), S(17));
      g.fillStyle(m.body); g.fillCircle(cx - S(11), fy - S(22), S(4)); g.fillCircle(cx + S(11), fy - S(22), S(4));
      g.fillStyle(m.accent); g.fillCircle(cx, fy - S(32), S(5));
      g.fillStyle(m.accent, 0.3); g.fillCircle(cx, fy - S(26), S(16));
      g.lineStyle(S(2.5), shade(m.accent, 1.1)); g.lineBetween(cx + S(12), fy - S(20), cx + S(18), fy - S(38));
      break;
    }
  }
}

function drawBuilder(g: G) {
  const cx = UNIT_TEX.w / 2, fy = UNIT_TEX.footY;
  g.fillStyle(0x3a3028); g.fillRect(cx - 4, fy - 8, 3, 8); g.fillRect(cx + 1, fy - 8, 3, 8);
  g.fillStyle(0x8a6a40); g.fillRoundedRect(cx - 6, fy - 20, 12, 13, 3);
  g.fillStyle(0x6a4a2a); g.fillRect(cx - 6, fy - 11, 12, 2);
  g.fillStyle(0xe0b890); g.fillCircle(cx, fy - 23, 4);
  g.fillStyle(0xe0c050); g.slice(cx, fy - 24, 5, Math.PI, 0, false); g.fillPath();
  g.lineStyle(2, 0x6a4a2a); g.lineBetween(cx + 7, fy - 12, cx + 12, fy - 24);
  g.fillStyle(0x9aa0a8); g.fillRect(cx + 9, fy - 28, 8, 5);
  g.fillStyle(0x7a5a30); g.fillRect(cx - 10, fy - 18, 5, 8);
}

// ------------------------------------------------------------------ misc / fx

function genFx(scene: Phaser.Scene) {
  const g = hiGraphics(scene);
  const make = (key: string, w: number, h: number, draw: () => void) => { g.clear(); draw(); gen(g, key, w, h); };
  make('shadow', 48, 24, () => { g.fillStyle(0x000000, 0.35); g.fillEllipse(24, 12, 44, 20); });
  make('ring', 64, 32, () => { g.lineStyle(3, 0xffffff, 1); g.strokeEllipse(32, 16, 58, 27); });
  make('ringthin', 128, 64, () => { g.lineStyle(2, 0xffffff, 1); g.strokeEllipse(64, 32, 124, 60); });
  make('disc', 128, 64, () => { g.fillStyle(0xffffff, 1); g.fillEllipse(64, 32, 128, 64); });
  make('dot', 8, 8, () => { g.fillStyle(0xffffff); g.fillCircle(4, 4, 4); });
  make('spark', 16, 16, () => { g.fillStyle(0xffffff, 0.35); g.fillCircle(8, 8, 8); g.fillStyle(0xffffff); g.fillCircle(8, 8, 3); });
  make('arrow', 18, 4, () => { g.fillStyle(0x5a3a20); g.fillRect(0, 1, 14, 2); g.fillStyle(0xd8dce0); g.fillTriangle(13, 0, 18, 2, 13, 4); });
  make('orb', 16, 16, () => { g.fillStyle(0xffffff, 0.3); g.fillCircle(8, 8, 8); g.fillStyle(0xffffff); g.fillCircle(8, 8, 4); });
  make('boulder', 12, 12, () => { g.fillStyle(0x6a6a62); g.fillCircle(6, 6, 5); g.fillStyle(0x8a8a82); g.fillCircle(4, 4, 2); });
  make('flag', 16, 12, () => { g.fillStyle(0xffffff); g.fillTriangle(0, 0, 16, 4, 0, 11); });
  make('beam', 32, 256, () => {
    for (let i = 0; i < 16; i++) { g.fillStyle(0xffffff, 0.06 + i * 0.03); g.fillRect(i, 0, 32 - i * 2, 256); }
  });
  make('coin', 14, 14, () => {
    g.fillStyle(0x6b4a10); g.fillCircle(7, 7, 7);
    g.fillStyle(0xe0a820); g.fillCircle(7, 7, 6);
    g.fillStyle(0xffe070); g.fillCircle(6, 6, 4);
    g.fillStyle(0xfff6c0); g.fillCircle(5, 5, 1.5);
  });
  make('plus', 10, 10, () => { g.fillStyle(0xffffff); g.fillRect(4, 0, 2, 10); g.fillRect(0, 4, 10, 2); });
  make('scaffold', 128, 96, () => {
    g.lineStyle(2, 0x8a6a40);
    for (let i = 0; i < 5; i++) g.lineBetween(24 + i * 20, 90, 24 + i * 20, 30);
    for (let j = 0; j < 3; j++) g.lineBetween(20, 80 - j * 22, 108, 80 - j * 22);
    g.lineBetween(24, 90, 104, 30);
  });
  make('tile_hl', TW, TH, () => { poly(g, 0xffffff, [[TW / 2, 0], [TW, TH / 2], [TW / 2, TH], [0, TH / 2]]); });
  g.destroy();
}

/** Generates every texture the game needs; nothing is loaded from disk. */
export function generateTextures(scene: Phaser.Scene) {
  genTerrain(scene);
  genFx(scene);
  const g = hiGraphics(scene);
  for (const def of Object.values(BUILDINGS)) {
    g.clear();
    const { w, h } = drawBuilding(g, def);
    gen(g, `b_${def.id}`, w, h);
  }
  for (const team of [0, 1] as const) {
    g.clear();
    const { w, h } = drawCastle(g, team);
    gen(g, `castle${team}`, w, h);
    g.clear();
    drawRuin(g, team);
    gen(g, `ruin${team}`, w, h);
  }
  for (const u of Object.values(UNITS)) {
    g.clear();
    drawUnit(g, u);
    gen(g, `u_${u.id}`, UNIT_TEX.w, UNIT_TEX.h);
  }
  g.clear();
  drawBuilder(g);
  gen(g, 'builder', UNIT_TEX.w, UNIT_TEX.h);
  g.destroy();
}
