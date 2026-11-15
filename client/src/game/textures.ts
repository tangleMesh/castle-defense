import Phaser from 'phaser';
import { BUILDINGS, CASTLE_SIZE, UNITS, type UnitDef } from '@bc/shared';
import { TH, TW } from './iso';
import { blurred, paper, radial, softEllipse, rng as prng } from './paint';
import { PROP_SIZE, paintBush, paintOak, paintPine, paintRock } from './props';
import { buildingCanvasSize, castleCanvasSize, paintBuilding, paintCastle, paintRuin, takeAnchors, type Anchors } from './structures';

type G = Phaser.GameObjects.Graphics;

export function shade(c: number, f: number): number {
  const r = Math.min(255, Math.max(0, Math.round(((c >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((c >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((c & 255) * f)));
  return (r << 16) | (g << 8) | b;
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

  // Wild grass outside the battlefield: a bit darker and lusher than the playable map.
  const wild = [0x48782f, 0x4b7a31, 0x44722c, 0x507f35];
  wild.forEach((c, i) => tile(`w${i}`, c, 51 + i, [0x5f9040, 0x365c22, 0x6c9c48], 18));

  // Painted forest props and boulders (with baked soft shadows).
  for (let i = 0; i < 3; i++) {
    const P = PROP_SIZE.pine, O = PROP_SIZE.oak;
    bakeStructure(scene, `tree_p${i}`, P.w, P.h, P.footY, P.footY, (c) => paintPine(c, 201 + i * 7));
    bakeStructure(scene, `tree_o${i}`, O.w, O.h, O.footY, O.footY, (c) => paintOak(c, 301 + i * 11));
  }
  for (let i = 0; i < 2; i++) {
    const B = PROP_SIZE.bush;
    bakeStructure(scene, `bush${i}`, B.w, B.h, B.footY, B.footY, (c) => paintBush(c, 401 + i * 5, i === 0));
  }
  for (let i = 0; i < 6; i++) {
    const R = PROP_SIZE.rock;
    bakeStructure(scene, `rock${i}`, R.w, R.h, R.footY, R.footY - 8, (c) => paintRock(c, 77 + i * 13));
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

// ------------------------------------------------------------------ painted structures

/** Normalised sprite origin (the front ground corner) of baked structure textures. */
export const ORIGINS = new Map<string, { x: number; y: number }>();
/** Flag / smoke / light anchor points of structure textures, relative to the origin (logical px). */
export const ANCHORS = new Map<string, Anchors>();

export function originOf(key: string): { x: number; y: number } {
  return ORIGINS.get(key) ?? { x: 0.5, y: 1 };
}

/**
 * Paint a structure and bake its soft cast shadow underneath: the silhouette is skewed onto
 * the ground towards the lower right (sun in the upper left) and blurred.
 */
function bakeStructure(scene: Phaser.Scene, key: string, w: number, h: number, footY: number, groundY: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const R = TEX_RES;
  const src = paper(w, h, R);
  paint(src.ctx);
  const anchors = takeAnchors(w / 2, footY);
  const kx = 0.8, ky = 0.4;
  const extraW = kx * groundY + 12;
  const outH = Math.max(h, groundY + ky * groundY + 12);
  const out = paper(w + extraW, outH, R);
  const sil = paper(w + extraW, outH, R);
  const s = sil.ctx;
  s.translate(0, groundY);
  s.transform(1, 0, -kx, -ky, 0, 0);
  s.translate(0, -groundY);
  s.drawImage(src.canvas, 0, 0, w, h);
  s.setTransform(1, 0, 0, 1, 0, 0);
  s.globalCompositeOperation = 'source-in';
  s.fillStyle = 'rgb(10,14,30)';
  s.fillRect(0, 0, sil.canvas.width, sil.canvas.height);
  const soft = blurred(sil.canvas, 2.5 * R);
  out.ctx.globalAlpha = 0.34;
  out.ctx.drawImage(soft, 0, 0, out.w, out.h);
  out.ctx.globalAlpha = 1;
  out.ctx.drawImage(src.canvas, 0, 0, w, h);
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, out.canvas);
  ORIGINS.set(key, { x: w / 2 / out.w, y: footY / out.h });
  ANCHORS.set(key, anchors);
}

function genStructures(scene: Phaser.Scene) {
  for (const def of Object.values(BUILDINGS)) {
    const { w, h } = buildingCanvasSize(def.size, def.model.height);
    bakeStructure(scene, `b_${def.id}`, w, h, h - 6, h - 6 - def.size * TH / 2, (ctx) => paintBuilding(ctx, def, w, h));
  }
  const { w, h } = castleCanvasSize();
  for (const team of [0, 1] as const) {
    bakeStructure(scene, `castle${team}`, w, h, h - 6, h - 6 - CASTLE_SIZE * TH / 2, (ctx) => paintCastle(ctx, team, w, h));
    bakeStructure(scene, `ruin${team}`, w, h, h - 6, h - 6 - CASTLE_SIZE * TH / 2, (ctx) => paintRuin(ctx, team, w, h));
  }
}

function genSoftFx(scene: Phaser.Scene) {
  const add = (key: string, p: ReturnType<typeof paper>) => { if (scene.textures.exists(key)) scene.textures.remove(key); scene.textures.addCanvas(key, p.canvas); };
  const glow = paper(48, 48, TEX_RES);
  glow.ctx.fillStyle = radial(glow.ctx, 24, 24, 24, [[0, 0xfff0c0, 0.95], [0.18, 0xffc060, 0.6], [0.5, 0xff8a20, 0.18], [1, 0xff6010, 0]]);
  glow.ctx.fillRect(0, 0, 48, 48);
  add('glow', glow);
  const puff = paper(40, 30, TEX_RES);
  const r = prng(3);
  for (let i = 0; i < 6; i++) softEllipse(puff.ctx, 12 + r() * 16, 10 + r() * 10, 8 + r() * 6, 6 + r() * 4, 0xd8d4cc, 0.5);
  add('puff', puff);
}

/** Pennant on a short pole, in several wave phases (tinted with the team colour at runtime). */
export const FLAG_FRAMES = 6;
function genFlags(scene: Phaser.Scene) {
  for (let f = 0; f < FLAG_FRAMES; f++) {
    const p = paper(26, 24, TEX_RES);
    const c = p.ctx;
    c.fillStyle = '#2a1c12'; c.fillRect(1, 2, 1.6, 22);
    c.fillStyle = '#d8b050'; c.beginPath(); c.arc(1.8, 2, 1.4, 0, Math.PI * 2); c.fill();
    const ph = (f / FLAG_FRAMES) * Math.PI * 2;
    const wave = (x: number) => Math.sin(ph - x * 0.35) * (x / 20) * 2.2;
    c.beginPath();
    c.moveTo(2.6, 3);
    for (let x = 0; x <= 20; x += 2) c.lineTo(2.6 + x, 3 + x * 0.12 + wave(x));
    for (let x = 20; x >= 0; x -= 2) c.lineTo(2.6 + x, 12 - x * 0.12 + wave(x));
    c.closePath();
    const g = c.createLinearGradient(0, 0, 24, 0);
    for (let x = 0; x <= 20; x += 4) { const sh = 0.78 + 0.22 * Math.cos(ph - x * 0.35); g.addColorStop(x / 24, `rgb(${255 * sh | 0},${255 * sh | 0},${255 * sh | 0})`); }
    c.fillStyle = g; c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 0.6; c.stroke();
    if (scene.textures.exists(`flag${f}`)) scene.textures.remove(`flag${f}`);
    scene.textures.addCanvas(`flag${f}`, p.canvas);
  }
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
  genStructures(scene);
  genFlags(scene);
  genSoftFx(scene);
  const g = hiGraphics(scene);
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
