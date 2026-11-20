import { MAP } from '@bc/shared';
import { TEAM_COLORS } from '../iso';
import { mulberry } from './util';

/** Pixels per tile of the 3D ground texture. */
const P = 24;

const hex = (c: number, a = 1) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;

/**
 * The battlefield seen from above for the 3D view: meadow grass with soft patches, the two build
 * zones (faintly tinted in their team colour, with a worn border), paved castle yards and the three
 * trodden lanes between the castles.
 */
export function paintGround3d(): HTMLCanvasElement {
  const W = MAP.width, H = MAP.height;
  const c = document.createElement('canvas');
  c.width = W * P; c.height = H * P;
  const g = c.getContext('2d')!;
  const rnd = mulberry(11);
  // Base meadow with large soft patches.
  g.fillStyle = '#5b7f37';
  g.fillRect(0, 0, c.width, c.height);
  for (let k = 0; k < 260; k++) {
    const x = rnd() * c.width, y = rnd() * c.height, r = (2 + rnd() * 7) * P;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    const tone = rnd() < 0.5 ? [86, 122, 50] : [104, 138, 58];
    gr.addColorStop(0, `rgba(${tone[0]},${tone[1]},${tone[2]},0.45)`);
    gr.addColorStop(1, `rgba(${tone[0]},${tone[1]},${tone[2]},0)`);
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  // The road from castle to castle along the centre, worn into a soft dirt band.
  const z0 = MAP.zones[0], z1 = MAP.zones[1];
  const cy = (MAP.castles[0].y + MAP.castles[0].h / 2) * P;
  const x0 = (MAP.castles[0].x + MAP.castles[0].w) * P, x1 = MAP.castles[1].x * P;
  for (let x = x0; x < x1; x += P * 0.25) {
    const wob = Math.sin(x / (P * 7)) * P * 0.6 + Math.sin(x / (P * 2.3)) * P * 0.15;
    const half = P * (1.0 + 0.15 * Math.sin(x / (P * 3.1)));
    const gr = g.createLinearGradient(0, cy + wob - half * 1.6, 0, cy + wob + half * 1.6);
    gr.addColorStop(0, 'rgba(126,104,66,0)'); gr.addColorStop(0.3, 'rgba(132,108,68,0.85)'); gr.addColorStop(0.7, 'rgba(126,102,64,0.85)'); gr.addColorStop(1, 'rgba(126,104,66,0)');
    g.fillStyle = gr;
    g.fillRect(x, cy + wob - half * 1.6, P * 0.3, half * 3.2);
  }
  // Trodden lanes (top, centre, bottom) between the zones.
  for (const ly of [3.5, H / 2, H - 3.5]) {
    for (let k = 0; k < 900; k++) {
      const x = (z0.x + z0.w - 2 + rnd() * (z1.x - z0.x - z0.w + 4)) * P;
      const y = (ly + (rnd() - 0.5) * 3.2 * (0.6 + rnd())) * P;
      g.fillStyle = `rgba(${120 + rnd() * 30},${100 + rnd() * 20},${62 + rnd() * 16},${0.12 + rnd() * 0.12})`;
      g.beginPath(); g.ellipse(x, y, (0.3 + rnd() * 0.6) * P, (0.2 + rnd() * 0.3) * P, rnd() * 3, 0, Math.PI * 2); g.fill();
    }
  }
  // Grass blades / speckles.
  for (let k = 0; k < W * H * 6; k++) {
    const x = rnd() * c.width, y = rnd() * c.height;
    g.fillStyle = rnd() < 0.5 ? 'rgba(40,70,25,0.35)' : 'rgba(150,180,90,0.25)';
    g.fillRect(x, y, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  // Build zones: faint team tint and a worn edge.
  MAP.zones.forEach((z, t) => {
    g.fillStyle = hex(TEAM_COLORS[t], 0.07);
    g.fillRect(z.x * P, z.y * P, z.w * P, z.h * P);
    g.strokeStyle = 'rgba(90,72,44,0.55)';
    g.lineWidth = P * 0.18;
    g.setLineDash([P * 0.6, P * 0.35]);
    g.strokeRect(z.x * P, z.y * P, z.w * P, z.h * P);
    g.setLineDash([]);
  });
  // Paved castle yards.
  for (const r of MAP.castles) {
    const m = 1.2;
    g.fillStyle = '#8a8070';
    g.fillRect((r.x - m) * P, (r.y - m) * P, (r.w + 2 * m) * P, (r.h + 2 * m) * P);
    for (let y = r.y - m; y < r.y + r.h + m; y += 0.5) for (let x = r.x - m; x < r.x + r.w + m; x += 0.5) {
      const v = 110 + Math.floor(rnd() * 40);
      g.fillStyle = `rgb(${v},${v - 6},${v - 16})`;
      g.fillRect(x * P + 1, y * P + 1, P / 2 - 2, P / 2 - 2);
    }
  }
  return c;
}
