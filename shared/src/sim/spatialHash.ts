import type { Entity } from './state';

/** Uniform-grid bucket index for fast radius queries over units. */
export class SpatialHash {
  private cells = new Map<number, Entity[]>();
  constructor(private cell: number) {}

  private key(cx: number, cy: number) {
    return (cx + 1024) * 4096 + (cy + 1024);
  }

  rebuild(entities: Entity[]) {
    this.cells.clear();
    for (const e of entities) {
      const k = this.key(Math.floor(e.x / this.cell), Math.floor(e.y / this.cell));
      let b = this.cells.get(k);
      if (!b) this.cells.set(k, (b = []));
      b.push(e);
    }
  }

  /** All indexed entities whose centre lies within `r` (+ slack) of (x,y), in insertion order per cell. */
  query(x: number, y: number, r: number, out: Entity[] = []): Entity[] {
    const c = this.cell;
    const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
    const y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c);
    const r2 = r * r;
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const b = this.cells.get(this.key(cx, cy));
        if (!b) continue;
        for (const e of b) {
          const dx = e.x - x, dy = e.y - y;
          if (dx * dx + dy * dy <= r2) out.push(e);
        }
      }
    }
    return out;
  }
}
