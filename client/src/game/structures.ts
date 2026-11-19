import { CASTLE_SIZE, type BuildingDef } from '@bc/shared';
import { EX, EY, SK, TEAM_COLORS, TX, TY } from './iso';
import { BUILDING_PAINTERS, PLINTHS } from './painters';
import { css, fillPoly, grad, lit, mix, path, radial, rng, shade, softEllipse, type Ctx } from './paint';

/**
 * Painted structures in the front 3/4 view (see iso.ts). Faces are drawn in their own local
 * coordinates (u along the wall in tiles, v up in px) via canvas transforms, so masonry, timber
 * and planks follow the perspective. The "left" face is the front (south) wall facing the viewer
 * and the sun; the "right" face is the narrow east wall, in shade.
 */

export type Pt = { x: number; y: number };
export const pt = (x: number, y: number): Pt => ({ x, y });
/** Half a tile on screen along x / y (for ground ellipses under footprints). */
export const HX = TX / 2, HY = TY / 2;
/** Margin (px) around a footprint on structure canvases, for overhangs and props. */
export const STRUCT_MARGIN = 24;
/** Ground centre of an s×s footprint whose front-right (south-east) corner is at (ox, oy). */
export const centreOf = (ox: number, oy: number, s: number): Pt => pt(ox - (s * (EX.x + EY.x)) / 2, oy - (s * (EX.y + EY.y)) / 2);
/** Front-right corner of a k×k box centred on the ground point c. */
export const cornerFor = (c: Pt, k: number): Pt => pt(c.x + (k * (EX.x + EY.x)) / 2, c.y + (k * (EX.y + EY.y)) / 2);
/**
 * Canvas x of the front-right ground corner of an s×s footprint: the back-right corner leans
 * s × SK further right, and that has to fit inside the margin too.
 */
export const footX = (w: number, s: number) => w - STRUCT_MARGIN - s * SK;
export const lerp = (a: Pt, b: Pt, t: number): Pt => pt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
export const up = (p: Pt, h: number): Pt => pt(p.x, p.y - h);

export const LIGHT = { left: 1.0, right: 0.66, top: 1.12 };

/** Points of interest collected while painting (canvas coords): flag tops, chimney mouths, light sources. */
export interface Anchors { flags: Pt[]; smoke: Pt[]; glow: Pt[] }
export let A: Anchors = { flags: [], smoke: [], glow: [] };
/** Anchors painted since the last call, relative to (ox, oy). */
export function takeAnchors(ox: number, oy: number): Anchors {
  const rel = (p: Pt) => pt(p.x - ox, p.y - oy);
  const out = { flags: A.flags.map(rel), smoke: A.smoke.map(rel), glow: A.glow.map(rel) };
  A = { flags: [], smoke: [], glow: [] };
  return out;
}
export const BEAM = 0x3e2a1c;

export interface Box {
  /** Ground corners: L(eft), F(ront/bottom), R(ight), B(ack/top). */
  L: Pt; F: Pt; R: Pt; B: Pt;
  /** Same corners at the top of the walls. */
  tL: Pt; tF: Pt; tR: Pt; tB: Pt;
  a: number; b: number; h: number;
  /** Centre of the top face. */
  c: Pt;
}

/**
 * Box with its front-right (south-east) ground corner at (ox, oy): a tiles along the front face
 * (x), b along the east face (y), h px tall. L = south-west, R = north-east, B = north-west.
 */
export function boxGeo(ox: number, oy: number, a: number, b: number, h: number): Box {
  const F = pt(ox, oy), L = pt(ox - a * EX.x, oy - a * EX.y), R = pt(ox - b * EY.x, oy - b * EY.y);
  const B = pt(ox - a * EX.x - b * EY.x, oy - a * EX.y - b * EY.y);
  const tL = up(L, h), tF = up(F, h), tR = up(R, h), tB = up(B, h);
  return { L, F, R, B, tL, tF, tR, tB, a, b, h, c: lerp(tL, tR, 0.5) };
}

export type FacePainter = (ctx: Ctx, U: number, V: number, light: number) => void;

/** Paint the left (sunlit) face: local (u, v) with u ∈ [0, a] tiles from L to F, v ∈ [0, h] px upwards. */
export function faceLeft(ctx: Ctx, g: Box, paint: FacePainter) {
  ctx.save();
  path(ctx, [[g.L.x, g.L.y], [g.F.x, g.F.y], [g.tF.x, g.tF.y], [g.tL.x, g.tL.y]]);
  ctx.clip();
  ctx.transform(EX.x, EX.y, 0, -1, g.L.x, g.L.y);
  paint(ctx, g.a, g.h, LIGHT.left);
  ctx.restore();
}

/** Paint the right (shaded) face: u ∈ [0, b] tiles from F to R. */
export function faceRight(ctx: Ctx, g: Box, paint: FacePainter) {
  ctx.save();
  path(ctx, [[g.F.x, g.F.y], [g.R.x, g.R.y], [g.tR.x, g.tR.y], [g.tF.x, g.tF.y]]);
  ctx.clip();
  ctx.transform(-EY.x, -EY.y, 0, -1, g.F.x, g.F.y);
  paint(ctx, g.b, g.h, LIGHT.right);
  ctx.restore();
}

/** Paint the top face: u ∈ [0, a] from L towards F, w ∈ [0, b] from L towards B. */
export function faceTop(ctx: Ctx, g: Box, paint: (ctx: Ctx, U: number, W: number) => void) {
  ctx.save();
  path(ctx, [[g.tL.x, g.tL.y], [g.tF.x, g.tF.y], [g.tR.x, g.tR.y], [g.tB.x, g.tB.y]]);
  ctx.clip();
  ctx.transform(EX.x, EX.y, -EY.x, -EY.y, g.tL.x, g.tL.y);
  paint(ctx, g.a, g.b);
  ctx.restore();
}

/** Ambient occlusion at the foot of a wall and a soft edge darkening at the corners. */
export function wallShading(ctx: Ctx, U: number, V: number, light: number) {
  ctx.fillStyle = grad(ctx, 0, 0, 0, Math.min(14, V), [[0, 0x000000, 0.42], [1, 0x000000, 0]]);
  ctx.fillRect(0, 0, U, Math.min(14, V));
  if (light < 1) {
    ctx.fillStyle = grad(ctx, 0, 0, U, 0, [[0, 0x000000, 0], [1, 0x000000, 0.18]]);
    ctx.fillRect(0, 0, U, V);
  } else {
    // Warm bounce light from the sunlit ground near the base.
    ctx.fillStyle = grad(ctx, 0, V, 0, V - 6, [[0, 0xfff0c0, 0.16], [1, 0xfff0c0, 0]]);
    ctx.fillRect(0, V - 6, U, 6);
  }
}

// ------------------------------------------------------------------ materials

export function stoneWall(base: number, seed: number, rowH = 5.5): FacePainter {
  return (ctx, U, V, light) => {
    const r = rng(seed);
    ctx.fillStyle = css(lit(shade(base, 0.5), light));
    ctx.fillRect(0, 0, U, V);
    let row = 0;
    for (let v = 0; v < V; v += rowH, row++) {
      let u = row % 2 ? -0.12 * r() : 0;
      while (u < U) {
        const len = 0.12 + r() * 0.24;
        const f = light * (0.82 + r() * 0.3);
        const c = mix(base, r() < 0.5 ? 0x8a7a60 : 0x6a7080, r() * 0.4);
        ctx.fillStyle = css(lit(c, f));
        ctx.fillRect(u + 0.014, v + 0.55, len - 0.028, rowH - 1.1);
        // lit upper edge, dark lower edge of each block
        ctx.fillStyle = css(0xfff4d8, 0.12 * light);
        ctx.fillRect(u + 0.014, v + rowH - 1.6, len - 0.028, 1);
        ctx.fillStyle = css(0x000000, 0.12);
        ctx.fillRect(u + 0.014, v + 0.55, len - 0.028, 0.8);
        if (r() < 0.07) { ctx.fillStyle = css(0x4a5a2a, 0.5); ctx.fillRect(u + 0.03, v + 0.6, len * 0.5, 1.5); }
        u += len;
      }
    }
    // moss and grime creeping up from the ground
    for (let i = 0; i < U * 30; i++) {
      const u = r() * U, v = Math.pow(r(), 2.2) * 9;
      ctx.fillStyle = css(r() < 0.5 ? 0x4a5a28 : 0x3a3020, 0.35);
      ctx.fillRect(u, v, 0.03 + r() * 0.05, 1 + r() * 2);
    }
    wallShading(ctx, U, V, light);
  };
}

export function timberWall(plaster: number, seed: number): FacePainter {
  return (ctx, U, V, light) => {
    const r = rng(seed);
    ctx.fillStyle = css(lit(plaster, light));
    ctx.fillRect(0, 0, U, V);
    // plaster stains
    for (let i = 0; i < U * 14; i++) {
      ctx.fillStyle = css(r() < 0.5 ? 0xffffff : 0x8a7a5a, 0.06 + r() * 0.06);
      ctx.fillRect(r() * U, r() * V, 0.04 + r() * 0.1, 1 + r() * 4);
    }
    const beam = css(lit(BEAM, light));
    const bw = 0.055;
    const posts = Math.max(2, Math.round(U / 0.42));
    ctx.fillStyle = beam;
    for (let i = 0; i <= posts; i++) ctx.fillRect((U - bw) * (i / posts), 0, bw, V);
    ctx.fillRect(0, 0, U, 2.4);
    ctx.fillRect(0, V * 0.52, U, 2.2);
    ctx.fillRect(0, V - 2.4, U, 2.4);
    // diagonal braces in the lower panels
    for (let i = 0; i < posts; i++) {
      const u0 = (U - bw) * (i / posts) + bw, u1 = (U - bw) * ((i + 1) / posts);
      if (i % 2) fillPoly(ctx, [[u0, 2.4], [u0 + 0.05, 2.4], [u1, V * 0.52 - 0.5], [u1 - 0.05, V * 0.52 - 0.5]], beam);
      else fillPoly(ctx, [[u1, 2.4], [u1 - 0.05, 2.4], [u0, V * 0.52 - 0.5], [u0 + 0.05, V * 0.52 - 0.5]], beam);
    }
    // stone plinth
    stoneWall(0x8a8478, seed + 1, 4)(ctx, U, 0, light);
    ctx.fillStyle = css(lit(0x7a7468, light));
    ctx.fillRect(0, 0, U, 2.4);
    wallShading(ctx, U, V, light);
  };
}

export function plankWall(wood: number, seed: number): FacePainter {
  return (ctx, U, V, light) => {
    const r = rng(seed);
    const w = 0.11;
    for (let u = 0, i = 0; u < U; u += w, i++) {
      ctx.fillStyle = css(lit(mix(wood, i % 2 ? 0x5a4028 : 0xa08060, 0.18 + r() * 0.12), light * (0.9 + r() * 0.15)));
      ctx.fillRect(u, 0, w, V);
      ctx.fillStyle = css(0x000000, 0.35);
      ctx.fillRect(u + w - 0.012, 0, 0.012, V);
      // grain
      ctx.fillStyle = css(0x000000, 0.1);
      for (let k = 0; k < 3; k++) ctx.fillRect(u + r() * w, r() * V, 0.006, 3 + r() * 8);
    }
    ctx.fillStyle = css(lit(BEAM, light));
    ctx.fillRect(0, V * 0.35, U, 2);
    ctx.fillRect(0, V - 2.5, U, 2.5);
    ctx.fillStyle = css(0x2a2a2a, 0.8);
    for (let u = 0.05; u < U; u += w) { ctx.fillRect(u, V * 0.35 + 0.6, 0.015, 0.8); }
    wallShading(ctx, U, V, light);
  };
}

/** Window in face space (u, v = bottom-left of the opening). Warm interior light. */
export function windowAt(ctx: Ctx, u: number, v: number, w: number, h: number, light: number, arched = false) {
  const frame = css(lit(0x2a1c12, light));
  ctx.fillStyle = frame;
  ctx.fillRect(u - 0.02, v - 1, w + 0.04, h + 2 + (arched ? 2 : 0));
  ctx.fillStyle = grad(ctx, 0, v, 0, v + h, [[0, 0xffd27a, 1], [0.6, 0xc87830, 1], [1, 0x6a3a18, 1]]);
  ctx.fillRect(u, v, w, h + (arched ? 1.5 : 0));
  ctx.fillStyle = frame;
  ctx.fillRect(u + w / 2 - 0.008, v, 0.016, h);
  ctx.fillRect(u, v + h * 0.5, w, 0.8);
  ctx.fillStyle = css(lit(0x8a7a60, light));
  ctx.fillRect(u - 0.03, v - 1.6, w + 0.06, 1.2);
}

export function doorAt(ctx: Ctx, u: number, w: number, h: number, light: number) {
  ctx.fillStyle = css(lit(0x6a6458, light));
  ctx.fillRect(u - 0.03, 0, w + 0.06, h + 2);
  ctx.fillStyle = css(lit(0x4a3020, light * 0.9));
  ctx.fillRect(u, 0, w, h);
  ctx.fillStyle = css(0x000000, 0.35);
  for (let k = 1; k < 3; k++) ctx.fillRect(u + (w * k) / 3, 0, 0.01, h);
  ctx.fillStyle = css(0x2a2a2a);
  ctx.fillRect(u, h * 0.3, w, 0.9);
  ctx.fillRect(u, h * 0.75, w, 0.9);
  ctx.fillStyle = css(0xd8b060);
  ctx.fillRect(u + w * 0.78, h * 0.5, 0.02, 1.2);
}

// ------------------------------------------------------------------ roofs

export type Roof = 'tile' | 'slate' | 'thatch' | 'shingle';

/** A roof plane from an eave (e0 → e1) up to a ridge (r0 → r1), painted with courses. */
export function roofPlane(ctx: Ctx, e0: Pt, e1: Pt, r1: Pt, r0: Pt, color: number, light: number, kind: Roof, seed: number) {
  const r = rng(seed);
  ctx.save();
  path(ctx, [[e0.x, e0.y], [e1.x, e1.y], [r1.x, r1.y], [r0.x, r0.y]]);
  ctx.clip();
  const mid0 = lerp(e0, e1, 0.5), mid1 = lerp(r0, r1, 0.5);
  ctx.fillStyle = grad(ctx, mid0.x, mid0.y, mid1.x, mid1.y, [[0, lit(color, light * 0.85)], [1, lit(color, light * 1.08)]]);
  ctx.fillRect(Math.min(e0.x, e1.x, r0.x, r1.x) - 2, Math.min(e0.y, e1.y, r0.y, r1.y) - 2, 400, 400);
  const rows = kind === 'thatch' ? 9 : 7 + Math.round(Math.hypot(mid1.x - mid0.x, mid1.y - mid0.y) / 5);
  for (let i = 0; i < rows; i++) {
    const t = i / rows;
    const a = lerp(e0, r0, t), b = lerp(e1, r1, t);
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (kind === 'thatch') {
      // straw strokes running down the slope
      const n = Math.ceil(len / 1.6);
      for (let k = 0; k < n; k++) {
        const p = lerp(a, b, (k + r()) / n);
        const dx = (e0.x - r0.x) / rows, dy = (e0.y - r0.y) / rows;
        ctx.strokeStyle = css(lit(mix(color, r() < 0.5 ? 0xf0d890 : 0x5a4020, 0.25 + r() * 0.2), light * (0.85 + r() * 0.3)), 0.9);
        ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + dx * 1.4 + (r() - 0.5), p.y + dy * 1.4); ctx.stroke();
      }
    } else {
      ctx.strokeStyle = css(0x000000, kind === 'slate' ? 0.32 : 0.28);
      ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = css(0xffffff, 0.1 * light);
      ctx.beginPath(); ctx.moveTo(a.x, a.y - 1); ctx.lineTo(b.x, b.y - 1); ctx.stroke();
      // individual tiles: short joints between courses, staggered
      const n = Math.ceil(len / (kind === 'shingle' ? 4 : 5));
      const ni = lerp(e0, r0, (i + 1) / rows), nj = lerp(e1, r1, (i + 1) / rows);
      for (let k = 0; k < n; k++) {
        const s = (k + (i % 2) * 0.5) / n;
        const p = lerp(a, b, s), q = lerp(ni, nj, s);
        ctx.strokeStyle = css(0x000000, 0.18);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        if (r() < 0.2) { ctx.fillStyle = css(r() < 0.5 ? 0xffffff : 0x000000, 0.07); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.lineTo(q.x + 3, q.y - 1); ctx.lineTo(p.x + 3, p.y - 1); ctx.fill(); }
      }
    }
  }
  // moss patches on old roofs
  if (kind !== 'slate') {
    for (let i = 0; i < 6; i++) {
      const p = lerp(lerp(e0, e1, r()), lerp(r0, r1, r()), r() * 0.5);
      softEllipse(ctx, p.x, p.y, 3 + r() * 4, 1.5 + r() * 2, 0x5a6a2a, 0.35);
    }
  }
  ctx.restore();
  // eave shadow line and ridge highlight
  ctx.strokeStyle = css(0x000000, 0.45); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(e0.x, e0.y); ctx.lineTo(e1.x, e1.y); ctx.stroke();
  ctx.strokeStyle = css(0xfff0d0, 0.25 * light); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(r0.x, r0.y); ctx.lineTo(r1.x, r1.y); ctx.stroke();
}

