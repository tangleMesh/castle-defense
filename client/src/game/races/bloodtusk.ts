import { BUILDING_PAINTERS, PLINTHS, UNIT_PAINTERS, type UnitPose } from '../painters';
import { css, fillPoly, grad, lit, mix, radial, rng, shade, softEllipse, type Ctx } from '../paint';
import { blob, fillTri, glow, humanoid, limb, quadruped, staff, bolt } from '../units';
import {
  A, HX, HY, boxGeo, centreOf, cornerFor, drum, faceLeft, faceRight, glowAt, lerp, plankWall, pt, roundHut, stoneWall, stoneTop,
  type Box, type FacePainter,
} from '../structures';

/**
 * Bloodtusk Horde (orcs): green orcs with tusks and topknots, blue trolls with mohawks and long
 * noses, shaggy kodo beasts with riders, wyvern riders and a spiked catapult. Buildings are
 * hide-and-log longhouses with spikes and skull banners, stilt huts, palisade pens, a rock roost,
 * shaman tents, a carved totem pole, a serpent-shaped rock, a spear tower and a frost-rune stasis totem,
 * on packed red earth.
 */

const ORC = 0x6a8a3a;
const TROLL = 0x5a8aa0;
const TAU = Math.PI * 2;
type SFn = (v: number) => number;

/** Tusks, brows and a topknot on an orc / troll head. */
function tuskFace(c: Ctx, head: { x: number; y: number }, S: SFn, skin: number, hair: number, troll = false) {
  const hx = head.x + S(0.6), hy = head.y;
  if (troll) {
    // long nose and a tall red mohawk
    c.fillStyle = css(lit(skin, 1)); c.beginPath(); c.moveTo(hx + S(2.6), hy - S(0.6)); c.lineTo(hx + S(6), hy + S(1.2)); c.lineTo(hx + S(2.6), hy + S(1.4)); c.fill();
    for (let k = 0; k < 4; k++) fillTri(c, hx - S(2.4) + k * S(1.5), hy - S(3), hx - S(1.8) + k * S(1.5), hy - S(7 - Math.abs(k - 1.5)), hx - S(1) + k * S(1.5), hy - S(3), hair);
  } else {
    // heavy brow and a topknot
    c.fillStyle = css(shade(skin, 0.7)); c.fillRect(hx - S(0.5), hy - S(1.6), S(3.6), S(0.9));
    c.fillStyle = css(hair); c.beginPath(); c.ellipse(hx - S(1.5), hy - S(3.8), S(1.4), S(1.8), -0.4, 0, TAU); c.fill();
    c.strokeStyle = css(hair); c.lineWidth = S(1); c.beginPath(); c.moveTo(hx - S(2), hy - S(4.5)); c.quadraticCurveTo(hx - S(5), hy - S(5), hx - S(5.5), hy - S(1)); c.stroke();
  }
  // tusks
  for (const dx of [1.4, 2.8]) fillTri(c, hx + S(dx) - S(0.5), hy + S(1.6), hx + S(dx) + S(0.2), hy + S(-0.6), hx + S(dx) + S(0.6), hy + S(1.6), 0xf0e8d0);
}

/** A broad orc axe (single or double bitted). */
const axe = (S: SFn, attack: boolean, double: boolean, size = 1) => (c: Ctx, hand: { x: number; y: number }) => {
  const ang = attack ? -0.25 : -1.3;
  const len = S(12 * size);
  const tx = hand.x + Math.cos(ang) * len, ty = hand.y + Math.sin(ang) * len;
  c.strokeStyle = css(lit(0x5a3a22, 1)); c.lineWidth = S(1.4);
  c.beginPath(); c.moveTo(hand.x - Math.cos(ang) * S(2), hand.y - Math.sin(ang) * S(2)); c.lineTo(tx, ty); c.stroke();
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  for (const side of double ? [1, -1] : [1]) {
    const bx = tx - Math.cos(ang) * S(2.5 * size), by = ty - Math.sin(ang) * S(2.5 * size);
    c.fillStyle = grad(c, bx, by, bx + nx * S(5 * size) * side, by + ny * S(5 * size) * side, [[0, 0xa8aeb8], [1, 0xe0e4ec]]);
    c.beginPath(); c.moveTo(bx - Math.cos(ang) * S(2.5 * size), by - Math.sin(ang) * S(2.5 * size));
    c.quadraticCurveTo(bx + nx * S(6 * size) * side, by + ny * S(6 * size) * side, bx + Math.cos(ang) * S(3 * size), by + Math.sin(ang) * S(3 * size));
    c.lineTo(bx, by); c.closePath(); c.fill();
  }
};

// ------------------------------------------------------------------ units

