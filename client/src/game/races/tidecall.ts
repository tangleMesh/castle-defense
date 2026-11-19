import { BUILDING_PAINTERS, PLINTHS, UNIT_PAINTERS } from '../painters';
import { css, fillPoly, grad, lit, mix, radial, rng, shade, softEllipse, type Ctx } from '../paint';
import { blob, fillTri, glow, humanoid, limb } from '../units';
import {
  A, HX, HY, boxGeo, centreOf, cornerFor, drum, faceLeft, faceRight, faceTop, glowAt, lerp, pt, stoneTop, stoneWall,
  type FacePainter,
} from '../structures';

/**
 * Tidecall Dominion (naga): fish-headed murlocs, swamp spitters, a many-headed hydra, serpent-tailed
 * naga warriors and sirens, lobsters, dragon turtles and winged serpents. Buildings are reed huts
 * on stilts, swamp wells, tide pools, coral spires, a pyramid of sea-worn stone, a siren oracle and
 * the tidal guardian, on wet sand with shells and puddles.
 */

const CORAL = 0xff7a6a;
const SEA = 0x2a8ab0;
const SAND = 0xd8c8a0;
const TAU = Math.PI * 2;
type SFn = (v: number) => number;

/** A serpent tail coiling on the ground behind (x, y) with scales. */
function serpentTail(c: Ctx, x: number, y: number, S: SFn, color: number, ph: number, len = 14) {
  c.strokeStyle = css(lit(color, 0.9)); c.lineWidth = S(5); c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, y);
  for (let k = 1; k <= 6; k++) { const t = k / 6; c.lineTo(x - t * S(len), y + Math.sin(ph + t * 5) * S(2) * t - t * S(1)); }
  c.stroke();
  c.strokeStyle = css(lit(color, 1.3), 0.6); c.lineWidth = S(1.4);
  c.beginPath(); c.moveTo(x, y - S(1.4)); for (let k = 1; k <= 6; k++) { const t = k / 6; c.lineTo(x - t * S(len), y - S(1.4) + Math.sin(ph + t * 5) * S(2) * t - t * S(1)); } c.stroke();
}

/** A trident in hand. */
const trident = (S: SFn, attack: boolean, color = 0xe0c040) => (c: Ctx, hand: { x: number; y: number }) => {
  const ang = attack ? -0.1 : -1.25, len = S(18);
  const bx = hand.x - Math.cos(ang) * S(6), by = hand.y - Math.sin(ang) * S(6);
  const tx = hand.x + Math.cos(ang) * len, ty = hand.y + Math.sin(ang) * len;
  c.strokeStyle = css(lit(0x6a5a3a, 1)); c.lineWidth = S(1.2); c.beginPath(); c.moveTo(bx, by); c.lineTo(tx, ty); c.stroke();
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  c.strokeStyle = css(color); c.lineWidth = S(1);
  c.beginPath(); c.moveTo(tx - nx * S(2.5), ty - ny * S(2.5)); c.lineTo(tx + nx * S(2.5), ty + ny * S(2.5)); c.stroke();
  for (const d of [-2.5, 0, 2.5]) { c.beginPath(); c.moveTo(tx + nx * S(d), ty + ny * S(d)); c.lineTo(tx + nx * S(d) + Math.cos(ang) * S(4), ty + ny * S(d) + Math.sin(ang) * S(4)); c.stroke(); }
};

// ------------------------------------------------------------------ units

UNIT_PAINTERS.murloc = (c, u, cx, fy, S, pose) => {
  const m = u.model, v = m.variant;
  const r = humanoid(c, cx, fy, S, {
    h: 21, body: m.body, accent: m.accent, helmet: 'none', armor: 'leaf', skin: m.body, attackArm: 'thrust',
    front: (cc, hand) => {
      if (v === 'assassin') { cc.strokeStyle = css(0xe0e4ec); cc.lineWidth = S(1.2); const ang = pose.attack ? -0.2 : -1; cc.beginPath(); cc.moveTo(hand.x, hand.y); cc.lineTo(hand.x + Math.cos(ang) * S(7), hand.y + Math.sin(ang) * S(7)); cc.stroke(); }
      else trident(S, pose.attack, v === 'champion' ? 0xe0c040 : 0xb0b8c0)(cc, hand);
    },
  }, pose);
  // big fish head: wide mouth, bulging eye, a fin crest
  const hx = r.head.x + S(1), hy = r.head.y;
  blob(c, hx, hy, S(4.6), S(4), m.body, 1.05);
  c.fillStyle = css(0x1a1010); c.beginPath(); c.moveTo(hx + S(1), hy + S(1)); c.quadraticCurveTo(hx + S(4), hy + S(3), hx + S(5), hy + S(0.6)); c.fill();
  c.fillStyle = css(0xffffff); c.beginPath(); c.arc(hx + S(2.4), hy - S(1.6), S(1.3), 0, TAU); c.fill();
  c.fillStyle = css(0x1a1010); c.beginPath(); c.arc(hx + S(2.8), hy - S(1.6), S(0.6), 0, TAU); c.fill();
  for (let k = 0; k < 4; k++) fillTri(c, hx - S(3) + k * S(1.4), hy - S(3), hx - S(2.6) + k * S(1.4), hy - S(7 - (k % 2) * 1.5), hx - S(1.8) + k * S(1.4), hy - S(3), m.accent);
  if (v === 'assassin') { c.fillStyle = css(m.accent); c.fillRect(hx - S(3), hy - S(0.4), S(6), S(1)); }
};

