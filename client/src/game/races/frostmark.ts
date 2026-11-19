import { BUILDING_PAINTERS, PLINTHS, UNIT_PAINTERS } from '../painters';
import { css, fillPoly, grad, lit, mix, radial, rng, shade, softEllipse, type Ctx } from '../paint';
import { blob, fillTri, glow, humanoid, limb, quadruped, staff } from '../units';
import {
  A, HX, HY, boxGeo, centreOf, drum, faceLeft, faceRight, faceTop, glowAt, lerp, pt, roundHut, roundTower, stoneTop, stoneWall,
  type FacePainter,
} from '../structures';

/**
 * Frostmark Clans (northerners): white wolves and polar bears, a tusked magnataur, shaggy
 * wendigos, snowball-hurling yetis, blue ice trolls, a crowned ice queen and azure drakes.
 * Buildings are snow-capped rocks, ice caves, igloos, fur huts, a crystal palace, frost
 * mushrooms and frozen towers, on packed snow with ice crystals.
 */

const SNOW = 0xeef4fa;
const ICE = 0x8ad0f0;
const TAU = Math.PI * 2;
type SFn = (v: number) => number;

function iceShard(c: Ctx, x: number, y: number, h: number, w: number, color = ICE) {
  fillPoly(c, [[x, y - h], [x - w, y - h * 0.3], [x, y]], css(lit(color, 1.25), 0.95));
  fillPoly(c, [[x, y - h], [x + w, y - h * 0.3], [x, y]], css(lit(color, 0.8), 0.95));
  fillPoly(c, [[x, y - h], [x - w * 0.35, y - h * 0.4], [x, y - h * 0.2]], css(0xffffff, 0.55));
}

/** Snow cap over the top of a lump (x center, y top line). */
function snowCap(c: Ctx, x: number, y: number, w: number, seed: number) {
  const r = rng(seed);
  c.fillStyle = css(SNOW);
  c.beginPath(); c.moveTo(x - w, y + 2);
  for (let k = 0; k <= 8; k++) c.lineTo(x - w + (k / 8) * 2 * w, y - 2 + (k % 2 ? r() * 4 : 0) - Math.sin((k / 8) * Math.PI) * 4);
  c.lineTo(x + w, y + 2);
  for (let k = 8; k >= 0; k--) c.lineTo(x - w + (k / 8) * 2 * w, y + 3 + r() * 3);
  c.fill();
}

// ------------------------------------------------------------------ units

UNIT_PAINTERS.frostbeast = (c, u, cx, fy, S, pose) => {
  const m = u.model, bear = m.variant === 'bear';
  quadruped(c, cx, fy, S, pose, bear
    ? { len: 26, h: 12, body: m.body, belly: shade(m.body, 0.85), tail: false, eye: 0x1a1a2a }
    : { len: 20, h: 9, body: m.body, belly: shade(m.body, 0.8), tail: true, mane: 0xb8c8d8, eye: 0x6ad0f0 });
  const hx = cx + S(bear ? 15 : 12), hy = fy - S(bear ? 13 : 10);
  if (bear) { blob(c, hx, hy, S(5), S(4), m.body, 1.1); c.fillStyle = css(0x2a2a3a); c.beginPath(); c.arc(hx + S(4.5), hy + S(0.5), S(1), 0, TAU); c.fill(); for (const d of [-1.5, 1.5]) { c.fillStyle = css(m.body); c.beginPath(); c.arc(hx - S(1) + d, hy - S(3.5), S(1.3), 0, TAU); c.fill(); } }
  else { fillTri(c, hx - S(1), hy - S(2), hx, hy - S(6), hx + S(1.5), hy - S(2), lit(m.body, 1.1)); fillTri(c, hx + S(2), hy - S(1), hx + S(7), hy + S(1), hx + S(2), hy + S(2), lit(m.body, 1)); }
  // frosty breath / claws
  if (pose.attack) { c.strokeStyle = css(0xffffff, 0.85); c.lineWidth = S(0.7); for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(hx + S(5 + k), hy - S(2) + k * S(1.6)); c.lineTo(hx + S(9 + k), hy - S(4) + k * S(2)); c.stroke(); } }
  softEllipse(c, cx, fy - S(2), S(10), S(2), 0xffffff, 0.15);
};

