import { BUILDING_PAINTERS, PLINTHS, UNIT_PAINTERS } from '../painters';
import { css, fillPoly, grad, lit, mix, radial, rng, shade, softEllipse, type Ctx } from '../paint';
import { blob, bolt, fillTri, glow, humanoid, limb, quadruped } from '../units';
import {
  A, HX, HY, boxGeo, centreOf, cornerFor, drum, faceLeft, faceRight, glowAt, lerp, pt, roundTower, stoneTop, stoneWall,
  type FacePainter,
} from '../structures';

/**
 * Doomforge Pact (demons): horned red chaos warriors, goat-legged satyrs, a quill-backed demon,
 * the pale twins, a winged succubus, blood fiends, a red dragon and a burning infernal. Buildings
 * are obsidian citadels with spikes and lava seams, brass demon cages, a blood fountain, a dragon
 * nest in a lava crag, a fel-green demon gate, a ruined magic tower, a volcano and a shrine with a
 * burning fist, on cracked obsidian with glowing lava veins.
 */

const LAVA = 0xff6a1a;
const TAU = Math.PI * 2;
type SFn = (v: number) => number;

/** Curved horns on a head at (x, y). */
function horns(c: Ctx, x: number, y: number, S: SFn, color = 0x2a1a12, big = false) {
  for (const d of [-1, 1]) {
    c.fillStyle = css(color);
    c.beginPath(); c.moveTo(x + d * S(1.2), y - S(2.5)); c.quadraticCurveTo(x + d * S(big ? 7 : 5), y - S(big ? 6 : 4), x + d * S(big ? 5 : 3.5), y - S(big ? 10 : 7.5)); c.quadraticCurveTo(x + d * S(big ? 4 : 3), y - S(5), x + d * S(0.2), y - S(2.2)); c.fill();
  }
}

/** Bat-like demon wing. */
function demonWing(c: Ctx, x: number, y: number, S: SFn, dir: number, color: number, l: number, flap = 0) {
  const tipY = y - S(14) - S(6) * flap;
  c.fillStyle = css(lit(color, l), 0.95);
  c.beginPath(); c.moveTo(x, y); c.lineTo(x + dir * S(5), tipY); c.lineTo(x + dir * S(13), tipY + S(4)); c.lineTo(x + dir * S(10), y - S(4)); c.lineTo(x + dir * S(14), y + S(1)); c.lineTo(x + dir * S(7), y - S(1)); c.lineTo(x + dir * S(4), y + S(4)); c.closePath(); c.fill();
  c.strokeStyle = css(lit(color, l * 0.5)); c.lineWidth = S(0.6); c.beginPath(); c.moveTo(x, y); c.lineTo(x + dir * S(5), tipY); c.moveTo(x, y); c.lineTo(x + dir * S(10), y - S(4)); c.stroke();
}

// ------------------------------------------------------------------ units

UNIT_PAINTERS.demon = (c, u, cx, fy, S, pose) => {
  const m = u.model, champ = m.variant === 'champion';
  if (champ) glow(c, cx, fy - S(14), S(16), m.accent, 0.25);
  const r = humanoid(c, cx, fy, S, {
    h: champ ? 28 : 27, body: 0x2a1a1a, accent: m.accent, helmet: 'none', armor: 'plate', skin: m.body, attackArm: 'thrust',
    back: (cc) => { for (let k = 0; k < 3; k++) fillTri(cc, cx - S(5) + k * S(2), fy - S(23) + k * S(2), cx - S(9) + k * S(2), fy - S(27) + k * S(2), cx - S(3) + k * S(2), fy - S(22) + k * S(2), 0x8a8a7a); },
    front: (cc, hand) => {
      // a jagged cleaver-sword glowing at the edge
      const ang = pose.attack ? -0.15 : -1.1, len = S(champ ? 15 : 12);
      const tx = hand.x + Math.cos(ang) * len, ty = hand.y + Math.sin(ang) * len, nx = -Math.sin(ang), ny = Math.cos(ang);
      fillPoly(cc, [[hand.x, hand.y], [tx, ty], [tx + nx * S(3), ty + ny * S(3)], [hand.x + nx * S(3.5), hand.y + ny * S(3.5)]], css(0x5a5a62));
      cc.strokeStyle = css(m.accent); cc.lineWidth = S(0.8); cc.beginPath(); cc.moveTo(hand.x + nx * S(3.5), hand.y + ny * S(3.5)); cc.lineTo(tx + nx * S(3), ty + ny * S(3)); cc.stroke();
      if (pose.attack) glow(cc, tx, ty, S(5), m.accent, 0.6);
    },
  }, pose);
  horns(c, r.head.x + S(0.6), r.head.y, S, 0x2a1a12, champ);
  c.fillStyle = css(0xffd040); c.beginPath(); c.arc(r.head.x + S(2.2), r.head.y - S(0.4), S(0.7), 0, TAU); c.fill();
  if (champ) { c.strokeStyle = css(m.accent, 0.6); c.lineWidth = S(0.8); for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(r.head.x + S(4), r.head.y + S(1), S(2 + k * 2), -0.5, 0.5); c.stroke(); } }
};

