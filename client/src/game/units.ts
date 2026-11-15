import type { UnitDef } from '@bc/shared';
import { css, grad, lit, mix, radial, shade, softEllipse, type Ctx } from './paint';
import { foliage } from './structures';

/**
 * Painted unit sprites, side-on (facing right; the scene mirrors them), with walk and attack
 * frames. Everything is drawn in logical px around a foot point; S() scales by the model size.
 */

export const UNIT_CANVAS = { w: 112, h: 120, footY: 108 };
/** Frame suffixes: idle/walk 0, three more walk phases, attack. */
export const UNIT_FRAMES = ['', '_w1', '_w2', '_w3', '_a'] as const;
export type Frame = (typeof UNIT_FRAMES)[number];

const SKIN = 0xe2b892;
const STEEL = 0xb8bec8;
const WOOD = 0x6a4a2a;
const LEATHER = 0x6a4a30;

interface Pose {
  /** Walk phase in [0, 1). */
  ph: number;
  moving: boolean;
  attack: boolean;
}

function poseOf(frame: Frame): Pose {
  if (frame === '_a') return { ph: 0, moving: false, attack: true };
  const i = frame === '' ? 0 : Number(frame.slice(2));
  return { ph: i / 4, moving: frame !== '', attack: false };
}

/** Stroke a limb segment with round ends, lit on its upper side. */
function limb(c: Ctx, x0: number, y0: number, x1: number, y1: number, w: number, color: number, light = 1) {
  c.strokeStyle = css(lit(color, light * 0.8)); c.lineWidth = w;
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  c.strokeStyle = css(lit(color, light * 1.12), 0.8); c.lineWidth = w * 0.45;
  c.beginPath(); c.moveTo(x0 - w * 0.15, y0 - w * 0.15); c.lineTo(x1 - w * 0.15, y1 - w * 0.15); c.stroke();
}

function blob(c: Ctx, x: number, y: number, rx: number, ry: number, color: number, light = 1) {
  c.fillStyle = radial(c, x - rx * 0.35, y - ry * 0.4, Math.max(rx, ry) * 1.5, [[0, lit(color, 1.3 * light)], [0.5, lit(color, 0.95 * light)], [1, lit(color, 0.55 * light)]]);
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
}

type Helmet = 'helm' | 'greathelm' | 'hood' | 'cap' | 'circlet' | 'antlers' | 'leafhood' | 'none';
type Armor = 'plate' | 'mail' | 'leather' | 'robe' | 'leaf';

interface HumanOpts {
  h: number;
  body: number;
  accent: number;
  helmet: Helmet;
  armor: Armor;
  /** Draw callbacks for the weapon/shield; receive hand positions. */
  back?: (c: Ctx, hand: Pt) => void;
  front?: (c: Ctx, hand: Pt, back: Pt) => void;
  /** Pose of the weapon arm in the attack frame. */
  attackArm?: 'thrust' | 'raise' | 'draw';
  riding?: boolean;
}
type Pt = { x: number; y: number };

