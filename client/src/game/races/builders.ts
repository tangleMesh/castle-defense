import { BUILDER_PAINTERS, type UnitPose } from '../painters';
import { css, grad, lit, radial, softEllipse, type Ctx } from '../paint';
import { blob, fillTri, glow, humanoid } from '../units';

/**
 * Builders, one per faction, each in its race's style: a mason (Ironvow), a mossy treeling
 * (Thornwild), a floating crystal apprentice (Shardbound), a goblin tinker (Cogspark), a moon wisp
 * (Duskmoon), an orc peon (Bloodtusk), an elf artisan (Sunspire), a fur-clad dwarf (Frostmark), a
 * hooded acolyte (Gravewake), an imp (Doomforge), a murloc slave (Tidecall) and a blighted cultist
 * (Blightroot). Each carries a building tool; the attack frame is the tool raised to work.
 */

const TAU = Math.PI * 2;
type SFn = (v: number) => number;
type Pt = { x: number; y: number };

/** A tool on a handle: hammer, pick, wrench, shovel... */
function tool(c: Ctx, hand: Pt, S: SFn, pose: UnitPose, head: 'hammer' | 'pick' | 'wrench' | 'shovel' | 'sickle' | 'mallet', metal = 0xb8bec8, wood = 0x6a4a2a) {
  const ang = pose.attack ? -2.2 : -1.25;
  const tx = hand.x + Math.cos(ang) * S(9), ty = hand.y + Math.sin(ang) * S(9);
  c.strokeStyle = css(lit(wood, 1)); c.lineWidth = S(1.3);
  c.beginPath(); c.moveTo(hand.x, hand.y); c.lineTo(tx, ty); c.stroke();
  c.save(); c.translate(tx, ty); c.rotate(ang + Math.PI / 2);
  c.fillStyle = grad(c, -S(3), 0, S(3), 0, [[0, lit(metal, 1.25)], [1, lit(metal, 0.6)]]);
  switch (head) {
    case 'hammer': c.fillRect(-S(3.2), -S(1.4), S(6.4), S(2.8)); break;
    case 'mallet': c.fillRect(-S(3.6), -S(2), S(7.2), S(4)); break;
    case 'pick': c.beginPath(); c.moveTo(-S(5), S(1)); c.quadraticCurveTo(0, -S(2.5), S(5), S(1)); c.lineTo(S(4), S(1.6)); c.quadraticCurveTo(0, -S(1), -S(4), S(1.6)); c.fill(); break;
    case 'wrench': c.fillRect(-S(1), -S(1.5), S(2), S(4)); c.beginPath(); c.arc(0, -S(2.4), S(2.2), Math.PI * 1.2, Math.PI * 1.8 + TAU, false); c.lineWidth = S(1.4); c.strokeStyle = css(lit(metal, 1)); c.stroke(); break;
    case 'shovel': c.beginPath(); c.moveTo(-S(2.4), 0); c.lineTo(S(2.4), 0); c.lineTo(S(1.6), -S(4)); c.lineTo(-S(1.6), -S(4)); c.fill(); break;
    case 'sickle': c.strokeStyle = css(lit(metal, 1.1)); c.lineWidth = S(1.2); c.beginPath(); c.arc(S(2), 0, S(3.5), Math.PI, Math.PI * 1.9); c.stroke(); break;
  }
  c.restore();
  if (pose.attack) glow(c, tx, ty, S(3), 0xffe8a0, 0.5);
}

function satchel(c: Ctx, cx: number, fy: number, S: SFn, color: number) {
  c.fillStyle = grad(c, cx - S(8), 0, cx - S(2), 0, [[0, lit(color, 1.1)], [1, lit(color, 0.6)]]);
  c.fillRect(cx - S(7.5), fy - S(16), S(4.5), S(6));
}

// Ironvow: a mason in a leather cap with a hammer and a tool satchel.
BUILDER_PAINTERS.ironvow = (c, cx, fy, S, pose) => {
  humanoid(c, cx, fy, S, { h: 24, body: 0x8a6a40, accent: 0x3a64b8, helmet: 'cap', armor: 'leather', attackArm: 'raise',
    back: () => satchel(c, cx, fy, S, 0x9a7a50), front: (cc, hand) => tool(cc, hand, S, pose, 'hammer') }, pose);
};