UNIT_PAINTERS.spitter = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  const ph = pose.ph * TAU;
  // a squat swamp toad-beast with a bloated throat sac that spits green bile
  softEllipse(c, cx, fy, S(10), S(2.6), 0x000000, 0.3);
  for (const [dx, off] of [[-6, 0], [5, Math.PI]] as const) { const a = pose.moving ? Math.sin(ph + off) * 0.4 : 0; limb(c, cx + S(dx), fy - S(6), cx + S(dx) + Math.sin(a) * S(3) + S(2), fy - S(1), S(3), shade(m.body, 0.8), 1); }
  blob(c, cx, fy - S(10), S(10), S(7), m.body);
  for (let k = 0; k < 6; k++) { c.fillStyle = css(shade(m.body, 0.7)); c.beginPath(); c.arc(cx - S(6) + k * S(2.4), fy - S(13) + (k % 2) * S(2), S(1), 0, TAU); c.fill(); }
  const sac = pose.attack ? 1.4 : 1 + Math.sin(ph * 2) * 0.1;
  blob(c, cx + S(7), fy - S(7), S(3.6) * sac, S(3) * sac, m.accent, 1.1);
  blob(c, cx + S(8), fy - S(14), S(4), S(3), m.body, 1.05);
  c.fillStyle = css(0xffd040); c.beginPath(); c.arc(cx + S(9), fy - S(16), S(1), 0, TAU); c.fill();
  if (pose.attack) { glow(c, cx + S(18), fy - S(13), S(5), m.accent, 0.7); for (let k = 0; k < 4; k++) { c.fillStyle = css(m.accent, 0.9); c.beginPath(); c.arc(cx + S(13 + k * 3), fy - S(13.5 - k * 0.3), S(1.4 - k * 0.2), 0, TAU); c.fill(); } }
};

UNIT_PAINTERS.hydra = (c, u, cx, fy, S, pose) => {
  const m = u.model, head = m.variant === 'head';
  const ph = pose.ph * TAU;
  softEllipse(c, cx, fy, S(head ? 8 : 13), S(3), 0x000000, 0.3);
  // a scaly body with several long necks swaying, each with a fanged head
  blob(c, cx - S(2), fy - S(8), S(head ? 7 : 11), S(head ? 5 : 7), m.body);
  const n = head ? 1 : 3;
  for (let k = 0; k < n; k++) {
    const sway = Math.sin(ph + k * 1.7) * S(2);
    const bx = cx - S(4) + k * S(4), by = fy - S(11);
    const hx = cx + S(head ? 6 : 4 + k * 4) + sway, hy = fy - S(head ? 18 : 22 + (k % 2) * 4) - (pose.attack ? S(2) : 0);
    c.strokeStyle = css(lit(m.body, 0.85 + k * 0.08)); c.lineWidth = S(3.2); c.lineCap = 'round';
    c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx + S(1), hy + S(6), hx, hy); c.stroke();
    blob(c, hx + S(1.5), hy, S(3.2), S(2.2), m.body, 1.1);
    c.fillStyle = css(0xffe040); c.beginPath(); c.arc(hx + S(2), hy - S(0.8), S(0.6), 0, TAU); c.fill();
    fillTri(c, hx + S(3.5), hy + S(0.6), hx + S(4.2), hy + S(2), hx + S(4.6), hy + S(0.6), 0xffffff);
    if (pose.attack) glow(c, hx + S(6), hy, S(3), m.accent, 0.7);
  }
  for (let k = 0; k < 6; k++) fillTri(c, cx - S(10) + k * S(3), fy - S(13), cx - S(9) + k * S(3), fy - S(16), cx - S(8) + k * S(3), fy - S(13), m.accent);
};

UNIT_PAINTERS.naga = (c, u, cx, fy, S, pose) => {
  const m = u.model, v = m.variant;
  const ph = pose.ph * TAU;
  const siren = v === 'siren';
  // the serpent body rises from the coiled tail into the waist
  serpentTail(c, cx - S(1), fy - S(2.5), S, m.body, ph, 16);
  c.strokeStyle = css(lit(m.body, 1)); c.lineWidth = S(5.5); c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx - S(1), fy - S(2.5)); c.quadraticCurveTo(cx + S(3), fy - S(5), cx + S(1), fy - S(10)); c.stroke();
  const r = humanoid(c, cx + S(1), fy - S(6), S, {
    h: 26, body: siren ? 0x2a6a8a : 0x2a5a6a, accent: m.accent, helmet: siren ? 'none' : 'helm', armor: siren ? 'leather' : 'mail', skin: m.body, riding: true, attackArm: siren ? 'raise' : 'thrust',
    back: siren ? undefined : (cc, hand) => { blob(cc, hand.x + S(1), hand.y - S(1), S(3.6), S(4.4), 0xb0a060, 1); },
    front: siren ? (cc, hand) => { glow(cc, hand.x, hand.y - S(2), S(pose.attack ? 6 : 3), m.accent, 0.8); } : trident(S, pose.attack, v === 'royal' ? 0xf0d050 : 0xb0b8c0),
  }, { ...pose, moving: false });
  // fin ears and a crest of hair
  const hx = r.head.x + S(0.6), hy = r.head.y;
  fillTri(c, hx - S(2), hy - S(1), hx - S(6), hy - S(3), hx - S(2), hy + S(1), lit(m.body, 0.9));
  if (siren) { c.fillStyle = css(m.accent); c.beginPath(); c.moveTo(hx + S(2), hy - S(3)); c.quadraticCurveTo(hx - S(7), hy - S(4), hx - S(6), hy + S(8)); c.lineTo(hx - S(2), hy + S(2)); c.fill(); }
  if (v === 'royal') for (let k = 0; k < 3; k++) fillTri(c, hx - S(2) + k * S(1.6), hy - S(4), hx - S(1.4) + k * S(1.6), hy - S(7), hx - S(0.6) + k * S(1.6), hy - S(4), 0xf0d050);
};

