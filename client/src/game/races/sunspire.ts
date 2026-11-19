import { BUILDING_PAINTERS, PLINTHS, UNIT_PAINTERS } from '../painters';
import { css, fillPoly, grad, lit, mix, radial, rng, shade, softEllipse, type Ctx } from '../paint';
import { blob, bolt, bow, fillTri, glow, humanoid, limb, staff } from '../units';
import {
  A, HX, HY, boxGeo, centreOf, cornerFor, coneRoof, dome, drum, faceLeft, faceRight, faceTop, glowAt, lerp, pt, roundTower, stoneTop, stoneWall, windowAt,
  type Box, type FacePainter,
} from '../structures';

/**
 * Sunspire Concord (high elves): fair-skinned elves with long golden hair in crimson and gold,
 * sorceresses with floating tomes, a gilded ballista and fiery dragonhawks. Buildings are white
 * marble with golden spires, crimson banners, domes and floating crystals, on gold-inlaid marble.
 */

const SKIN = 0xf0d8c0;
const HAIR = 0xf0d070;
const GOLD = 0xd8b040;
const TAU = Math.PI * 2;
type SFn = (v: number) => number;

function goldHair(c: Ctx, head: { x: number; y: number }, S: SFn) {
  c.fillStyle = grad(c, head.x - S(7), 0, head.x + S(2), 0, [[0, lit(HAIR, 0.8)], [1, lit(HAIR, 1.2)]]);
  c.beginPath(); c.moveTo(head.x + S(2), head.y - S(3.2)); c.quadraticCurveTo(head.x - S(6), head.y - S(4), head.x - S(5), head.y + S(8)); c.lineTo(head.x - S(2), head.y + S(2)); c.closePath(); c.fill();
}

/** A long curved elven sword. */
const elvenBlade = (S: SFn, attack: boolean, color = 0xf0f4ff) => (c: Ctx, hand: { x: number; y: number }) => {
  const ang = attack ? -0.05 : -1.2;
  const len = S(13);
  const tx = hand.x + Math.cos(ang) * len, ty = hand.y + Math.sin(ang) * len;
  c.strokeStyle = css(color); c.lineWidth = S(1.4);
  c.beginPath(); c.moveTo(hand.x, hand.y); c.quadraticCurveTo((hand.x + tx) / 2 + Math.sin(ang) * S(2), (hand.y + ty) / 2 - Math.cos(ang) * S(2), tx, ty); c.stroke();
  c.strokeStyle = css(GOLD); c.lineWidth = S(1.4);
  c.beginPath(); c.moveTo(hand.x - Math.sin(ang) * S(2.2), hand.y + Math.cos(ang) * S(2.2)); c.lineTo(hand.x + Math.sin(ang) * S(2.2), hand.y - Math.cos(ang) * S(2.2)); c.stroke();
  if (attack) glow(c, tx, ty, S(4), 0xfff0c0, 0.5);
};

// ------------------------------------------------------------------ units

UNIT_PAINTERS.highelf = (c, u, cx, fy, S, pose) => {
  const m = u.model, master = m.variant === 'master';
  const r = humanoid(c, cx, fy, S, {
    h: 27, body: m.body, accent: m.accent, helmet: master ? 'circlet' : 'none', armor: master ? 'mail' : 'leather', skin: SKIN, ears: true, attackArm: 'draw',
    back: (cc) => { cc.fillStyle = css(lit(0x6a3a22, 1)); cc.fillRect(cx - S(6), fy - S(24), S(2.4), S(9)); for (let k = 0; k < 3; k++) { cc.fillStyle = css(0xffffff); cc.fillRect(cx - S(6) + k * S(0.8), fy - S(26), S(0.5), S(2)); } },
    front: bow(S, pose.attack, GOLD),
  }, pose);
  goldHair(c, r.head, S);
  // flowing cape in the faction crimson
  c.fillStyle = css(lit(m.body, 0.8), 0.85); c.beginPath(); c.moveTo(cx - S(3), r.shoulder.y); c.quadraticCurveTo(cx - S(10), fy - S(12), cx - S(9), fy - S(3)); c.lineTo(cx - S(4), fy - S(8)); c.fill();
  if (master && pose.attack) glow(c, cx + S(14), fy - S(20), S(4), 0xfff0a0, 0.7);
};