UNIT_PAINTERS.orc = (c, u, cx, fy, S, pose) => {
  const m = u.model, v = m.variant ?? 'grunt';
  const caster = v === 'shaman' || v === 'spirit';
  if (v === 'spirit') glow(c, cx, fy - S(14), S(16), m.accent, 0.3);
  const r = humanoid(c, cx, fy, S, {
    h: v === 'axemaster' ? 27 : 26, body: m.body, accent: m.accent, helmet: v === 'veteran' || v === 'axemaster' ? 'helm' : 'none',
    armor: caster ? 'robe' : v === 'grunt' ? 'leather' : 'mail', skin: ORC, attackArm: caster ? 'raise' : 'thrust',
    back: (cc) => {
      if (caster) {
        // wolf pelt cloak
        cc.fillStyle = grad(cc, cx - S(9), 0, cx, 0, [[0, 0x8a8a8a], [1, 0x5a5a5a]]);
        cc.beginPath(); cc.moveTo(cx - S(2), fy - S(22)); cc.quadraticCurveTo(cx - S(9), fy - S(14), cx - S(8), fy - S(4)); cc.lineTo(cx - S(2), fy - S(8)); cc.fill();
      } else {
        // spiked shoulder plate
        fillTri(cc, cx - S(7), fy - S(21), cx - S(9), fy - S(26), cx - S(4), fy - S(22), 0xc8c0b0);
      }
    },
    front: caster ? staff(S, m.accent, pose.attack) : axe(S, pose.attack, v !== 'grunt', v === 'axemaster' ? 1.4 : 1),
  }, pose);
  tuskFace(c, r.head, S, ORC, 0x1a1410);
  if (caster) {
    // a skull and feathers on the staff side
    for (let k = 0; k < 3; k++) { c.fillStyle = css(k % 2 ? m.accent : 0xe0d0b0); c.beginPath(); c.ellipse(r.head.x - S(3) + k * S(1.6), r.head.y - S(4.5), S(0.7), S(2.2), -0.3 + k * 0.3, 0, TAU); c.fill(); }
    if (v === 'spirit' && pose.attack) bolt(c, cx + S(8), fy - S(36), cx + S(20), fy - S(18), S, 3);
  }
  if (v === 'axemaster') glow(c, cx + S(10), fy - S(26), S(6), m.accent, pose.attack ? 0.6 : 0.2);
};

UNIT_PAINTERS.troll = (c, u, cx, fy, S, pose) => {
  const m = u.model, v = m.variant ?? 'berserker';
  const r = humanoid(c, cx, fy, S, {
    h: 29, body: v === 'forest' ? 0x3a4a2a : 0x6a4a2a, accent: m.accent, helmet: 'none', armor: 'leaf', skin: m.body, attackArm: 'draw',
    front: (cc, hand) => {
      // a throwing axe, or a net in the trapper's off hand
      if (pose.attack) { axe(S, true, false, 0.8)(cc, { x: hand.x + S(3), y: hand.y - S(2) }); }
      else axe(S, false, false, 0.8)(cc, hand);
    },
    back: (cc, hand) => {
      if (v === 'berserker') return;
      cc.strokeStyle = css(0xd8c890, 0.85); cc.lineWidth = S(0.5);
      for (let k = 0; k < 4; k++) { cc.beginPath(); cc.moveTo(hand.x - S(4) + k * S(2), hand.y - S(2)); cc.lineTo(hand.x - S(3) + k * S(2), hand.y + S(5)); cc.stroke(); cc.beginPath(); cc.moveTo(hand.x - S(4), hand.y + k * S(1.6) - S(1)); cc.lineTo(hand.x + S(3), hand.y + k * S(1.6) - S(1)); cc.stroke(); }
    },
  }, pose);
  tuskFace(c, r.head, S, m.body, v === 'forest' ? 0x8ab040 : 0xd04a2a, true);
  if (v === 'forest') { c.fillStyle = css(0x5a8a3a); for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(cx - S(4) + k * S(2.5), r.shoulder.y, S(2), S(1.2), 0.4, 0, TAU); c.fill(); } }
  if (pose.attack) {
    // the thrown axe spinning ahead
    const ax = cx + S(18), ay = fy - S(22);
    c.save(); c.translate(ax, ay); c.rotate(pose.ph * TAU + 0.8);
    c.strokeStyle = css(0x5a3a22); c.lineWidth = S(1); c.beginPath(); c.moveTo(-S(3), 0); c.lineTo(S(3), 0); c.stroke();
    fillTri(c, S(2), -S(2.5), S(4), 0, S(2), S(2.5), 0xd0d4dc);
    c.restore();
  }
};