UNIT_PAINTERS.lobster = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  const ph = pose.ph * TAU;
  softEllipse(c, cx, fy, S(9), S(2.4), 0x000000, 0.3);
  for (let k = 0; k < 3; k++) { const a = pose.moving ? Math.sin(ph + k) * 0.4 : 0; for (const d of [-1, 1]) limb(c, cx - S(3) + k * S(3), fy - S(4), cx - S(3) + k * S(3) + d * S(2) + Math.sin(a) * S(2), fy, S(1), shade(m.body, 0.8), d < 0 ? 0.7 : 1); }
  // segmented tail, armoured body, two big claws
  for (let k = 0; k < 4; k++) blob(c, cx - S(6) - k * S(2.6), fy - S(5) + k * S(0.4), S(2.4 - k * 0.3), S(2), m.body, 0.9);
  blob(c, cx, fy - S(6), S(5), S(3.4), m.body, 1.05);
  const open = pose.attack ? 0.6 : 0.2;
  for (const [dy, l] of [[-1, 0.8], [1, 1.05]] as const) {
    const bx = cx + S(6), by = fy - S(7) + dy * S(1.5);
    limb(c, cx + S(3), fy - S(6), bx, by, S(1.6), m.body, l);
    c.save(); c.translate(bx + S(2), by); c.rotate(-open); blob(c, 0, 0, S(3), S(1.6), m.body, l * 1.1); c.restore();
    c.save(); c.translate(bx + S(2), by + S(1)); c.rotate(open); blob(c, 0, 0, S(2.4), S(1.2), lit(m.body, 0.9), l); c.restore();
  }
  c.strokeStyle = css(m.accent); c.lineWidth = S(0.5); c.beginPath(); c.moveTo(cx + S(4), fy - S(8)); c.quadraticCurveTo(cx + S(9), fy - S(14), cx + S(13), fy - S(12)); c.stroke();
};

UNIT_PAINTERS.dragonturtle = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  const ph = pose.ph * TAU;
  softEllipse(c, cx, fy, S(15), S(3.2), 0x000000, 0.35);
  for (const [dx, off] of [[-8, 0], [-2, Math.PI], [5, 0], [10, Math.PI]] as const) { const a = pose.moving ? Math.sin(ph + off) * 0.35 : 0; limb(c, cx + S(dx), fy - S(5), cx + S(dx) + Math.sin(a) * S(2), fy - S(0.5), S(3.2), shade(m.body, 0.85), dx < 0 ? 0.8 : 1); }
  // a domed shell with spikes, a dragon head and neck
  c.fillStyle = grad(c, cx - S(14), fy - S(18), cx + S(14), fy - S(5), [[0, lit(m.accent, 1.2)], [0.5, lit(m.accent, 0.9)], [1, lit(shade(m.accent, 0.7), 0.7)]]);
  c.beginPath(); c.ellipse(cx - S(1), fy - S(7), S(14), S(11), 0, Math.PI, TAU); c.fill();
  c.strokeStyle = css(0x000000, 0.3); c.lineWidth = S(0.6);
  for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(cx - S(1) + k * S(5), fy - S(7)); c.lineTo(cx - S(1) + k * S(4), fy - S(16)); c.stroke(); }
  for (let k = 0; k < 5; k++) fillTri(c, cx - S(10) + k * S(4.6), fy - S(14) - Math.sin((k / 4) * Math.PI) * S(4), cx - S(9) + k * S(4.6), fy - S(19) - Math.sin((k / 4) * Math.PI) * S(4), cx - S(8) + k * S(4.6), fy - S(14) - Math.sin((k / 4) * Math.PI) * S(4), 0xe0d8b8);
  limb(c, cx + S(11), fy - S(8), cx + S(16), fy - S(14), S(4), m.body, 1.05);
  blob(c, cx + S(18), fy - S(15), S(4.4), S(3), m.body, 1.1);
  for (const d of [0, 1.4]) fillTri(c, cx + S(16 + d), fy - S(17), cx + S(14 + d), fy - S(21), cx + S(17.5 + d), fy - S(17.5), 0xe0d8b8);
  c.fillStyle = css(0xffd040); c.beginPath(); c.arc(cx + S(19), fy - S(16), S(0.7), 0, TAU); c.fill();
  if (pose.attack) { glow(c, cx + S(24), fy - S(15), S(5), 0x9ad0ff, 0.7); blob(c, cx + S(25), fy - S(15), S(2.4), S(2.4), 0x6a8aa0); }
};