UNIT_PAINTERS.blademaster = (c, u, cx, fy, S, pose) => {
  const m = u.model, elder = m.variant === 'elder';
  // afterimages of the dash
  if (pose.moving || pose.attack) for (let k = 1; k <= 2; k++) softEllipse(c, cx - S(5 * k), fy - S(13), S(4), S(10), m.body, 0.18 / k);
  const r = humanoid(c, cx, fy, S, {
    h: 27, body: m.body, accent: m.accent, helmet: elder ? 'greathelm' : 'helm', armor: 'plate', skin: SKIN, ears: true, attackArm: 'thrust',
    back: elder ? (cc, hand) => elvenBlade(S, pose.attack)(cc, { x: hand.x + S(2), y: hand.y }) : undefined,
    front: elvenBlade(S, pose.attack),
  }, pose);
  goldHair(c, r.head, S);
  // golden pauldron crest
  fillTri(c, cx - S(6), r.shoulder.y + S(1), cx - S(3), r.shoulder.y - S(5), cx, r.shoulder.y + S(1), GOLD);
  if (pose.attack) { c.strokeStyle = css(0xfff0c0, 0.7); c.lineWidth = S(0.8); c.beginPath(); c.arc(cx + S(6), fy - S(18), S(12), -1.2, 0.4); c.stroke(); }
};

UNIT_PAINTERS.sorceress = (c, u, cx, fy, S, pose) => {
  const m = u.model, v = m.variant;
  const wizard = v === 'wizard', blood = v === 'blood';
  glow(c, cx, fy - S(14), S(14), m.accent, 0.2);
  const r = humanoid(c, cx, fy, S, {
    h: wizard ? 29 : 27, body: m.body, accent: m.accent, helmet: wizard ? 'hood' : 'circlet', armor: 'robe', skin: SKIN, ears: true, attackArm: 'raise',
    front: staff(S, m.accent, pose.attack),
  }, pose);
  if (!wizard) goldHair(c, r.head, S);
  // a floating spellbook (wizard) or orbiting fire motes (blood mage)
  const t = pose.ph * TAU;
  if (wizard) {
    const bx = cx - S(9), by = fy - S(24) + Math.sin(t) * S(1.2);
    fillPoly(c, [[bx - S(4), by], [bx, by + S(1.5)], [bx + S(4), by], [bx + S(4), by - S(3)], [bx, by - S(1.5)], [bx - S(4), by - S(3)]], css(0xf0e8d0));
    c.strokeStyle = css(0x6a3ad0); c.lineWidth = S(0.5); c.beginPath(); c.moveTo(bx, by + S(1.5)); c.lineTo(bx, by - S(1.5)); c.stroke();
    glow(c, bx, by - S(1), S(4), m.accent, 0.5);
  }
  if (blood) for (let k = 0; k < 3; k++) { const a = t + (k / 3) * TAU; glow(c, cx + Math.cos(a) * S(8), fy - S(18) + Math.sin(a) * S(3), S(2.4), 0xff6a2a, 0.9); }
  if (pose.attack && !blood) bolt(c, cx + S(8), fy - S(38), cx + S(22), fy - S(24), S, 7, 0xe0f0ff);
};

