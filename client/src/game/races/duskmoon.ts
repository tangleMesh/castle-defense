import { BUILDING_PAINTERS, PLINTHS, UNIT_PAINTERS } from '../painters';
import { css, fillPoly, grad, lit, mix, radial, rng, shade, softEllipse, type Ctx } from '../paint';
import { blob, bow, fillTri, glow, humanoid, limb, quadruped, staff } from '../units';
import {
  A, HX, HY, LIGHT, boxGeo, centreOf, cornerFor, crystal, drum, faceLeft, faceRight, faceTop, glowAt, lerp, pt, stoneTop, stoneWall, timberWall, windowAt,
  type FacePainter,
} from '../structures';

/**
 * Duskmoon Covenant (night elves): lavender-skinned elves with long ears and moon tattoos,
 * druids in antler crowns, shadow assassins, green-glowing avenging spirits, a glaive cart and
 * butterfly-winged faerie dragons. Buildings are curved silver-and-bark elven architecture with
 * crescent moons, lanterns and moonwells on dark moonlit grass.
 */

const ELF = 0xa898d8;
const HAIR = 0xe8f0ff;
const TAU = Math.PI * 2;

/** Crescent moon (filled) at (x, y), radius r, opening to the right. */
function crescent(c: Ctx, x: number, y: number, r: number, color: number, a = 1) {
  c.save();
  c.fillStyle = css(color, a);
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.globalCompositeOperation = 'destination-out';
  c.beginPath(); c.arc(x + r * 0.45, y - r * 0.15, r * 0.85, 0, TAU); c.fill();
  c.restore();
}

/** Flowing white hair behind an elf's head. */
function elfHair(c: Ctx, head: { x: number; y: number }, S: (v: number) => number, color = HAIR) {
  c.fillStyle = grad(c, head.x - S(6), 0, head.x, 0, [[0, lit(color, 0.75)], [1, lit(color, 1.1)]]);
  c.beginPath(); c.moveTo(head.x - S(1), head.y - S(3.5)); c.quadraticCurveTo(head.x - S(7), head.y - S(2), head.x - S(6), head.y + S(7)); c.lineTo(head.x - S(3), head.y + S(3)); c.closePath(); c.fill();
}

// ------------------------------------------------------------------ units

UNIT_PAINTERS.moonarcher = (c, u, cx, fy, S, pose) => {
  const m = u.model, amazon = m.variant === 'amazon', ranger = m.variant === 'ranger';
  const r = humanoid(c, cx, fy, S, {
    h: amazon ? 29 : 27, body: m.body, accent: m.accent, helmet: amazon ? 'circlet' : 'none', armor: amazon ? 'mail' : 'leather', skin: ELF, ears: true, attackArm: 'draw',
    back: (cc) => {
      // quiver with moon-silver fletching
      cc.fillStyle = css(lit(0x3a2a3a, 1)); cc.fillRect(cx - S(6), fy - S(24), S(2.6), S(9));
      for (let k = 0; k < 3; k++) { cc.fillStyle = css(m.accent); cc.fillRect(cx - S(6) + k * S(0.9), fy - S(26), S(0.6), S(2.2)); }
    },
    front: bow(S, pose.attack, ranger || amazon ? 0xd0d8e8 : 0x6a4a5a),
  }, pose);
  elfHair(c, r.head, S);
  // moon tattoo on the cheek
  crescent(c, r.head.x + S(2), r.head.y + S(0.6), S(0.9), m.accent, 0.95);
  if (amazon) { crescent(c, r.head.x + S(0.4), r.head.y - S(5), S(2.2), 0xffffff); glow(c, r.head.x, r.head.y - S(5), S(4), m.accent, 0.5); }
  if (pose.attack && (ranger || amazon)) {
    // several arrows nocked at once
    c.strokeStyle = css(0xf0f4ff, 0.9); c.lineWidth = S(0.6);
    for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(cx + S(4), fy - S(20) + k * S(1.6)); c.lineTo(cx + S(16), fy - S(21) + k * S(2.8)); c.stroke(); }
  }
};

