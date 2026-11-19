import { BUILDING_PAINTERS, PLINTHS, UNIT_PAINTERS } from '../painters';
import { css, fillPoly, grad, lit, mix, radial, rng, shade, softEllipse, type Ctx } from '../paint';
import { blob, fillTri, glow, humanoid, limb, quadruped, staff } from '../units';
import {
  A, HX, HY, boxGeo, centreOf, cornerFor, drum, faceLeft, faceRight, glowAt, lerp, plankWall, pt, roundTower, stoneTop, stoneWall, timberWall,
  type Box, type FacePainter,
} from '../structures';

/**
 * Gravewake Legion (undead): green-grey zombies, robed necromancers with skull staffs, a crowned
 * lich, bony skeletons, pale vampires and bats, wailing banshees, a stitched flesh golem and a
 * skeletal bone wyrm. Buildings are rotting barns, bone temples, crypts and graveyards, a haunted
 * mine, a slaughterhouse, a dragon's ribcage, skull piles and a necropolis, on dead earth.
 */

const ROT = 0x8ab040;
const BONE = 0xe0d8c0;
const TAU = Math.PI * 2;
type SFn = (v: number) => number;

/** A skull drawn at (x, y) with radius r. */
function skull(c: Ctx, x: number, y: number, r: number, eye = 0x1a1a1a, glowCol?: number) {
  blob(c, x, y, r, r * 0.95, BONE, 1);
  c.fillStyle = css(BONE); c.fillRect(x - r * 0.5, y + r * 0.5, r, r * 0.5);
  c.fillStyle = css(eye); c.beginPath(); c.arc(x - r * 0.35, y, r * 0.25, 0, TAU); c.arc(x + r * 0.35, y, r * 0.25, 0, TAU); c.fill();
  if (glowCol !== undefined) glow(c, x, y, r * 1.4, glowCol, 0.5);
}

/** Bony limb: a thin bone with knobbly joints. */
function bone(c: Ctx, x0: number, y0: number, x1: number, y1: number, w: number, color = BONE) {
  c.strokeStyle = css(lit(color, 0.95)); c.lineWidth = w; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  c.fillStyle = css(color); c.beginPath(); c.arc(x1, y1, w * 0.7, 0, TAU); c.fill();
}

// ------------------------------------------------------------------ units

UNIT_PAINTERS.zombie = (c, u, cx, fy, S, pose) => {
  const m = u.model, v = m.variant;
  const bloated = v === 'bloated';
  if (bloated) glow(c, cx, fy - S(14), S(18), m.accent, 0.3);
  const lurch = { ...pose, ph: pose.ph * 0.6 };
  const r = humanoid(c, cx, fy, S, {
    h: bloated ? 28 : 26, body: 0x5a4a3a, accent: 0x4a3a2a, helmet: 'none', armor: 'leather', skin: m.body, attackArm: 'thrust',
    front: (cc, hand) => { cc.strokeStyle = css(m.body); cc.lineWidth = S(1); for (let k = 0; k < 3; k++) { cc.beginPath(); cc.moveTo(hand.x, hand.y); cc.lineTo(hand.x + S(3), hand.y - S(1) + k * S(1.2)); cc.stroke(); } },
  }, lurch);
  if (bloated) { blob(c, cx + S(1), fy - S(15), S(9), S(9), m.body, 1); for (let k = 0; k < 4; k++) { c.fillStyle = css(m.accent, 0.8); c.beginPath(); c.arc(cx - S(3) + k * S(2.5), fy - S(16) + (k % 2) * S(3), S(1.2), 0, TAU); c.fill(); } }
  // sunken eyes, torn rags, exposed rib
  c.fillStyle = css(m.accent); c.beginPath(); c.arc(r.head.x + S(2), r.head.y - S(0.4), S(0.6), 0, TAU); c.fill();
  c.strokeStyle = css(BONE, 0.8); c.lineWidth = S(0.6); for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(cx - S(2), r.shoulder.y + S(3) + k * S(1.5)); c.lineTo(cx + S(2), r.shoulder.y + S(3.5) + k * S(1.5)); c.stroke(); }
  // flies
  for (let k = 0; k < 3; k++) { const a = pose.ph * TAU * 2 + k * 2; c.fillStyle = css(0x1a1a1a); c.fillRect(r.head.x + Math.cos(a) * S(6), r.head.y - S(4) + Math.sin(a) * S(3), S(0.8), S(0.8)); }
};

UNIT_PAINTERS.necromancer = (c, u, cx, fy, S, pose) => {
  const m = u.model, mighty = m.variant === 'mighty';
  glow(c, cx, fy - S(14), S(14), m.accent, 0.2);
  const r = humanoid(c, cx, fy, S, {
    h: 28, body: m.body, accent: m.accent, helmet: 'hood', armor: 'robe', skin: 0xc8c8b8, attackArm: 'raise',
    front: (cc, hand) => {
      staff(S, m.accent, pose.attack)(cc, hand);
      skull(cc, hand.x + S(1), hand.y - S(pose.attack ? 17 : 14), S(2.2), 0x1a1a1a, m.accent);
    },
  }, pose);
  c.fillStyle = css(m.accent); c.beginPath(); c.arc(r.head.x + S(2), r.head.y - S(0.4), S(0.7), 0, TAU); c.fill();
  if (mighty) for (let k = 0; k < 3; k++) { const a = pose.ph * TAU + k * 2.1; skull(c, cx + Math.cos(a) * S(10), fy - S(18) + Math.sin(a) * S(3), S(1.6)); }
};