UNIT_PAINTERS.ballista = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  const roll = pose.ph * TAU;
  const by = fy - S(5);
  softEllipse(c, cx, fy, S(15), S(3), 0x000000, 0.3);
  // white-and-gold carriage
  c.fillStyle = grad(c, 0, by - S(6), 0, by, [[0, lit(m.body, 1.3)], [1, lit(m.body, 0.65)]]);
  c.beginPath(); c.moveTo(cx - S(14), by - S(2)); c.lineTo(cx - S(12), by - S(7)); c.lineTo(cx + S(12), by - S(7)); c.lineTo(cx + S(14), by - S(2)); c.closePath(); c.fill();
  c.strokeStyle = css(GOLD); c.lineWidth = S(0.8); c.beginPath(); c.moveTo(cx - S(12), by - S(6)); c.lineTo(cx + S(12), by - S(6)); c.stroke();
  for (const dx of [-8, 8]) {
    c.strokeStyle = css(GOLD); c.lineWidth = S(1.2); c.beginPath(); c.arc(cx + S(dx), by, S(4.2), 0, TAU); c.stroke();
    for (let k = 0; k < 3; k++) { const a = roll + (k / 3) * Math.PI; c.lineWidth = S(0.6); c.beginPath(); c.moveTo(cx + S(dx) + Math.cos(a) * S(4.2), by + Math.sin(a) * S(4.2)); c.lineTo(cx + S(dx) - Math.cos(a) * S(4.2), by - Math.sin(a) * S(4.2)); c.stroke(); }
  }
  // the bow arms and a long bolt
  const ax = cx + S(2), ay = by - S(11);
  c.strokeStyle = css(lit(m.body, 1.1)); c.lineWidth = S(1.8);
  c.beginPath(); c.moveTo(cx - S(2), by - S(7)); c.lineTo(ax, ay); c.stroke();
  const draw = pose.attack ? S(1) : S(5);
  c.strokeStyle = css(lit(0xc8a060, 1)); c.lineWidth = S(1.4);
  c.beginPath(); c.moveTo(ax + S(4), ay - S(9)); c.quadraticCurveTo(ax + S(8), ay, ax + S(4), ay + S(9)); c.stroke();
  c.strokeStyle = css(0xffffff, 0.8); c.lineWidth = S(0.4); c.beginPath(); c.moveTo(ax + S(4), ay - S(9)); c.lineTo(ax + S(4) - draw, ay); c.lineTo(ax + S(4), ay + S(9)); c.stroke();
  if (!pose.attack) { c.strokeStyle = css(0xd0d4dc); c.lineWidth = S(1); c.beginPath(); c.moveTo(ax - S(3), ay); c.lineTo(ax + S(14), ay); c.stroke(); fillTri(c, ax + S(14), ay - S(1.5), ax + S(17), ay, ax + S(14), ay + S(1.5), GOLD); }
  else glow(c, ax + S(16), ay, S(4), 0xfff0c0, 0.6);
  // elf crew
  humanoid(c, cx - S(17), fy, (v) => S(v) * 0.8, { h: 24, body: 0xa02a3a, accent: GOLD, helmet: 'none', armor: 'leather', skin: SKIN, ears: true }, pose);
};