/** Gable roof over a box; the ridge runs along the left face (from back-left to front-right). */
export function gableRoof(ctx: Ctx, g: Box, rise: number, color: number, kind: Roof, wall: FacePainter, seed: number) {
  const o = 3; // eave overhang in px
  const tL = pt(g.tL.x - o, g.tL.y + 1), tF = pt(g.tF.x, g.tF.y + o * 0.6), tR = pt(g.tR.x + o, g.tR.y + 1), tB = pt(g.tB.x, g.tB.y - 1);
  const m1 = up(lerp(g.tL, g.tB, 0.5), rise), m2 = up(lerp(g.tF, g.tR, 0.5), rise);
  // back slope
  roofPlane(ctx, tR, tB, m1, m2, color, LIGHT.right * 0.95, kind, seed + 1);
  // gable end on the right face (wall material)
  ctx.save();
  path(ctx, [[g.tF.x, g.tF.y], [g.tR.x, g.tR.y], [m2.x, m2.y + 2]]);
  ctx.clip();
  ctx.transform(-EY.x, -EY.y, 0, -1, g.F.x, g.F.y);
  wall(ctx, g.b, g.h + rise, LIGHT.right);
  ctx.restore();
  // a small round window in the gable
  const gw = lerp(lerp(g.tF, g.tR, 0.5), m2, 0.4);
  ctx.fillStyle = css(0x2a1c12); ctx.beginPath(); ctx.ellipse(gw.x, gw.y, 2.6, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = css(0xe8a850); ctx.beginPath(); ctx.ellipse(gw.x, gw.y, 1.7, 2.1, 0, 0, Math.PI * 2); ctx.fill();
  // front (sunlit) slope
  roofPlane(ctx, tL, tF, m2, m1, color, LIGHT.top, kind, seed + 2);
  // bargeboard along the gable edge
  ctx.strokeStyle = css(lit(BEAM, 0.8)); ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(tF.x, tF.y); ctx.lineTo(m2.x, m2.y); ctx.lineTo(tR.x, tR.y); ctx.stroke();
  return { m1, m2 };
}

/** Four-sided hip / pyramid roof. */
export function hipRoof(ctx: Ctx, g: Box, rise: number, color: number, kind: Roof, seed: number) {
  const o = 3;
  const tL = pt(g.tL.x - o, g.tL.y), tF = pt(g.tF.x, g.tF.y + o * 0.6), tR = pt(g.tR.x + o, g.tR.y), tB = pt(g.tB.x, g.tB.y - 1);
  const apex = up(g.c, rise);
  roofPlane(ctx, tB, tL, apex, apex, color, 0.8, kind, seed);
  roofPlane(ctx, tR, tB, apex, apex, color, 0.7, kind, seed + 1);
  roofPlane(ctx, tF, tR, apex, apex, color, LIGHT.right, kind, seed + 2);
  roofPlane(ctx, tL, tF, apex, apex, color, LIGHT.top, kind, seed + 3);
  return apex;
}

/** Cylinder tower with stone courses; returns the top centre. */
export function roundTower(ctx: Ctx, cx: number, by: number, rx: number, h: number, stone: number, seed: number) {
  const ry = rx / 2;
  const r = rng(seed);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, by, rx, ry, 0, 0, Math.PI);
  ctx.lineTo(cx - rx, by - h);
  ctx.ellipse(cx, by - h, rx, ry, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = grad(ctx, cx - rx, 0, cx + rx, 0, [[0, lit(stone, 0.86)], [0.3, lit(stone, 1.08)], [0.75, lit(stone, 0.7)], [1, lit(stone, 0.55)]]);
  ctx.fillRect(cx - rx, by - h - ry, rx * 2, h + ry * 2);
  // courses and staggered joints, following the curvature
  const rowH = 5.5;
  for (let v = 0, row = 0; v < h + ry; v += rowH, row++) {
    const y = by - v;
    ctx.strokeStyle = css(0x000000, 0.28); ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.ellipse(cx, y, rx, ry, 0, 0, Math.PI); ctx.stroke();
    for (let k = 0; k < 7; k++) {
      const th = ((k + (row % 2) * 0.5) / 7) * Math.PI;
      const x = cx + Math.cos(th) * rx, yy = y + Math.sin(th) * ry;
      ctx.strokeStyle = css(0x000000, 0.2);
      ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x, yy - rowH + 0.5); ctx.stroke();
      if (r() < 0.25) { ctx.fillStyle = css(r() < 0.5 ? 0xffffff : 0x000000, 0.06); ctx.fillRect(x - 3, yy - rowH + 1, 5, rowH - 1.5); }
    }
  }
  ctx.fillStyle = grad(ctx, 0, by + ry, 0, by - 12, [[0, 0x000000, 0.45], [1, 0x000000, 0]]);
  ctx.fillRect(cx - rx, by - 12, rx * 2, 12 + ry);
  ctx.restore();
  // arrow slits
  ctx.fillStyle = css(0x140e0a);
  ctx.fillRect(cx - rx * 0.35, by - h * 0.62, 1.6, 6);
  ctx.fillRect(cx + rx * 0.15, by - h * 0.35, 1.4, 5);
  return pt(cx, by - h);
}

export function coneRoof(ctx: Ctx, cx: number, by: number, rx: number, h: number, color: number, seed: number) {
  const ry = rx / 2;
  const r = rng(seed);
  const apex = pt(cx, by - h);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(apex.x, apex.y);
  ctx.lineTo(cx - rx, by);
  ctx.ellipse(cx, by, rx, ry, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = grad(ctx, cx - rx, 0, cx + rx, 0, [[0, lit(color, 0.9)], [0.35, lit(color, 1.18)], [0.8, lit(color, 0.7)], [1, lit(color, 0.55)]]);
  ctx.fillRect(cx - rx - 1, apex.y, rx * 2 + 2, h + ry + 1);
  // slate courses (ellipses shrinking to the apex) and radial joints
  for (let i = 1; i < 9; i++) {
    const t = i / 9;
    ctx.strokeStyle = css(0x000000, 0.25); ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.ellipse(cx, by - h * (1 - t), rx * t, ry * t, 0, 0, Math.PI); ctx.stroke();
    for (let k = 0; k < 6; k++) {
      const th = ((k + (i % 2) * 0.5) / 6) * Math.PI;
      const x0 = cx + Math.cos(th) * rx * t, y0 = by - h * (1 - t) + Math.sin(th) * ry * t;
      const t2 = (i - 1) / 9;
      const x1 = cx + Math.cos(th) * rx * t2, y1 = by - h * (1 - t2) + Math.sin(th) * ry * t2;
      ctx.strokeStyle = css(0x000000, 0.14);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    if (r() < 0.5) softEllipse(ctx, cx - rx * t * 0.4, by - h * (1 - t), 2, 1, 0xffffff, 0.12);
  }
  ctx.restore();
  ctx.strokeStyle = css(0x000000, 0.5); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(cx, by, rx, ry, 0, 0, Math.PI); ctx.stroke();
  // finial
  ctx.fillStyle = css(0xd8b050); ctx.beginPath(); ctx.arc(apex.x, apex.y - 1, 1.6, 0, Math.PI * 2); ctx.fill();
  return apex;
}

/** Crenellations along the two front top edges of a box. */
export function crenellate(ctx: Ctx, g: Box, stone: number, seed: number, count = 0, frontOnly = false) {
  const r = rng(seed);
  const edges: Array<[Pt, Pt, boolean]> = [...(frontOnly ? [] : [[g.tB, g.tL, true], [g.tR, g.tB, false]] as Array<[Pt, Pt, boolean]>), [g.tL, g.tF, true], [g.tF, g.tR, false]];
  for (const [p, q, leftFace] of edges) {
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    const n = count || Math.max(2, Math.round(len / 9));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.25) / n, t1 = (i + 0.65) / n;
      const a = lerp(p, q, t), b = lerp(p, q, t1);
      const hgt = 4.5;
      const col = lit(mix(stone, 0x8a7a60, r() * 0.2), leftFace ? LIGHT.left : LIGHT.right);
      fillPoly(ctx, [[a.x, a.y], [b.x, b.y], [b.x, b.y - hgt], [a.x, a.y - hgt]], css(col));
      // merlon top
      // inwards: from the front edge towards the back, from the east edge towards the west
      const dx = leftFace ? -EY.x * 0.12 : -EX.x * 0.12, dy = leftFace ? -EY.y * 0.12 : -EX.y * 0.12;
      fillPoly(ctx, [[a.x, a.y - hgt], [b.x, b.y - hgt], [b.x + dx, b.y - hgt + dy], [a.x + dx, a.y - hgt + dy]], css(lit(stone, LIGHT.top)));
    }
  }
}

/** Flat walkway on top of a box (stone flags). */
export function stoneTop(ctx: Ctx, g: Box, stone: number) {
  faceTop(ctx, g, (c, U, W) => {
    c.fillStyle = css(lit(shade(stone, 0.9), LIGHT.top));
    c.fillRect(0, 0, U, W);
    c.fillStyle = css(0x000000, 0.1);
    for (let u = 0; u < U; u += 0.33) c.fillRect(u, 0, 0.015, W);
    for (let w = 0; w < W; w += 0.33) c.fillRect(0, w, U, 0.015);
    // weathering
    c.fillStyle = grad(c, 0, 0, U, W, [[0, 0xffffff, 0.06], [1, 0x000000, 0.12]]);
    c.fillRect(0, 0, U, W);
  });
}

/** Mossy, root-veined earth under Thornwild structures (no masonry). */
function earthPatch(ctx: Ctx, ox: number, oy: number, s: number, seed: number) {
  const r = rng(seed);
  const c = centreOf(ox, oy, s);
  softEllipse(ctx, c.x, c.y, s * HX * 0.95, s * HY * 0.95, 0x4a3a22, 0.75);
  softEllipse(ctx, c.x - 6, c.y - 3, s * HX * 0.7, s * HY * 0.7, 0x5a6a30, 0.5);
  for (let i = 0; i < 140; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.9;
    const x = c.x + Math.cos(a) * s * HX * d, y = c.y + Math.sin(a) * s * HY * d;
    ctx.strokeStyle = css(r() < 0.5 ? 0x6a8a34 : 0x3e5a22, 0.7); ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.4) * 2, y - 2 - r() * 2); ctx.stroke();
  }
  for (let i = 0; i < 6; i++) {
    const x = c.x + (r() - 0.5) * s * HX * 1.4, y = c.y + (r() - 0.5) * s * HY * 1.2;
    ctx.fillStyle = css(lit(0x8a8478, 0.8 + r() * 0.3)); ctx.beginPath(); ctx.ellipse(x, y, 2 + r() * 2.5, 1.3 + r() * 1.2, 0, 0, Math.PI * 2); ctx.fill();
  }
}

/** Cobbled top of a plinth: irregular stones, darker joints. */
export function cobbleTop(ctx: Ctx, g: Box, stone: number, seed: number) {
  const r = rng(seed + 77);
  faceTop(ctx, g, (c, U, W) => {
    c.fillStyle = css(lit(shade(stone, 0.7), LIGHT.top)); c.fillRect(0, 0, U, W);
    for (let u = 0; u < U; u += 0.16) for (let w = 0; w < W; w += 0.16) {
      c.fillStyle = css(lit(mix(stone, r() < 0.5 ? 0xa09480 : 0x707468, r() * 0.4), LIGHT.top * (0.85 + r() * 0.25)));
      c.fillRect(u + 0.015 + r() * 0.02, w + 0.015 + r() * 0.02, 0.12, 0.12);
    }
  });
}

/** Soft contact shadow + plinth under a footprint. */
function footing(ctx: Ctx, ox: number, oy: number, s: number, ground = 0x6a6050) {
  const c = centreOf(ox, oy, s);
  softEllipse(ctx, c.x + 6, c.y + 3, s * HX * 1.2, s * HY * 1.25, 0x0c0a08, 0.4);
  // trodden earth around the base
  const g = boxGeo(ox, oy, s, s, 0);
  fillPoly(ctx, [[g.L.x, g.L.y], [g.F.x, g.F.y], [g.R.x, g.R.y], [g.B.x, g.B.y]], css(mix(ground, 0x5a4a30, 0.4), 0.55));
}

// ------------------------------------------------------------------ buildings

export function buildingCanvasSize(size: number, height: number) {
  return { w: size * (TX + SK) + STRUCT_MARGIN * 2, h: size * TY + height * 2.6 + 40 };
}