UNIT_PAINTERS.lich = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  glow(c, cx, fy - S(16), S(20), m.accent, 0.35);
  // floats above a trail of frost, skeletal, in tattered regal robes with a spiked crown
  const y = fy - S(3) + Math.sin(pose.ph * TAU) * S(1.2);
  c.fillStyle = grad(c, 0, y - S(24), 0, y + S(3), [[0, lit(m.body, 1.2)], [1, m.body, 0]]);
  c.beginPath(); c.moveTo(cx - S(6), y - S(22)); c.lineTo(cx + S(6), y - S(22)); c.lineTo(cx + S(9), y + S(2));
  for (let k = 0; k < 5; k++) c.lineTo(cx + S(9) - k * S(4.5), y + S(k % 2 ? -1 : 3));
  c.closePath(); c.fill();
  c.fillStyle = css(0xb8a060); c.fillRect(cx - S(6), y - S(16), S(12), S(1.2));
  skull(c, cx + S(1), y - S(26), S(4), m.accent, m.accent);
  for (let k = 0; k < 5; k++) fillTri(c, cx - S(3) + k * S(1.6), y - S(29), cx - S(2.2) + k * S(1.6), y - S(33 + (k % 2) * 2), cx - S(1.4) + k * S(1.6), y - S(29), 0xd8c070);
  // skeletal hands, one casting
  bone(c, cx - S(4), y - S(20), cx - S(9), y - S(12), S(1.4));
  const hx = cx + S(pose.attack ? 13 : 9), hy = y - S(pose.attack ? 26 : 13);
  bone(c, cx + S(4), y - S(20), hx, hy, S(1.4));
  glow(c, hx, hy, S(pose.attack ? 7 : 4), m.accent, 0.8);
};

UNIT_PAINTERS.skeleton = (c, u, cx, fy, S, pose) => {
  const m = u.model, v = m.variant;
  const sw = Math.sin(pose.ph * TAU);
  const a = pose.moving ? sw * 0.45 : 0.1;
  const hip = fy - S(11), sh = fy - S(20);
  for (const [d, l] of [[-a, 0.75], [a, 1]] as const) bone(c, cx, hip, cx + Math.sin(d) * S(10), fy - S(1), S(1.6), lit(m.body, l));
  // spine, ribs, pelvis
  bone(c, cx, hip, cx + S(0.5), sh, S(1.6), m.body);
  c.strokeStyle = css(m.body); c.lineWidth = S(0.9);
  for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(cx + S(0.5), sh + S(2.5) + k * S(1.6), S(4 - k * 0.5), S(0.9), 0, Math.PI * 0.1, Math.PI * 0.9); c.stroke(); }
  if (v === 'knight') { c.fillStyle = grad(c, cx - S(5), 0, cx + S(5), 0, [[0, 0x9aa0b0], [1, 0x4a4a5a]]); c.fillRect(cx - S(4.5), sh + S(1), S(9), S(8)); }
  bone(c, cx - S(1), sh + S(1), cx - S(4) - (pose.moving ? sw * S(2) : 0), sh + S(9), S(1.3), lit(m.body, 0.75));
  const hx = cx + S(pose.attack ? 9 : 4), hy = sh + S(pose.attack ? 1 : 8);
  bone(c, cx + S(1.5), sh + S(1), hx, hy, S(1.3), m.body);
  // weapon: rusty sword, axe or a knight's runeblade
  const ang = pose.attack ? -0.2 : -1.1;
  c.strokeStyle = css(v === 'knight' ? 0xc8e0f0 : 0x8a7a6a); c.lineWidth = S(v ? 1.4 : 1.1);
  c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + Math.cos(ang) * S(v ? 11 : 8), hy + Math.sin(ang) * S(v ? 11 : 8)); c.stroke();
  if (v === 'knight') glow(c, hx + Math.cos(ang) * S(8), hy + Math.sin(ang) * S(8), S(3), m.accent, 0.6);
  if (v) { c.fillStyle = css(0x6a5a4a); c.beginPath(); c.ellipse(cx - S(4), sh + S(5), S(3), S(4), 0, 0, TAU); c.fill(); }
  skull(c, cx + S(1), sh - S(3.5), S(3), v === 'knight' ? m.accent : 0x1a1a1a);
  if (v === 'knight') fillTri(c, cx - S(1.5), sh - S(6), cx + S(1), sh - S(10), cx + S(3), sh - S(6), 0x6a6a7a);
};

UNIT_PAINTERS.vampire = (c, u, cx, fy, S, pose) => {
  const m = u.model, lord = m.variant === 'lord';
  const r = humanoid(c, cx, fy, S, {
    h: 27, body: m.body, accent: m.accent, helmet: 'none', armor: 'robe', skin: 0xe0d8e0, attackArm: 'thrust',
    back: (cc) => {
      // high-collared cape like bat wings
      cc.fillStyle = grad(cc, cx - S(10), 0, cx, 0, [[0, lit(m.accent, 0.6)], [1, lit(m.body, 0.9)]]);
      cc.beginPath(); cc.moveTo(cx - S(1), fy - S(25)); cc.lineTo(cx - S(lord ? 13 : 10), fy - S(14)); cc.lineTo(cx - S(9), fy - S(10)); cc.lineTo(cx - S(11), fy - S(5)); cc.lineTo(cx - S(3), fy - S(6)); cc.fill();
    },
    front: (cc, hand) => { cc.strokeStyle = css(0xe0d8e0); cc.lineWidth = S(0.7); for (let k = 0; k < 3; k++) { cc.beginPath(); cc.moveTo(hand.x, hand.y); cc.lineTo(hand.x + S(3.5), hand.y - S(1.5) + k * S(1.2)); cc.stroke(); } },
  }, pose);
  // slick black hair, red eyes, fangs
  c.fillStyle = css(0x1a1018); c.beginPath(); c.arc(r.head.x + S(0.4), r.head.y - S(1.2), S(3.3), Math.PI, TAU); c.fill();
  c.fillStyle = css(m.accent); c.beginPath(); c.arc(r.head.x + S(2.2), r.head.y - S(0.4), S(0.7), 0, TAU); c.fill();
  fillTri(c, r.head.x + S(2), r.head.y + S(1.6), r.head.x + S(2.4), r.head.y + S(3), r.head.x + S(2.8), r.head.y + S(1.6), 0xffffff);
  if (pose.attack) glow(c, cx + S(12), fy - S(18), S(5), m.accent, 0.6);
};

