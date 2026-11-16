import { CASTLE_SIZE } from '../constants';

export const MAP_W = 110;
export const MAP_H = 40;
/** Build zone width (tiles) at either end; the neutral battlefield in between is MAP_W - 2 - 2·ZONE_W wide. */
export const ZONE_W = 30;

export interface Rect { x: number; y: number; w: number; h: number }

export interface MapDef {
  width: number;
  height: number;
  /** Castle footprints per team (top-left tile, CASTLE_SIZE square). */
  castles: [Rect, Rect];
  /** Build zones per team (inclusive tile rectangles). */
  zones: [Rect, Rect];
  rocks: Rect[];
}

const cy = Math.floor(MAP_H / 2) - CASTLE_SIZE / 2;

/** Rock `r` plus its point mirror image (the map is point-symmetric, so neither side is favoured). */
const mirrored = (...rs: Rect[]): Rect[] => rs.flatMap((r) => {
  const m = { x: MAP_W - r.x - r.w, y: MAP_H - r.y - r.h, w: r.w, h: r.h };
  return m.x === r.x && m.y === r.y ? [r] : [r, m];
});

/**
 * Horizontal battlefield, left to right: castles near either end inside the build zones,
 * a wide neutral middle where rock outcrops form three lanes around a centre boulder.
 */
export const MAP: MapDef = {
  width: MAP_W,
  height: MAP_H,
  // Castles sit inside their build zones, so players can also build behind them.
  castles: [
    { x: 9, y: cy, w: CASTLE_SIZE, h: CASTLE_SIZE },
    { x: MAP_W - 9 - CASTLE_SIZE, y: cy, w: CASTLE_SIZE, h: CASTLE_SIZE },
  ],
  zones: [
    { x: 1, y: 1, w: ZONE_W, h: MAP_H - 2 },
    { x: MAP_W - 1 - ZONE_W, y: 1, w: ZONE_W, h: MAP_H - 2 },
  ],
  rocks: mirrored(
    // Two long outcrops split the middle into a top, centre and bottom lane.
    { x: 49, y: 7, w: 12, h: 6 },
    // Centre boulder.
    { x: 54, y: 19, w: 2, h: 2 },
    // Cliffs at the map edge that narrow the outer lanes near the zones.
    { x: 39, y: 0, w: 2, h: 4 },
    { x: 39, y: 36, w: 1, h: 4 },
    // Scattered stones.
    { x: 44, y: 16, w: 1, h: 1 },
    { x: 36, y: 10, w: 1, h: 1 },
    { x: 46, y: 28, w: 2, h: 1 },
  ),
};

export function inRect(r: Rect, x: number, y: number): boolean {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}

export function rectCenter(r: Rect): { x: number; y: number } {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/** Distance from point to the nearest edge of a rect (0 when inside). */
export function distToRect(r: Rect, x: number, y: number): number {
  const dx = Math.max(r.x - x, 0, x - (r.x + r.w));
  const dy = Math.max(r.y - y, 0, y - (r.y + r.h));
  return Math.hypot(dx, dy);
}
