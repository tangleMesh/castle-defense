import { MAP, type Rect } from '../map/map';
import type { Entity, SimState, Team } from './state';

export const W = MAP.width;
export const H = MAP.height;
export const UNREACHABLE = 0xffff;

export const idx = (x: number, y: number) => y * W + x;
export const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;

/** Tiles occupied by rocks only (static). */
export const ROCK_GRID: Uint8Array = (() => {
  const g = new Uint8Array(W * H);
  for (const r of MAP.rocks) fillRect(g, r, 1);
  return g;
})();

export function fillRect(g: Uint8Array, r: Rect, v: number) {
  for (let y = r.y; y < r.y + r.h; y++)
    for (let x = r.x; x < r.x + r.w; x++) if (inBounds(x, y)) g[idx(x, y)] = v;
}

export function footprint(e: Entity): Rect {
  return { x: e.tx!, y: e.ty!, w: e.size!, h: e.size! };
}

/** Blocked grid: rocks + buildings + castles. */
export function buildBlockedGrid(state: SimState): Uint8Array {
  const g = ROCK_GRID.slice();
  for (const e of state.entities) {
    if (e.kind === 'building' || e.kind === 'castle') fillRect(g, footprint(e), 1);
  }
  return g;
}

const DIRS: Array<[number, number, number]> = [
  [1, 0, 10], [-1, 0, 10], [0, 1, 10], [0, -1, 10],
  [1, 1, 14], [1, -1, 14], [-1, 1, 14], [-1, -1, 14],
];

/** Can a ground walker step from (x,y) in direction (dx,dy) without cutting a blocked corner? */
export function canStep(blocked: Uint8Array, x: number, y: number, dx: number, dy: number): boolean {
  const nx = x + dx, ny = y + dy;
  if (!inBounds(nx, ny) || blocked[idx(nx, ny)]) return false;
  if (dx !== 0 && dy !== 0) {
    if (blocked[idx(x + dx, y)] || blocked[idx(x, y + dy)]) return false;
  }
  return true;
}

/**
 * Dijkstra flow field: distance (in 1/10 tiles) from every walkable tile to the
 * walkable ring around the target castle.
 */
export function computeFlowField(blocked: Uint8Array, target: Rect): Uint16Array {
  const dist = new Uint16Array(W * H).fill(UNREACHABLE);
  const heap = new MinHeap();
  for (let y = target.y - 1; y <= target.y + target.h; y++) {
    for (let x = target.x - 1; x <= target.x + target.w; x++) {
      if (!inBounds(x, y) || blocked[idx(x, y)]) continue;
      dist[idx(x, y)] = 0;
      heap.push(idx(x, y), 0);
    }
  }
  while (heap.size) {
    const [i, d] = heap.pop();
    if (d > dist[i]) continue;
    const x = i % W, y = (i / W) | 0;
    for (const [dx, dy, c] of DIRS) {
      if (!canStep(blocked, x, y, dx, dy)) continue;
      const ni = idx(x + dx, y + dy);
      const nd = d + c;
      if (nd < dist[ni]) { dist[ni] = nd; heap.push(ni, nd); }
    }
  }
  return dist;
}

/** Best next tile centre for a walker on (tx,ty) following `field`, or null at goal / unreachable. */
export function flowStep(field: Uint16Array, blocked: Uint8Array, tx: number, ty: number): { x: number; y: number } | null {
  if (!inBounds(tx, ty)) return null;
  const here = field[idx(tx, ty)];
  let best = here, bx = -1, by = -1;
  for (const [dx, dy] of DIRS) {
    if (!canStep(blocked, tx, ty, dx, dy)) continue;
    const v = field[idx(tx + dx, ty + dy)];
    if (v < best) { best = v; bx = tx + dx; by = ty + dy; }
  }
  return bx < 0 ? null : { x: bx + 0.5, y: by + 0.5 };
}

/** True when every walkable tile is connected to every other one (no enclosed pockets). */
export function isFullyConnected(blocked: Uint8Array): boolean {
  let total = 0, start = -1;
  for (let i = 0; i < blocked.length; i++) if (!blocked[i]) { total++; if (start < 0) start = i; }
  if (start < 0) return false;
  const seen = new Uint8Array(blocked.length);
  const stack = [start];
  seen[start] = 1;
  let count = 0;
  while (stack.length) {
    const i = stack.pop()!;
    count++;
    const x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of DIRS) {
      if (!canStep(blocked, x, y, dx, dy)) continue;
      const ni = idx(x + dx, y + dy);
      if (!seen[ni]) { seen[ni] = 1; stack.push(ni); }
    }
  }
  return count === total;
}

/** Nearest unblocked tile centre to (x,y) by expanding rings. */
export function nearestFree(blocked: Uint8Array, x: number, y: number): { x: number; y: number } {
  const cx = Math.floor(x), cy = Math.floor(y);
  for (let r = 0; r < Math.max(W, H); r++) {
    let best: { x: number; y: number; d: number } | null = null;
    for (let yy = cy - r; yy <= cy + r; yy++) {
      for (let xx = cx - r; xx <= cx + r; xx++) {
        if (Math.max(Math.abs(xx - cx), Math.abs(yy - cy)) !== r) continue;
        if (!inBounds(xx, yy) || blocked[idx(xx, yy)]) continue;
        const d = Math.hypot(xx + 0.5 - x, yy + 0.5 - y);
        if (!best || d < best.d) best = { x: xx + 0.5, y: yy + 0.5, d };
      }
    }
    if (best) return best;
  }
  return { x, y };
}

export function castleRect(team: Team): Rect {
  return MAP.castles[team];
}

class MinHeap {
  private items: number[] = [];
  private prios: number[] = [];
  get size() { return this.items.length; }
  push(item: number, prio: number) {
    this.items.push(item); this.prios.push(prio);
    let i = this.items.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.prios[p] <= this.prios[i]) break;
      this.swap(i, p); i = p;
    }
  }
  pop(): [number, number] {
    const top: [number, number] = [this.items[0], this.prios[0]];
    const li = this.items.pop()!, lp = this.prios.pop()!;
    if (this.items.length) {
      this.items[0] = li; this.prios[0] = lp;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < this.items.length && this.prios[l] < this.prios[m]) m = l;
        if (r < this.items.length && this.prios[r] < this.prios[m]) m = r;
        if (m === i) break;
        this.swap(i, m); i = m;
      }
    }
    return top;
  }
  private swap(a: number, b: number) {
    [this.items[a], this.items[b]] = [this.items[b], this.items[a]];
    [this.prios[a], this.prios[b]] = [this.prios[b], this.prios[a]];
  }
}