UNIT_PAINTERS.bat = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  const y = fy - S(30) + Math.sin(pose.ph * TAU * 2) * S(1.5);
  const flap = Math.sin(pose.ph * TAU * 2);
  for (const d of [-1, 1]) {
    c.fillStyle = css(lit(m.body, d < 0 ? 0.7 : 1));
    c.beginPath(); c.moveTo(cx, y); c.lineTo(cx + d * S(5), y - S(5) * flap - S(2)); c.lineTo(cx + d * S(10), y - S(3) * flap); c.lineTo(cx + d * S(8), y + S(2)); c.lineTo(cx + d * S(5), y + S(1)); c.lineTo(cx + d * S(3), y + S(3)); c.closePath(); c.fill();
  }
  blob(c, cx, y + S(1), S(2.4), S(3), m.body);
  for (const d of [-1, 1]) fillTri(c, cx + d * S(1.6), y - S(1), cx + d * S(1.2), y - S(4), cx + d * S(0.4), y - S(1), m.body);
  c.fillStyle = css(m.accent); c.beginPath(); c.arc(cx + S(0.8), y, S(0.5), 0, TAU); c.fill();
};

UNIT_PAINTERS.banshee = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  const ph = pose.ph * TAU;
  const y = fy - S(8) + Math.sin(ph) * S(1.5);
  glow(c, cx, y - S(12), S(16), m.body, 0.45);
  // flowing translucent shroud with streaming hair, mouth open in a wail
  c.fillStyle = grad(c, 0, y - S(24), 0, y + S(5), [[0, lit(m.body, 1.3), 0.85], [1, m.body, 0]]);
  c.beginPath(); c.moveTo(cx - S(4), y - S(20)); c.quadraticCurveTo(cx - S(12), y - S(4), cx - S(8) + Math.sin(ph) * S(3), y + S(6)); c.lineTo(cx + S(2), y + S(2)); c.quadraticCurveTo(cx + S(8), y - S(8), cx + S(4), y - S(20)); c.closePath(); c.fill();
  c.strokeStyle = css(lit(m.accent, 1), 0.7); c.lineWidth = S(1);
  for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(cx - S(1), y - S(25)); c.quadraticCurveTo(cx - S(8 + k * 2), y - S(24 - k * 3), cx - S(12 + k * 2) + Math.sin(ph + k) * S(2), y - S(14 - k * 2)); c.stroke(); }
  blob(c, cx + S(1), y - S(23), S(3.4), S(3.8), lit(m.accent, 0.95), 1);
  c.fillStyle = css(0x1a2a2a); c.beginPath(); c.arc(cx + S(1.6), y - S(24), S(0.6), 0, TAU); c.arc(cx + S(3.2), y - S(24), S(0.6), 0, TAU); c.fill();
  c.beginPath(); c.ellipse(cx + S(2.6), y - S(21.5), S(0.8), S(1.4), 0, 0, TAU); c.fill();
  // chains trailing from the wrists
  c.strokeStyle = css(0x8a9a9a); c.lineWidth = S(0.6); c.setLineDash([S(1), S(0.8)]);
  const hx = cx + S(pose.attack ? 14 : 7), hy = y - S(pose.attack ? 18 : 12);
  limb(c, cx + S(2), y - S(18), hx, hy, S(1.6), lit(m.accent, 0.9), 1);
  c.beginPath(); c.moveTo(hx, hy); c.quadraticCurveTo(hx + S(2), hy + S(6), hx - S(2), hy + S(10)); c.stroke(); c.setLineDash([]);
  if (pose.attack) { c.strokeStyle = css(m.accent, 0.6); c.lineWidth = S(0.8); for (let k = 1; k <= 3; k++) { c.beginPath(); c.arc(cx + S(4), y - S(21.5), S(2 + k * 2.5), -0.6, 0.6); c.stroke(); } }
};