UNIT_PAINTERS.satyr = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  // goat legs (backward knees), a furry lower body, a bare torso with a javelin
  const sw = Math.sin(pose.ph * TAU);
  for (const [d, l] of [[-1, 0.75], [1, 1]] as const) {
    const a = pose.moving ? sw * 0.45 * d : 0.08 * d;
    const kx = cx + Math.sin(a) * S(4) + S(2), ky = fy - S(6);
    limb(c, cx, fy - S(12), kx, ky, S(3), m.body, l);
    limb(c, kx, ky, kx - S(2) + Math.sin(a) * S(3), fy - S(1), S(2), shade(m.body, 0.8), l);
    c.fillStyle = css(0x1a1010); c.beginPath(); c.ellipse(kx - S(2) + Math.sin(a) * S(3), fy - S(0.6), S(1.4), S(0.8), 0, 0, TAU); c.fill();
  }
  const r = humanoid(c, cx, fy - S(1), S, { h: 25, body: 0xc08a6a, accent: m.accent, helmet: 'none', armor: 'leaf', skin: 0xc08a6a, riding: true, attackArm: 'draw',
    front: (cc, hand) => { const ang = pose.attack ? -0.1 : -0.7; cc.strokeStyle = css(0x5a3a22); cc.lineWidth = S(1); cc.beginPath(); cc.moveTo(hand.x - Math.cos(ang) * S(6), hand.y - Math.sin(ang) * S(6)); cc.lineTo(hand.x + Math.cos(ang) * S(10), hand.y + Math.sin(ang) * S(10)); cc.stroke(); fillTri(cc, hand.x + Math.cos(ang) * S(10), hand.y + Math.sin(ang) * S(10) - S(1), hand.x + Math.cos(ang) * S(13), hand.y + Math.sin(ang) * S(13), hand.x + Math.cos(ang) * S(10), hand.y + Math.sin(ang) * S(10) + S(1), 0xc8ccd4); } }, { ...pose, moving: false });
  horns(c, r.head.x + S(0.6), r.head.y, S, 0xd8c8a0);
  c.fillStyle = css(0x3a2a1a); c.beginPath(); c.ellipse(r.head.x + S(1.5), r.head.y + S(2.5), S(1.2), S(1.6), 0, 0, TAU); c.fill();
};

UNIT_PAINTERS.quilldemon = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  const { saddle } = quadruped(c, cx, fy, S, pose, { len: 22, h: 11, body: m.body, belly: shade(m.body, 0.7), tail: true, eye: 0xff4020 });
  // a back bristling with long quills
  for (let k = 0; k < 9; k++) {
    const x = saddle.x - S(9) + k * S(2.2), y = saddle.y + S(3);
    c.strokeStyle = css(lit(m.accent, 0.8 + (k % 3) * 0.1)); c.lineWidth = S(0.8);
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - S(3), y - S(8 + (k % 2) * 3)); c.stroke();
    c.fillStyle = css(0x2a1a1a); c.beginPath(); c.arc(x - S(3), y - S(8 + (k % 2) * 3), S(0.5), 0, TAU); c.fill();
  }
  if (pose.attack) for (let k = 0; k < 3; k++) { c.strokeStyle = css(m.accent); c.lineWidth = S(0.7); c.beginPath(); c.moveTo(cx + S(12 + k * 4), fy - S(14) - k * S(2)); c.lineTo(cx + S(16 + k * 4), fy - S(15) - k * S(2)); c.stroke(); }
};

UNIT_PAINTERS.twin = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  const ph = pose.ph * TAU;
  const y = fy - S(8) + Math.sin(ph) * S(1.5);
  // a floating pale figure split into a laughing and a weeping half, robes trailing
  glow(c, cx, y - S(10), S(18), m.body, 0.35);
  c.fillStyle = grad(c, cx - S(8), 0, cx + S(8), 0, [[0, lit(m.body, 1.2)], [0.5, lit(m.body, 1)], [0.5, lit(m.accent, 1.1)], [1, lit(m.accent, 0.7)]]);
  c.beginPath(); c.moveTo(cx - S(5), y - S(20)); c.quadraticCurveTo(cx - S(11), y - S(4), cx - S(7), y + S(6)); c.lineTo(cx + S(7), y + S(6)); c.quadraticCurveTo(cx + S(11), y - S(4), cx + S(5), y - S(20)); c.closePath(); c.fill();
  blob(c, cx, y - S(24), S(4.6), S(4.8), 0xf8f0f8, 1);
  c.fillStyle = css(m.accent); c.beginPath(); c.arc(cx, y - S(24), S(4.6), -Math.PI / 2, Math.PI / 2); c.fill();
  // smile on the pale side, a tear on the dark side
  c.strokeStyle = css(0x2a0a2a); c.lineWidth = S(0.7); c.beginPath(); c.arc(cx - S(1.6), y - S(23), S(1.5), 0.2, Math.PI - 0.2); c.stroke();
  c.fillStyle = css(0x2a0a2a); c.beginPath(); c.arc(cx - S(2), y - S(25), S(0.5), 0, TAU); c.fill();
  c.fillStyle = css(0xf8f0f8); c.beginPath(); c.arc(cx + S(2), y - S(25), S(0.5), 0, TAU); c.fill();
  c.fillStyle = css(0x9ad0ff); c.beginPath(); c.ellipse(cx + S(2), y - S(22.5), S(0.5), S(1), 0, 0, TAU); c.fill();
  // clawed hands, one slashing
  limb(c, cx - S(4), y - S(18), cx - S(9), y - S(10), S(1.8), lit(m.body, 0.9), 0.8);
  const hx = cx + S(pose.attack ? 13 : 8), hy = y - S(pose.attack ? 20 : 11);
  limb(c, cx + S(4), y - S(18), hx, hy, S(1.8), m.accent, 1);
  if (pose.attack) { c.strokeStyle = css(0xffffff, 0.8); c.lineWidth = S(0.7); for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(hx, hy + S(2), S(4 + k * 1.5), -1, 0.3); c.stroke(); } }
};

