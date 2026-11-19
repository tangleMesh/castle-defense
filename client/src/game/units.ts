import type { UnitDef } from '@bc/shared';
import { css, grad, lit, mix, radial, shade, softEllipse, type Ctx } from './paint';
import { foliage } from './structures';
import { UNIT_PAINTERS } from './painters';

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

export interface Pose {
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
export function limb(c: Ctx, x0: number, y0: number, x1: number, y1: number, w: number, color: number, light = 1) {
  c.strokeStyle = css(lit(color, light * 0.8)); c.lineWidth = w;
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  c.strokeStyle = css(lit(color, light * 1.12), 0.8); c.lineWidth = w * 0.45;
  c.beginPath(); c.moveTo(x0 - w * 0.15, y0 - w * 0.15); c.lineTo(x1 - w * 0.15, y1 - w * 0.15); c.stroke();
}

export function blob(c: Ctx, x: number, y: number, rx: number, ry: number, color: number, light = 1) {
  c.fillStyle = radial(c, x - rx * 0.35, y - ry * 0.4, Math.max(rx, ry) * 1.5, [[0, lit(color, 1.3 * light)], [0.5, lit(color, 0.95 * light)], [1, lit(color, 0.55 * light)]]);
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
}

export type Helmet = 'helm' | 'greathelm' | 'hood' | 'cap' | 'circlet' | 'antlers' | 'leafhood' | 'goggles' | 'none';
export type Armor = 'plate' | 'mail' | 'leather' | 'robe' | 'leaf';

export interface HumanOpts {
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
  /** Skin colour (goblins are green) and pointed ears. */
  skin?: number;
  ears?: boolean;
}
type Pt = { x: number; y: number };

/** A humanoid side-on. Returns head and hands for gear. */
export function humanoid(c: Ctx, cx: number, fy: number, S: (v: number) => number, o: HumanOpts, pose: Pose) {
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
  const skin = o.skin ?? SKIN;
  if (o.ears) {
    // long goblin ears, swept back
    fillTri(c, cx - S(1.5), headY - S(0.5), cx - S(8), headY - S(3.5), cx - S(1.2), headY + S(1.4), lit(skin, 0.8));
    fillTri(c, cx + S(2.6), headY - S(1.2), cx + S(5.5), headY - S(5), cx + S(3.6), headY + S(0.2), lit(skin, 1.05));
  }
  c.fillStyle = radial(c, cx + S(0.5), headY - S(1), hr * 1.6, [[0, lit(skin, 1.2)], [1, lit(skin, 0.7)]]);
  c.beginPath(); c.arc(cx + S(0.6), headY, hr, 0, Math.PI * 2); c.fill();
  if (o.ears) { c.fillStyle = css(lit(skin, 0.9)); c.beginPath(); c.ellipse(cx + S(3.6), headY + S(0.6), S(1.4), S(0.9), 0.3, 0, Math.PI * 2); c.fill(); }
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
    case 'goggles':
      c.fillStyle = css(0x5a3a22); c.beginPath(); c.arc(x, y - S(0.6), r * 1.02, Math.PI * 1.05, Math.PI * 1.95); c.fill();
      c.strokeStyle = css(0x2a1c12); c.lineWidth = S(0.8); c.beginPath(); c.moveTo(x - r, y - S(1.1)); c.lineTo(x + r, y - S(1.1)); c.stroke();
      for (const dx of [0.4, 2.2]) {
        c.fillStyle = css(0xb08a4a); c.beginPath(); c.arc(x + S(dx), y - S(1.1), S(1.25), 0, Math.PI * 2); c.fill();
        c.fillStyle = radial(c, x + S(dx) - S(0.3), y - S(1.4), S(1.2), [[0, 0xffffff], [0.4, accent], [1, shade(accent, 0.5)]]);
        c.beginPath(); c.arc(x + S(dx), y - S(1.1), S(0.85), 0, Math.PI * 2); c.fill();
      }
      break;
    default: break;
  }
}

export function fillTri(c: Ctx, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, color: number, a = 1) {
  c.fillStyle = css(color, a); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.lineTo(x2, y2); c.closePath(); c.fill();
}

// ------------------------------------------------------------------ gear

