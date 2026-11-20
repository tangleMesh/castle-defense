import { UNIT_PAINTERS } from '../painters';
import { css, lit, shade, softEllipse } from '../paint';
import { blob, glow, humanoid, limb, quadruped } from '../units';

/**
 * Thornwild (the map's Nature race) sprites: spiders of the deep woods, furbolg shamans, slumbering
 * bears and the wisp-like forest spirits of the Heart of Wonders.
 */
const TAU = Math.PI * 2;

/** A spider seen from the side: eight jointed legs, a round abdomen and a small head with fangs. */
UNIT_PAINTERS.spider = (c, u, cx, fy, S, pose) => {
  const m = u.model, v = m.variant;
  const sw = pose.ph * TAU;
  const size = v === 'brood' ? 1.35 : v === 'giant' ? 1.15 : 1;
  const k = (n: number) => S(n * size);
  softEllipse(c, cx, fy, k(12), k(3), 0x000000, 0.28);
  const by = fy - k(7) - (pose.moving ? Math.abs(Math.sin(sw * 2)) * S(0.6) : 0);
  // legs: four pairs, alternate pairs lift while walking; the far side behind the body, the near side in front
  const leg = (i: number, side: number) => {
    const ph = sw + i * 1.3 + (side > 0 ? Math.PI : 0);
    const lift = pose.moving ? Math.max(0, Math.sin(ph)) * k(2) : 0;
    const hx = cx + k(-1 + i * 1.4), hy = by + k(0.5);
    const spread = (i - 1.5) * 5.5 + (side > 0 ? 1.2 : -1.2);
    const kx = hx + k(spread * 0.55), ky = by - k(5 + (side > 0 ? 0.8 : 0)) - lift;
    const fx = hx + k(spread * 1.25), fy2 = fy - lift * 0.4;
    const col = side < 0 ? shade(m.body, 0.7) : lit(m.body, 1.1);
    limb(c, hx, hy, kx, ky, k(1.1), col, 0.9);
    limb(c, kx, ky, fx, fy2, k(0.9), col, 0.8);
  };
  for (let i = 0; i < 4; i++) leg(i, -1);
  // abdomen with markings, then the head
  blob(c, cx - k(5.5), by - k(2.5), k(6.5), k(5), m.body);
  c.fillStyle = css(m.accent, 0.85);
  if (v === 'giant' || v === 'brood') { for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(cx - k(5.5), by - k(5.5) + k(i * 2.4), k(4 - i), k(0.7), 0, 0, TAU); c.fill(); } }
  else { c.beginPath(); c.ellipse(cx - k(5.5), by - k(3.5), k(2.4), k(1.6), 0, 0, TAU); c.fill(); }
  if (v === 'brood') glow(c, cx - k(9), by + k(1), k(4), 0xd0f0a0, 0.35);
  blob(c, cx + k(4), by + k(0.5), k(3.6), k(3), shade(m.body, 1.1));
  for (let i = 0; i < 4; i++) leg(i, 1);
  // eyes and fangs
  c.fillStyle = css(0xff3a2a);
  for (const [ex, ey] of [[5.5, -0.6], [6.6, 0.2], [4.6, 0]]) { c.beginPath(); c.arc(cx + k(ex), by + k(ey), k(0.55), 0, TAU); c.fill(); }
  const fang = pose.attack ? 2.6 : 1.6;
  c.strokeStyle = css(0xe8e0c8); c.lineWidth = k(0.6);
  c.beginPath(); c.moveTo(cx + k(7), by + k(1.4)); c.lineTo(cx + k(7.6), by + k(1.4 + fang)); c.stroke();
};