// Thornwild: a little treeling gardener with a leafy crown and a stone mallet.
BUILDER_PAINTERS.thornwild = (c, cx, fy, S, pose) => {
  const r = humanoid(c, cx, fy, S, { h: 23, body: 0x6b4a2e, accent: 0x4f9a3a, helmet: 'leafhood', armor: 'leaf', skin: 0x8a6a4a, attackArm: 'raise',
    front: (cc, hand) => tool(cc, hand, S, pose, 'mallet', 0x8a8478, 0x5a3a20) }, pose);
  for (let k = 0; k < 3; k++) { c.fillStyle = css(lit(0x7cb85a, 0.9 + k * 0.1)); c.beginPath(); c.ellipse(r.head.x - S(2) + k * S(2), r.head.y - S(5), S(1.6), S(2.6), -0.4 + k * 0.4, 0, TAU); c.fill(); }
};

// Shardbound: a hovering crystal apprentice in violet robes, a shard chisel in hand.
BUILDER_PAINTERS.shardbound = (c, cx, fy, S, pose) => {
  const hover = { ...pose, moving: false };
  softEllipse(c, cx, fy, S(6), S(1.6), 0x000000, 0.25);
  glow(c, cx, fy - S(14), S(12), 0x9a6ae0, 0.25);
  const r = humanoid(c, cx, fy - S(3) + Math.sin(pose.ph * TAU) * S(1), S, { h: 24, body: 0x4a3a7a, accent: 0xc0a0f0, helmet: 'hood', armor: 'robe', skin: 0xd8d0f0, attackArm: 'raise',
    front: (cc, hand) => tool(cc, hand, S, pose, 'pick', 0xc0a0f0, 0x6a6478) }, hover);
  fillTri(c, r.head.x - S(4), r.head.y - S(8), r.head.x - S(2.5), r.head.y - S(12), r.head.x - S(1), r.head.y - S(8), 0xc0a0f0);
};

// Cogspark: a goblin tinker in goggles with a big wrench and a tool pack.
BUILDER_PAINTERS.cogspark = (c, cx, fy, S, pose) => {
  humanoid(c, cx, fy, S, { h: 20, body: 0x8a4a2a, accent: 0xd88a2a, helmet: 'goggles', armor: 'leather', skin: 0x7aa04a, ears: true, attackArm: 'raise',
    back: () => { c.fillStyle = grad(c, cx - S(9), 0, cx - S(3), 0, [[0, 0x8a8a92], [1, 0x4a4a52]]); c.fillRect(cx - S(9), fy - S(17), S(5.5), S(7)); c.fillStyle = css(0xd8b030); c.fillRect(cx - S(9), fy - S(14), S(5.5), S(1)); },
    front: (cc, hand) => tool(cc, hand, S, pose, 'wrench', 0xb8bec8) }, pose);
};

// Duskmoon: a glowing moon wisp that shapes buildings with light.
BUILDER_PAINTERS.duskmoon = (c, cx, fy, S, pose) => {
  const y = fy - S(16) + Math.sin(pose.ph * TAU) * S(2);
  softEllipse(c, cx, fy, S(5), S(1.4), 0x000000, 0.2);
  glow(c, cx, y, S(16), 0x6ad0d0, 0.55);
  c.fillStyle = radial(c, cx - S(1), y - S(1), S(6), [[0, 0xffffff], [0.5, 0xb0f0f0], [1, 0x6ad0d0, 0]]);
  c.beginPath(); c.arc(cx, y, S(6), 0, TAU); c.fill();
  // a tail of motes and a crescent halo
  for (let k = 1; k <= 5; k++) { c.fillStyle = css(0xd0f8f8, 0.8 - k * 0.13); c.beginPath(); c.arc(cx - S(3 + k * 2.4), y + S(k * 1.4) + Math.sin(pose.ph * TAU + k) * S(1), S(1.6 - k * 0.2), 0, TAU); c.fill(); }
  c.strokeStyle = css(0xe8f8ff, 0.8); c.lineWidth = S(0.8); c.beginPath(); c.arc(cx, y, S(9), -2.2, 0.6); c.stroke();
  if (pose.attack) { c.strokeStyle = css(0xb0f0f0, 0.9); c.lineWidth = S(1); c.beginPath(); c.moveTo(cx + S(5), y); c.lineTo(cx + S(14), y + S(8)); c.stroke(); }
};

