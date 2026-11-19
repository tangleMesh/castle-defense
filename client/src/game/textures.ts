import Phaser from 'phaser';
import { BUILDINGS, CASTLE_SIZE, FACTION_IDS, UNITS } from '@bc/shared';
import { SK, TX, TY } from './iso';
import { blurred, grad, paper, radial, softEllipse, rng as prng } from './paint';
import { UNIT_CANVAS, UNIT_FRAMES, outline, paintBuilder, paintUnit } from './units';
import './races';
import { PROP_SIZE, paintBush, paintOak, paintPine, paintRock } from './props';
import { footX, buildingCanvasSize, castleCanvasSize, paintBuilding, paintCastle, paintRuin, takeAnchors, type Anchors } from './structures';

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
    // One tile: the top (far) edge leans SK right of the bottom edge.
    poly(g, base, [[SK, 0], [TX + SK, 0], [TX, TY], [0, TY]]);
    for (let i = 0; i < speckCount; i++) {
      const u = r(), v = r();
      const x = u * TX + (1 - v) * SK, y = v * TY;
      g.fillStyle(specks[i % specks.length], 0.55);
      g.fillRect(x, y, 2, 1 + (r() > 0.6 ? 1 : 0));
    }
    // subtle bevel on the lower and right edges
    g.lineStyle(1, shade(base, 0.82), 0.5);
    g.lineBetween(0, TY, TX, TY);
    g.lineBetween(TX + SK, 0, TX, TY);
    gen(g, key, TX + SK, TY);
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
    bakeStructure(scene, `tree_p${i}`, P.w, P.h, P.w / 2, P.footY, P.footY, (c) => paintPine(c, 201 + i * 7));
    bakeStructure(scene, `tree_o${i}`, O.w, O.h, O.w / 2, O.footY, O.footY, (c) => paintOak(c, 301 + i * 11));
  }
  for (let i = 0; i < 2; i++) {
    const B = PROP_SIZE.bush;
    bakeStructure(scene, `bush${i}`, B.w, B.h, B.w / 2, B.footY, B.footY, (c) => paintBush(c, 401 + i * 5, i === 0));
  }
  for (let i = 0; i < 6; i++) {
    const R = PROP_SIZE.rock;
    bakeStructure(scene, `rock${i}`, R.w, R.h, R.w / 2, R.footY, R.footY - 8, (c) => paintRock(c, 77 + i * 13));
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
function bakeStructure(scene: Phaser.Scene, key: string, w: number, h: number, footX: number, footY: number, groundY: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const R = TEX_RES;
  const src = paper(w, h, R);
  paint(src.ctx);
  const anchors = takeAnchors(footX, footY);
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
  ORIGINS.set(key, { x: footX / out.w, y: footY / out.h });
  ANCHORS.set(key, anchors);
}

function genStructures(scene: Phaser.Scene) {
  for (const def of Object.values(BUILDINGS)) {
    const { w, h } = buildingCanvasSize(def.size, def.model.height);
    bakeStructure(scene, `b_${def.id}`, w, h, footX(w, def.size), h - 6, h - 6 - def.size * TY, (ctx) => paintBuilding(ctx, def, w, h));
  }
  const { w, h } = castleCanvasSize();
  for (const team of [0, 1] as const) {
    bakeStructure(scene, `castle${team}`, w, h, footX(w, CASTLE_SIZE), h - 6, h - 6 - CASTLE_SIZE * TY, (ctx) => paintCastle(ctx, team, w, h));
    bakeStructure(scene, `ruin${team}`, w, h, footX(w, CASTLE_SIZE), h - 6, h - 6 - CASTLE_SIZE * TY, (ctx) => paintRuin(ctx, team, w, h));
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
  // Rescue-strike rune circle (already squashed to the iso ground plane).
  const rc = paper(256, 128, TEX_RES);
  const c = rc.ctx;
  c.save(); c.translate(128, 64); c.scale(1, 0.5);
  c.strokeStyle = 'rgba(255,236,160,0.95)'; c.lineWidth = 3;
  c.beginPath(); c.arc(0, 0, 120, 0, Math.PI * 2); c.stroke();
  c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, 108, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.arc(0, 0, 62, 0, Math.PI * 2); c.stroke();
  // rune marks between the outer rings
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    c.save(); c.rotate(a); c.translate(114, 0);
    c.lineWidth = 2; c.beginPath();
    if (i % 3 === 0) { c.moveTo(-4, -5); c.lineTo(4, 0); c.lineTo(-4, 5); }
    else if (i % 3 === 1) { c.moveTo(0, -5); c.lineTo(0, 5); c.moveTo(-3, -2); c.lineTo(3, 2); }
    else { c.arc(0, 0, 3.5, 0, Math.PI * 2); }
    c.stroke(); c.restore();
  }
  // sun star in the middle
  c.lineWidth = 2;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.beginPath(); c.moveTo(Math.cos(a) * 20, Math.sin(a) * 20); c.lineTo(Math.cos(a) * (i % 2 ? 52 : 100), Math.sin(a) * (i % 2 ? 52 : 100)); c.stroke(); }
  c.fillStyle = 'rgba(255,240,180,0.9)'; c.beginPath(); c.arc(0, 0, 14, 0, Math.PI * 2); c.fill();
  c.restore();
  add('runeCircle', rc);
  // Light beam: bright core, soft edges, fading out at the top and into the ground at the bottom.
  const bm = paper(32, 256, 1);
  bm.ctx.fillStyle = grad(bm.ctx, 0, 0, 32, 0, [[0, 0xffffff, 0], [0.3, 0xffffff, 0.55], [0.5, 0xffffff, 1], [0.7, 0xffffff, 0.55], [1, 0xffffff, 0]]);
  bm.ctx.fillRect(0, 0, 32, 256);
  bm.ctx.globalCompositeOperation = 'destination-in';
  bm.ctx.fillStyle = grad(bm.ctx, 0, 0, 0, 256, [[0, 0xffffff, 0], [0.35, 0xffffff, 0.9], [0.86, 0xffffff, 1], [1, 0xffffff, 0]]);
  bm.ctx.fillRect(0, 0, 32, 256);
  add('beam', bm);
  // Scorched earth left behind by a strike.
  const sc = paper(200, 100, TEX_RES);
  const r2 = prng(9);
  softEllipse(sc.ctx, 100, 50, 96, 46, 0x1a1208, 0.75);
  softEllipse(sc.ctx, 100, 50, 60, 28, 0x0a0604, 0.6);
  for (let i = 0; i < 40; i++) {
    const a = r2() * Math.PI * 2, d = Math.sqrt(r2()) * 80;
    softEllipse(sc.ctx, 100 + Math.cos(a) * d, 50 + Math.sin(a) * d * 0.5, 3 + r2() * 4, 1.5 + r2() * 2, r2() < 0.5 ? 0xff8030 : 0x2a1a0a, 0.6);
  }
  add('scorch', sc);
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

export const UNIT_TEX = { w: UNIT_CANVAS.w, h: UNIT_CANVAS.h, footY: UNIT_CANVAS.footY };

/** Every unit (and the builder) in idle/walk/attack frames, outlined for readability. */
function genUnits(scene: Phaser.Scene) {
  const add = (key: string, paint: (c: CanvasRenderingContext2D) => void) => {
    const p = paper(UNIT_CANVAS.w, UNIT_CANVAS.h, TEX_RES);
    paint(p.ctx);
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addCanvas(key, outline(p.canvas, TEX_RES * 0.9));
  };
  for (const u of Object.values(UNITS)) for (const f of UNIT_FRAMES) add(`u_${u.id}${f}`, (c) => paintUnit(c, u, f));
  for (const f of UNIT_FRAMES) add(`builder${f}`, (c) => paintBuilder(c, f));
  for (const id of FACTION_IDS) for (const f of UNIT_FRAMES) add(`builder_${id}${f}`, (c) => paintBuilder(c, f, id));
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
  make('tile_hl', TX + SK, TY, () => { poly(g, 0xffffff, [[SK, 0], [TX + SK, 0], [TX, TY], [0, TY]]); });
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
  genUnits(scene);
  g.destroy();
}