UNIT_PAINTERS.druid = (c, u, cx, fy, S, pose) => {
  const m = u.model, sage = m.variant === 'sage';
  if (sage) glow(c, cx, fy - S(14), S(16), 0x6ad070, 0.25);
  const r = humanoid(c, cx, fy, S, { h: 28, body: m.body, accent: 0x6a8a4a, helmet: 'antlers', armor: 'robe', skin: ELF, ears: true, attackArm: 'raise', front: staff(S, m.accent, pose.attack) }, pose);
  elfHair(c, r.head, S, 0x2a4a3a);
  // leaf mantle over the shoulders
  for (let k = 0; k < 5; k++) { c.fillStyle = css(lit(0x5aa04a, 0.8 + k * 0.08)); c.beginPath(); c.ellipse(cx - S(5) + k * S(2.4), r.shoulder.y + S(1.5), S(1.8), S(3), 0.5, 0, TAU); c.fill(); }
  if (pose.attack) {
    // roots bursting from the ground ahead
    c.strokeStyle = css(lit(0x6a4a2a, 1)); c.lineWidth = S(1.4);
    for (let k = 0; k < (sage ? 5 : 3); k++) { const x = cx + S(12 + k * 3); c.beginPath(); c.moveTo(x, fy); c.quadraticCurveTo(x - S(3), fy - S(6), x + S(1), fy - S(9 + (k % 2) * 3)); c.stroke(); }
  }
};

UNIT_PAINTERS.shade = (c, u, cx, fy, S, pose) => {
  const m = u.model, royal = m.variant === 'royal';
  // smoky trail behind the assassin
  for (let k = 0; k < 4; k++) softEllipse(c, cx - S(6 + k * 4), fy - S(10 + k), S(4 - k * 0.6), S(6 - k), m.body, 0.25 - k * 0.05);
  const dagger = (cc: Ctx, hand: { x: number; y: number }, ang: number) => {
    cc.strokeStyle = css(0xe8e0ff); cc.lineWidth = S(1.2);
    cc.beginPath(); cc.moveTo(hand.x, hand.y); cc.lineTo(hand.x + Math.cos(ang) * S(7), hand.y + Math.sin(ang) * S(7)); cc.stroke();
    glow(cc, hand.x + Math.cos(ang) * S(6), hand.y + Math.sin(ang) * S(6), S(2.2), m.accent, 0.6);
  };
  const r = humanoid(c, cx, fy, S, {
    h: 26, body: m.body, accent: m.accent, helmet: 'hood', armor: 'leather', skin: ELF, ears: true, attackArm: 'thrust',
    back: (cc, hand) => dagger(cc, hand, pose.attack ? -0.3 : 1.2),
    front: (cc, hand) => dagger(cc, hand, pose.attack ? -0.1 : -1.1),
  }, pose);
  // glowing eyes under the hood, a mask
  c.fillStyle = css(0x1a1020); c.fillRect(r.head.x + S(0.5), r.head.y + S(0.2), S(3.6), S(2.2));
  c.fillStyle = css(m.accent); c.fillRect(r.head.x + S(2), r.head.y - S(0.8), S(1.6), S(0.7));
  if (royal) { c.fillStyle = css(0xe0c060); c.beginPath(); c.arc(cx, r.shoulder.y + S(4), S(1), 0, TAU); c.fill(); }
};

UNIT_PAINTERS.wraith = (c, u, cx, fy, S, pose) => {
  const m = u.model, av = m.variant === 'avatar';
  const ph = pose.ph * TAU;
  const y = fy - S(6) + Math.sin(ph) * S(1.5);
  glow(c, cx, y - S(12), S(18), m.body, 0.4);
  // tattered ghostly robe tapering to a wisp
  c.fillStyle = grad(c, 0, y - S(24), 0, y + S(4), [[0, lit(m.body, 1.3), 0.9], [0.6, m.body, 0.65], [1, m.body, 0]]);
  c.beginPath(); c.moveTo(cx - S(6), y - S(20)); c.quadraticCurveTo(cx - S(9), y - S(6), cx - S(4) + Math.sin(ph) * S(2), y + S(5));
  for (let k = 0; k < 4; k++) c.lineTo(cx - S(2) + k * S(2.2) + Math.sin(ph + k) * S(1), y + S(k % 2 ? 2 : 5));
  c.quadraticCurveTo(cx + S(8), y - S(6), cx + S(6), y - S(20)); c.closePath(); c.fill();
  // hooded skull-like head with burning eyes
  blob(c, cx + S(1), y - S(23), S(4.6), S(4.8), mix(m.body, 0x2a3a3a, 0.5), 1);
  c.fillStyle = css(0x0a1a12, 0.85); c.beginPath(); c.ellipse(cx + S(2), y - S(22.5), S(3), S(3.2), 0, 0, TAU); c.fill();
  for (const dx of [1, 3.2]) { c.fillStyle = css(m.accent); c.beginPath(); c.arc(cx + S(dx), y - S(23), S(0.75), 0, TAU); c.fill(); }
  // clawed arms reaching forward
  const reach = pose.attack ? S(12) : S(6);
  for (const [dy, l] of [[0, 0.7], [3, 1]] as const) {
    limb(c, cx + S(3), y - S(17) + S(dy), cx + S(3) + reach, y - S(15) + S(dy) + (pose.attack ? -S(3) : S(2)), S(2), mix(m.body, 0x2a3a3a, 0.4), l);
  }
  if (av) {
    // a crown of green flame
    for (let k = 0; k < 4; k++) fillTri(c, cx - S(2.5) + k * S(1.8), y - S(27), cx - S(1.6) + k * S(1.8), y - S(31 + (k % 2) * 2), cx - S(0.7) + k * S(1.8), y - S(27), m.accent);
    glow(c, cx, y - S(28), S(6), m.body, 0.7);
  }
};

