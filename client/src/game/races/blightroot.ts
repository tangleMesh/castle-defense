import { BUILDING_PAINTERS, PLINTHS, UNIT_PAINTERS } from '../painters';
import { css, fillPoly, grad, lit, mix, radial, rng, shade, softEllipse, type Ctx } from '../paint';
import { blob, fillTri, glow, humanoid, limb, quadruped } from '../units';
import {
  A, HX, HY, boxGeo, centreOf, cornerFor, drum, faceLeft, faceRight, foliage, glowAt, lerp, pt, stoneTop, stoneWall,
  type FacePainter,
} from '../structures';

/**
 * Blightroot Coven (corrupted): twisted dead treants oozing fel green, violet void walkers, fel
 * hounds with tendrils, infernal siege walkers, nether drakes, a horned incubus and tentacles from
 * the deep. Buildings are corrupted ancients (walking trees gone rotten), void portals, a fel shrine,
 * a hellgate, a demonic statue, a blighted protector tree, the forgotten one's maw, a well of pain
 * and a giant eye, on blighted ground with ooze puddles.
 */

const FELG = 0x8ad02a;
const VOIDC = 0x7a3ab0;
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ units

UNIT_PAINTERS.blightent = (c, u, cx, fy, S, pose) => {
  const m = u.model, v = m.variant;
  const big = v === 'annihilator';
  const ph = pose.ph * TAU;
  const bob = pose.moving ? -Math.abs(Math.cos(ph)) * S(1) : 0;
  softEllipse(c, cx, fy, S(12), S(3), 0x000000, 0.3);
  // gnarled dead-wood body with glowing fel cracks and drooping, leafless branches
  for (const [off, l, hx] of [[0, 0.75, -3.5], [Math.PI, 1, 3.5]] as const) {
    const a = pose.moving ? Math.sin(ph + off) * 0.35 : 0;
    limb(c, cx + S(hx), fy - S(14) + bob, cx + S(hx) + Math.sin(a) * S(8), fy - S(1.5), S(5), m.body, l);
  }
  c.fillStyle = grad(c, cx - S(9), 0, cx + S(9), 0, [[0, lit(m.body, 1.15)], [1, lit(m.body, 0.55)]]);
  c.beginPath(); c.moveTo(cx - S(8), fy - S(13) + bob); c.quadraticCurveTo(cx - S(11), fy - S(26), cx - S(5), fy - S(34) + bob); c.lineTo(cx + S(6), fy - S(34) + bob); c.quadraticCurveTo(cx + S(10), fy - S(24), cx + S(8), fy - S(13) + bob); c.fill();
  c.strokeStyle = css(m.accent, 0.9); c.lineWidth = S(0.9);
  c.beginPath(); c.moveTo(cx - S(4), fy - S(16) + bob); c.lineTo(cx, fy - S(22) + bob); c.lineTo(cx - S(2), fy - S(28) + bob); c.moveTo(cx + S(3), fy - S(18) + bob); c.lineTo(cx + S(5), fy - S(26) + bob); c.stroke();
  glow(c, cx, fy - S(22) + bob, S(7), m.accent, 0.35);
  c.fillStyle = css(m.accent); c.beginPath(); c.arc(cx + S(2), fy - S(29) + bob, S(1), 0, TAU); c.arc(cx + S(5), fy - S(29) + bob, S(1), 0, TAU); c.fill();
  // spiky dead branches (thorns on the annihilator)
  c.strokeStyle = css(lit(m.body, 0.9)); c.lineWidth = S(1.4);
  for (let k = 0; k < (big ? 6 : 4); k++) { const bx = cx - S(6) + k * S(3), by = fy - S(34) + bob; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx - S(2) + (k % 2) * S(4), by - S(7 + (k % 3) * 2)); c.stroke(); }
  if (big) for (let k = 0; k < 5; k++) fillTri(c, cx - S(8) + k * S(4), fy - S(20) + bob, cx - S(10) + k * S(4), fy - S(25) + bob, cx - S(6) + k * S(4), fy - S(21) + bob, m.accent);
  // a club-like arm, raised for the blow
  const raise = pose.attack ? -S(14) : pose.moving ? Math.sin(ph) * S(2) : 0;
  limb(c, cx - S(4), fy - S(28) + bob, cx - S(13), fy - S(19) + bob, S(3), m.body, 0.75);
  limb(c, cx + S(4), fy - S(28) + bob, cx + S(15), fy - S(20) + bob + raise, S(big ? 4.4 : 3.4), m.body, 1.05);
  if (pose.attack) glow(c, cx + S(15), fy - S(20) + bob + raise, S(5), m.accent, 0.6);
  // ooze dripping
  for (let k = 0; k < 3; k++) { c.fillStyle = css(m.accent, 0.8); c.beginPath(); c.ellipse(cx - S(4) + k * S(4), fy - S(12) + bob + ((pose.ph * 6 + k) % 3) * S(1.5), S(0.6), S(1.1), 0, 0, TAU); c.fill(); }
};