/** Paint a building onto ctx (canvas of buildingCanvasSize). Foot (front-right corner) at (footX(w, size), h - 6). */
export function paintBuilding(ctx: Ctx, def: BuildingDef, w: number, h: number) {
  const m = def.model;
  const s = def.size;
  const ox = footX(w, def.size), oy = h - 6;
  const mid = centreOf(ox, oy, s);
  const seed = [...def.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  footing(ctx, ox, oy, s);
  if (def.faction === 'thornwild') {
    earthPatch(ctx, ox, oy, s, seed);
  } else if (def.faction === 'shardbound') {
    crystalPlinth(ctx, ox, oy, s, seed);
  } else if (def.faction === 'cogspark') {
    steelDeck(ctx, ox, oy, s, seed);
  } else if (PLINTHS[def.faction]) {
    PLINTHS[def.faction](ctx, ox, oy, s, seed);
  } else {
    // low cobbled plinth, slightly inset
    const plinth = boxGeo(ox, oy - 1, s - 0.08, s - 0.08, 3);
    faceLeft(ctx, plinth, stoneWall(0x8a8072, seed, 3));
    faceRight(ctx, plinth, stoneWall(0x8a8072, seed + 1, 3));
    cobbleTop(ctx, plinth, 0x8a8072, seed);
  }
  /** Front-right corner of a k-tile box centred on the footprint (lifted onto the plinth). */
  const inset = (k: number) => { const c = cornerFor(mid, k); return [c.x, c.y - 3] as const; };
  /** Centre-front point of a round structure k tiles across (huts, mounds, trees). */
  const stand = (k: number) => [mid.x, mid.y + (k * TY) / 2 - 3] as const;
  const H = m.height * 1.6;

  switch (m.style) {
    case 'hall': {
      const [x, y] = inset(1.8);
      const g = boxGeo(x, y, 1.8, 1.5, H * 0.62);
      const wall = timberWall(mix(m.wall, 0xe8dcc0, 0.55), seed);
      faceLeft(ctx, g, (c, U, V, l) => { wall(c, U, V, l); doorAt(c, U * 0.42, 0.24, Math.min(13, V * 0.6), l); windowAt(c, U * 0.12, V * 0.6, 0.16, 5, l); windowAt(c, U * 0.74, V * 0.6, 0.16, 5, l); });
      faceRight(ctx, g, (c, U, V, l) => { wall(c, U, V, l); windowAt(c, U * 0.3, V * 0.58, 0.16, 5, l); windowAt(c, U * 0.65, V * 0.58, 0.16, 5, l); });
      const { m1, m2 } = gableRoof(ctx, g, H * 0.55, m.roof, def.id.includes('counting') ? 'tile' : 'slate', wall, seed);
      chimney(ctx, lerp(m1, m2, 0.25), seed);
      A.flags.push(m2);
      if (def.id.includes('counting')) coinSign(ctx, g);
      break;
    }
    case 'workshop': {
      const [x, y] = inset(1.85);
      const g = boxGeo(x, y, 1.85, 1.6, H * 0.55);
      const lower = stoneWall(mix(m.wall, 0x8a8478, 0.5), seed);
      const wall = plankWall(m.wall, seed);
      faceLeft(ctx, g, (c, U, V, l) => { wall(c, U, V, l); lower(c, U, Math.min(V, 7), l); doorAt(c, U * 0.3, 0.36, Math.min(14, V * 0.62), l); windowAt(c, U * 0.78, V * 0.55, 0.14, 4, l); });
      faceRight(ctx, g, (c, U, V, l) => { wall(c, U, V, l); lower(c, U, Math.min(V, 7), l); windowAt(c, U * 0.4, V * 0.55, 0.2, 5, l); });
      const { m1, m2 } = gableRoof(ctx, g, H * 0.42, m.roof, 'shingle', wall, seed);
      chimney(ctx, lerp(m1, m2, 0.7), seed + 5, true);
      A.flags.push(m1);
      if (def.id.includes('siege')) siegeArm(ctx, g);
      else if (def.id.includes('crossbow') || def.id.includes('arbalest')) targetBoard(ctx, g);
      break;
    }
    case 'stable': {
      const [x, y] = inset(1.9);
      const g = boxGeo(x, y, 1.9, 1.4, H * 0.5);
      const wall = plankWall(m.wall, seed);
      faceLeft(ctx, g, (c, U, V, l) => { wall(c, U, V, l); for (let i = 0; i < 3; i++) stallDoor(c, 0.15 + i * 0.52, 0.32, Math.min(11, V * 0.62), l); });
      faceRight(ctx, g, (c, U, V, l) => { wall(c, U, V, l); windowAt(c, U * 0.35, V * 0.55, 0.22, 4, l); });
      A.flags.push(gableRoof(ctx, g, H * 0.5, m.roof, m.roof === 0x3a8a3a || def.faction === 'thornwild' ? 'thatch' : 'shingle', wall, seed).m2);
      fence(ctx, ox, oy, s, seed);
      hay(ctx, pt(ox - s * TX + 4, oy - 6));
      break;
    }
    case 'tower': {
      const [x, y] = inset(1.3);
      const g = boxGeo(x, y, 1.3, 1.3, H);
      const wall = stoneWall(m.wall, seed);
      faceLeft(ctx, g, (c, U, V, l) => { wall(c, U, V, l); doorAt(c, U * 0.35, 0.3, 10, l); slit(c, U * 0.5, V * 0.6); slit(c, U * 0.5, V * 0.85); });
      faceRight(ctx, g, (c, U, V, l) => { wall(c, U, V, l); slit(c, U * 0.4, V * 0.7); });
      // overhanging fighting top
      const top = boxGeo(x, y - H + 6, 1.45, 1.45, 7);
      const tw = stoneWall(shade(m.wall, 1.05), seed + 3, 3.5);
      faceLeft(ctx, top, tw); faceRight(ctx, top, tw);
      stoneTop(ctx, top, m.wall);
      crenellate(ctx, top, m.wall, seed, 3);
      brazier(ctx, top.c);
      A.flags.push(lerp(top.tB, top.c, 0.5));
      break;
    }
    case 'temple': {
      const [x, y] = inset(1.8);
      const g = boxGeo(x, y, 1.8, 1.8, H * 0.6);
      const wall = stoneWall(m.wall, seed, 6.5);
      faceLeft(ctx, g, (c, U, V, l) => {
        wall(c, U, V, l);
        // columns
        for (let i = 0; i < 4; i++) { c.fillStyle = css(lit(0xf4ecd8, l)); c.fillRect(0.12 + i * 0.44, 2, 0.08, V - 4); c.fillStyle = css(0x000000, 0.15); c.fillRect(0.18 + i * 0.44, 2, 0.02, V - 4); }
        doorAt(c, U * 0.42, 0.26, V * 0.6, l);
      });
      faceRight(ctx, g, (c, U, V, l) => { wall(c, U, V, l); windowAt(c, U * 0.25, V * 0.4, 0.14, 9, l, true); windowAt(c, U * 0.62, V * 0.4, 0.14, 9, l, true); });
      stoneTop(ctx, g, m.wall);
      dome(ctx, g.c, 21, H * 0.5, m.roof);
      A.flags.push(pt(g.c.x + 10, g.c.y - 8));
      A.glow.push(pt(g.c.x, g.c.y - 8 - H * 0.33 - 9));
      break;
    }
    case 'nest': {
      const [x, y] = inset(1);
      // timber scaffold tower
      const g = boxGeo(x, y, 1, 1, H);
      const posts = (c: Ctx, U: number, V: number, l: number) => {
        c.fillStyle = css(lit(BEAM, l));
        c.fillRect(0, 0, 0.08, V); c.fillRect(U - 0.08, 0, 0.08, V);
        for (let v = 6; v < V; v += 12) { fillPoly(c, [[0, v], [0.06, v], [U, v + 10], [U - 0.06, v + 10]], css(lit(BEAM, l * 0.9))); }
      };
      faceLeft(ctx, g, posts); faceRight(ctx, g, posts);
      const top = boxGeo(x, y - H, 1.3, 1.3, 3);
      faceLeft(ctx, top, plankWall(0x8a6a40, seed)); faceRight(ctx, top, plankWall(0x8a6a40, seed + 1));
      nest(ctx, top.c, m.roof, seed);
      A.flags.push(top.tB);
      break;
    }
    case 'banner': {
      const [x, y] = inset(1);
      const g = boxGeo(x, y, 1, 1, 9);
      const wall = stoneWall(0x8a8478, seed);
      faceLeft(ctx, g, wall); faceRight(ctx, g, wall); stoneTop(ctx, g, 0x8a8478);
      const base = g.c;
      ctx.strokeStyle = css(0x2a1c12); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(base.x, base.y - H - 18); ctx.stroke();
      ctx.strokeStyle = css(0x8a6a40); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(base.x - 0.6, base.y); ctx.lineTo(base.x - 0.6, base.y - H - 18); ctx.stroke();
      // cross bar and hanging war banner
      ctx.strokeStyle = css(0x2a1c12); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(base.x - 12, base.y - H - 12); ctx.lineTo(base.x + 12, base.y - H - 12); ctx.stroke();
      hangingBanner(ctx, base.x, base.y - H - 12, 22, H * 0.85, m.roof, 'sun');
      ctx.fillStyle = css(0xe0b84a); ctx.beginPath(); ctx.arc(base.x, base.y - H - 20, 2.4, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'citadel': {
      const [x, y] = inset(1.9);
      const g = boxGeo(x, y, 1.9, 1.9, H * 0.42);
      const wall = stoneWall(m.wall, seed, 6);
      faceLeft(ctx, g, (c, U, V, l) => { wall(c, U, V, l); doorAt(c, U * 0.4, 0.3, V * 0.7, l); });
      faceRight(ctx, g, (c, U, V, l) => { wall(c, U, V, l); windowAt(c, U * 0.3, V * 0.45, 0.14, 8, l, true); windowAt(c, U * 0.65, V * 0.45, 0.14, 8, l, true); });
      stoneTop(ctx, g, m.wall);
      // back-right tower, then the keep, then the front-left tower (painter's order)
      roundTower(ctx, g.tR.x - 5, g.tR.y + 14, 7, 22, m.wall, seed + 3);
      coneRoof(ctx, g.tR.x - 5, g.tR.y - 8, 9, 18, m.roof, seed + 1);
      const kc = cornerFor(g.c, 0.95);
      const k = boxGeo(kc.x, kc.y, 0.95, 0.95, H * 0.62);
      const kw = stoneWall(shade(m.wall, 1.04), seed + 2, 6);
      faceLeft(ctx, k, (c, U, V, l) => { kw(c, U, V, l); windowAt(c, U * 0.35, V * 0.55, 0.2, 10, l, true); });
      faceRight(ctx, k, (c, U, V, l) => { kw(c, U, V, l); windowAt(c, U * 0.35, V * 0.55, 0.2, 10, l, true); });
      stoneTop(ctx, k, m.wall);
      dome(ctx, k.c, 13, 18, m.roof);
      roundTower(ctx, g.tL.x + 5, g.tL.y + 14, 7, 22, m.wall, seed + 1);
      coneRoof(ctx, g.tL.x + 5, g.tL.y - 8, 9, 18, m.roof, seed);
      sunHalo(ctx, k.c.x, k.c.y - 26);
      A.flags.push(pt(g.tR.x - 5, g.tR.y - 26));
      A.glow.push(pt(k.c.x, k.c.y - 26));
      break;
    }
    case 'tree': {
      const [x, y] = stand(1.4);
      greatTree(ctx, x, y, H, m.wall, m.roof, seed, def.special);
      A.flags.push(pt(x + 8, y - H * 0.85 - (12 + H * 0.2) - (14 + H * 0.26) * 0.9));
      break;
    }
    case 'hut': {
      const [x, y] = stand(1.4);
      const cx = x, by = y - 14;
      roundHut(ctx, cx, by, 38, H * 0.55, m.wall, m.roof, seed);
      totem(ctx, cx + 44, by + 16, m.roof);
      A.flags.push(pt(cx, by - H * 0.5 * 2.3));
      A.smoke.push(pt(cx, by - H * 0.5 * 2.3 + 2));
      break;
    }
    case 'mound': {
      const [x, y] = stand(1.6);
      burrow(ctx, x, y, H, m.wall, m.roof, seed);
      A.flags.push(pt(x + 6, y - 36 - H * 0.5));
      A.glow.push(pt(x - 14, y - 16));
      break;
    }
    case 'shrine': {
      const [x, y] = inset(1.2);
      const g = boxGeo(x, y, 1.2, 1.2, 9);
      const wall = stoneWall(m.wall, seed, 4);
      faceLeft(ctx, g, wall); faceRight(ctx, g, wall); stoneTop(ctx, g, m.wall);
      standingStones(ctx, g, m.wall, seed);
      crystal(ctx, g.c.x, g.c.y - 4, H * 0.7 + 14, m.roof);
      A.flags.push(pt(g.tB.x, g.tB.y - 6));
      A.glow.push(pt(g.c.x, g.c.y - 4 - (H * 0.7 + 14) * 0.5));
      break;
    }
    default:
      paintNewStyle(ctx, def, { ox, oy, s, mid, seed, H, inset, stand });
  }
}

// ------------------------------------------------------------------ props on buildings

export function chimney(ctx: Ctx, p: Pt, seed: number, wide = false) {
  const g = boxGeo(p.x, p.y + 6, wide ? 0.32 : 0.24, wide ? 0.32 : 0.24, 14);
  const w = stoneWall(0x7a7064, seed, 3.5);
  faceLeft(ctx, g, w); faceRight(ctx, g, w);
  fillPoly(ctx, [[g.tL.x, g.tL.y], [g.tF.x, g.tF.y], [g.tR.x, g.tR.y], [g.tB.x, g.tB.y]], css(0x1a1410));
  A.smoke.push(g.c);
}

function slit(c: Ctx, u: number, v: number) {
  c.fillStyle = css(0x120c08);
  c.fillRect(u, v - 3, 0.04, 6);
}

function stallDoor(c: Ctx, u: number, w: number, h: number, l: number) {
  c.fillStyle = css(lit(0x2a1c12, l)); c.fillRect(u - 0.02, 0, w + 0.04, h + 1.5);
  c.fillStyle = css(lit(0x7a5a38, l)); c.fillRect(u, 0, w, h * 0.55);
  c.fillStyle = css(0x140e0a); c.fillRect(u, h * 0.55, w, h * 0.45);
  c.fillStyle = css(lit(0x4a3020, l));
  fillPoly(c, [[u, 0.5], [u + 0.04, 0.5], [u + w, h * 0.5], [u + w - 0.04, h * 0.5]], css(lit(0x4a3020, l)));
}

function fence(ctx: Ctx, ox: number, oy: number, s: number, seed: number) {
  const r = rng(seed);
  const g = boxGeo(ox, oy - 3, s, s, 0);
  const a = lerp(g.L, g.F, 0.05), b = lerp(g.L, g.F, 0.5);
  ctx.strokeStyle = css(0x5a3e24); ctx.lineWidth = 1.4;
  for (let i = 0; i <= 5; i++) {
    const p = lerp(a, b, i / 5);
    ctx.beginPath(); ctx.moveTo(p.x, p.y + 1); ctx.lineTo(p.x, p.y - 7 - r()); ctx.stroke();
  }
  ctx.strokeStyle = css(0x8a6a40); ctx.lineWidth = 1.2;
  for (const dy of [-3, -6]) { ctx.beginPath(); ctx.moveTo(a.x, a.y + dy); ctx.lineTo(b.x, b.y + dy); ctx.stroke(); }
}

function hay(ctx: Ctx, p: Pt) {
  softEllipse(ctx, p.x + 2, p.y + 1, 8, 3, 0x000000, 0.35);
  ctx.fillStyle = grad(ctx, p.x - 6, 0, p.x + 6, 0, [[0, 0xe8c870], [1, 0x9a7a30]]);
  ctx.beginPath(); ctx.ellipse(p.x, p.y - 3, 6, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = css(0x6a4a20, 0.6); ctx.lineWidth = 0.7;
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(p.x + i * 2, p.y - 7); ctx.lineTo(p.x + i * 2.4, p.y + 1); ctx.stroke(); }
}

function coinSign(ctx: Ctx, g: Box) {
  const p = lerp(g.tL, g.tF, 0.5);
  ctx.strokeStyle = css(0x2a1c12); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(p.x, p.y + 6); ctx.lineTo(p.x - 7, p.y + 2); ctx.stroke();
  ctx.fillStyle = radial(ctx, p.x - 8, p.y + 6, 5, [[0, 0xfff0a0], [0.6, 0xe0a820], [1, 0x8a5a10]]);
  ctx.beginPath(); ctx.arc(p.x - 8, p.y + 7, 4, 0, Math.PI * 2); ctx.fill();
}

function siegeArm(ctx: Ctx, g: Box) {
  const p = lerp(g.F, g.R, 0.75);
  ctx.strokeStyle = css(0x4a3020); ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(p.x + 6, p.y - 2); ctx.lineTo(p.x + 14, p.y - 24); ctx.stroke();
  ctx.fillStyle = css(0x6a6a62); ctx.beginPath(); ctx.arc(p.x + 15, p.y - 26, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = css(0x3a2a1a); ctx.beginPath(); ctx.arc(p.x + 4, p.y, 3, 0, Math.PI * 2); ctx.fill();
}

function targetBoard(ctx: Ctx, g: Box) {
  const p = lerp(g.F, g.R, 0.9);
  ctx.strokeStyle = css(0x4a3020); ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(p.x + 8, p.y + 2); ctx.lineTo(p.x + 8, p.y - 14); ctx.stroke();
  const cols = [0xe8dcc0, 0xc03a2a, 0xe8dcc0, 0xc03a2a];
  cols.forEach((c, i) => { ctx.fillStyle = css(lit(c, 0.9)); ctx.beginPath(); ctx.ellipse(p.x + 8, p.y - 14, 6 - i * 1.4, 7 - i * 1.6, 0, 0, Math.PI * 2); ctx.fill(); });
}

export function brazier(ctx: Ctx, p: Pt) {
  A.glow.push(pt(p.x, p.y - 4));
  ctx.fillStyle = css(0x2a2420); ctx.beginPath(); ctx.ellipse(p.x, p.y - 2, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = radial(ctx, p.x, p.y - 4, 4, [[0, 0xfff0a0], [0.5, 0xff9a30], [1, 0xc04010, 0]]);
  ctx.beginPath(); ctx.ellipse(p.x, p.y - 4, 3.5, 4, 0, 0, Math.PI * 2); ctx.fill();
}

export function torch(ctx: Ctx, p: Pt) {
  ctx.fillStyle = css(0x2a1c12); ctx.fillRect(p.x - 0.8, p.y - 2, 1.6, 7);
  ctx.fillStyle = css(0x4a4440); ctx.fillRect(p.x - 2, p.y - 3, 4, 1.6);
}

export function dome(ctx: Ctx, c: Pt, r: number, h: number, color: number) {
  // drum
  ctx.fillStyle = grad(ctx, c.x - r, 0, c.x + r, 0, [[0, lit(0xe8e0cc, 0.95)], [0.4, lit(0xe8e0cc, 1.1)], [1, lit(0xe8e0cc, 0.6)]]);
  ctx.beginPath(); ctx.ellipse(c.x, c.y, r, r / 2, 0, 0, Math.PI); ctx.lineTo(c.x - r, c.y - 6); ctx.ellipse(c.x, c.y - 6, r, r / 2, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
  // dome
  ctx.fillStyle = radial(ctx, c.x - r * 0.35, c.y - 6 - h * 0.6, r * 1.4, [[0, lit(color, 1.35)], [0.45, lit(color, 1)], [1, lit(color, 0.55)]]);
  ctx.beginPath(); ctx.ellipse(c.x, c.y - 6, r, r / 2, 0, 0, Math.PI); ctx.bezierCurveTo(c.x - r, c.y - 6 - h * 0.88, c.x + r, c.y - 6 - h * 0.88, c.x + r, c.y - 6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = css(0x000000, 0.18); ctx.lineWidth = 0.8;
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(c.x + i * r * 0.36, c.y - 6 + Math.sqrt(1 - (i * 0.36) ** 2) * r * 0.5); ctx.quadraticCurveTo(c.x + i * r * 0.3, c.y - 6 - h * 0.5, c.x, c.y - 6 - h * 0.66); ctx.stroke(); }
  // spire with a sun disc
  ctx.strokeStyle = css(0xd8b050); ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(c.x, c.y - 6 - h * 0.66); ctx.lineTo(c.x, c.y - 6 - h * 0.66 - 9); ctx.stroke();
  ctx.fillStyle = radial(ctx, c.x, c.y - 8 - h * 0.66 - 9, 4, [[0, 0xfff8c0], [1, 0xe0a020]]);
  ctx.beginPath(); ctx.arc(c.x, c.y - 8 - h * 0.66 - 9, 2.6, 0, Math.PI * 2); ctx.fill();
}

function sunHalo(ctx: Ctx, x: number, y: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = radial(ctx, x, y, 34, [[0, 0xffe890, 0.35], [0.5, 0xffd060, 0.12], [1, 0xffd060, 0]]);
  ctx.beginPath(); ctx.arc(x, y, 34, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function nest(ctx: Ctx, c: Pt, accent: number, seed: number) {
  const r = rng(seed);
  softEllipse(ctx, c.x + 2, c.y + 2, 22, 9, 0x000000, 0.35);
  for (let i = 0; i < 90; i++) {
    const a = r() * Math.PI * 2, d = 14 + r() * 8;
    const x = c.x + Math.cos(a) * d, y = c.y - 4 + Math.sin(a) * d * 0.42;
    ctx.strokeStyle = css(lit(mix(0x7a5a30, 0xc0a060, r()), 0.7 + r() * 0.5)); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 12, y + (r() - 0.5) * 4); ctx.stroke();
  }
  ctx.fillStyle = css(0x3a2814); ctx.beginPath(); ctx.ellipse(c.x, c.y - 5, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
  for (let k = 0; k < 3; k++) {
    ctx.fillStyle = radial(ctx, c.x - 5 + k * 5, c.y - 7, 4, [[0, 0xffffff], [1, lit(accent, 0.9)]]);
    ctx.beginPath(); ctx.ellipse(c.x - 5 + k * 5, c.y - 6, 2.6, 3.2, 0, 0, Math.PI * 2); ctx.fill();
  }
}

/** Long cloth banner hanging from a bar at (x, y) with an emblem. */
export function hangingBanner(ctx: Ctx, x: number, y: number, w: number, h: number, color: number, emblem: 'sun' | 'moon' | 'leaf') {
  const pts: Array<[number, number]> = [[x - w / 2, y], [x + w / 2, y], [x + w / 2, y + h], [x, y + h - 6], [x - w / 2, y + h]];
  ctx.save();
  path(ctx, pts);
  ctx.clip();
  ctx.fillStyle = grad(ctx, x - w / 2, 0, x + w / 2, 0, [[0, lit(color, 1.15)], [0.35, lit(color, 0.95)], [0.6, lit(color, 1.05)], [1, lit(color, 0.6)]]);
  ctx.fillRect(x - w / 2, y, w, h);
  // folds
  ctx.fillStyle = css(0x000000, 0.12);
  ctx.fillRect(x - w * 0.12, y, w * 0.08, h);
  ctx.fillRect(x + w * 0.28, y, w * 0.1, h);
  ctx.restore();
  ctx.strokeStyle = css(0xd8b050); ctx.lineWidth = 1;
  ctx.beginPath(); for (const [i, p] of pts.entries()) { if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); } ctx.closePath(); ctx.stroke();
  emblemAt(ctx, x, y + h * 0.42, Math.min(w, h) * 0.3, emblem);
}

export function emblemAt(ctx: Ctx, x: number, y: number, r: number, emblem: 'sun' | 'moon' | 'leaf') {
  ctx.fillStyle = css(0xf0d070);
  if (emblem === 'sun') {
    ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = css(0xf0d070); ctx.lineWidth = Math.max(0.8, r * 0.14);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke(); }
  } else if (emblem === 'moon') {
    ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.arc(x + r * 0.38, y - r * 0.2, r * 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  } else {
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.4, r, 0.5, 0, Math.PI * 2); ctx.fill();
  }
}

function greatTree(ctx: Ctx, x: number, y: number, H: number, bark: number, leaf: number, seed: number, special?: boolean) {
  const r = rng(seed);
  // roots spreading over the ground
  softEllipse(ctx, x + 8, y - 6, 40, 16, 0x000000, 0.3);
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI * 0.95 + (i / 5) * Math.PI * 0.9;
    ctx.strokeStyle = css(lit(bark, 0.8 + r() * 0.3)); ctx.lineWidth = 3 - i * 0.2;
    ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.quadraticCurveTo(x + Math.cos(a) * 14, y - 6, x + Math.cos(a) * (26 + r() * 10), y - 2 + Math.sin(a) * -4); ctx.stroke();
  }
  // trunk with bark ridges
  const th = H * 0.85, tw = 8 + H * 0.07;
  ctx.fillStyle = grad(ctx, x - tw, 0, x + tw, 0, [[0, lit(bark, 0.85)], [0.3, lit(bark, 1.15)], [1, lit(bark, 0.55)]]);
  ctx.beginPath(); ctx.moveTo(x - tw, y - 8); ctx.quadraticCurveTo(x - tw * 0.5, y - th * 0.5, x - tw * 0.6, y - th - 6); ctx.lineTo(x + tw * 0.6, y - th - 6); ctx.quadraticCurveTo(x + tw * 0.5, y - th * 0.5, x + tw, y - 8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = css(0x000000, 0.25); ctx.lineWidth = 0.8;
  for (let i = 0; i < 8; i++) { const bx = x - tw * 0.7 + (i / 7) * tw * 1.4; ctx.beginPath(); ctx.moveTo(bx, y - 8); ctx.quadraticCurveTo(bx + (r() - 0.5) * 4, y - th * 0.5, bx * 0.7 + x * 0.3, y - th); ctx.stroke(); }
  // a door / hollow glowing from inside
  ctx.fillStyle = css(0x1a100a); ctx.beginPath(); ctx.ellipse(x - 2, y - 14, 4.5, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = radial(ctx, x - 2, y - 12, 6, [[0, special ? 0xc0ff80 : 0xffc060, 0.9], [1, 0x000000, 0]]);
  ctx.beginPath(); ctx.ellipse(x - 2, y - 13, 3, 5.5, 0, 0, Math.PI * 2); ctx.fill();
  // canopy
  // branches reaching into the canopy
  ctx.strokeStyle = css(lit(bark, 0.9)); ctx.lineWidth = 3;
  for (const dx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x, y - th * 0.7); ctx.quadraticCurveTo(x + dx * 10, y - th * 0.85, x + dx * 20, y - th - 6); ctx.stroke(); }
  foliage(ctx, x, y - th - (12 + H * 0.2), 24 + H * 0.4, 14 + H * 0.26, leaf, seed + 9);
  if (special) {
    // glowing fruit / spirit lights
    for (let i = 0; i < 9; i++) {
      const fx = x + (r() - 0.5) * H * 0.7, fy = y - th - 10 + (r() - 0.6) * H * 0.4;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = radial(ctx, fx, fy, 5, [[0, 0xe8ffb0, 0.9], [1, 0x80ff60, 0]]);
      ctx.beginPath(); ctx.arc(fx, fy, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  }
}

/** Painterly foliage mass: dark silhouette, mid tones and sunlit leaf dabs on the upper left. */
export function foliage(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, leaf: number, seed: number) {
  const r = rng(seed);
  const blobs: Array<[number, number, number]> = [];
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.65;
    blobs.push([cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, (0.38 + r() * 0.3) * Math.min(rx, ry * 1.4)]);
  }
  const silhouette = () => { ctx.beginPath(); for (const [bx, by, br] of blobs) { ctx.moveTo(bx + br, by); ctx.arc(bx, by, br, 0, Math.PI * 2); } };
  // drop shadow inside the canopy
  ctx.save();
  ctx.translate(3, 4);
  silhouette(); ctx.fillStyle = css(shade(leaf, 0.3), 0.6); ctx.fill();
  ctx.restore();
  silhouette();
  ctx.fillStyle = radial(ctx, cx - rx * 0.35, cy - ry * 0.45, Math.max(rx, ry) * 1.5, [[0, lit(leaf, 1.25)], [0.45, lit(leaf, 0.95)], [1, lit(leaf, 0.5)]]);
  ctx.fill();
  ctx.save();
  silhouette(); ctx.clip();
  // leaf dabs: brighter towards the light, darker below
  for (let i = 0; i < rx * ry * 0.5; i++) {
    const x = cx + (r() - 0.5) * rx * 2.2, y = cy + (r() - 0.5) * ry * 2.2;
    const lightT = ((cx - x) / rx + (cy - y) / ry) * 0.5;
    const f = 0.75 + lightT * 0.45 + (r() - 0.5) * 0.3;
    ctx.fillStyle = css(lit(mix(leaf, r() < 0.15 ? 0xc8c860 : leaf, 0.3), f), 0.75);
    ctx.beginPath(); ctx.ellipse(x, y, 1.6 + r() * 2, 1 + r() * 1.3, r() * Math.PI, 0, Math.PI * 2); ctx.fill();
  }
  // undercanopy shade
  ctx.fillStyle = grad(ctx, 0, cy, 0, cy + ry, [[0, 0x000000, 0], [1, 0x000000, 0.35]]);
  ctx.fillRect(cx - rx * 1.5, cy, rx * 3, ry * 1.2);
  ctx.restore();
}

export function roundHut(ctx: Ctx, cx: number, by: number, rx: number, h: number, wall: number, roof: number, seed: number) {
  const ry = rx / 2;
  softEllipse(ctx, cx + 6, by + 4, rx + 10, ry + 6, 0x000000, 0.35);
  // wattle walls
  ctx.save();
  ctx.beginPath(); ctx.ellipse(cx, by, rx, ry, 0, 0, Math.PI); ctx.lineTo(cx - rx, by - h); ctx.ellipse(cx, by - h, rx, ry, 0, Math.PI, 0, true); ctx.closePath(); ctx.clip();
  ctx.fillStyle = grad(ctx, cx - rx, 0, cx + rx, 0, [[0, lit(wall, 0.9)], [0.3, lit(wall, 1.1)], [1, lit(wall, 0.55)]]);
  ctx.fillRect(cx - rx, by - h - ry, rx * 2, h + ry * 2);
  ctx.strokeStyle = css(0x000000, 0.22); ctx.lineWidth = 1;
  for (let v = 2; v < h; v += 3.2) { ctx.beginPath(); ctx.ellipse(cx, by - v, rx, ry, 0, 0.1, Math.PI - 0.1); ctx.stroke(); }
  for (let k = 0; k < 9; k++) { const th = (k / 8) * Math.PI; ctx.strokeStyle = css(lit(BEAM, 0.8), 0.9); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(cx + Math.cos(th) * rx, by + Math.sin(th) * ry); ctx.lineTo(cx + Math.cos(th) * rx, by + Math.sin(th) * ry - h); ctx.stroke(); }
  ctx.restore();
  // door
  ctx.fillStyle = css(0x140c08); ctx.beginPath(); ctx.ellipse(cx - rx * 0.35, by + ry * 0.6 - 7, 4.5, 8, 0, Math.PI, 0); ctx.lineTo(cx - rx * 0.35 + 4.5, by + ry * 0.6); ctx.lineTo(cx - rx * 0.35 - 4.5, by + ry * 0.6); ctx.fill();
  ctx.fillStyle = radial(ctx, cx - rx * 0.35, by + ry * 0.6 - 4, 6, [[0, 0xffb050, 0.7], [1, 0x000000, 0]]);
  ctx.fillRect(cx - rx * 0.35 - 6, by + ry * 0.6 - 12, 12, 12);
  // thatched cone
  const rr = rx + 6;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(cx, by - h - h * 1.3); ctx.lineTo(cx - rr, by - h + 2); ctx.ellipse(cx, by - h + 2, rr, rr / 2, 0, Math.PI, 0, true); ctx.closePath(); ctx.clip();
  ctx.fillStyle = grad(ctx, cx - rr, 0, cx + rr, 0, [[0, lit(roof, 0.95)], [0.35, lit(roof, 1.2)], [1, lit(roof, 0.55)]]);
  ctx.fillRect(cx - rr, by - h * 2.4, rr * 2, h * 2.4);
  const r = rng(seed);
  for (let i = 0; i < 260; i++) {
    const t = r(), th = r() * Math.PI;
    const x = cx + Math.cos(th) * rr * t, y = by - h - h * 1.3 * (1 - t) + Math.sin(th) * rr * 0.5 * t;
    ctx.strokeStyle = css(lit(mix(roof, 0xe0d090, 0.2), 0.7 + r() * 0.6), 0.7); ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (x - cx) * 0.12, y + 4); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = css(0x000000, 0.4); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(cx, by - h + 2, rr, rr / 2, 0, 0, Math.PI); ctx.stroke();
  // smoke hole and feathers
  ctx.strokeStyle = css(0xe8e0d0); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(cx, by - h * 2.3); ctx.lineTo(cx + 5, by - h * 2.3 - 9); ctx.stroke();
}

export function totem(ctx: Ctx, x: number, y: number, accent: number) {
  softEllipse(ctx, x + 2, y, 5, 2, 0x000000, 0.35);
  ctx.fillStyle = grad(ctx, x - 3, 0, x + 3, 0, [[0, 0x8a6040], [1, 0x4a3020]]);
  ctx.fillRect(x - 2.5, y - 26, 5, 26);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = css(i % 2 ? accent : 0xc04030); ctx.fillRect(x - 3, y - 24 + i * 8, 6, 2);
    ctx.fillStyle = css(0x140c08); ctx.fillRect(x - 1.5, y - 21 + i * 8, 1, 1); ctx.fillRect(x + 0.5, y - 21 + i * 8, 1, 1);
  }
  ctx.fillStyle = css(accent); ctx.beginPath(); ctx.moveTo(x - 7, y - 26); ctx.lineTo(x, y - 30); ctx.lineTo(x + 7, y - 26); ctx.fill();
}

function burrow(ctx: Ctx, x: number, y: number, H: number, earth: number, moss: number, seed: number) {
  const r = rng(seed);
  softEllipse(ctx, x + 8, y - 16, 56, 24, 0x000000, 0.35);
  // earthen mound
  ctx.fillStyle = radial(ctx, x - 16, y - 34 - H * 0.4, 70, [[0, lit(earth, 1.25)], [0.5, lit(earth, 0.95)], [1, lit(earth, 0.5)]]);
  ctx.beginPath(); ctx.ellipse(x, y - 22, 50, 22 + H * 0.4, 0, Math.PI, 0); ctx.ellipse(x, y - 22, 50, 14, 0, 0, Math.PI); ctx.fill();
  // grassy cap
  ctx.save();
  ctx.beginPath(); ctx.ellipse(x - 4, y - 30 - H * 0.25, 40, 14 + H * 0.3, 0, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = radial(ctx, x - 16, y - 40 - H * 0.4, 50, [[0, lit(moss, 1.3)], [1, lit(moss, 0.75)]]);
  ctx.fillRect(x - 50, y - 80, 100, 80);
  for (let i = 0; i < 160; i++) { ctx.strokeStyle = css(lit(moss, 0.7 + r() * 0.7), 0.8); ctx.lineWidth = 0.8; const gx = x - 44 + r() * 80, gy = y - 50 - H * 0.3 + r() * 40; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + (r() - 0.4) * 2, gy - 3); ctx.stroke(); }
  ctx.restore();
  // stones set into the earth
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.1 + (i / 6) * 0.8), sx = x + Math.cos(a) * 44, sy = y - 22 + Math.sin(a) * 12;
    ctx.fillStyle = css(lit(0x8a8478, 0.8 + r() * 0.3)); ctx.beginPath(); ctx.ellipse(sx, sy, 4 + r() * 3, 3, 0, 0, Math.PI * 2); ctx.fill();
  }
  // round doorway with timber frame and warm light
  ctx.fillStyle = css(0x4a3020); ctx.beginPath(); ctx.ellipse(x - 14, y - 18, 12, 11, 0, Math.PI, 0); ctx.lineTo(x - 2, y - 12); ctx.lineTo(x - 26, y - 12); ctx.fill();
  ctx.fillStyle = css(0x120a06); ctx.beginPath(); ctx.ellipse(x - 14, y - 18, 9, 8.5, 0, Math.PI, 0); ctx.lineTo(x - 5, y - 13); ctx.lineTo(x - 23, y - 13); ctx.fill();
  ctx.fillStyle = radial(ctx, x - 14, y - 15, 10, [[0, 0xff9a40, 0.6], [1, 0x000000, 0]]);
  ctx.fillRect(x - 24, y - 26, 20, 14);
  // roots and mushrooms
  for (let i = 0; i < 4; i++) {
    const mx = x + 10 + r() * 30, my = y - 14 - r() * 10;
    ctx.fillStyle = css(0xe8dcc0); ctx.fillRect(mx - 0.6, my, 1.2, 3);
    ctx.fillStyle = css(i % 2 ? 0xc04030 : 0xd8a040); ctx.beginPath(); ctx.ellipse(mx, my, 2.6, 1.6, 0, Math.PI, 0); ctx.fill();
  }
}

function standingStones(ctx: Ctx, g: Box, stone: number, seed: number) {
  const r = rng(seed);
  for (const p of [g.tL, g.tB, g.tR]) {
    const x = p.x * 0.7 + g.c.x * 0.3, y = p.y * 0.7 + g.c.y * 0.3, h = 12 + r() * 6;
    ctx.fillStyle = grad(ctx, x - 3, 0, x + 3, 0, [[0, lit(stone, 1.1)], [1, lit(stone, 0.6)]]);
    ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x - 2.5, y - h); ctx.lineTo(x + 1, y - h - 2); ctx.lineTo(x + 3, y); ctx.fill();
    ctx.fillStyle = css(0x9adf80, 0.5); ctx.fillRect(x - 1, y - h * 0.6, 1.5, 2);
  }
}

export function crystal(ctx: Ctx, x: number, y: number, h: number, color: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = radial(ctx, x, y - h * 0.5, h * 0.7, [[0, color, 0.45], [1, color, 0]]);
  ctx.beginPath(); ctx.arc(x, y - h * 0.5, h * 0.7, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  const w = 7;
  fillPoly(ctx, [[x, y - h], [x - w, y - h * 0.35], [x, y]], css(lit(color, 1.3)));
  fillPoly(ctx, [[x, y - h], [x + w, y - h * 0.35], [x, y]], css(lit(color, 0.7)));
  fillPoly(ctx, [[x, y - h], [x - w * 0.4, y - h * 0.4], [x, y - h * 0.15]], css(0xffffff, 0.45));
}

// ------------------------------------------------------------------ castle

export function castleCanvasSize() {
  return { w: CASTLE_SIZE * (TX + SK) + STRUCT_MARGIN * 2, h: CASTLE_SIZE * TY + 230 };
}

export function paintCastle(ctx: Ctx, team: 0 | 1, w: number, h: number) {
  const s = CASTLE_SIZE;
  const ox = footX(w, CASTLE_SIZE), oy = h - 6;
  const stone = 0xa29a88;
  const roof = mix(TEAM_COLORS[team], 0x30343c, 0.35);
  const seed = 500 + team * 17;
  footing(ctx, ox, oy, s, 0x5a5040);
  // stepped stone base
  const base = boxGeo(ox, oy, s, s, 6);
  faceLeft(ctx, base, stoneWall(0x7a7466, seed, 3)); faceRight(ctx, base, stoneWall(0x7a7466, seed + 1, 3));
  stoneTop(ctx, base, 0x8a8476);
  const k = s - 0.35;
  // the curtain wall stands on the base, inset by half the margin on every side
  const xW = ox - (0.35 / 2) * (EX.x + EY.x), yW = oy - 6 - (TY * 0.35) / 2;
  const wallH = 52;
  // back towers first (painter's order): north-west and north-east corners
  const curtain = boxGeo(xW, yW, k, k, wallH);
  roundTower(ctx, curtain.B.x, curtain.B.y + 2, 15, wallH + 20, stone, seed + 2);
  crownTower(ctx, curtain.B.x, curtain.B.y + 2 - wallH - 20, 15, stone, roof, seed);
  roundTower(ctx, curtain.R.x, curtain.R.y + 2, 15, wallH + 18, stone, seed + 6);
  crownTower(ctx, curtain.R.x, curtain.R.y + 2 - wallH - 18, 15, stone, roof, seed + 2);
  // courtyard visible over the back walls
  faceTop(ctx, boxGeo(xW, yW, k, k, 8), (c, U, W) => {
    c.fillStyle = css(lit(0x7a7060, 0.95)); c.fillRect(0, 0, U, W);
    const r = rng(seed + 9);
    for (let i = 0; i < 120; i++) { c.fillStyle = css(lit(0x8a8070, 0.8 + r() * 0.4), 0.6); c.fillRect(r() * U, r() * W, 0.2, 0.2); }
  });
  // inner sides of the back curtain walls, with masonry
  const inner = boxGeo(xW, yW - 8, k, k, wallH - 8);
  // inner side of the west wall (faces east: narrow, shaded) …
  ctx.save();
  path(ctx, [[inner.L.x, inner.L.y], [inner.B.x, inner.B.y], [inner.tB.x, inner.tB.y], [inner.tL.x, inner.tL.y]]); ctx.clip();
  ctx.transform(-EY.x, -EY.y, 0, -1, inner.L.x, inner.L.y);
  stoneWall(stone, seed + 21, 6)(ctx, k, wallH, 0.62);
  ctx.restore();
  // … and of the north wall (faces south, towards the viewer)
  ctx.save();
  path(ctx, [[inner.B.x, inner.B.y], [inner.R.x, inner.R.y], [inner.tR.x, inner.tR.y], [inner.tB.x, inner.tB.y]]); ctx.clip();
  ctx.transform(EX.x, EX.y, 0, -1, inner.B.x, inner.B.y);
  stoneWall(stone, seed + 22, 6)(ctx, k, wallH, 0.92);
  ctx.restore();
  // battlements along the back walls
  for (const [p, q, l] of [[curtain.tL, curtain.tB, 0.62], [curtain.tB, curtain.tR, 0.92]] as Array<[Pt, Pt, number]>) {
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = lerp(p, q, (i + 0.25) / n), b = lerp(p, q, (i + 0.65) / n);
      fillPoly(ctx, [[a.x, a.y], [b.x, b.y], [b.x, b.y - 4.5], [a.x, a.y - 4.5]], css(lit(stone, l)));
    }
  }
  courtyard(ctx, inner, seed);
  // keep
  // keep: centred, set back a little from the middle of the courtyard
  const kc = cornerFor(pt(curtain.c.x, curtain.c.y + wallH), 1.7);
  const keep = boxGeo(kc.x - EY.x * 0.6, kc.y - EY.y * 0.6, 1.7, 1.7, 96);
  const kw = stoneWall(shade(stone, 1.04), seed + 3, 6);
  faceLeft(ctx, keep, (c, U, V, l) => {
    kw(c, U, V, l);
    windowAt(c, U * 0.22, V * 0.62, 0.18, 10, l, true); windowAt(c, U * 0.62, V * 0.62, 0.18, 10, l, true);
    windowAt(c, U * 0.42, V * 0.84, 0.16, 7, l, true);
  });
  faceRight(ctx, keep, (c, U, V, l) => { kw(c, U, V, l); windowAt(c, U * 0.4, V * 0.7, 0.18, 10, l, true); });
  // banners hanging on the keep
  const kb = lerp(keep.tL, keep.tF, 0.5);
  hangingBanner(ctx, kb.x, kb.y + 8, 16, 34, TEAM_COLORS[team], team ? 'moon' : 'sun');
  hipRoof(ctx, keep, 46, roof, 'slate', seed + 4);
  const kApex = up(keep.c, 46);
  ctx.strokeStyle = css(0x2a1c12); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(kApex.x, kApex.y); ctx.lineTo(kApex.x, kApex.y - 14); ctx.stroke();
  // front curtain walls with walkway and crenellations; the gate faces the viewer
  const cw = stoneWall(stone, seed + 7, 6);
  faceRight(ctx, curtain, (c, U, V, l) => { cw(c, U, V, l); slit(c, U * 0.3, V * 0.6); slit(c, U * 0.7, V * 0.6); });
  faceLeft(ctx, curtain, (c, U, V, l) => {
    cw(c, U, V, l);
    // gatehouse: arched gate with portcullis
    const gu = U * 0.5 - 0.22, gw = 0.44, gh = 30;
    c.fillStyle = css(lit(0x8a8070, l)); c.fillRect(gu - 0.06, 0, gw + 0.12, gh + 4);
    c.fillStyle = css(0x0e0a08); c.fillRect(gu, 0, gw, gh);
    c.fillStyle = css(0x3a3430);
    for (let i = 1; i < 6; i++) c.fillRect(gu + (gw * i) / 6, 3, 0.012, gh - 3);
    for (let v = 6; v < gh; v += 5) c.fillRect(gu, v, gw, 0.8);
    slit(c, U * 0.18, V * 0.6); slit(c, U * 0.82, V * 0.6);
  });
  for (const t of [0.3, 0.7]) { const p = lerp(curtain.L, curtain.F, t); A.glow.push(pt(p.x, p.y - 26)); torch(ctx, pt(p.x, p.y - 22)); }
  // walkway tops of the front walls
  const walk = (a: Pt, b: Pt, inward: Pt) => fillPoly(ctx, [[a.x, a.y], [b.x, b.y], [b.x + inward.x, b.y + inward.y], [a.x + inward.x, a.y + inward.y]], css(lit(stone, LIGHT.top * 0.9)));
  walk(curtain.tL, curtain.tF, pt(-EY.x * 0.18, -EY.y * 0.18));
  walk(curtain.tF, curtain.tR, pt(-EX.x * 0.18, -EX.y * 0.18));
  crenellate(ctx, curtain, stone, seed, 6, true);
  // gatehouse towers flanking the gate, front-left corner tower
  roundTower(ctx, curtain.L.x, curtain.L.y + 4, 15, wallH + 18, stone, seed + 5);
  crownTower(ctx, curtain.L.x, curtain.L.y + 4 - wallH - 18, 15, stone, roof, seed + 1);
  const gate = lerp(curtain.L, curtain.F, 0.5);
  for (const dx of [-0.17, 0.17]) {
    const p = lerp(curtain.L, curtain.F, 0.5 + dx);
    roundTower(ctx, p.x, p.y + 4, 8, wallH + 6, stone, seed + 11 + dx * 10);
    crownTower(ctx, p.x, p.y + 4 - wallH - 6, 8, stone, roof, seed + 3, true);
  }
  void gate;
  // front tower last
  roundTower(ctx, curtain.F.x, curtain.F.y + 4, 16, wallH + 14, stone, seed + 8);
  crownTower(ctx, curtain.F.x, curtain.F.y + 4 - wallH - 14, 16, stone, roof, seed + 4);
}

/** A few signs of life in the castle courtyard: a well, crates, a hay cart. */
function courtyard(ctx: Ctx, g: Box, seed: number) {
  const r = rng(seed + 40);
  // u tiles along the front (x), w tiles towards the back (−y), from the south-west corner
  const at = (u: number, w: number) => pt(g.L.x + u * EX.x - w * EY.x, g.L.y + u * EX.y - w * EY.y);
  // well
  const wl = at(0.9, 2.6);
  softEllipse(ctx, wl.x + 3, wl.y + 2, 9, 4, 0x000000, 0.35);
  ctx.fillStyle = grad(ctx, wl.x - 7, 0, wl.x + 7, 0, [[0, 0xa09888], [1, 0x5a564c]]);
  ctx.beginPath(); ctx.ellipse(wl.x, wl.y, 7, 3.5, 0, 0, Math.PI); ctx.lineTo(wl.x - 7, wl.y - 6); ctx.ellipse(wl.x, wl.y - 6, 7, 3.5, 0, Math.PI, 0, true); ctx.fill();
  ctx.fillStyle = css(0x1a2430); ctx.beginPath(); ctx.ellipse(wl.x, wl.y - 6, 5.5, 2.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = css(0x3a2818); ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(wl.x - 6, wl.y - 6); ctx.lineTo(wl.x - 6, wl.y - 16); ctx.lineTo(wl.x + 6, wl.y - 16); ctx.lineTo(wl.x + 6, wl.y - 6); ctx.stroke();
  fillPoly(ctx, [[wl.x - 9, wl.y - 15], [wl.x, wl.y - 21], [wl.x + 9, wl.y - 15]], css(0x6a4a2a));
  // crates and barrels along the wall
  for (let i = 0; i < 4; i++) {
    const p = at(2.2 + r() * 0.8, 0.5 + i * 0.4);
    const b = boxGeo(p.x, p.y, 0.22, 0.22, 7);
    fillPoly(ctx, [[b.L.x, b.L.y], [b.F.x, b.F.y], [b.tF.x, b.tF.y], [b.tL.x, b.tL.y]], css(lit(0x8a6a40, 1)));
    fillPoly(ctx, [[b.F.x, b.F.y], [b.R.x, b.R.y], [b.tR.x, b.tR.y], [b.tF.x, b.tF.y]], css(lit(0x8a6a40, 0.66)));
    fillPoly(ctx, [[b.tL.x, b.tL.y], [b.tF.x, b.tF.y], [b.tR.x, b.tR.y], [b.tB.x, b.tB.y]], css(lit(0xa08050, 1.1)));
  }
  const hayAt = at(2.9, 2.9);
  hay(ctx, hayAt);
}

/** Tower top: machicolated ring + conical slate roof (or open crenellated top when `open`). */
function crownTower(ctx: Ctx, cx: number, ty: number, rx: number, stone: number, roof: number, seed: number, open = false) {
  const ry = rx / 2;
  // corbelled ring
  ctx.fillStyle = grad(ctx, cx - rx - 2, 0, cx + rx + 2, 0, [[0, lit(stone, 0.9)], [0.3, lit(stone, 1.12)], [1, lit(stone, 0.55)]]);
  ctx.beginPath(); ctx.ellipse(cx, ty + 2, rx + 2, ry + 1, 0, 0, Math.PI); ctx.lineTo(cx - rx - 2, ty - 4); ctx.ellipse(cx, ty - 4, rx + 2, ry + 1, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
  ctx.fillStyle = css(0x000000, 0.35);
  for (let k = 0; k < 7; k++) { const th = ((k + 0.5) / 7) * Math.PI; ctx.fillRect(cx + Math.cos(th) * (rx + 1) - 0.8, ty + 1 + Math.sin(th) * ry, 1.6, 2.4); }
  if (open) {
    ctx.fillStyle = css(lit(stone, 0.7)); ctx.beginPath(); ctx.ellipse(cx, ty - 4, rx + 1, ry + 0.5, 0, 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < 5; k++) { const th = ((k + 0.5) / 5) * Math.PI; ctx.fillStyle = css(lit(stone, k < 2 ? 1.1 : 0.7)); ctx.fillRect(cx + Math.cos(th) * (rx + 1) - 1.6, ty - 4 + Math.sin(th) * ry - 4, 3.2, 4); }
    return;
  }
  A.flags.push(coneRoof(ctx, cx, ty - 4, rx + 4, rx * 2.3, roof, seed));
}

/** Collapsed castle: jagged masonry walls, broken towers, the stump of the keep, heaps of blocks and charred beams. */
export function paintRuin(ctx: Ctx, team: 0 | 1, w: number, h: number) {
  const s = CASTLE_SIZE;
  const ox = footX(w, CASTLE_SIZE), oy = h - 6;
  const stone = 0x8e8676, roof = mix(TEAM_COLORS[team], 0x30343c, 0.55);
  const r = rng(900 + team);
  // scorched ground and the old base
  const mid = centreOf(ox, oy, s);
  softEllipse(ctx, mid.x, mid.y, s * HX * 1.2, s * HY * 1.25, 0x14100a, 0.65);
  const base = boxGeo(ox, oy, s, s, 6);
  faceLeft(ctx, base, stoneWall(0x6a6458, 9, 3)); faceRight(ctx, base, stoneWall(0x6a6458, 10, 3));
  faceTop(ctx, base, (c, U, W) => {
    c.fillStyle = css(lit(0x5a5246, 1)); c.fillRect(0, 0, U, W);
    for (let i = 0; i < 160; i++) { c.fillStyle = css(r() < 0.5 ? 0x2a2218 : 0x7a7060, 0.4); c.fillRect(r() * U, r() * W, 0.08 + r() * 0.1, 0.06); }
  });
  const k = s - 0.35;
  const xW = ox - (0.35 / 2) * (EX.x + EY.x), yW = oy - 6 - (TY * 0.35) / 2;
  const c = boxGeo(xW, yW, k, k, 0);
  /** A wall segment whose top edge is broken off (clip with a jagged polygon, then paint masonry). */
  const brokenWall = (from: Pt, to: Pt, mat: FacePainter, light: number, dir: 'L' | 'R', hMax: number) => {
    const n = 10;
    const top: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const p = lerp(from, to, i / n);
      const hh = i === 0 || i === n ? hMax * (0.6 + r() * 0.4) : Math.max(4, hMax * Math.pow(r(), 1.4));
      top.push(pt(p.x, p.y - hh));
    }
    ctx.save();
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y);
    for (let i = n; i >= 0; i--) ctx.lineTo(top[i].x, top[i].y);
    ctx.closePath(); ctx.clip();
    if (dir === 'L') ctx.transform(EX.x, EX.y, 0, -1, from.x, from.y); else ctx.transform(-EY.x, -EY.y, 0, -1, from.x, from.y);
    mat(ctx, k, hMax, light);
    ctx.restore();
    // broken edge highlight
    ctx.strokeStyle = css(0xfff0d0, 0.2); ctx.lineWidth = 1;
    ctx.beginPath(); top.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
  };
  const sw = stoneWall(stone, 31, 6);
  brokenWall(c.L, c.B, sw, 0.62, 'R', 46);
  brokenWall(c.B, c.R, sw, 0.92, 'L', 46);
  // broken tower stumps (back and sides)
  for (const [p, hh] of [[c.B, 34], [c.L, 22], [c.R, 26]] as Array<[Pt, number]>) {
    roundTower(ctx, p.x, p.y + 2, 15, hh + r() * 10, shade(stone, 0.95), 33 + hh);
    ctx.fillStyle = css(0x1a1610); ctx.beginPath(); ctx.ellipse(p.x, p.y + 2 - hh - 4, 11, 5, 0, 0, Math.PI * 2); ctx.fill();
  }
  // stump of the keep
  const kc = cornerFor(c.c, 1.7);
  const keep = boxGeo(kc.x, kc.y, 1.7, 1.7, 0);
  brokenWall(keep.L, keep.F, stoneWall(stone, 41, 6), 1, 'L', 38);
  brokenWall(keep.F, keep.R, stoneWall(stone, 42, 6), 0.66, 'R', 30);
  // heaps of fallen blocks: little lit cuboids, back to front
  const blocks: Array<[number, number, number]> = [];
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    blocks.push([c.c.x + Math.cos(a) * d * s * HX * 1.05, c.c.y + 10 + Math.sin(a) * d * s * HY * 0.9, 0.08 + r() * 0.12]);
  }
  blocks.sort((p, q) => p[1] - q[1]);
  for (const [x, y, sz] of blocks) {
    const b = boxGeo(x, y, sz, sz * (0.8 + r() * 0.6), 3 + r() * 5);
    const col = shade(mix(stone, r() < 0.4 ? 0x4a443a : 0x9a9080, r() * 0.5), 0.85);
    fillPoly(ctx, [[b.L.x, b.L.y], [b.F.x, b.F.y], [b.tF.x, b.tF.y], [b.tL.x, b.tL.y]], css(lit(col, 0.95)));
    fillPoly(ctx, [[b.F.x, b.F.y], [b.R.x, b.R.y], [b.tR.x, b.tR.y], [b.tF.x, b.tF.y]], css(lit(col, 0.62)));
    fillPoly(ctx, [[b.tL.x, b.tL.y], [b.tF.x, b.tF.y], [b.tR.x, b.tR.y], [b.tB.x, b.tB.y]], css(lit(col, 1.15)));
  }
  // slate shards from the roofs (team colour, dulled)
  for (let i = 0; i < 14; i++) {
    const x = c.c.x + (r() - 0.5) * 150, y = c.c.y + 10 + (r() - 0.5) * 60;
    fillPoly(ctx, [[x, y], [x + 4 + r() * 4, y - 1.5], [x + 2, y - 4 - r() * 2]], css(lit(roof, 0.7 + r() * 0.4)));
  }
  // charred beams with a lit edge
  for (let i = 0; i < 6; i++) {
    const x = c.c.x + (r() - 0.5) * 100, y = c.c.y + 10 + (r() - 0.5) * 30;
    const dx = 16 + r() * 12, dy = -10 - r() * 14;
    ctx.strokeStyle = css(0x140c06); ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx, y + dy); ctx.stroke();
    ctx.strokeStyle = css(0x5a3a1a, 0.8); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 1, y - 1.5); ctx.lineTo(x + dx - 1, y + dy - 1.5); ctx.stroke();
  }
  // embers and ash
  for (let i = 0; i < 18; i++) softEllipse(ctx, c.c.x + (r() - 0.5) * 120, c.c.y + 10 + (r() - 0.5) * 40, 2.5, 1.3, 0xff7020, 0.7);
  for (let i = 0; i < 10; i++) softEllipse(ctx, c.c.x + (r() - 0.5) * 140, c.c.y + 10 + (r() - 0.5) * 50, 10, 4, 0x2a2622, 0.35);
}