UNIT_PAINTERS.glaivecart = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  const roll = pose.ph * TAU;
  const by = fy - S(5);
  softEllipse(c, cx, fy, S(15), S(3), 0x000000, 0.3);
  // curved elven cart bed
  c.fillStyle = grad(c, 0, by - S(8), 0, by, [[0, lit(m.body, 1.3)], [1, lit(m.body, 0.6)]]);
  c.beginPath(); c.moveTo(cx - S(15), by - S(7)); c.quadraticCurveTo(cx, by - S(3), cx + S(14), by - S(9)); c.lineTo(cx + S(12), by - S(2)); c.lineTo(cx - S(13), by - S(2)); c.closePath(); c.fill();
  c.strokeStyle = css(m.accent, 0.8); c.lineWidth = S(0.7); c.beginPath(); c.moveTo(cx - S(13), by - S(5)); c.quadraticCurveTo(cx, by - S(1.5), cx + S(12), by - S(7)); c.stroke();
  // spoked wheels
  for (const dx of [-8, 8]) {
    c.strokeStyle = css(lit(m.body, 0.9)); c.lineWidth = S(1.3); c.beginPath(); c.arc(cx + S(dx), by, S(4.5), 0, TAU); c.stroke();
    for (let k = 0; k < 4; k++) { const a = roll + (k / 4) * Math.PI; c.lineWidth = S(0.6); c.beginPath(); c.moveTo(cx + S(dx) + Math.cos(a) * S(4.5), by + Math.sin(a) * S(4.5)); c.lineTo(cx + S(dx) - Math.cos(a) * S(4.5), by - Math.sin(a) * S(4.5)); c.stroke(); }
  }
  // the throwing arm with a three-bladed glaive
  const armA = pose.attack ? -0.4 : -2.2;
  const px = cx - S(2), py = by - S(10);
  c.strokeStyle = css(lit(m.body, 1.1)); c.lineWidth = S(1.8);
  c.beginPath(); c.moveTo(px, by - S(4)); c.lineTo(px, py); c.stroke();
  const gx = px + Math.cos(armA) * S(13), gy = py + Math.sin(armA) * S(13);
  c.beginPath(); c.moveTo(px - Math.cos(armA) * S(4), py - Math.sin(armA) * S(4)); c.lineTo(gx, gy); c.stroke();
  const spin = pose.ph * TAU * 2;
  for (let k = 0; k < 3; k++) {
    const a = spin + (k / 3) * TAU;
    c.fillStyle = css(lit(m.accent, 1.1));
    c.beginPath(); c.moveTo(gx, gy); c.quadraticCurveTo(gx + Math.cos(a) * S(6), gy + Math.sin(a) * S(6), gx + Math.cos(a + 0.9) * S(7), gy + Math.sin(a + 0.9) * S(7)); c.quadraticCurveTo(gx + Math.cos(a + 0.4) * S(3), gy + Math.sin(a + 0.4) * S(3), gx, gy); c.fill();
  }
  if (pose.attack) glow(c, gx, gy, S(5), 0xb0f0ff, 0.6);
  // elf crew
  humanoid(c, cx - S(16), fy, (v) => S(v) * 0.8, { h: 24, body: 0x4a3a5a, accent: 0x6ad0d0, helmet: 'none', armor: 'leather', skin: ELF, ears: true }, pose);
};