UNIT_PAINTERS.succubus = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  const flap = Math.sin(pose.ph * TAU);
  demonWing(c, cx - S(2), fy - S(20), S, -1, 0x6a1a3a, 0.75, flap);
  const r = humanoid(c, cx, fy, S, { h: 27, body: 0x3a1a2a, accent: m.accent, helmet: 'none', armor: 'leather', skin: m.body, attackArm: 'raise',
    front: (cc, hand) => { glow(cc, hand.x, hand.y - S(2), S(pose.attack ? 6 : 3), 0xc02060, 0.8); } }, pose);
  // long dark hair, horns, a whip-thin tail
  c.fillStyle = css(0x1a0a12); c.beginPath(); c.moveTo(r.head.x + S(2), r.head.y - S(3)); c.quadraticCurveTo(r.head.x - S(6), r.head.y - S(3), r.head.x - S(4), r.head.y + S(9)); c.lineTo(r.head.x - S(1), r.head.y + S(2)); c.fill();
  horns(c, r.head.x + S(0.6), r.head.y, S, 0x2a0a1a);
  c.strokeStyle = css(m.body); c.lineWidth = S(1); c.beginPath(); c.moveTo(cx - S(2), r.hip.y); c.quadraticCurveTo(cx - S(10), r.hip.y + S(4), cx - S(9), fy - S(2)); c.stroke();
  fillTri(c, cx - S(10), fy - S(3), cx - S(8), fy - S(1), cx - S(10.5), fy, m.body);
  demonWing(c, cx + S(1), fy - S(20), S, 1, 0x8a2a4a, 1, flap);
  if (pose.attack) bolt(c, cx + S(8), fy - S(34), cx + S(22), fy - S(22), S, 4, 0xff6ab0);
};

UNIT_PAINTERS.fiend = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  // a hunched blood-red beast on two legs, long claws, a spiked spine and glowing veins
  const ph = pose.ph * TAU;
  const bob = pose.moving ? -Math.abs(Math.cos(ph)) * S(1) : 0;
  softEllipse(c, cx, fy, S(10), S(2.6), 0x000000, 0.3);
  for (const [dx, off, l] of [[-3, 0, 0.75], [3, Math.PI, 1]] as const) {
    const a = pose.moving ? Math.sin(ph + off) * 0.4 : 0;
    const kx = cx + S(dx) + Math.sin(a) * S(4) + S(2), ky = fy - S(7);
    limb(c, cx + S(dx), fy - S(13) + bob, kx, ky, S(3.4), m.body, l);
    limb(c, kx, ky, kx - S(2) + Math.sin(a) * S(3), fy - S(1), S(2.4), shade(m.body, 0.8), l);
  }
  c.fillStyle = grad(c, cx - S(9), 0, cx + S(9), 0, [[0, lit(m.body, 1.25)], [1, lit(m.body, 0.6)]]);
  c.beginPath(); c.ellipse(cx + S(1), fy - S(18) + bob, S(9), S(7), -0.4, 0, TAU); c.fill();
  for (let k = 0; k < 5; k++) fillTri(c, cx - S(6) + k * S(2.6), fy - S(23) + bob - k * S(0.8), cx - S(5) + k * S(2.6), fy - S(28) + bob - k * S(0.8), cx - S(4) + k * S(2.6), fy - S(22.5) + bob - k * S(0.8), 0x2a1a1a);
  c.strokeStyle = css(m.accent, 0.8); c.lineWidth = S(0.6); c.beginPath(); c.moveTo(cx - S(5), fy - S(16) + bob); c.lineTo(cx, fy - S(19) + bob); c.lineTo(cx + S(4), fy - S(15) + bob); c.stroke();
  blob(c, cx + S(9), fy - S(23) + bob, S(3.6), S(3), m.body, 1.05);
  horns(c, cx + S(9), fy - S(23) + bob, S, 0x1a1010);
  c.fillStyle = css(0xffd040); c.beginPath(); c.arc(cx + S(11), fy - S(23.5) + bob, S(0.7), 0, TAU); c.fill();
  const fx = cx + S(pose.attack ? 15 : 11), fyy = fy - S(pose.attack ? 24 : 14) + bob;
  limb(c, cx + S(5), fy - S(20) + bob, fx, fyy, S(2.6), m.body, 1.05);
  c.strokeStyle = css(0xf0e8d8); c.lineWidth = S(0.7); for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(fx, fyy + k * S(1)); c.lineTo(fx + S(4), fyy + k * S(1.6)); c.stroke(); }
};