/** A humanoid side-on. Returns head and hands for gear. */
function humanoid(c: Ctx, cx: number, fy: number, S: (v: number) => number, o: HumanOpts, pose: Pose) {
  const h = S(o.h);
  const sw = Math.sin(pose.ph * Math.PI * 2);
  const bob = pose.moving ? -Math.abs(Math.cos(pose.ph * Math.PI * 2)) * S(1.2) : 0;
  const hipY = fy - h * 0.42 + bob, shY = fy - h * 0.78 + bob, headY = fy - h * 0.9 + bob;
  const leg = h * 0.42;
  const legCol = o.armor === 'plate' ? shade(STEEL, 0.75) : o.armor === 'robe' ? o.body : shade(o.body, 0.55);
  // legs (back leg darker)
  if (!o.riding) {
    const a = pose.moving ? sw * 0.5 : 0.08;
    const legs: Array<[number, number]> = [[-a, 0.72], [a, 1]];
    for (const [ang, l] of legs) {
      const kx = cx + Math.sin(ang) * leg * 0.5, ky = hipY + leg * 0.5;
      const fx = cx + Math.sin(ang) * leg * 0.9 + (ang > 0 ? S(0.5) : 0), fyy = fy - Math.max(0, Math.cos(ang * 2) - 0.92) * S(6);
      limb(c, cx, hipY, kx, ky, S(3.4), legCol, l);
      limb(c, kx, ky, fx, fyy - S(1), S(3), legCol, l);
      c.fillStyle = css(lit(0x2a1c12, l)); c.beginPath(); c.ellipse(fx + S(1), fyy - S(0.8), S(2.4), S(1.2), 0, 0, Math.PI * 2); c.fill();
    }
  }
  // back arm
  const armA = pose.moving ? -sw * 0.45 : 0.1;
  const backHand = { x: cx - S(1) + Math.sin(armA) * h * 0.3, y: shY + Math.cos(armA) * h * 0.3 };
  o.back?.(c, backHand);
  limb(c, cx - S(1), shY + S(1), backHand.x, backHand.y, S(2.8), o.armor === 'plate' ? STEEL : o.body, 0.7);
  // torso
  const tw = S(o.armor === 'robe' ? 6.5 : 5.6);
  if (o.armor === 'robe') {
    c.fillStyle = grad(c, cx - tw, 0, cx + tw, 0, [[0, lit(o.body, 1.2)], [0.5, lit(o.body, 0.95)], [1, lit(o.body, 0.6)]]);
    c.beginPath(); c.moveTo(cx - tw * 0.7, shY); c.lineTo(cx + tw * 0.7, shY); c.lineTo(cx + tw * 1.15, fy - S(0.5)); c.lineTo(cx - tw * 1.15, fy - S(0.5)); c.closePath(); c.fill();
    c.strokeStyle = css(o.accent, 0.9); c.lineWidth = S(1.2);
    c.beginPath(); c.moveTo(cx, shY + S(1)); c.lineTo(cx, fy - S(1)); c.stroke();
  } else {
    const col = o.armor === 'plate' ? STEEL : o.armor === 'mail' ? mix(STEEL, o.body, 0.4) : o.body;
    c.fillStyle = grad(c, cx - tw, 0, cx + tw, 0, [[0, lit(col, 1.25)], [0.5, lit(col, 0.95)], [1, lit(col, 0.6)]]);
    c.beginPath();
    c.moveTo(cx - tw, shY); c.lineTo(cx + tw, shY); c.lineTo(cx + tw * 0.8, hipY + S(2)); c.lineTo(cx - tw * 0.8, hipY + S(2)); c.closePath(); c.fill();
    // tabard / surcoat in the faction colour
    if (o.armor !== 'leaf') {
      c.fillStyle = grad(c, cx - tw, 0, cx + tw, 0, [[0, lit(o.accent, 1.15)], [1, lit(o.accent, 0.6)]]);
      c.beginPath(); c.moveTo(cx - tw * 0.55, shY + S(1.5)); c.lineTo(cx + tw * 0.55, shY + S(1.5)); c.lineTo(cx + tw * 0.6, hipY + S(5)); c.lineTo(cx, hipY + S(3.5)); c.lineTo(cx - tw * 0.6, hipY + S(5)); c.closePath(); c.fill();
    } else {
      for (let i = 0; i < 5; i++) { c.fillStyle = css(lit(o.accent, 0.8 + i * 0.08)); c.beginPath(); c.ellipse(cx - tw * 0.6 + i * tw * 0.3, hipY + S(1), S(2), S(3.5), 0.3, 0, Math.PI * 2); c.fill(); }
    }
    // belt
    c.fillStyle = css(lit(LEATHER, 0.9)); c.fillRect(cx - tw * 0.82, hipY - S(0.5), tw * 1.64, S(1.6));
    c.fillStyle = css(0xd8b050); c.fillRect(cx - S(0.8), hipY - S(0.6), S(1.6), S(1.8));
    if (o.armor === 'plate') blob(c, cx - tw * 0.7, shY + S(0.5), S(2.6), S(2), STEEL, 1);
  }
  // head
  const hr = S(3.3);
  c.fillStyle = radial(c, cx + S(0.5), headY - S(1), hr * 1.6, [[0, lit(SKIN, 1.2)], [1, lit(SKIN, 0.7)]]);
  c.beginPath(); c.arc(cx + S(0.6), headY, hr, 0, Math.PI * 2); c.fill();
  c.fillStyle = css(0x1a120a); c.beginPath(); c.arc(cx + S(2.2), headY - S(0.4), S(0.5), 0, Math.PI * 2); c.fill();
  helmet(c, cx + S(0.6), headY, hr, o.helmet, o.accent, S);
  // front arm (weapon arm)
  let fh: Pt;
  if (pose.attack && o.attackArm === 'thrust') fh = { x: cx + h * 0.42, y: shY + S(2) };
  else if (pose.attack && o.attackArm === 'raise') fh = { x: cx + h * 0.2, y: shY - h * 0.3 };
  else if (pose.attack && o.attackArm === 'draw') fh = { x: cx + h * 0.36, y: shY + S(0.5) };
  else { const a2 = pose.moving ? sw * 0.45 : -0.2; fh = { x: cx + S(1.5) + Math.sin(a2) * h * 0.28 + S(2), y: shY + Math.cos(a2) * h * 0.28 }; }
  limb(c, cx + S(1.5), shY + S(1), fh.x, fh.y, S(2.9), o.armor === 'plate' ? STEEL : o.body, 1.05);
  c.fillStyle = css(lit(o.armor === 'plate' ? STEEL : SKIN, 1)); c.beginPath(); c.arc(fh.x, fh.y, S(1.5), 0, Math.PI * 2); c.fill();
  o.front?.(c, fh, backHand);
  return { head: { x: cx, y: headY }, hip: { x: cx, y: hipY }, shoulder: { x: cx, y: shY } };
}