UNIT_PAINTERS.magnataur = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  // a walrus-tusked centaur giant: four-legged furry body, humanoid torso
  const { saddle } = quadruped(c, cx - S(2), fy, S, pose, { len: 26, h: 12, body: mix(m.body, 0x5a5a6a, 0.3), belly: shade(m.body, 0.7), tail: true, mane: SNOW });
  const tx = saddle.x + S(8), ty = saddle.y + S(2);
  limb(c, tx - S(2), ty, tx, ty - S(13), S(7), m.body, 1);
  blob(c, tx, ty - S(17), S(4.6), S(4), m.body, 1.05);
  // huge tusks and a white mane
  for (const d of [0, 2]) { c.strokeStyle = css(0xf8f0e0); c.lineWidth = S(1.3); c.beginPath(); c.moveTo(tx + S(2) + d * S(0.6), ty - S(15)); c.quadraticCurveTo(tx + S(5) + d * S(0.6), ty - S(10), tx + S(3) + d * S(0.6), ty - S(7)); c.stroke(); }
  c.fillStyle = css(SNOW); c.beginPath(); c.ellipse(tx - S(3), ty - S(16), S(3), S(5), 0.4, 0, TAU); c.fill();
  c.fillStyle = css(0x1a1a2a); c.beginPath(); c.arc(tx + S(2), ty - S(18), S(0.7), 0, TAU); c.fill();
  // a great ice-crusted club
  const ang = pose.attack ? -0.1 : -1.3;
  const hx = tx + S(5), hy = ty - S(9);
  c.strokeStyle = css(lit(0x5a4a3a, 1)); c.lineWidth = S(2.2);
  c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + Math.cos(ang) * S(14), hy + Math.sin(ang) * S(14)); c.stroke();
  blob(c, hx + Math.cos(ang) * S(15), hy + Math.sin(ang) * S(15), S(3.4), S(3.4), 0x9ac8e0, 1.1);
  if (pose.attack) glow(c, hx + Math.cos(ang) * S(15), hy + Math.sin(ang) * S(15), S(6), ICE, 0.6);
};

UNIT_PAINTERS.wendigo = (c, u, cx, fy, S, pose) => {
  const m = u.model, ancient = m.variant === 'ancient';
  const ph = pose.ph * TAU;
  const bob = pose.moving ? -Math.abs(Math.cos(ph)) * S(1.2) : 0;
  softEllipse(c, cx, fy, S(11), S(3), 0x000000, 0.3);
  // hunched, shaggy white giant with long clawed arms and curled horns
  for (const [dx, off, l] of [[-4, 0, 0.75], [4, Math.PI, 1]] as const) {
    const a = pose.moving ? Math.sin(ph + off) * 0.35 : 0;
    limb(c, cx + S(dx), fy - S(12) + bob, cx + S(dx) + Math.sin(a) * S(5), fy - S(1), S(5), m.body, l);
  }
  limb(c, cx - S(5), fy - S(24) + bob, cx - S(9), fy - S(10) + bob, S(4), m.body, 0.75);
  c.fillStyle = grad(c, cx - S(10), 0, cx + S(10), 0, [[0, lit(m.body, 1.25)], [1, lit(m.body, 0.65)]]);
  c.beginPath(); c.ellipse(cx, fy - S(20) + bob, S(10), S(11), 0.25, 0, TAU); c.fill();
  c.strokeStyle = css(0x000000, 0.12); c.lineWidth = S(0.6);
  for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; c.beginPath(); c.moveTo(cx + Math.cos(a) * S(7), fy - S(20) + bob + Math.sin(a) * S(8)); c.lineTo(cx + Math.cos(a) * S(10), fy - S(20) + bob + Math.sin(a) * S(11) + S(2)); c.stroke(); }
  const hx = cx + S(7), hy = fy - S(28) + bob;
  blob(c, hx, hy, S(4.4), S(3.8), lit(m.body, 0.9), 1);
  c.fillStyle = css(m.accent); c.beginPath(); c.arc(hx + S(2), hy - S(0.6), S(0.8), 0, TAU); c.fill();
  glow(c, hx + S(2), hy - S(0.6), S(2), m.accent, 0.6);
  c.strokeStyle = css(0xc8b8a0); c.lineWidth = S(1.4);
  c.beginPath(); c.moveTo(hx - S(1), hy - S(3)); c.quadraticCurveTo(hx - S(6), hy - S(9), hx - S(2), hy - S(10)); c.stroke();
  if (ancient) { c.beginPath(); c.moveTo(hx + S(1), hy - S(3)); c.quadraticCurveTo(hx + S(4), hy - S(10), hx + S(8), hy - S(9)); c.stroke(); glow(c, hx, hy, S(10), m.accent, 0.25); }
  // claw arm swipe
  const fx = cx + S(pose.attack ? 16 : 12), fyy = fy - S(pose.attack ? 26 : 14) + bob;
  limb(c, cx + S(5), fy - S(24) + bob, fx, fyy, S(4), m.body, 1.05);
  c.strokeStyle = css(0xf0f0f0); c.lineWidth = S(0.8);
  for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(fx, fyy + k * S(1.2)); c.lineTo(fx + S(4), fyy + k * S(1.6) + S(1)); c.stroke(); }
};