UNIT_PAINTERS.fleshgolem = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  const ph = pose.ph * TAU;
  const bob = pose.moving ? -Math.abs(Math.cos(ph)) * S(1) : 0;
  softEllipse(c, cx, fy, S(12), S(3), 0x000000, 0.3);
  for (const [dx, off, l] of [[-4, 0, 0.75], [4, Math.PI, 1]] as const) {
    const a = pose.moving ? Math.sin(ph + off) * 0.3 : 0;
    limb(c, cx + S(dx), fy - S(12) + bob, cx + S(dx) + Math.sin(a) * S(4), fy - S(1), S(5.5), m.body, l);
  }
  limb(c, cx - S(7), fy - S(26) + bob, cx - S(11), fy - S(12) + bob, S(5), mix(m.body, 0x7a9a6a, 0.4), 0.75);
  // hulking stitched torso with a hook and a cleaver
  blob(c, cx, fy - S(21) + bob, S(10), S(11), m.body);
  c.strokeStyle = css(0x2a1a1a); c.lineWidth = S(0.6);
  for (const [x0, y0, x1, y1] of [[-6, -26, 4, -18], [-2, -14, 6, -24]]) {
    c.beginPath(); c.moveTo(cx + S(x0), fy + S(y0) + bob); c.lineTo(cx + S(x1), fy + S(y1) + bob); c.stroke();
    for (let k = 0; k <= 5; k++) { const t = k / 5, x = cx + S(x0 + (x1 - x0) * t), y = fy + S(y0 + (y1 - y0) * t) + bob; c.beginPath(); c.moveTo(x - S(1), y - S(1)); c.lineTo(x + S(1), y + S(1)); c.stroke(); }
  }
  c.fillStyle = css(mix(m.body, 0x7a9a6a, 0.5)); c.beginPath(); c.ellipse(cx - S(4), fy - S(16) + bob, S(3), S(4), 0.4, 0, TAU); c.fill();
  blob(c, cx + S(6), fy - S(31) + bob, S(3.2), S(3), mix(m.body, 0x7a9a6a, 0.3), 1);
  c.fillStyle = css(0xffe060); c.beginPath(); c.arc(cx + S(7.5), fy - S(31.5) + bob, S(0.7), 0, TAU); c.fill();
  const fx = cx + S(pose.attack ? 14 : 12), fyy = fy - S(pose.attack ? 32 : 16) + bob;
  limb(c, cx + S(7), fy - S(26) + bob, fx, fyy, S(5), m.body, 1.05);
  c.fillStyle = grad(c, fx, fyy, fx + S(6), fyy + S(8), [[0, 0xc0c4cc], [1, 0x6a6a72]]);
  c.beginPath(); c.moveTo(fx, fyy - S(2)); c.lineTo(fx + S(7), fyy - S(4)); c.lineTo(fx + S(8), fyy + S(4)); c.lineTo(fx + S(1), fyy + S(3)); c.fill();
  c.fillStyle = css(m.accent, 0.8); c.fillRect(fx + S(5), fyy, S(3), S(1.5));
};

UNIT_PAINTERS.bonewyrm = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  const y = fy - S(32) + Math.sin(pose.ph * TAU) * S(1);
  const flap = pose.attack ? 0.2 : Math.sin(pose.ph * TAU);
  glow(c, cx, y, S(18), m.accent, 0.2);
  // skeletal wings: bone fingers with ragged membrane
  const wing = (dir: number, l: number) => {
    const tipY = y - S(15) * flap * dir - S(4);
    c.fillStyle = css(lit(0x5a6a7a, l), 0.45);
    c.beginPath(); c.moveTo(cx - S(2), y - S(1)); c.lineTo(cx + S(8), tipY - S(4)); c.lineTo(cx + S(22), tipY); c.lineTo(cx + S(17), y + S(1)); c.lineTo(cx + S(11), y - S(1)); c.lineTo(cx + S(6), y + S(3)); c.closePath(); c.fill();
    for (const [tx, ty] of [[8, tipY - S(4)], [22, tipY], [17, y + S(1)], [11, y - S(1)]] as const) bone(c, cx - S(1), y - S(1), cx + S(tx), ty as number, S(1), lit(m.body, l));
  };
  wing(-1, 0.7);
  // spine and tail of vertebrae
  for (let k = 0; k < 9; k++) { const t = k / 8; blob(c, cx - t * S(22), y + Math.sin(t * 3) * S(3), S(2.2 - t), S(1.8 - t * 0.8), m.body, 0.9); }
  // ribcage
  c.strokeStyle = css(m.body); c.lineWidth = S(1);
  for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(cx - S(2) + k * S(2.2), y + S(2), S(1.2), S(4), 0, 0, Math.PI); c.stroke(); }
  glow(c, cx, y + S(3), S(4), m.accent, 0.5);
  // horned dragon skull
  blob(c, cx + S(10), y - S(2), S(4.5), S(3), m.body, 1.05);
  c.fillStyle = css(0x1a1a2a); c.beginPath(); c.arc(cx + S(10), y - S(3), S(1), 0, TAU); c.fill();
  c.fillStyle = css(m.accent); c.beginPath(); c.arc(cx + S(10), y - S(3), S(0.5), 0, TAU); c.fill();
  for (const d of [0, 1.5]) fillTri(c, cx + S(7 + d), y - S(4), cx + S(4 + d), y - S(10), cx + S(8.5 + d), y - S(4.5), m.body);
  if (pose.attack) { glow(c, cx + S(20), y, S(8), m.accent, 0.7); c.fillStyle = grad(c, cx + S(14), 0, cx + S(28), 0, [[0, 0xffffff, 0.9], [1, m.accent, 0]]); c.beginPath(); c.moveTo(cx + S(14), y - S(2)); c.lineTo(cx + S(28), y - S(6)); c.lineTo(cx + S(28), y + S(4)); c.fill(); }
  wing(1, 1.05);
};

// ------------------------------------------------------------------ buildings

/** Dead grey earth with dry grass, a crooked grave marker and bones (Gravewake ground). */
PLINTHS.gravewake = (ctx, ox, oy, s, seed) => {
  const r = rng(seed + 41);
  const c = centreOf(ox, oy, s);
  softEllipse(ctx, c.x, c.y, s * HX * 0.95, s * HY * 0.95, 0x3a3a32, 0.85);
  softEllipse(ctx, c.x - 4, c.y - 2, s * HX * 0.7, s * HY * 0.7, 0x4a4a3a, 0.5);
  for (let i = 0; i < 60; i++) { const x = c.x + (r() - 0.5) * s * HX * 1.6, y = c.y + (r() - 0.5) * s * HY * 1.4; ctx.strokeStyle = css(r() < 0.5 ? 0x6a6a4a : 0x5a5a3a, 0.7); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 3, y - 2 - r() * 2); ctx.stroke(); }
  for (let i = 0; i < 3; i++) { const x = c.x + (r() - 0.5) * s * HX * 1.4, y = c.y + (r() - 0.5) * s * HY * 1.2; ctx.strokeStyle = css(BONE, 0.8); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y - 1); ctx.stroke(); }
  for (let i = 0; i < 4; i++) glowAt(ctx, c.x + (r() - 0.5) * s * HX * 1.4, c.y + (r() - 0.5) * s * HY * 1.2, 5, ROT, 0.25);
};