export { lerp as lerpPt };

// ------------------------------------------------------------------ Shardbound & Cogspark structures

export interface Site {
  ox: number; oy: number; s: number; mid: Pt; seed: number; H: number;
  inset: (k: number) => readonly [number, number];
  stand: (k: number) => readonly [number, number];
}

export function glowAt(ctx: Ctx, x: number, y: number, r: number, color: number, a: number) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = radial(ctx, x, y, r, [[0, color, a], [1, color, 0]]);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** Violet flagstones with crystal shards breaking through (Shardbound ground). */
function crystalPlinth(ctx: Ctx, ox: number, oy: number, s: number, seed: number) {
  const r = rng(seed + 3);
  const plinth = boxGeo(ox, oy - 1, s - 0.1, s - 0.1, 3);
  faceLeft(ctx, plinth, stoneWall(0x6a6478, seed, 3));
  faceRight(ctx, plinth, stoneWall(0x6a6478, seed + 1, 3));
  faceTop(ctx, plinth, (c, U, W) => {
    c.fillStyle = css(lit(0x4a4458, LIGHT.top)); c.fillRect(0, 0, U, W);
    for (let u = 0; u < U; u += 0.33) for (let w = 0; w < W; w += 0.33) {
      c.fillStyle = css(lit(mix(0x6a6478, 0x8a7aa8, r() * 0.5), LIGHT.top * (0.85 + r() * 0.2)));
      c.fillRect(u + 0.02, w + 0.02, 0.29, 0.29);
    }
    // a glowing rune circle
    c.strokeStyle = css(0xb090f0, 0.55); c.lineWidth = 0.025;
    c.beginPath(); c.ellipse(U / 2, W / 2, U * 0.36, W * 0.36, 0, 0, Math.PI * 2); c.stroke();
  });
  for (const p of [plinth.tL, plinth.tR]) {
    const x = p.x * 0.75 + plinth.c.x * 0.25, y = p.y * 0.75 + plinth.c.y * 0.25 + 4;
    fillPoly(ctx, [[x - 2.5, y], [x, y - 7 - r() * 4], [x + 2.5, y]], css(lit(0x9a6ae0, 1.1)));
    fillPoly(ctx, [[x, y], [x, y - 7], [x + 2.5, y]], css(lit(0x9a6ae0, 0.7)));
  }
}