UNIT_PAINTERS.yeti = (c, u, cx, fy, S, pose) => {
  const m = u.model, raging = m.variant === 'raging';
  const ph = pose.ph * TAU;
  const bob = pose.moving ? -Math.abs(Math.cos(ph)) * S(1) : 0;
  softEllipse(c, cx, fy, S(9), S(2.5), 0x000000, 0.25);
  for (const [dx, off, l] of [[-3, 0, 0.75], [3, Math.PI, 1]] as const) {
    const a = pose.moving ? Math.sin(ph + off) * 0.4 : 0;
    limb(c, cx + S(dx), fy - S(9) + bob, cx + S(dx) + Math.sin(a) * S(4), fy - S(1), S(4), m.body, l);
  }
  // round furry body and head, blue face, horns
  blob(c, cx, fy - S(16) + bob, S(8), S(9), m.body);
  c.strokeStyle = css(0x000000, 0.1); c.lineWidth = S(0.5);
  for (let k = 0; k < 8; k++) { c.beginPath(); c.moveTo(cx - S(6) + k * S(1.6), fy - S(9) + bob); c.lineTo(cx - S(6) + k * S(1.6), fy - S(7) + bob); c.stroke(); }
  c.fillStyle = css(0x6a9ac0); c.beginPath(); c.ellipse(cx + S(4), fy - S(20) + bob, S(3), S(3.2), 0, 0, TAU); c.fill();
  c.fillStyle = css(0xffffff); c.beginPath(); c.arc(cx + S(5), fy - S(21) + bob, S(0.7), 0, TAU); c.fill();
  fillTri(c, cx + S(4), fy - S(16.5) + bob, cx + S(6), fy - S(18) + bob, cx + S(4), fy - S(18) + bob, 0xf0f0f0);
  for (const d of [-1, 1]) { c.strokeStyle = css(0xd8c8a8); c.lineWidth = S(1.2); c.beginPath(); c.moveTo(cx + S(2) + d * S(2.5), fy - S(23) + bob); c.quadraticCurveTo(cx + d * S(6), fy - S(28) + bob, cx + d * S(4), fy - S(30) + bob); c.stroke(); }
  if (raging) { for (let k = 0; k < 3; k++) iceShard(c, cx - S(6) + k * S(3), fy - S(22) + bob, S(5), S(1.4)); }
  // throwing arm with an ice ball
  const hx = cx + S(pose.attack ? 11 : 6), hy = fy - S(pose.attack ? 24 : 14) + bob;
  limb(c, cx + S(5), fy - S(17) + bob, hx, hy, S(3.4), m.body, 1.05);
  blob(c, hx + S(1), hy - S(2), S(2.6), S(2.6), 0xe0f4ff, 1.15);
  if (pose.attack) { glow(c, hx + S(10), hy, S(4), ICE, 0.6); blob(c, hx + S(10), hy, S(2), S(2), 0xe0f4ff, 1.2); }
};

UNIT_PAINTERS.icetroll = (c, u, cx, fy, S, pose) => {
  const m = u.model, doc = m.variant === 'doctor';
  glow(c, cx, fy - S(14), S(14), ICE, 0.2);
  const r = humanoid(c, cx, fy, S, { h: 28, body: doc ? 0x3a5a6a : 0x5a6a7a, accent: m.accent, helmet: 'none', armor: 'robe', skin: m.body, attackArm: 'raise', front: staff(S, m.accent, pose.attack) }, pose);
  // troll nose, tusks, a white mohawk and a skull mask for the witch doctor
  const hx = r.head.x + S(0.6), hy = r.head.y;
  c.fillStyle = css(m.body); c.beginPath(); c.moveTo(hx + S(2.6), hy - S(0.6)); c.lineTo(hx + S(6), hy + S(1.2)); c.lineTo(hx + S(2.6), hy + S(1.4)); c.fill();
  for (let k = 0; k < 4; k++) fillTri(c, hx - S(2.4) + k * S(1.5), hy - S(3), hx - S(1.8) + k * S(1.5), hy - S(7 - Math.abs(k - 1.5)), hx - S(1) + k * S(1.5), hy - S(3), SNOW);
  fillTri(c, hx + S(1.6), hy + S(1.6), hx + S(2.2), hy - S(0.6), hx + S(2.7), hy + S(1.6), 0xf0e8d0);
  if (doc) { c.fillStyle = css(0xf0e8d8, 0.9); c.beginPath(); c.ellipse(hx + S(1.5), hy - S(0.3), S(2.6), S(3), 0, 0, TAU); c.fill(); c.fillStyle = css(0x1a2a3a); c.fillRect(hx + S(0.6), hy - S(1), S(1), S(1)); c.fillRect(hx + S(2.2), hy - S(1), S(1), S(1)); }
  // frost armour shimmer
  c.strokeStyle = css(ICE, 0.6); c.lineWidth = S(0.6); c.beginPath(); c.ellipse(cx, fy - S(14), S(9), S(14), 0, 0, TAU); c.stroke();
};