UNIT_PAINTERS.faeriedragon = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  const y = fy - S(30) + Math.sin(pose.ph * TAU) * S(1.2);
  const flap = pose.attack ? 0.4 : Math.sin(pose.ph * TAU * 2);
  glow(c, cx, y, S(12), m.accent, 0.3);
  // butterfly wings (iridescent), back pair then front pair
  const wing = (dir: number, l: number, big: boolean) => {
    c.save(); c.translate(cx - S(1), y - S(1)); c.scale(1, 0.55 + 0.45 * (0.5 + 0.5 * flap * dir));
    c.fillStyle = grad(c, 0, -S(12), S(6), S(2), [[0, lit(m.accent, 1.2 * l), 0.85], [0.5, lit(m.body, 1.1 * l), 0.8], [1, lit(m.accent, 0.8 * l), 0.7]]);
    c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-S(big ? 7 : 4), -S(big ? 20 : 13), S(big ? 15 : 9), -S(big ? 21 : 13), S(big ? 6 : 4), 0); c.closePath(); c.fill();
    c.strokeStyle = css(0xffffff, 0.5); c.lineWidth = S(0.4); c.stroke();
    c.restore();
  };
  wing(-1, 0.75, true); wing(-1, 0.7, false);
  // slender dragon body and tail
  c.strokeStyle = css(lit(m.body, 0.9)); c.lineWidth = S(2.4); c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx - S(2), y + S(1)); c.quadraticCurveTo(cx - S(10), y + S(5), cx - S(13), y - S(1)); c.stroke();
  blob(c, cx + S(1), y + S(1), S(4.5), S(2.6), m.body);
  blob(c, cx + S(6), y - S(2), S(2.6), S(2.2), m.body, 1.1);
  for (const d of [-0.6, 0.6]) { c.strokeStyle = css(lit(m.accent, 1.2)); c.lineWidth = S(0.6); c.beginPath(); c.moveTo(cx + S(6), y - S(4)); c.quadraticCurveTo(cx + S(6 + d * 2), y - S(8), cx + S(8 + d * 2), y - S(8)); c.stroke(); }
  c.fillStyle = css(0x2a1a3a); c.beginPath(); c.arc(cx + S(7), y - S(2.4), S(0.6), 0, TAU); c.fill();
  wing(1, 1.1, true); wing(1, 1, false);
  // sparkles (and a healing shimmer when casting)
  for (let k = 0; k < 4; k++) { const a = pose.ph * TAU + k * 1.6; c.fillStyle = css(0xffffff, 0.8); c.beginPath(); c.arc(cx + Math.cos(a) * S(10), y + Math.sin(a) * S(6), S(0.6), 0, TAU); c.fill(); }
  if (pose.attack) glow(c, cx + S(12), y - S(2), S(5), m.accent, 0.8);
};

// ------------------------------------------------------------------ buildings

/** Dark moonlit grass with a silver rune ring and pale mushrooms (Duskmoon ground). */
PLINTHS.duskmoon = (ctx, ox, oy, s, seed) => {
  const r = rng(seed + 9);
  const c = centreOf(ox, oy, s);
  softEllipse(ctx, c.x, c.y, s * HX * 0.95, s * HY * 0.95, 0x2a3a3a, 0.8);
  softEllipse(ctx, c.x - 4, c.y - 2, s * HX * 0.75, s * HY * 0.75, 0x3a4a5a, 0.5);
  ctx.strokeStyle = css(0xb0e8f0, 0.45); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(c.x, c.y, s * HX * 0.78, s * HY * 0.78, 0, 0, TAU); ctx.stroke();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; crescent(ctx, c.x + Math.cos(a) * s * HX * 0.78, c.y + Math.sin(a) * s * HY * 0.78, 1.6, 0xd0f0ff, 0.7); }
  for (let i = 0; i < 7; i++) {
    const x = c.x + (r() - 0.5) * s * HX * 1.5, y = c.y + (r() - 0.5) * s * HY * 1.3;
    ctx.fillStyle = css(0xe8e0f0); ctx.fillRect(x - 0.4, y - 3, 0.8, 3);
    ctx.fillStyle = radial(ctx, x, y - 3.5, 2.4, [[0, 0xffffff], [1, 0x9ad0e0]]); ctx.beginPath(); ctx.ellipse(x, y - 3.2, 2, 1.2, 0, Math.PI, TAU); ctx.fill();
    glowAt(ctx, x, y - 3, 4, 0x9ae0f0, 0.3);
  }
};

/** Bark-and-silver panels with a carved vine border. */
function elvenWall(bark: number, seed: number): FacePainter {
  const base = timberWall(mix(bark, 0xd0c8e0, 0.55), seed);
  return (c, U, V, l) => {
    base(c, U, V, l);
    c.strokeStyle = css(0xc8d0e0, 0.7); c.lineWidth = 0.012;
    c.beginPath(); for (let u = 0; u <= U; u += 0.05) c.lineTo(u, V - 4 + Math.sin(u * 30) * 1.2); c.stroke();
  };
}