export const sword = (S: (v: number) => number, attack: boolean) => (c: Ctx, hand: Pt) => {
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

export const roundShield = (S: (v: number) => number, color: number, big: boolean) => (c: Ctx, hand: Pt) => {
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

export const polearm = (S: (v: number) => number, attack: boolean) => (c: Ctx, hand: Pt) => {
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

export const bow = (S: (v: number) => number, attack: boolean, wood: number) => (c: Ctx, hand: Pt) => {
  const r = S(9);
  c.strokeStyle = css(lit(wood, 1)); c.lineWidth = S(1.4);
  c.beginPath(); c.arc(hand.x - S(4), hand.y, r, -1.1, 1.1); c.stroke();
  const t = { x: hand.x - S(4) + Math.cos(-1.1) * r, y: hand.y + Math.sin(-1.1) * r }, b = { x: hand.x - S(4) + Math.cos(1.1) * r, y: hand.y + Math.sin(1.1) * r };
  const pull = attack ? S(-6) : 0;
  c.strokeStyle = css(0xf0e8d8, 0.9); c.lineWidth = S(0.5);
  c.beginPath(); c.moveTo(t.x, t.y); c.lineTo(hand.x - S(4) + pull + S(3), hand.y); c.lineTo(b.x, b.y); c.stroke();
  if (attack) { c.strokeStyle = css(0xe8e0d0); c.lineWidth = S(0.7); c.beginPath(); c.moveTo(hand.x - S(8), hand.y); c.lineTo(hand.x + S(6), hand.y); c.stroke(); }
};

export const crossbow = (S: (v: number) => number, attack: boolean) => (c: Ctx, hand: Pt) => {
  c.strokeStyle = css(lit(WOOD, 1)); c.lineWidth = S(2);
  c.beginPath(); c.moveTo(hand.x - S(4), hand.y + S(1)); c.lineTo(hand.x + S(6), hand.y - S(0.5)); c.stroke();
  c.strokeStyle = css(lit(STEEL, 1)); c.lineWidth = S(1.2);
  c.beginPath(); c.moveTo(hand.x + S(4), hand.y - S(5)); c.quadraticCurveTo(hand.x + S(6.5), hand.y - S(0.5), hand.x + S(4), hand.y + S(4)); c.stroke();
  if (attack) { c.fillStyle = css(0xfff0c0, 0.8); c.beginPath(); c.arc(hand.x + S(8), hand.y - S(0.5), S(1.3), 0, Math.PI * 2); c.fill(); }
};

export const staff = (S: (v: number) => number, accent: number, attack: boolean) => (c: Ctx, hand: Pt) => {
  c.strokeStyle = css(lit(WOOD, 1)); c.lineWidth = S(1.3);
  const top = { x: hand.x + S(1), y: hand.y - S(attack ? 16 : 13) };
  c.beginPath(); c.moveTo(hand.x - S(0.5), hand.y + S(9)); c.lineTo(top.x, top.y); c.stroke();
  c.save(); c.globalCompositeOperation = 'lighter';
  c.fillStyle = radial(c, top.x, top.y - S(1), S(attack ? 9 : 6), [[0, 0xffffff, 0.95], [0.3, accent, 0.7], [1, accent, 0]]);
  c.beginPath(); c.arc(top.x, top.y - S(1), S(attack ? 9 : 6), 0, Math.PI * 2); c.fill();
  c.restore();
};

// ------------------------------------------------------------------ bodies

export function quadruped(c: Ctx, cx: number, fy: number, S: (v: number) => number, pose: Pose, o: {
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
    case 'water': waterSpirit(c, cx, fy, S, m.body, m.accent, pose, m.variant); break;
    case 'wisp': windWisp(c, cx, fy, S, m.body, m.accent, pose, m.variant); break;
    case 'flame': flameSpirit(c, cx, fy, S, m.body, m.accent, pose, m.variant); break;
    case 'spark': sparkSpirit(c, cx, fy, S, m.body, m.accent, pose, m.variant); break;
    case 'rock': rockSpirit(c, cx, fy, S, m.body, m.accent, pose, m.variant); break;
    case 'elementalist': elementalist(c, cx, fy, S, m.body, m.accent, pose); break;
    case 'avatar': avatar(c, cx, fy, S, m.body, m.accent, pose, m.variant); break;
    case 'goblin': goblin(c, cx, fy, S, m.body, m.accent, pose, m.variant); break;
    case 'tank': tank(c, cx, fy, S, m.body, m.accent, pose, m.variant); break;
    case 'copter': copter(c, cx, fy, S, m.body, m.accent, pose, m.variant); break;
    case 'golem': ironGolem(c, cx, fy, S, m.body, m.accent, pose, m.variant); break;
    case 'shredder': shredder(c, cx, fy, S, m.body, m.accent, pose); break;
    case 'mech': goliath(c, cx, fy, S, m.body, m.accent, pose, m.variant); break;
    default: UNIT_PAINTERS[m.shape]?.(c, u, cx, fy, S, pose);
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

// ------------------------------------------------------------------ Shardbound elementals

type SFn = (v: number) => number;
const TAU = Math.PI * 2;

/** Additive glow disc. */
export function glow(c: Ctx, x: number, y: number, r: number, color: number, a: number) {
  c.save(); c.globalCompositeOperation = 'lighter';
  c.fillStyle = radial(c, x, y, r, [[0, color, a], [1, color, 0]]);
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.restore();
}

/** Jagged lightning stroke between two points. */
export function bolt(c: Ctx, x0: number, y0: number, x1: number, y1: number, S: SFn, seed: number, color = 0xe8f4ff, w = 0.8) {
  let s = seed * 9301 + 49297;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  c.strokeStyle = css(color, 0.95); c.lineWidth = S(w);
  c.beginPath(); c.moveTo(x0, y0);
  const n = 4;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    c.lineTo(x0 + (x1 - x0) * t + (r() - 0.5) * S(4), y0 + (y1 - y0) * t + (r() - 0.5) * S(4));
  }
  c.lineTo(x1, y1); c.stroke();
}

/**
 * Water spirit: a translucent column of water rising out of its own wave, with a head, a
 * flowing arm that lashes out, droplets and light caustics. 'deep' wears a crown of crystal.
 */
function waterSpirit(c: Ctx, cx: number, fy: number, S: SFn, body: number, accent: number, pose: Pose, variant?: string) {
  const ph = pose.ph * TAU;
  const sway = pose.moving ? Math.sin(ph) * S(1.2) : 0;
  // the wave it glides on
  c.fillStyle = grad(c, cx - S(11), 0, cx + S(11), 0, [[0, lit(body, 0.7), 0.85], [0.5, lit(body, 1.05), 0.9], [1, lit(body, 0.6), 0.85]]);
  c.beginPath(); c.moveTo(cx - S(12), fy);
  for (let i = 0; i <= 8; i++) { const x = cx - S(12) + i * S(3); c.lineTo(x, fy - S(2.5) - Math.sin(ph * 2 + i) * S(1.2)); }
  c.lineTo(cx + S(12), fy); c.closePath(); c.fill();
  // body column, narrow at the waist, broad shoulders
  const top = fy - S(25);
  c.fillStyle = grad(c, cx - S(8), 0, cx + S(8), 0, [[0, lit(body, 1.25), 0.85], [0.45, lit(body, 0.95), 0.8], [1, lit(body, 0.55), 0.9]]);
  c.beginPath();
  c.moveTo(cx - S(7), fy - S(2));
  c.bezierCurveTo(cx - S(3) + sway, fy - S(10), cx - S(9) + sway, fy - S(17), cx - S(6) + sway, top);
  c.lineTo(cx + S(6) + sway, top);
  c.bezierCurveTo(cx + S(9) + sway, fy - S(17), cx + S(3) + sway, fy - S(10), cx + S(7), fy - S(2));
  c.closePath(); c.fill();
  // inner currents
  c.strokeStyle = css(accent, 0.55); c.lineWidth = S(0.7);
  for (let k = 0; k < 3; k++) {
    c.beginPath(); c.moveTo(cx - S(4) + k * S(3), fy - S(3));
    c.quadraticCurveTo(cx - S(6) + k * S(3) + sway + Math.sin(ph + k) * S(2), fy - S(14), cx - S(3) + k * S(3) + sway, top + S(2)); c.stroke();
  }
  // head
  const hx = cx + S(1) + sway, hy = top - S(4);
  c.fillStyle = radial(c, hx - S(1), hy - S(1.5), S(6), [[0, lit(accent, 1.1), 0.95], [0.5, lit(body, 1.1), 0.9], [1, lit(body, 0.6), 0.9]]);
  c.beginPath(); c.ellipse(hx, hy, S(4), S(4.6), 0, 0, TAU); c.fill();
  c.fillStyle = css(0xffffff, 0.95); c.beginPath(); c.arc(hx + S(2), hy - S(0.6), S(0.8), 0, TAU); c.fill();
  // crest of water flowing back from the head
  c.fillStyle = css(lit(body, 1.15), 0.75);
  c.beginPath(); c.moveTo(hx - S(2), hy - S(4)); c.quadraticCurveTo(hx - S(9), hy - S(6) - Math.sin(ph) * S(1), hx - S(10), hy + S(3)); c.quadraticCurveTo(hx - S(5), hy, hx - S(3), hy + S(1)); c.fill();
  if (variant === 'deep') {
    for (let k = -1; k <= 1; k++) {
      const x = hx + k * S(2.4), y = hy - S(4.2);
      c.fillStyle = css(lit(accent, 1.2)); c.beginPath(); c.moveTo(x - S(1), y); c.lineTo(x, y - S(4 - Math.abs(k))); c.lineTo(x + S(1), y); c.fill();
    }
    glow(c, hx, hy - S(5), S(6), accent, 0.4);
  }
  // arms: back arm hangs, front arm lashes forward as a whip of water
  limb(c, cx - S(4) + sway, top + S(2), cx - S(8) + sway, top + S(10), S(3), body, 0.75);
  const reach = pose.attack ? S(16) : S(7);
  const ax = cx + S(4) + sway + reach, ay = pose.attack ? top + S(1) : top + S(9);
  c.strokeStyle = css(lit(body, 1.05), 0.9); c.lineWidth = S(3.2); c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx + S(4) + sway, top + S(2)); c.quadraticCurveTo(cx + S(8) + sway, top + S(8), ax, ay); c.stroke();
  if (pose.attack) {
    for (let k = 0; k < 6; k++) { c.fillStyle = css(accent, 0.85); c.beginPath(); c.arc(ax + S(2 + (k % 3) * 1.6), ay - S(2) + Math.floor(k / 3) * S(3), S(0.9), 0, TAU); c.fill(); }
  }
  // highlights and droplets
  c.strokeStyle = css(0xffffff, 0.55); c.lineWidth = S(0.6);
  c.beginPath(); c.moveTo(cx - S(5) + sway, top + S(3)); c.quadraticCurveTo(cx - S(6) + sway, fy - S(15), cx - S(4), fy - S(8)); c.stroke();
  for (let k = 0; k < 3; k++) { c.fillStyle = css(accent, 0.7); c.beginPath(); c.arc(cx - S(8) + k * S(7), fy - S(6) - ((ph * 3 + k * 2) % 6) * S(0.8), S(0.6), 0, TAU); c.fill(); }
}

/** Wind elemental: a flying vortex of white air bands around two bright eyes; 'lord' wears crystal plates. */
function windWisp(c: Ctx, cx: number, fy: number, S: SFn, body: number, accent: number, pose: Pose, variant?: string) {
  const y = fy - S(32);
  const spin = pose.ph * TAU + (pose.attack ? 1.2 : 0);
  glow(c, cx, y, S(14), body, 0.35);
  // funnel tail curling down
  c.strokeStyle = css(lit(body, 1.1), 0.7); c.lineWidth = S(1.4);
  c.beginPath(); c.moveTo(cx - S(2), y + S(6));
  for (let i = 1; i <= 10; i++) { const t = i / 10; c.lineTo(cx - S(2) - Math.sin(spin + t * 6) * S(4) * (1 - t) - t * S(5), y + S(6) + t * S(14)); }
  c.stroke();
  // air bands: tilted ellipses, alternately in front of and behind the core
  const band = (k: number, front: boolean) => {
    const rx = S(10 - k * 1.8), ry = S(3.2 - k * 0.4), yy = y - S(4) + k * S(4);
    c.strokeStyle = css(lit(k % 2 ? accent : body, front ? 1.25 : 0.85), front ? 0.9 : 0.5); c.lineWidth = S(front ? 1.6 : 1.1);
    c.beginPath(); c.ellipse(cx, yy, rx, ry, -0.15, front ? 0 : Math.PI, front ? Math.PI : TAU); c.stroke();
    // a puff riding on the band
    const a = spin * (1 + k * 0.3) + k;
    if (Math.sin(a) > 0 === front) { c.fillStyle = css(0xffffff, 0.8); c.beginPath(); c.arc(cx + Math.cos(a) * rx, yy + Math.sin(a) * ry, S(1.3), 0, TAU); c.fill(); }
  };
  for (let k = 0; k < 4; k++) band(k, false);
  // core with eyes
  c.fillStyle = radial(c, cx - S(1), y - S(1), S(6), [[0, 0xffffff, 0.95], [0.6, lit(body, 1.1), 0.7], [1, body, 0]]);
  c.beginPath(); c.arc(cx, y, S(6), 0, TAU); c.fill();
  for (const dx of [1.2, 3.4]) { c.fillStyle = css(0x2a4a7a); c.beginPath(); c.ellipse(cx + S(dx), y - S(1), S(0.8), S(1.2), 0, 0, TAU); c.fill(); }
  if (variant === 'lord') {
    for (let k = 0; k < 5; k++) {
      const a = spin * 0.5 + (k / 5) * TAU, x = cx + Math.cos(a) * S(9), yy = y + Math.sin(a) * S(3.2);
      c.fillStyle = css(lit(accent, 1.1), 0.95); c.beginPath(); c.moveTo(x, yy - S(3)); c.lineTo(x + S(1.6), yy); c.lineTo(x, yy + S(3)); c.lineTo(x - S(1.6), yy); c.fill();
    }
  }
  for (let k = 0; k < 4; k++) band(k, true);
  if (pose.attack) {
    // a gust shot forward
    c.strokeStyle = css(0xffffff, 0.85); c.lineWidth = S(1);
    for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(cx + S(7), y + k * S(2)); c.quadraticCurveTo(cx + S(13), y + k * S(3) - S(2), cx + S(19), y + k * S(2.5)); c.stroke(); }
  }
}

/** Fire elemental: a living flame with layered tongues, a white-hot core and burning hands. */
function flameSpirit(c: Ctx, cx: number, fy: number, S: SFn, body: number, accent: number, pose: Pose, variant?: string) {
  const ph = pose.ph * TAU;
  const big = variant === 'blaze';
  const base = fy - S(3);
  const h = S(big ? 30 : 26);
  glow(c, cx, fy - h * 0.5, h * 0.9, body, 0.4);
  // embers under it
  softEllipse(c, cx, fy, S(8), S(2.2), 0xff8030, 0.5);
  const flame = (w: number, hh: number, color: number, a: number, off: number) => {
    c.fillStyle = grad(c, 0, base - hh, 0, base, [[0, lit(color, 1.3), a * 0.7], [0.5, lit(color, 1.05), a], [1, lit(color, 0.8), a]]);
    c.beginPath(); c.moveTo(cx - w, base);
    c.bezierCurveTo(cx - w * 1.2, base - hh * 0.4, cx - w * 0.5 + Math.sin(ph + off) * S(2), base - hh * 0.7, cx + Math.sin(ph * 2 + off) * S(2.5), base - hh);
    c.bezierCurveTo(cx + w * 0.6, base - hh * 0.65, cx + w * 1.25, base - hh * 0.4, cx + w, base);
    c.closePath(); c.fill();
  };
  flame(S(big ? 10 : 8.5), h, shade(body, 0.85), 0.9, 0);
  // side tongues
  for (const [dx, hh, off] of [[-6, 0.55, 1.3], [5, 0.6, 2.6], [-2, 0.75, 4]] as const) {
    c.fillStyle = css(lit(body, 1.15), 0.8);
    c.beginPath(); c.moveTo(cx + S(dx) - S(2.5), base - h * 0.25); c.quadraticCurveTo(cx + S(dx) + Math.sin(ph * 3 + off) * S(2), base - h * hh - S(3), cx + S(dx) + S(1) + Math.sin(ph * 2 + off) * S(2), base - h * hh - S(5)); c.quadraticCurveTo(cx + S(dx) + S(3), base - h * 0.4, cx + S(dx) + S(2.5), base - h * 0.25); c.fill();
  }
  flame(S(big ? 6.5 : 5.5), h * 0.78, mix(body, accent, 0.5), 0.95, 1.7);
  flame(S(3), h * 0.5, accent, 1, 3.1);
  // face: two dark eye slits in the bright core
  const ey = base - h * 0.62;
  for (const dx of [0.6, 3]) fillTri(c, cx + S(dx) - S(1), ey, cx + S(dx) + S(1.2), ey - S(0.8), cx + S(dx) + S(0.8), ey + S(0.9), 0x3a1004, 0.9);
  if (big) {
    // horns of flame
    for (const d of [-1, 1]) { c.fillStyle = css(lit(accent, 1.1), 0.9); c.beginPath(); c.moveTo(cx + d * S(3), ey - S(4)); c.quadraticCurveTo(cx + d * S(8), ey - S(8), cx + d * S(6), ey - S(13)); c.quadraticCurveTo(cx + d * S(5), ey - S(7), cx + d * S(1), ey - S(5)); c.fill(); }
  }
  // burning hands; the attack hurls a fireball
  const hand = pose.attack ? { x: cx + S(13), y: ey + S(2) } : { x: cx + S(8), y: base - h * 0.35 + (pose.moving ? Math.sin(ph) * S(1.5) : 0) };
  glow(c, hand.x, hand.y, S(pose.attack ? 7 : 4), accent, 0.8);
  c.fillStyle = radial(c, hand.x, hand.y, S(pose.attack ? 3.5 : 2.2), [[0, 0xffffff], [0.5, accent], [1, body]]);
  c.beginPath(); c.arc(hand.x, hand.y, S(pose.attack ? 3.5 : 2.2), 0, TAU); c.fill();
  glow(c, cx - S(8), base - h * 0.35, S(3.5), accent, 0.6);
}

/** Lightning elemental: a floating crystal heart caged by crackling arcs; 'thunder' wears heavy shards. */
function sparkSpirit(c: Ctx, cx: number, fy: number, S: SFn, body: number, accent: number, pose: Pose, variant?: string) {
  const ph = pose.ph * TAU;
  const y = fy - S(17) + Math.sin(ph) * S(1.5);
  softEllipse(c, cx, fy, S(7), S(2), 0x000000, 0.25);
  glow(c, cx, y, S(15), body, 0.45);
  const heavy = variant === 'thunder';
  // crystal heart: an elongated octahedron
  const w = S(heavy ? 6 : 5), hh = S(heavy ? 12 : 10);
  fillTri(c, cx, y - hh, cx - w, y, cx, y + hh * 0.8, lit(body, 1.3));
  fillTri(c, cx, y - hh, cx + w, y, cx, y + hh * 0.8, lit(body, 0.75));
  fillTri(c, cx, y - hh, cx - w * 0.35, y - hh * 0.2, cx, y + hh * 0.2, 0xffffff, 0.5);
  if (heavy) {
    // orbiting armour shards
    for (let k = 0; k < 4; k++) {
      const a = ph + (k / 4) * TAU, x = cx + Math.cos(a) * S(10), yy = y + Math.sin(a) * S(4);
      fillTri(c, x, yy - S(3.5), x - S(2), yy + S(2), x + S(2), yy + S(2), lit(accent, Math.sin(a) > 0 ? 1.1 : 0.7));
    }
  }
  // crackling arcs from the heart outwards
  const n = heavy ? 6 : 4;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU + ph * 0.5;
    bolt(c, cx, y, cx + Math.cos(a) * S(11), y + Math.sin(a) * S(8), S, k + Math.floor(pose.ph * 8) * 7);
  }
  // eye
  c.fillStyle = css(0xffffff); c.beginPath(); c.ellipse(cx + S(1.5), y - S(2), S(1.2), S(0.7), 0, 0, TAU); c.fill();
  if (pose.attack) { bolt(c, cx + S(4), y - S(2), cx + S(24), y - S(4), S, 5, 0xffffff, 1.2); glow(c, cx + S(24), y - S(4), S(5), accent, 0.7); }
}

/** Earth elemental: a hunched heap of boulders with glowing crystal veins and huge rock fists. */
function rockSpirit(c: Ctx, cx: number, fy: number, S: SFn, body: number, accent: number, pose: Pose, variant?: string) {
  const ph = pose.ph * TAU;
  const bob = pose.moving ? -Math.abs(Math.sin(ph)) * S(1) : 0;
  softEllipse(c, cx, fy, S(13), S(3), 0x000000, 0.3);
  const rock = (x: number, y: number, rx: number, ry: number, l = 1) => {
    c.fillStyle = grad(c, x - rx, y - ry, x + rx, y + ry, [[0, lit(body, 1.3 * l)], [0.5, lit(body, 0.95 * l)], [1, lit(body, 0.55 * l)]]);
    c.beginPath(); c.moveTo(x - rx, y + ry * 0.3); c.lineTo(x - rx * 0.6, y - ry); c.lineTo(x + rx * 0.5, y - ry * 0.9); c.lineTo(x + rx, y - ry * 0.1); c.lineTo(x + rx * 0.7, y + ry); c.lineTo(x - rx * 0.6, y + ry * 0.9); c.closePath(); c.fill();
    c.strokeStyle = css(0x000000, 0.3); c.lineWidth = S(0.6); c.stroke();
  };
  // stumpy legs
  for (const [dx, l, off] of [[-5, 0.75, 0], [4, 1, Math.PI]] as const) rock(cx + S(dx) + (pose.moving ? Math.sin(ph + off) * S(2) : 0), fy - S(3), S(4), S(3.5), l);
  // back arm (behind)
  rock(cx - S(10), fy - S(13) + bob, S(4.5), S(4), 0.7);
  // body: big boulder with a smaller one as head, set forward
  rock(cx - S(1), fy - S(15) + bob, S(11), S(10));
  // crystal veins
  c.strokeStyle = css(accent, 0.95); c.lineWidth = S(0.9);
  c.beginPath(); c.moveTo(cx - S(6), fy - S(19) + bob); c.lineTo(cx - S(2), fy - S(15) + bob); c.lineTo(cx + S(1), fy - S(17) + bob); c.lineTo(cx + S(5), fy - S(12) + bob); c.stroke();
  glow(c, cx - S(1), fy - S(15) + bob, S(5), accent, 0.35);
  if (variant === 'mountain') {
    // crystal spires growing from its back
    for (const [dx, hh] of [[-7, 9], [-3, 12], [1, 8]] as const) fillTri(c, cx + S(dx) - S(2), fy - S(22) + bob, cx + S(dx) + S(0.5), fy - S(22) - S(hh) + bob, cx + S(dx) + S(2.5), fy - S(22) + bob, lit(accent, 1.1));
  }
  rock(cx + S(6), fy - S(25) + bob, S(5), S(4.2), 1.05);
  c.fillStyle = css(accent); c.fillRect(cx + S(7), fy - S(26) + bob, S(2.6), S(1));
  glow(c, cx + S(8), fy - S(25.5) + bob, S(3), accent, 0.6);
  // front fist: raised for the pound
  const fx = cx + S(pose.attack ? 13 : 11), fyy = pose.attack ? fy - S(28) + bob : fy - S(11) + bob;
  rock(cx + S(8), (fyy + fy - S(18) + bob) / 2, S(3), S(3.5), 0.95);
  rock(fx, fyy, S(5.5), S(5), 1.1);
}

/** Master of Elements: a robed conjurer with four element orbs circling it. */
function elementalist(c: Ctx, cx: number, fy: number, S: SFn, body: number, accent: number, pose: Pose) {
  const orbs: Array<[number, number]> = [[0xff6a2a, 0], [0x4aa0e0, 1], [0xf0f8ff, 2], [0x9a7a4a, 3]];
  const spin = pose.ph * TAU;
  const at = (k: number) => { const a = spin + (k / 4) * TAU; return { x: cx + Math.cos(a) * S(11), y: fy - S(20) + Math.sin(a) * S(4), front: Math.sin(a) > 0 }; };
  const drawOrb = (k: number) => { const p = at(k); glow(c, p.x, p.y, S(4), orbs[k][0], 0.6); c.fillStyle = radial(c, p.x - S(0.5), p.y - S(0.5), S(2), [[0, 0xffffff], [1, orbs[k][0]]]); c.beginPath(); c.arc(p.x, p.y, S(1.8), 0, TAU); c.fill(); };
  for (let k = 0; k < 4; k++) if (!at(k).front) drawOrb(k);
  humanoid(c, cx, fy, S, { h: 28, body, accent, helmet: 'hood', armor: 'robe', attackArm: 'raise', front: staff(S, accent, pose.attack) }, pose);
  // crystal brooch
  fillTri(c, cx, fy - S(23), cx - S(1.3), fy - S(21), cx + S(1.3), fy - S(21), lit(accent, 1.3));
  for (let k = 0; k < 4; k++) if (at(k).front) drawOrb(k);
}

/** Elemental champion: rock legs, a burning chest, water and lightning arms, a crystal crown. */
function avatar(c: Ctx, cx: number, fy: number, S: SFn, body: number, accent: number, pose: Pose, variant?: string) {
  const ph = pose.ph * TAU;
  const bob = pose.moving ? -Math.abs(Math.cos(ph)) * S(1) : 0;
  glow(c, cx, fy - S(22), S(24), accent, 0.25);
  softEllipse(c, cx, fy, S(12), S(3), 0x000000, 0.3);
  // rock legs
  for (const [hx, off, l] of [[-4, 0, 0.75], [4, Math.PI, 1]] as const) {
    const a = pose.moving ? Math.sin(ph + off) * 0.35 : 0;
    limb(c, cx + S(hx), fy - S(15) + bob, cx + S(hx) + Math.sin(a) * S(8), fy - S(1), S(5.5), 0x7a6a50, l);
  }
  // torso: dark crystal armour with a molten core
  c.fillStyle = grad(c, cx - S(9), 0, cx + S(9), 0, [[0, lit(body, 1.3)], [0.5, lit(body, 0.95)], [1, lit(body, 0.55)]]);
  c.beginPath(); c.moveTo(cx - S(9), fy - S(31) + bob); c.lineTo(cx + S(9), fy - S(31) + bob); c.lineTo(cx + S(6), fy - S(14) + bob); c.lineTo(cx - S(6), fy - S(14) + bob); c.closePath(); c.fill();
  glow(c, cx + S(1), fy - S(23) + bob, S(7), 0xff9a3a, 0.8);
  c.fillStyle = radial(c, cx + S(1), fy - S(23) + bob, S(3.5), [[0, 0xffffff], [0.5, 0xffc060], [1, 0xff5a1a]]);
  c.beginPath(); c.arc(cx + S(1), fy - S(23) + bob, S(3), 0, TAU); c.fill();
  // back arm: a stream of water
  c.strokeStyle = css(0x4aa0e0, 0.85); c.lineWidth = S(4); c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx - S(8), fy - S(29) + bob); c.quadraticCurveTo(cx - S(15), fy - S(24) + bob, cx - S(13), fy - S(15) + bob); c.stroke();
  // head with crystal crown
  const hx = cx + S(1), hy = fy - S(35) + bob;
  blob(c, hx, hy, S(4), S(4.2), body, 1.05);
  c.fillStyle = css(accent); c.fillRect(hx + S(0.5), hy - S(1), S(3), S(1));
  const spikes = variant === 'paragon' ? 5 : variant === 'ascended' ? 4 : 3;
  for (let k = 0; k < spikes; k++) { const x = hx - S(3) + (k / (spikes - 1)) * S(6); fillTri(c, x - S(1.2), hy - S(3.5), x, hy - S(8 + (k % 2) * 3), x + S(1.2), hy - S(3.5), lit(accent, 1.15)); }
  glow(c, hx, hy - S(6), S(7), accent, 0.45);
  // front arm: crackling lightning fist, raised to strike
  const fh = pose.attack ? { x: cx + S(14), y: fy - S(40) + bob } : { x: cx + S(13), y: fy - S(18) + bob };
  limb(c, cx + S(7), fy - S(29) + bob, fh.x, fh.y, S(4), body, 1.05);
  glow(c, fh.x, fh.y, S(6), 0xa0d0ff, 0.8);
  for (let k = 0; k < 3; k++) bolt(c, fh.x, fh.y, fh.x + Math.cos(k * 2.1 + ph) * S(7), fh.y + Math.sin(k * 2.1 + ph) * S(7), S, k + 3);
  if (variant === 'paragon') for (let k = 0; k < 3; k++) bolt(c, hx, hy - S(6), hx + (k - 1) * S(9), hy - S(11), S, k + 11);
}