/** Rotten, sagging planks with green mould. */
function rotWall(seed: number): FacePainter {
  const planks = plankWall(0x4a3a2a, seed);
  return (c, U, V, l) => {
    const r = rng(seed);
    planks(c, U, V, l * 0.8);
    for (let i = 0; i < U * 20; i++) { c.fillStyle = css(r() < 0.6 ? 0x5a7a2a : 0x2a2a1a, 0.4); c.fillRect(r() * U, r() * V * 0.5, 0.03 + r() * 0.05, 1 + r() * 3); }
    c.fillStyle = css(0x000000, 0.4); for (let k = 0; k < 2; k++) c.fillRect(r() * U * 0.8, V * (0.3 + r() * 0.4), 0.08, 4);
  };
}

function sagRoof(ctx: Ctx, g: Box, rise: number, color: number) {
  const m1 = lerp(g.tL, g.tB, 0.5), m2 = lerp(g.tF, g.tR, 0.5);
  const r1 = pt(m1.x, m1.y - rise), r2 = pt(m2.x, m2.y - rise);
  ctx.fillStyle = css(lit(color, 0.95));
  ctx.beginPath(); ctx.moveTo(g.tL.x - 3, g.tL.y + 2); ctx.lineTo(r1.x, r1.y); ctx.quadraticCurveTo((r1.x + r2.x) / 2, (r1.y + r2.y) / 2 + 5, r2.x, r2.y); ctx.lineTo(g.tF.x + 3, g.tF.y + 2); ctx.closePath(); ctx.fill();
  fillPoly(ctx, [[g.tF.x + 3, g.tF.y + 2], [r2.x, r2.y], [g.tR.x + 2, g.tR.y + 1]], css(lit(color, 0.55)));
  // holes in the roof
  for (let k = 0; k < 2; k++) { const p = lerp(lerp(g.tL, g.tF, 0.3 + k * 0.4), lerp(r1, r2, 0.3 + k * 0.4), 0.5); ctx.fillStyle = css(0x0a0a08); ctx.beginPath(); ctx.ellipse(p.x, p.y, 3, 1.8, 0.3, 0, TAU); ctx.fill(); }
  return { r1, r2 };
}

BUILDING_PAINTERS.haycart = (ctx, def, st) => {
  const m = def.model;
  const r = rng(st.seed);
  const [x, y] = st.stand(1.6);
  const by = y - 8;
  // a broken cart with a rotting haystack, zombie arms reaching out
  ctx.fillStyle = grad(ctx, 0, by - 10, 0, by, [[0, lit(m.wall, 1.1)], [1, lit(m.wall, 0.6)]]);
  ctx.beginPath(); ctx.moveTo(x - 26, by); ctx.lineTo(x - 22, by - 9); ctx.lineTo(x + 24, by - 9); ctx.lineTo(x + 26, by); ctx.fill();
  for (const dx of [-16, 16]) { ctx.strokeStyle = css(0x3a2a1a); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + dx, by + 2, 6, 0, TAU); ctx.stroke(); }
  ctx.fillStyle = grad(ctx, x - 24, 0, x + 24, 0, [[0, lit(0x9a8a4a, 1)], [0.5, lit(m.roof, 0.9)], [1, lit(0x6a5a2a, 0.7)]]);
  ctx.beginPath(); ctx.moveTo(x - 24, by - 9); ctx.quadraticCurveTo(x - 20, by - 9 - st.H * 1.3, x, by - 9 - st.H * 1.4); ctx.quadraticCurveTo(x + 22, by - 9 - st.H * 1.2, x + 24, by - 9); ctx.fill();
  for (let i = 0; i < 30; i++) { ctx.strokeStyle = css(r() < 0.5 ? 0xb0a050 : 0x6a7a2a, 0.7); ctx.lineWidth = 0.7; const px = x - 20 + r() * 40, py = by - 10 - r() * st.H * 1.2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + (r() - 0.5) * 6, py - 2); ctx.stroke(); }
  for (const dx of [-8, 10]) { limb(ctx, x + dx, by - 9 - st.H * 0.8, x + dx + 4, by - 9 - st.H * 1.25, 2.2, 0x7a8a5a, 1); }
  glowAt(ctx, x, by - st.H * 0.8, 20, m.roof, 0.3);
  A.flags.push(pt(x + 22, by - 10));
};

BUILDING_PAINTERS.plaguebarn = (ctx, def, st) => {
  const m = def.model;
  const [x, y] = st.inset(1.8);
  const g = boxGeo(x, y, 1.8, 1.4, st.H * 0.55);
  const wall = rotWall(st.seed);
  faceLeft(ctx, g, (c, U, V, l) => { wall(c, U, V, l); c.fillStyle = css(0x0a0a08); c.fillRect(U * 0.35, 0, 0.45, Math.min(V - 3, 14)); });
  faceRight(ctx, g, wall);
  sagRoof(ctx, g, st.H * 0.6, 0x4a3a2a);
  // green plague mist seeping out
  for (let k = 0; k < 4; k++) glowAt(ctx, lerp(g.L, g.F, 0.3 + k * 0.15).x, lerp(g.L, g.F, 0.3 + k * 0.15).y - 4, 12, m.roof, 0.35);
  A.flags.push(g.tB);
  A.smoke.push(pt(g.c.x, g.c.y - st.H * 0.5));
};