UNIT_PAINTERS.voidwalker = (c, u, cx, fy, S, pose) => {
  const m = u.model, keeper = m.variant === 'keeper';
  const ph = pose.ph * TAU;
  const y = fy - S(5) + Math.sin(ph) * S(1.5);
  glow(c, cx, y - S(12), S(18), m.body, 0.4);
  // a hovering column of violet void-smoke with a bright core and orbiting rune sparks
  c.fillStyle = grad(c, 0, y - S(26), 0, y + S(4), [[0, lit(m.body, 1.2), 0.9], [0.7, m.body, 0.7], [1, m.body, 0]]);
  c.beginPath(); c.moveTo(cx - S(5), y - S(22)); c.quadraticCurveTo(cx - S(10), y - S(8), cx - S(4) + Math.sin(ph) * S(2), y + S(4)); c.lineTo(cx + S(4) + Math.sin(ph + 1) * S(2), y + S(4)); c.quadraticCurveTo(cx + S(10), y - S(8), cx + S(5), y - S(22)); c.closePath(); c.fill();
  c.fillStyle = radial(c, cx, y - S(14), S(5), [[0, 0xffffff], [0.4, m.accent], [1, m.body, 0]]); c.beginPath(); c.arc(cx, y - S(14), S(4), 0, TAU); c.fill();
  // horned hood
  blob(c, cx + S(1), y - S(25), S(4), S(4), shade(m.body, 0.6), 1);
  for (const d of [-1, 1]) fillTri(c, cx + S(1) + d * S(2), y - S(27), cx + S(1) + d * S(5), y - S(33), cx + S(1) + d * S(0.5), y - S(28), shade(m.body, 0.5));
  for (const dx of [0, 2.4]) { c.fillStyle = css(m.accent); c.beginPath(); c.arc(cx + dx * S(1), y - S(25), S(0.7), 0, TAU); c.fill(); }
  for (let k = 0; k < (keeper ? 5 : 3); k++) { const a = ph + (k / (keeper ? 5 : 3)) * TAU; c.fillStyle = css(m.accent, 0.9); c.fillRect(cx + Math.cos(a) * S(9) - S(0.8), y - S(14) + Math.sin(a) * S(3) - S(0.8), S(1.6), S(1.6)); }
  if (pose.attack) { glow(c, cx + S(14), y - S(16), S(6), 0xff7a2a, 0.8); c.fillStyle = css(0xffb060); c.beginPath(); c.arc(cx + S(14), y - S(16), S(2), 0, TAU); c.fill(); }
};

UNIT_PAINTERS.felhound = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  const { saddle } = quadruped(c, cx, fy, S, pose, { len: 22, h: 11, body: m.body, belly: shade(m.body, 0.7), spines: 0x2a1a1a, tail: true, eye: m.accent });
  // two tentacles sprouting from the shoulders, a fel glow
  const ph = pose.ph * TAU;
  for (const d of [-1, 1]) {
    c.strokeStyle = css(lit(m.body, d < 0 ? 0.8 : 1.05)); c.lineWidth = S(1.6); c.lineCap = 'round';
    c.beginPath(); c.moveTo(saddle.x + S(4), saddle.y + S(1)); c.quadraticCurveTo(saddle.x + S(4) + d * S(3), saddle.y - S(8), saddle.x + S(10) + Math.sin(ph + d) * S(3), saddle.y - S(9) - d * S(2)); c.stroke();
    glow(c, saddle.x + S(10) + Math.sin(ph + d) * S(3), saddle.y - S(9) - d * S(2), S(2), m.accent, 0.7);
  }
  glow(c, saddle.x, saddle.y + S(3), S(9), m.accent, 0.2);
};