function helmet(c: Ctx, x: number, y: number, r: number, kind: Helmet, accent: number, S: (v: number) => number) {
  switch (kind) {
    case 'helm': case 'greathelm': {
      c.fillStyle = grad(c, x - r, 0, x + r, 0, [[0, lit(STEEL, 1.3)], [1, lit(STEEL, 0.6)]]);
      c.beginPath(); c.arc(x, y - S(0.3), r * 1.08, Math.PI * 1.02, Math.PI * 2.02); c.lineTo(x + r * 1.08, y + S(kind === 'greathelm' ? 2.8 : 0.5)); c.lineTo(x - r * 1.08, y + S(kind === 'greathelm' ? 2.8 : 0.5)); c.fill();
      if (kind === 'greathelm') { c.fillStyle = css(0x1a1a20); c.fillRect(x - S(0.2), y - S(0.5), r * 1.1, S(0.9)); }
      c.fillStyle = css(accent); c.beginPath(); c.moveTo(x - S(1), y - r * 1.1); c.quadraticCurveTo(x - S(4), y - r * 1.9, x - S(6), y - r * 0.6); c.lineTo(x - S(2), y - r * 0.9); c.fill();
      break;
    }
    case 'hood': case 'leafhood': {
      const col = kind === 'leafhood' ? accent : shade(accent, 0.9);
      c.fillStyle = grad(c, x - r, 0, x + r, 0, [[0, lit(col, 1.2)], [1, lit(col, 0.55)]]);
      c.beginPath(); c.arc(x - S(0.4), y - S(0.2), r * 1.2, Math.PI * 0.75, Math.PI * 2.05); c.lineTo(x + r * 0.4, y + r * 0.6); c.lineTo(x - r * 1.3, y + r * 1.2); c.fill();
      if (kind === 'leafhood') for (let i = 0; i < 3; i++) { c.fillStyle = css(lit(accent, 1.2)); c.beginPath(); c.ellipse(x - r * 0.8 + i * r * 0.6, y - r * 1.15, S(1.4), S(0.7), -0.5 + i * 0.4, 0, Math.PI * 2); c.fill(); }
      break;
    }
    case 'cap':
      c.fillStyle = css(lit(accent, 1)); c.beginPath(); c.arc(x, y - S(0.6), r * 1.02, Math.PI, Math.PI * 2); c.fill();
      c.fillRect(x - r * 1.1, y - S(0.9), r * 2.3, S(0.9));
      break;
    case 'circlet':
      c.fillStyle = css(0x6a4a2a); c.beginPath(); c.arc(x, y - S(0.5), r * 1.02, Math.PI * 1.05, Math.PI * 1.95); c.fill();
      c.strokeStyle = css(0xe8c060); c.lineWidth = S(0.8); c.beginPath(); c.arc(x, y, r * 1.02, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
      c.fillStyle = css(accent); c.beginPath(); c.arc(x, y - r, S(0.9), 0, Math.PI * 2); c.fill();
      break;
    case 'antlers':
      c.fillStyle = css(0x4a3020); c.beginPath(); c.arc(x, y - S(0.5), r * 1.02, Math.PI, Math.PI * 2); c.fill();
      c.strokeStyle = css(0xd8c8a0); c.lineWidth = S(0.9);
      for (const d of [-1, 1]) {
        c.beginPath(); c.moveTo(x + d * S(1.5), y - r); c.lineTo(x + d * S(3.5), y - r - S(4)); c.lineTo(x + d * S(5.5), y - r - S(5)); c.moveTo(x + d * S(2.6), y - r - S(2.2)); c.lineTo(x + d * S(4.6), y - r - S(1.8)); c.stroke();
      }
      break;
    default: break;
  }
}

// ------------------------------------------------------------------ gear

const sword = (S: (v: number) => number, attack: boolean) => (c: Ctx, hand: Pt) => {
  const ang = attack ? -0.15 : -1.05;
  const len = S(11);
  const tx = hand.x + Math.cos(ang) * len, ty = hand.y + Math.sin(ang) * len;
  c.strokeStyle = css(lit(STEEL, 1.15)); c.lineWidth = S(1.6);
  c.beginPath(); c.moveTo(hand.x, hand.y); c.lineTo(tx, ty); c.stroke();
  c.strokeStyle = css(0xffffff, 0.7); c.lineWidth = S(0.5);
  c.beginPath(); c.moveTo(hand.x + S(1), hand.y - S(0.6)); c.lineTo(tx, ty); c.stroke();
  c.strokeStyle = css(0xc8a040); c.lineWidth = S(1.4);
  c.beginPath(); c.moveTo(hand.x - Math.sin(ang) * S(2.4), hand.y + Math.cos(ang) * S(2.4)); c.lineTo(hand.x + Math.sin(ang) * S(2.4), hand.y - Math.cos(ang) * S(2.4)); c.stroke();
};

const roundShield = (S: (v: number) => number, color: number, big: boolean) => (c: Ctx, hand: Pt) => {
  const x = hand.x + S(big ? 3 : 1.5), y = hand.y - S(big ? 3 : 1);
  if (big) {
    c.fillStyle = grad(c, x - S(5), 0, x + S(5), 0, [[0, lit(color, 1.25)], [1, lit(color, 0.6)]]);
    c.beginPath(); c.moveTo(x - S(5), y - S(8)); c.lineTo(x + S(5), y - S(8)); c.lineTo(x + S(5), y + S(3)); c.quadraticCurveTo(x, y + S(10), x - S(5), y + S(3)); c.closePath(); c.fill();
    c.strokeStyle = css(0xd8b050); c.lineWidth = S(0.9); c.stroke();
    c.fillStyle = css(0xf0d070); c.beginPath(); c.arc(x, y - S(1), S(1.6), 0, Math.PI * 2); c.fill();
  } else {
    blob(c, x, y, S(4), S(4.4), color);
    c.strokeStyle = css(0xb8bec8); c.lineWidth = S(0.8); c.beginPath(); c.ellipse(x, y, S(4), S(4.4), 0, 0, Math.PI * 2); c.stroke();
    c.fillStyle = css(STEEL); c.beginPath(); c.arc(x, y, S(1.2), 0, Math.PI * 2); c.fill();
  }
};

const polearm = (S: (v: number) => number, attack: boolean) => (c: Ctx, hand: Pt) => {
  const ang = attack ? -0.08 : -1.35;
  const len = S(28);
  const bx = hand.x - Math.cos(ang) * S(8), by = hand.y - Math.sin(ang) * S(8);
  const tx = hand.x + Math.cos(ang) * len, ty = hand.y + Math.sin(ang) * len;
  c.strokeStyle = css(lit(WOOD, 1)); c.lineWidth = S(1.3);
  c.beginPath(); c.moveTo(bx, by); c.lineTo(tx, ty); c.stroke();
  // axe head + spike
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  c.fillStyle = css(lit(STEEL, 1.1));
  c.beginPath(); c.moveTo(tx - Math.cos(ang) * S(6), ty - Math.sin(ang) * S(6)); c.lineTo(tx - Math.cos(ang) * S(6) + nx * S(5), ty - Math.sin(ang) * S(6) + ny * S(5));
  c.lineTo(tx - Math.cos(ang) * S(1) + nx * S(4), ty - Math.sin(ang) * S(1) + ny * S(4)); c.lineTo(tx - Math.cos(ang) * S(2), ty - Math.sin(ang) * S(2)); c.fill();
  c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx + Math.cos(ang) * S(4), ty + Math.sin(ang) * S(4)); c.strokeStyle = css(STEEL); c.lineWidth = S(1); c.stroke();
};