BUILDING_PAINTERS.bonetemple = (ctx, def, st) => {
  const m = def.model;
  const [x0, y0] = st.inset(1.7);
  const g = boxGeo(x0, y0, 1.7, 1.5, st.H * 0.55);
  const wall = stoneWall(m.wall, st.seed, 6);
  faceLeft(ctx, g, (c, U, V, l) => { wall(c, U, V, l); c.fillStyle = css(0x0a0a10); c.beginPath(); c.moveTo(U * 0.38, 0); c.lineTo(U * 0.38, V * 0.55); c.lineTo(U * 0.5, V * 0.72); c.lineTo(U * 0.62, V * 0.55); c.lineTo(U * 0.62, 0); c.fill(); });
  faceRight(ctx, g, wall); stoneTop(ctx, g, m.wall);
  // rib-bone arches over the roof, a skull at the apex, two bone spires
  for (let k = 0; k < 4; k++) {
    const a = lerp(g.tL, g.tB, 0.1 + k * 0.27), b = lerp(g.tF, g.tR, 0.1 + k * 0.27);
    ctx.strokeStyle = css(lit(BONE, 0.9 + k * 0.03)); ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 - st.H * 0.7, b.x, b.y); ctx.stroke();
  }
  const top = pt(g.c.x, g.c.y - st.H * 0.35);
  skull(ctx, top.x, top.y, 6, m.roof === BONE ? 0x1a1a1a : m.roof, m.roof);
  for (const p of [g.tL, g.tR]) { ctx.strokeStyle = css(BONE); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + (p === g.tL ? 4 : -4), p.y - st.H * 0.6); ctx.stroke(); }
  glowAt(ctx, top.x, top.y, 14, ROT, 0.3);
  A.glow.push(top);
  A.flags.push(pt(g.tR.x - 4, g.tR.y - st.H * 0.6));
};

BUILDING_PAINTERS.crypt = (ctx, def, st) => {
  const m = def.model;
  const [x0, y0] = st.inset(1.4);
  const g = boxGeo(x0, y0, 1.4, 1.4, st.H * 0.5);
  const wall = stoneWall(m.wall, st.seed, 5);
  faceLeft(ctx, g, (c, U, V, l) => { wall(c, U, V, l); c.fillStyle = css(0x0a0608); c.fillRect(U * 0.3, 0, 0.5, V * 0.65); c.fillStyle = css(m.roof, 0.8); c.fillRect(U * 0.3, V * 0.65, 0.5, 1.2); });
  faceRight(ctx, g, wall);
  // a peaked stone roof with a red-eyed gargoyle and an iron cross
  const m1 = lerp(g.tL, g.tB, 0.5), m2 = lerp(g.tF, g.tR, 0.5);
  fillPoly(ctx, [[g.tL.x - 2, g.tL.y + 1], [m1.x, m1.y - st.H * 0.45], [m2.x, m2.y - st.H * 0.45], [g.tF.x + 2, g.tF.y + 1]], css(lit(shade(m.wall, 0.8), 1)));
  fillPoly(ctx, [[g.tF.x + 2, g.tF.y + 1], [m2.x, m2.y - st.H * 0.45], [g.tR.x + 1, g.tR.y]], css(lit(shade(m.wall, 0.8), 0.6)));
  const p = pt(m2.x, m2.y - st.H * 0.45);
  ctx.strokeStyle = css(0x2a2a2a); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - 12); ctx.moveTo(p.x - 4, p.y - 8); ctx.lineTo(p.x + 4, p.y - 8); ctx.stroke();
  blob(ctx, m1.x, m1.y - st.H * 0.45 - 3, 4, 3.5, 0x5a5a62);
  ctx.fillStyle = css(m.roof); ctx.beginPath(); ctx.arc(m1.x + 1.5, m1.y - st.H * 0.45 - 3.5, 0.9, 0, TAU); ctx.fill();
  A.flags.push(pt(p.x, p.y - 12));
};

BUILDING_PAINTERS.graveyard = (ctx, def, st) => {
  const m = def.model;
  const r = rng(st.seed);
  const [x, y] = st.stand(1.7);
  // a small mausoleum behind a field of tilted gravestones and an iron fence
  const [mx, my] = st.inset(0.9);
  const g = boxGeo(mx - 18, my - 12, 0.9, 0.9, st.H * 0.65);
  const wall = stoneWall(m.wall, st.seed, 5);
  faceLeft(ctx, g, (c, U, V, l) => { wall(c, U, V, l); c.fillStyle = css(0x0a0608); c.fillRect(U * 0.3, 0, 0.35, V * 0.6); });
  faceRight(ctx, g, wall); stoneTop(ctx, g, m.wall);
  ctx.fillStyle = css(m.roof); ctx.beginPath(); ctx.moveTo(g.tL.x, g.tL.y); ctx.lineTo(g.c.x, g.c.y - 12); ctx.lineTo(g.tF.x, g.tF.y); ctx.fill();
  for (let k = 0; k < 6; k++) {
    const gx = x - 26 + (k % 3) * 18 + r() * 4, gy = y - 2 - Math.floor(k / 3) * 9;
    ctx.save(); ctx.translate(gx, gy); ctx.rotate((r() - 0.5) * 0.4);
    ctx.fillStyle = grad(ctx, -4, 0, 4, 0, [[0, 0x9a9aa0], [1, 0x5a5a62]]); ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-4, -8); ctx.arc(0, -8, 4, Math.PI, TAU); ctx.lineTo(4, 0); ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = css(0x2a2a2a); ctx.lineWidth = 1;
  for (let k = 0; k < 14; k++) { const px = x - 34 + k * 5, py = y + 4 - k * 0.3; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - 8); ctx.stroke(); fillTri(ctx, px - 1, py - 8, px, py - 10, px + 1, py - 8, 0x2a2a2a); }
  ctx.beginPath(); ctx.moveTo(x - 34, y - 1); ctx.lineTo(x + 34, y - 5); ctx.stroke();
  A.flags.push(pt(g.c.x, g.c.y - 12));
};