UNIT_PAINTERS.infernalmachine = (c, u, cx, fy, S, pose) => {
  const m = u.model, tank = m.variant === 'tank';
  const ph = pose.ph * TAU;
  const bob = pose.moving ? -Math.abs(Math.sin(ph)) * S(1) : 0;
  softEllipse(c, cx, fy, S(13), S(3), 0x000000, 0.3);
  // a demonic siege walker: spider legs of black iron, a furnace body, a cannon
  for (let k = 0; k < 4; k++) {
    const a = pose.moving ? Math.sin(ph + k * 1.6) * 0.3 : 0;
    const hx = cx - S(6) + k * S(4), hy = fy - S(10) + bob;
    const kx = hx + S(k < 2 ? -5 : 5) + Math.sin(a) * S(2), ky = hy - S(4);
    limb(c, hx, hy, kx, ky, S(1.6), 0x2a2222, k % 2 ? 1 : 0.75);
    limb(c, kx, ky, kx + S(k < 2 ? -2 : 2), fy - S(0.5), S(1.3), 0x2a2222, k % 2 ? 1 : 0.75);
  }
  c.fillStyle = grad(c, 0, fy - S(20) + bob, 0, fy - S(8) + bob, [[0, lit(m.body, 1.25)], [1, lit(m.body, 0.6)]]);
  c.beginPath(); c.moveTo(cx - S(9), fy - S(9) + bob); c.lineTo(cx - S(7), fy - S(19) + bob); c.lineTo(cx + S(7), fy - S(19) + bob); c.lineTo(cx + S(9), fy - S(9) + bob); c.closePath(); c.fill();
  c.fillStyle = radial(c, cx, fy - S(13) + bob, S(4), [[0, 0xfff0a0], [0.5, m.accent], [1, 0x6a1a0a]]); c.beginPath(); c.arc(cx, fy - S(13) + bob, S(3), 0, TAU); c.fill();
  glow(c, cx, fy - S(13) + bob, S(7), m.accent, 0.5);
  for (const d of [-1, 1]) fillTri(c, cx + d * S(5), fy - S(19) + bob, cx + d * S(7), fy - S(25) + bob, cx + d * S(3), fy - S(19) + bob, 0x1a1212);
  const ang = pose.attack ? -0.5 : -0.25, len = S(tank ? 13 : 10);
  c.strokeStyle = css(0x2a2222); c.lineWidth = S(tank ? 3 : 2.4); c.beginPath(); c.moveTo(cx + S(5), fy - S(16) + bob); c.lineTo(cx + S(5) + Math.cos(ang) * len, fy - S(16) + bob + Math.sin(ang) * len); c.stroke();
  if (pose.attack) glow(c, cx + S(5) + Math.cos(ang) * len, fy - S(16) + bob + Math.sin(ang) * len, S(5), m.accent, 0.9);
};

UNIT_PAINTERS.netherdrake = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  const y = fy - S(32) + Math.sin(pose.ph * TAU) * S(1);
  const flap = pose.attack ? 0.2 : Math.sin(pose.ph * TAU);
  glow(c, cx, y, S(14), m.accent, 0.25);
  const wing = (dir: number, l: number) => {
    const tipY = y - S(14) * flap * dir - S(4);
    c.fillStyle = grad(c, cx, y, cx + S(20), tipY, [[0, lit(m.body, 1.1 * l), 0.9], [1, lit(m.accent, 0.9 * l), 0.6]]);
    c.beginPath(); c.moveTo(cx - S(3), y - S(2)); c.quadraticCurveTo(cx + S(6), tipY - S(8), cx + S(20), tipY); c.lineTo(cx + S(14), y); c.quadraticCurveTo(cx + S(8), y - S(2), cx + S(3), y + S(2)); c.closePath(); c.fill();
  };
  wing(-1, 0.7);
  // a translucent, smoky body trailing wisps
  c.strokeStyle = css(lit(m.body, 1), 0.85); c.lineWidth = S(2.6); c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx - S(4), y + S(1)); c.quadraticCurveTo(cx - S(14), y + S(5), cx - S(20), y - S(1)); c.stroke();
  for (let k = 0; k < 3; k++) softEllipse(c, cx - S(20 + k * 4), y - S(1) + k * S(1), S(3 - k * 0.6), S(1.5), m.accent, 0.3 - k * 0.08);
  blob(c, cx, y + S(1), S(7), S(3.6), m.body);
  blob(c, cx + S(9), y - S(2), S(3.2), S(2.6), m.body, 1.1);
  for (let k = 0; k < 2; k++) fillTri(c, cx + S(7 + k * 1.6), y - S(4), cx + S(5 + k * 1.6), y - S(9), cx + S(8.6 + k * 1.6), y - S(4.4), m.accent);
  c.fillStyle = css(m.accent); c.beginPath(); c.arc(cx + S(10.5), y - S(2.6), S(0.7), 0, TAU); c.fill();
  if (pose.attack) { glow(c, cx + S(17), y - S(1), S(7), m.accent, 0.8); }
  wing(1, 1.05);
};