const bow = (S: (v: number) => number, attack: boolean, wood: number) => (c: Ctx, hand: Pt) => {
  const r = S(9);
  c.strokeStyle = css(lit(wood, 1)); c.lineWidth = S(1.4);
  c.beginPath(); c.arc(hand.x - S(4), hand.y, r, -1.1, 1.1); c.stroke();
  const t = { x: hand.x - S(4) + Math.cos(-1.1) * r, y: hand.y + Math.sin(-1.1) * r }, b = { x: hand.x - S(4) + Math.cos(1.1) * r, y: hand.y + Math.sin(1.1) * r };
  const pull = attack ? S(-6) : 0;
  c.strokeStyle = css(0xf0e8d8, 0.9); c.lineWidth = S(0.5);
  c.beginPath(); c.moveTo(t.x, t.y); c.lineTo(hand.x - S(4) + pull + S(3), hand.y); c.lineTo(b.x, b.y); c.stroke();
  if (attack) { c.strokeStyle = css(0xe8e0d0); c.lineWidth = S(0.7); c.beginPath(); c.moveTo(hand.x - S(8), hand.y); c.lineTo(hand.x + S(6), hand.y); c.stroke(); }
};

const crossbow = (S: (v: number) => number, attack: boolean) => (c: Ctx, hand: Pt) => {
  c.strokeStyle = css(lit(WOOD, 1)); c.lineWidth = S(2);
  c.beginPath(); c.moveTo(hand.x - S(4), hand.y + S(1)); c.lineTo(hand.x + S(6), hand.y - S(0.5)); c.stroke();
  c.strokeStyle = css(lit(STEEL, 1)); c.lineWidth = S(1.2);
  c.beginPath(); c.moveTo(hand.x + S(4), hand.y - S(5)); c.quadraticCurveTo(hand.x + S(6.5), hand.y - S(0.5), hand.x + S(4), hand.y + S(4)); c.stroke();
  if (attack) { c.fillStyle = css(0xfff0c0, 0.8); c.beginPath(); c.arc(hand.x + S(8), hand.y - S(0.5), S(1.3), 0, Math.PI * 2); c.fill(); }
};

const staff = (S: (v: number) => number, accent: number, attack: boolean) => (c: Ctx, hand: Pt) => {
  c.strokeStyle = css(lit(WOOD, 1)); c.lineWidth = S(1.3);
  const top = { x: hand.x + S(1), y: hand.y - S(attack ? 16 : 13) };
  c.beginPath(); c.moveTo(hand.x - S(0.5), hand.y + S(9)); c.lineTo(top.x, top.y); c.stroke();
  c.save(); c.globalCompositeOperation = 'lighter';
  c.fillStyle = radial(c, top.x, top.y - S(1), S(attack ? 9 : 6), [[0, 0xffffff, 0.95], [0.3, accent, 0.7], [1, accent, 0]]);
  c.beginPath(); c.arc(top.x, top.y - S(1), S(attack ? 9 : 6), 0, Math.PI * 2); c.fill();
  c.restore();
};

// ------------------------------------------------------------------ bodies

function quadruped(c: Ctx, cx: number, fy: number, S: (v: number) => number, pose: Pose, o: {
  len: number; h: number; body: number; belly?: number; neck?: boolean; antlers?: boolean; mane?: number; spines?: number; tail?: boolean; eye?: number;
}) {
  const sw = pose.ph * Math.PI * 2;
  const bob = pose.moving ? Math.sin(sw * 2) * S(0.8) : 0;
  const by = fy - S(o.h) + bob;
  const L = S(o.len);
  // legs: diagonal pairs move together
  const legs: Array<[number, number, number]> = [[-L * 0.38, 0, 0.7], [L * 0.32, Math.PI, 0.7], [-L * 0.32, Math.PI, 1], [L * 0.38, 0, 1]];
  for (const [dx, off, l] of legs) {
    const a = pose.moving ? Math.sin(sw + off) * 0.45 : 0;
    const hx = cx + dx, hy = by + S(2);
    const kx = hx + Math.sin(a) * S(o.h * 0.4), ky = hy + S(o.h * 0.45);
    const fx = kx + Math.sin(a * 0.6) * S(o.h * 0.2), fyy = fy - Math.max(0, Math.sin(sw + off)) * (pose.moving ? S(2) : 0);
    limb(c, hx, hy, kx, ky, S(2.6), shade(o.body, 0.85), l);
    limb(c, kx, ky, fx, fyy, S(2), shade(o.body, 0.75), l);
    c.fillStyle = css(0x2a2018); c.fillRect(fx - S(1.2), fyy - S(1.2), S(2.6), S(1.4));
  }
  // body
  c.fillStyle = grad(c, 0, by - S(o.h * 0.35), 0, by + S(o.h * 0.4), [[0, lit(o.body, 1.25)], [0.6, lit(o.body, 0.9)], [1, lit(o.belly ?? o.body, 0.65)]]);
  c.beginPath(); c.ellipse(cx, by, L * 0.55, S(o.h * 0.36), 0, 0, Math.PI * 2); c.fill();
  if (o.tail) { c.strokeStyle = css(lit(o.mane ?? o.body, 0.8)); c.lineWidth = S(1.6); c.beginPath(); c.moveTo(cx - L * 0.52, by - S(1)); c.quadraticCurveTo(cx - L * 0.7, by + S(2), cx - L * 0.66, by + S(o.h * 0.4)); c.stroke(); }
  if (o.spines) for (let i = 0; i < 5; i++) {
    const x = cx - L * 0.35 + i * L * 0.16;
    c.fillStyle = css(lit(o.spines, 0.9 + i * 0.05)); c.beginPath(); c.moveTo(x - S(1.5), by - S(o.h * 0.25)); c.lineTo(x + S(0.5), by - S(o.h * 0.25) - S(4 + (i % 2) * 2)); c.lineTo(x + S(2), by - S(o.h * 0.25)); c.fill();
  }
  // neck and head
  const nx = cx + L * 0.5, ny = by - S(o.h * 0.15);
  const hx = nx + S(o.neck ? 5 : 2), hy = ny - S(o.neck ? 9 : 3);
  if (o.neck) limb(c, nx - S(1), ny, hx, hy, S(4.5), o.body, 1.05);
  blob(c, hx + S(2), hy, S(o.neck ? 3.6 : 4), S(2.8), o.body, 1.05);
  if (o.mane) { c.strokeStyle = css(lit(o.mane, 0.8)); c.lineWidth = S(1.6); c.beginPath(); c.moveTo(nx - S(2), ny - S(2)); c.lineTo(hx - S(1), hy - S(2.5)); c.stroke(); }
  c.fillStyle = css(o.eye ?? 0x1a120a); c.beginPath(); c.arc(hx + S(2.5), hy - S(0.8), S(0.7), 0, Math.PI * 2); c.fill();
  if (o.antlers) {
    c.strokeStyle = css(0xe8dcc0); c.lineWidth = S(0.9);
    c.beginPath(); c.moveTo(hx, hy - S(2)); c.lineTo(hx - S(2), hy - S(8)); c.lineTo(hx - S(5), hy - S(10)); c.moveTo(hx - S(1.2), hy - S(5)); c.lineTo(hx + S(2), hy - S(9)); c.moveTo(hx - S(2), hy - S(8)); c.lineTo(hx + S(0.5), hy - S(12)); c.stroke();
  }
  return { saddle: { x: cx, y: by - S(o.h * 0.3) } };
}