UNIT_PAINTERS.wingedserpent = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  const ph = pose.ph * TAU;
  const y = fy - S(32) + Math.sin(ph) * S(1.5);
  glow(c, cx, y, S(12), m.body, 0.25);
  // a long sinuous body undulating through the air, feathered wings
  c.strokeStyle = css(lit(m.body, 0.95)); c.lineWidth = S(3); c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx + S(8), y - S(2));
  for (let k = 1; k <= 8; k++) { const t = k / 8; c.lineTo(cx + S(8) - t * S(26), y - S(2) + Math.sin(ph * 2 + t * 6) * S(3)); }
  c.stroke();
  c.strokeStyle = css(m.accent, 0.8); c.lineWidth = S(1); c.beginPath(); c.moveTo(cx + S(8), y - S(3.4)); for (let k = 1; k <= 8; k++) { const t = k / 8; c.lineTo(cx + S(8) - t * S(26), y - S(3.4) + Math.sin(ph * 2 + t * 6) * S(3)); } c.stroke();
  const flap = Math.sin(ph * 2);
  for (const [d, l] of [[-1, 0.75], [1, 1.05]] as const) {
    const tipY = y - S(10) - S(6) * flap * d;
    c.fillStyle = grad(c, cx, y, cx + S(4), tipY, [[0, lit(m.body, l)], [1, lit(m.accent, l)]]);
    c.beginPath(); c.moveTo(cx - S(2), y - S(2)); c.quadraticCurveTo(cx - S(4), tipY, cx + S(6) * d * 0 + S(4), tipY - S(2)); c.quadraticCurveTo(cx + S(4), y - S(4), cx + S(2), y - S(1)); c.fill();
  }
  blob(c, cx + S(10), y - S(3), S(3.2), S(2.4), m.body, 1.1);
  for (let k = 0; k < 3; k++) fillTri(c, cx + S(8) + k * S(1.2), y - S(5), cx + S(7) + k * S(1.2), y - S(9 - k), cx + S(9) + k * S(1.2), y - S(5), m.accent);
  c.fillStyle = css(0xffe040); c.beginPath(); c.arc(cx + S(11), y - S(3.6), S(0.6), 0, TAU); c.fill();
  if (pose.attack) glow(c, cx + S(16), y - S(3), S(5), m.body, 0.8);
};

// ------------------------------------------------------------------ buildings

/** Wet sand with shells, kelp and tide puddles (Tidecall ground). */
PLINTHS.tidecall = (ctx, ox, oy, s, seed) => {
  const r = rng(seed + 61);
  const c = centreOf(ox, oy, s);
  softEllipse(ctx, c.x, c.y, s * HX * 0.98, s * HY * 0.98, 0xc8b890, 0.9);
  softEllipse(ctx, c.x - 5, c.y - 2, s * HX * 0.7, s * HY * 0.7, 0xd8c8a0, 0.6);
  for (let i = 0; i < 3; i++) { const x = c.x + (r() - 0.5) * s * HX * 1.2, y = c.y + (r() - 0.5) * s * HY; ctx.fillStyle = radial(ctx, x, y, 8, [[0, 0x9ad0e0, 0.7], [1, SEA, 0.2]]); ctx.beginPath(); ctx.ellipse(x, y, 7 + r() * 5, 3 + r() * 2, 0, 0, TAU); ctx.fill(); }
  for (let i = 0; i < 6; i++) { const x = c.x + (r() - 0.5) * s * HX * 1.6, y = c.y + (r() - 0.5) * s * HY * 1.4; ctx.fillStyle = css(r() < 0.5 ? 0xf8e0d0 : CORAL); ctx.beginPath(); ctx.ellipse(x, y, 1.8, 1.2, r(), 0, TAU); ctx.fill(); }
  for (let i = 0; i < 5; i++) { const x = c.x + (r() - 0.5) * s * HX * 1.6, y = c.y + (r() - 0.5) * s * HY * 1.4; ctx.strokeStyle = css(0x3a6a4a); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 3, y - 4, x + 1, y - 7); ctx.stroke(); }
};

/** Sea-worn sandstone with barnacles and coral growth. */
function seaStone(seed: number, base = SAND): FacePainter {
  const stone = stoneWall(base, seed, 6);
  return (c, U, V, l) => {
    const r = rng(seed);
    stone(c, U, V, l);
    for (let i = 0; i < U * 18; i++) { c.fillStyle = css(r() < 0.5 ? 0xe8e0d0 : 0x7a8a7a, 0.6); c.fillRect(r() * U, r() * V * 0.5, 0.025, 1.2); }
    for (let i = 0; i < U * 4; i++) { c.fillStyle = css(CORAL, 0.8); const u = r() * U, v = r() * V * 0.4; c.fillRect(u, v, 0.03, 3 + r() * 3); c.fillRect(u - 0.02, v + 2, 0.07, 1); }
  };
}

