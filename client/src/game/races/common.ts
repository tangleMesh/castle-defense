import { BUILDING_PAINTERS } from '../painters';
import { css, fillPoly, grad, lit, rng } from '../paint';
import { glowAt } from '../structures';

/**
 * Buildings every faction has: the Treasure Chest (the map's Treasure Box), a big iron-bound chest
 * on a stone step with its lid ajar, gold glowing inside and coins spilling onto the ground.
 */
BUILDING_PAINTERS.treasure = (ctx, def, st) => {
  const m = def.model;
  const r = rng(st.seed);
  const [x, y] = st.stand(1.4);
  // stone step
  fillPoly(ctx, [[x - 30, y], [x + 26, y], [x + 34, y - 8], [x - 22, y - 8]], css(0x8a8478));
  fillPoly(ctx, [[x - 30, y], [x + 26, y], [x + 26, y + 4], [x - 30, y + 4]], css(0x5a564e));
  // chest body: front and side faces
  const bx = x - 20, by = y - 8, w = 36, h = 20, d = 9;
  ctx.fillStyle = grad(ctx, bx, 0, bx + w, 0, [[0, lit(m.wall, 1.15)], [1, lit(m.wall, 0.75)]]);
  ctx.fillRect(bx, by - h, w, h);
  fillPoly(ctx, [[bx + w, by], [bx + w + d, by - d * 0.8], [bx + w + d, by - h - d * 0.8], [bx + w, by - h]], css(lit(m.wall, 0.55)));
  // planks
  ctx.strokeStyle = css(lit(m.wall, 0.5)); ctx.lineWidth = 1;
  for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(bx, by - (h * k) / 4); ctx.lineTo(bx + w, by - (h * k) / 4); ctx.stroke(); }
  // gold inside (seen through the open lid) with a warm glow
  fillPoly(ctx, [[bx, by - h], [bx + w, by - h], [bx + w + d, by - h - d * 0.8], [bx + d, by - h - d * 0.8]], css(m.roof));
  for (let k = 0; k < 9; k++) {
    ctx.fillStyle = css(lit(m.roof, 0.85 + r() * 0.4));
    ctx.beginPath(); ctx.ellipse(bx + 4 + r() * (w - 4), by - h - 2 - r() * 5, 3, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  }
  glowAt(ctx, x, by - h - 4, 26, 0xffd060, 0.35);
  // lid tipped back
  fillPoly(ctx, [[bx + d, by - h - d * 0.8], [bx + w + d, by - h - d * 0.8], [bx + w + d + 4, by - h - d * 0.8 - 14], [bx + d + 4, by - h - d * 0.8 - 14]], css(lit(m.wall, 0.9)));
  // iron bands and a lock plate
  ctx.fillStyle = css(0x3a3a40);
  for (const u of [0.18, 0.82]) ctx.fillRect(bx + w * u - 2, by - h, 4, h);
  ctx.fillStyle = grad(ctx, x - 4, 0, x + 4, 0, [[0, 0xd0b060], [1, 0x8a6a20]]);
  ctx.fillRect(x - 4 - 2, by - h * 0.62, 8, 7);
  // spilled coins
  for (let k = 0; k < 7; k++) {
    ctx.fillStyle = css(lit(0xe0b040, 0.8 + r() * 0.5));
    ctx.beginPath(); ctx.ellipse(x - 26 + r() * 52, y + 2 + r() * 4, 2.6, 1.3, 0, 0, Math.PI * 2); ctx.fill();
  }
};