/** Riveted steel deck with hazard-striped edges (Cogspark ground). */
function steelDeck(ctx: Ctx, ox: number, oy: number, s: number, seed: number) {
  const r = rng(seed + 5);
  const plinth = boxGeo(ox, oy - 1, s - 0.08, s - 0.08, 3);
  const edge: FacePainter = (c, U, V, l) => {
    for (let u = 0, i = 0; u < U; u += 0.14, i++) { c.fillStyle = css(lit(i % 2 ? 0x2a2a2a : 0xd8b030, l)); c.fillRect(u, 0, 0.14, V); }
    wallShading(c, U, V, l);
  };
  faceLeft(ctx, plinth, edge); faceRight(ctx, plinth, edge);
  faceTop(ctx, plinth, (c, U, W) => {
    c.fillStyle = css(lit(0x5a5a60, LIGHT.top)); c.fillRect(0, 0, U, W);
    for (let u = 0; u < U; u += 0.5) for (let w = 0; w < W; w += 0.5) {
      c.fillStyle = css(lit(mix(0x6a6a72, 0x7a5a3a, r() * 0.35), LIGHT.top * (0.85 + r() * 0.2))); c.fillRect(u + 0.015, w + 0.015, 0.47, 0.47);
      c.fillStyle = css(0xd8c8a0, 0.6);
      for (const [du, dw] of [[0.05, 0.05], [0.42, 0.05], [0.05, 0.42], [0.42, 0.42]]) c.fillRect(u + du, w + dw, 0.025, 0.025);
    }
    // oil stain
    c.fillStyle = css(0x1a1a1a, 0.25); c.beginPath(); c.ellipse(U * 0.3, W * 0.6, 0.2, 0.12, 0.4, 0, Math.PI * 2); c.fill();
  });
}

