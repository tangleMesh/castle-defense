import '../game/races';
import { UNIT_CANVAS, outline, paintBuilder } from '../game/units';

const cache = new Map<string, string>();

/**
 * A faction's builder painted onto a small canvas, as an image URL for the lobby (no Phaser needed:
 * the same painter the game uses for its builder sprites). Cropped to the figure and cached.
 */
export function builderPortrait(faction: string): string {
  const hit = cache.get(faction);
  if (hit) return hit;
  const R = 2;
  const src = document.createElement('canvas');
  src.width = UNIT_CANVAS.w * R; src.height = UNIT_CANVAS.h * R;
  const c = src.getContext('2d')!;
  c.scale(R, R);
  paintBuilder(c, '', faction);
  const o = outline(src, 1.4 * R);
  // Crop to the upper body area where every builder stands (foot at the bottom, centred).
  const crop = document.createElement('canvas');
  const size = 38;
  crop.width = size * R * 2; crop.height = size * R * 2;
  crop.getContext('2d')!.drawImage(o, (UNIT_CANVAS.w / 2 - size / 2) * R, (UNIT_CANVAS.footY - size + 2) * R, size * R, size * R, 0, 0, size * R * 2, size * R * 2);
  const url = crop.toDataURL();
  cache.set(faction, url);
  return url;
}