function coralBranch(ctx: Ctx, x: number, y: number, h: number, color: number, seed: number) {
  const r = rng(seed);
  const grow = (x0: number, y0: number, len: number, ang: number, depth: number) => {
    const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
    ctx.strokeStyle = css(lit(color, 0.8 + depth * 0.1)); ctx.lineWidth = Math.max(1, 3.4 - depth); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    if (depth < 3) { grow(x1, y1, len * 0.7, ang - 0.5 - r() * 0.3, depth + 1); grow(x1, y1, len * 0.7, ang + 0.4 + r() * 0.3, depth + 1); }
  };
  grow(x, y, h * 0.4, -Math.PI / 2, 0);
}

BUILDING_PAINTERS.murloccamp = (ctx, def, st) => {
  const m = def.model;
  const [x, y] = st.stand(1.6);
  // two reed huts on stilts over a tide pool, fishing nets, a drying fish rack
  ctx.fillStyle = radial(ctx, x, y - 4, 30, [[0, 0x9ad0e0, 0.8], [1, SEA, 0.4]]); ctx.beginPath(); ctx.ellipse(x, y - 4, 32, 12, 0, 0, TAU); ctx.fill();
  const hut = (hx: number, hy: number, w: number, h: number) => {
    ctx.strokeStyle = css(0x5a4a32); ctx.lineWidth = 1.6; for (const dx of [-w * 0.6, w * 0.6]) { ctx.beginPath(); ctx.moveTo(hx + dx, hy + 8); ctx.lineTo(hx + dx, hy); ctx.stroke(); }
    ctx.fillStyle = grad(ctx, hx - w, 0, hx + w, 0, [[0, lit(m.wall, 1.15)], [1, lit(m.wall, 0.6)]]); ctx.fillRect(hx - w * 0.8, hy - h * 0.5, w * 1.6, h * 0.5);
    ctx.fillStyle = grad(ctx, hx - w, 0, hx + w, 0, [[0, lit(m.roof, 1.1)], [1, lit(m.roof, 0.6)]]);
    ctx.beginPath(); ctx.moveTo(hx - w, hy - h * 0.45); ctx.quadraticCurveTo(hx, hy - h * 1.4, hx + w, hy - h * 0.45); ctx.fill();
    ctx.fillStyle = css(0x1a1a10); ctx.fillRect(hx - 2, hy - h * 0.35, 4, h * 0.35);
  };
  hut(x - 12, y - 10, 13, st.H * 0.9);
  hut(x + 14, y - 4, 11, st.H * 0.75);
  ctx.strokeStyle = css(0xb0a070, 0.8); ctx.lineWidth = 0.6;
  for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x - 30 + k * 3, y - 6); ctx.lineTo(x - 26 + k * 3, y + 4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 31, y - 4 + k * 2.5); ctx.lineTo(x - 22, y - 4 + k * 2.5); ctx.stroke(); }
  A.flags.push(pt(x - 12, y - 10 - st.H * 1.25));
  A.smoke.push(pt(x + 14, y - 4 - st.H));
};

BUILDING_PAINTERS.swampwell = (ctx, def, st) => {
  const m = def.model;
  const r = rng(st.seed);
  const [x, y] = st.stand(1.6);
  const by = y - 6;
  drum(ctx, x, by, 26, 6, m.wall, m.wall);
  ctx.fillStyle = radial(ctx, x - 6, by - 8, 26, [[0, lit(m.roof, 1.3)], [0.6, m.roof], [1, shade(m.roof, 0.4)]]); ctx.beginPath(); ctx.ellipse(x, by - 6, 22, 9, 0, 0, TAU); ctx.fill();
  for (let k = 0; k < 6; k++) { ctx.fillStyle = css(lit(m.roof, 1.4), 0.7); ctx.beginPath(); ctx.arc(x - 16 + r() * 32, by - 6 + (r() - 0.5) * 8, 1 + r() * 1.5, 0, TAU); ctx.fill(); }
  // reeds and a twisted swamp tree, a hydra head carving if upgraded
  for (let k = 0; k < 8; k++) { const px = x - 28 + r() * 56, py = by + 2 - r() * 4; ctx.strokeStyle = css(0x5a7a3a); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + (r() - 0.5) * 3, py - 8 - r() * 6); ctx.stroke(); }
  ctx.strokeStyle = css(0x4a3a2a); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 20, by); ctx.quadraticCurveTo(x + 26, by - st.H * 0.8, x + 14, by - st.H * 1.2); ctx.stroke();
  for (let k = 0; k < 5; k++) { ctx.strokeStyle = css(0x6a8a4a, 0.85); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 14 + k * 2, by - st.H * 1.15); ctx.lineTo(x + 13 + k * 2, by - st.H * 0.85); ctx.stroke(); }
  if (def.id === 'tc_lernaean') for (let k = 0; k < 3; k++) { const hx = x - 10 + k * 10, hy = by - 18 - (k % 2) * 6; ctx.strokeStyle = css(0x2a7a5a); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx, by - 6); ctx.quadraticCurveTo(hx - 2, hy + 6, hx + 2, hy); ctx.stroke(); blob(ctx, hx + 3, hy, 3, 2, 0x2a7a5a); glowAt(ctx, hx + 4, hy - 1, 3, 0x6ae0a0, 0.7); }
  A.flags.push(pt(x + 14, by - st.H * 1.2));
};