UNIT_PAINTERS.dragonhawk = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  const y = fy - S(32) + Math.sin(pose.ph * TAU) * S(1);
  const flap = pose.attack ? 0.2 : Math.sin(pose.ph * TAU);
  // two pairs of feathered wings (it is a dragonhawk), a long fiery tail, the rider
  const wing = (dir: number, l: number, off: number) => {
    const tipY = y - S(13) * flap * dir - S(3) + off;
    c.fillStyle = grad(c, cx, y, cx + S(18), tipY, [[0, lit(m.body, 1.1 * l)], [1, lit(m.accent, 1.1 * l)]]);
    c.beginPath(); c.moveTo(cx - S(2), y - S(1) + off); c.quadraticCurveTo(cx + S(6), tipY - S(6), cx + S(19), tipY); c.quadraticCurveTo(cx + S(8), y + S(3) + off, cx - S(2), y + S(2) + off); c.fill();
  };
  wing(-1, 0.7, 0); wing(-1, 0.65, S(4));
  c.strokeStyle = css(lit(m.body, 1)); c.lineWidth = S(1.8); c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx - S(4), y + S(1)); c.quadraticCurveTo(cx - S(14), y + S(4), cx - S(20), y + S(1)); c.stroke();
  for (let k = 0; k < 3; k++) fillTri(c, cx - S(20), y + S(1), cx - S(26), y - S(2) + k * S(2.4), cx - S(20), y + S(2), k % 2 ? GOLD : m.accent);
  blob(c, cx, y + S(1), S(6), S(3.2), m.body);
  blob(c, cx + S(8), y - S(2), S(3), S(2.4), m.body, 1.1);
  fillTri(c, cx + S(10), y - S(2.6), cx + S(14), y - S(1.6), cx + S(10), y - S(0.8), GOLD);
  for (let k = 0; k < 3; k++) fillTri(c, cx + S(6) + k * S(1.2), y - S(4), cx + S(5) + k * S(1.2), y - S(8 - k), cx + S(7) + k * S(1.2), y - S(4), m.accent);
  // rider with a glaive
  c.fillStyle = css(SKIN); c.beginPath(); c.arc(cx - S(1), y - S(8), S(2), 0, TAU); c.fill();
  c.fillStyle = css(HAIR); c.beginPath(); c.ellipse(cx - S(2.4), y - S(8.4), S(1.6), S(2.2), 0.4, 0, TAU); c.fill();
  c.fillStyle = css(0xa02a3a); c.fillRect(cx - S(3), y - S(6), S(4), S(4));
  c.strokeStyle = css(GOLD); c.lineWidth = S(0.9); c.beginPath(); c.moveTo(cx - S(4), y - S(3)); c.lineTo(cx + S(pose.attack ? 14 : 8), y - S(pose.attack ? 4 : 11)); c.stroke();
  if (pose.attack) glow(c, cx + S(15), y - S(4), S(6), 0xffb040, 0.8);
  wing(1, 1.05, 0); wing(1, 1, S(4));
};

// ------------------------------------------------------------------ buildings

/** White marble with gold inlay lines (Sunspire ground). */
PLINTHS.sunspire = (ctx, ox, oy, s, seed) => {
  const r = rng(seed + 21);
  const plinth = boxGeo(ox, oy - 1, s - 0.1, s - 0.1, 3);
  faceLeft(ctx, plinth, stoneWall(0xe0d8c8, seed, 3));
  faceRight(ctx, plinth, stoneWall(0xe0d8c8, seed + 1, 3));
  faceTop(ctx, plinth, (c, U, W) => {
    c.fillStyle = css(lit(0xd8d0c0, 1.12)); c.fillRect(0, 0, U, W);
    for (let i = 0; i < 30; i++) { c.strokeStyle = css(0x9a9080, 0.2); c.lineWidth = 0.008; c.beginPath(); const u = r() * U, w = r() * W; c.moveTo(u, w); c.lineTo(u + (r() - 0.5) * 0.4, w + (r() - 0.5) * 0.3); c.stroke(); }
    c.strokeStyle = css(GOLD, 0.8); c.lineWidth = 0.02; c.strokeRect(0.1, 0.1, U - 0.2, W - 0.2);
    c.beginPath(); c.moveTo(U / 2, 0.1); c.lineTo(U / 2, W - 0.1); c.moveTo(0.1, W / 2); c.lineTo(U - 0.1, W / 2); c.stroke();
  });
};

function marbleWall(seed: number, accent: number): FacePainter {
  const base = stoneWall(0xe8e0d0, seed, 7);
  return (c, U, V, l) => {
    base(c, U, V, l);
    c.fillStyle = css(lit(GOLD, l)); c.fillRect(0, V - 2.5, U, 1.4); c.fillRect(0, 3, U, 1.2);
    // slender pilasters
    for (let u = 0.05; u < U; u += 0.45) { c.fillStyle = css(lit(0xf8f4ec, l)); c.fillRect(u, 4, 0.06, V - 7); }
    c.fillStyle = css(accent, 0.15); c.fillRect(0, 0, U, V);
  };
}