// Bloodtusk: an orc peon with a pickaxe and a sack of lumber.
BUILDER_PAINTERS.bloodtusk = (c, cx, fy, S, pose) => {
  const r = humanoid(c, cx, fy, S, { h: 24, body: 0x7a5a3a, accent: 0xb03a2a, helmet: 'none', armor: 'leather', skin: 0x6a8a3a, attackArm: 'raise',
    back: () => { for (let k = 0; k < 3; k++) { c.fillStyle = css(lit(0x6a4a2a, 0.9 + k * 0.08)); c.fillRect(cx - S(9) + k * S(1.6), fy - S(20) + k * S(0.6), S(1.4), S(10)); } },
    front: (cc, hand) => tool(cc, hand, S, pose, 'pick') }, pose);
  for (const dx of [1.4, 2.8]) fillTri(c, r.head.x + S(0.6 + dx) - S(0.5), r.head.y + S(1.6), r.head.x + S(0.6 + dx) + S(0.2), r.head.y - S(0.6), r.head.x + S(0.6 + dx) + S(0.6), r.head.y + S(1.6), 0xf0e8d0);
};

// Sunspire: an elf artisan in white and crimson with a golden hammer.
BUILDER_PAINTERS.sunspire = (c, cx, fy, S, pose) => {
  const r = humanoid(c, cx, fy, S, { h: 25, body: 0xa02a3a, accent: 0xd8b040, helmet: 'circlet', armor: 'leather', skin: 0xf0d8c0, ears: true, attackArm: 'raise',
    front: (cc, hand) => tool(cc, hand, S, pose, 'hammer', 0xe8c050, 0xf0e8d8) }, pose);
  c.fillStyle = css(0xf0d070); c.beginPath(); c.moveTo(r.head.x + S(2), r.head.y - S(3)); c.quadraticCurveTo(r.head.x - S(6), r.head.y - S(3.5), r.head.x - S(5), r.head.y + S(7)); c.lineTo(r.head.x - S(2), r.head.y + S(2)); c.fill();
};

// Frostmark: a stout fur-clad dwarf with a white beard and an ice pick.
BUILDER_PAINTERS.frostmark = (c, cx, fy, S, pose) => {
  const r = humanoid(c, cx, fy, S, { h: 21, body: 0x8a7a6a, accent: 0x8ad0f0, helmet: 'helm', armor: 'leather', skin: 0xe8c8a8, attackArm: 'raise',
    front: (cc, hand) => tool(cc, hand, S, pose, 'pick', 0x9ad8ff) }, pose);
  c.fillStyle = css(0xf0f0f0); c.beginPath(); c.moveTo(r.head.x + S(1), r.head.y + S(1)); c.quadraticCurveTo(r.head.x + S(5), r.head.y + S(4), r.head.x + S(1.5), r.head.y + S(8)); c.lineTo(r.head.x - S(1), r.head.y + S(2)); c.fill();
  c.fillStyle = css(0xf0f4f8); c.beginPath(); c.ellipse(cx, r.shoulder.y, S(6), S(2), 0, 0, TAU); c.fill();
};

// Gravewake: a hooded acolyte with a skull lantern and a shovel.
BUILDER_PAINTERS.gravewake = (c, cx, fy, S, pose) => {
  const r = humanoid(c, cx, fy, S, { h: 25, body: 0x2a2a32, accent: 0x8ab040, helmet: 'hood', armor: 'robe', skin: 0xb8c0b0, attackArm: 'raise',
    back: (cc, hand) => { glow(cc, hand.x, hand.y + S(3), S(4), 0x8ab040, 0.7); blob(cc, hand.x, hand.y + S(3), S(1.8), S(1.7), 0xe0d8c0); },
    front: (cc, hand) => tool(cc, hand, S, pose, 'shovel', 0x8a8a8a, 0x4a3a2a) }, pose);
  c.fillStyle = css(0x8ab040); c.beginPath(); c.arc(r.head.x + S(2), r.head.y - S(0.4), S(0.6), 0, TAU); c.fill();
};