/** Swept elven roof: a gable that curls up at both ends into crescent tips. */
function sweptRoof(ctx: Ctx, g: ReturnType<typeof boxGeo>, rise: number, color: number) {
  const m1 = lerp(g.tL, g.tB, 0.5), m2 = lerp(g.tF, g.tR, 0.5);
  const r1 = pt(m1.x, m1.y - rise), r2 = pt(m2.x, m2.y - rise);
  // front slope
  ctx.fillStyle = grad(ctx, 0, r1.y, 0, g.tL.y, [[0, lit(color, 1.25)], [1, lit(color, 0.85)]]);
  ctx.beginPath(); ctx.moveTo(g.tL.x - 6, g.tL.y + 2); ctx.quadraticCurveTo((g.tL.x + r1.x) / 2, (g.tL.y + r1.y) / 2 + 4, r1.x, r1.y); ctx.lineTo(r2.x, r2.y); ctx.quadraticCurveTo((g.tF.x + r2.x) / 2, (g.tF.y + r2.y) / 2 + 4, g.tF.x + 6, g.tF.y + 2); ctx.closePath(); ctx.fill();
  // east slope
  ctx.fillStyle = css(lit(color, 0.6));
  ctx.beginPath(); ctx.moveTo(g.tF.x + 6, g.tF.y + 2); ctx.quadraticCurveTo((g.tF.x + r2.x) / 2, (g.tF.y + r2.y) / 2 + 4, r2.x, r2.y); ctx.lineTo(g.tR.x + 4, g.tR.y + 1); ctx.closePath(); ctx.fill();
  // curled crescent tips at the ridge ends
  for (const p of [r1, r2]) { ctx.strokeStyle = css(0xc8d0e0); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(p.x, p.y - 4, 4, 0.6, Math.PI * 1.6); ctx.stroke(); }
  ctx.strokeStyle = css(0xc8d0e0, 0.8); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(r1.x, r1.y); ctx.lineTo(r2.x, r2.y); ctx.stroke();
  return { r1, r2 };
}

BUILDING_PAINTERS.moonhall = (ctx, def, st) => {
  const m = def.model;
  const [x, y] = st.inset(1.8);
  const g = boxGeo(x, y, 1.8, 1.4, st.H * 0.5);
  const wall = elvenWall(m.wall, st.seed);
  faceLeft(ctx, g, (c, U, V, l) => { wall(c, U, V, l); windowAt(c, U * 0.15, V * 0.5, 0.14, 6, l, true); windowAt(c, U * 0.72, V * 0.5, 0.14, 6, l, true); c.fillStyle = css(lit(0x2a1a2a, l)); c.beginPath(); c.ellipse(U * 0.46, 0, 0.14, 13, 0, 0, Math.PI); c.fill(); });
  faceRight(ctx, g, (c, U, V, l) => { wall(c, U, V, l); windowAt(c, U * 0.4, V * 0.5, 0.16, 6, l, true); });
  const { r1, r2 } = sweptRoof(ctx, g, st.H * 0.55, m.roof);
  // target with a crescent and a bow rack
  crescent(ctx, (r1.x + r2.x) / 2, (r1.y + r2.y) / 2 + 8, 4, 0xe8f0ff);
  A.flags.push(r2);
};

BUILDING_PAINTERS.moonshrine = (ctx, def, st) => {
  const m = def.model;
  const [x0, y0] = st.inset(1.3);
  const g = boxGeo(x0, y0, 1.3, 1.3, 6);
  const w = stoneWall(m.wall, st.seed, 3);
  faceLeft(ctx, g, w); faceRight(ctx, g, w); stoneTop(ctx, g, m.wall);
  // a tall crescent arch with a glowing moon orb beneath
  const c0 = g.c, h = st.H * 1.2;
  ctx.strokeStyle = css(lit(m.wall, 1.15)); ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(c0.x, c0.y - h * 0.55, h * 0.45, Math.PI * 0.35, Math.PI * 1.65, true); ctx.stroke();
  ctx.strokeStyle = css(lit(m.wall, 0.7)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c0.x + 1.5, c0.y - h * 0.55, h * 0.45, Math.PI * 0.4, Math.PI * 1.6, true); ctx.stroke();
  glowAt(ctx, c0.x, c0.y - h * 0.5, 22, m.roof, 0.6);
  ctx.fillStyle = radial(ctx, c0.x - 2, c0.y - h * 0.52, 8, [[0, 0xffffff], [0.6, lit(m.roof, 1.2)], [1, m.roof]]);
  ctx.beginPath(); ctx.arc(c0.x, c0.y - h * 0.5, 6, 0, TAU); ctx.fill();
  // vines climbing the arch
  ctx.strokeStyle = css(0x4a8a4a); ctx.lineWidth = 1;
  ctx.beginPath(); for (let t = 0; t < 1; t += 0.05) { const a = Math.PI * 0.4 + t * Math.PI * 0.6; ctx.lineTo(c0.x + Math.cos(a) * h * 0.45 + Math.sin(t * 20) * 2, c0.y - h * 0.55 + Math.sin(a) * h * 0.45); } ctx.stroke();
  A.glow.push(pt(c0.x, c0.y - h * 0.5));
  A.flags.push(pt(c0.x - h * 0.4, c0.y - h * 0.9));
};