/** Golden onion-tipped spire on a round marble tower. */
function goldSpire(ctx: Ctx, x: number, by: number, rx: number, h: number, seed: number, roof: number) {
  roundTower(ctx, x, by, rx, h, 0xe8e0d0, seed);
  const top = by - h;
  coneRoof(ctx, x, top, rx + 2, rx * 3.2, roof, seed + 1);
  ctx.fillStyle = radial(ctx, x - 1, top - rx * 3.2 - 3, 4, [[0, 0xfff0a0], [1, GOLD]]); ctx.beginPath(); ctx.arc(x, top - rx * 3.2 - 2, 2.6, 0, TAU); ctx.fill();
  return pt(x, top - rx * 3.2 - 5);
}

function pennant(ctx: Ctx, x: number, y: number, color: number) {
  ctx.strokeStyle = css(GOLD); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 12); ctx.stroke();
  fillPoly(ctx, [[x, y - 12], [x + 12, y - 9], [x, y - 6]], css(color));
  A.flags.push(pt(x, y - 12));
}

function marbleHall(ctx: Ctx, st: Parameters<typeof BUILDING_PAINTERS[string]>[2], k: number, kb: number, h: number, roof: number, accent: number): Box {
  const [x, y] = st.inset(k);
  const g = boxGeo(x, y, k, kb, h);
  const wall = marbleWall(st.seed, accent);
  faceLeft(ctx, g, (c, U, V, l) => { wall(c, U, V, l); windowAt(c, U * 0.15, V * 0.45, 0.13, 7, l, true); windowAt(c, U * 0.75, V * 0.45, 0.13, 7, l, true); c.fillStyle = css(lit(0x4a2a1a, l)); c.beginPath(); c.ellipse(U * 0.47, 0, 0.13, Math.min(V * 0.6, 13), 0, 0, Math.PI); c.fill(); });
  faceRight(ctx, g, (c, U, V, l) => { wall(c, U, V, l); windowAt(c, U * 0.4, V * 0.45, 0.14, 7, l, true); });
  stoneTop(ctx, g, 0xe0d8c8);
  void roof;
  return g;
}

BUILDING_PAINTERS.elfrange = (ctx, def, st) => {
  const m = def.model;
  const g = marbleHall(ctx, st, 1.7, 1.2, st.H * 0.45, m.roof, m.roof);
  const tip = goldSpire(ctx, g.tB.x + 10, g.tB.y + 12, 7, st.H * 0.8, st.seed, m.roof);
  // archery targets on the lawn
  for (let k = 0; k < 2; k++) {
    const p = pt(g.F.x - 8 - k * 14, g.F.y - 1);
    ctx.strokeStyle = css(0x5a3a22); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x - 3, p.y); ctx.lineTo(p.x, p.y - 10); ctx.lineTo(p.x + 3, p.y); ctx.stroke();
    for (const [rr, col] of [[5, 0xf0e8d8], [3.5, m.roof], [1.8, GOLD]] as const) { ctx.fillStyle = css(col); ctx.beginPath(); ctx.ellipse(p.x, p.y - 11, rr * 0.8, rr, 0, 0, TAU); ctx.fill(); }
  }
  pennant(ctx, tip.x, tip.y, m.roof);
};

BUILDING_PAINTERS.honorhall = (ctx, def, st) => {
  const m = def.model;
  const g = marbleHall(ctx, st, 1.8, 1.5, st.H * 0.55, m.roof, 0xa02a3a);
  dome(ctx, g.c, 18, st.H * 0.55, m.roof);
  // crossed blades over the door
  const p = lerp(g.tL, g.tF, 0.5);
  for (const d of [-1, 1]) { ctx.strokeStyle = css(0xf0f4ff); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(p.x - d * 8, p.y + 10); ctx.quadraticCurveTo(p.x, p.y - 2, p.x + d * 8, p.y - 6); ctx.stroke(); }
  pennant(ctx, g.tR.x - 2, g.tR.y, 0xa02a3a);
};

