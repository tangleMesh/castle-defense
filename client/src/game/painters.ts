import type { BuildingDef, UnitDef } from '@bc/shared';
import type { Ctx } from './paint';

/**
 * Registries for faction-specific sprite painters. Each race keeps its unit shapes and building
 * styles in its own module under ./races (registered on import, see ./races/index.ts); units.ts
 * and structures.ts fall back to these for shapes and styles they don't draw themselves.
 */
export interface UnitPose {
  /** Walk phase in [0, 1). */
  ph: number;
  moving: boolean;
  attack: boolean;
}
export type UnitPainter = (c: Ctx, u: UnitDef, cx: number, fy: number, S: (v: number) => number, pose: UnitPose) => void;

/** Where a building stands on its canvas (see structures.ts paintBuilding). */
export interface BuildingSite {
  ox: number; oy: number; s: number; mid: { x: number; y: number }; seed: number; H: number;
  /** Front-right corner of a k-tile box centred on the footprint (lifted onto the plinth). */
  inset: (k: number) => readonly [number, number];
  /** Centre-front point of a round structure k tiles across. */
  stand: (k: number) => readonly [number, number];
}
export type BuildingPainter = (ctx: Ctx, def: BuildingDef, site: BuildingSite) => void;
/** Ground under a faction's buildings (plinth / earth patch). */
export type PlinthPainter = (ctx: Ctx, ox: number, oy: number, s: number, seed: number) => void;

export const UNIT_PAINTERS: Record<string, UnitPainter> = {};
export const BUILDING_PAINTERS: Record<string, BuildingPainter> = {};
export const PLINTHS: Record<string, PlinthPainter> = {};