UNIT_PAINTERS.kodo = (c, u, cx, fy, S, pose) => {
  const m = u.model, v = m.variant;
  const { saddle } = quadruped(c, cx, fy, S, pose, { len: 30, h: 15, body: m.body, belly: shade(m.body, 0.7), neck: false, tail: true, eye: 0x2a1a10 });
  // shaggy hump and a big horned head
  for (let k = 0; k < 7; k++) { c.fillStyle = css(lit(shade(m.body, 0.75), 0.8 + (k % 3) * 0.1)); c.beginPath(); c.ellipse(cx - S(10) + k * S(3.2), fy - S(15) - Math.sin(k / 2) * S(3), S(3), S(4), 0.3, 0, TAU); c.fill(); }
  const hx = cx + S(18), hy = fy - S(13);
  blob(c, hx, hy, S(6), S(5), shade(m.body, 0.9), 1.05);
  c.strokeStyle = css(m.accent === 0xe0d0b0 ? 0xe0d0b0 : 0xe8dcc0); c.lineWidth = S(1.6);
  c.beginPath(); c.moveTo(hx - S(1), hy - S(4)); c.quadraticCurveTo(hx + S(3), hy - S(10), hx + S(7), hy - S(8)); c.stroke();
  c.fillStyle = css(0x2a1a10); c.beginPath(); c.arc(hx + S(3), hy - S(1), S(0.8), 0, TAU); c.fill();
  // a wide mouth (it swallows things whole)
  c.strokeStyle = css(0x2a1a10); c.lineWidth = S(0.6); c.beginPath(); c.moveTo(hx + S(1), hy + S(2.5)); c.lineTo(hx + S(6), hy + S(2)); c.stroke();
  if (!v) return;
  // rider gear on the saddle
  const sx = saddle.x, sy = saddle.y - S(4);
  if (v === 'drum') {
    drumOnBack(c, sx - S(3), sy - S(3), S, m.accent, pose);
  } else if (v === 'shield') {
    c.fillStyle = grad(c, sx - S(6), 0, sx + S(6), 0, [[0, 0xc8c8c8], [1, 0x6a6a6a]]);
    c.beginPath(); c.ellipse(sx - S(2), sy - S(4), S(5), S(6), 0, 0, TAU); c.fill();
    c.fillStyle = css(0xb03a2a); c.beginPath(); c.arc(sx - S(2), sy - S(4), S(1.8), 0, TAU); c.fill();
  } else {
    // spellbreaker: a blue-runed banner pole
    c.strokeStyle = css(0x3a2a1a); c.lineWidth = S(1); c.beginPath(); c.moveTo(sx - S(4), sy + S(2)); c.lineTo(sx - S(4), sy - S(14)); c.stroke();
    fillPoly(c, [[sx - S(4), sy - S(14)], [sx + S(3), sy - S(12)], [sx - S(4), sy - S(9)]], css(m.accent));
    glow(c, sx - S(1), sy - S(12), S(4), m.accent, 0.5);
  }
  // the orc rider
  humanoid(c, sx + S(2), sy + S(6), (v2) => S(v2) * 0.8, { h: 24, body: 0x6a4a2a, accent: m.accent, helmet: 'none', armor: 'leather', skin: ORC, riding: true, attackArm: 'thrust',
    front: (cc, hand) => { cc.strokeStyle = css(0x5a3a22); cc.lineWidth = S(1); cc.beginPath(); cc.moveTo(hand.x - S(4), hand.y + S(2)); cc.lineTo(hand.x + S(pose.attack ? 12 : 8), hand.y - S(pose.attack ? 2 : 6)); cc.stroke(); } }, { ...pose, moving: false });
};

function drumOnBack(c: Ctx, x: number, y: number, S: SFn, color: number, pose: UnitPose) {
  c.fillStyle = grad(c, x - S(6), 0, x + S(6), 0, [[0, lit(color, 1.2)], [1, lit(color, 0.6)]]);
  c.beginPath(); c.ellipse(x, y + S(3), S(6), S(2.5), 0, 0, Math.PI); c.lineTo(x - S(6), y - S(2)); c.ellipse(x, y - S(2), S(6), S(2.5), 0, Math.PI, 0, true); c.closePath(); c.fill();
  c.fillStyle = css(0xe8dcc0); c.beginPath(); c.ellipse(x, y - S(2), S(6), S(2.5), 0, 0, TAU); c.fill();
  const hit = pose.attack || pose.ph < 0.5;
  c.strokeStyle = css(0x3a2a1a); c.lineWidth = S(0.9); c.beginPath(); c.moveTo(x + S(4), y - S(hit ? 3 : 7)); c.lineTo(x + S(8), y - S(hit ? 7 : 11)); c.stroke();
}

UNIT_PAINTERS.wyvern = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  const y = fy - S(32) + Math.sin(pose.ph * TAU) * S(1);
  const flap = pose.attack ? 0.2 : Math.sin(pose.ph * TAU);
  // leathery bat wing (back), body with a spiked tail, the rider, front wing
  const wing = (dir: number, l: number) => {
    const tipY = y - S(14) * flap * dir - S(4);
    c.fillStyle = grad(c, cx, y, cx + S(20), tipY, [[0, lit(m.body, 1.05 * l)], [1, lit(m.accent, 0.8 * l)]]);
    c.beginPath(); c.moveTo(cx - S(3), y - S(2)); c.lineTo(cx + S(6), tipY - S(4)); c.lineTo(cx + S(20), tipY); c.lineTo(cx + S(14), y + S(1)); c.lineTo(cx + S(8), y - S(1)); c.lineTo(cx + S(3), y + S(3)); c.closePath(); c.fill();
    c.strokeStyle = css(lit(m.body, 0.5 * l)); c.lineWidth = S(0.6); c.beginPath(); c.moveTo(cx + S(6), tipY - S(4)); c.lineTo(cx + S(8), y - S(1)); c.moveTo(cx + S(20), tipY); c.lineTo(cx + S(14), y + S(1)); c.stroke();
  };
  wing(-1, 0.7);
  c.strokeStyle = css(lit(m.body, 0.9)); c.lineWidth = S(2.2); c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx - S(4), y + S(1)); c.quadraticCurveTo(cx - S(14), y + S(4), cx - S(18), y - S(2)); c.stroke();
  fillTri(c, cx - S(18), y - S(2), cx - S(22), y - S(5), cx - S(19), y + S(1), 0xd8c8a0);
  blob(c, cx, y + S(1), S(7), S(3.6), m.body);
  blob(c, cx + S(9), y - S(2), S(3.4), S(2.6), m.body, 1.1);
  c.fillStyle = css(0xffd040); c.beginPath(); c.arc(cx + S(10.5), y - S(2.8), S(0.6), 0, TAU); c.fill();
  // rider with a spear
  const ry = y - S(3);
  c.fillStyle = css(ORC); c.beginPath(); c.arc(cx - S(1), ry - S(6), S(2.2), 0, TAU); c.fill();
  c.fillStyle = css(0x6a4a2a); c.fillRect(cx - S(3), ry - S(4), S(4), S(4.5));
  c.strokeStyle = css(0x5a3a22); c.lineWidth = S(0.9); c.beginPath(); c.moveTo(cx - S(4), ry - S(1)); c.lineTo(cx + S(pose.attack ? 14 : 8), ry - S(pose.attack ? 2 : 9)); c.stroke();
  wing(1, 1.05);
};

