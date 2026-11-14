import { CASTLE_SIZE } from '../constants';

export const MAP_W = 80;
export const MAP_H = 28;

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

/**
 * Horizontal battlefield: castles near either end inside the build zones (outer thirds),
 * rock outcrops in the middle form three lanes and a centre boulder.
 */
export const MAP: MapDef = {
  width: MAP_W,
  height: MAP_H,
  // Castles sit inside their build zones, so players can also build behind them.
  castles: [
    { x: 8, y: cy, w: CASTLE_SIZE, h: CASTLE_SIZE },
    { x: MAP_W - 8 - CASTLE_SIZE, y: cy, w: CASTLE_SIZE, h: CASTLE_SIZE },
  ],
  zones: [
    { x: 1, y: 1, w: 27, h: MAP_H - 2 },
    { x: MAP_W - 1 - 27, y: 1, w: 27, h: MAP_H - 2 },
  ],
  rocks: [
    { x: 36, y: 5, w: 8, h: 4 },
    { x: 36, y: 19, w: 8, h: 4 },
    { x: 39, y: 13, w: 2, h: 2 },
    { x: 31, y: 0, w: 2, h: 3 },
    { x: 47, y: 25, w: 2, h: 3 },
    { x: 31, y: 25, w: 1, h: 3 },
    { x: 48, y: 0, w: 1, h: 3 },
    { x: 33, y: 11, w: 1, h: 1 },
    { x: 46, y: 16, w: 1, h: 1 },
  ],
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