// ------------------------------------------------------------------ the unit painter

export function paintUnit(c: Ctx, u: UnitDef, frame: Frame) {
  const m = u.model;
  const s = m.scale;
  const S = (v: number) => v * s;
  const cx = UNIT_CANVAS.w / 2, fy = UNIT_CANVAS.footY;
  const pose = poseOf(frame);
  const tw = u.id.startsWith('tw_');
  const atk = pose.attack;
  switch (m.shape) {
    case 'infantry':
      humanoid(c, cx, fy, S, { h: 26, body: m.body, accent: m.accent, helmet: tw ? 'leafhood' : 'helm', armor: tw ? 'leaf' : 'mail', attackArm: 'thrust',
        back: roundShield(S, m.accent, false), front: sword(S, atk) }, pose);
      break;
    case 'shield':
      humanoid(c, cx, fy, S, { h: 27, body: m.body, accent: m.accent, helmet: 'greathelm', armor: 'plate', attackArm: 'thrust',
        front: (cc, hand, back) => { sword(S, atk)(cc, hand); roundShield(S, m.accent, true)(cc, { x: back.x + S(4), y: back.y }); } }, pose);
      break;
    case 'polearm':
      humanoid(c, cx, fy, S, { h: 27, body: m.body, accent: m.accent, helmet: 'helm', armor: 'mail', attackArm: 'thrust', front: polearm(S, atk) }, pose);
      break;
    case 'archer':
      humanoid(c, cx, fy, S, { h: 25, body: m.body, accent: m.accent, helmet: tw ? 'leafhood' : 'cap', armor: tw ? 'leaf' : 'leather', attackArm: 'draw',
        front: tw ? bow(S, atk, 0x8a6a3a) : crossbow(S, atk) }, pose);
      break;
    case 'caster':
      humanoid(c, cx, fy, S, { h: 27, body: m.body, accent: m.accent, helmet: tw ? 'antlers' : 'circlet', armor: 'robe', attackArm: 'raise', front: staff(S, m.accent, atk) }, pose);
      break;
    case 'cavalry': {
      const stag = tw;
      const { saddle } = quadruped(c, cx - S(2), fy, S, pose, { len: 26, h: 13, body: m.body, belly: shade(m.body, 0.8), neck: true, antlers: stag, mane: stag ? undefined : shade(m.body, 0.4), tail: !stag });
      // caparison in team-neutral faction colours
      if (!stag) { c.fillStyle = grad(c, saddle.x - S(9), 0, saddle.x + S(9), 0, [[0, lit(m.accent, 1.1)], [1, lit(m.accent, 0.6)]]); c.beginPath(); c.moveTo(saddle.x - S(8), saddle.y + S(1)); c.lineTo(saddle.x + S(7), saddle.y + S(1)); c.lineTo(saddle.x + S(6), saddle.y + S(8)); c.lineTo(saddle.x - S(9), saddle.y + S(8)); c.fill(); }
      humanoid(c, saddle.x, saddle.y + S(8), S, { h: 22, body: stag ? 0x5a7a3a : m.accent, accent: stag ? 0x9ab060 : m.accent, helmet: stag ? 'leafhood' : 'greathelm', armor: stag ? 'leaf' : 'plate', riding: true, attackArm: 'thrust',
        front: (cc, hand) => {
          // lance / spear held forward
          const ang = atk ? 0.02 : -0.35;
          cc.strokeStyle = css(lit(WOOD, 1)); cc.lineWidth = S(1.4);
          cc.beginPath(); cc.moveTo(hand.x - S(8) * Math.cos(ang), hand.y - S(8) * Math.sin(ang)); cc.lineTo(hand.x + S(22) * Math.cos(ang), hand.y + S(22) * Math.sin(ang)); cc.stroke();
          cc.fillStyle = css(STEEL); cc.beginPath(); cc.arc(hand.x + S(23) * Math.cos(ang), hand.y + S(23) * Math.sin(ang), S(1.3), 0, Math.PI * 2); cc.fill();
          if (!stag) { cc.fillStyle = css(m.body); cc.beginPath(); cc.moveTo(hand.x + S(14) * Math.cos(ang), hand.y + S(14) * Math.sin(ang)); cc.lineTo(hand.x + S(18) * Math.cos(ang), hand.y + S(18) * Math.sin(ang) + S(3)); cc.lineTo(hand.x + S(13) * Math.cos(ang), hand.y + S(13) * Math.sin(ang) + S(3)); cc.fill(); }
        } }, { ...pose, moving: false });
      break;
    }
    case 'beast': {
      const { saddle } = quadruped(c, cx, fy, S, pose, { len: 18, h: 8, body: m.body, belly: shade(m.body, 0.7), spines: m.accent, tail: true, eye: 0xffe060 });
      void saddle;
      if (atk) { c.strokeStyle = css(0xffffff, 0.85); c.lineWidth = S(0.8); c.beginPath(); c.moveTo(cx + S(14), fy - S(10)); c.lineTo(cx + S(17), fy - S(8)); c.lineTo(cx + S(14), fy - S(6)); c.stroke(); }
      break;
    }
    case 'ram': {
      const roll = pose.ph * Math.PI * 2;
      const bounce = pose.moving ? -Math.abs(Math.sin(roll)) * S(2) : 0;
      softEllipse(c, cx, fy, S(10), S(3), 0x000000, 0.25);
      for (const dx of [-6, 4]) limb(c, cx + S(dx), fy - S(6) + bounce, cx + S(dx) + (pose.moving ? Math.sin(roll + dx) * S(2) : 0), fy, S(3), 0x3a2a1a, 0.9);
      blob(c, cx - S(1), fy - S(14) + bounce, S(12), S(11), m.body);
      // rock plates
      c.strokeStyle = css(0x2a2620, 0.5); c.lineWidth = S(0.8);
      for (let i = 0; i < 4; i++) { const a = roll + i * 1.6; c.beginPath(); c.moveTo(cx + Math.cos(a) * S(10), fy - S(14) + Math.sin(a) * S(9) + bounce); c.lineTo(cx + Math.cos(a + 0.6) * S(4), fy - S(14) + Math.sin(a + 0.6) * S(4) + bounce); c.stroke(); }
      // ram head butting forward, with a curled horn
      const hx = cx + S(atk ? 15 : 11), hy = fy - S(11) + bounce;
      blob(c, hx, hy, S(6), S(4.8), mix(m.body, 0x6a5a48, 0.4), 1.05);
      c.fillStyle = css(lit(mix(m.body, 0x6a5a48, 0.4), 0.8)); c.beginPath(); c.ellipse(hx + S(4.8), hy + S(1.4), S(2.8), S(2.2), 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = css(lit(0xd8c8a0, 1)); c.lineWidth = S(3);
      c.beginPath(); c.arc(hx - S(1.5), hy - S(1), S(4.6), -2.6, 1.3); c.stroke();
      c.strokeStyle = css(0x000000, 0.25); c.lineWidth = S(0.6);
      for (let k = 0; k < 4; k++) { const a = -2.4 + k * 0.9; c.beginPath(); c.moveTo(hx - S(1) + Math.cos(a) * S(2.3), hy - S(1) + Math.sin(a) * S(2.3)); c.lineTo(hx - S(1) + Math.cos(a) * S(4.5), hy - S(1) + Math.sin(a) * S(4.5)); c.stroke(); }
      c.fillStyle = css(0xffd060); c.beginPath(); c.arc(hx + S(1.6), hy - S(1), S(0.8), 0, Math.PI * 2); c.fill();
      break;
    }
    case 'flyer': {
      const flap = pose.attack ? 0.3 : Math.sin(pose.ph * Math.PI * 2 + (pose.moving ? 0 : 1.2));
      const y = fy - S(30);
      if (tw) {
        // dusk moth: broad rounded fore- and hindwings with eye spots, fuzzy body, soft glow
        c.save(); c.globalCompositeOperation = 'lighter';
        c.fillStyle = radial(c, cx, y, S(12), [[0, m.accent, 0.25], [1, m.accent, 0]]);
        c.beginPath(); c.arc(cx, y, S(12), 0, Math.PI * 2); c.fill(); c.restore();
        // seen from above: four wings spread to both sides; the wingbeat narrows them
        const spread = 0.35 + 0.65 * (0.5 + 0.5 * flap);
        const wing = (side: number, fore: boolean) => {
          c.save(); c.translate(cx, y); c.scale(side * spread, 1);
          const l = side > 0 ? 1.05 : 0.8;
          if (fore) {
            c.fillStyle = grad(c, 0, 0, S(14), -S(6), [[0, lit(m.body, l * 0.85)], [0.6, lit(m.body, l * 1.15)], [1, lit(mix(m.body, m.accent, 0.4), l)]]);
            c.beginPath(); c.moveTo(0, -S(2)); c.bezierCurveTo(S(6), -S(10), S(15), -S(9), S(14), -S(3)); c.bezierCurveTo(S(13), S(1), S(5), S(1), 0, S(0.5)); c.fill();
            c.fillStyle = css(m.accent, 0.95); c.beginPath(); c.arc(S(9), -S(4), S(1.8), 0, Math.PI * 2); c.fill();
            c.fillStyle = css(0x1a0e1a, 0.85); c.beginPath(); c.arc(S(9), -S(4), S(0.8), 0, Math.PI * 2); c.fill();
          } else {
            c.fillStyle = grad(c, 0, 0, S(9), S(6), [[0, lit(m.body, l * 0.75)], [1, lit(m.body, l * 1.0)]]);
            c.beginPath(); c.moveTo(0, S(0.5)); c.bezierCurveTo(S(5), S(0.5), S(10), S(4), S(8), S(8)); c.bezierCurveTo(S(5), S(9), S(1), S(5), 0, S(3)); c.fill();
          }
          c.restore();
        };
        wing(-1, false); wing(1, false); wing(-1, true); wing(1, true);
        blob(c, cx, y + S(1.5), S(2), S(5), mix(m.body, 0x3a2a3a, 0.45));
        c.strokeStyle = css(0x2a1a2a); c.lineWidth = S(0.6);
        c.beginPath(); c.moveTo(cx - S(0.6), y - S(3)); c.quadraticCurveTo(cx - S(2), y - S(7), cx - S(4), y - S(8)); c.moveTo(cx + S(0.6), y - S(3)); c.quadraticCurveTo(cx + S(2), y - S(7), cx + S(4), y - S(8)); c.stroke();
        break;
      }
      const wing = (dir: number, light: number) => {
        const tipY = y - S(10) * flap * dir - S(2);
        c.fillStyle = grad(c, cx, y, cx + S(18) * dir, tipY, [[0, lit(m.body, light * 1.1)], [1, lit(m.body, light * 0.85)]]);
        c.beginPath(); c.moveTo(cx - S(2), y - S(1)); c.quadraticCurveTo(cx + S(4), tipY - S(6), cx + S(18), tipY); c.quadraticCurveTo(cx + S(8), y + S(4), cx - S(2), y + S(2)); c.fill();
        // feather tips
        c.strokeStyle = css(lit(m.body, light * 0.6)); c.lineWidth = S(0.5);
        for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(cx + S(4 + k * 3), (y + tipY) / 2 + S(1)); c.lineTo(cx + S(6 + k * 3), (y + tipY) / 2 + S(3)); c.stroke(); }
      };
      wing(1, 0.75);
      blob(c, cx + S(1), y + S(1), S(5), S(3.4), m.body);
      blob(c, cx + S(6), y - S(1), S(2.6), S(2.4), m.body, 1.05);
      c.fillStyle = css(0xe8b040); c.beginPath(); c.moveTo(cx + S(8), y - S(1.5)); c.lineTo(cx + S(11), y - S(0.5)); c.lineTo(cx + S(8), y + S(0.3)); c.fill();
      c.fillStyle = css(lit(m.accent, 0.9)); c.beginPath(); c.moveTo(cx - S(4), y + S(1)); c.lineTo(cx - S(10), y - S(1)); c.lineTo(cx - S(9), y + S(3)); c.fill();
      wing(-1, 1.05);
      break;
    }
    case 'siege': {
      const roll = pose.ph * Math.PI * 2;
      const by = fy - S(5);
      c.fillStyle = grad(c, 0, by - S(8), 0, by, [[0, lit(m.body, 1.2)], [1, lit(m.body, 0.6)]]);
      c.fillRect(cx - S(14), by - S(8), S(28), S(5));
      for (const dx of [-9, 9]) {
        blob(c, cx + S(dx), by, S(4.5), S(4.5), 0x4a3420);
        c.strokeStyle = css(0x2a1a0e); c.lineWidth = S(0.8);
        for (let k = 0; k < 3; k++) { const a = roll + k * 2.1; c.beginPath(); c.moveTo(cx + S(dx), by); c.lineTo(cx + S(dx) + Math.cos(a) * S(4), by + Math.sin(a) * S(4)); c.stroke(); }
      }
      // A-frame and throwing arm
      c.strokeStyle = css(lit(m.body, 0.9)); c.lineWidth = S(1.8);
      c.beginPath(); c.moveTo(cx - S(6), by - S(7)); c.lineTo(cx, by - S(20)); c.lineTo(cx + S(6), by - S(7)); c.stroke();
      const armA = atk ? -0.6 : -2.4;
      const ax = cx + Math.cos(armA) * S(18), ay = by - S(18) + Math.sin(armA) * S(18);
      c.strokeStyle = css(lit(WOOD, 1.05)); c.lineWidth = S(2);
      c.beginPath(); c.moveTo(cx - Math.cos(armA) * S(5), by - S(18) - Math.sin(armA) * S(5)); c.lineTo(ax, ay); c.stroke();
      blob(c, ax, ay - S(1), S(3), S(3), 0x7a7468);
      // crew
      humanoid(c, cx - S(17), fy, (v) => v * s * 0.8, { h: 24, body: 0x7a6a50, accent: m.accent, helmet: 'cap', armor: 'leather' }, pose);
      break;
    }
    case 'giant': {
      if (tw) treant(c, cx, fy, S, m.body, m.accent, pose);
      else champion(c, cx, fy, S, m.body, m.accent, pose);
      break;
    }
  }
}