UNIT_PAINTERS.icequeen = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  glow(c, cx, fy - S(16), S(18), ICE, 0.3);
  // a long icy gown flaring to the ground
  c.fillStyle = grad(c, cx - S(10), 0, cx + S(10), 0, [[0, lit(m.body, 1.15)], [0.5, lit(ICE, 1)], [1, lit(m.body, 0.65)]]);
  c.beginPath(); c.moveTo(cx - S(4), fy - S(22)); c.lineTo(cx + S(4), fy - S(22)); c.lineTo(cx + S(11), fy); c.lineTo(cx - S(11), fy); c.closePath(); c.fill();
  for (let k = 0; k < 5; k++) iceShard(c, cx - S(9) + k * S(4.5), fy, S(3 + (k % 2) * 2), S(1.2));
  const r = humanoid(c, cx, fy - S(4), S, { h: 26, body: m.body, accent: ICE, helmet: 'none', armor: 'robe', skin: 0xd8e8f8, attackArm: 'raise', riding: true, front: staff(S, ICE, pose.attack) }, { ...pose, moving: false });
  // white hair and a crown of ice
  c.fillStyle = css(SNOW); c.beginPath(); c.moveTo(r.head.x + S(2), r.head.y - S(3)); c.quadraticCurveTo(r.head.x - S(7), r.head.y - S(3), r.head.x - S(6), r.head.y + S(9)); c.lineTo(r.head.x - S(2), r.head.y + S(2)); c.fill();
  for (let k = 0; k < 5; k++) iceShard(c, r.head.x - S(2.5) + k * S(1.4), r.head.y - S(3), S(3 + (k === 2 ? 3 : k % 2 ? 1 : 2)), S(0.7));
  if (pose.attack) { c.strokeStyle = css(0xe0f8ff, 0.8); c.lineWidth = S(1); c.beginPath(); c.ellipse(cx + S(16), fy - S(4), S(8), S(3), 0, 0, TAU); c.stroke(); }
};

UNIT_PAINTERS.drake = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  const y = fy - S(32) + Math.sin(pose.ph * TAU) * S(1);
  const flap = pose.attack ? 0.2 : Math.sin(pose.ph * TAU);
  const wing = (dir: number, l: number) => {
    const tipY = y - S(14) * flap * dir - S(4);
    c.fillStyle = grad(c, cx, y, cx + S(20), tipY, [[0, lit(m.body, 1.05 * l)], [1, lit(ICE, 1.1 * l)]]);
    c.beginPath(); c.moveTo(cx - S(3), y - S(2)); c.lineTo(cx + S(5), tipY - S(5)); c.lineTo(cx + S(20), tipY); c.lineTo(cx + S(15), y); c.lineTo(cx + S(9), y - S(2)); c.lineTo(cx + S(4), y + S(2)); c.closePath(); c.fill();
    c.strokeStyle = css(SNOW, 0.6 * l); c.lineWidth = S(0.6); c.beginPath(); c.moveTo(cx + S(5), tipY - S(5)); c.lineTo(cx + S(9), y - S(2)); c.stroke();
  };
  wing(-1, 0.7);
  c.strokeStyle = css(lit(m.body, 0.9)); c.lineWidth = S(2.6); c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx - S(4), y + S(1)); c.quadraticCurveTo(cx - S(14), y + S(5), cx - S(20), y); c.stroke();
  blob(c, cx, y + S(1), S(7), S(4), m.body);
  for (let k = 0; k < 5; k++) iceShard(c, cx - S(6) + k * S(3), y - S(2), S(3), S(0.9));
  blob(c, cx + S(9), y - S(2), S(3.6), S(2.8), m.body, 1.1);
  c.fillStyle = css(0xffffff); c.beginPath(); c.arc(cx + S(10.5), y - S(3), S(0.7), 0, TAU); c.fill();
  if (pose.attack) {
    glow(c, cx + S(18), y, S(8), ICE, 0.7);
    c.fillStyle = grad(c, cx + S(12), 0, cx + S(26), 0, [[0, 0xffffff, 0.95], [1, ICE, 0]]);
    c.beginPath(); c.moveTo(cx + S(12), y - S(2)); c.lineTo(cx + S(26), y - S(6)); c.lineTo(cx + S(26), y + S(4)); c.closePath(); c.fill();
  }
  wing(1, 1.05);
};