BUILDING_PAINTERS.hauntedmine = (ctx, def, st) => {
  const m = def.model;
  const [x, y] = st.stand(1.6);
  // a rocky hill with a timbered mine entrance, a minecart and ghostly light
  ctx.fillStyle = grad(ctx, x - 34, 0, x + 34, 0, [[0, lit(0x6a6458, 1.1)], [1, lit(0x4a4438, 0.7)]]);
  ctx.beginPath(); ctx.moveTo(x - 34, y - 2); ctx.quadraticCurveTo(x - 24, y - st.H * 1.4, x + 4, y - st.H * 1.35); ctx.quadraticCurveTo(x + 30, y - st.H * 1.1, x + 34, y - 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = css(0x0a0a10); ctx.fillRect(x - 10, y - 22, 20, 20);
  ctx.strokeStyle = css(lit(m.wall, 1)); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 11, y - 1); ctx.lineTo(x - 11, y - 23); ctx.lineTo(x + 11, y - 23); ctx.lineTo(x + 11, y - 1); ctx.stroke();
  glowAt(ctx, x, y - 12, 18, m.roof, 0.6);
  for (let k = 0; k < 2; k++) { const gx = x - 4 + k * 8, gy = y - 14 - k * 3; ctx.fillStyle = css(m.roof, 0.6); ctx.beginPath(); ctx.ellipse(gx, gy, 2.6, 4, 0, 0, TAU); ctx.fill(); ctx.fillStyle = css(0x0a1a1a); ctx.fillRect(gx - 1.2, gy - 1.6, 0.8, 0.8); ctx.fillRect(gx + 0.4, gy - 1.6, 0.8, 0.8); }
  ctx.fillStyle = css(0x5a4a3a); ctx.fillRect(x + 14, y - 8, 12, 6);
  ctx.strokeStyle = css(0x2a2a2a); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x + 17, y - 1, 2, 0, TAU); ctx.arc(x + 23, y - 1, 2, 0, TAU); ctx.stroke();
  A.glow.push(pt(x, y - 12));
  A.flags.push(pt(x + 4, y - st.H * 1.35));
};

BUILDING_PAINTERS.slaughterhouse = (ctx, def, st) => {
  const m = def.model;
  const [x0, y0] = st.inset(1.8);
  const g = boxGeo(x0, y0, 1.8, 1.5, st.H * 0.5);
  const wall = rotWall(st.seed);
  faceLeft(ctx, g, (c, U, V, l) => { wall(c, U, V, l); c.fillStyle = css(0x6a1a1a, 0.6); c.fillRect(U * 0.1, 0, U * 0.8, 3); c.fillStyle = css(0x0a0a08); c.fillRect(U * 0.4, 0, 0.5, Math.min(V - 3, 13)); });
  faceRight(ctx, g, wall);
  sagRoof(ctx, g, st.H * 0.5, m.roof);
  // meat hooks with chains on a gallows beam
  const p0 = pt(g.F.x - 8, g.F.y), p1 = pt(g.F.x + 14, g.F.y - 8);
  ctx.strokeStyle = css(0x3a2a1a); ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p0.x, p0.y - 26); ctx.lineTo(p1.x, p1.y - 26); ctx.lineTo(p1.x, p1.y); ctx.stroke();
  for (let k = 0; k < 2; k++) { const hx = p0.x + 6 + k * 10, hy = p0.y - 26 - k * 3.5; ctx.strokeStyle = css(0x8a8a8a); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx, hy + 8); ctx.stroke(); ctx.beginPath(); ctx.arc(hx + 1, hy + 9, 2, 0, Math.PI); ctx.stroke(); blob(ctx, hx + 1, hy + 13, 2.4, 3.4, 0x9a4a3a); }
  A.flags.push(g.tB);
};

BUILDING_PAINTERS.dragongrave = (ctx, def, st) => {
  const m = def.model;
  const [x, y] = st.stand(1.8);
  // a giant dragon ribcage arching over a frosted mound, the skull resting in front
  ctx.fillStyle = css(0x4a4a52); ctx.beginPath(); ctx.ellipse(x, y - 4, 36, 12, 0, 0, TAU); ctx.fill();
  for (let k = 0; k < 6; k++) {
    const bx = x - 26 + k * 10;
    ctx.strokeStyle = css(lit(BONE, 0.85 + k * 0.03)); ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(bx - 4, y); ctx.quadraticCurveTo(bx - 10, y - st.H * 1.4, bx + 4, y - st.H * 1.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + 8, y - 6); ctx.quadraticCurveTo(bx + 12, y - st.H * 1.3, bx + 4, y - st.H * 1.5); ctx.stroke();
  }
  ctx.strokeStyle = css(BONE); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 30, y - st.H * 1.45); ctx.quadraticCurveTo(x, y - st.H * 1.6, x + 32, y - st.H * 1.4); ctx.stroke();
  blob(ctx, x + 34, y - 6, 9, 6, BONE, 1);
  ctx.fillStyle = css(0x1a1a2a); ctx.beginPath(); ctx.arc(x + 33, y - 8, 2.2, 0, TAU); ctx.fill();
  ctx.fillStyle = css(m.roof === BONE ? 0x8ad0f0 : m.roof); ctx.beginPath(); ctx.arc(x + 33, y - 8, 1, 0, TAU); ctx.fill();
  glowAt(ctx, x, y - st.H * 0.6, 24, 0x8ad0f0, 0.3);
  A.flags.push(pt(x, y - st.H * 1.6));
};