// ------------------------------------------------------------------ Cogspark machines

const GOBLIN = 0x7aa04a;
const RIVET = 0xd8c8a0;

export function rivets(c: Ctx, x0: number, y0: number, x1: number, y1: number, n: number, S: SFn) {
  c.fillStyle = css(RIVET, 0.85);
  for (let i = 0; i < n; i++) { const t = n === 1 ? 0.5 : i / (n - 1); c.beginPath(); c.arc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, S(0.45), 0, TAU); c.fill(); }
}

/** Riveted metal box (side view), lit from the upper left. */
export function plate(c: Ctx, x: number, y: number, w: number, h: number, color: number, S: SFn, l = 1) {
  c.fillStyle = grad(c, 0, y, 0, y + h, [[0, lit(color, 1.3 * l)], [0.35, lit(color, 1 * l)], [1, lit(color, 0.6 * l)]]);
  c.fillRect(x, y, w, h);
  c.strokeStyle = css(0x000000, 0.35); c.lineWidth = S(0.5); c.strokeRect(x, y, w, h);
  rivets(c, x + S(1), y + S(1), x + w - S(1), y + S(1), Math.max(2, Math.round(w / S(4))), S);
}

/**
 * Goblin trooper: a small green goblin in goggles. 'flamer' carries a fuel tank and a nozzle,
 * 'sergeant' a bigger rig and grenades, 'bomber' (Lunatic Goblin) runs with a lit powder keg overhead.
 */