// ------------------------------------------------------------------ buildings

/** Packed snow with ice crystals (Frostmark ground). */
PLINTHS.frostmark = (ctx, ox, oy, s, seed) => {
  const r = rng(seed + 31);
  const c = centreOf(ox, oy, s);
  softEllipse(ctx, c.x, c.y, s * HX * 1, s * HY * 1, 0xe8f0f8, 0.95);
  softEllipse(ctx, c.x - 6, c.y - 3, s * HX * 0.7, s * HY * 0.7, 0xffffff, 0.6);
  for (let i = 0; i < 30; i++) { ctx.fillStyle = css(r() < 0.5 ? 0xc8d8e8 : 0xffffff, 0.6); ctx.fillRect(c.x + (r() - 0.5) * s * HX * 1.6, c.y + (r() - 0.5) * s * HY * 1.4, 2, 1); }
  for (let i = 0; i < 5; i++) { const a = r() * TAU, d = 0.75 + r() * 0.2; iceShard(ctx, c.x + Math.cos(a) * s * HX * d, c.y + Math.sin(a) * s * HY * d + 2, 6 + r() * 5, 2); }
};

/** Rough logs with snow on every ledge. */
function frozenLogs(seed: number): FacePainter {
  return (c, U, V, l) => {
    const r = rng(seed);
    for (let v = 0; v < V; v += 4.5) {
      c.fillStyle = css(lit(mix(0x5a4a3a, 0x7a6a5a, r()), l)); c.fillRect(0, v, U, 4.2);
      c.fillStyle = css(lit(SNOW, l), 0.85); c.fillRect(0, v + 3.4, U, 1);
    }
    c.fillStyle = css(0x000000, 0.2); c.fillRect(0, 0, U, 4);
  };
}

BUILDING_PAINTERS.snowrocks = (ctx, def, st) => {
  const m = def.model;
  const r = rng(st.seed);
  const [x, y] = st.stand(1.7);
  const rocks: Array<[number, number, number]> = [[-22, -2, 15], [18, -1, 14], [-4, -12, 19], [10, -24, 12], [-14, -26, 11]];
  for (const [dx, dy, rr] of rocks) {
    const bx = x + dx, by = y - 6 + dy;
    ctx.fillStyle = grad(ctx, bx - rr, by - rr, bx + rr, by + rr, [[0, lit(m.wall, 1.25)], [1, lit(m.wall, 0.55)]]);
    ctx.beginPath(); ctx.moveTo(bx - rr, by + rr * 0.4); ctx.lineTo(bx - rr * 0.7, by - rr * 0.8); ctx.lineTo(bx + rr * 0.4, by - rr * 0.9); ctx.lineTo(bx + rr, by); ctx.lineTo(bx + rr * 0.6, by + rr * 0.7); ctx.closePath(); ctx.fill();
    snowCap(ctx, bx - rr * 0.1, by - rr * 0.8, rr * 0.75, st.seed + dx);
  }
  // a dark den mouth with glowing eyes, icicles on the top rocks
  ctx.fillStyle = css(0x0a1018); ctx.beginPath(); ctx.ellipse(x - 2, y - 6, 9, 6, 0, Math.PI, TAU); ctx.fill();
  for (const dx of [-5, 1]) { ctx.fillStyle = css(m.roof); ctx.beginPath(); ctx.arc(x + dx, y - 8, 1, 0, TAU); ctx.fill(); }
  for (let k = 0; k < 4; k++) fillTri(ctx, x - 10 + k * 5, y - 18, x - 9 + k * 5, y - 12 - r() * 4, x - 8 + k * 5, y - 18, 0xd8f0ff);
  A.flags.push(pt(x + 10, y - 38));
};