UNIT_PAINTERS.incubus = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  glow(c, cx, fy - S(16), S(20), m.accent, 0.25);
  // a tall, gaunt horned demon in tattered robes, fel fire in both hands
  const r = humanoid(c, cx, fy, S, { h: 30, body: m.body, accent: m.accent, helmet: 'none', armor: 'robe', skin: 0x8a4a5a, attackArm: 'raise',
    back: (cc, hand) => { glow(cc, hand.x, hand.y, S(4), m.accent, 0.8); },
    front: (cc, hand) => { glow(cc, hand.x, hand.y - S(2), S(pose.attack ? 9 : 4), m.accent, 0.9); cc.fillStyle = css(0xe0ffb0); cc.beginPath(); cc.arc(hand.x, hand.y - S(2), S(pose.attack ? 2.6 : 1.4), 0, TAU); cc.fill(); } }, pose);
  for (const d of [-1, 1]) {
    c.fillStyle = css(0x2a1a1a);
    c.beginPath(); c.moveTo(r.head.x + S(0.6) + d * S(1.6), r.head.y - S(2.5)); c.quadraticCurveTo(r.head.x + d * S(8), r.head.y - S(5), r.head.x + d * S(6), r.head.y - S(13)); c.quadraticCurveTo(r.head.x + d * S(4.5), r.head.y - S(5.5), r.head.x + d * S(0.4), r.head.y - S(2)); c.fill();
  }
  c.fillStyle = css(m.accent); c.beginPath(); c.arc(r.head.x + S(2.2), r.head.y - S(0.4), S(0.8), 0, TAU); c.fill();
};

UNIT_PAINTERS.tentacle = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  const ph = pose.ph * TAU + (pose.attack ? 1 : 0);
  // a slimy tentacle rising from a dark hole in the ground, curling to strike
  c.fillStyle = css(0x0a0a10); c.beginPath(); c.ellipse(cx, fy - S(1), S(6), S(2.2), 0, 0, TAU); c.fill();
  const reach = pose.attack ? S(10) : S(3);
  const pts: Array<[number, number]> = [];
  for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push([cx + Math.sin(ph + t * 4) * S(3) * t + t * reach, fy - S(1) - t * S(22) + (pose.attack ? t * t * S(8) : 0)]); }
  for (let k = 0; k < pts.length - 1; k++) {
    const w = S(5) * (1 - k / pts.length) + S(1);
    c.strokeStyle = css(lit(m.body, 0.85 + (k / pts.length) * 0.3)); c.lineWidth = w; c.lineCap = 'round';
    c.beginPath(); c.moveTo(pts[k][0], pts[k][1]); c.lineTo(pts[k + 1][0], pts[k + 1][1]); c.stroke();
    if (k % 2 === 0) { c.fillStyle = css(m.accent, 0.8); c.beginPath(); c.arc(pts[k][0] - w * 0.3, pts[k][1], S(0.7), 0, TAU); c.fill(); }
  }
};

// ------------------------------------------------------------------ buildings

/** Blighted, cracked earth with fel-green ooze pools and violet spores (Blightroot ground). */
PLINTHS.blightroot = (ctx, ox, oy, s, seed) => {
  const r = rng(seed + 71);
  const c = centreOf(ox, oy, s);
  softEllipse(ctx, c.x, c.y, s * HX * 0.95, s * HY * 0.95, 0x3a3428, 0.9);
  softEllipse(ctx, c.x - 5, c.y - 2, s * HX * 0.7, s * HY * 0.7, 0x4a3a3a, 0.5);
  for (let i = 0; i < 3; i++) { const x = c.x + (r() - 0.5) * s * HX * 1.2, y = c.y + (r() - 0.5) * s * HY; ctx.fillStyle = radial(ctx, x, y, 7, [[0, 0xd0ff60, 0.8], [1, FELG, 0.3]]); ctx.beginPath(); ctx.ellipse(x, y, 5 + r() * 4, 2.4 + r() * 1.6, 0, 0, TAU); ctx.fill(); }
  for (let i = 0; i < 8; i++) glowAt(ctx, c.x + (r() - 0.5) * s * HX * 1.5, c.y + (r() - 0.5) * s * HY * 1.3, 3, VOIDC, 0.5);
  for (let i = 0; i < 4; i++) { const x = c.x + (r() - 0.5) * s * HX * 1.4, y = c.y + (r() - 0.5) * s * HY * 1.2; ctx.strokeStyle = css(0x2a1a1a); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 4, y - 5, x + 2, y - 9); ctx.stroke(); }
};

/** Rotten bark with oozing fel-green cracks. */
function rotBark(seed: number, glowC = FELG): FacePainter {
  return (c, U, V, l) => {
    const r = rng(seed);
    c.fillStyle = css(lit(0x3a2a2a, l)); c.fillRect(0, 0, U, V);
    for (let u = 0; u < U; u += 0.06) { c.fillStyle = css(lit(mix(0x4a3a3a, 0x2a1a1a, r()), l)); c.fillRect(u, 0, 0.04, V); }
    c.strokeStyle = css(glowC, 0.85); c.lineWidth = 0.014;
    for (let k = 0; k < 3; k++) { let u = r() * U, v = r() * V; c.beginPath(); c.moveTo(u, v); for (let j = 0; j < 3; j++) { u += (r() - 0.5) * 0.2; v += 4 + r() * 6; c.lineTo(u, v); } c.stroke(); }
  };
}