function goblin(c: Ctx, cx: number, fy: number, S: SFn, body: number, accent: number, pose: Pose, variant?: string) {
  const bomber = variant === 'bomber', sgt = variant === 'sergeant';
  humanoid(c, cx, fy, S, {
    h: bomber ? 20 : 21, body, accent, helmet: sgt ? 'helm' : 'goggles', armor: 'leather', skin: GOBLIN, ears: true, attackArm: bomber ? 'raise' : 'thrust',
    back: (cc) => {
      if (bomber) return;
      // fuel tank(s) on the back
      const tx = cx - S(8), ty = fy - S(19);
      for (let k = 0; k < (sgt ? 2 : 1); k++) {
        const x = tx - k * S(3.2);
        cc.fillStyle = grad(cc, x - S(2), 0, x + S(2), 0, [[0, lit(0xc04a2a, 1.25)], [1, lit(0xc04a2a, 0.6)]]);
        cc.beginPath(); cc.ellipse(x, ty, S(2.2), S(5), 0, 0, TAU); cc.fill();
        cc.strokeStyle = css(0x2a1a10, 0.6); cc.lineWidth = S(0.5); cc.beginPath(); cc.moveTo(x - S(2), ty - S(1)); cc.lineTo(x + S(2), ty - S(1)); cc.stroke();
      }
    },
    front: (cc, hand) => {
      if (bomber) {
        // powder keg held above the head, fuse sparking (raised higher for the throw)
        const kx = cx + S(2), ky = fy - S(pose.attack ? 30 : 27) + (pose.moving ? -Math.abs(Math.cos(pose.ph * TAU)) * S(1.2) : 0);
        cc.strokeStyle = css(lit(GOBLIN, 1)); cc.lineWidth = S(1.8); cc.beginPath(); cc.moveTo(hand.x, hand.y); cc.lineTo(kx + S(2), ky + S(2.5)); cc.stroke();
        cc.fillStyle = grad(cc, kx - S(4), 0, kx + S(4), 0, [[0, lit(WOOD, 1.3)], [1, lit(WOOD, 0.6)]]);
        cc.beginPath(); cc.ellipse(kx, ky, S(5.6), S(4.8), 0, 0, TAU); cc.fill();
        cc.strokeStyle = css(0x3a3a3a); cc.lineWidth = S(0.7);
        for (const d of [-2.2, 2.2]) { cc.beginPath(); cc.moveTo(kx + S(d), ky - S(4.6)); cc.lineTo(kx + S(d), ky + S(4.6)); cc.stroke(); }
        cc.fillStyle = css(0xfff0d0); cc.font = `bold ${S(5.5)}px sans-serif`; cc.fillText('!', kx - S(1.1), ky + S(2));
        cc.strokeStyle = css(0x3a2a1a); cc.lineWidth = S(0.7); cc.beginPath(); cc.moveTo(kx + S(2.5), ky - S(4)); cc.quadraticCurveTo(kx + S(5), ky - S(8), kx + S(6.5), ky - S(8)); cc.stroke();
        glow(cc, kx + S(6.5), ky - S(8), S(4), accent, 0.95);
        return;
      }
      // flame nozzle; the attack sprays a cone of fire
      const len = S(sgt ? 9 : 8);
      cc.strokeStyle = css(lit(0x5a5a62, 1.1)); cc.lineWidth = S(1.8);
      cc.beginPath(); cc.moveTo(hand.x - S(2), hand.y); cc.lineTo(hand.x + len, hand.y - S(0.5)); cc.stroke();
      cc.strokeStyle = css(0x2a1a10, 0.7); cc.lineWidth = S(0.6);
      cc.beginPath(); cc.moveTo(hand.x - S(2), hand.y + S(0.5)); cc.quadraticCurveTo(cx - S(5), fy - S(10), cx - S(7), fy - S(16)); cc.stroke();
      const nx = hand.x + len, ny = hand.y - S(0.5);
      if (pose.attack) {
        glow(cc, nx + S(8), ny, S(10), accent, 0.7);
        cc.fillStyle = grad(cc, nx, 0, nx + S(16), 0, [[0, 0xffffff, 0.95], [0.3, accent, 0.9], [1, 0xd03010, 0]]);
        cc.beginPath(); cc.moveTo(nx, ny - S(1)); cc.lineTo(nx + S(16), ny - S(6)); cc.quadraticCurveTo(nx + S(19), ny, nx + S(16), ny + S(5)); cc.lineTo(nx, ny + S(1)); cc.fill();
      } else glow(cc, nx + S(0.5), ny, S(1.6), accent, 0.9);
      if (sgt) for (let k = 0; k < 3; k++) { cc.fillStyle = css(0x4a5a3a); cc.beginPath(); cc.arc(cx - S(3) + k * S(2.6), fy - S(9.5), S(1), 0, TAU); cc.fill(); }
    },
  }, pose);
}