BUILDING_PAINTERS.shadowhouse = (ctx, def, st) => {
  const m = def.model;
  const [x, y] = st.inset(1.6);
  const g = boxGeo(x, y, 1.6, 1.3, st.H * 0.5);
  const wall = stoneWall(m.wall, st.seed, 5);
  faceLeft(ctx, g, (c, U, V, l) => { wall(c, U, V, l); c.fillStyle = css(0x0a0610); c.fillRect(U * 0.35, 0, 0.3, Math.min(12, V * 0.6)); c.fillStyle = css(0xb06ae0, 0.9); c.fillRect(U * 0.1, V * 0.6, 0.12, 1.2); c.fillRect(U * 0.8, V * 0.6, 0.12, 1.2); });
  faceRight(ctx, g, wall);
  // two-tier pagoda roof with hanging veils
  for (const [k, rise, inset] of [[0, st.H * 0.25, 0], [1, st.H * 0.22, 0.4]] as const) {
    const cc = cornerFor(g.c, 1.6 - inset);
    const gg = boxGeo(cc.x, cc.y + (k ? -st.H * 0.28 : 2), 1.6 - inset, 1.3 - inset, 2);
    sweptRoof(ctx, gg, rise, m.roof);
  }
  for (let k = 0; k < 5; k++) { const p = lerp(g.tL, g.tF, 0.1 + k * 0.2); ctx.fillStyle = css(0x2a1a3a, 0.7); ctx.fillRect(p.x - 1.5, p.y + 1, 3, 7 + (k % 2) * 3); }
  A.flags.push(pt(g.c.x, g.c.y - st.H * 0.7));
};

BUILDING_PAINTERS.ruinhut = (ctx, def, st) => {
  const m = def.model;
  const r = rng(st.seed);
  const [x, y] = st.inset(1.5);
  const g = boxGeo(x, y, 1.5, 1.3, st.H * 0.55);
  const wall = timberWall(0x6a5a4a, st.seed);
  const burnt: FacePainter = (c, U, V, l) => {
    wall(c, U, V, l * 0.7);
    // scorched, broken top edge
    c.fillStyle = css(0x1a1410, 0.8); for (let u = 0; u < U; u += 0.08) c.fillRect(u, V - 3 - r() * 8, 0.08, 12);
    c.fillStyle = css(0x000000, 0.35); c.fillRect(0, V * 0.3, U, V * 0.4);
  };
  faceLeft(ctx, g, burnt); faceRight(ctx, g, burnt);
  // charred rafters sticking up
  ctx.strokeStyle = css(0x2a1c12); ctx.lineWidth = 2.2;
  for (let k = 0; k < 3; k++) { const p = lerp(g.tL, g.tR, 0.2 + k * 0.3); ctx.beginPath(); ctx.moveTo(p.x, p.y + 2); ctx.lineTo(p.x + 6 - k * 4, p.y - 10 - r() * 6); ctx.stroke(); }
  // ghostly green flames
  for (let k = 0; k < 3; k++) {
    const p = lerp(g.tL, g.tR, 0.25 + k * 0.25);
    glowAt(ctx, p.x, p.y - 6, 14, m.roof, 0.45);
    ctx.fillStyle = grad(ctx, 0, p.y - 18, 0, p.y, [[0, m.roof, 0], [1, lit(m.roof, 1.2), 0.85]]);
    ctx.beginPath(); ctx.moveTo(p.x - 5, p.y); ctx.quadraticCurveTo(p.x - 3, p.y - 12, p.x + 1, p.y - 18 - k * 2); ctx.quadraticCurveTo(p.x + 4, p.y - 8, p.x + 5, p.y); ctx.fill();
  }
  A.glow.push(pt(g.c.x, g.c.y - 8));
  A.flags.push(pt(g.tB.x, g.tB.y - 8));
};

BUILDING_PAINTERS.glaiveworks = (ctx, def, st) => {
  const m = def.model;
  const [x, y] = st.inset(1.8);
  const g = boxGeo(x, y, 1.8, 1.5, st.H * 0.45);
  const wall = elvenWall(m.wall, st.seed);
  faceLeft(ctx, g, (c, U, V, l) => { wall(c, U, V, l); c.fillStyle = css(lit(0x1a1218, l)); c.fillRect(U * 0.2, 0, 0.6, Math.min(V - 3, 13)); });
  faceRight(ctx, g, wall);
  const { r2 } = sweptRoof(ctx, g, st.H * 0.4, 0x4a3a5a);
  // a giant glaive mounted on the gable
  const p = lerp(g.tL, g.tF, 0.5);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU - 0.3;
    ctx.fillStyle = css(lit(m.roof, 1.1));
    ctx.beginPath(); ctx.moveTo(p.x, p.y - 10); ctx.quadraticCurveTo(p.x + Math.cos(a) * 9, p.y - 10 + Math.sin(a) * 7, p.x + Math.cos(a + 0.9) * 11, p.y - 10 + Math.sin(a + 0.9) * 8); ctx.quadraticCurveTo(p.x + Math.cos(a + 0.4) * 4, p.y - 10 + Math.sin(a + 0.4) * 3, p.x, p.y - 10); ctx.fill();
  }
  ctx.fillStyle = css(0x6ad0d0); ctx.beginPath(); ctx.arc(p.x, p.y - 10, 2, 0, TAU); ctx.fill();
  A.flags.push(r2);
};