BUILDING_PAINTERS.wizardspire = (ctx, def, st) => {
  const m = def.model;
  const [x, y] = st.stand(1.3);
  const by = y - 6;
  drum(ctx, x, by, 22, 6, 0xe0d8c8, 0xd8d0c0);
  const tip = goldSpire(ctx, x, by - 6, 11, st.H * 1.05, st.seed, m.roof);
  // floating crystal orbs circling the tip
  for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU + 0.4; glowAt(ctx, x + Math.cos(a) * 18, tip.y + 16 + Math.sin(a) * 6, 8, m.roof, 0.6); ctx.fillStyle = radial(ctx, x + Math.cos(a) * 18, tip.y + 16 + Math.sin(a) * 6, 3, [[0, 0xffffff], [1, m.roof]]); ctx.beginPath(); ctx.arc(x + Math.cos(a) * 18, tip.y + 16 + Math.sin(a) * 6, 2.4, 0, TAU); ctx.fill(); }
  A.glow.push(pt(x, tip.y + 16));
  pennant(ctx, x + 22, by - 4, 0x3a6ac0);
};

BUILDING_PAINTERS.academy = (ctx, def, st) => {
  const m = def.model;
  const g = marbleHall(ctx, st, 1.8, 1.4, st.H * 0.5, m.roof, m.roof);
  // two crimson-capped towers flanking, a fire brazier between
  goldSpire(ctx, g.tL.x + 6, g.tL.y + 14, 6, st.H * 0.55, st.seed + 2, m.roof);
  const tip = goldSpire(ctx, g.tR.x - 6, g.tR.y + 12, 6, st.H * 0.6, st.seed + 3, m.roof);
  glowAt(ctx, g.c.x, g.c.y - 6, 16, 0xff7a2a, 0.6);
  ctx.fillStyle = css(0x3a2a22); ctx.beginPath(); ctx.ellipse(g.c.x, g.c.y - 2, 6, 2.5, 0, 0, TAU); ctx.fill();
  for (let k = 0; k < 3; k++) fillTri(ctx, g.c.x - 4 + k * 4, g.c.y - 2, g.c.x - 2 + k * 4, g.c.y - 12 + (k % 2) * 3, g.c.x + k * 4, g.c.y - 2, k % 2 ? 0xffd060 : 0xff6a2a);
  A.glow.push(pt(g.c.x, g.c.y - 6));
  pennant(ctx, tip.x, tip.y, m.roof);
};

BUILDING_PAINTERS.elfsiege = (ctx, def, st) => {
  const m = def.model;
  const g = marbleHall(ctx, st, 1.8, 1.4, st.H * 0.45, m.roof, 0xd8b040);
  // a great gilded ballista on the roof terrace
  const b = g.c;
  ctx.strokeStyle = css(GOLD); ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(b.x - 10, b.y - 2); ctx.lineTo(b.x + 14, b.y - 10); ctx.stroke();
  ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(b.x + 6, b.y - 7, 12, -2.3, 0.7); ctx.stroke();
  fillTri(ctx, b.x + 14, b.y - 13, b.x + 20, b.y - 11, b.x + 14, b.y - 8, 0xf0f4ff);
  pennant(ctx, g.tR.x - 2, g.tR.y, 0xa02a3a);
};