BUILDING_PAINTERS.blightancient = (ctx, def, st) => {
  const m = def.model;
  const r = rng(st.seed);
  const [x, y] = st.stand(1.4);
  const H = st.H * 1.05;
  // a dead, twisted ancient tree with a gaping glowing face and a sparse, sickly crown
  for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + 0.4; ctx.strokeStyle = css(lit(m.wall, 0.8)); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.quadraticCurveTo(x + Math.cos(a) * 14, y - 2 + Math.sin(a) * 4, x + Math.cos(a) * 24, y + Math.sin(a) * 7); ctx.stroke(); }
  ctx.fillStyle = grad(ctx, x - 14, 0, x + 14, 0, [[0, lit(m.wall, 1.15)], [0.5, lit(m.wall, 0.9)], [1, lit(m.wall, 0.55)]]);
  ctx.beginPath(); ctx.moveTo(x - 14, y - 2); ctx.quadraticCurveTo(x - 16, y - H * 0.6, x - 8, y - H); ctx.lineTo(x + 8, y - H); ctx.quadraticCurveTo(x + 15, y - H * 0.5, x + 14, y - 2); ctx.fill();
  ctx.fillStyle = css(0x0a0a08); ctx.beginPath(); ctx.ellipse(x, y - H * 0.4, 6, 8, 0, 0, TAU); ctx.fill();
  glowAt(ctx, x, y - H * 0.4, 12, m.roof, 0.6);
  for (const d of [-4, 4]) { ctx.fillStyle = css(m.roof); ctx.beginPath(); ctx.ellipse(x + d, y - H * 0.62, 2, 1.4, 0, 0, TAU); ctx.fill(); }
  for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.45; ctx.strokeStyle = css(lit(m.wall, 0.9)); ctx.lineWidth = 2.4 - k * 0.2; ctx.beginPath(); ctx.moveTo(x + (k - 2) * 3, y - H); ctx.quadraticCurveTo(x + Math.cos(a) * 16, y - H + Math.sin(a) * 10, x + Math.cos(a) * 26, y - H + Math.sin(a) * 18 + 6); ctx.stroke(); }
  for (let k = 0; k < 5; k++) foliage(ctx, x - 18 + r() * 36, y - H - 8 - r() * 10, 6, 4, mix(m.roof, 0x4a3a2a, 0.5), st.seed + k);
  A.glow.push(pt(x, y - H * 0.4));
  A.flags.push(pt(x + 20, y - H - 6));
};

BUILDING_PAINTERS.voidportal = (ctx, def, st) => {
  const m = def.model;
  const [x0, y0] = st.inset(1.6);
  const g = boxGeo(x0, y0, 1.6, 1.6, 6);
  const w = stoneWall(m.wall, st.seed, 3);
  faceLeft(ctx, g, w); faceRight(ctx, g, w); stoneTop(ctx, g, m.wall);
  // a jagged broken stone ring standing on edge, a swirling void inside
  const c0 = g.c, R = st.H * 0.55;
  glowAt(ctx, c0.x, c0.y - R - 4, R * 1.4, m.roof, 0.45);
  ctx.fillStyle = radial(ctx, c0.x, c0.y - R - 4, R, [[0, 0x0a0010, 1], [0.6, m.roof, 0.85], [1, 0x2a0a4a, 0.6]]);
  ctx.beginPath(); ctx.ellipse(c0.x, c0.y - R - 4, R * 0.55, R * 0.9, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = css(0xe0b0ff, 0.6); ctx.lineWidth = 1;
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(c0.x, c0.y - R - 4, R * (0.15 + k * 0.12), R * (0.25 + k * 0.2), k * 0.8, 0, Math.PI * 1.5); ctx.stroke(); }
  for (let k = 0; k < 9; k++) { const a = (k / 9) * TAU, px = c0.x + Math.cos(a) * R * 0.62, py = c0.y - R - 4 + Math.sin(a) * R; fillPoly(ctx, [[px - 4, py], [px, py - 5 - (k % 2) * 3], [px + 4, py], [px, py + 4]], css(lit(m.wall, 0.9 + (k % 3) * 0.1))); }
  A.glow.push(pt(c0.x, c0.y - R - 4));
  A.flags.push(pt(c0.x, c0.y - 2 * R - 10));
};