UNIT_PAINTERS.reddragon = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  const y = fy - S(32) + Math.sin(pose.ph * TAU) * S(1);
  const flap = pose.attack ? 0.2 : Math.sin(pose.ph * TAU);
  const wing = (dir: number, l: number) => {
    const tipY = y - S(15) * flap * dir - S(4);
    c.fillStyle = grad(c, cx, y, cx + S(22), tipY, [[0, lit(m.body, 1.05 * l)], [1, lit(m.accent, 0.95 * l)]]);
    c.beginPath(); c.moveTo(cx - S(3), y - S(2)); c.lineTo(cx + S(6), tipY - S(5)); c.lineTo(cx + S(22), tipY); c.lineTo(cx + S(16), y); c.lineTo(cx + S(10), y - S(2)); c.lineTo(cx + S(5), y + S(2)); c.closePath(); c.fill();
    c.strokeStyle = css(lit(m.body, 0.5 * l)); c.lineWidth = S(0.6); for (const tx of [6, 22, 16]) { c.beginPath(); c.moveTo(cx - S(2), y - S(1)); c.lineTo(cx + S(tx), tx === 16 ? y : tipY - (tx === 6 ? S(5) : 0)); c.stroke(); }
  };
  wing(-1, 0.7);
  c.strokeStyle = css(lit(m.body, 0.9)); c.lineWidth = S(2.8); c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx - S(4), y + S(1)); c.quadraticCurveTo(cx - S(15), y + S(5), cx - S(22), y - S(1)); c.stroke();
  fillTri(c, cx - S(22), y - S(1), cx - S(26), y - S(4), cx - S(23), y + S(2), m.accent);
  blob(c, cx, y + S(1), S(7.5), S(4.2), m.body);
  for (let k = 0; k < 5; k++) fillTri(c, cx - S(6) + k * S(3), y - S(3), cx - S(5) + k * S(3), y - S(6), cx - S(4) + k * S(3), y - S(3), 0x3a1a12);
  blob(c, cx + S(10), y - S(3), S(4), S(3), m.body, 1.1);
  horns(c, cx + S(9), y - S(3), S, 0x2a1a12);
  c.fillStyle = css(0xffd040); c.beginPath(); c.arc(cx + S(11.5), y - S(3.5), S(0.7), 0, TAU); c.fill();
  if (pose.attack) { glow(c, cx + S(20), y - S(1), S(9), LAVA, 0.8); c.fillStyle = grad(c, cx + S(13), 0, cx + S(28), 0, [[0, 0xfff0a0, 0.95], [0.5, LAVA, 0.8], [1, 0xb01a1a, 0]]); c.beginPath(); c.moveTo(cx + S(13), y - S(3)); c.lineTo(cx + S(28), y - S(7)); c.lineTo(cx + S(28), y + S(4)); c.fill(); }
  wing(1, 1.05);
};

UNIT_PAINTERS.infernal = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  const ph = pose.ph * TAU;
  const bob = pose.moving ? -Math.abs(Math.cos(ph)) * S(1) : 0;
  glow(c, cx, fy - S(16), S(22), m.accent, 0.35);
  softEllipse(c, cx, fy, S(13), S(3.2), 0x000000, 0.35);
  // a stone giant of cracked obsidian, green fire leaking from every seam and blazing on its head
  const rock = (x: number, y: number, rx: number, ry: number, l = 1) => {
    c.fillStyle = grad(c, x - rx, y - ry, x + rx, y + ry, [[0, lit(m.body, 1.3 * l)], [1, lit(m.body, 0.55 * l)]]);
    c.beginPath(); c.moveTo(x - rx, y + ry * 0.3); c.lineTo(x - rx * 0.6, y - ry); c.lineTo(x + rx * 0.5, y - ry * 0.9); c.lineTo(x + rx, y); c.lineTo(x + rx * 0.6, y + ry); c.lineTo(x - rx * 0.6, y + ry * 0.9); c.closePath(); c.fill();
  };
  for (const [dx, off, l] of [[-5, 0, 0.75], [5, Math.PI, 1]] as const) {
    const a = pose.moving ? Math.sin(ph + off) * 0.3 : 0;
    rock(cx + S(dx) + Math.sin(a) * S(3), fy - S(5), S(4.5), S(5), l);
  }
  rock(cx - S(11), fy - S(18) + bob, S(5), S(5), 0.7);
  rock(cx, fy - S(20) + bob, S(11), S(11));
  c.strokeStyle = css(m.accent, 0.95); c.lineWidth = S(1);
  c.beginPath(); c.moveTo(cx - S(7), fy - S(26) + bob); c.lineTo(cx - S(2), fy - S(20) + bob); c.lineTo(cx + S(3), fy - S(24) + bob); c.lineTo(cx + S(6), fy - S(15) + bob); c.moveTo(cx - S(4), fy - S(12) + bob); c.lineTo(cx + S(1), fy - S(16) + bob); c.stroke();
  rock(cx + S(5), fy - S(33) + bob, S(5), S(4.5), 1.05);
  for (let k = 0; k < 5; k++) fillTri(c, cx + S(1) + k * S(2), fy - S(36) + bob, cx + S(2) + k * S(2) + Math.sin(ph * 2 + k) * S(1), fy - S(43 + (k % 2) * 3) + bob, cx + S(3) + k * S(2), fy - S(36) + bob, k % 2 ? 0xd0ff90 : m.accent, 0.9);
  c.fillStyle = css(m.accent); c.fillRect(cx + S(6), fy - S(34) + bob, S(2.4), S(1));
  const fx = cx + S(pose.attack ? 15 : 12), fyy = fy - S(pose.attack ? 34 : 14) + bob;
  rock(cx + S(9), (fyy + fy - S(22) + bob) / 2, S(3.6), S(4));
  rock(fx, fyy, S(5.5), S(5.5), 1.1);
  glow(c, fx, fyy, S(6), m.accent, 0.5);
};

// ------------------------------------------------------------------ buildings

