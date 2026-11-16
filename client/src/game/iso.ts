import { MAP } from '@bc/shared';

/** Canvas pixels per CSS pixel (Retina = 2). The game canvas renders at this density. */
export const DPR = typeof window === 'undefined' ? 1 : Math.min(2, Math.max(1, window.devicePixelRatio || 1));

/**
 * Front 3/4 view: the camera looks at the battlefield from the south. Tile x (the battlefield,
 * castle to castle) runs straight left to right; tile y runs towards the viewer, foreshortened and
 * leaning slightly right, so buildings show their front (south) wall, a narrow east wall and the roof.
 */
/** Screen px per tile along x. */
export const TX = 44;
/** Screen px per tile along y (towards the viewer). */
export const TY = 26;
/** Screen px the y axis leans right per tile. */
export const SK = 10;
/** Screen vectors of one tile step along x and along y. */
export const EX = { x: TX, y: 0 } as const;
export const EY = { x: SK, y: TY } as const;

/** Tile-space (x along the battlefield, y across) → world pixels. */
export function toScreen(x: number, y: number): { x: number; y: number } {
  return { x: x * TX + y * SK, y: y * TY };
}

export function toTile(sx: number, sy: number): { x: number; y: number } {
  const y = sy / TY;
  return { x: (sx - y * SK) / TX, y };
}

/** Bounds of the whole map in world pixels. */
export const WORLD = {
  minX: 0,
  maxX: MAP.width * TX + MAP.height * SK,
  minY: 0,
  maxY: MAP.height * TY,
};

/** Render depth for something whose foot is at tile (x,y): further south is in front. */
export function depthAt(x: number, y: number): number {
  return y * TY + x * 0.01;
}

/** A circle of radius r tiles becomes this ellipse on screen (the slight lean is ignored). */
export function isoEllipse(r: number): { w: number; h: number } {
  return { w: 2 * r * TX, h: 2 * r * TY };
}

export const TEAM_COLORS = [0x3a8bff, 0xff4a3a] as const;
export const TEAM_CSS = ['#4f9bff', '#ff5a48'] as const;
export const TEAM_NAMES = ['Dawn', 'Dusk'] as const;