UNIT_PAINTERS.orccatapult = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  const roll = pose.ph * TAU;
  const by = fy - S(5);
  softEllipse(c, cx, fy, S(15), S(3), 0x000000, 0.3);
  // crude log frame with spikes
  c.fillStyle = grad(c, 0, by - S(7), 0, by, [[0, lit(m.body, 1.25)], [1, lit(m.body, 0.6)]]);
  c.fillRect(cx - S(15), by - S(7), S(30), S(5));
  for (let k = 0; k < 4; k++) fillTri(c, cx + S(14) + (k % 2) * S(1), by - S(7) + k * S(1.4), cx + S(19), by - S(6) + k * S(1.4), cx + S(14), by - S(5.5) + k * S(1.4), 0xd8d0c0);
  for (const dx of [-10, 9]) {
    blob(c, cx + S(dx), by, S(4.6), S(4.6), 0x3a2414);
    c.strokeStyle = css(0x8a8a8a); c.lineWidth = S(1); c.beginPath(); c.arc(cx + S(dx), by, S(4.6), 0, TAU); c.stroke();
    c.strokeStyle = css(0x1a1008); c.lineWidth = S(0.7); for (let k = 0; k < 3; k++) { const a = roll + k * 2.1; c.beginPath(); c.moveTo(cx + S(dx), by); c.lineTo(cx + S(dx) + Math.cos(a) * S(4), by + Math.sin(a) * S(4)); c.stroke(); }
  }
  // a skull on the frame
  blob(c, cx - S(6), by - S(9), S(2.2), S(2), 0xe8dcc0);
  // the arm with a burning boulder
  const armA = pose.attack ? -0.7 : -2.5;
  const px = cx + S(1), py = by - S(9);
  c.strokeStyle = css(lit(m.body, 1)); c.lineWidth = S(2.2);
  c.beginPath(); c.moveTo(px, by - S(5)); c.lineTo(px, py); c.stroke();
  const ax = px + Math.cos(armA) * S(16), ay = py + Math.sin(armA) * S(16);
  c.beginPath(); c.moveTo(px - Math.cos(armA) * S(4), py - Math.sin(armA) * S(4)); c.lineTo(ax, ay); c.stroke();
  glow(c, ax, ay - S(2), S(6), 0xff7020, 0.8);
  blob(c, ax, ay - S(2), S(3), S(3), 0x6a5a4a);
  for (let k = 0; k < 3; k++) fillTri(c, ax - S(2) + k * S(2), ay - S(4), ax - S(1) + k * S(2), ay - S(9 - k), ax + k * S(2), ay - S(4), 0xffa030, 0.85);
};

// ------------------------------------------------------------------ buildings

/** Packed red earth with bone stakes (Bloodtusk ground). */
PLINTHS.bloodtusk = (ctx, ox, oy, s, seed) => {
  const r = rng(seed + 13);
  const c = centreOf(ox, oy, s);
  softEllipse(ctx, c.x, c.y, s * HX * 0.95, s * HY * 0.95, 0x6a3a22, 0.85);
  softEllipse(ctx, c.x - 5, c.y - 2, s * HX * 0.7, s * HY * 0.7, 0x8a4a2a, 0.5);
  for (let i = 0; i < 60; i++) { ctx.fillStyle = css(r() < 0.5 ? 0x4a2a18 : 0x9a5a3a, 0.5); ctx.fillRect(c.x + (r() - 0.5) * s * HX * 1.6, c.y + (r() - 0.5) * s * HY * 1.4, 2, 1); }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.6, x = c.x + Math.cos(a) * s * HX * 0.85, y = c.y + Math.sin(a) * s * HY * 0.85;
    ctx.strokeStyle = css(0xe0d4b8); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 1, y - 9); ctx.stroke();
  }
};

/** Hide stretched over log frames, lashed with rope. */
function hideWall(hide: number, seed: number): FacePainter {
  const logs = plankWall(0x5a3a22, seed);
  return (c, U, V, l) => {
    logs(c, U, V, l);
    c.fillStyle = css(lit(hide, l), 0.92);
    for (let u = 0.08; u < U - 0.1; u += 0.42) { c.beginPath(); c.moveTo(u, 3); c.quadraticCurveTo(u + 0.17, 0.5, u + 0.34, 3); c.lineTo(u + 0.34, V - 3); c.quadraticCurveTo(u + 0.17, V - 5, u, V - 3); c.fill(); }
    c.strokeStyle = css(0x2a1a10, 0.5); c.lineWidth = 0.01;
    for (let u = 0.08; u < U - 0.1; u += 0.42) for (let v = 5; v < V - 3; v += 4) { c.beginPath(); c.moveTo(u, v); c.lineTo(u + 0.03, v + 1); c.stroke(); }
  };
}