/** Cracked obsidian with glowing lava veins (Doomforge ground). */
PLINTHS.doomforge = (ctx, ox, oy, s, seed) => {
  const r = rng(seed + 51);
  const c = centreOf(ox, oy, s);
  softEllipse(ctx, c.x, c.y, s * HX * 0.95, s * HY * 0.95, 0x1a1214, 0.9);
  softEllipse(ctx, c.x - 5, c.y - 2, s * HX * 0.7, s * HY * 0.7, 0x2a1e1e, 0.6);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    let x = c.x + (r() - 0.5) * s * HX * 1.2, y = c.y + (r() - 0.5) * s * HY;
    ctx.strokeStyle = css(LAVA, 0.7); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 14; y += (r() - 0.5) * 6; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  ctx.restore();
};

/** Black obsidian blocks with glowing lava seams. */
function obsidianWall(seed: number, glowColor = LAVA): FacePainter {
  const base = stoneWall(0x3a2a2a, seed, 6);
  return (c, U, V, l) => {
    const r = rng(seed);
    base(c, U, V, l * 0.8);
    c.strokeStyle = css(glowColor, 0.85); c.lineWidth = 0.012;
    for (let k = 0; k < 3; k++) { let u = r() * U, v = r() * V; c.beginPath(); c.moveTo(u, v); for (let j = 0; j < 3; j++) { u += (r() - 0.5) * 0.3; v += (r() - 0.5) * 8; c.lineTo(u, v); } c.stroke(); }
    c.fillStyle = grad(c, 0, 0, 0, 8, [[0, glowColor, 0.35], [1, glowColor, 0]]); c.fillRect(0, 0, U, 8);
  };
}

function spikes(ctx: Ctx, a: { x: number; y: number }, b: { x: number; y: number }, n: number, h: number, color = 0x2a1a1a) {
  for (let k = 0; k <= n; k++) { const p = lerp(a, b, k / n); fillTri(ctx, p.x - 2, p.y, p.x + 0.5, p.y - h - (k % 2) * 3, p.x + 2.5, p.y, color); }
}

BUILDING_PAINTERS.chaoscitadel = (ctx, def, st) => {
  const m = def.model;
  const [x0, y0] = st.inset(1.7);
  const g = boxGeo(x0, y0, 1.7, 1.5, st.H * 0.55);
  const wall = obsidianWall(st.seed);
  faceLeft(ctx, g, (c, U, V, l) => { wall(c, U, V, l); c.fillStyle = css(0x0a0505); c.beginPath(); c.moveTo(U * 0.38, 0); c.lineTo(U * 0.38, V * 0.5); c.lineTo(U * 0.5, V * 0.7); c.lineTo(U * 0.62, V * 0.5); c.lineTo(U * 0.62, 0); c.fill(); c.fillStyle = css(m.roof, 0.5); c.fillRect(U * 0.38, 0, U * 0.24, 4); });
  faceRight(ctx, g, wall); stoneTop(ctx, g, 0x2a1e1e);
  spikes(ctx, g.tL, g.tF, 6, 7); spikes(ctx, g.tF, g.tR, 4, 6);
  // two horn-shaped towers
  for (const p of [g.tB, g.tR]) {
    const b = pt(p.x * 0.85 + g.c.x * 0.15, p.y * 0.85 + g.c.y * 0.15 + 4);
    ctx.fillStyle = grad(ctx, b.x - 5, 0, b.x + 5, 0, [[0, 0x4a3a3a], [1, 0x1a1212]]);
    ctx.beginPath(); ctx.moveTo(b.x - 5, b.y); ctx.quadraticCurveTo(b.x - 4, b.y - st.H * 0.8, b.x + 6, b.y - st.H * 1.05); ctx.quadraticCurveTo(b.x + 1, b.y - st.H * 0.6, b.x + 5, b.y); ctx.fill();
  }
  glowAt(ctx, g.c.x, g.c.y - 4, 18, m.roof, 0.4);
  A.glow.push(pt(g.c.x, g.c.y - 4));
  A.flags.push(pt(g.tR.x, g.tR.y - st.H));
};

BUILDING_PAINTERS.demoncage = (ctx, def, st) => {
  const m = def.model;
  const [x, y] = st.stand(1.6);
  const by = y - 6, h = st.H * 1.05;
  drum(ctx, x, by, 26, 5, 0x3a2a2a, 0x2a1e1e);
  // brass bars on the back half, the caged demon's eyes glowing inside, bars in front
  const bars = (front: boolean) => {
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * TAU; if ((Math.sin(a) > 0) !== front) continue;
      const px = x + Math.cos(a) * 22, py = by - 5 + Math.sin(a) * 9;
      ctx.strokeStyle = css(lit(m.wall, front ? 1.1 : 0.7)); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px * 0.8 + x * 0.2, py - h); ctx.stroke();
    }
  };
  bars(false);
  glowAt(ctx, x, by - h * 0.45, 20, m.roof, 0.6);
  for (const dx of [-3, 3]) { ctx.fillStyle = css(0xffe040); ctx.beginPath(); ctx.ellipse(x + dx, by - h * 0.5, 1.6, 1, 0, 0, TAU); ctx.fill(); }
  bars(true);
  ctx.strokeStyle = css(lit(m.wall, 1)); ctx.lineWidth = 2.6; ctx.beginPath(); ctx.ellipse(x, by - 5 - h, 18, 7, 0, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, by - 5 - h - 7); ctx.lineTo(x, by - 5 - h - 16); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, by - 5 - h - 19, 3, 0, TAU); ctx.stroke();
  A.glow.push(pt(x, by - h * 0.45));
  A.flags.push(pt(x, by - 5 - h - 22));
};