BUILDING_PAINTERS.wonderwell = (ctx, def, st) => {
  const m = def.model;
  const r = rng(st.seed);
  const [x, y] = st.stand(1.6);
  const by = y - 8;
  drum(ctx, x, by, 30, 7, m.wall, m.wall);
  ctx.fillStyle = radial(ctx, x - 6, by - 10, 30, [[0, 0xffffff], [0.3, lit(m.roof, 1.2)], [0.7, 0x6ac0e0], [1, 0x3a6aa0]]);
  ctx.beginPath(); ctx.ellipse(x, by - 7, 27, 13, 0, 0, TAU); ctx.fill();
  glowAt(ctx, x, by - 14, 34, m.roof, 0.45);
  // a curling leaf-shaped spout of silver
  ctx.strokeStyle = css(lit(m.wall, 1.1)); ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 4, by - 7); ctx.bezierCurveTo(x - 10, by - 7 - st.H * 0.8, x + 14, by - 7 - st.H * 1.1, x + 6, by - 7 - st.H * 0.6); ctx.stroke();
  // fairy lights drifting above the water
  for (let k = 0; k < 10; k++) {
    const fx = x - 22 + r() * 44, fy2 = by - 12 - r() * st.H * 1.1;
    glowAt(ctx, fx, fy2, 4, k % 2 ? m.roof : 0x9af0ff, 0.8);
    ctx.fillStyle = css(0xffffff); ctx.beginPath(); ctx.arc(fx, fy2, 0.8, 0, TAU); ctx.fill();
  }
  A.glow.push(pt(x, by - 14));
  A.flags.push(pt(x + 26, by - 10));
};

BUILDING_PAINTERS.wildstone = (ctx, def, st) => {
  const m = def.model;
  const r = rng(st.seed);
  const [x, y] = st.stand(1.2);
  const by = y - 6, h = st.H * 1.25;
  // a rough menhir split by a living tree, wrapped in roots
  fillPoly(ctx, [[x - 15, by], [x - 12, by - h * 0.8], [x - 3, by - h], [x, by]], css(lit(mix(m.wall, 0xb0b0a0, 0.4), 1.1)));
  fillPoly(ctx, [[x, by], [x + 3, by - h * 0.95], [x + 13, by - h * 0.75], [x + 15, by]], css(lit(mix(m.wall, 0xb0b0a0, 0.4), 0.7)));
  ctx.fillStyle = css(0x3a2a1a); ctx.fillRect(x - 1.5, by - h * 0.9, 3, h * 0.9);
  for (let k = 0; k < 6; k++) { ctx.strokeStyle = css(lit(0x5a3a22, 0.8 + r() * 0.4)); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - 11, by - k * h * 0.12); ctx.quadraticCurveTo(x, by - k * h * 0.12 - 6, x + 11, by - k * h * 0.12 - 2); ctx.stroke(); }
  // leafy crown and glowing druidic marks
  for (let k = 0; k < 12; k++) { ctx.fillStyle = css(lit(m.roof, 0.7 + r() * 0.5)); ctx.beginPath(); ctx.ellipse(x - 10 + r() * 20, by - h - 4 + r() * 10, 4, 2.4, r() * 3, 0, TAU); ctx.fill(); }
  ctx.fillStyle = css(0x9af0c0, 0.9); for (let k = 0; k < 3; k++) ctx.fillRect(x - 7 + k * 0.5, by - h * (0.3 + k * 0.18), 3, 1.2);
  glowAt(ctx, x - 5, by - h * 0.5, 12, 0x6ad070, 0.35);
  A.flags.push(pt(x, by - h - 6));
};