BUILDING_PAINTERS.icecave = (ctx, def, st) => {
  const m = def.model;
  const [x, y] = st.stand(1.7);
  // a glacier mound with a jagged cave and claw marks
  ctx.fillStyle = grad(ctx, x - 34, 0, x + 34, 0, [[0, lit(0xd8ecf8, 1.15)], [0.5, lit(m.roof, 0.95)], [1, lit(0x6a9ac0, 0.8)]]);
  ctx.beginPath(); ctx.moveTo(x - 34, y - 2); ctx.quadraticCurveTo(x - 30, y - st.H * 1.3, x, y - st.H * 1.25); ctx.quadraticCurveTo(x + 30, y - st.H * 1.2, x + 34, y - 2); ctx.closePath(); ctx.fill();
  for (let k = 0; k < 6; k++) iceShard(ctx, x - 22 + k * 9, y - st.H * (0.9 + (k % 2) * 0.2), 12 + (k % 3) * 4, 3.5, m.roof);
  ctx.fillStyle = css(0x0a1420); ctx.beginPath(); ctx.moveTo(x - 12, y - 2); ctx.lineTo(x - 9, y - 16); ctx.lineTo(x - 3, y - 20); ctx.lineTo(x + 5, y - 17); ctx.lineTo(x + 10, y - 2); ctx.fill();
  ctx.strokeStyle = css(0x2a4a6a, 0.8); ctx.lineWidth = 1.4;
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x + 14 + k * 3, y - 24); ctx.lineTo(x + 18 + k * 3, y - 12); ctx.stroke(); }
  glowAt(ctx, x - 1, y - 10, 10, m.roof, 0.4);
  A.flags.push(pt(x, y - st.H * 1.25));
};

BUILDING_PAINTERS.igloo = (ctx, def, st) => {
  const m = def.model;
  const [x, y] = st.stand(1.6);
  const by = y - 6, R = 28 + st.H * 0.2;
  // dome of snow blocks with an entrance tunnel
  ctx.fillStyle = radial(ctx, x - R * 0.35, by - R * 0.6, R * 1.4, [[0, 0xffffff], [0.6, lit(m.wall, 0.95)], [1, lit(0xa8c0d8, 0.8)]]);
  ctx.beginPath(); ctx.ellipse(x, by, R, R * 0.5, 0, 0, Math.PI); ctx.bezierCurveTo(x + R, by - R * 1.15, x - R, by - R * 1.15, x - R, by); ctx.fill();
  ctx.strokeStyle = css(0x9ab0c8, 0.6); ctx.lineWidth = 0.8;
  for (let k = 1; k < 4; k++) { const t = k / 4; ctx.beginPath(); ctx.ellipse(x, by - R * 0.85 * t, R * Math.sqrt(1 - t * t * 0.9), R * 0.5 * Math.sqrt(1 - t * t * 0.9), 0, 0, Math.PI); ctx.stroke(); }
  drum(ctx, x + R * 0.55, by + 6, 9, 10, 0xf0f8ff, 0xe0ecf8);
  ctx.fillStyle = css(0x0a1420); ctx.beginPath(); ctx.ellipse(x + R * 0.55 + 4, by + 2, 4.5, 6, 0, Math.PI, TAU); ctx.fill();
  // snowballs stacked by the door
  for (let k = 0; k < 4; k++) { const sx = x - R * 0.7 + (k % 2) * 6, sy = by + 2 - Math.floor(k / 2) * 5; ctx.fillStyle = radial(ctx, sx - 1, sy - 1, 4, [[0, 0xffffff], [1, 0xc8d8e8]]); ctx.beginPath(); ctx.arc(sx, sy, 3, 0, TAU); ctx.fill(); }
  A.flags.push(pt(x, by - R * 0.9));
  A.smoke.push(pt(x - 4, by - R * 0.85));
};

BUILDING_PAINTERS.icehut = (ctx, def, st) => {
  const m = def.model;
  const [x, y] = st.stand(1.4);
  const by = y - 10;
  roundHut(ctx, x, by, 34, st.H * 0.5, m.wall, 0xe8f0f8, st.seed);
  // frost totems with blue skulls at the door
  for (const dx of [-36, 36]) {
    ctx.strokeStyle = css(0x3a2a22); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + dx, y); ctx.lineTo(x + dx, y - 24); ctx.stroke();
    blob(ctx, x + dx, y - 26, 3.4, 3, 0xd8f0ff);
    glowAt(ctx, x + dx, y - 26, 6, m.roof, 0.6);
  }
  for (let k = 0; k < 5; k++) fillTri(ctx, x - 20 + k * 10, by + 2, x - 19 + k * 10, by + 9, x - 18 + k * 10, by + 2, 0xd8f0ff);
  A.flags.push(pt(x, by - st.H * 0.5 * 2.3));
  A.smoke.push(pt(x, by - st.H * 1.1));
};