BUILDING_PAINTERS.greedaltar = (ctx, def, st) => {
  const m = def.model;
  const [x0, y0] = st.inset(1.5);
  const g = boxGeo(x0, y0, 1.5, 1.5, 8);
  const wall = obsidianWall(st.seed, m.roof);
  faceLeft(ctx, g, wall); faceRight(ctx, g, wall); stoneTop(ctx, g, 0x2a1e1e);
  // a golden altar heaped with coins, two serpent-horned pillars, a magenta flame
  const c0 = g.c;
  for (const d of [-1, 1]) { const px = c0.x + d * 18, py = c0.y + 2; ctx.fillStyle = grad(ctx, px - 3, 0, px + 3, 0, [[0, 0x5a4a3a], [1, 0x2a1e1e]]); ctx.fillRect(px - 3, py - st.H * 0.9, 6, st.H * 0.9); horns(ctx, px, py - st.H * 0.9, (v) => v * 1.5, m.roof); }
  ctx.fillStyle = radial(ctx, c0.x - 4, c0.y - 8, 16, [[0, 0xfff0a0], [0.6, m.roof], [1, 0x8a5a1a]]);
  ctx.beginPath(); ctx.ellipse(c0.x, c0.y - 4, 13, 6, 0, Math.PI, TAU); ctx.lineTo(c0.x + 13, c0.y); ctx.lineTo(c0.x - 13, c0.y); ctx.fill();
  for (let k = 0; k < 8; k++) { ctx.fillStyle = css(0xffe080); ctx.beginPath(); ctx.ellipse(c0.x - 10 + k * 3, c0.y - 2 - (k % 3) * 2, 1.8, 0.9, 0, 0, TAU); ctx.fill(); }
  glowAt(ctx, c0.x, c0.y - 18, 16, 0xc02060, 0.6);
  for (let k = 0; k < 3; k++) fillTri(ctx, c0.x - 4 + k * 4, c0.y - 8, c0.x - 2 + k * 4, c0.y - 22 + (k % 2) * 5, c0.x + k * 4, c0.y - 8, k % 2 ? 0xff8ad0 : 0xc02060, 0.85);
  A.glow.push(pt(c0.x, c0.y - 16));
  A.flags.push(pt(c0.x + 18, c0.y - st.H * 0.9 - 8));
};

BUILDING_PAINTERS.bloodfountain = (ctx, def, st) => {
  const m = def.model;
  const [x, y] = st.stand(1.6);
  const by = y - 8;
  drum(ctx, x, by, 30, 8, 0x3a2a2a, m.roof);
  ctx.fillStyle = radial(ctx, x - 6, by - 10, 28, [[0, 0xff6a5a], [0.5, m.roof], [1, 0x4a0a0a]]);
  ctx.beginPath(); ctx.ellipse(x, by - 8, 26, 12, 0, 0, TAU); ctx.fill();
  // a skull-topped pillar spewing blood from its jaws
  drum(ctx, x, by - 8, 6, st.H * 0.65, 0x4a3a3a, 0x3a2a2a);
  const top = by - 8 - st.H * 0.65;
  blob(ctx, x, top - 4, 6, 5.5, 0xd8c8b0);
  ctx.fillStyle = css(0x1a0a0a); ctx.beginPath(); ctx.arc(x - 2, top - 5, 1.4, 0, TAU); ctx.arc(x + 2, top - 5, 1.4, 0, TAU); ctx.fill();
  ctx.strokeStyle = css(m.roof, 0.9); ctx.lineWidth = 2;
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + d * 2, top - 1); ctx.quadraticCurveTo(x + d * 16, top + 2, x + d * 20, by - 8); ctx.stroke(); }
  A.flags.push(pt(x + 28, by - 10));
};

BUILDING_PAINTERS.dragonnest = (ctx, def, st) => {
  const m = def.model;
  const r = rng(st.seed);
  const [x, y] = st.stand(1.6);
  const h = st.H * 1.05;
  // a lava-cracked crag with a nest of charred bones and glowing eggs
  fillPoly(ctx, [[x - 26, y - 2], [x - 16, y - h * 0.7], [x - 6, y - h], [x + 4, y - h * 0.95], [x, y]], css(lit(m.wall, 1.05)));
  fillPoly(ctx, [[x, y], [x + 4, y - h * 0.95], [x + 14, y - h * 0.6], [x + 26, y - 2]], css(lit(m.wall, 0.6)));
  ctx.strokeStyle = css(m.roof, 0.9); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 14, y - 4); ctx.lineTo(x - 8, y - h * 0.5); ctx.lineTo(x - 4, y - h * 0.8); ctx.stroke();
  glowAt(ctx, x - 6, y - h * 0.5, 14, m.roof, 0.4);
  for (let i = 0; i < 30; i++) { const a = r() * TAU, d = 9 + r() * 6; ctx.strokeStyle = css(r() < 0.4 ? 0xd8c8b0 : 0x2a1a12); ctx.lineWidth = 1; const px = x - 2 + Math.cos(a) * d, py = y - h + 2 + Math.sin(a) * d * 0.35; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + (r() - 0.5) * 10, py + (r() - 0.5) * 3); ctx.stroke(); }
  for (let k = 0; k < 3; k++) { glowAt(ctx, x - 6 + k * 6, y - h - 2, 5, m.roof, 0.5); ctx.fillStyle = radial(ctx, x - 6 + k * 6, y - h - 3, 4, [[0, 0xfff0a0], [1, 0xb02a1a]]); ctx.beginPath(); ctx.ellipse(x - 6 + k * 6, y - h - 2, 2.6, 3.4, 0, 0, TAU); ctx.fill(); }
  A.glow.push(pt(x, y - h));
  A.flags.push(pt(x + 16, y - h * 0.6));
};