BUILDING_PAINTERS.hawkportal = (ctx, def, st) => {
  const m = def.model;
  const [x0, y0] = st.inset(1.6);
  const g = boxGeo(x0, y0, 1.6, 1.6, 6);
  const w = stoneWall(0xe8e0d0, st.seed, 3);
  faceLeft(ctx, g, w); faceRight(ctx, g, w); stoneTop(ctx, g, 0xe0d8c8);
  // a soaring golden ring-gate with a fiery portal inside
  const c0 = g.c, R = st.H * 0.65;
  glowAt(ctx, c0.x, c0.y - R - 4, R * 1.3, m.roof, 0.45);
  ctx.fillStyle = radial(ctx, c0.x, c0.y - R - 4, R, [[0, 0xfff8e0, 0.95], [0.5, m.roof, 0.7], [1, 0xa02a1a, 0.2]]);
  ctx.beginPath(); ctx.ellipse(c0.x, c0.y - R - 4, R * 0.55, R * 0.9, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = css(GOLD); ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(c0.x, c0.y - R - 4, R * 0.62, R, 0, 0, TAU); ctx.stroke();
  ctx.strokeStyle = css(0xfff0a0, 0.8); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(c0.x - 1, c0.y - R - 5, R * 0.62, R, 0, Math.PI * 0.9, Math.PI * 1.6); ctx.stroke();
  // feathers flanking
  for (const d of [-1, 1]) for (let k = 0; k < 3; k++) fillTri(ctx, c0.x + d * R * 0.6, c0.y - R * 1.2 + k * 8, c0.x + d * (R * 0.6 + 12), c0.y - R * 1.4 + k * 8, c0.x + d * R * 0.6, c0.y - R * 1.1 + k * 8, k % 2 ? GOLD : m.roof);
  A.glow.push(pt(c0.x, c0.y - R - 4));
  A.flags.push(pt(c0.x, c0.y - 2 * R - 6));
};

BUILDING_PAINTERS.arcanetower = (ctx, def, st) => {
  const m = def.model;
  const [x, y] = st.stand(1.3);
  const by = y - 6;
  drum(ctx, x, by, 16, 5, 0xe0d8c8, 0xd8d0c0);
  roundTower(ctx, x, by - 5, 11, st.H * 0.95, 0xe8e0d0, st.seed);
  const top = by - 5 - st.H * 0.95;
  // an open ring crown holding five floating violet orbs
  ctx.strokeStyle = css(GOLD); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, top, 14, 5, 0, 0, TAU); ctx.stroke();
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * TAU + 0.3, ox = x + Math.cos(a) * 12, oy = top - 8 + Math.sin(a) * 4;
    ctx.strokeStyle = css(GOLD); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 14, top + Math.sin(a) * 5); ctx.lineTo(ox, oy); ctx.stroke();
    glowAt(ctx, ox, oy, 7, m.roof, 0.6);
    ctx.fillStyle = radial(ctx, ox - 1, oy - 1, 3, [[0, 0xffffff], [1, m.roof]]); ctx.beginPath(); ctx.arc(ox, oy, 2.4, 0, TAU); ctx.fill();
  }
  A.glow.push(pt(x, top - 8));
  pennant(ctx, x + 14, by - 2, 0x8a5ae0);
};

BUILDING_PAINTERS.magiccity = (ctx, def, st) => {
  const m = def.model;
  const [x0, y0] = st.inset(1.8);
  const g = boxGeo(x0, y0, 1.8, 1.8, 7);
  const w = marbleWall(st.seed, m.roof);
  faceLeft(ctx, g, w); faceRight(ctx, g, w); stoneTop(ctx, g, 0xe0d8c8);
  // a little skyline of spires and domes (back first)
  goldSpire(ctx, g.tB.x + 2, g.tB.y + 12, 6, st.H * 0.9, st.seed + 1, m.roof);
  goldSpire(ctx, g.tR.x - 8, g.tR.y + 12, 5, st.H * 0.6, st.seed + 2, m.roof);
  dome(ctx, pt(g.c.x - 4, g.c.y + 2), 13, st.H * 0.4, GOLD);
  const tip = goldSpire(ctx, g.tL.x + 10, g.tL.y + 14, 6, st.H * 0.7, st.seed + 3, m.roof);
  // a sheep-shaped glyph floating over the city (the hex)
  const hx = g.c.x + 6, hy = g.c.y - st.H * 0.9;
  glowAt(ctx, hx, hy, 12, 0xff90e0, 0.55);
  ctx.fillStyle = css(0xffe0f8); for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(hx - 4 + k * 2, hy + Math.sin(k) * 1.5, 2.4, 0, TAU); ctx.fill(); }
  ctx.fillStyle = css(0x5a3a4a); ctx.beginPath(); ctx.arc(hx + 6, hy, 1.8, 0, TAU); ctx.fill();
  A.glow.push(pt(hx, hy));
  pennant(ctx, tip.x, tip.y, 0x3a6ac0);
};