/**
 * Goblin tank, side-on: tracks with turning wheels, a riveted hull and a turret. Variants:
 * light (short gun), mine (mine racks and a plough), assault (stubby mortar), heavy (long
 * gun, thick plates), rocket (missile pod).
 */
function tank(c: Ctx, cx: number, fy: number, S: SFn, body: number, accent: number, pose: Pose, variant?: string) {
  const roll = pose.ph * TAU;
  const heavy = variant === 'heavy' || variant === 'rocket';
  const L = S(heavy ? 30 : 26), H = S(heavy ? 8 : 7);
  const x0 = cx - L / 2, ty = fy - S(6);
  softEllipse(c, cx, fy, L * 0.55, S(2.6), 0x000000, 0.35);
  // tracks
  c.fillStyle = css(0x2a2622); c.beginPath(); c.moveTo(x0 + S(2), fy); c.lineTo(x0 + L - S(2), fy); c.quadraticCurveTo(x0 + L + S(2), fy - S(3), x0 + L - S(1), ty); c.lineTo(x0 + S(1), ty); c.quadraticCurveTo(x0 - S(2), fy - S(3), x0 + S(2), fy); c.fill();
  c.strokeStyle = css(0x5a544a); c.lineWidth = S(0.6);
  for (let i = 0; i < 9; i++) { const x = x0 + S(1) + ((i / 9) * (L - S(2)) + (pose.moving ? pose.ph * S(3) : 0)) % (L - S(2)); c.beginPath(); c.moveTo(x, fy - S(0.4)); c.lineTo(x, fy - S(1.4)); c.stroke(); }
  const wheels = heavy ? 5 : 4;
  for (let i = 0; i < wheels; i++) {
    const wx = x0 + S(3) + (i / (wheels - 1)) * (L - S(6)), wy = fy - S(3);
    blob(c, wx, wy, S(2.3), S(2.3), 0x6a6a62, 0.9);
    c.strokeStyle = css(0x2a2622); c.lineWidth = S(0.5); const a = roll + i; c.beginPath(); c.moveTo(wx + Math.cos(a) * S(2), wy + Math.sin(a) * S(2)); c.lineTo(wx - Math.cos(a) * S(2), wy - Math.sin(a) * S(2)); c.stroke();
  }
  // hull with a sloped front
  c.fillStyle = grad(c, 0, ty - H, 0, ty, [[0, lit(body, 1.3)], [0.4, lit(body, 1)], [1, lit(body, 0.6)]]);
  c.beginPath(); c.moveTo(x0, ty); c.lineTo(x0, ty - H); c.lineTo(x0 + L - S(5), ty - H); c.lineTo(x0 + L + S(1), ty - S(2)); c.lineTo(x0 + L, ty); c.closePath(); c.fill();
  c.strokeStyle = css(0x000000, 0.35); c.lineWidth = S(0.5); c.stroke();
  rivets(c, x0 + S(1.5), ty - H + S(1.2), x0 + L - S(6), ty - H + S(1.2), heavy ? 8 : 6, S);
  // faction stripe
  c.fillStyle = css(accent, 0.9); c.fillRect(x0 + S(2), ty - H * 0.45, L - S(8), S(1.2));
  if (heavy) { plate(c, x0 + S(3), ty - H - S(1.5), S(6), S(1.5), body, S, 0.9); plate(c, x0 + L - S(12), ty - H - S(1.5), S(6), S(1.5), body, S, 0.9); }
  // turret
  const tx = cx - S(1), tyy = ty - H - S(heavy ? 5.5 : 5);
  c.fillStyle = grad(c, 0, tyy - S(3), 0, tyy + S(3), [[0, lit(body, 1.35)], [1, lit(body, 0.7)]]);
  c.beginPath(); c.ellipse(tx, tyy + S(1), S(heavy ? 7 : 6), S(4), 0, Math.PI, TAU); c.lineTo(tx + S(heavy ? 7 : 6), tyy + S(2.5)); c.lineTo(tx - S(heavy ? 7 : 6), tyy + S(2.5)); c.fill();
  // goblin commander in the hatch
  c.fillStyle = css(lit(GOBLIN, 1)); c.beginPath(); c.arc(tx - S(2), tyy - S(3.5), S(1.8), 0, TAU); c.fill();
  fillTri(c, tx - S(3), tyy - S(4), tx - S(6.5), tyy - S(5.5), tx - S(3), tyy - S(2.8), GOBLIN);
  c.fillStyle = css(0xb08a4a); c.beginPath(); c.arc(tx - S(1.2), tyy - S(4), S(0.8), 0, TAU); c.fill();
  // armament
  const gx = tx + S(4), gy = tyy;
  const flash = (x: number, y: number, r: number) => { if (!pose.attack) return; glow(c, x, y, S(r * 1.8), 0xffc050, 0.9); c.fillStyle = css(0xffffff); c.beginPath(); c.arc(x, y, S(r * 0.5), 0, TAU); c.fill(); };
  switch (variant) {
    case 'assault': {
      // stubby mortar angled up
      c.save(); c.translate(gx, gy); c.rotate(-0.55);
      plate(c, 0, -S(2), S(9), S(4), shade(body, 0.85), S); c.restore();
      flash(gx + Math.cos(-0.55) * S(10), gy + Math.sin(-0.55) * S(10), 3);
      break;
    }
    case 'rocket': {
      plate(c, tx - S(3), tyy - S(8), S(10), S(5), shade(body, 0.9), S);
      for (let k = 0; k < 3; k++) { c.fillStyle = css(0x1a1a1a); c.beginPath(); c.arc(tx + S(7), tyy - S(6.8) + k * S(1.6), S(0.6), 0, TAU); c.fill(); }
      if (pose.attack) { fillTri(c, tx + S(8), tyy - S(7), tx + S(16), tyy - S(9), tx + S(8), tyy - S(5), 0xd0d0d0); glow(c, tx + S(7), tyy - S(6), S(4), 0xffa040, 0.9); }
      // and the main gun
      c.strokeStyle = css(lit(shade(body, 0.8), 1)); c.lineWidth = S(2); c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + S(14), gy); c.stroke();
      break;
    }
    case 'mine': {
      // mine racks along the hull and a plough at the front
      for (let k = 0; k < 3; k++) { blob(c, x0 + S(5) + k * S(4), ty - H - S(1.5), S(1.6), S(1.1), 0x4a4a3a, 1); c.fillStyle = css(0xff4020); c.beginPath(); c.arc(x0 + S(5) + k * S(4), ty - H - S(2.3), S(0.4), 0, TAU); c.fill(); }
      c.strokeStyle = css(lit(0x6a6a62, 1.1)); c.lineWidth = S(1.2);
      c.beginPath(); c.moveTo(x0 + L, ty - S(1)); c.lineTo(x0 + L + S(5), fy - S(0.5)); c.lineTo(x0 + L + S(2), fy - S(0.5)); c.stroke();
      if (pose.attack) { blob(c, x0 - S(2), fy - S(1.5), S(2), S(1.2), 0x4a4a3a); glow(c, x0 - S(2), fy - S(2.3), S(2), 0xff4020, 0.9); }
      break;
    }
    default: {
      const len = S(variant === 'heavy' ? 17 : 11), w = S(variant === 'heavy' ? 2.4 : 1.8);
      c.strokeStyle = css(lit(shade(body, 0.8), 1)); c.lineWidth = w; c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + len, gy); c.stroke();
      c.strokeStyle = css(0xffffff, 0.3); c.lineWidth = w * 0.35; c.beginPath(); c.moveTo(gx, gy - w * 0.25); c.lineTo(gx + len, gy - w * 0.25); c.stroke();
      c.fillStyle = css(shade(body, 0.6)); c.fillRect(gx + len - S(1), gy - w * 0.75, S(2), w * 1.5);
      flash(gx + len + S(2), gy, variant === 'heavy' ? 3.5 : 2.5);
    }
  }
}