BUILDING_PAINTERS.spawningpool = (ctx, def, st) => {
  const m = def.model;
  const [x0, y0] = st.inset(1.8);
  const g = boxGeo(x0, y0, 1.8, 1.6, 7);
  const w = seaStone(st.seed, m.wall);
  faceLeft(ctx, g, w); faceRight(ctx, g, w);
  faceTop(ctx, g, (c, U, W) => { c.fillStyle = radial(c, U * 0.4, W * 0.4, U, [[0, 0x9ad0e0], [0.6, m.roof], [1, shade(m.roof, 0.5)]]); c.fillRect(0, 0, U, W); });
  // eggs in the pool and an arch of two coiled sea-serpent statues
  for (let k = 0; k < 5; k++) { const p = lerp(lerp(g.tL, g.tR, 0.3 + (k % 3) * 0.2), g.c, 0.3); ctx.fillStyle = radial(ctx, p.x - 1, p.y - 1, 3.5, [[0, 0xf0fff0], [1, 0x6ac0a0]]); ctx.beginPath(); ctx.ellipse(p.x + (k - 2) * 5, p.y + 2, 2.4, 3, 0, 0, TAU); ctx.fill(); }
  for (const p of [g.tB, g.tR]) {
    const b = pt(p.x * 0.8 + g.c.x * 0.2, p.y * 0.8 + g.c.y * 0.2 + 4);
    ctx.strokeStyle = css(lit(m.wall, 1)); ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.quadraticCurveTo(b.x + 10, b.y - st.H * 0.6, b.x, b.y - st.H); ctx.stroke();
    blob(ctx, b.x + 2, b.y - st.H - 2, 4, 3, m.wall, 1.05);
  }
  A.flags.push(pt(g.tB.x, g.tB.y - st.H));
};

BUILDING_PAINTERS.nagaspring = (ctx, def, st) => {
  const m = def.model;
  const r = rng(st.seed);
  const [x, y] = st.stand(1.6);
  const by = y - 6;
  drum(ctx, x, by, 28, 6, SAND, SAND);
  ctx.fillStyle = radial(ctx, x - 6, by - 8, 26, [[0, 0xe0f8ff], [0.5, 0x6ac0e0], [1, SEA]]); ctx.beginPath(); ctx.ellipse(x, by - 6, 24, 10, 0, 0, TAU); ctx.fill();
  // a ring of coral spires and a pearl-crowned shell throne
  for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + 0.3; coralBranch(ctx, x + Math.cos(a) * 24, by - 4 + Math.sin(a) * 9, st.H * (0.7 + r() * 0.4), m.roof, st.seed + k); }
  ctx.fillStyle = grad(ctx, x - 10, 0, x + 10, 0, [[0, 0xf8e8e0], [1, 0xd8a8a0]]);
  ctx.beginPath(); ctx.moveTo(x - 9, by - 6); for (let k = 0; k <= 6; k++) { const a = Math.PI + (k / 6) * Math.PI; ctx.lineTo(x + Math.cos(a) * 9, by - 6 + Math.sin(a) * 14); } ctx.closePath(); ctx.fill();
  glowAt(ctx, x, by - 22, 10, 0xffffff, 0.6);
  ctx.fillStyle = radial(ctx, x - 1, by - 23, 4, [[0, 0xffffff], [1, 0xe0d0f0]]); ctx.beginPath(); ctx.arc(x, by - 22, 3, 0, TAU); ctx.fill();
  A.glow.push(pt(x, by - 22));
  A.flags.push(pt(x + 26, by - 10));
};

BUILDING_PAINTERS.reptilepool = (ctx, def, st) => {
  const m = def.model;
  const [x, y] = st.stand(1.7);
  const by = y - 4;
  // a broad lagoon framed by rocks, a turtle shell basking, eggs in the sand
  ctx.fillStyle = radial(ctx, x - 6, by - 4, 34, [[0, 0x9ad0e0], [0.6, 0x3a8ab0], [1, 0x1a4a6a]]); ctx.beginPath(); ctx.ellipse(x, by - 4, 34, 14, 0, 0, TAU); ctx.fill();
  for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU; blob(ctx, x + Math.cos(a) * 32, by - 4 + Math.sin(a) * 13, 5, 3.5, m.wall, Math.sin(a) > 0 ? 1.05 : 0.75); }
  ctx.fillStyle = grad(ctx, x - 14, by - 22, x + 14, by - 4, [[0, lit(0xb0a060, 1.2)], [1, lit(0x6a6a3a, 0.7)]]);
  ctx.beginPath(); ctx.ellipse(x + 4, by - 6, 14, 10, 0, Math.PI, TAU); ctx.fill();
  for (let k = 0; k < 4; k++) fillTri(ctx, x - 6 + k * 6, by - 13 - Math.sin((k / 3) * Math.PI) * 3, x - 5 + k * 6, by - 18 - Math.sin((k / 3) * Math.PI) * 3, x - 4 + k * 6, by - 13 - Math.sin((k / 3) * Math.PI) * 3, 0xe0d8b8);
  for (let k = 0; k < 3; k++) { ctx.fillStyle = radial(ctx, x - 24 + k * 5, by + 4, 3, [[0, 0xffffff], [1, 0xe0d8c0]]); ctx.beginPath(); ctx.ellipse(x - 24 + k * 5, by + 5, 2, 2.6, 0, 0, TAU); ctx.fill(); }
  A.flags.push(pt(x + 30, by - 10));
};