// Doomforge: a little red imp with bat wings and a hot iron fork.
BUILDER_PAINTERS.doomforge = (c, cx, fy, S, pose) => {
  const flap = Math.sin(pose.ph * TAU * 2);
  for (const d of [-1, 1]) {
    c.fillStyle = css(lit(0x6a1a2a, d < 0 ? 0.8 : 1));
    c.beginPath(); c.moveTo(cx - S(1), fy - S(18)); c.lineTo(cx - S(1) - S(7), fy - S(23) - flap * S(2) * d); c.lineTo(cx - S(1) - S(9), fy - S(16)); c.lineTo(cx - S(1) - S(5), fy - S(17)); c.fill();
  }
  const r = humanoid(c, cx, fy, S, { h: 20, body: 0x3a1a1a, accent: 0xff6a1a, helmet: 'none', armor: 'leather', skin: 0xc03a2a, attackArm: 'raise',
    front: (cc, hand) => { tool(cc, hand, S, pose, 'pick', 0xff8a3a, 0x2a1a1a); glow(cc, hand.x, hand.y - S(8), S(3), 0xff6a1a, 0.5); } }, pose);
  for (const d of [-1, 1]) fillTri(c, r.head.x + S(0.6) + d * S(1.2), r.head.y - S(2.5), r.head.x + S(0.6) + d * S(3), r.head.y - S(6), r.head.x + S(0.6) + d * S(0.2), r.head.y - S(2.6), 0x2a1a12);
  c.strokeStyle = css(0xc03a2a); c.lineWidth = S(0.8); c.beginPath(); c.moveTo(cx - S(2), fy - S(8)); c.quadraticCurveTo(cx - S(8), fy - S(6), cx - S(8), fy - S(2)); c.stroke();
};

// Tidecall: a murloc thrall with a shell shovel and a net.
BUILDER_PAINTERS.tidecall = (c, cx, fy, S, pose) => {
  const r = humanoid(c, cx, fy, S, { h: 19, body: 0x4a9a7a, accent: 0xff7a6a, helmet: 'none', armor: 'leaf', skin: 0x4a9a7a, attackArm: 'raise',
    back: () => { c.strokeStyle = css(0xd8c8a0, 0.8); c.lineWidth = S(0.4); for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(cx - S(9) + k * S(1.6), fy - S(16)); c.lineTo(cx - S(8) + k * S(1.6), fy - S(8)); c.stroke(); } },
    front: (cc, hand) => tool(cc, hand, S, pose, 'shovel', 0xf0d8c8, 0x6a5a3a) }, pose);
  const hx = r.head.x + S(1), hy = r.head.y;
  blob(c, hx, hy, S(4.2), S(3.6), 0x4a9a7a, 1.05);
  c.fillStyle = css(0xffffff); c.beginPath(); c.arc(hx + S(2.2), hy - S(1.4), S(1.1), 0, TAU); c.fill();
  c.fillStyle = css(0x1a1010); c.beginPath(); c.arc(hx + S(2.5), hy - S(1.4), S(0.5), 0, TAU); c.fill();
  c.beginPath(); c.moveTo(hx + S(1), hy + S(1)); c.quadraticCurveTo(hx + S(3.5), hy + S(2.6), hx + S(4.5), hy + S(0.6)); c.fill();
  for (let k = 0; k < 3; k++) fillTri(c, hx - S(2.6) + k * S(1.4), hy - S(2.8), hx - S(2.2) + k * S(1.4), hy - S(6), hx - S(1.4) + k * S(1.4), hy - S(2.8), 0xff7a6a);
};

// Blightroot: a hunched blighted cultist with an ooze-dripping sickle and a fel-green hood.
BUILDER_PAINTERS.blightroot = (c, cx, fy, S, pose) => {
  const r = humanoid(c, cx, fy, S, { h: 23, body: 0x4a3a3a, accent: 0xd0b020, helmet: 'hood', armor: 'robe', skin: 0x9a8a6a, attackArm: 'raise',
    back: () => { for (let k = 0; k < 3; k++) fillTri(c, cx - S(4) + k * S(2), fy - S(22), cx - S(5) + k * S(2), fy - S(26), cx - S(3) + k * S(2), fy - S(22), 0x2a1a1a); },
    front: (cc, hand) => { tool(cc, hand, S, pose, 'sickle', 0x9ad040, 0x3a2a2a); } }, pose);
  c.fillStyle = css(0x8ad02a); c.beginPath(); c.arc(r.head.x + S(2), r.head.y - S(0.4), S(0.7), 0, TAU); c.fill();
  glow(c, r.head.x + S(2), r.head.y - S(0.4), S(2), 0x8ad02a, 0.6);
  for (let k = 0; k < 2; k++) { c.fillStyle = css(0x8ad02a, 0.8); c.beginPath(); c.ellipse(cx + S(3) + k * S(2), fy - S(4) + ((pose.ph * 4 + k) % 2) * S(1.5), S(0.6), S(1), 0, 0, TAU); c.fill(); }
};