BUILDING_PAINTERS.lightobelisk = (ctx, def, st) => {
  const m = def.model;
  const [x0, y0] = st.inset(1.1);
  const g = boxGeo(x0, y0, 1.1, 1.1, 6);
  const w = stoneWall(0xe8e0d0, st.seed, 3);
  faceLeft(ctx, g, w); faceRight(ctx, g, w); stoneTop(ctx, g, 0xe0d8c8);
  const c0 = g.c, h = st.H * 1.1;
  // white obelisk with gold edges and a sun crystal at the tip
  fillPoly(ctx, [[c0.x - 9, c0.y], [c0.x, c0.y + 4], [c0.x, c0.y + 4 - h], [c0.x - 3.5, c0.y - h]], css(lit(0xf0e8d8, 1.05)));
  fillPoly(ctx, [[c0.x, c0.y + 4], [c0.x + 9, c0.y], [c0.x + 3.5, c0.y - h], [c0.x, c0.y + 4 - h]], css(lit(0xf0e8d8, 0.7)));
  ctx.strokeStyle = css(GOLD); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(c0.x, c0.y + 4); ctx.lineTo(c0.x, c0.y + 4 - h); ctx.stroke();
  const tip = pt(c0.x, c0.y - h - 6);
  glowAt(ctx, tip.x, tip.y, 28, m.roof, 0.6);
  ctx.fillStyle = css(0xffffff);
  ctx.beginPath(); for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU, rr = k % 2 ? 3 : 8; ctx.lineTo(tip.x + Math.cos(a) * rr, tip.y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
  A.glow.push(tip);
  A.flags.push(pt(g.tB.x, g.tB.y - 4));
};

BUILDING_PAINTERS.goldshrine = (ctx, def, st) => {
  const m = def.model;
  const [x0, y0] = st.inset(1.8);
  const g = boxGeo(x0, y0, 1.8, 1.8, 9);
  const w = marbleWall(st.seed, GOLD);
  faceLeft(ctx, g, w); faceRight(ctx, g, w); stoneTop(ctx, g, 0xe0d8c8);
  // a ring of slender columns carrying a golden dome, a winged statue inside
  const c0 = g.c;
  const cols = (front: boolean) => {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU; if ((Math.sin(a) > 0) !== front) continue;
      const px = c0.x + Math.cos(a) * 24, py = c0.y + Math.sin(a) * 10;
      ctx.fillStyle = grad(ctx, px - 2, 0, px + 2, 0, [[0, 0xfffaf0], [1, 0xb8b0a0]]); ctx.fillRect(px - 2, py - st.H * 0.8, 4, st.H * 0.8);
      ctx.fillStyle = css(GOLD); ctx.fillRect(px - 2.5, py - st.H * 0.8 - 2, 5, 2);
    }
  };
  cols(false);
  glowAt(ctx, c0.x, c0.y - st.H * 0.45, 24, m.roof, 0.6);
  // the winged figure
  for (const d of [-1, 1]) fillPoly(ctx, [[c0.x, c0.y - st.H * 0.5], [c0.x + d * 14, c0.y - st.H * 0.75], [c0.x + d * 10, c0.y - st.H * 0.45], [c0.x + d * 4, c0.y - st.H * 0.3]], css(lit(0xfff8e0, d < 0 ? 1.05 : 0.8)));
  ctx.fillStyle = css(0xfff8e0); ctx.fillRect(c0.x - 2.5, c0.y - st.H * 0.55, 5, st.H * 0.5); ctx.beginPath(); ctx.arc(c0.x, c0.y - st.H * 0.6, 3, 0, TAU); ctx.fill();
  cols(true);
  dome(ctx, pt(c0.x, c0.y - st.H * 0.82), 26, st.H * 0.5, m.roof);
  A.glow.push(pt(c0.x, c0.y - st.H * 0.45));
  A.flags.push(pt(g.tB.x, g.tB.y - st.H * 0.8));
};

void mix; void shade; void limb; void cornerFor; void HX; void HY; void centreOf; void softEllipse;