BUILDING_PAINTERS.skullpile = (ctx, def, st) => {
  const m = def.model;
  const [x, y] = st.stand(1.4);
  const rows = [6, 5, 4, 3, 2, 1];
  rows.forEach((n, row) => {
    for (let k = 0; k < n; k++) skull(ctx, x - (n - 1) * 4.5 + k * 9, y - 6 - row * 7, 4.4, row % 2 ? m.roof : 0x1a1a1a);
  });
  glowAt(ctx, x, y - 30, 18, m.roof, 0.4);
  ctx.strokeStyle = css(0x3a2a1a); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + 26, y); ctx.lineTo(x + 26, y - 30); ctx.stroke();
  skull(ctx, x + 26, y - 32, 3.4, m.roof, m.roof);
  A.glow.push(pt(x, y - 30));
  A.flags.push(pt(x + 26, y - 36));
};

BUILDING_PAINTERS.soulturret = (ctx, def, st) => {
  const m = def.model;
  const [x, y] = st.stand(1.3);
  const by = y - 6;
  roundTower(ctx, x, by, 12, st.H * 0.85, m.wall, st.seed);
  const top = by - st.H * 0.85;
  // spiked bone crown with a swirling soul orb
  for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; ctx.strokeStyle = css(BONE); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 12, top + Math.sin(a) * 5); ctx.lineTo(x + Math.cos(a) * 16, top + Math.sin(a) * 6 - 12); ctx.stroke(); }
  glowAt(ctx, x, top - 10, 22, m.roof, 0.6);
  ctx.fillStyle = radial(ctx, x - 2, top - 12, 8, [[0, 0xffffff], [0.5, lit(m.roof, 1.2)], [1, shade(m.roof, 0.6)]]); ctx.beginPath(); ctx.arc(x, top - 10, 6, 0, TAU); ctx.fill();
  for (let k = 0; k < 3; k++) { const a = k * 2.1; ctx.strokeStyle = css(m.roof, 0.6); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, top - 10, 9 + k * 2, a, a + 1.4); ctx.stroke(); }
  A.glow.push(pt(x, top - 10));
  A.flags.push(pt(x + 14, by - 4));
};

BUILDING_PAINTERS.deathpit = (ctx, def, st) => {
  const m = def.model;
  const [x, y] = st.stand(1.6);
  const by = y - 6;
  // a dark pit ringed by spiked stones, a violet glow rising from below
  drum(ctx, x, by, 30, 4, m.wall, m.wall);
  ctx.fillStyle = radial(ctx, x, by - 4, 26, [[0, m.roof], [0.5, 0x1a0a2a], [1, 0x050208]]);
  ctx.beginPath(); ctx.ellipse(x, by - 4, 25, 11, 0, 0, TAU); ctx.fill();
  glowAt(ctx, x, by - 12, 28, m.roof, 0.6);
  for (let k = 0; k < 9; k++) { const a = (k / 9) * TAU, px = x + Math.cos(a) * 30, py = by - 2 + Math.sin(a) * 13; fillTri(ctx, px - 3, py, px, py - 12 - (k % 3) * 3, px + 3, py, lit(m.wall, Math.sin(a) > 0 ? 1.05 : 0.7)); }
  for (let k = 0; k < 2; k++) { limb(ctx, x - 6 + k * 12, by - 6, x - 9 + k * 16, by - 18, 1.8, BONE, 1); }
  A.glow.push(pt(x, by - 12));
  A.flags.push(pt(x + 30, by - 14));
};

BUILDING_PAINTERS.necropolis = (ctx, def, st) => {
  const m = def.model;
  const [x0, y0] = st.inset(1.9);
  const g = boxGeo(x0, y0, 1.9, 1.9, st.H * 0.35);
  const wall = stoneWall(m.wall, st.seed, 6);
  faceLeft(ctx, g, (c, U, V, l) => { wall(c, U, V, l); c.fillStyle = css(m.roof, 0.85); for (let k = 0; k < 5; k++) c.fillRect(0.12 + k * 0.36, V * 0.4, 0.08, 5); });
  faceRight(ctx, g, wall); stoneTop(ctx, g, m.wall);
  // four bone-crowned spires around a central tower spewing green rot
  for (const p of [g.tB, g.tR]) { const s0 = pt(p.x * 0.8 + g.c.x * 0.2, p.y * 0.8 + g.c.y * 0.2 + 6); roundTower(ctx, s0.x, s0.y, 5, st.H * 0.6, m.wall, st.seed + 2); skull(ctx, s0.x, s0.y - st.H * 0.6 - 4, 3.5, m.roof); }
  const cc = cornerFor(g.c, 0.7);
  const t = boxGeo(cc.x, cc.y, 0.7, 0.7, st.H * 0.9);
  const tw = stoneWall(shade(m.wall, 1.1), st.seed + 3, 7);
  faceLeft(ctx, t, tw); faceRight(ctx, t, tw); stoneTop(ctx, t, m.wall);
  glowAt(ctx, t.c.x, t.c.y - 8, 34, m.roof, 0.5);
  for (let k = 0; k < 5; k++) { ctx.fillStyle = css(m.roof, 0.35 - k * 0.05); ctx.beginPath(); ctx.ellipse(t.c.x + Math.sin(k) * 4, t.c.y - 8 - k * 7, 8 + k * 2, 4 + k, 0, 0, TAU); ctx.fill(); }
  skull(ctx, t.c.x, t.c.y - 2, 5, m.roof, m.roof);
  for (const p of [g.tL, g.tF]) { const s0 = pt(p.x * 0.8 + g.c.x * 0.2, p.y * 0.8 + g.c.y * 0.2 + 6); roundTower(ctx, s0.x, s0.y, 5, st.H * 0.6, m.wall, st.seed + 4); skull(ctx, s0.x, s0.y - st.H * 0.6 - 4, 3.5, m.roof); }
  A.glow.push(pt(t.c.x, t.c.y - 8));
  A.smoke.push(pt(t.c.x, t.c.y - 30));
  A.flags.push(pt(g.tB.x, g.tB.y - st.H * 0.6));
};

void timberWall; void quadruped; void staff; void fillPoly;