/** Goblin rotorcraft: a riveted cockpit pod, rotor blur on top and a tail rotor; 'gyro' drops bombs. */
function copter(c: Ctx, cx: number, fy: number, S: SFn, body: number, accent: number, pose: Pose, variant?: string) {
  const y = fy - S(32) + (pose.moving ? Math.sin(pose.ph * TAU) * S(0.8) : 0);
  const gyro = variant === 'gyro';
  // tail boom and tail rotor
  c.strokeStyle = css(lit(body, 0.8)); c.lineWidth = S(2);
  c.beginPath(); c.moveTo(cx - S(4), y); c.lineTo(cx - S(16), y - S(3)); c.stroke();
  const tr = pose.ph * TAU * 3;
  c.strokeStyle = css(0xd0d0c8, 0.8); c.lineWidth = S(0.8);
  c.beginPath(); c.moveTo(cx - S(16) + Math.cos(tr) * S(3), y - S(3) + Math.sin(tr) * S(3)); c.lineTo(cx - S(16) - Math.cos(tr) * S(3), y - S(3) - Math.sin(tr) * S(3)); c.stroke();
  // pod
  c.fillStyle = grad(c, 0, y - S(5), 0, y + S(5), [[0, lit(body, 1.35)], [0.5, lit(body, 1)], [1, lit(body, 0.55)]]);
  c.beginPath(); c.ellipse(cx, y, S(gyro ? 8 : 7), S(gyro ? 5 : 4.4), 0, 0, TAU); c.fill();
  c.strokeStyle = css(0x000000, 0.35); c.lineWidth = S(0.5); c.stroke();
  rivets(c, cx - S(5), y + S(2.5), cx + S(4), y + S(2.5), 4, S);
  // canopy with goblin pilot
  c.fillStyle = css(0x9ad0e0, 0.55); c.beginPath(); c.ellipse(cx + S(3), y - S(1.5), S(3.5), S(2.8), 0, Math.PI * 1.05, TAU * 0.98); c.fill();
  c.fillStyle = css(GOBLIN); c.beginPath(); c.arc(cx + S(2.6), y - S(2), S(1.5), 0, TAU); c.fill();
  c.fillStyle = css(0xb08a4a); c.beginPath(); c.arc(cx + S(3.4), y - S(2.4), S(0.6), 0, TAU); c.fill();
  c.fillStyle = css(accent, 0.9); c.fillRect(cx - S(6), y - S(0.6), S(5), S(1.1));
  // skids
  c.strokeStyle = css(0x3a3a3a); c.lineWidth = S(0.7);
  c.beginPath(); c.moveTo(cx - S(5), y + S(4)); c.lineTo(cx - S(5), y + S(6)); c.moveTo(cx + S(4), y + S(4)); c.lineTo(cx + S(4), y + S(6)); c.moveTo(cx - S(8), y + S(6)); c.lineTo(cx + S(7), y + S(6)); c.stroke();
  // guns
  c.strokeStyle = css(0x2a2a2a); c.lineWidth = S(1); c.beginPath(); c.moveTo(cx + S(6), y + S(2)); c.lineTo(cx + S(11), y + S(2)); c.stroke();
  if (pose.attack) glow(c, cx + S(12), y + S(2), S(3.5), 0xffd060, 0.9);
  if (gyro) {
    blob(c, cx - S(1), y + S(7), S(2.2), S(1.4), 0x3a3a32);
    if (pose.attack) { blob(c, cx - S(1), y + S(13), S(1.8), S(1.2), 0x3a3a32); fillTri(c, cx - S(2), y + S(11), cx, y + S(11), cx - S(1), y + S(9.5), 0xd0d0c8); }
  }
  // rotor: mast and a blurred disc
  c.strokeStyle = css(0x3a3a3a); c.lineWidth = S(1); c.beginPath(); c.moveTo(cx, y - S(4.5)); c.lineTo(cx, y - S(7)); c.stroke();
  c.fillStyle = css(0xe0e0d8, 0.25); c.beginPath(); c.ellipse(cx, y - S(7), S(gyro ? 17 : 15), S(2), 0, 0, TAU); c.fill();
  const a = pose.ph * TAU * 2;
  c.strokeStyle = css(0xe0e0d8, 0.85); c.lineWidth = S(0.9);
  c.beginPath(); c.moveTo(cx + Math.cos(a) * S(15), y - S(7) + Math.sin(a) * S(1.8)); c.lineTo(cx - Math.cos(a) * S(15), y - S(7) - Math.sin(a) * S(1.8)); c.stroke();
}