/** Steep hide roof with crossed log ends and spikes along the ridge. */
function spikedRoof(ctx: Ctx, g: Box, rise: number, color: number) {
  const m1 = lerp(g.tL, g.tB, 0.5), m2 = lerp(g.tF, g.tR, 0.5);
  const r1 = pt(m1.x, m1.y - rise), r2 = pt(m2.x, m2.y - rise);
  fillPoly(ctx, [[g.tL.x - 4, g.tL.y + 2], [r1.x, r1.y], [r2.x, r2.y], [g.tF.x + 4, g.tF.y + 2]], css(lit(color, 1.05)));
  fillPoly(ctx, [[g.tF.x + 4, g.tF.y + 2], [r2.x, r2.y], [g.tR.x + 2, g.tR.y + 1]], css(lit(color, 0.6)));
  ctx.strokeStyle = css(0x000000, 0.2); ctx.lineWidth = 0.8;
  for (let k = 1; k < 5; k++) { const a = lerp(pt(g.tL.x - 4, g.tL.y + 2), pt(g.tF.x + 4, g.tF.y + 2), k / 5), b = lerp(r1, r2, k / 5); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  // crossed log ends
  for (const p of [r1, r2]) { ctx.strokeStyle = css(0x4a2a18); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(p.x - 5, p.y - 6); ctx.lineTo(p.x + 5, p.y + 3); ctx.moveTo(p.x + 5, p.y - 6); ctx.lineTo(p.x - 5, p.y + 3); ctx.stroke(); }
  for (let k = 1; k < 5; k++) { const p = lerp(r1, r2, k / 5); fillTri(ctx, p.x - 2, p.y, p.x, p.y - 7, p.x + 2, p.y, 0xe0d4b8); }
  return { r1, r2 };
}

function skullBanner(ctx: Ctx, x: number, y: number, h: number, color: number) {
  ctx.strokeStyle = css(0x3a2414); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.stroke();
  fillPoly(ctx, [[x, y - h + 2], [x + 10, y - h + 3], [x + 8, y - h + 9], [x + 10, y - h + 14], [x, y - h + 13]], css(color));
  ctx.fillStyle = css(0xe8dcc0); ctx.beginPath(); ctx.arc(x + 4.5, y - h + 7.5, 2, 0, TAU); ctx.fill();
  A.flags.push(pt(x, y - h));
}

BUILDING_PAINTERS.warhall = (ctx, def, st) => {
  const m = def.model;
  const [x, y] = st.inset(1.85);
  const g = boxGeo(x, y, 1.85, 1.4, st.H * 0.42);
  const wall = hideWall(m.wall, st.seed);
  faceLeft(ctx, g, (c, U, V, l) => { wall(c, U, V, l); c.fillStyle = css(0x1a0e08); c.beginPath(); c.moveTo(U * 0.38, 0); c.lineTo(U * 0.38, V * 0.6); c.lineTo(U * 0.5, V * 0.75); c.lineTo(U * 0.62, V * 0.6); c.lineTo(U * 0.62, 0); c.fill(); });
  faceRight(ctx, g, wall);
  spikedRoof(ctx, g, st.H * 0.7, m.roof);
  // weapon rack of axes
  for (let k = 0; k < 3; k++) { const p = pt(g.F.x - 6 - k * 5, g.F.y - 2); ctx.strokeStyle = css(0x4a2a18); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 2, p.y - 12); ctx.stroke(); fillTri(ctx, p.x + 1, p.y - 12, p.x + 6, p.y - 11, p.x + 2, p.y - 8, 0xc8ccd4); }
  skullBanner(ctx, g.tB.x - 4, g.tB.y + 6, st.H * 0.9, m.roof);
};

BUILDING_PAINTERS.trollhut = (ctx, def, st) => {
  const m = def.model;
  const [x, y] = st.stand(1.4);
  // the hut stands on stilts
  const by = y - 16;
  ctx.strokeStyle = css(lit(m.wall, 0.9)); ctx.lineWidth = 2.6;
  for (const dx of [-22, -8, 8, 22]) { ctx.beginPath(); ctx.moveTo(x + dx, y - 2); ctx.lineTo(x + dx * 0.9, by); ctx.stroke(); }
  ctx.fillStyle = css(lit(m.wall, 1)); ctx.beginPath(); ctx.ellipse(x, by, 30, 10, 0, 0, TAU); ctx.fill();
  roundHut(ctx, x, by - 2, 26, st.H * 0.45, 0x8a6a3a, m.roof, st.seed);
  // ladder, skulls on poles, voodoo mask
  ctx.strokeStyle = css(0x5a3a22); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x + 10, y); ctx.lineTo(x + 14, by + 2); ctx.moveTo(x + 15, y); ctx.lineTo(x + 19, by + 2); for (let k = 1; k < 4; k++) { ctx.moveTo(x + 10 + k, y - k * 4); ctx.lineTo(x + 15 + k, y - k * 4); } ctx.stroke();
  for (const dx of [-30, 30]) { ctx.strokeStyle = css(0x3a2414); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x + dx, y); ctx.lineTo(x + dx, y - 22); ctx.stroke(); blob(ctx, x + dx, y - 24, 3, 2.8, 0xe8dcc0); }
  ctx.fillStyle = css(0x2a8a9a); ctx.beginPath(); ctx.ellipse(x, by - st.H * 0.3, 5, 6, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = css(0xffffff); ctx.fillRect(x - 3, by - st.H * 0.3 - 1.5, 2, 1.2); ctx.fillRect(x + 1, by - st.H * 0.3 - 1.5, 2, 1.2);
  A.flags.push(pt(x, by - st.H * 0.45 * 2.3));
  A.smoke.push(pt(x + 6, by - st.H * 0.9));
};