function treant(c: Ctx, cx: number, fy: number, S: (v: number) => number, bark: number, leaf: number, pose: Pose) {
  const sw = pose.ph * Math.PI * 2;
  const bob = pose.moving ? -Math.abs(Math.cos(sw)) * S(1) : 0;
  // root legs
  for (const [off, l, hx] of [[0, 0.75, -3.5], [Math.PI, 1, 3.5]] as const) {
    const a = pose.moving ? Math.sin(sw + off) * 0.35 : 0.12 * (off ? 1 : -1);
    const fx = cx + S(hx) + Math.sin(a) * S(9), fyy = fy - S(1.5);
    limb(c, cx + S(hx), fy - S(15) + bob, fx, fyy, S(5.5), bark, l);
    // splayed root toes
    c.strokeStyle = css(lit(bark, l * 0.85)); c.lineWidth = S(1.6);
    for (const t of [-1, 0, 1]) { c.beginPath(); c.moveTo(fx, fyy); c.lineTo(fx + S(3.5) * t + S(1.5), fy + S(0.5)); c.stroke(); }
  }
  // trunk body
  c.fillStyle = grad(c, cx - S(9), 0, cx + S(9), 0, [[0, lit(bark, 1.15)], [0.4, lit(bark, 0.95)], [1, lit(bark, 0.55)]]);
  c.beginPath(); c.moveTo(cx - S(8), fy - S(13) + bob); c.quadraticCurveTo(cx - S(10), fy - S(26), cx - S(6), fy - S(34) + bob); c.lineTo(cx + S(6), fy - S(34) + bob); c.quadraticCurveTo(cx + S(10), fy - S(26), cx + S(8), fy - S(13) + bob); c.fill();
  c.strokeStyle = css(0x000000, 0.25); c.lineWidth = S(0.6);
  for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(cx + S(i * 2.6), fy - S(14) + bob); c.quadraticCurveTo(cx + S(i * 3), fy - S(24), cx + S(i * 2), fy - S(33) + bob); c.stroke(); }
  // glowing eyes in the bark
  c.fillStyle = css(0xd8ff80); c.beginPath(); c.arc(cx + S(2), fy - S(28) + bob, S(0.9), 0, Math.PI * 2); c.arc(cx + S(5), fy - S(28) + bob, S(0.9), 0, Math.PI * 2); c.fill();
  // branch arms
  const raise = pose.attack ? -S(12) : pose.moving ? Math.sin(sw) * S(2) : 0;
  limb(c, cx - S(4), fy - S(28) + bob, cx - S(14), fy - S(20) + bob, S(3), bark, 0.75);
  limb(c, cx + S(4), fy - S(28) + bob, cx + S(15), fy - S(22) + bob + raise, S(3), bark, 1.05);
  c.strokeStyle = css(lit(bark, 0.9)); c.lineWidth = S(1.2);
  c.beginPath(); c.moveTo(cx + S(15), fy - S(22) + bob + raise); c.lineTo(cx + S(19), fy - S(25) + bob + raise); c.moveTo(cx + S(15), fy - S(22) + bob + raise); c.lineTo(cx + S(19), fy - S(19) + bob + raise); c.stroke();
  // leafy crown, painted like the forest trees
  foliage(c, cx - S(1), fy - S(44) + bob, S(12), S(7.5), leaf, 31);
}