BUILDING_PAINTERS.demongate = (ctx, def, st) => {
  const m = def.model;
  const [x0, y0] = st.inset(1.8);
  const g = boxGeo(x0, y0, 1.8, 1.6, 6);
  const w = obsidianWall(st.seed, m.roof);
  faceLeft(ctx, g, w); faceRight(ctx, g, w); stoneTop(ctx, g, 0x2a1e1e);
  // two spiked horn pillars framing a swirling fel-green portal
  const c0 = g.c, H = st.H * 1.05;
  glowAt(ctx, c0.x, c0.y - H * 0.55, H * 0.9, m.roof, 0.45);
  ctx.fillStyle = radial(ctx, c0.x, c0.y - H * 0.55, H * 0.5, [[0, 0xe0ffc0, 0.95], [0.5, m.roof, 0.8], [1, 0x1a3a0a, 0.5]]);
  ctx.beginPath(); ctx.ellipse(c0.x, c0.y - H * 0.55, H * 0.32, H * 0.5, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = css(0xffffff, 0.5); ctx.lineWidth = 1;
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(c0.x, c0.y - H * 0.55, H * (0.1 + k * 0.08), H * (0.16 + k * 0.12), k, 0, Math.PI * 1.4); ctx.stroke(); }
  for (const d of [-1, 1]) {
    const px = c0.x + d * H * 0.38;
    ctx.fillStyle = grad(ctx, px - 5, 0, px + 5, 0, [[0, 0x4a3a3a], [1, 0x1a1212]]);
    ctx.beginPath(); ctx.moveTo(px - 5, c0.y + 2); ctx.lineTo(px - 3, c0.y - H); ctx.quadraticCurveTo(px - d * 8, c0.y - H - 14, px - d * 16, c0.y - H - 8); ctx.quadraticCurveTo(px - d * 4, c0.y - H - 4, px + 4, c0.y - H * 0.8); ctx.lineTo(px + 5, c0.y + 2); ctx.fill();
    spikes(ctx, pt(px - 4, c0.y - H * 0.3), pt(px - 4, c0.y - H * 0.8), 3, 4);
  }
  A.glow.push(pt(c0.x, c0.y - H * 0.55));
  A.flags.push(pt(c0.x - H * 0.38 - 16, c0.y - H - 8));
};

BUILDING_PAINTERS.magicruin = (ctx, def, st) => {
  const m = def.model;
  const r = rng(st.seed);
  const [x, y] = st.stand(1.3);
  const by = y - 6;
  // a broken wizard tower: jagged top edge, floating chunks, chaotic magic sparking out
  roundTower(ctx, x, by, 13, st.H * 0.85, m.wall, st.seed);
  const top = by - st.H * 0.85;
  ctx.fillStyle = css(0x1a1212); ctx.beginPath(); ctx.moveTo(x - 13, top);
  for (let k = 0; k <= 8; k++) ctx.lineTo(x - 13 + k * 3.25, top - (k % 2 ? 8 + r() * 6 : 0)); ctx.lineTo(x + 13, top + 4); ctx.lineTo(x - 13, top + 4); ctx.fill();
  for (let k = 0; k < 4; k++) { const cx2 = x - 14 + r() * 28, cy2 = top - 14 - r() * 16; fillPoly(ctx, [[cx2 - 4, cy2], [cx2, cy2 - 4], [cx2 + 4, cy2 + 1], [cx2, cy2 + 4]], css(lit(m.wall, 0.8 + r() * 0.3))); }
  glowAt(ctx, x, top - 10, 24, m.roof, 0.55);
  for (let k = 0; k < 5; k++) { const a = r() * TAU; ctx.strokeStyle = css(k % 2 ? m.roof : 0xb070ff, 0.9); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, top - 10); ctx.lineTo(x + Math.cos(a) * 10 + (r() - 0.5) * 4, top - 10 + Math.sin(a) * 8); ctx.lineTo(x + Math.cos(a) * 18, top - 10 + Math.sin(a) * 12); ctx.stroke(); }
  A.glow.push(pt(x, top - 10));
  A.flags.push(pt(x + 14, by - 4));
};

BUILDING_PAINTERS.volcano = (ctx, def, st) => {
  const m = def.model;
  const r = rng(st.seed);
  const [x, y] = st.stand(1.7);
  const h = st.H * 1.25;
  // a small cone volcano with lava rivers and a glowing crater
  ctx.fillStyle = grad(ctx, x - 34, 0, x + 34, 0, [[0, lit(m.wall, 1.15)], [0.5, lit(m.wall, 0.9)], [1, lit(m.wall, 0.55)]]);
  ctx.beginPath(); ctx.moveTo(x - 34, y - 2); ctx.lineTo(x - 9, y - h); ctx.lineTo(x + 9, y - h); ctx.lineTo(x + 34, y - 2); ctx.quadraticCurveTo(x, y + 8, x - 34, y - 2); ctx.fill();
  ctx.fillStyle = radial(ctx, x, y - h, 12, [[0, 0xfff0a0], [0.5, m.roof], [1, 0x6a1a0a]]); ctx.beginPath(); ctx.ellipse(x, y - h, 9, 3.5, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) { let px = x - 4 + k * 4, py = y - h + 2; ctx.strokeStyle = css(m.roof, 0.85); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(px, py); for (let j = 0; j < 5; j++) { px += (k - 1) * 4 + (r() - 0.5) * 4; py += h / 6; ctx.lineTo(px, py); } ctx.stroke(); }
  ctx.restore();
  glowAt(ctx, x, y - h - 6, 24, m.roof, 0.6);
  for (let k = 0; k < 5; k++) { blob(ctx, x - 6 + r() * 12, y - h - 8 - r() * 14, 1.6, 1.6, 0x5a4a42); }
  A.glow.push(pt(x, y - h));
  A.smoke.push(pt(x, y - h - 4));
  A.flags.push(pt(x + 26, y - 6));
};