/** Clockwork golem: boxy riveted plates, piston legs, a glowing eye slit and big fists; 'adamant' is blue steel with a core gem. */
function ironGolem(c: Ctx, cx: number, fy: number, S: SFn, body: number, accent: number, pose: Pose, variant?: string) {
  const ph = pose.ph * TAU;
  const bob = pose.moving ? -Math.abs(Math.cos(ph)) * S(1) : 0;
  softEllipse(c, cx, fy, S(11), S(2.8), 0x000000, 0.3);
  // piston legs
  for (const [dx, off, l] of [[-4, 0, 0.75], [4, Math.PI, 1]] as const) {
    const a = pose.moving ? Math.sin(ph + off) * 0.3 : 0;
    const kx = cx + S(dx) + Math.sin(a) * S(4), ky = fy - S(7);
    limb(c, cx + S(dx), fy - S(14) + bob, kx, ky, S(3.4), shade(body, 0.8), l);
    limb(c, kx, ky, kx + Math.sin(a) * S(2), fy - S(1), S(2.6), 0x8a8a7a, l);
    plate(c, kx - S(3) + Math.sin(a) * S(2), fy - S(2.2), S(6), S(2.2), shade(body, 0.7), S, l);
  }
  // back arm
  limb(c, cx - S(7), fy - S(26) + bob, cx - S(10), fy - S(15) + bob, S(3.5), shade(body, 0.8), 0.7);
  plate(c, cx - S(13), fy - S(16) + bob, S(5), S(5), body, S, 0.7);
  // torso
  plate(c, cx - S(8), fy - S(30) + bob, S(16), S(16), body, S);
  plate(c, cx - S(9), fy - S(32) + bob, S(18), S(4), shade(body, 1.05), S);
  if (variant === 'adamant') {
    glow(c, cx, fy - S(22) + bob, S(6), accent, 0.7);
    fillTri(c, cx, fy - S(26) + bob, cx - S(2.5), fy - S(22) + bob, cx + S(2.5), fy - S(22) + bob, lit(accent, 1.3));
    fillTri(c, cx, fy - S(18) + bob, cx - S(2.5), fy - S(22) + bob, cx + S(2.5), fy - S(22) + bob, lit(accent, 0.8));
  } else {
    // furnace grill
    c.fillStyle = css(0x2a1a10); c.fillRect(cx - S(4), fy - S(24) + bob, S(8), S(5));
    glow(c, cx, fy - S(21.5) + bob, S(5), 0xff8030, 0.7);
    c.strokeStyle = css(lit(body, 0.8)); c.lineWidth = S(0.6); for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(cx - S(4), fy - S(23.5) + bob + k * S(1.2)); c.lineTo(cx + S(4), fy - S(23.5) + bob + k * S(1.2)); c.stroke(); }
  }
  // head: a small helm block with an eye slit
  plate(c, cx - S(2), fy - S(37) + bob, S(8), S(5.5), shade(body, 1.05), S);
  c.fillStyle = css(accent); c.fillRect(cx + S(1), fy - S(35) + bob, S(4.5), S(1.1));
  glow(c, cx + S(3), fy - S(34.5) + bob, S(3), accent, 0.7);
  // smoke stack
  c.fillStyle = css(0x3a3a3a); c.fillRect(cx - S(7), fy - S(37) + bob, S(2.2), S(5));
  // front arm and fist; raised for the slam
  const fx = cx + S(pose.attack ? 12 : 11), fyy = pose.attack ? fy - S(38) + bob : fy - S(14) + bob;
  limb(c, cx + S(7), fy - S(26) + bob, fx, fyy + S(2), S(3.8), shade(body, 0.9), 1.05);
  plate(c, fx - S(3.5), fyy - S(2), S(7), S(6.5), body, S, 1.1);
}