BUILDING_PAINTERS.kodopen = (ctx, def, st) => {
  const m = def.model;
  const r = rng(st.seed);
  const [x, y] = st.stand(1.7);
  // palisade ring of sharpened logs (back half), a feeding trough, a hide lean-to, front half
  const ring = (front: boolean) => {
    for (let k = 0; k < 22; k++) {
      const a = (k / 22) * TAU; if ((Math.sin(a) > 0) !== front) continue;
      const px = x + Math.cos(a) * 36, py = y - 6 + Math.sin(a) * 15, h = 14 + r() * 5;
      ctx.fillStyle = grad(ctx, px - 2.5, 0, px + 2.5, 0, [[0, lit(m.wall, 1.2)], [1, lit(m.wall, 0.6)]]);
      ctx.beginPath(); ctx.moveTo(px - 2.5, py); ctx.lineTo(px - 2.5, py - h); ctx.lineTo(px, py - h - 4); ctx.lineTo(px + 2.5, py - h); ctx.lineTo(px + 2.5, py); ctx.fill();
    }
  };
  ring(false);
  const [lx, ly] = [x - 8, y - 12];
  fillPoly(ctx, [[lx - 18, ly + 4], [lx - 10, ly - st.H * 0.9], [lx + 20, ly - st.H * 0.8], [lx + 22, ly + 6]], css(lit(m.roof, 1)));
  fillPoly(ctx, [[lx + 20, ly - st.H * 0.8], [lx + 22, ly + 6], [lx + 28, ly + 2]], css(lit(m.roof, 0.6)));
  // giant kodo skull over the gate
  blob(ctx, x + 8, y - 26, 8, 6, 0xe8dcc0);
  ctx.fillStyle = css(0x2a1a10); ctx.beginPath(); ctx.arc(x + 5, y - 27, 1.6, 0, TAU); ctx.arc(x + 11, y - 27, 1.6, 0, TAU); ctx.fill();
  ctx.strokeStyle = css(0xe8dcc0); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 2, y - 30); ctx.quadraticCurveTo(x - 4, y - 38, x - 8, y - 34); ctx.moveTo(x + 14, y - 30); ctx.quadraticCurveTo(x + 20, y - 38, x + 24, y - 34); ctx.stroke();
  ctx.fillStyle = css(0x6a4a2a); ctx.fillRect(x + 14, y - 6, 14, 4);
  ring(true);
  A.flags.push(pt(lx - 10, ly - st.H * 0.9));
};

BUILDING_PAINTERS.roost = (ctx, def, st) => {
  const m = def.model;
  const r = rng(st.seed);
  const [x, y] = st.stand(1.5);
  const h = st.H * 1.2;
  // a jagged rock spire with a nest of bones and branches on top
  fillPoly(ctx, [[x - 22, y - 2], [x - 14, y - h * 0.6], [x - 6, y - h], [x + 2, y - h * 0.95], [x, y]], css(lit(m.wall, 1.1)));
  fillPoly(ctx, [[x, y], [x + 2, y - h * 0.95], [x + 10, y - h * 0.7], [x + 22, y - 2]], css(lit(m.wall, 0.65)));
  ctx.strokeStyle = css(0x000000, 0.25); ctx.lineWidth = 0.8;
  for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(x - 18 + r() * 36, y - r() * h * 0.8); ctx.lineTo(x - 18 + r() * 36, y - r() * h * 0.8); ctx.stroke(); }
  for (let i = 0; i < 40; i++) { const a = r() * TAU, d = 8 + r() * 6; ctx.strokeStyle = css(r() < 0.3 ? 0xe0d4b8 : 0x6a4a2a); ctx.lineWidth = 1; ctx.beginPath(); const px = x - 2 + Math.cos(a) * d, py = y - h + 2 + Math.sin(a) * d * 0.35; ctx.moveTo(px, py); ctx.lineTo(px + (r() - 0.5) * 10, py + (r() - 0.5) * 3); ctx.stroke(); }
  // a red war banner and a wyvern skull on the rock
  skullBanner(ctx, x + 14, y - h * 0.5, 20, m.roof);
};