BUILDING_PAINTERS.destructionshrine = (ctx, def, st) => {
  const m = def.model;
  const [x0, y0] = st.inset(1.6);
  const g = boxGeo(x0, y0, 1.6, 1.6, 7);
  const w = obsidianWall(st.seed);
  faceLeft(ctx, g, w); faceRight(ctx, g, w); stoneTop(ctx, g, 0x2a1e1e);
  // a giant clenched stone fist rising from the shrine, wreathed in fire
  const c0 = g.c, H = st.H * 1.1;
  ctx.fillStyle = grad(ctx, c0.x - 8, 0, c0.x + 8, 0, [[0, 0x5a4a4a], [1, 0x2a1e1e]]);
  ctx.fillRect(c0.x - 7, c0.y - H * 0.6, 14, H * 0.6);
  blob(ctx, c0.x, c0.y - H * 0.75, 12, 11, 0x4a3a3a, 1);
  for (let k = 0; k < 4; k++) blob(ctx, c0.x - 7 + k * 4.6, c0.y - H * 0.75 - 9, 2.6, 3, 0x5a4a4a, 1.1);
  ctx.strokeStyle = css(m.roof, 0.9); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(c0.x - 6, c0.y - H * 0.7); ctx.lineTo(c0.x + 2, c0.y - H * 0.8); ctx.lineTo(c0.x + 7, c0.y - H * 0.68); ctx.stroke();
  glowAt(ctx, c0.x, c0.y - H * 0.8, 26, m.roof, 0.55);
  for (let k = 0; k < 6; k++) fillTri(ctx, c0.x - 14 + k * 5.5, c0.y - H * 0.65, c0.x - 12 + k * 5.5, c0.y - H - 6 - (k % 2) * 6, c0.x - 10 + k * 5.5, c0.y - H * 0.65, k % 2 ? 0xffd040 : m.roof, 0.8);
  A.glow.push(pt(c0.x, c0.y - H * 0.8));
  A.flags.push(pt(g.tB.x, g.tB.y - 6));
};

BUILDING_PAINTERS.eraser = (ctx, def, st) => {
  const m = def.model;
  const [x0, y0] = st.inset(1.8);
  const g = boxGeo(x0, y0, 1.8, 1.8, 8);
  const w = obsidianWall(st.seed, m.roof);
  faceLeft(ctx, g, w); faceRight(ctx, g, w); stoneTop(ctx, g, 0x2a1e1e);
  // a black monolith with a void eye, ringed by floating shards being unmade
  const c0 = g.c, H = st.H * 1.25;
  const cc = cornerFor(c0, 0.6);
  const t = boxGeo(cc.x, cc.y, 0.6, 0.6, H);
  const tw: FacePainter = (c, U, V, l) => { c.fillStyle = grad(c, 0, 0, 0, V, [[0, lit(0x2a1a2a, l)], [1, lit(0x4a2a4a, l)]]); c.fillRect(0, 0, U, V); c.strokeStyle = css(m.roof, 0.7); c.lineWidth = 0.01; for (let v = 6; v < V; v += 9) { c.beginPath(); c.moveTo(0, v); c.lineTo(U, v + 2); c.stroke(); } };
  faceLeft(ctx, t, tw); faceRight(ctx, t, tw); stoneTop(ctx, t, 0x1a0a1a);
  const eye = pt(t.c.x, t.c.y + H * 0.35);
  glowAt(ctx, eye.x, eye.y, 22, m.roof, 0.6);
  ctx.fillStyle = css(0x0a000a); ctx.beginPath(); ctx.ellipse(eye.x, eye.y, 7, 4, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = css(m.roof); ctx.beginPath(); ctx.ellipse(eye.x, eye.y, 2, 3.4, 0, 0, TAU); ctx.fill();
  const tiers = def.id.endsWith('_3') ? 3 : def.id.endsWith('_2') ? 2 : 1;
  for (let k = 0; k < 4 + tiers * 2; k++) {
    const a = (k / (4 + tiers * 2)) * TAU, px = c0.x + Math.cos(a) * 26, py = c0.y - H * 0.5 + Math.sin(a) * 9;
    ctx.fillStyle = css(0x3a2a3a, 0.4 + 0.4 * (Math.sin(a) > 0 ? 1 : 0)); ctx.fillRect(px - 2, py - 2, 4, 4);
    ctx.strokeStyle = css(m.roof, 0.6); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 4, py - 3); ctx.stroke();
  }
  A.glow.push(eye);
  A.flags.push(pt(g.tB.x, g.tB.y - 6));
};

void mix;