function champion(c: Ctx, cx: number, fy: number, S: (v: number) => number, body: number, accent: number, pose: Pose) {
  // holy aura behind
  c.save(); c.globalCompositeOperation = 'lighter';
  c.fillStyle = radial(c, cx, fy - S(22), S(22), [[0, accent, 0.35], [1, accent, 0]]);
  c.beginPath(); c.arc(cx, fy - S(22), S(22), 0, Math.PI * 2); c.fill();
  c.restore();
  humanoid(c, cx, fy, S, {
    h: 30, body, accent, helmet: 'greathelm', armor: 'plate', attackArm: 'raise',
    back: (cc, hand) => {
      // cape
      cc.fillStyle = grad(cc, cx - S(8), 0, cx, 0, [[0, lit(accent, 0.9)], [1, lit(accent, 0.55)]]);
      cc.beginPath(); cc.moveTo(cx - S(2), fy - S(23)); cc.quadraticCurveTo(cx - S(9), fy - S(12), cx - S(10), fy - S(1)); cc.lineTo(cx - S(2), fy - S(2)); cc.fill();
      void hand;
    },
    front: (cc, hand) => {
      const ang = pose.attack ? -1.9 : -1.15;
      const len = S(17);
      const tx = hand.x + Math.cos(ang) * len, ty = hand.y + Math.sin(ang) * len;
      cc.save(); cc.globalCompositeOperation = 'lighter';
      cc.strokeStyle = css(0xfff0a0, 0.5); cc.lineWidth = S(4);
      cc.beginPath(); cc.moveTo(hand.x, hand.y); cc.lineTo(tx, ty); cc.stroke();
      cc.restore();
      cc.strokeStyle = css(0xfffbe8); cc.lineWidth = S(1.8);
      cc.beginPath(); cc.moveTo(hand.x, hand.y); cc.lineTo(tx, ty); cc.stroke();
      cc.strokeStyle = css(0xd8a030); cc.lineWidth = S(1.6);
      cc.beginPath(); cc.moveTo(hand.x - S(2.5), hand.y - S(0.8)); cc.lineTo(hand.x + S(2.5), hand.y + S(0.8)); cc.stroke();
    },
  }, pose);
  // halo
  c.strokeStyle = css(0xffe890, 0.85); c.lineWidth = S(0.9);
  c.beginPath(); c.ellipse(cx + S(0.6), fy - S(31) - S(4), S(4.5), S(1.4), 0, 0, Math.PI * 2); c.stroke();
}