BUILDING_PAINTERS.shamantent = (ctx, def, st) => {
  const m = def.model;
  const [x, y] = st.stand(1.4);
  const by = y - 6, h = st.H * 1.3;
  // tall hide tepee on crossed poles
  ctx.fillStyle = grad(ctx, x - 28, 0, x + 28, 0, [[0, lit(m.wall, 1.2)], [0.5, lit(m.wall, 0.95)], [1, lit(m.wall, 0.55)]]);
  ctx.beginPath(); ctx.moveTo(x - 28, by); ctx.lineTo(x, by - h); ctx.lineTo(x + 28, by); ctx.quadraticCurveTo(x, by + 8, x - 28, by); ctx.fill();
  ctx.strokeStyle = css(0x3a2414); ctx.lineWidth = 1.6;
  for (const d of [-6, 0, 6]) { ctx.beginPath(); ctx.moveTo(x, by - h + 6); ctx.lineTo(x + d, by - h - 8); ctx.stroke(); }
  // painted spirit symbols and the opening
  ctx.strokeStyle = css(m.roof, 0.95); ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(x - 20, by - 8); for (let k = 0; k < 8; k++) ctx.lineTo(x - 20 + k * 5, by - 8 - (k % 2) * 4); ctx.stroke();
  ctx.beginPath(); ctx.arc(x - 6, by - h * 0.55, 4, 0, TAU); ctx.stroke();
  ctx.fillStyle = css(0x1a0e08); ctx.beginPath(); ctx.moveTo(x + 4, by + 2); ctx.lineTo(x + 10, by - h * 0.4); ctx.lineTo(x + 16, by + 1); ctx.fill();
  A.smoke.push(pt(x, by - h - 2));
  // drum and fire bowl
  drum(ctx, x - 30, by + 2, 5, 6, 0x8a5a3a, 0xe8dcc0);
  glowAt(ctx, x + 30, by - 4, 12, 0xffa040, 0.6);
  A.flags.push(pt(x + 4, by - h - 8));
};

BUILDING_PAINTERS.orcworks = (ctx, def, st) => {
  const m = def.model;
  const [x, y] = st.inset(1.8);
  const g = boxGeo(x, y, 1.8, 1.5, st.H * 0.4);
  const wall = hideWall(m.roof, st.seed);
  faceLeft(ctx, g, (c, U, V, l) => { wall(c, U, V, l); c.fillStyle = css(0x1a0e08); c.fillRect(U * 0.2, 0, 0.7, Math.min(V - 3, 12)); });
  faceRight(ctx, g, wall);
  spikedRoof(ctx, g, st.H * 0.45, 0x6a3a22);
  // a giant spiked catapult frame beside the shed
  const p = pt(g.F.x - 4, g.F.y - 2);
  ctx.strokeStyle = css(lit(m.wall, 1)); ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(p.x - 12, p.y); ctx.lineTo(p.x - 4, p.y - 20); ctx.lineTo(p.x + 4, p.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(p.x - 4, p.y - 18); ctx.lineTo(p.x - 22, p.y - 34); ctx.stroke();
  blob(ctx, p.x - 23, p.y - 36, 4, 4, 0x6a5a4a);
  skullBanner(ctx, g.tB.x, g.tB.y + 4, st.H * 0.8, 0xb03a2a);
};

BUILDING_PAINTERS.totempole = (ctx, def, st) => {
  const m = def.model;
  const [x, y] = st.stand(1.2);
  const by = y - 6, h = st.H * 1.25;
  // stacked carved faces, wings at the top
  const n = 4;
  for (let k = 0; k < n; k++) {
    const yy = by - k * (h / n), hh = h / n;
    ctx.fillStyle = grad(ctx, x - 8, 0, x + 8, 0, [[0, lit(m.wall, 1.25)], [1, lit(m.wall, 0.6)]]);
    ctx.fillRect(x - 8, yy - hh, 16, hh);
    ctx.fillStyle = css(k % 2 ? m.roof : 0x2a8a9a); ctx.fillRect(x - 6, yy - hh * 0.75, 4, 2.5); ctx.fillRect(x + 2, yy - hh * 0.75, 4, 2.5);
    ctx.fillStyle = css(0x1a0e08); ctx.fillRect(x - 4, yy - hh * 0.35, 8, 2);
    fillTri(ctx, x - 1, yy - hh * 0.55, x + 3, yy - hh * 0.45, x - 1, yy - hh * 0.4, 0xe0d4b8);
  }
  for (const d of [-1, 1]) fillPoly(ctx, [[x + d * 8, by - h + 4], [x + d * 26, by - h - 6], [x + d * 22, by - h + 2], [x + d * 26, by - h + 6], [x + d * 8, by - h + 10]], css(lit(m.roof, d < 0 ? 1.1 : 0.7)));
  fillTri(ctx, x - 8, by - h, x, by - h - 12, x + 8, by - h, lit(m.wall, 1.1));
  for (let k = 0; k < 3; k++) { ctx.fillStyle = css(k % 2 ? 0xe0d4b8 : m.roof); ctx.beginPath(); ctx.ellipse(x - 12 + k * 2, by - h * 0.4 + k * 4, 1.4, 4, 0.4, 0, TAU); ctx.fill(); }
  A.flags.push(pt(x, by - h - 12));
};

BUILDING_PAINTERS.serpentrock = (ctx, def, st) => {
  const m = def.model;
  const [x, y] = st.stand(1.5);
  const by = y - 6;
  // a coiled stone serpent rearing up over a rock base
  drum(ctx, x, by, 24, 6, m.wall, shade(m.wall, 0.85));
  ctx.strokeStyle = css(lit(m.wall, 1.05)); ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.ellipse(x, by - 10, 16, 6, 0, 0.3, Math.PI * 1.9); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 14, by - 12); ctx.quadraticCurveTo(x + 18, by - st.H * 0.9, x + 4, by - st.H * 1.1); ctx.stroke();
  ctx.strokeStyle = css(lit(m.wall, 0.75)); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 17, by - 12); ctx.quadraticCurveTo(x + 21, by - st.H * 0.9, x + 7, by - st.H * 1.1); ctx.stroke();
  // head with glowing eyes, spitting green venom
  const hx = x + 2, hy = by - st.H * 1.12;
  blob(ctx, hx, hy, 8, 5.5, m.wall, 1.1);
  ctx.fillStyle = css(m.roof); ctx.beginPath(); ctx.arc(hx - 2, hy - 1.5, 1.4, 0, TAU); ctx.fill();
  glowAt(ctx, hx - 10, hy + 4, 14, m.roof, 0.6);
  for (let k = 0; k < 5; k++) { ctx.fillStyle = css(m.roof, 0.85); ctx.beginPath(); ctx.arc(hx - 8 - k * 3, hy + 3 + k * 2.5, 2 - k * 0.25, 0, TAU); ctx.fill(); }
  A.glow.push(pt(hx - 10, hy + 4));
  A.flags.push(pt(x - 22, by - 8));
};