BUILDING_PAINTERS.felshrine = (ctx, def, st) => {
  const m = def.model;
  const [x0, y0] = st.inset(1.5);
  const g = boxGeo(x0, y0, 1.5, 1.3, st.H * 0.5);
  const wall = rotBark(st.seed, m.roof);
  faceLeft(ctx, g, (c, U, V, l) => { wall(c, U, V, l); c.fillStyle = css(0x0a0a08); c.beginPath(); c.ellipse(U * 0.5, 0, 0.2, V * 0.6, 0, 0, Math.PI); c.fill(); });
  faceRight(ctx, g, wall);
  // a hound skull on the roof, bone spikes and a fel flame bowl
  const top = g.c;
  fillPoly(ctx, [[g.tL.x - 3, g.tL.y + 2], [top.x, top.y - st.H * 0.4], [g.tF.x + 3, g.tF.y + 2]], css(lit(0x3a2a2a, 1)));
  fillPoly(ctx, [[g.tF.x + 3, g.tF.y + 2], [top.x, top.y - st.H * 0.4], [g.tR.x + 2, g.tR.y + 1]], css(lit(0x3a2a2a, 0.6)));
  blob(ctx, top.x + 4, top.y - st.H * 0.42, 6, 4, 0xd8c8b0, 1);
  fillTri(ctx, top.x + 8, top.y - st.H * 0.42, top.x + 14, top.y - st.H * 0.4, top.x + 8, top.y - st.H * 0.36, 0xd8c8b0);
  ctx.fillStyle = css(m.roof); ctx.beginPath(); ctx.arc(top.x + 5, top.y - st.H * 0.44, 1.2, 0, TAU); ctx.fill();
  glowAt(ctx, g.F.x - 6, g.F.y - 10, 12, m.roof, 0.7);
  for (let k = 0; k < 3; k++) fillTri(ctx, g.F.x - 10 + k * 4, g.F.y - 4, g.F.x - 8 + k * 4, g.F.y - 14 + (k % 2) * 3, g.F.x - 6 + k * 4, g.F.y - 4, m.roof, 0.85);
  A.glow.push(pt(g.F.x - 6, g.F.y - 10));
  A.flags.push(pt(top.x, top.y - st.H * 0.4));
};

BUILDING_PAINTERS.hellgate = (ctx, def, st) => {
  const m = def.model;
  const [x0, y0] = st.inset(1.8);
  const g = boxGeo(x0, y0, 1.8, 1.5, st.H * 0.45);
  const wall = stoneWall(m.wall, st.seed, 5);
  faceLeft(ctx, g, (c, U, V, l) => { wall(c, U, V, l * 0.8); c.fillStyle = grad(c, 0, 0, 0, V * 0.8, [[0, 0xfff0a0], [0.5, m.roof], [1, 0x4a0a0a]]); c.fillRect(U * 0.25, 0, U * 0.5, V * 0.8); });
  faceRight(ctx, g, wall); stoneTop(ctx, g, m.wall);
  const mouth = lerp(g.L, g.F, 0.5);
  glowAt(ctx, mouth.x, mouth.y - 10, 26, m.roof, 0.55);
  // iron gears and chimneys belching fire
  for (const p of [g.tB, g.tR]) { const b = pt(p.x * 0.8 + g.c.x * 0.2, p.y * 0.8 + g.c.y * 0.2 + 4); ctx.fillStyle = grad(ctx, b.x - 4, 0, b.x + 4, 0, [[0, 0x4a3a3a], [1, 0x1a1212]]); ctx.fillRect(b.x - 4, b.y - st.H * 0.6, 8, st.H * 0.6); glowAt(ctx, b.x, b.y - st.H * 0.62, 8, m.roof, 0.7); A.smoke.push(pt(b.x, b.y - st.H * 0.62)); }
  for (let k = 0; k < 6; k++) { const p = lerp(g.tL, g.tF, k / 5); fillTri(ctx, p.x - 2, p.y, p.x, p.y - 7, p.x + 2, p.y, 0x1a1212); }
  A.glow.push(pt(mouth.x, mouth.y - 10));
  A.flags.push(pt(g.tB.x, g.tB.y - st.H * 0.6));
};