export function paintBuilder(c: Ctx, frame: Frame) {
  const cx = UNIT_CANVAS.w / 2, fy = UNIT_CANVAS.footY;
  const pose = poseOf(frame);
  const S = (v: number) => v * 1.05;
  humanoid(c, cx, fy, S, {
    h: 24, body: 0x8a6a40, accent: 0x6a4a2a, helmet: 'cap', armor: 'leather', attackArm: 'raise',
    back: (cc, hand) => {
      // tool satchel
      cc.fillStyle = grad(cc, hand.x - S(4), 0, hand.x + S(2), 0, [[0, 0x9a7a50], [1, 0x5a4028]]);
      cc.fillRect(cx - S(7), fy - S(16), S(4.5), S(6));
    },
    front: (cc, hand) => {
      const ang = pose.attack ? -2.2 : -1.25;
      const tx = hand.x + Math.cos(ang) * S(9), ty = hand.y + Math.sin(ang) * S(9);
      cc.strokeStyle = css(lit(WOOD, 1)); cc.lineWidth = S(1.3);
      cc.beginPath(); cc.moveTo(hand.x, hand.y); cc.lineTo(tx, ty); cc.stroke();
      cc.save(); cc.translate(tx, ty); cc.rotate(ang + Math.PI / 2);
      cc.fillStyle = grad(cc, -S(3), 0, S(3), 0, [[0, lit(STEEL, 1.2)], [1, lit(STEEL, 0.6)]]);
      cc.fillRect(-S(3.2), -S(1.4), S(6.4), S(2.8));
      cc.restore();
    },
  }, pose);
}

/** Dark outline around a painted figure (keeps small units readable on the busy ground). */
export function outline(src: HTMLCanvasElement, px: number, alpha = 0.75): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = src.width; out.height = src.height;
  const o = out.getContext('2d')!;
  const sil = document.createElement('canvas');
  sil.width = src.width; sil.height = src.height;
  const s = sil.getContext('2d')!;
  s.drawImage(src, 0, 0);
  s.globalCompositeOperation = 'source-in';
  s.fillStyle = `rgba(16,12,8,${alpha})`;
  s.fillRect(0, 0, sil.width, sil.height);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) o.drawImage(sil, dx * px, dy * px);
  o.drawImage(src, 0, 0);
  return out;
}
