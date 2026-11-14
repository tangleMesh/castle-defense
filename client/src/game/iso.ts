import { MAP } from '@bc/shared';

/** Canvas pixels per CSS pixel (Retina = 2). The game canvas renders at this density. */
export const DPR = typeof window === 'undefined' ? 1 : Math.min(2, Math.max(1, window.devicePixelRatio || 1));

export const TW = 64;
export const TH = 32;
const HW = TW / 2;
const HH = TH / 2;

/** Tile-space (x along the battlefield, y across) → world pixels. */
export function toScreen(x: number, y: number): { x: number; y: number } {
  return { x: (x - y) * HW, y: (x + y) * HH };
}

export function toTile(sx: number, sy: number): { x: number; y: number } {
  return { x: (sx / HW + sy / HH) / 2, y: (sy / HH - sx / HW) / 2 };
}

/** Bounds of the whole map in world pixels. */
export const WORLD = {
  minX: -MAP.height * HW,
  maxX: MAP.width * HW,
  minY: 0,
  maxY: (MAP.width + MAP.height) * HH,
};

/** Render depth for something whose foot is at tile (x,y). */
export function depthAt(x: number, y: number): number {
  return (x + y) * HH;
}

/** A circle of radius r tiles becomes this ellipse on screen. */
export function isoEllipse(r: number): { w: number; h: number } {
  return { w: 2 * r * HW * Math.SQRT2, h: 2 * r * HH * Math.SQRT2 };
}

export const TEAM_COLORS = [0x3a8bff, 0xff4a3a] as const;
export const TEAM_CSS = ['#4f9bff', '#ff5a48'] as const;
export const TEAM_NAMES = ['Dawn', 'Dusk'] as const;