BUILDING_PAINTERS.moonlantern = (ctx, def, st) => {
  const m = def.model;
  const [x, y] = st.stand(1.2);
  const by = y - 6, h = st.H * 1.15;
  drum(ctx, x, by, 14, 6, 0x6a6478, 0x5a5468);
  // a slender silver post curving into a hook
  ctx.strokeStyle = css(lit(m.wall, 1.1)); ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, by - 6); ctx.lineTo(x, by - h); ctx.quadraticCurveTo(x, by - h - 12, x + 12, by - h - 8); ctx.stroke();
  ctx.strokeStyle = css(lit(m.wall, 0.7)); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + 2, by - 6); ctx.lineTo(x + 2, by - h); ctx.stroke();
  // hanging lantern with the moon inside
  const lx = x + 12, ly = by - h + 4;
  ctx.strokeStyle = css(0x3a3a4a); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(lx, by - h - 8); ctx.lineTo(lx, ly - 6); ctx.stroke();
  glowAt(ctx, lx, ly, 26, m.roof, 0.55);
  ctx.fillStyle = radial(ctx, lx - 2, ly - 2, 9, [[0, 0xffffff], [0.5, lit(m.roof, 1.2)], [1, shade(m.roof, 0.7)]]);
  ctx.beginPath(); ctx.ellipse(lx, ly, 6, 7.5, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = css(lit(m.wall, 1)); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(lx, ly, 6, 7.5, 0, 0, TAU); ctx.stroke();
  crescent(ctx, lx, ly, 3, 0xffffff, 0.9);
  A.glow.push(pt(lx, ly));
  A.flags.push(pt(x, by - h - 10));
};

BUILDING_PAINTERS.moonstone = (ctx, def, st) => {
  const m = def.model;
  const [x0, y0] = st.inset(1.3);
  const g = boxGeo(x0, y0, 1.3, 1.1, st.H * 0.6);
  const wall = elvenWall(m.wall, st.seed);
  faceLeft(ctx, g, (c, U, V, l) => { wall(c, U, V, l); windowAt(c, U * 0.35, V * 0.3, 0.3, 7, l, true); });
  faceRight(ctx, g, wall);
  const { r1, r2 } = sweptRoof(ctx, g, st.H * 0.5, 0x4a4a7a);
  // moonstones piled by the door
  for (let k = 0; k < 5; k++) crystal(ctx, g.F.x - 18 + k * 6, g.F.y - 1 - (k % 2) * 3, 8 + (k % 3) * 3, m.roof);
  A.flags.push(lerp(r1, r2, 0.5));
};

BUILDING_PAINTERS.starfall = (ctx, def, st) => {
  const m = def.model;
  const r = rng(st.seed);
  const [x0, y0] = st.inset(1.7);
  const g = boxGeo(x0, y0, 1.7, 1.7, 8);
  const w = stoneWall(0x6a6478, st.seed, 4);
  faceLeft(ctx, g, (c, U, V, l) => { w(c, U, V, l); c.fillStyle = css(m.roof, 0.85); for (let k = 0; k < 4; k++) c.fillRect(0.2 + k * 0.38, V * 0.45, 0.1, 1.4); });
  faceRight(ctx, g, w); stoneTop(ctx, g, 0x6a6478);
  // an open observatory ring of silver arcs around a tall obelisk
  const c0 = g.c, h = st.H * 1.3;
  ctx.strokeStyle = css(lit(m.wall, 0.8)); ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.ellipse(c0.x, c0.y - h * 0.55, 26, 9, -0.3, Math.PI, TAU); ctx.stroke();
  fillPoly(ctx, [[c0.x - 7, c0.y], [c0.x, c0.y + 3], [c0.x, c0.y + 3 - h], [c0.x - 3, c0.y - h]], css(lit(m.wall, 1.05)));
  fillPoly(ctx, [[c0.x, c0.y + 3], [c0.x + 7, c0.y], [c0.x + 3, c0.y - h], [c0.x, c0.y + 3 - h]], css(lit(m.wall, 0.65)));
  ctx.strokeStyle = css(lit(m.wall, 1.2)); ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.ellipse(c0.x, c0.y - h * 0.55, 26, 9, -0.3, 0, Math.PI); ctx.stroke();
  // the star at the top, and falling stars
  glowAt(ctx, c0.x, c0.y - h - 6, 26, m.roof, 0.6);
  ctx.fillStyle = css(0xffffff);
  ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU - Math.PI / 2, rr = k % 2 ? 2.8 : 7; ctx.lineTo(c0.x + Math.cos(a) * rr, c0.y - h - 6 + Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
  for (let k = 0; k < 3; k++) {
    const sx = c0.x - 30 + r() * 60, sy = c0.y - h * (0.4 + r() * 0.6);
    ctx.strokeStyle = css(m.roof, 0.7); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 9, sy - 9); ctx.stroke();
    ctx.fillStyle = css(0xffffff); ctx.beginPath(); ctx.arc(sx, sy, 1.4, 0, TAU); ctx.fill();
  }
  A.glow.push(pt(c0.x, c0.y - h - 6));
  A.flags.push(pt(g.tB.x, g.tB.y - 6));
};

void faceTop; void LIGHT; void quadruped;