BUILDING_PAINTERS.demonstatue = (ctx, def, st) => {
  const m = def.model;
  const [x0, y0] = st.inset(1.6);
  const g = boxGeo(x0, y0, 1.6, 1.6, 8);
  const w = stoneWall(m.wall, st.seed, 4);
  faceLeft(ctx, g, w); faceRight(ctx, g, w); stoneTop(ctx, g, m.wall);
  // a horned, winged stone demon crouching on the plinth, eyes and runes glowing fel green
  const b = g.c, H = st.H * 1.1;
  for (const d of [-1, 1]) fillPoly(ctx, [[b.x, b.y - H * 0.6], [b.x + d * 24, b.y - H * 0.95], [b.x + d * 18, b.y - H * 0.55], [b.x + d * 22, b.y - H * 0.4], [b.x + d * 6, b.y - H * 0.35]], css(lit(m.wall, d < 0 ? 1 : 0.7)));
  blob(ctx, b.x, b.y - H * 0.35, 12, 14, m.wall, 1);
  blob(ctx, b.x + 2, b.y - H * 0.72, 6, 6, m.wall, 1.05);
  for (const d of [-1, 1]) { ctx.fillStyle = css(lit(m.wall, 0.8)); ctx.beginPath(); ctx.moveTo(b.x + 2 + d * 3, b.y - H * 0.76); ctx.quadraticCurveTo(b.x + 2 + d * 10, b.y - H * 0.8, b.x + 2 + d * 8, b.y - H * 0.95); ctx.quadraticCurveTo(b.x + 2 + d * 6, b.y - H * 0.82, b.x + 2 + d * 1, b.y - H * 0.75); ctx.fill(); }
  for (const d of [-2, 2.4]) { ctx.fillStyle = css(m.roof); ctx.beginPath(); ctx.arc(b.x + 2 + d, b.y - H * 0.73, 1, 0, TAU); ctx.fill(); }
  glowAt(ctx, b.x + 2, b.y - H * 0.73, 10, m.roof, 0.6);
  ctx.strokeStyle = css(m.roof, 0.8); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(b.x - 4, b.y - H * 0.25); ctx.lineTo(b.x, b.y - H * 0.4); ctx.lineTo(b.x + 4, b.y - H * 0.25); ctx.stroke();
  A.glow.push(pt(b.x + 2, b.y - H * 0.73));
  A.flags.push(pt(g.tB.x, g.tB.y - 6));
};

BUILDING_PAINTERS.blightprotector = (ctx, def, st) => {
  const m = def.model;
  const [x, y] = st.stand(1.3);
  const H = st.H * 1.15;
  // a corrupted protector tree: a thick twisted trunk with a boulder clutched in its branches
  ctx.fillStyle = grad(ctx, x - 12, 0, x + 12, 0, [[0, lit(m.wall, 1.15)], [1, lit(m.wall, 0.55)]]);
  ctx.beginPath(); ctx.moveTo(x - 16, y - 2); ctx.quadraticCurveTo(x - 8, y - H * 0.4, x - 6, y - H * 0.8); ctx.lineTo(x + 6, y - H * 0.8); ctx.quadraticCurveTo(x + 8, y - H * 0.4, x + 16, y - 2); ctx.fill();
  ctx.strokeStyle = css(FELG, 0.8); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 3, y - 4); ctx.lineTo(x + 1, y - H * 0.35); ctx.lineTo(x - 1, y - H * 0.6); ctx.stroke();
  for (let k = 0; k < 4; k++) { const a = -Math.PI / 2 + (k - 1.5) * 0.6; ctx.strokeStyle = css(lit(m.wall, 0.95)); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y - H * 0.8); ctx.quadraticCurveTo(x + Math.cos(a) * 12, y - H * 0.8 + Math.sin(a) * 10, x + Math.cos(a) * 14, y - H * 0.8 + Math.sin(a) * 16); ctx.stroke(); }
  blob(ctx, x, y - H - 4, 9, 8, 0x6a5a4a, 1);
  ctx.strokeStyle = css(m.roof, 0.85); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 6, y - H - 4); ctx.lineTo(x, y - H - 9); ctx.lineTo(x + 5, y - H - 2); ctx.stroke();
  glowAt(ctx, x, y - H - 4, 14, m.roof, 0.4);
  A.glow.push(pt(x, y - H - 4));
  A.flags.push(pt(x + 14, y - H * 0.9));
};