BUILDING_PAINTERS.speartower = (ctx, def, st) => {
  const m = def.model;
  const [x, y] = st.stand(1.3);
  const by = y - 4, h = st.H * 1.1;
  // four leaning log legs, a hide-walled platform, spikes and a mounted ballista
  ctx.strokeStyle = css(lit(m.wall, 0.9)); ctx.lineWidth = 3.4;
  for (const [dx, dy] of [[-16, 2], [16, 2], [-11, -4], [11, -4]] as const) { ctx.beginPath(); ctx.moveTo(x + dx, by + dy); ctx.lineTo(x + dx * 0.55, by - h); ctx.stroke(); }
  ctx.lineWidth = 1.4; for (let k = 1; k < 3; k++) { const yy = by - (h * k) / 3; ctx.beginPath(); ctx.moveTo(x - 15 + k * 2, yy); ctx.lineTo(x + 15 - k * 2, yy - 6); ctx.stroke(); }
  const pg = boxGeo(x + 14, by - h + 6, 1.1, 1.1, 10);
  const wall = hideWall(m.roof, st.seed);
  faceLeft(ctx, pg, wall); faceRight(ctx, pg, wall);
  for (let k = 0; k < 6; k++) { const p = lerp(pg.tL, pg.tF, k / 5); fillTri(ctx, p.x - 1.5, p.y, p.x, p.y - 7, p.x + 1.5, p.y, 0xe0d4b8); }
  // ballista
  const b = pg.c;
  ctx.strokeStyle = css(0x3a2414); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(b.x - 8, b.y - 4); ctx.lineTo(b.x + 12, b.y - 10); ctx.stroke();
  ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(b.x + 4, b.y - 7, 7, -2.2, 0.6); ctx.stroke();
  fillTri(ctx, b.x + 12, b.y - 12, b.x + 17, b.y - 11, b.x + 12, b.y - 8, 0xc8ccd4);
  A.flags.push(pt(pg.tB.x, pg.tB.y - 4));
};

BUILDING_PAINTERS.stasistotem = (ctx, def, st) => {
  const m = def.model;
  const [x0, y0] = st.inset(1.6);
  const g = boxGeo(x0, y0, 1.6, 1.6, 8);
  const w = stoneWall(m.wall, st.seed, 4);
  faceLeft(ctx, g, w); faceRight(ctx, g, w); stoneTop(ctx, g, m.wall);
  // a massive stone totem with a stern face and frost runes, chains to four posts
  const c0 = g.c, h = st.H * 1.25, bw = 13;
  const cc = cornerFor(c0, 0.6);
  const t = boxGeo(cc.x, cc.y, 0.6, 0.6, h);
  const tw = stoneWall(shade(m.wall, 1.1), st.seed + 1, 7);
  faceLeft(ctx, t, (c, U, V, l) => {
    tw(c, U, V, l);
    c.fillStyle = css(m.roof, 0.95);
    for (let k = 0; k < 3; k++) { c.fillRect(U * 0.15, V * (0.2 + k * 0.22), U * 0.7, 1.4); c.fillRect(U * 0.45, V * (0.2 + k * 0.22), U * 0.1, 5); }
    c.fillStyle = css(0x1a1a20); c.fillRect(U * 0.2, V * 0.88, U * 0.2, 2.4); c.fillRect(U * 0.6, V * 0.88, U * 0.2, 2.4);
  });
  faceRight(ctx, t, tw); stoneTop(ctx, t, m.wall);
  void bw;
  glowAt(ctx, t.c.x, t.c.y - 4, 26, m.roof, 0.55);
  ctx.fillStyle = radial(ctx, t.c.x, t.c.y - 6, 7, [[0, 0xffffff], [1, m.roof]]); ctx.beginPath(); ctx.arc(t.c.x, t.c.y - 6, 5, 0, TAU); ctx.fill();
  for (const p of [g.tL, g.tF, g.tR]) {
    const px = p.x * 0.85 + c0.x * 0.15, py = p.y * 0.85 + c0.y * 0.15 + 2;
    ctx.strokeStyle = css(0x3a2414); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - 14); ctx.stroke();
    ctx.strokeStyle = css(0x8a8a8a, 0.8); ctx.lineWidth = 0.8; ctx.setLineDash([2, 1.5]); ctx.beginPath(); ctx.moveTo(px, py - 12); ctx.quadraticCurveTo((px + t.c.x) / 2, py - 6, t.c.x, t.c.y + h * 0.3); ctx.stroke(); ctx.setLineDash([]);
  }
  A.glow.push(pt(t.c.x, t.c.y - 6));
  A.flags.push(pt(g.tB.x, g.tB.y - 6));
};

void mix; void limb; void radial;
