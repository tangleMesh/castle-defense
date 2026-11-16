import { MAP } from '@bc/shared';
import { WORLD, toScreen } from './iso';

/** How many tiles of countryside (and fog) surround the map. */
export const OUTER_TILES = 40;
/** World px beyond the map's bounding box that the outer ground covers (the most zoomed-out view). */
export const OUTER_MARGIN = 2560;

export interface Decor {
  kind: 'tree' | 'bush' | 'rock' | 'flower';
  key: string;
  /** Tile position (with jitter). */
  x: number;
  y: number;
  r: number;
  r2: number;
  scale: number;
}

const hash = (x: number, y: number) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
const rnd = (x: number, y: number, s: number) => (hash(x + s * 977, y - s * 131) % 10007) / 10007;

/** Smooth-ish value noise on a 5-tile grid so trees grow in groves with meadows between. */
function clump(x: number, y: number) {
  const fx = x / 5, fy = y / 5, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
  const n = (i: number, j: number) => rnd(i, j, 7);
  const top = n(ix, iy) * (1 - tx) + n(ix + 1, iy) * tx, bot = n(ix, iy + 1) * (1 - tx) + n(ix + 1, iy + 1) * tx;
  return top * (1 - ty) + bot * ty;
}

/** Ponds in the countryside (tile coords, radius in tiles); kept clear of trees. */
export const PONDS: Array<{ x: number; y: number; r: number }> = [
  { x: 20, y: -6, r: 3.2 },
  { x: MAP.width + 5, y: 20, r: 2.6 },
  { x: 58, y: MAP.height + 6, r: 3 },
];
const inPond = (x: number, y: number) => PONDS.some((p) => Math.hypot((x - p.x) / 1.15, y - p.y) < p.r + 1.2);

let cache: Decor[] | null = null;

/**
 * Deterministic forest belt around the map, shared by the battlefield and the minimap.
 * The front edge (bottom on screen) keeps a clearing so tall trees never hide units.
 */
export function outerDecor(): Decor[] {
  if (cache) return cache;
  const out: Decor[] = [];
  const W = MAP.width, H = MAP.height, B = OUTER_TILES, M = OUTER_MARGIN;
  const view = { x0: WORLD.minX - M * 0.7, x1: WORLD.maxX + M * 0.7, y0: WORLD.minY - M * 0.5, y1: WORLD.maxY + M * 0.5 };
  for (let y = -B; y < H + B; y++) {
    for (let x = -B; x < W + B; x++) {
      if (x >= 0 && y >= 0 && x < W && y < H) continue;
      if (inPond(x + 0.5, y + 0.5)) continue;
      const c = toScreen(x + 0.5, y + 0.5);
      if (c.x < view.x0 || c.x > view.x1 || c.y < view.y0 || c.y > view.y1) continue;
      // Only the south edge lies in front of the battlefield; the sides and the north are behind.
      const front = Math.max(y - H + 1, 0);
      const back = Math.max(-x, -y, x - W + 1, 0);
      const d = Math.max(front, back);
      const gap = front > 0 ? 4 : 1;
      const r = rnd(x, y, 1), r2 = rnd(x, y, 2);
      const px = x + 0.5 + (rnd(x, y, 3) - 0.5) * 0.6, py = y + 0.5 + (rnd(x, y, 4) - 0.5) * 0.6;
      const density = d <= gap ? 0 : Math.min(1, (d - gap) / 4) * (d < gap + 10 ? 0.75 : 0.3) * (0.35 + 1.1 * clump(x, y));
      const base = { x: px, y: py, r, r2, scale: 1 };
      if (r < density) {
        const key = r2 < 0.55 ? `tree_p${Math.floor(r2 * 100) % 3}` : `tree_o${Math.floor(r2 * 100) % 3}`;
        out.push({ ...base, kind: 'tree', key, scale: 0.85 + rnd(x, y, 5) * 0.35 });
      } else if (r < density + 0.07) {
        out.push({ ...base, kind: 'bush', key: `bush${Math.floor(r2 * 10) % 2}` });
      } else if (r > 0.985 && d > gap) {
        out.push({ ...base, kind: 'rock', key: `rock${Math.floor(r2 * 6)}`, scale: 0.7 });
      } else if (r2 < 0.12) {
        out.push({ ...base, kind: 'flower', key: r2 < 0.05 ? 'flowers' : 'tuft' });
      }
    }
  }
  cache = out;
  return out;
}