BUILDING_PAINTERS.forgottenone = (ctx, def, st) => {
  const m = def.model;
  const r = rng(st.seed);
  const [x, y] = st.stand(1.6);
  const by = y - 4;
  // a gaping toothed maw in the ground with tentacles writhing out of it
  ctx.fillStyle = css(lit(m.wall, 0.8)); ctx.beginPath(); ctx.ellipse(x, by, 30, 13, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = radial(ctx, x, by, 22, [[0, 0x050208], [0.7, 0x2a0a3a], [1, lit(m.wall, 0.6)]]); ctx.beginPath(); ctx.ellipse(x, by, 22, 9, 0, 0, TAU); ctx.fill();
  for (let k = 0; k < 14; k++) { const a = (k / 14) * TAU, px = x + Math.cos(a) * 22, py = by + Math.sin(a) * 9; fillTri(ctx, px - 2, py, px + Math.cos(a) * -4, py + Math.sin(a) * -4 - 1, px + 2, py, 0xe0d8c0); }
  glowAt(ctx, x, by - 4, 20, m.roof, 0.4);
  for (let k = 0; k < 4; k++) {
    const sx = x - 12 + k * 8, h = st.H * (0.8 + r() * 0.5);
    ctx.strokeStyle = css(lit(0x4a6a4a, 0.85 + k * 0.05)); ctx.lineCap = 'round';
    for (let j = 0; j < 8; j++) { const t0 = j / 8, t1 = (j + 1) / 8; ctx.lineWidth = 6 * (1 - t0) + 1; ctx.beginPath(); ctx.moveTo(sx + Math.sin(t0 * 4 + k) * 5 * t0, by - t0 * h); ctx.lineTo(sx + Math.sin(t1 * 4 + k) * 5 * t1, by - t1 * h); ctx.stroke(); }
  }
  A.glow.push(pt(x, by - 4));
  A.flags.push(pt(x + 28, by - 6));
};

BUILDING_PAINTERS.painwell = (ctx, def, st) => {
  const m = def.model;
  const [x, y] = st.stand(1.4);
  const by = y - 6;
  drum(ctx, x, by, 22, 10, m.wall, m.wall);
  ctx.fillStyle = radial(ctx, x - 4, by - 12, 20, [[0, 0xff8ab0], [0.5, m.roof], [1, 0x3a0a1a]]); ctx.beginPath(); ctx.ellipse(x, by - 10, 18, 7.5, 0, 0, TAU); ctx.fill();
  glowAt(ctx, x, by - 16, 26, m.roof, 0.5);
  // spiked iron arch with hanging chains and hooks over the well
  ctx.strokeStyle = css(0x2a2222); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 20, by - 10); ctx.quadraticCurveTo(x, by - 10 - st.H * 1.3, x + 20, by - 10); ctx.stroke();
  for (let k = 0; k < 5; k++) { const t = 0.2 + k * 0.15, px = x - 20 + t * 40, py = by - 10 - Math.sin(t * Math.PI) * st.H * 0.65; fillTri(ctx, px - 1.5, py, px, py - 6, px + 1.5, py, 0x2a2222); }
  for (const d of [-6, 6]) { ctx.strokeStyle = css(0x6a6a6a); ctx.lineWidth = 0.8; ctx.setLineDash([1.5, 1]); ctx.beginPath(); ctx.moveTo(x + d, by - 10 - st.H * 0.6); ctx.lineTo(x + d, by - 18); ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); ctx.arc(x + d + 1, by - 16, 2, 0, Math.PI); ctx.stroke(); }
  A.glow.push(pt(x, by - 16));
  A.flags.push(pt(x + 22, by - 12));
};

BUILDING_PAINTERS.corruptioneye = (ctx, def, st) => {
  const m = def.model;
  const r = rng(st.seed);
  const [x0, y0] = st.inset(1.8);
  const g = boxGeo(x0, y0, 1.8, 1.8, 6);
  const w = rotBark(st.seed, m.roof);
  faceLeft(ctx, g, w); faceRight(ctx, g, w); stoneTop(ctx, g, 0x2a1a1a);
  // a mass of twisted roots lifting a giant bloodshot eye, gazing over the battlefield
  const c0 = g.c, H = st.H * 1.15;
  for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; ctx.strokeStyle = css(lit(m.wall, 0.8 + (k % 3) * 0.1)); ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(c0.x + Math.cos(a) * 20, c0.y + Math.sin(a) * 8); ctx.quadraticCurveTo(c0.x + Math.cos(a) * 8, c0.y - H * 0.4, c0.x + Math.cos(a) * 4, c0.y - H * 0.7); ctx.stroke(); }
  const eye = pt(c0.x, c0.y - H * 0.85);
  glowAt(ctx, eye.x, eye.y, 32, m.roof, 0.5);
  ctx.fillStyle = radial(ctx, eye.x - 3, eye.y - 3, 16, [[0, 0xfff8e8], [0.7, 0xe8d0c0], [1, 0xb06a6a]]); ctx.beginPath(); ctx.ellipse(eye.x, eye.y, 14, 12, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = css(0xc02a2a, 0.7); ctx.lineWidth = 0.7;
  for (let k = 0; k < 7; k++) { const a = r() * TAU; ctx.beginPath(); ctx.moveTo(eye.x + Math.cos(a) * 13, eye.y + Math.sin(a) * 11); ctx.lineTo(eye.x + Math.cos(a) * 7 + (r() - 0.5) * 3, eye.y + Math.sin(a) * 6); ctx.stroke(); }
  ctx.fillStyle = radial(ctx, eye.x + 2, eye.y, 7, [[0, 0xe0ff80], [0.6, m.roof], [1, 0x3a5a0a]]); ctx.beginPath(); ctx.arc(eye.x + 2, eye.y, 6.5, 0, TAU); ctx.fill();
  ctx.fillStyle = css(0x0a0a08); ctx.beginPath(); ctx.ellipse(eye.x + 2, eye.y, 1.6, 4.6, 0, 0, TAU); ctx.fill();
  A.glow.push(eye);
  A.flags.push(pt(g.tB.x, g.tB.y - 6));
};

void cornerFor;