BUILDING_PAINTERS.icepalace = (ctx, def, st) => {
  const m = def.model;
  const [x0, y0] = st.inset(1.8);
  const g = boxGeo(x0, y0, 1.8, 1.8, 8);
  const iceWall: FacePainter = (c, U, V, l) => {
    c.fillStyle = grad(c, 0, 0, 0, V, [[0, lit(0x9ac8e8, l)], [1, lit(0xe0f4ff, l)]]); c.fillRect(0, 0, U, V);
    c.strokeStyle = css(0xffffff, 0.5); c.lineWidth = 0.01; for (let u = 0; u < U; u += 0.2) { c.beginPath(); c.moveTo(u, 0); c.lineTo(u + 0.1, V); c.stroke(); }
  };
  faceLeft(ctx, g, iceWall); faceRight(ctx, g, iceWall);
  faceTop(ctx, g, (c, U, W) => { c.fillStyle = css(0xf0f8ff); c.fillRect(0, 0, U, W); });
  // a cluster of crystal spires, tallest in the middle
  const spires: Array<[number, number, number]> = [[-18, -4, 0.7], [16, -8, 0.8], [0, -10, 1.25], [-8, 4, 0.6], [10, 4, 0.65]];
  for (const [dx, dy, k] of spires) iceShard(ctx, g.c.x + dx, g.c.y + dy, st.H * 1.2 * k, 8 * k, m.roof);
  glowAt(ctx, g.c.x, g.c.y - st.H * 0.6, 30, m.roof, 0.4);
  A.glow.push(pt(g.c.x, g.c.y - st.H * 0.6));
  A.flags.push(pt(g.c.x, g.c.y - 10 - st.H * 1.5));
};

BUILDING_PAINTERS.icenest = (ctx, def, st) => {
  const m = def.model;
  const r = rng(st.seed);
  const [x, y] = st.stand(1.5);
  const h = st.H * 1.1;
  // a frozen crag with a nest of ice on top and drake eggs
  fillPoly(ctx, [[x - 22, y - 2], [x - 12, y - h * 0.7], [x - 4, y - h], [x + 4, y - h * 0.95], [x, y]], css(lit(m.wall, 1.05)));
  fillPoly(ctx, [[x, y], [x + 4, y - h * 0.95], [x + 12, y - h * 0.6], [x + 22, y - 2]], css(lit(m.wall, 0.65)));
  snowCap(ctx, x - 2, y - h, 14, st.seed);
  for (let i = 0; i < 6; i++) iceShard(ctx, x - 12 + i * 5, y - h + 2, 8 + r() * 6, 2.5, ICE);
  for (let k = 0; k < 3; k++) { ctx.fillStyle = radial(ctx, x - 6 + k * 6, y - h - 2, 4, [[0, 0xffffff], [1, m.roof]]); ctx.beginPath(); ctx.ellipse(x - 6 + k * 6, y - h - 1, 2.6, 3.4, 0, 0, TAU); ctx.fill(); }
  A.flags.push(pt(x + 14, y - h * 0.6));
};

BUILDING_PAINTERS.icetower = (ctx, def, st) => {
  const m = def.model;
  const [x, y] = st.stand(1.3);
  const by = y - 6;
  roundTower(ctx, x, by, 13, st.H * 0.9, 0x9aa8b8, st.seed);
  const top = by - st.H * 0.9;
  drum(ctx, x, top, 15, 4, 0xb8c8d8, SNOW);
  // a giant ice crystal held in a claw of stone, icicles hanging down
  for (let k = 0; k < 6; k++) fillTri(ctx, x - 12 + k * 5, top + 2, x - 11 + k * 5, top + 9 + (k % 2) * 4, x - 10 + k * 5, top + 2, 0xd8f0ff);
  iceShard(ctx, x, top - 4, 28, 9, m.roof);
  glowAt(ctx, x, top - 16, 18, m.roof, 0.45);
  A.glow.push(pt(x, top - 16));
  A.flags.push(pt(x + 14, top - 4));
};