BUILDING_PAINTERS.snaketemple = (ctx, def, st) => {
  const m = def.model;
  const [x0, y0] = st.inset(1.6);
  const g = boxGeo(x0, y0, 1.6, 1.6, st.H * 0.4);
  const w = seaStone(st.seed, m.wall);
  faceLeft(ctx, g, (c, U, V, l) => { w(c, U, V, l); c.fillStyle = css(0x1a1a10); c.fillRect(U * 0.38, 0, 0.36, V * 0.65); });
  faceRight(ctx, g, w); stoneTop(ctx, g, m.wall);
  // a stepped top tier and a winged serpent idol coiled around a pillar
  const cc = cornerFor(g.c, 1);
  const t = boxGeo(cc.x, cc.y, 1, 1, st.H * 0.3);
  faceLeft(ctx, t, w); faceRight(ctx, t, w); stoneTop(ctx, t, m.wall);
  const b = pt(t.c.x, t.c.y);
  ctx.fillStyle = css(lit(m.wall, 0.9)); ctx.fillRect(b.x - 3, b.y - st.H * 0.8, 6, st.H * 0.8);
  ctx.strokeStyle = css(m.roof); ctx.lineWidth = 3; ctx.beginPath();
  for (let k = 0; k <= 12; k++) { const t2 = k / 12; ctx.lineTo(b.x + Math.sin(t2 * TAU * 1.5) * 6, b.y - t2 * st.H * 0.8); } ctx.stroke();
  for (const d of [-1, 1]) fillPoly(ctx, [[b.x, b.y - st.H * 0.8], [b.x + d * 16, b.y - st.H * 1.05], [b.x + d * 12, b.y - st.H * 0.8], [b.x + d * 4, b.y - st.H * 0.7]], css(lit(m.roof, d < 0 ? 1.1 : 0.75)));
  blob(ctx, b.x + 3, b.y - st.H * 0.85, 4, 3, m.roof, 1.1);
  A.flags.push(pt(g.tR.x, g.tR.y - 6));
};

BUILDING_PAINTERS.coralstatue = (ctx, def, st) => {
  const m = def.model;
  const [x0, y0] = st.inset(1.2);
  const g = boxGeo(x0, y0, 1.2, 1.2, 6);
  const w = seaStone(st.seed, m.wall);
  faceLeft(ctx, g, w); faceRight(ctx, g, w); stoneTop(ctx, g, m.wall);
  // a serene naga statue grown over with coral, a healing glow
  const b = g.c, h = st.H * 1.1;
  glowAt(ctx, b.x, b.y - h * 0.5, 24, 0x6ae0c0, 0.4);
  ctx.strokeStyle = css(lit(m.wall, 0.95)); ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(b.x - 8, b.y); ctx.quadraticCurveTo(b.x + 10, b.y - h * 0.3, b.x, b.y - h * 0.6); ctx.stroke();
  fillPoly(ctx, [[b.x - 5, b.y - h * 0.55], [b.x + 5, b.y - h * 0.55], [b.x + 4, b.y - h * 0.85], [b.x - 4, b.y - h * 0.85]], css(lit(m.wall, 1.05)));
  blob(ctx, b.x, b.y - h * 0.92, 4.4, 4.6, m.wall, 1.05);
  coralBranch(ctx, b.x - 10, b.y - 2, h * 0.6, m.roof, st.seed);
  coralBranch(ctx, b.x + 10, b.y - 1, h * 0.5, m.roof, st.seed + 1);
  A.glow.push(pt(b.x, b.y - h * 0.5));
  A.flags.push(pt(g.tB.x, g.tB.y - 4));
};

BUILDING_PAINTERS.pyramid = (ctx, def, st) => {
  const m = def.model;
  const [x0, y0] = st.inset(1.8);
  const g = boxGeo(x0, y0, 1.8, 1.8, 4);
  const w = seaStone(st.seed, m.wall);
  faceLeft(ctx, g, w); faceRight(ctx, g, w); stoneTop(ctx, g, m.wall);
  // a stepped pyramid with a cracked, glowing seam and a sea-blue capstone
  const steps = 4, h = st.H * 1.1;
  for (let k = 0; k < steps; k++) {
    const kk = 1.7 - k * 0.38, cc = cornerFor(g.c, kk);
    const s2 = boxGeo(cc.x, cc.y - (k * h) / steps, kk, kk, h / steps);
    faceLeft(ctx, s2, seaStone(st.seed + k, m.wall)); faceRight(ctx, s2, seaStone(st.seed + k + 7, m.wall)); stoneTop(ctx, s2, m.wall);
  }
  const top = pt(g.c.x, g.c.y - h);
  fillTri(ctx, top.x - 6, top.y + 2, top.x, top.y - 9, top.x + 6, top.y + 2, lit(m.roof, 1.2));
  glowAt(ctx, top.x, top.y - 3, 14, m.roof, 0.6);
  ctx.strokeStyle = css(0xffd080, 0.8); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(g.F.x - 20, g.F.y - 2); ctx.lineTo(g.c.x - 4, g.c.y - h * 0.3); ctx.lineTo(g.c.x + 2, g.c.y - h * 0.5); ctx.stroke();
  A.glow.push(pt(top.x, top.y - 3));
  A.flags.push(pt(top.x, top.y - 9));
};