/** Corrugated metal sheeting (vertical ribs) with rivet rows. */
export function metalWall(base: number, seed: number): FacePainter {
  return (ctx, U, V, light) => {
    const r = rng(seed);
    for (let u = 0, i = 0; u < U; u += 0.06, i++) {
      ctx.fillStyle = css(lit(mix(base, i % 2 ? 0xffffff : 0x000000, 0.08), light * (0.95 + r() * 0.08)));
      ctx.fillRect(u, 0, 0.06, V);
    }
    ctx.fillStyle = css(0xd8c8a0, 0.55);
    for (const v of [3, V - 3]) for (let u = 0.04; u < U; u += 0.12) ctx.fillRect(u, v, 0.02, 0.8);
    // rust streaks
    for (let i = 0; i < U * 8; i++) { ctx.fillStyle = css(0x8a4a2a, 0.25); ctx.fillRect(r() * U, V * (0.4 + r() * 0.5), 0.02, -4 - r() * 8); }
    wallShading(ctx, U, V, light);
  };
}

/** Big metal gear (emblem). */
export function gearAt(ctx: Ctx, x: number, y: number, r: number, color: number, teeth = 10) {
  ctx.fillStyle = grad(ctx, x - r, y - r, x + r, y + r, [[0, lit(color, 1.3)], [1, lit(color, 0.6)]]);
  ctx.beginPath();
  for (let k = 0; k < teeth; k++) {
    const a = (k / teeth) * Math.PI * 2, a2 = a + Math.PI / teeth;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.9); ctx.lineTo(x + Math.cos(a2) * r * 0.78, y + Math.sin(a2) * r * 0.7);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = css(0x2a2a2a); ctx.beginPath(); ctx.ellipse(x, y, r * 0.3, r * 0.27, 0, 0, Math.PI * 2); ctx.fill();
}

export function smokestack(ctx: Ctx, x: number, y: number, h: number, w: number, color = 0x4a4a50) {
  ctx.fillStyle = grad(ctx, x - w, 0, x + w, 0, [[0, lit(color, 1.25)], [1, lit(color, 0.55)]]);
  ctx.fillRect(x - w, y - h, w * 2, h);
  ctx.fillStyle = css(0xd8b030); ctx.fillRect(x - w, y - h * 0.55, w * 2, 1.6);
  ctx.fillStyle = css(0x1a1a1a); ctx.beginPath(); ctx.ellipse(x, y - h, w, w * 0.45, 0, 0, Math.PI * 2); ctx.fill();
  A.smoke.push(pt(x, y - h - 2));
}