/** A furbolg: a bear-headed shaman in a hide cloak with a totem staff. */
UNIT_PAINTERS.furbolg = (c, u, cx, fy, S, pose) => {
  const m = u.model, elder = m.variant === 'elder';
  const r = humanoid(c, cx, fy, S, {
    h: elder ? 28 : 26, body: m.body, accent: m.accent, helmet: 'none', armor: 'leather', attackArm: 'raise',
    front: (cc, hand) => {
      cc.strokeStyle = css(0x6a4a2a); cc.lineWidth = S(1.3);
      cc.beginPath(); cc.moveTo(hand.x, hand.y + S(8)); cc.lineTo(hand.x, hand.y - S(10)); cc.stroke();
      blob(cc, hand.x, hand.y - S(11), S(1.8), S(1.8), m.accent, 1.2);
      if (pose.attack) glow(cc, hand.x, hand.y - S(11), S(5), m.accent, 0.5);
    },
  }, pose);
  // the bear head: a broad muzzle and round ears over the humanoid head
  const h = r.head;
  blob(c, h.x, h.y, S(4.4), S(3.8), shade(m.body, 0.9));
  blob(c, h.x + S(3), h.y + S(1), S(2.4), S(1.8), lit(m.body, 1.15));
  c.fillStyle = css(0x1a1410); c.beginPath(); c.arc(h.x + S(4.8), h.y + S(0.6), S(0.7), 0, TAU); c.fill();
  for (const ex of [-2.6, 1.8]) blob(c, h.x + S(ex), h.y - S(3.6), S(1.3), S(1.3), shade(m.body, 0.8));
  if (elder) { c.strokeStyle = css(0xe8e0d0, 0.9); c.lineWidth = S(0.7); c.beginPath(); c.moveTo(h.x + S(1), h.y + S(3)); c.lineTo(h.x + S(2), h.y + S(6)); c.stroke(); }
};

/** A forest bear on all fours, the ancient one with mossy shoulders. */
UNIT_PAINTERS.forestbear = (c, u, cx, fy, S, pose) => {
  const m = u.model, ancient = m.variant === 'ancient';
  const { saddle } = quadruped(c, cx, fy, S, pose, { len: ancient ? 24 : 21, h: ancient ? 12 : 10.5, body: m.body, belly: shade(m.body, 0.75), tail: false, eye: 0x1a1410 });
  // a hump of fur (moss on the ancient bear) and a heavy head
  blob(c, saddle.x - S(2), saddle.y - S(1), S(ancient ? 8 : 7), S(ancient ? 5 : 4), lit(m.body, 1.05));
  if (ancient) { c.fillStyle = css(m.accent, 0.8); for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(saddle.x - S(6) + S(i * 2.6), saddle.y - S(4) + S((i % 2) * 1.2), S(1.6), 0, TAU); c.fill(); } }
  const hx = cx + S(ancient ? 13 : 11.5), hy = fy - S(ancient ? 11 : 9.5) + (pose.attack ? S(1.5) : 0);
  blob(c, hx, hy, S(4.2), S(3.6), m.body);
  blob(c, hx + S(3), hy + S(1), S(2.2), S(1.6), lit(m.body, 1.2));
  blob(c, hx - S(1.5), hy - S(3.2), S(1.3), S(1.3), shade(m.body, 0.8));
  c.fillStyle = css(0x1a1410); c.beginPath(); c.arc(hx + S(4.8), hy + S(0.6), S(0.7), 0, TAU); c.fill();
  if (pose.attack) { c.strokeStyle = css(0xffffff, 0.8); c.lineWidth = S(0.7); for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(hx + S(6), hy - S(2) + S(i * 1.6)); c.lineTo(hx + S(9), hy + S(i * 1.6)); c.stroke(); } }
};

/** A forest spirit: a hovering mote of green light with a trailing tail. */
UNIT_PAINTERS.forestspirit = (c, u, cx, fy, S, pose) => {
  const m = u.model;
  const hover = Math.sin(pose.ph * TAU) * S(1.2);
  const y = fy - S(12) + hover;
  softEllipse(c, cx, fy, S(4), S(1.4), 0x000000, 0.18);
  glow(c, cx, y, S(pose.attack ? 9 : 7), m.accent, 0.4);
  for (let i = 3; i > 0; i--) { c.fillStyle = css(m.body, 0.25 * (4 - i)); c.beginPath(); c.arc(cx - S(i * 2.2), y + S(i * 1.2), S(2.6 - i * 0.5), 0, TAU); c.fill(); }
  blob(c, cx, y, S(3), S(3), m.body, 1.3);
  c.fillStyle = css(0xffffff, 0.9); c.beginPath(); c.arc(cx - S(0.8), y - S(0.8), S(0.9), 0, TAU); c.fill();
};