BUILDING_PAINTERS.oracle = (ctx, def, st) => {
  const m = def.model;
  const r = rng(st.seed);
  const [x, y] = st.stand(1.4);
  const by = y - 6;
  drum(ctx, x, by, 24, 6, m.wall, m.wall);
  // a tall spiral seashell tower with a glowing pink eye-pearl
  const h = st.H * 1.2;
  for (let k = 0; k < 7; k++) {
    const t = k / 7, w = 16 * (1 - t * 0.85), yy = by - 6 - t * h;
    ctx.fillStyle = grad(ctx, x - w, 0, x + w, 0, [[0, lit(0xf8e8e0, 1.05)], [0.5, lit(0xf0c8c0, 0.95)], [1, lit(0xc89898, 0.75)]]);
    ctx.beginPath(); ctx.ellipse(x + Math.sin(t * 9) * 1.5, yy, w, w * 0.45, 0, Math.PI, TAU); ctx.lineTo(x + w, yy + h / 7); ctx.ellipse(x, yy + h / 7, w * 1.08, w * 0.48, 0, 0, Math.PI); ctx.fill();
  }
  glowAt(ctx, x, by - h * 0.6, 22, m.roof, 0.55);
  ctx.fillStyle = radial(ctx, x - 1, by - h * 0.6, 5, [[0, 0xffffff], [0.5, m.roof], [1, 0xb04a8a]]); ctx.beginPath(); ctx.arc(x, by - h * 0.6, 4, 0, TAU); ctx.fill();
  ctx.fillStyle = css(0x2a0a1a); ctx.beginPath(); ctx.ellipse(x, by - h * 0.6, 1, 2.4, 0, 0, TAU); ctx.fill();
  for (let k = 0; k < 5; k++) { ctx.fillStyle = css(m.roof, 0.6); ctx.beginPath(); ctx.arc(x - 18 + r() * 36, by - r() * h, 1, 0, TAU); ctx.fill(); }
  A.glow.push(pt(x, by - h * 0.6));
  A.flags.push(pt(x, by - 6 - h));
};

BUILDING_PAINTERS.tidalguardian = (ctx, def, st) => {
  const m = def.model;
  const [x0, y0] = st.inset(1.8);
  const g = boxGeo(x0, y0, 1.8, 1.8, 8);
  const w = seaStone(st.seed, m.wall);
  faceLeft(ctx, g, w); faceRight(ctx, g, w); stoneTop(ctx, g, m.wall);
  // a colossal naga statue rising from a frozen wave, trident raised
  const b = g.c, h = st.H * 1.25;
  ctx.fillStyle = grad(ctx, b.x - 30, 0, b.x + 30, 0, [[0, 0xc8f0ff, 0.9], [0.5, 0x4ab0e0, 0.85], [1, SEA, 0.8]]);
  ctx.beginPath(); ctx.moveTo(b.x - 30, b.y + 2); ctx.quadraticCurveTo(b.x - 26, b.y - h * 0.5, b.x - 6, b.y - h * 0.45); ctx.quadraticCurveTo(b.x - 14, b.y - h * 0.3, b.x - 10, b.y - h * 0.15); ctx.quadraticCurveTo(b.x + 10, b.y - h * 0.2, b.x + 30, b.y + 2); ctx.fill();
  ctx.strokeStyle = css(0xffffff, 0.7); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(b.x - 28, b.y - h * 0.3); ctx.quadraticCurveTo(b.x - 22, b.y - h * 0.5, b.x - 6, b.y - h * 0.45); ctx.stroke();
  ctx.strokeStyle = css(lit(m.wall, 1)); ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(b.x + 6, b.y - h * 0.1); ctx.quadraticCurveTo(b.x + 16, b.y - h * 0.4, b.x + 6, b.y - h * 0.65); ctx.stroke();
  fillPoly(ctx, [[b.x, b.y - h * 0.6], [b.x + 12, b.y - h * 0.6], [b.x + 10, b.y - h * 0.9], [b.x + 2, b.y - h * 0.9]], css(lit(m.wall, 1.05)));
  blob(ctx, b.x + 6, b.y - h * 0.97, 5, 5.2, m.wall, 1.05);
  ctx.strokeStyle = css(0xe0c040); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(b.x + 14, b.y - h * 0.65); ctx.lineTo(b.x + 18, b.y - h * 1.35); ctx.stroke();
  for (const d of [-3, 0, 3]) { ctx.beginPath(); ctx.moveTo(b.x + 18 + d, b.y - h * 1.33); ctx.lineTo(b.x + 18 + d, b.y - h * 1.45); ctx.stroke(); }
  glowAt(ctx, b.x + 18, b.y - h * 1.4, 14, m.roof, 0.5);
  A.glow.push(pt(b.x + 18, b.y - h * 1.4));
  A.flags.push(pt(g.tB.x, g.tB.y - 6));
};

void mix;