/** A round element (ellipse-based) drum: side wall and top, used for basins, wells and generator bases. */
export function drum(ctx: Ctx, cx: number, by: number, rx: number, h: number, color: number, top: number, light = 1) {
  const ry = rx / 2;
  ctx.fillStyle = grad(ctx, cx - rx, 0, cx + rx, 0, [[0, lit(color, 0.95 * light)], [0.3, lit(color, 1.12 * light)], [1, lit(color, 0.55 * light)]]);
  ctx.beginPath(); ctx.ellipse(cx, by, rx, ry, 0, 0, Math.PI); ctx.lineTo(cx - rx, by - h); ctx.ellipse(cx, by - h, rx, ry, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
  ctx.fillStyle = css(lit(top, 1.1)); ctx.beginPath(); ctx.ellipse(cx, by - h, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = css(0x000000, 0.3); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(cx, by, rx, ry, 0, 0, Math.PI); ctx.stroke();
}

export function floatingCrystal(ctx: Ctx, x: number, y: number, h: number, color: number) {
  glowAt(ctx, x, y - h * 0.5, h * 0.9, color, 0.45);
  const w = h * 0.32;
  fillPoly(ctx, [[x, y - h], [x - w, y - h * 0.5], [x, y]], css(lit(color, 1.35)));
  fillPoly(ctx, [[x, y - h], [x + w, y - h * 0.5], [x, y]], css(lit(color, 0.75)));
  fillPoly(ctx, [[x, y - h], [x - w * 0.4, y - h * 0.55], [x, y - h * 0.3]], css(0xffffff, 0.5));
  A.glow.push(pt(x, y - h * 0.5));
}

function paintNewStyle(ctx: Ctx, def: BuildingDef, st: Site) {
  const m = def.model, H = st.H, seed = st.seed;
  const r = rng(seed);
  switch (m.style) {
    // ---------------------------------------------------------------- Shardbound
    case 'fountain': {
      const [x, y] = st.stand(1.7);
      const by = y - 8;
      drum(ctx, x, by, 34, 9, 0x7a7488, m.roof);
      // water surface with ripples
      ctx.fillStyle = radial(ctx, x - 8, by - 13, 34, [[0, lit(m.roof, 1.4)], [0.6, m.roof], [1, shade(m.roof, 0.6)]]);
      ctx.beginPath(); ctx.ellipse(x, by - 9, 30, 15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = css(0xffffff, 0.35); ctx.lineWidth = 0.8;
      for (const k of [10, 18, 25]) { ctx.beginPath(); ctx.ellipse(x, by - 9, k, k / 2, 0, 0.3, 2.6); ctx.stroke(); }
      // central pedestal and spouts
      const ph = H * 0.55;
      drum(ctx, x, by - 9, 6, ph, 0x8a84a0, 0x6a6478);
      drum(ctx, x, by - 9 - ph, 11, 3, 0x8a84a0, m.roof);
      ctx.strokeStyle = css(lit(m.roof, 1.3), 0.75); ctx.lineWidth = 1.6;
      for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + d * 8, by - 12 - ph); ctx.quadraticCurveTo(x + d * 22, by - 22 - ph * 0.6, x + d * 24, by - 9); ctx.stroke(); }
      floatingCrystal(ctx, x, by - 18 - ph, 12 + H * 0.2, m.wall === 0x4a3a7a ? 0x6ae0ff : 0xb0e0ff);
      A.flags.push(pt(x + 26, by - 16));
      break;
    }
    case 'cage': {
      const [x, y] = st.stand(1.6);
      const by = y - 8;
      drum(ctx, x, by, 30, 4, 0x6a6478, 0x5a5468);
      const pillars = [-0.6, 0.6, 2.2, 2.6, 3.7, 5.2];
      const back = (a: number) => Math.sin(a) < 0;
      const pillar = (a: number) => {
        const px = x + Math.cos(a) * 26, py = by - 4 + Math.sin(a) * 13;
        const h = H * 0.95;
        ctx.fillStyle = grad(ctx, px - 3, 0, px + 3, 0, [[0, lit(m.wall, 1.15)], [1, lit(m.wall, 0.6)]]);
        ctx.beginPath(); ctx.moveTo(px - 3, py); ctx.lineTo(px - 2, py - h); ctx.quadraticCurveTo(px + (x - px) * 0.15, py - h - 6, px + 2, py - h); ctx.lineTo(px + 3, py); ctx.fill();
        ctx.fillStyle = css(0xb08a4a); ctx.fillRect(px - 3, py - h * 0.55, 6, 2);
      };
      for (const a of pillars) if (back(a)) pillar(a);
      // the trapped gale
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 6; k++) {
        const yy = by - 8 - k * (H * 0.14), rx = 8 + k * 2.5;
        ctx.strokeStyle = css(m.roof, 0.5 - k * 0.05); ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.ellipse(x + Math.sin(k) * 2, yy, rx, rx * 0.35, -0.2, 0, Math.PI * 1.7); ctx.stroke();
      }
      ctx.restore();
      glowAt(ctx, x, by - H * 0.5, 14, m.roof, 0.5);
      for (const a of pillars) if (!back(a)) pillar(a);
      A.flags.push(pt(x, by - H * 1.05));
      break;
    }
    case 'altar': {
      const [x0, y0] = st.inset(1.7);
      const g1 = boxGeo(x0, y0, 1.7, 1.7, 7);
      const w1 = stoneWall(m.wall, seed, 3.5);
      faceLeft(ctx, g1, w1); faceRight(ctx, g1, w1); stoneTop(ctx, g1, m.wall);
      const c1 = cornerFor(g1.c, 1.15);
      const g2 = boxGeo(c1.x, c1.y, 1.15, 1.15, 8);
      const w2 = stoneWall(shade(m.wall, 0.9), seed + 1, 4);
      faceLeft(ctx, g2, (c, U, V, l) => { w2(c, U, V, l); c.fillStyle = css(m.roof, 0.85); c.fillRect(U * 0.3, V * 0.35, U * 0.4, 1.4); }); faceRight(ctx, g2, w2); stoneTop(ctx, g2, m.wall);
      // fire bowl and flames
      const b = g2.c;
      ctx.fillStyle = css(0x2a2420); ctx.beginPath(); ctx.ellipse(b.x, b.y - 2, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
      glowAt(ctx, b.x, b.y - 14, 30, m.roof, 0.5);
      for (const [dx, h, col] of [[0, H * 0.9, m.roof], [-6, H * 0.6, 0xff9a30], [6, H * 0.65, 0xff9a30], [0, H * 0.45, 0xfff0a0]] as const) {
        ctx.fillStyle = grad(ctx, 0, b.y - 3 - h, 0, b.y - 2, [[0, col, 0], [0.4, col, 0.85], [1, lit(col, 1.2), 0.95]]);
        ctx.beginPath(); ctx.moveTo(b.x + dx - 7, b.y - 3); ctx.quadraticCurveTo(b.x + dx - 6, b.y - 3 - h * 0.6, b.x + dx + 1, b.y - 3 - h); ctx.quadraticCurveTo(b.x + dx + 6, b.y - 3 - h * 0.5, b.x + dx + 7, b.y - 3); ctx.fill();
      }
      A.glow.push(pt(b.x, b.y - 12));
      A.flags.push(pt(g1.tB.x, g1.tB.y - 4));
      break;
    }
    case 'pillar': {
      const [x0, y0] = st.inset(1.3);
      const g = boxGeo(x0, y0, 1.3, 1.3, 6);
      const w = stoneWall(m.wall, seed, 3);
      faceLeft(ctx, g, w); faceRight(ctx, g, w); stoneTop(ctx, g, m.wall);
      const cc = cornerFor(g.c, 0.55);
      const col = boxGeo(cc.x, cc.y, 0.55, 0.55, H * 1.1);
      const cw = stoneWall(shade(m.wall, 1.05), seed + 2, 6);
      faceLeft(ctx, col, (c, U, V, l) => { cw(c, U, V, l); c.strokeStyle = css(m.roof, 0.8); c.lineWidth = 0.02; c.beginPath(); c.moveTo(U * 0.5, 4); c.lineTo(U * 0.3, V * 0.4); c.lineTo(U * 0.7, V * 0.6); c.lineTo(U * 0.45, V - 4); c.stroke(); });
      faceRight(ctx, col, cw); stoneTop(ctx, col, m.wall);
      const tip = pt(col.c.x, col.c.y - 6);
      // floating globe of lightning
      glowAt(ctx, tip.x, tip.y - 10, 20, m.roof, 0.55);
      ctx.fillStyle = radial(ctx, tip.x - 2, tip.y - 12, 8, [[0, 0xffffff], [0.5, lit(m.roof, 1.2)], [1, shade(m.roof, 0.6)]]);
      ctx.beginPath(); ctx.arc(tip.x, tip.y - 10, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = css(0xe8f4ff, 0.9); ctx.lineWidth = 1;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + 0.3;
        ctx.beginPath(); ctx.moveTo(tip.x, tip.y - 10);
        ctx.lineTo(tip.x + Math.cos(a) * 8 + (r() - 0.5) * 4, tip.y - 10 + Math.sin(a) * 6); ctx.lineTo(tip.x + Math.cos(a) * 14, tip.y - 10 + Math.sin(a) * 9 + (r() - 0.5) * 3); ctx.stroke();
      }
      A.glow.push(pt(tip.x, tip.y - 10));
      A.flags.push(pt(g.tB.x, g.tB.y - 4));
      break;
    }
    case 'rockpile': {
      const [x, y] = st.stand(1.7);
      const boulders: Array<[number, number, number]> = [[-26, -4, 16], [22, -2, 15], [-8, -12, 20], [13, -20, 15], [-18, -26, 13], [3, -34, 14]];
      for (const [dx, dy, rr] of boulders) {
        const bx = x + dx, by2 = y - 6 + dy;
        ctx.fillStyle = grad(ctx, bx - rr, by2 - rr, bx + rr, by2 + rr, [[0, lit(m.roof, 1.3)], [0.55, lit(m.roof, 0.95)], [1, lit(m.roof, 0.5)]]);
        ctx.beginPath(); ctx.moveTo(bx - rr, by2 + rr * 0.3); ctx.lineTo(bx - rr * 0.6, by2 - rr * 0.85); ctx.lineTo(bx + rr * 0.5, by2 - rr * 0.8); ctx.lineTo(bx + rr, by2 - rr * 0.05); ctx.lineTo(bx + rr * 0.7, by2 + rr * 0.7); ctx.lineTo(bx - rr * 0.6, by2 + rr * 0.65); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = css(0x000000, 0.3); ctx.lineWidth = 0.8; ctx.stroke();
      }
      // glowing fissure through the heap
      ctx.strokeStyle = css(0xc0a0f0, 0.95); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x - 24, y - 2); ctx.lineTo(x - 10, y - 15); ctx.lineTo(x - 3, y - 10); ctx.lineTo(x + 8, y - 26); ctx.lineTo(x + 3, y - 42); ctx.stroke();
      glowAt(ctx, x - 2, y - 16, 18, 0xb090f0, 0.4);
      if (def.id.includes('fissure')) { floatingCrystal(ctx, x + 3, y - 48, 16, 0xb090f0); floatingCrystal(ctx, x - 18, y - 34, 10, 0xb090f0); }
      A.flags.push(pt(x + 3, y - 50));
      A.glow.push(pt(x - 2, y - 16));
      break;
    }
    case 'codex': {
      const [x0, y0] = st.inset(1.1);
      const g = boxGeo(x0, y0, 1.1, 1.1, H * 0.35);
      const w = stoneWall(m.wall, seed, 4);
      faceLeft(ctx, g, w); faceRight(ctx, g, w); stoneTop(ctx, g, m.wall);
      // the open book, floating and slightly tilted
      const b = pt(g.c.x, g.c.y - 14 - H * 0.2);
      glowAt(ctx, b.x, b.y, 28, m.roof, 0.5);
      ctx.fillStyle = css(lit(m.roof, 0.6)); ctx.beginPath(); ctx.moveTo(b.x - 20, b.y + 2); ctx.lineTo(b.x, b.y + 6); ctx.lineTo(b.x + 20, b.y + 2); ctx.lineTo(b.x + 20, b.y + 4); ctx.lineTo(b.x, b.y + 8); ctx.lineTo(b.x - 20, b.y + 4); ctx.fill();
      for (const d of [-1, 1]) {
        fillPoly(ctx, [[b.x, b.y + 5], [b.x + d * 19, b.y + 1], [b.x + d * 18, b.y - 10], [b.x, b.y - 5]], css(lit(0xf0e8d0, d < 0 ? 1.05 : 0.85)));
        ctx.strokeStyle = css(0x3a2a4a, 0.55); ctx.lineWidth = 0.7;
        for (let k = 0; k < 4; k++) { const t = 0.2 + k * 0.17; ctx.beginPath(); ctx.moveTo(b.x + d * 3, b.y - 4 + t * 7); ctx.lineTo(b.x + d * 15, b.y - 8 + t * 7); ctx.stroke(); }
      }
      // runes orbiting the book
      ctx.fillStyle = css(lit(m.roof, 1.3), 0.9); ctx.font = 'bold 7px serif';
      ['ᚠ', 'ᚱ', 'ᛉ', 'ᛟ'].forEach((ch, k) => { const a = k * 1.6 + 0.4; ctx.fillText(ch, b.x + Math.cos(a) * 26 - 3, b.y - 6 + Math.sin(a) * 10); });
      A.glow.push(b);
      A.flags.push(pt(g.tB.x, g.tB.y - 4));
      break;
    }
    case 'obelisk': {
      const [x0, y0] = st.inset(1.1);
      const g = boxGeo(x0, y0, 1.1, 1.1, 5);
      const w = stoneWall(m.wall, seed, 3);
      faceLeft(ctx, g, w); faceRight(ctx, g, w); stoneTop(ctx, g, m.wall);
      const c0 = g.c, h = H * 1.5, bw = 10, tw2 = 4;
      // tapering two visible faces, then the pyramidion
      fillPoly(ctx, [[c0.x - bw, c0.y], [c0.x, c0.y + 5], [c0.x, c0.y + 5 - h], [c0.x - tw2, c0.y - h]], css(lit(m.wall, 1.05)));
      fillPoly(ctx, [[c0.x, c0.y + 5], [c0.x + bw, c0.y], [c0.x + tw2, c0.y - h], [c0.x, c0.y + 5 - h]], css(lit(m.wall, 0.65)));
      fillPoly(ctx, [[c0.x - tw2, c0.y - h], [c0.x, c0.y + 5 - h], [c0.x, c0.y - h - 10]], css(lit(m.roof, 1.2)));
      fillPoly(ctx, [[c0.x, c0.y + 5 - h], [c0.x + tw2, c0.y - h], [c0.x, c0.y - h - 10]], css(lit(m.roof, 0.75)));
      // glowing runes down the front
      ctx.fillStyle = css(m.roof, 0.95);
      for (let k = 0; k < 5; k++) { const yy = c0.y - 10 - k * (h - 16) / 5; ctx.fillRect(c0.x - 6 + k * 0.6, yy, 3, 1.2); ctx.fillRect(c0.x - 5 + k * 0.6, yy - 2.5, 1.2, 2.5); }
      glowAt(ctx, c0.x, c0.y - h - 4, 16, m.roof, 0.5);
      // floating stone shards
      for (const [dx, dy] of [[-16, -h * 0.6], [15, -h * 0.4]] as const) fillPoly(ctx, [[c0.x + dx, c0.y + dy - 5], [c0.x + dx + 4, c0.y + dy], [c0.x + dx, c0.y + dy + 4], [c0.x + dx - 3, c0.y + dy]], css(lit(m.wall, 1.1)));
      A.glow.push(pt(c0.x, c0.y - h - 4));
      A.flags.push(pt(g.tB.x, g.tB.y - 4));
      break;
    }
    case 'guardspire': {
      const [x, y] = st.stand(1.3);
      const by = y - 8;
      roundTower(ctx, x, by, 15, H * 0.95, m.wall, seed);
      drum(ctx, x, by - H * 0.95, 18, 4, shade(m.wall, 1.1), shade(m.wall, 0.85));
      // a ring of floating boulders around a crystal heart
      const top = by - H * 0.95 - 6;
      const stones = [0, 1, 2, 3, 4];
      const stone = (k: number) => {
        const a = (k / 5) * Math.PI * 2 + 0.4, sx = x + Math.cos(a) * 16, sy = top - 12 + Math.sin(a) * 6;
        ctx.fillStyle = grad(ctx, sx - 5, sy - 5, sx + 5, sy + 5, [[0, lit(0x8a7a5a, 1.3)], [1, lit(0x8a7a5a, 0.55)]]);
        ctx.beginPath(); ctx.moveTo(sx - 5, sy + 1); ctx.lineTo(sx - 3, sy - 4); ctx.lineTo(sx + 4, sy - 4); ctx.lineTo(sx + 5, sy + 2); ctx.lineTo(sx, sy + 4); ctx.closePath(); ctx.fill();
      };
      for (const k of stones) if (Math.sin((k / 5) * Math.PI * 2 + 0.4) < 0) stone(k);
      floatingCrystal(ctx, x, top - 4, 18, m.roof);
      for (const k of stones) if (Math.sin((k / 5) * Math.PI * 2 + 0.4) >= 0) stone(k);
      A.flags.push(pt(x, top - 24));
      break;
    }
    case 'well': {
      const [x, y] = st.stand(1.3);
      const by = y - 8;
      drum(ctx, x, by, 22, 11, m.wall, m.wall);
      ctx.fillStyle = radial(ctx, x - 4, by - 13, 20, [[0, 0xffffff], [0.35, lit(m.roof, 1.2)], [1, shade(m.roof, 0.5)]]);
      ctx.beginPath(); ctx.ellipse(x, by - 11, 18, 9, 0, 0, Math.PI * 2); ctx.fill();
      glowAt(ctx, x, by - 20, 28, m.roof, 0.55);
      // stone arch with a hanging crystal
      ctx.strokeStyle = css(lit(m.wall, 1.05)); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x - 20, by - 11); ctx.quadraticCurveTo(x, by - 11 - H * 1.3, x + 20, by - 11); ctx.stroke();
      ctx.strokeStyle = css(0x2a2a2a); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x, by - 11 - H * 0.65); ctx.lineTo(x, by - 11 - H * 0.35); ctx.stroke();
      floatingCrystal(ctx, x, by - 6 - H * 0.2, 9, m.roof);
      // mana motes rising
      for (let k = 0; k < 6; k++) { ctx.fillStyle = css(lit(m.roof, 1.4), 0.8); ctx.beginPath(); ctx.arc(x - 12 + r() * 24, by - 16 - r() * 24, 1, 0, Math.PI * 2); ctx.fill(); }
      A.glow.push(pt(x, by - 20));
      A.flags.push(pt(x + 22, by - 14));
      break;
    }
    case 'nexus': {
      const [x0, y0] = st.inset(1.9);
      const g = boxGeo(x0, y0, 1.9, 1.9, 8);
      const w = stoneWall(m.wall, seed, 4);
      faceLeft(ctx, g, (c, U, V, l) => { w(c, U, V, l); c.fillStyle = css(m.roof, 0.8); for (let k = 0; k < 5; k++) c.fillRect(0.15 + k * 0.36, V * 0.5, 0.12, 1.2); });
      faceRight(ctx, g, w); stoneTop(ctx, g, m.wall);
      // four element pillars at the corners (painter's order: back first)
      const elems: Array<[Pt, number]> = [[g.tB, 0xf0f8ff], [g.tR, 0x4aa0e0], [g.tL, 0x9a7a4a], [g.tF, 0xff6a2a]];
      const pillarAt = (p: Pt, color: number) => {
        const px = p.x * 0.8 + g.c.x * 0.2, py = p.y * 0.8 + g.c.y * 0.2 + 2;
        ctx.fillStyle = grad(ctx, px - 3, 0, px + 3, 0, [[0, lit(m.wall, 1.15)], [1, lit(m.wall, 0.6)]]);
        ctx.fillRect(px - 3, py - H * 0.55, 6, H * 0.55);
        glowAt(ctx, px, py - H * 0.55 - 4, 9, color, 0.7);
        ctx.fillStyle = radial(ctx, px - 1, py - H * 0.55 - 5, 4, [[0, 0xffffff], [1, color]]); ctx.beginPath(); ctx.arc(px, py - H * 0.55 - 4, 3, 0, Math.PI * 2); ctx.fill();
      };
      pillarAt(...elems[0]); pillarAt(...elems[1]);
      // the great crystal
      const tiers = def.id.endsWith('_3') ? 3 : def.id.endsWith('_2') ? 2 : 1;
      floatingCrystal(ctx, g.c.x, g.c.y - 14, 26 + tiers * 8, m.roof);
      ctx.strokeStyle = css(lit(m.roof, 1.3), 0.6); ctx.lineWidth = 1.2;
      for (let k = 0; k < tiers; k++) { ctx.beginPath(); ctx.ellipse(g.c.x, g.c.y - 28 - k * 8, 18 + k * 4, 5 + k, 0, 0, Math.PI * 2); ctx.stroke(); }
      pillarAt(...elems[2]); pillarAt(...elems[3]);
      A.flags.push(pt(g.tB.x, g.tB.y - H * 0.55 - 10));
      break;
    }
    // ---------------------------------------------------------------- Cogspark
    case 'factory': {
      const [x0, y0] = st.inset(1.85);
      const g = boxGeo(x0, y0, 1.85, 1.6, H * 0.5);
      const wall = metalWall(m.wall, seed);
      const kind = def.id;
      faceLeft(ctx, g, (c, U, V, l) => {
        wall(c, U, V, l);
        // rolling shutter door
        const dw = kind.includes('tank') || kind.includes('heavy') || kind.includes('assault') || kind.includes('mine') || kind.includes('rocket') ? 0.75 : 0.5;
        const du = U * 0.12;
        c.fillStyle = css(lit(0x3a3a3e, l)); c.fillRect(du, 0, dw, Math.min(V - 4, 16));
        c.fillStyle = css(0x000000, 0.35); for (let v = 2; v < Math.min(V - 4, 16); v += 2) c.fillRect(du, v, dw, 0.5);
        for (let u = du; u < du + dw; u += 0.1) { c.fillStyle = css(u % 0.2 < 0.1 ? 0xd8b030 : 0x2a2a2a); c.fillRect(u, Math.min(V - 4, 16), 0.1, 1.6); }
        windowAt(c, U * 0.72, V * 0.55, 0.18, 4, l);
      });
      faceRight(ctx, g, (c, U, V, l) => { wall(c, U, V, l); windowAt(c, U * 0.35, V * 0.55, 0.2, 4, l); });
      // sawtooth roof: three teeth rising towards the back
      faceTop(ctx, g, (c, U, W) => { c.fillStyle = css(lit(shade(m.wall, 0.8), LIGHT.top)); c.fillRect(0, 0, U, W); });
      for (let k = 0; k < 3; k++) {
        const t0 = k / 3, t1 = (k + 1) / 3;
        const a0 = lerp(g.tL, g.tB, t0), a1 = lerp(g.tF, g.tR, t0), b0 = lerp(g.tL, g.tB, t1), b1 = lerp(g.tF, g.tR, t1);
        const rise = 9;
        fillPoly(ctx, [[a0.x, a0.y], [a1.x, a1.y], [b1.x, b1.y - rise], [b0.x, b0.y - rise]], css(lit(m.roof, 1.05)));
        fillPoly(ctx, [[b0.x, b0.y], [b1.x, b1.y], [b1.x, b1.y - rise], [b0.x, b0.y - rise]], css(0x9ad0e0, 0.75));
        ctx.strokeStyle = css(0x000000, 0.35); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(b0.x, b0.y - rise); ctx.lineTo(b1.x, b1.y - rise); ctx.stroke();
      }
      const big = kind.includes('arsenal') || kind.includes('works') || kind.includes('forge') || kind.includes('heavy') || kind.includes('rocket') || kind.includes('assault');
      smokestack(ctx, g.tB.x + 10, g.tB.y + 6, 22 + H * 0.3, 3.4);
      if (big) smokestack(ctx, g.tB.x + 22, g.tB.y + 10, 16 + H * 0.25, 2.8);
      // shop sign on the front gable
      const sign = lerp(g.tL, g.tF, 0.5);
      if (kind.includes('gun_smith') || kind.includes('arsenal')) { glowAt(ctx, sign.x, sign.y - 4, 8, 0xff8030, 0.7); ctx.fillStyle = css(0xff8030); ctx.beginPath(); ctx.moveTo(sign.x - 3, sign.y - 1); ctx.quadraticCurveTo(sign.x, sign.y - 12, sign.x + 3, sign.y - 1); ctx.fill(); }
      else if (kind.includes('golem') || kind.includes('forge')) gearAt(ctx, sign.x, sign.y - 6, 7, kind.includes('adamant') ? 0x6a9ac0 : m.roof, 9);
      else if (kind.includes('shredder')) { ctx.fillStyle = css(0xd0d0d0); ctx.beginPath(); for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; ctx.lineTo(sign.x + Math.cos(a) * 6, sign.y - 6 + Math.sin(a) * 5); ctx.lineTo(sign.x + Math.cos(a + 0.26) * 4.5, sign.y - 6 + Math.sin(a + 0.26) * 3.8); } ctx.fill(); }
      else { gearAt(ctx, sign.x - 4, sign.y - 5, 4.5, m.roof, 8); gearAt(ctx, sign.x + 4, sign.y - 8, 3.5, 0xb08a4a, 7); }
      A.flags.push(g.tB);
      break;
    }
    case 'hangar': {
      const [x0, y0] = st.inset(1.8);
      const g = boxGeo(x0, y0, 1.8, 1.7, 2);
      // half-cylinder shell along x: draw the curved front end and the long side as stacked arcs
      const rH = H * 0.75;
      const steps = 14;
      for (let i = steps; i >= 0; i--) {
        const t = i / steps;
        const a = lerp(g.L, g.B, 0) as Pt;
        void a;
        const p0 = lerp(g.L, g.B, t * 0.95), p1 = lerp(g.F, g.R, t * 0.95);
        ctx.fillStyle = grad(ctx, 0, p0.y - rH, 0, p0.y, [[0, lit(m.wall, 1.25)], [0.6, lit(m.wall, 0.95)], [1, lit(m.wall, 0.65)]]);
        ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.bezierCurveTo(p0.x, p0.y - rH * 1.3, p1.x, p1.y - rH * 1.3, p1.x, p1.y); ctx.closePath(); ctx.fill();
        if (i % 2 === 0) { ctx.strokeStyle = css(0x000000, 0.2); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.bezierCurveTo(p0.x, p0.y - rH * 1.3, p1.x, p1.y - rH * 1.3, p1.x, p1.y); ctx.stroke(); }
      }
      // open front end (dark interior with a propeller nose peeking out)
      ctx.fillStyle = css(0x1a1a1e); ctx.beginPath(); ctx.moveTo(g.L.x + 6, g.L.y); ctx.bezierCurveTo(g.L.x + 6, g.L.y - rH * 1.05, g.F.x - 6, g.F.y - rH * 1.05, g.F.x - 6, g.F.y); ctx.closePath(); ctx.fill();
      const mouth = lerp(g.L, g.F, 0.5);
      ctx.fillStyle = css(m.roof); ctx.beginPath(); ctx.ellipse(mouth.x, mouth.y - 8, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = css(0xd0d0c8); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(mouth.x - 9, mouth.y - 10); ctx.lineTo(mouth.x + 9, mouth.y - 6); ctx.stroke();
      // hazard stripe along the arch
      ctx.strokeStyle = css(0xd8b030, 0.9); ctx.lineWidth = 1.6; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(g.L.x + 3, g.L.y); ctx.bezierCurveTo(g.L.x + 3, g.L.y - rH * 1.2, g.F.x - 3, g.F.y - rH * 1.2, g.F.x - 3, g.F.y); ctx.stroke(); ctx.setLineDash([]);
      // windsock mast on the back
      const mast = pt(g.R.x - 4, g.R.y);
      ctx.strokeStyle = css(0x3a3a3a); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(mast.x, mast.y); ctx.lineTo(mast.x, mast.y - H * 1.2); ctx.stroke();
      fillPoly(ctx, [[mast.x, mast.y - H * 1.2], [mast.x + 12, mast.y - H * 1.2 + 2], [mast.x + 11, mast.y - H * 1.2 + 5], [mast.x, mast.y - H * 1.2 + 6]], css(0xe05a2a));
      if (def.id.includes('bomber')) { for (let k = 0; k < 3; k++) { ctx.fillStyle = css(0x3a3a32); ctx.beginPath(); ctx.ellipse(g.F.x + 4 + k * 5, g.F.y - 3, 2.4, 1.6, 0, 0, Math.PI * 2); ctx.fill(); } }
      A.flags.push(pt(mast.x, mast.y - H * 1.2));
      break;
    }
    case 'lab': {
      const [x0, y0] = st.inset(1.6);
      const g = boxGeo(x0, y0, 1.6, 1.3, H * 0.5);
      const concrete: FacePainter = (c, U, V, l) => {
        c.fillStyle = css(lit(0x8a867a, l)); c.fillRect(0, 0, U, V);
        for (let u = 0, i = 0; u < U; u += 0.12, i++) { c.fillStyle = css(i % 2 ? 0xd8b030 : 0x2a2a2a); c.fillRect(u, V - 4, 0.12, 4); }
        c.fillStyle = css(0x000000, 0.15); for (let v = 6; v < V - 4; v += 6) c.fillRect(0, v, U, 0.6);
        wallShading(c, U, V, l);
      };
      faceLeft(ctx, g, (c, U, V, l) => { concrete(c, U, V, l); doorAt(c, U * 0.3, 0.3, Math.min(11, V * 0.6), l); c.fillStyle = css(0xd03020); c.fillRect(U * 0.7, V * 0.45, 0.18, 6); c.fillStyle = css(0xffffff); c.fillRect(U * 0.78, V * 0.5, 0.025, 3.5); c.fillRect(U * 0.78, V * 0.5 - 1.4, 0.025, 0.8); });
      faceRight(ctx, g, concrete);
      stoneTop(ctx, g, 0x7a766a);
      // barrels of blasting powder
      for (let k = 0; k < 4; k++) {
        const bx = g.F.x + 2 + (k % 2) * 8, byy = g.F.y - 2 - Math.floor(k / 2) * 10;
        drum(ctx, bx, byy, 4, 9, 0xb04a2a, 0x6a3a1a);
        ctx.fillStyle = css(0xffe060); ctx.fillRect(bx - 1, byy - 6, 2, 3);
      }
      // sparking antenna
      const an = lerp(g.tL, g.tB, 0.5);
      ctx.strokeStyle = css(0x3a3a3a); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(an.x, an.y); ctx.lineTo(an.x, an.y - H * 0.8); ctx.stroke();
      glowAt(ctx, an.x, an.y - H * 0.8, 6, 0xff4020, 0.9);
      A.glow.push(pt(an.x, an.y - H * 0.8));
      A.smoke.push(pt(lerp(g.tF, g.tR, 0.5).x, lerp(g.tF, g.tR, 0.5).y - 2));
      A.flags.push(g.tB);
      break;
    }
    case 'generator': {
      const [x, y] = st.stand(1.3);
      const by = y - 8;
      drum(ctx, x, by, 20, 10, m.wall, shade(m.wall, 0.8));
      drum(ctx, x, by - 10, 9, H * 0.45, 0x5a5a62, 0x4a4a52);
      // coils
      for (let k = 0; k < 4; k++) { ctx.strokeStyle = css(0xc08040); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(x, by - 14 - k * (H * 0.1), 10, 4, 0, 0, Math.PI); ctx.stroke(); }
      // translucent energy dome
      const top = by - 10 - H * 0.45;
      glowAt(ctx, x, top - 6, 30, m.roof, 0.45);
      ctx.fillStyle = radial(ctx, x - 6, top - 14, 26, [[0, 0xffffff, 0.7], [0.4, m.roof, 0.45], [1, m.roof, 0.1]]);
      ctx.beginPath(); ctx.ellipse(x, top, 22, 10, 0, 0, Math.PI); ctx.bezierCurveTo(x + 22, top - 26, x - 22, top - 26, x - 22, top); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = css(lit(m.roof, 1.3), 0.7); ctx.lineWidth = 0.8;
      for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x + k * 12, top + 4); ctx.quadraticCurveTo(x + k * 10, top - 16, x, top - 19); ctx.stroke(); }
      A.glow.push(pt(x, top - 8));
      A.flags.push(pt(x + 22, by - 10));
      break;
    }
    case 'tesla': {
      const [x, y] = st.stand(1.3);
      const by = y - 6;
      drum(ctx, x, by, 16, 6, 0x5a5a62, 0x4a4a52);
      const h = H * 1.25;
      // lattice tower: four legs tapering, cross bracing
      ctx.strokeStyle = css(lit(shade(m.wall, 0.55), 1)); ctx.lineWidth = 2.6;
      const legs = [[-11, 3], [11, 3], [-7, -2], [7, -2]] as const;
      for (const [dx, dy] of legs) { ctx.beginPath(); ctx.moveTo(x + dx, by - 6 + dy); ctx.lineTo(x + dx * 0.25, by - 6 - h); ctx.stroke(); }
      ctx.lineWidth = 1.3;
      for (let k = 0; k < 6; k++) {
        const t0 = k / 6, t1 = (k + 1) / 6, w0 = 11 * (1 - t0 * 0.75), w1 = 11 * (1 - t1 * 0.75);
        ctx.beginPath(); ctx.moveTo(x - w0, by - 3 - h * t0); ctx.lineTo(x + w1, by - 3 - h * t1); ctx.moveTo(x + w0, by - 3 - h * t0); ctx.lineTo(x - w1, by - 3 - h * t1); ctx.stroke();
      }
      // coil rings and the orb
      const top = by - 6 - h;
      for (let k = 0; k < 3; k++) { ctx.strokeStyle = css(0xc08040); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(x, top + 6 + k * 4, 7 - k, 2.5, 0, 0, Math.PI * 2); ctx.stroke(); }
      glowAt(ctx, x, top - 4, 22, m.roof, 0.6);
      ctx.fillStyle = radial(ctx, x - 2, top - 6, 8, [[0, 0xffffff], [0.5, lit(m.roof, 1.2)], [1, shade(m.roof, 0.6)]]);
      ctx.beginPath(); ctx.arc(x, top - 4, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = css(0xe8ffff, 0.9); ctx.lineWidth = 0.9;
      for (let k = 0; k < 4; k++) { const a = k * 1.7 + 0.5; ctx.beginPath(); ctx.moveTo(x, top - 4); ctx.lineTo(x + Math.cos(a) * 9 + (r() - 0.5) * 3, top - 4 + Math.sin(a) * 7); ctx.lineTo(x + Math.cos(a) * 15, top - 4 + Math.sin(a) * 10); ctx.stroke(); }
      A.glow.push(pt(x, top - 4));
      A.flags.push(pt(x + 14, by - 4));
      break;
    }
    case 'scrapheap': {
      const [x, y] = st.stand(1.7);
      // heap of plates, pipes and gears
      for (let i = 0; i < 40; i++) {
        const a = r() * Math.PI, d = r();
        const px = x + Math.cos(a) * 36 * d, py = y - 6 - Math.sin(a) * 34 * (1 - d * 0.6) + 4;
        const k = r();
        if (k < 0.45) fillPoly(ctx, [[px - 10, py], [px - 3, py - 8 - r() * 5], [px + 10, py - 5], [px + 7, py + 3]], css(lit(r() < 0.5 ? m.wall : 0x6a6a72, 0.7 + r() * 0.5)));
        else if (k < 0.7) { ctx.strokeStyle = css(lit(0x5a5a62, 0.8 + r() * 0.4)); ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(px - 9, py); ctx.lineTo(px + 9, py - 6 + r() * 9); ctx.stroke(); }
        else gearAt(ctx, px, py - 3, 5 + r() * 4, r() < 0.5 ? 0xb08a4a : 0x7a7a82, 8);
      }
      // crane arm
      const base = pt(x + 22, y - 4);
      ctx.strokeStyle = css(0xd8b030); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(base.x - 4, base.y - H * 1.2); ctx.lineTo(base.x - 28, base.y - H * 1.1); ctx.stroke();
      ctx.strokeStyle = css(0x2a2a2a); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(base.x - 26, base.y - H * 1.1); ctx.lineTo(base.x - 26, base.y - H * 0.6); ctx.stroke();
      ctx.strokeStyle = css(0x2a2a2a); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(base.x - 26, base.y - H * 0.6 + 2, 2.5, 0, Math.PI); ctx.stroke();
      // a wrench sign
      ctx.strokeStyle = css(0xb8bec8); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x - 24, y - 10); ctx.lineTo(x - 18, y - 22); ctx.stroke();
      ctx.beginPath(); ctx.arc(x - 17, y - 24, 3, -2.5, 1.5); ctx.stroke();
      A.flags.push(pt(base.x - 4, base.y - H * 1.2));
      A.smoke.push(pt(x, y - 24));
      break;
    }
    case 'exchange': {
      const [x0, y0] = st.inset(1.6);
      const g = boxGeo(x0, y0, 1.6, 1.4, H * 0.55);
      const wall = metalWall(m.wall, seed);
      faceLeft(ctx, g, (c, U, V, l) => { wall(c, U, V, l); doorAt(c, U * 0.4, 0.3, Math.min(12, V * 0.6), l); windowAt(c, U * 0.1, V * 0.55, 0.16, 5, l); windowAt(c, U * 0.78, V * 0.55, 0.16, 5, l); });
      faceRight(ctx, g, (c, U, V, l) => { wall(c, U, V, l); windowAt(c, U * 0.4, V * 0.55, 0.2, 5, l); });
      stoneTop(ctx, g, 0x4a4a4a);
      // brass dome with a coin finial
      ctx.fillStyle = radial(ctx, g.c.x - 6, g.c.y - 14, 24, [[0, 0xf0d080], [0.5, 0xb08a4a], [1, 0x6a4a2a]]);
      ctx.beginPath(); ctx.ellipse(g.c.x, g.c.y, 18, 8, 0, 0, Math.PI); ctx.bezierCurveTo(g.c.x + 18, g.c.y - 22, g.c.x - 18, g.c.y - 22, g.c.x - 18, g.c.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = radial(ctx, g.c.x - 1, g.c.y - 24, 6, [[0, 0xfff0a0], [1, 0xc09020]]);
      ctx.beginPath(); ctx.ellipse(g.c.x, g.c.y - 23, 4.5, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = css(0x6a4a10); ctx.font = 'bold 6px sans-serif'; ctx.fillText('$', g.c.x - 1.8, g.c.y - 21);
      // hanging gear-coin sign
      const sg = lerp(g.tL, g.tF, 0.3);
      gearAt(ctx, sg.x - 6, sg.y + 8, 6, 0xd0a040, 10);
      A.flags.push(g.tB);
      break;
    }
    case 'foundry': {
      const [x0, y0] = st.inset(1.9);
      const g = boxGeo(x0, y0, 1.9, 1.7, H * 0.45);
      const wall = metalWall(m.wall, seed);
      faceLeft(ctx, g, (c, U, V, l) => {
        wall(c, U, V, l);
        // molten forge mouth
        c.fillStyle = grad(c, 0, 0, 0, Math.min(V - 3, 16), [[0, 0xffe080], [0.5, 0xff7a20], [1, 0x8a2010]]);
        c.fillRect(U * 0.3, 0, 0.7, Math.min(V - 3, 16));
        c.fillStyle = css(0x2a2a2a); c.fillRect(U * 0.3 - 0.04, Math.min(V - 3, 16), 0.78, 2);
      });
      faceRight(ctx, g, (c, U, V, l) => { wall(c, U, V, l); windowAt(c, U * 0.3, V * 0.5, 0.2, 5, l); windowAt(c, U * 0.65, V * 0.5, 0.2, 5, l); });
      faceTop(ctx, g, (c, U, W) => { c.fillStyle = css(lit(0x4a4a4e, LIGHT.top)); c.fillRect(0, 0, U, W); });
      const mouth = lerp(g.L, g.F, 0.48);
      glowAt(ctx, mouth.x, mouth.y - 8, 26, 0xff8030, 0.55);
      A.glow.push(pt(mouth.x, mouth.y - 8));
      const tiers = def.id.endsWith('_3') ? 3 : def.id.endsWith('_2') ? 2 : 1;
      for (let k = 0; k < 1 + tiers; k++) smokestack(ctx, g.tB.x + 8 + k * 11, g.tB.y + 4 + k * 4, 26 + H * 0.35 - k * 4, 3.5);
      // gantry crane holding a mech arm over the roof
      const p0 = lerp(g.tL, g.tB, 0.2), p1 = lerp(g.tF, g.tR, 0.2);
      ctx.strokeStyle = css(0xd8b030); ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p0.x, p0.y - H * 0.8); ctx.lineTo(p1.x, p1.y - H * 0.8); ctx.lineTo(p1.x, p1.y); ctx.stroke();
      const hook = lerp(pt(p0.x, p0.y - H * 0.8), pt(p1.x, p1.y - H * 0.8), 0.5);
      ctx.strokeStyle = css(0x2a2a2a); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(hook.x, hook.y); ctx.lineTo(hook.x, hook.y + 10); ctx.stroke();
      ctx.fillStyle = grad(ctx, hook.x - 5, 0, hook.x + 5, 0, [[0, lit(m.roof, 1.3)], [1, lit(m.roof, 0.6)]]);
      ctx.fillRect(hook.x - 4, hook.y + 10, 8, 12);
      ctx.fillStyle = css(0x1a1a1a); for (let k = 0; k < 3; k++) ctx.fillRect(hook.x - 3 + k * 2.4, hook.y + 22, 1.4, 4);
      A.flags.push(pt(p0.x, p0.y - H * 0.8));
      break;
    }
    default:
      BUILDING_PAINTERS[m.style]?.(ctx, def, st);
  }
}