/** Goblin Shredder: a two-legged lumber walker with a cockpit, smoke stack and spinning saw blades. */
function shredder(c: Ctx, cx: number, fy: number, S: SFn, body: number, accent: number, pose: Pose) {
  const ph = pose.ph * TAU;
  const bob = pose.moving ? -Math.abs(Math.sin(ph)) * S(1.2) : 0;
  softEllipse(c, cx, fy, S(12), S(3), 0x000000, 0.3);
  // bird legs
  for (const [dx, off, l] of [[-3, 0, 0.75], [3, Math.PI, 1]] as const) {
    const a = pose.moving ? Math.sin(ph + off) * 0.45 : 0;
    const kx = cx + S(dx) - S(4) + Math.sin(a) * S(3), ky = fy - S(9);
    limb(c, cx + S(dx), fy - S(17) + bob, kx, ky, S(2.6), 0x5a5a62, l);
    limb(c, kx, ky, kx + S(4) + Math.sin(a) * S(4), fy - S(1), S(2.2), 0x5a5a62, l);
    fillTri(c, kx + S(1) + Math.sin(a) * S(4), fy, kx + S(7) + Math.sin(a) * S(4), fy, kx + S(4) + Math.sin(a) * S(4), fy - S(2), 0x3a3a3a);
  }
  // hull
  c.fillStyle = grad(c, 0, fy - S(30), 0, fy - S(16), [[0, lit(body, 1.3)], [1, lit(body, 0.6)]]);
  c.beginPath(); c.moveTo(cx - S(9), fy - S(17) + bob); c.lineTo(cx - S(8), fy - S(29) + bob); c.lineTo(cx + S(5), fy - S(30) + bob); c.lineTo(cx + S(9), fy - S(21) + bob); c.lineTo(cx + S(6), fy - S(16) + bob); c.closePath(); c.fill();
  c.strokeStyle = css(0x000000, 0.35); c.lineWidth = S(0.5); c.stroke();
  rivets(c, cx - S(7), fy - S(27.5) + bob, cx + S(4), fy - S(28.5) + bob, 5, S);
  // cockpit with goblin driver
  c.fillStyle = css(0x2a2a2a); c.fillRect(cx - S(3), fy - S(28) + bob, S(6), S(4.5));
  c.fillStyle = css(GOBLIN); c.beginPath(); c.arc(cx, fy - S(26) + bob, S(1.6), 0, TAU); c.fill();
  c.fillStyle = css(0xb08a4a); c.beginPath(); c.arc(cx + S(0.8), fy - S(26.4) + bob, S(0.6), 0, TAU); c.fill();
  // smoke stack
  c.fillStyle = css(0x3a3a3a); c.fillRect(cx - S(8), fy - S(36) + bob, S(2.4), S(8));
  c.fillStyle = css(0x6a6a6a, 0.6); c.beginPath(); c.arc(cx - S(7), fy - S(38) + bob, S(2), 0, TAU); c.fill();
  // saw arm with two blades
  const sx = cx + S(pose.attack ? 15 : 13), sy = fy - S(pose.attack ? 22 : 20) + bob;
  c.strokeStyle = css(lit(body, 0.9)); c.lineWidth = S(2.4); c.beginPath(); c.moveTo(cx + S(6), fy - S(22) + bob); c.lineTo(sx, sy); c.stroke();
  const saw = (x: number, y: number, r: number) => {
    const spin = pose.ph * TAU * 2;
    c.fillStyle = radial(c, x - r * 0.3, y - r * 0.3, r * 1.3, [[0, 0xf0f0f0], [0.7, 0xb8bec8], [1, 0x6a6e74]]);
    c.beginPath();
    for (let k = 0; k < 12; k++) { const a = spin + (k / 12) * TAU; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); c.lineTo(x + Math.cos(a + 0.26) * r * 0.8, y + Math.sin(a + 0.26) * r * 0.8); }
    c.closePath(); c.fill();
    c.fillStyle = css(accent); c.beginPath(); c.arc(x, y, r * 0.25, 0, TAU); c.fill();
    if (pose.attack || pose.moving) { c.strokeStyle = css(0xffffff, 0.4); c.lineWidth = S(0.5); c.beginPath(); c.arc(x, y, r * 0.65, spin, spin + 2); c.stroke(); }
  };
  saw(sx, sy - S(4), S(4.2));
  saw(sx + S(1), sy + S(4), S(4.2));
  if (pose.attack) for (let k = 0; k < 4; k++) { c.fillStyle = css(0xd8b080); c.fillRect(sx + S(5 + k * 1.5), sy - S(2) + k * S(1.3), S(1), S(0.6)); }
}

/** Goliath: a towering goblin war mech with shoulder missile pods and a cannon arm; 'doom' bristles with spikes. */
function goliath(c: Ctx, cx: number, fy: number, S: SFn, body: number, accent: number, pose: Pose, variant?: string) {
  const ph = pose.ph * TAU;
  const bob = pose.moving ? -Math.abs(Math.cos(ph)) * S(1.2) : 0;
  softEllipse(c, cx, fy, S(13), S(3.2), 0x000000, 0.35);
  // legs: thigh, reversed shin, big feet
  for (const [dx, off, l] of [[-4, 0, 0.75], [4, Math.PI, 1]] as const) {
    const a = pose.moving ? Math.sin(ph + off) * 0.35 : 0;
    const kx = cx + S(dx) + S(3) + Math.sin(a) * S(4), ky = fy - S(10);
    limb(c, cx + S(dx), fy - S(19) + bob, kx, ky, S(4.4), shade(body, 0.85), l);
    limb(c, kx, ky, cx + S(dx) + Math.sin(a) * S(6), fy - S(2), S(3.6), shade(body, 0.75), l);
    plate(c, cx + S(dx) - S(4) + Math.sin(a) * S(6), fy - S(3), S(8), S(3), shade(body, 0.7), S, l);
  }
  // back shoulder pod
  plate(c, cx - S(12), fy - S(38) + bob, S(8), S(7), shade(body, 0.85), S, 0.75);
  // body
  plate(c, cx - S(9), fy - S(34) + bob, S(18), S(16), body, S);
  c.fillStyle = css(accent, 0.9); c.fillRect(cx - S(9), fy - S(25) + bob, S(18), S(1.6));
  // cockpit dome with the goblin pilot
  c.fillStyle = css(0x9ad0e0, 0.55); c.beginPath(); c.arc(cx + S(3), fy - S(34) + bob, S(4), Math.PI, TAU); c.fill();
  c.fillStyle = css(GOBLIN); c.beginPath(); c.arc(cx + S(3), fy - S(35) + bob, S(1.6), 0, TAU); c.fill();
  // missile pod on the front shoulder
  plate(c, cx - S(5), fy - S(42) + bob, S(10), S(7), shade(body, 1.05), S);
  for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) { c.fillStyle = css(0x1a1a1a); c.beginPath(); c.arc(cx - S(2.5) + k * S(2.6), fy - S(40) + bob + r * S(2.8), S(0.8), 0, TAU); c.fill(); }
  if (pose.attack) {
    for (let k = 0; k < 2; k++) { const mx = cx + S(6 + k * 5), my = fy - S(46 + k * 3) + bob; fillTri(c, mx, my - S(1), mx + S(5), my - S(3), mx, my + S(1), 0xd0d0d0); glow(c, mx - S(1), my, S(3), 0xffa040, 0.9); }
  }
  if (variant === 'doom') {
    for (let k = 0; k < 4; k++) fillTri(c, cx - S(8) + k * S(4), fy - S(34) + bob, cx - S(7) + k * S(4), fy - S(38) + bob, cx - S(6) + k * S(4), fy - S(34) + bob, 0x8a8a8a);
    glow(c, cx, fy - S(28) + bob, S(8), 0xff3a1a, 0.45);
  } else if (variant === 'mk2') {
    plate(c, cx - S(10), fy - S(22) + bob, S(20), S(3), shade(body, 0.9), S);
  }
  // cannon arm
  const ang = pose.attack ? -0.1 : 0.35;
  c.save(); c.translate(cx + S(8), fy - S(28) + bob); c.rotate(ang);
  plate(c, 0, -S(2.5), S(10), S(5), shade(body, 0.95), S);
  c.fillStyle = css(shade(body, 0.6)); c.fillRect(S(10), -S(1.6), S(7), S(3.2));
  c.restore();
  if (pose.attack) glow(c, cx + S(8) + Math.cos(ang) * S(18), fy - S(28) + bob + Math.sin(ang) * S(18), S(5), 0xffc050, 0.9);
}