BUILDING_PAINTERS.frostshroom = (ctx, def, st) => {
  const m = def.model;
  const r = rng(st.seed);
  const [x, y] = st.stand(1.2);
  const by = y - 4;
  // one huge pale mushroom with smaller ones around, frost dust drifting
  const shroom = (sx: number, sy: number, h: number, w: number) => {
    ctx.fillStyle = grad(ctx, sx - w * 0.3, 0, sx + w * 0.3, 0, [[0, 0xf8f8ff], [1, 0xb8c8d8]]); ctx.fillRect(sx - w * 0.18, sy - h, w * 0.36, h);
    ctx.fillStyle = radial(ctx, sx - w * 0.3, sy - h - w * 0.2, w, [[0, 0xffffff], [0.5, lit(m.roof, 1.1)], [1, shade(m.roof, 0.6)]]);
    ctx.beginPath(); ctx.ellipse(sx, sy - h, w, w * 0.45, 0, Math.PI, TAU); ctx.closePath(); ctx.fill();
    for (let k = 0; k < 4; k++) { ctx.fillStyle = css(0xffffff, 0.85); ctx.beginPath(); ctx.arc(sx - w * 0.5 + k * w * 0.32, sy - h - w * 0.2 - (k % 2) * 2, 1.2, 0, TAU); ctx.fill(); }
  };
  shroom(x - 18, by, 10, 9); shroom(x + 16, by + 2, 12, 10);
  shroom(x, by - 2, st.H * 1.05, 20);
  glowAt(ctx, x, by - st.H * 1.1, 26, m.roof, 0.45);
  for (let k = 0; k < 10; k++) { ctx.fillStyle = css(0xffffff, 0.7); ctx.beginPath(); ctx.arc(x - 24 + r() * 48, by - st.H * 0.5 - r() * st.H, 0.9, 0, TAU); ctx.fill(); }
  A.glow.push(pt(x, by - st.H * 1.1));
  A.flags.push(pt(x + 16, by - 16));
};

BUILDING_PAINTERS.frostlauncher = (ctx, def, st) => {
  const m = def.model;
  const [x0, y0] = st.inset(1.6);
  const g = boxGeo(x0, y0, 1.6, 1.4, st.H * 0.35);
  const wall = frozenLogs(st.seed);
  faceLeft(ctx, g, wall); faceRight(ctx, g, wall); stoneTop(ctx, g, 0xd8e4f0);
  // a wooden trebuchet arm loaded with a glowing frost boulder
  const b = g.c;
  ctx.strokeStyle = css(lit(m.wall, 1)); ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.moveTo(b.x - 10, b.y + 2); ctx.lineTo(b.x - 2, b.y - st.H * 0.8); ctx.lineTo(b.x + 6, b.y + 2); ctx.stroke();
  ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(b.x + 12, b.y - st.H * 0.4); ctx.lineTo(b.x - 18, b.y - st.H * 1.3); ctx.stroke();
  const big = def.id.endsWith('_2');
  glowAt(ctx, b.x - 19, b.y - st.H * 1.3 - 4, big ? 18 : 12, m.roof, 0.7);
  ctx.fillStyle = radial(ctx, b.x - 20, b.y - st.H * 1.3 - 6, big ? 8 : 6, [[0, 0xffffff], [0.5, lit(m.roof, 1.2)], [1, shade(m.roof, 0.6)]]);
  ctx.beginPath(); ctx.arc(b.x - 19, b.y - st.H * 1.3 - 4, big ? 6.5 : 5, 0, TAU); ctx.fill();
  A.glow.push(pt(b.x - 19, b.y - st.H * 1.3 - 4));
  A.flags.push(pt(g.tR.x, g.tR.y - 4));
};

BUILDING_PAINTERS.worldfreezer = (ctx, def, st) => {
  const m = def.model;
  const r = rng(st.seed);
  const [x0, y0] = st.inset(1.8);
  const g = boxGeo(x0, y0, 1.8, 1.8, 8);
  const w = stoneWall(0x8a98a8, st.seed, 4);
  faceLeft(ctx, g, w); faceRight(ctx, g, w); stoneTop(ctx, g, 0xc8d8e8);
  // three orbiting frost orbs above a jagged crown of ice
  const c0 = g.c, h = st.H * 1.1;
  for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU; iceShard(ctx, c0.x + Math.cos(a) * 18, c0.y + Math.sin(a) * 7, h * (0.4 + r() * 0.3), 5, m.roof); }
  iceShard(ctx, c0.x, c0.y, h * 1.1, 10, m.roof);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + 0.5, ox = c0.x + Math.cos(a) * 26, oy = c0.y - h * 0.8 + Math.sin(a) * 9;
    glowAt(ctx, ox, oy, 12, m.roof, 0.7);
    ctx.fillStyle = radial(ctx, ox - 1, oy - 1, 5, [[0, 0xffffff], [1, m.roof]]); ctx.beginPath(); ctx.arc(ox, oy, 4, 0, TAU); ctx.fill();
  }
  ctx.strokeStyle = css(0xffffff, 0.5); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(c0.x, c0.y - h * 0.8, 26, 9, 0, 0, TAU); ctx.stroke();
  for (let k = 0; k < 14; k++) { ctx.fillStyle = css(0xffffff, 0.75); ctx.beginPath(); ctx.arc(c0.x - 34 + r() * 68, c0.y - r() * h * 1.4, 1, 0, TAU); ctx.fill(); }
  A.glow.push(pt(c0.x, c0.y - h * 0.8));
  A.flags.push(pt(g.tB.x, g.tB.y - 6));
};

void lerp;
