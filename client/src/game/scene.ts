import Phaser from 'phaser';
import {
  BUILDINGS, FX_POISON, FX_STUN, builderBounds, CASTLE_CLEARANCE, TICK_RATE, CASTLE_SIZE, MAP, RESCUE_RADIUS, inRescueArea, ROCK_GRID, UNITS, entityVisible, fogActive, inRect, itemEffect, rectCenter,
  visionFromRows, type EntRow, type SimEvent, type Team,
} from '@bc/shared';
import { DPR, TEAM_COLORS, WORLD, depthAt, isoEllipse, toScreen, toTile } from './iso';
import { ANCHORS, FLAG_FRAMES, TEX_RES, UNIT_TEX, generateTextures, originOf, texHeight } from './textures';
import type { MatchSession } from './session';
import { OUTER_MARGIN, OUTER_TILES, PONDS, outerDecor } from './landscape';
import { paintPond } from './props';
import { paper } from './paint';
import { paintGround, paintOuterTile } from './ground';
import { Atmosphere } from './atmosphere';
import { Ambient } from './ambient';

/** Ground paintings are low-frequency; 1.5× is plenty even on Retina and saves GPU memory. */
const GROUND_RES = Math.min(TEX_RES, 1.5);

interface View {
  id: number;
  /** Status flags from the snapshot (FX_POISON). */
  fx?: number;
  kind: number;
  type: string;
  team: Team;
  owner: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  extra: number;
  sprite: Phaser.GameObjects.Image;
  shadow?: Phaser.GameObjects.Image;
  ring?: Phaser.GameObjects.Image;
  /** Waving team pennants at the structure's flag anchors. */
  flags?: Phaser.GameObjects.Image[];
  /** Flickering light sources (windows, braziers, torches). */
  glows?: Phaser.GameObjects.Image[];
  /** Next time (ms) a chimney puffs smoke. */
  nextSmoke?: number;
  scaffold?: Phaser.GameObjects.Image;
  air: boolean;
  facing: 1 | -1;
  moving: boolean;
  lunge: number;
  /** ms left in the attack pose (melee and ranged). */
  atk: number;
  flash: number;
  /** Ticks until the next spawn (spawn buildings). */
  spawn: number;
  /** Castle that has collapsed (shows the ruin texture). */
  ruined?: boolean;
}

const KIND_UNIT = 0, KIND_BUILDING = 1, KIND_BUILDER = 2, KIND_CASTLE = 3;
const WALK = ['', '_w1', '_w2', '_w3'];
const AIR_LIFT = 22;
/** Units are drawn slightly larger than their footprint for readability. */
const UNIT_SCALE = 1.25;
/** Logical scale → image scale for TEX_RES× textures. */
const sc = (v: number) => v / TEX_RES;


/** Renders the isometric battlefield from interpolated snapshots and handles world input. */
export class GameScene extends Phaser.Scene {
  session!: MatchSession;
  views = new Map<number, View>();
  private bars!: Phaser.GameObjects.Graphics;
  private overlay!: Phaser.GameObjects.Graphics;
  private ghost!: Phaser.GameObjects.Image;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private mouse = { x: -1, y: -1, inside: false, overControl: false };
  private hoverTile = { x: 0, y: 0 };
  private dragStart: { x: number; y: number; sx: number; sy: number } | null = null;
  private telegraphs: Array<{ x: number; y: number; until: number; obj: Phaser.GameObjects.Image }> = [];
  /** Current fog-of-war grid (1 = visible), null while fog is off (between rounds). */
  vision: Uint8Array | null = null;
  private visionKey = '';
  private fog!: Phaser.GameObjects.Graphics;
  /** Last-seen enemy buildings that are now hidden in the fog. */
  ghosts = new Map<number, View>();
  /** True while the castle-collapse cinematic runs: the camera is locked for every player. */
  cinematic = false;
  /** Resolves when the current (or last) cinematic has finished. */
  cinematicDone: Promise<void> = Promise.resolve();
  private collapsing = new Set<number>();
  onReady?: () => void;
  shiftHeld = false;
  private atmosphere!: Atmosphere;
  /** Painted ground chunks in world coordinates (the minimap reuses them). */
  /** Forest trees around the map (they sway in the wind). */
  trees: Phaser.GameObjects.Image[] = [];
  groundChunks: Array<{ canvas: HTMLCanvasElement; x: number; y: number; w: number; h: number }> = [];
  private ambient!: Ambient;
  showAllBars = false;

  constructor() { super('game'); }

  /** Image from a generated (TEX_RES×) texture, shown at logical size. Use `sc()` for any further scaling. */
  private img(x: number, y: number, key: string) {
    return this.add.image(x, y, key).setScale(1 / TEX_RES);
  }

  init(data: { session: MatchSession }) {
    this.session = data.session;
  }

  create() {
    const t0 = performance.now();
    generateTextures(this);
    const t1 = performance.now();
    this.buildGround();
    if (location.search.includes('debug')) console.info(`[perf] textures ${Math.round(t1 - t0)} ms, ground ${Math.round(performance.now() - t1)} ms`);
    const cam = this.cameras.main;
    cam.setBackgroundColor('#16210f');
    cam.setZoom(DPR);
    cam.setBounds(WORLD.minX - 300, WORLD.minY - 300, WORLD.maxX - WORLD.minX + 600, WORLD.maxY - WORLD.minY + 520);
    this.centerOnCastle();
    this.atmosphere = new Atmosphere(this, TEX_RES);
    this.ambient = new Ambient(this, TEX_RES);
    this.ambient.trees = this.trees;

    this.fog = this.add.graphics().setDepth(4.5e6);
    this.overlay = this.add.graphics().setDepth(5e6);
    this.bars = this.add.graphics().setDepth(9e6);
    this.ghost = this.img(0, 0, '__WHITE').setVisible(false).setDepth(8e6).setAlpha(0.65);

    this.keys = this.input.keyboard!.addKeys({ up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT' }, false) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.mouse?.disableContextMenu();
    this.setupPointer();

    const onMove = (e: MouseEvent) => {
      this.mouse.x = e.clientX; this.mouse.y = e.clientY;
      this.mouse.inside = true;
      // Don't edge-scroll while pointing at a HUD control (menu button, command card, minimap…).
      this.mouse.overControl = !!(e.target as Element | null)?.closest?.('button, input, select, a, .minimap, .chat-box');
    };
    const onLeave = () => { this.mouse.inside = false; };
    window.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    this.events.once('shutdown', () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
    });

    this.session.on('event', (ev: SimEvent) => this.onSimEvent(ev));
    this.onReady?.();
  }

  // ---------------------------------------------------------------- terrain

  /**
   * Endless countryside around the battlefield: a seamlessly repeating iso-grass texture far
   * beyond the map edges, plus forest, bushes and rocks so the border reads as a natural edge.
   */
  private buildOuterLand() {
    // A painted, seamlessly repeating meadow.
    const PW = 512, PH = 512;
    if (this.textures.exists('outerGround')) this.textures.remove('outerGround');
    this.textures.addCanvas('outerGround', paintOuterTile(PW, GROUND_RES));
    const M = OUTER_MARGIN;
    const x0 = Math.floor((WORLD.minX - M) / PW) * PW, y0 = Math.floor((WORLD.minY - M) / PH) * PH;
    const w = WORLD.maxX + M - x0, h = WORLD.maxY + M - y0;
    this.add.tileSprite(x0, y0, w * GROUND_RES, h * GROUND_RES, 'outerGround').setOrigin(0, 0).setScale(1 / GROUND_RES).setDepth(-1.1e7);

    // Ponds in the meadows, with glints dancing on the water.
    PONDS.forEach((pd, i) => {
      const key = `pond${i}`;
      const w = pd.r * 2 * 46, h = w / 2;
      const pp = paper(w, h, GROUND_RES);
      paintPond(pp.ctx, w, h, 300 + i);
      if (this.textures.exists(key)) this.textures.remove(key);
      this.textures.addCanvas(key, pp.canvas);
      const c = toScreen(pd.x, pd.y);
      this.add.image(c.x, c.y, key).setScale(1 / GROUND_RES).setDepth(-1.05e7);
      for (let k = 0; k < 6; k++) {
        const gl = this.img(c.x + (Math.random() - 0.5) * w * 0.6, c.y + (Math.random() - 0.5) * h * 0.5, 'spark')
          .setBlendMode(Phaser.BlendModes.ADD).setDepth(-1.04e7).setScale(sc(0.35)).setAlpha(0).setTint(0xfff8e0);
        this.tweens.add({ targets: gl, alpha: 0.7, duration: 500 + Math.random() * 500, yoyo: true, repeat: -1, delay: Math.random() * 3000, repeatDelay: 1500 + Math.random() * 3000 });
      }
    });
    for (const d of outerDecor()) {
      const p = toScreen(d.x, d.y);
      const depth = depthAt(d.x, d.y);
      if (d.kind === 'tree' || d.kind === 'bush' || d.kind === 'rock') {
        const o = originOf(d.key);
        const img = this.img(p.x, p.y + (d.kind === 'tree' ? 4 : 0), d.key).setOrigin(o.x, o.y).setDepth(depth).setScale(sc(d.scale));
        // Slight hue variation between trees.
        if (d.kind === 'tree') {
          img.setTint(Phaser.Display.Color.GetColor(225 + Math.floor(d.r * 30), 235, 225 + Math.floor(d.r2 * 30)));
          img.setData('ph', d.x * 0.4 + d.y * 0.25);
          this.trees.push(img);
        }
      } else {
        this.img(p.x, p.y, d.key).setDepth(-8e6).setAlpha(0.9);
      }
    }
  }

  private buildGround() {
    this.buildOuterLand();
    // The battlefield is one continuous painting, uploaded in chunks (GPU texture size limits).
    const painting = paintGround(GROUND_RES);
    const CH = 2048;
    for (let cy = 0; cy < painting.canvas.height; cy += CH) {
      for (let cx = 0; cx < painting.canvas.width; cx += CH) {
        const key = `ground_${cx}_${cy}`;
        const w = Math.min(CH, painting.canvas.width - cx), h = Math.min(CH, painting.canvas.height - cy);
        const chunk = document.createElement('canvas');
        chunk.width = w; chunk.height = h;
        chunk.getContext('2d')!.drawImage(painting.canvas, cx, cy, w, h, 0, 0, w, h);
        if (this.textures.exists(key)) this.textures.remove(key);
        this.textures.addCanvas(key, chunk);
        this.groundChunks.push({ canvas: chunk, x: painting.x0 + cx / GROUND_RES, y: painting.y0 + cy / GROUND_RES, w: w / GROUND_RES, h: h / GROUND_RES });
        this.add.image(painting.x0 + cx / GROUND_RES, painting.y0 + cy / GROUND_RES, key)
          .setOrigin(0, 0).setScale(1 / GROUND_RES).setDepth(-1e7);
      }
    }
    // Build zone borders: a faint dashed line in team colour.
    const g = this.add.graphics().setDepth(-9e6);
    for (const team of [0, 1] as const) {
      const z = MAP.zones[team];
      const pts = [toScreen(z.x, z.y), toScreen(z.x + z.w, z.y), toScreen(z.x + z.w, z.y + z.h), toScreen(z.x, z.y + z.h)];
      g.lineStyle(1.5, TEAM_COLORS[team], 0.3);
      for (let i = 0; i < 4; i++) {
        const p = pts[i], q = pts[(i + 1) % 4];
        const len = Math.hypot(q.x - p.x, q.y - p.y), n = Math.floor(len / 14);
        for (let k = 0; k < n; k += 2) {
          const t0 = k / n, t1 = (k + 1) / n;
          g.lineBetween(p.x + (q.x - p.x) * t0, p.y + (q.y - p.y) * t0, p.x + (q.x - p.x) * t1, p.y + (q.y - p.y) * t1);
        }
      }
    }
    // rocks
    const hash = (x: number, y: number) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
    for (let y = 0; y < MAP.height; y++) {
      for (let x = 0; x < MAP.width; x++) {
        const hv = hash(x + 1000, y);
        if (ROCK_GRID[y * MAP.width + x]) {
          const c = toScreen(x + 0.5, y + 0.5);
          const o = originOf(`rock${hv % 6}`);
          this.img(c.x, c.y + 6, `rock${hv % 6}`).setOrigin(o.x, o.y).setDepth(depthAt(x + 1, y + 1)).setScale(sc(1.15 + (hv % 5) * 0.08));
        }
      }
    }
  }

  // ---------------------------------------------------------------- camera

  centerOnTile(x: number, y: number) {
    if (this.cinematic) return;
    const p = toScreen(x, y);
    this.cameras.main.centerOn(p.x, p.y + 40);
  }

  centerOnCastle() {
    const c = rectCenter(MAP.castles[this.session.team]);
    this.centerOnTile(c.x + 8 * (this.session.team === 0 ? 1 : -1), c.y);
  }

  centerOnBuilder() {
    const me = this.session.me;
    const v = me && this.views.get(me.builderId);
    if (v) this.centerOnTile(v.x, v.y);
  }

  private updateCamera(dt: number) {
    const EDGE_SCROLL_PX = Math.max(28, Math.min(48, Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.04)));
    const cam = this.cameras.main;
    if (this.cinematic) return;
    const speed = (900 * DPR * dt) / 1000 / cam.zoom;
    let dx = 0, dy = 0;
    if (this.keys.left.isDown) dx -= 1;
    if (this.keys.right.isDown) dx += 1;
    if (this.keys.up.isDown) dy -= 1;
    if (this.keys.down.isDown) dy += 1;
    if (this.mouse.inside && document.hasFocus() && !this.dragStart && !this.mouse.overControl) {
      // Generous edge band; speed ramps up the closer the pointer is to the edge.
      const m = EDGE_SCROLL_PX;
      const ramp = (d: number) => (d >= m ? 0 : 0.35 + 0.9 * (1 - Math.max(0, d) / m));
      const { x, y } = this.mouse, W = window.innerWidth, H = window.innerHeight;
      dx += ramp(W - 1 - x) - ramp(x);
      dy += ramp(H - 1 - y) - ramp(y);
    }
    if (dx || dy) { cam.scrollX += dx * speed; cam.scrollY += dy * speed; }
  }

  /** Camera rectangle in world pixels (for the minimap). */
  viewRect() {
    return this.cameras.main.worldView;
  }

  // ---------------------------------------------------------------- input

  private worldTile(pointer: Phaser.Input.Pointer) {
    const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    return toTile(wp.x, wp.y);
  }

  private setupPointer() {
    // Keep a touchpad pinch (ctrl+wheel) from zooming the whole page instead of the map.
    this.game.canvas.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
    this.input.on('wheel', (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      const cam = this.cameras.main;
      if (this.cinematic) return;
      // Zoom in proportion to the scroll distance: a mouse-wheel notch (~100 px) zooms ~10%,
      // while a touchpad's stream of tiny deltas zooms smoothly instead of racing.
      const ev = p.event as WheelEvent | undefined;
      let d = dy * (ev?.deltaMode === 1 ? 33 : ev?.deltaMode === 2 ? 400 : 1);
      if (ev?.ctrlKey) d *= 2.5; // touchpad pinch (reported as ctrl+wheel) sends small deltas
      d = Phaser.Math.Clamp(d, -120, 120);
      cam.setZoom(Phaser.Math.Clamp(cam.zoom * Math.exp(-d * 0.001), 0.45 * DPR, 1.6 * DPR));
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const t = this.worldTile(p);
      this.hoverTile = t;
      if (this.dragStart && p.middleButtonDown()) {
        const cam = this.cameras.main;
        cam.scrollX = this.dragStart.sx - (p.x - this.dragStart.x) / cam.zoom;
        cam.scrollY = this.dragStart.sy - (p.y - this.dragStart.y) / cam.zoom;
      }
    });
    this.input.on('pointerup', () => { this.dragStart = null; });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const s = this.session;
      const t = this.worldTile(p);
      if (this.cinematic) return;
      if (p.middleButtonDown()) {
        this.dragStart = { x: p.x, y: p.y, sx: this.cameras.main.scrollX, sy: this.cameras.main.scrollY };
        return;
      }
      if (p.rightButtonDown()) {
        if (s.mode.kind !== 'none') { s.setMode({ kind: 'none' }); return; }
        s.send({ c: 'move', x: t.x, y: t.y });
        // The builder can't leave its build zone: show where it will actually stop.
        const z = builderBounds(s.team);
        this.moveMarker(Math.min(z.x1, Math.max(z.x0, t.x)), Math.min(z.y1, Math.max(z.y0, t.y)));
        return;
      }
      // left button
      if (s.mode.kind === 'place') {
        const def = BUILDINGS[s.mode.building];
        const { tx, ty } = this.ghostTile(def.size);
        const err = s.placementError(def.id, tx, ty);
        if (err) { this.flashError(err); return; }
        s.send({ c: 'build', building: def.id, tx, ty, queue: this.shiftHeld });
        if (!this.shiftHeld) s.setMode({ kind: 'none' });
        return;
      }
      if (s.mode.kind === 'rescue') {
        s.send({ c: 'rescue', x: t.x, y: t.y });
        s.setMode({ kind: 'none' });
        return;
      }
      s.select(this.pick(p));
    });
  }

  flashError: (msg: string) => void = () => {};

  private ghostTile(size: number) {
    return { tx: Math.round(this.hoverTile.x - size / 2), ty: Math.round(this.hoverTile.y - size / 2) };
  }

  /** Entity under the pointer: units and builders first, then structures. */
  private pick(p: Phaser.Input.Pointer): number | null {
    const wp = this.cameras.main.getWorldPoint(p.x, p.y);
    const t = toTile(wp.x, wp.y);
    let best: number | null = null, bestD = 22;
    for (const v of this.views.values()) {
      if (v.kind !== KIND_UNIT && v.kind !== KIND_BUILDER) continue;
      const s = toScreen(v.x, v.y);
      const cy = s.y - (v.air ? AIR_LIFT : 0) - 12 * (v.kind === KIND_UNIT ? UNITS[v.type].model.scale : 1);
      const d = Math.hypot(wp.x - s.x, wp.y - cy);
      if (d < bestD) { bestD = d; best = v.id; }
    }
    if (best !== null) return best;
    for (const v of this.views.values()) {
      if (v.kind !== KIND_BUILDING && v.kind !== KIND_CASTLE) continue;
      const size = v.kind === KIND_CASTLE ? CASTLE_SIZE : BUILDINGS[v.type].size;
      if (Math.abs(t.x - v.x) <= size / 2 + 0.2 && Math.abs(t.y - v.y) <= size / 2 + 0.2) return v.id;
      // also allow clicking the tall body above the footprint
      const s = toScreen(v.x, v.y);
      if (Math.abs(wp.x - s.x) < size * 16 && wp.y < s.y && wp.y > s.y - size * 30) return v.id;
    }
    return null;
  }

  // ---------------------------------------------------------------- views

  private makeView(row: EntRow): View {
    const [id, kind, type, owner, team, x, y, hp, maxHp, extra] = row;
    const ghost = this.ghosts.get(id);
    if (ghost) { this.destroyView(ghost); this.ghosts.delete(id); }
    const v: View = {
      id, kind, type, owner, team: team as Team, x, y, hp, maxHp, extra,
      spawn: 0, sprite: null!, air: false, facing: team === 0 ? 1 : -1, moving: false, lunge: 0, atk: 0, flash: 0,
    };
    if (kind === KIND_UNIT || kind === KIND_BUILDER) {
      const u = kind === KIND_UNIT ? UNITS[type] : null;
      v.air = !!u?.air;
      v.shadow = this.img(0, 0, 'shadow').setScale(sc((u?.radius ?? 0.3) * 2.2));
      v.ring = this.img(0, 0, 'ring').setTint(TEAM_COLORS[team]).setAlpha(0.55).setScale(sc((u?.radius ?? 0.32) * 1.6));
      v.sprite = this.img(0, 0, u ? `u_${type}` : 'builder').setOrigin(0.5, UNIT_TEX.footY / UNIT_TEX.h);
      if (kind === KIND_BUILDER) {
        v.ring.setScale(sc(0.6)).setAlpha(0.9);
        v.sprite.setScale(sc(1.1));
      } else if (this.session.latest?.phase === 'playing' && this.cameras.main.worldView.contains(toScreen(x, y).x, toScreen(x, y).y)) {
        // Freshly spawned: fade in with a little dust at the feet.
        v.sprite.setAlpha(0);
        this.tweens.add({ targets: v.sprite, alpha: 1, duration: 380, ease: 'Quad.easeOut' });
        const p = toScreen(x, y);
        this.puff(p.x, p.y - 2, 0xb0a080, 4, 12);
      }
    } else {
      const size = kind === KIND_CASTLE ? CASTLE_SIZE : BUILDINGS[type].size;
      const key = kind === KIND_CASTLE ? `castle${team}` : `b_${type}`;
      const o = originOf(key);
      v.ring = this.img(0, 0, 'tile_hl').setTint(TEAM_COLORS[team]).setAlpha(0.16).setScale(sc(size), sc(size));
      v.sprite = this.img(0, 0, key).setOrigin(o.x, o.y);
      const anchors = ANCHORS.get(key);
      // Buildings fly one pennant; the castle one on every tower.
      const flagPts = kind === KIND_CASTLE ? anchors?.flags ?? [] : (anchors?.flags ?? []).slice(0, 1);
      v.flags = flagPts.map(() => this.img(0, 0, 'flag0').setTint(TEAM_COLORS[team]).setOrigin(1.8 / 26, 1));
      v.glows = (anchors?.glow ?? []).map(() => this.img(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD));
      v.nextSmoke = 0;
      if (kind === KIND_BUILDING) {
        v.scaffold = this.img(0, 0, 'scaffold').setOrigin(0.5, 1).setVisible(false);
      }
    }
    this.views.set(id, v);
    return v;
  }

  private destroyView(v: View) {
    this.tweens.killTweensOf(v.sprite);
    v.sprite.destroy(); v.shadow?.destroy(); v.ring?.destroy(); v.scaffold?.destroy();
    v.flags?.forEach((f) => f.destroy()); v.glows?.forEach((g) => g.destroy());
    this.views.delete(v.id);
  }

  /** Footprints (top-left tile, size) and render depth of all buildings and castles this frame. */
  private structs: Array<{ x0: number; y0: number; s: number; d: number }> = [];

  private collectStructures(ents: readonly EntRow[]) {
    this.structs.length = 0;
    for (const e of ents) {
      if (e[1] !== KIND_BUILDING && e[1] !== KIND_CASTLE) continue;
      const s = e[1] === KIND_CASTLE ? CASTLE_SIZE : BUILDINGS[e[2]]?.size ?? 1;
      this.structs.push({ x0: e[5] - s / 2, y0: e[6] - s / 2, s, d: depthAt(e[5] + s / 2, e[6] + s / 2) - 2 });
    }
  }

  /**
   * Depth of a ground unit. Plain (x + y) sorting fails next to big footprints: a unit standing
   * in front of a castle's side face is still "behind" its front corner and got hidden. A unit
   * past either front face (x ≥ right edge or y ≥ bottom edge) of a nearby structure is lifted
   * just above that structure.
   */
  private unitDepth(x: number, y: number): number {
    let d = depthAt(x, y);
    for (const b of this.structs) {
      if (b.d < d) continue;
      const x1 = b.x0 + b.s, y1 = b.y0 + b.s;
      // Only structures whose sprite can overlap the unit on screen (near its footprint).
      if (x < b.x0 - 1 || y < b.y0 - 1 || x > x1 + b.s || y > y1 + b.s) continue;
      if (x >= x1 || y >= y1) d = b.d + 1;
    }
    return d;
  }

  private placeView(v: View, time: number) {
    if (v.kind === KIND_UNIT || v.kind === KIND_BUILDER) {
      const p = toScreen(v.x, v.y);
      const d = this.unitDepth(v.x, v.y);
      const bob = v.air ? Math.sin(time / 260 + v.id) * 3 : 0;
      const lungeOff = v.lunge > 0 ? Math.sin((v.lunge / 160) * Math.PI) * 5 * v.facing : 0;
      v.sprite.setPosition(p.x + lungeOff, p.y - (v.air ? AIR_LIFT : 0) + bob).setDepth(d + (v.air ? 5000 : 0));
      // Animation: walk cycle while moving (flyers always flap), attack pose while striking.
      const base = v.kind === KIND_UNIT ? `u_${v.type}` : 'builder';
      const step = Math.floor(time / (v.air ? 90 : 120) + v.id * 0.37) % 4;
      const frame = v.atk > 0 ? '_a' : v.moving || v.air ? WALK[step] : '';
      if (v.sprite.texture.key !== base + frame) v.sprite.setTexture(base + frame);
      v.sprite.setFlipX(v.facing < 0);
      // Idle units breathe; walking ones don't (their frames carry the motion).
      const breathe = !v.moving && !v.air ? 1 + 0.018 * Math.sin(time / 520 + v.id) : 1;
      if (v.kind === KIND_UNIT) v.sprite.setScale(sc(UNIT_SCALE), sc(UNIT_SCALE * breathe));
      else v.sprite.setScale(sc(1.1), sc(1.1 * breathe));
      if (v.flash > 0) v.sprite.setTint(0xffaaaa);
      else if ((v.fx ?? 0) & FX_STUN) v.sprite.setTint(0xb8c0ff);
      else if ((v.fx ?? 0) & FX_POISON) v.sprite.setTint(0xa8f080);
      else v.sprite.clearTint();
      v.shadow?.setPosition(p.x, p.y).setDepth(d - 0.5);
      v.ring?.setPosition(p.x, p.y).setDepth(d - 0.4);
      return;
    }
    const size = v.kind === KIND_CASTLE ? CASTLE_SIZE : BUILDINGS[v.type].size;
    const foot = toScreen(v.x + size / 2, v.y + size / 2);
    const d = depthAt(v.x + size / 2, v.y + size / 2) - 2;
    // The collapse cinematic animates the castle sprite itself.
    const gone = this.collapsing.has(v.id) || !!v.ruined;
    if (this.collapsing.has(v.id)) { v.sprite.setDepth(d); }
    else v.sprite.setPosition(foot.x, foot.y).setDepth(d);
    const c = toScreen(v.x, v.y);
    v.ring?.setPosition(c.x, c.y).setDepth(-8e6);
    const constructing = v.kind === KIND_BUILDING && v.extra >= 0 && v.extra < 100;
    if (v.kind === KIND_BUILDING) {
      v.sprite.setAlpha(constructing ? 0.35 + (v.extra / 100) * 0.4 : 1);
      v.sprite.setTint(v.flash > 0 ? 0xffbbbb : 0xffffff);
      const front = toScreen(v.x, v.y + size / 2); // middle of the front edge
      v.scaffold!.setVisible(constructing || v.extra < 0).setPosition(front.x, front.y).setDepth(d + 0.2).setAlpha(0.9);
    } else if (!v.ruined && !this.collapsing.has(v.id)) {
      // A brief warm flicker when hit (a full tint would turn the whole castle pink).
      v.sprite.setTint(v.flash > 60 ? 0xfff0e4 : 0xffffff);
    }
    const a = ANCHORS.get(v.kind === KIND_CASTLE ? `castle${v.team}` : `b_${v.type}`);
    // Pennants wave (each with its own phase), lights flicker, chimneys smoke.
    v.flags?.forEach((f, i) => {
      const p = a?.flags[i];
      if (!p || gone || constructing) { f.setVisible(false); return; }
      const frame = Math.floor(time / 110 + v.id * 1.7 + i * 2.3) % FLAG_FRAMES;
      f.setTexture(`flag${frame}`).setVisible(true).setPosition(foot.x + p.x, foot.y + p.y).setDepth(d + 0.1);
    });
    v.glows?.forEach((g, i) => {
      const p = a?.glow[i];
      if (!p || gone || constructing) { g.setVisible(false); return; }
      const fl = 0.75 + 0.25 * Math.sin(time / 90 + v.id + i * 3) * Math.sin(time / 37 + i);
      g.setVisible(true).setPosition(foot.x + p.x, foot.y + p.y).setDepth(d + 0.15).setAlpha(0.55 * fl).setScale(sc(0.9 + 0.15 * fl));
    });
    // Building site: dust and hammer sparks while under construction (or being upgraded).
    if (v.kind === KIND_BUILDING && (constructing || v.extra < 0) && time > (v.nextSmoke ?? 0)) {
      v.nextSmoke = time + 380 + Math.random() * 420;
      if (this.cameras.main.worldView.contains(foot.x, foot.y)) {
        const hx = foot.x + (Math.random() - 0.5) * size * 34, hy = foot.y - size * 10 - Math.random() * 26;
        this.spark(hx, hy, 0xffd890, 2);
        this.puff(foot.x + (Math.random() - 0.5) * size * 40, foot.y - 4 - Math.random() * size * 12, 0xa89878, 5, 16);
      }
    }
    if (a?.smoke.length && !gone && !constructing && time > (v.nextSmoke ?? 0)) {
      v.nextSmoke = time + 650 + Math.random() * 500;
      const view = this.cameras.main.worldView;
      if (view.contains(foot.x, foot.y - 40)) for (const p of a.smoke) this.chimneyPuff(foot.x + p.x, foot.y + p.y, d + 0.3);
    }
  }

  private chimneyPuff(x: number, y: number, depth: number) {
    const s = this.img(x, y, 'puff').setDepth(Math.max(depth, 7.9e6 - 1)).setAlpha(0).setScale(sc(0.35));
    const drift = 14 + Math.random() * 10;
    this.tweens.add({ targets: s, alpha: { from: 0.55, to: 0 }, x: x + drift, y: y - 34 - Math.random() * 14, scale: sc(1.1 + Math.random() * 0.4),
      duration: 2600 + Math.random() * 900, ease: 'Sine.easeOut', onComplete: () => s.destroy() });
  }

  // ---------------------------------------------------------------- frame

  update(time: number, dt: number) {
    this.updateCamera(Math.min(100, this.game.loop.rawDelta || dt));
    this.atmosphere.update(Math.min(100, dt));
    this.ambient.update(time, Math.min(100, dt));
    const f = this.session.frames();
    if (!f) return;
    const { a, b, alpha } = f;
    this.updateVision(a.snap);
    this.collectStructures(a.snap.ents);
    const seen = new Set<number>();
    for (const row of a.snap.ents) {
      const id = row[0];
      seen.add(id);
      let v = this.views.get(id);
      if (!v) v = this.makeView(row);
      const nb = b.byId.get(id);
      let x = row[5], y = row[6];
      if (nb) { x += (nb[5] - x) * alpha; y += (nb[6] - y) * alpha; }
      const sdx = (x - v.x) - (y - v.y);
      v.moving = Math.hypot(x - v.x, y - v.y) > 0.002;
      if (Math.abs(sdx) > 0.004) v.facing = sdx > 0 ? 1 : -1;
      v.x = x; v.y = y;
      const src = nb ?? row;
      v.fx = src[11] ?? 0;
      // Damage flash (not for the steady tick of poison: poisoned units get a green tint instead).
      if (src[7] < v.hp - (v.fx & FX_POISON ? 3 : 0)) v.flash = 90;
      v.hp = src[7]; v.maxHp = src[8]; v.extra = src[9];
      // Spawn countdown, interpolated between snapshots (unless a unit spawned in between).
      v.spawn = nb && nb[10] <= row[10] ? row[10] + (nb[10] - row[10]) * alpha : src[10];
      // A building changing type means an upgrade completed / started.
      if (v.type !== row[2]) { this.destroyView(v); v = this.makeView(row); }
      if (v.kind === KIND_CASTLE) {
        // Ids restart each round: a rebuilt castle must not keep the old ruin.
        if (v.ruined && src[7] > 0) { this.destroyView(v); v = this.makeView(row); }
        // Joined after the collapse (or missed the event): show the ruin straight away.
        else if (!v.ruined && src[7] <= 0 && !this.collapsing.has(v.id)) this.setRuin(v);
      }
      v.lunge = Math.max(0, v.lunge - dt);
      v.atk = Math.max(0, v.atk - dt);
      v.flash = Math.max(0, v.flash - dt);
      this.placeView(v, time);
      if (v.ruined && Math.random() < dt / 220) {
        const p = toScreen(v.x + (Math.random() - 0.5) * 3, v.y + (Math.random() - 0.5) * 3);
        this.smoke(p.x, p.y - 10, 0x4a4640, 1.4);
      }
    }
    for (const v of [...this.views.values()]) {
      if (seen.has(v.id)) continue;
      // An enemy building that slipped into the fog stays as a greyed "last seen" ghost.
      if (this.vision && v.kind === KIND_BUILDING && v.team !== this.session.team
        && !entityVisible(this.vision, v.kind, v.type, v.x, v.y)) this.toGhost(v);
      else this.destroyView(v);
    }
    this.drawOverlay(time);
    this.drawBars();
    this.telegraphs = this.telegraphs.filter((t) => {
      if (time < t.until) { t.obj.setAlpha(0.35 + 0.25 * Math.sin(time / 60)); return true; }
      t.obj.destroy();
      return false;
    });
  }

  // ---------------------------------------------------------------- fog of war

  private updateVision(snap: { tick: number; round: number; phase: import('@bc/shared').Phase; ents: EntRow[] }) {
    const key = `${snap.round}:${snap.tick}`;
    if (key === this.visionKey) return;
    const newRound = !this.visionKey.startsWith(`${snap.round}:`);
    this.visionKey = key;
    this.vision = fogActive(snap.phase) ? visionFromRows(this.session.team, snap.ents) : null;
    for (const g of [...this.ghosts.values()]) {
      if (newRound || !this.vision || entityVisible(this.vision, g.kind, g.type, g.x, g.y)) {
        this.destroyView(g);
        this.ghosts.delete(g.id);
      }
    }
    this.drawFog();
  }

  private toGhost(v: View) {
    this.views.delete(v.id);
    v.ring?.destroy(); v.ring = undefined;
    v.flags?.forEach((f) => f.setVisible(false)); v.glows?.forEach((g) => g.setVisible(false));
    v.scaffold?.setVisible(false);
    v.sprite.setTint(0x7c8aa0).setAlpha(0.75);
    this.ghosts.set(v.id, v);
  }

  /** Dark veil over every tile the team can't see; tiles bordering vision get a lighter edge. */
  /**
   * Soft fog: the hidden/visible grid is blurred, then every tile is drawn as two triangles
   * whose corners carry their own alpha, so the fog fades out over two or three tiles.
   */
  private drawFog() {
    const g = this.fog;
    g.clear();
    const grid = this.vision;
    if (!grid) return;
    const W = MAP.width, H = MAP.height, B = OUTER_TILES;
    const GW = W + 2 * B, GH = H + 2 * B;
    // Outside the map, a tile shares the visibility of the nearest map tile, so the fog runs on into the countryside.
    let f = new Float32Array(GW * GH);
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const mx = Math.min(W - 1, Math.max(0, x - B)), my = Math.min(H - 1, Math.max(0, y - B));
      f[y * GW + x] = grid[my * W + mx] ? 0 : 1;
    }
    // Two separable box-blur passes ≈ a soft gaussian edge.
    const tmp = new Float32Array(GW * GH);
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        const l = f[y * GW + Math.max(0, x - 1)], c = f[y * GW + x], r = f[y * GW + Math.min(GW - 1, x + 1)];
        tmp[y * GW + x] = (l + c + r) / 3;
      }
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        const u = tmp[Math.max(0, y - 1) * GW + x], c = tmp[y * GW + x], d = tmp[Math.min(GH - 1, y + 1) * GW + x];
        f[y * GW + x] = (u + c + d) / 3;
      }
    }
    // Corner values = average of the four tiles sharing that corner.
    const cv = (cx: number, cy: number) => {
      const x0 = Math.max(0, cx - 1), x1 = Math.min(GW - 1, cx), y0 = Math.max(0, cy - 1), y1 = Math.min(GH - 1, cy);
      return (f[y0 * GW + x0] + f[y0 * GW + x1] + f[y1 * GW + x0] + f[y1 * GW + x1]) / 4;
    };
    const MAXA = 0.7, COL = 0x080c14;
    const corners = new Float32Array((GW + 1) * (GH + 1));
    for (let y = 0; y <= GH; y++) for (let x = 0; x <= GW; x++) corners[y * (GW + 1) + x] = cv(x, y);
    const C = (x: number, y: number) => corners[y * (GW + 1) + x];
    for (let y = 0; y < GH; y++) {
      let x = 0;
      while (x < GW) {
        const a = C(x, y), b = C(x + 1, y), c = C(x + 1, y + 1), d = C(x, y + 1);
        if (a < 0.01 && b < 0.01 && c < 0.01 && d < 0.01) { x++; continue; }
        // Runs of fully fogged tiles are merged into one strip.
        if (a > 0.995 && b > 0.995 && c > 0.995 && d > 0.995) {
          let x1 = x + 1;
          while (x1 < GW && C(x1 + 1, y) > 0.995 && C(x1 + 1, y + 1) > 0.995) x1++;
          g.fillStyle(COL, MAXA);
          g.fillPoints(this.diamond(g, x - B, y - B, x1 - x, 1), true);
          x = x1;
          continue;
        }
        const tx = x - B, ty = y - B;
        const p0 = toScreen(tx, ty), p1 = toScreen(tx + 1, ty), p2 = toScreen(tx + 1, ty + 1), p3 = toScreen(tx, ty + 1);
        g.fillGradientStyle(COL, COL, COL, COL, a * MAXA, b * MAXA, c * MAXA, c * MAXA);
        g.fillTriangle(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y);
        g.fillGradientStyle(COL, COL, COL, COL, a * MAXA, c * MAXA, d * MAXA, d * MAXA);
        g.fillTriangle(p0.x, p0.y, p2.x, p2.y, p3.x, p3.y);
        x++;
      }
    }
  }

  private drawBars() {
    const BAR_OWN = 0x3ad04a, BAR_ALLY = 0x3ab8c8, BAR_ENEMY = 0xe0402e;
    const g = this.bars;
    g.clear();
    const sel = this.session.selection;
    for (const v of this.views.values()) {
      if (v.kind === KIND_BUILDER || v.ruined) continue;
      const constructing = v.kind === KIND_BUILDING && v.extra !== 100;
      // Units always show their health bar (own and enemy); structures only when damaged/selected/Alt.
      if (v.kind !== KIND_UNIT && !(v.hp < v.maxHp || v.id === sel || constructing || this.showAllBars)) continue;
      let w: number, x: number, y: number;
      if (v.kind === KIND_UNIT) {
        const p = toScreen(v.x, v.y);
        const sc = UNITS[v.type].model.scale;
        w = 18 + sc * 8; x = p.x - w / 2; y = p.y - (v.air ? AIR_LIFT : 0) - 30 * sc - 14;
      } else {
        const size = v.kind === KIND_CASTLE ? CASTLE_SIZE : BUILDINGS[v.type].size;
        const p = toScreen(v.x, v.y);
        const top = v.sprite.y - v.sprite.displayHeight * v.sprite.originY;
        w = size * 22; x = p.x - w / 2; y = Math.max(top + 4, p.y - 140);
      }
      const r = Math.max(0, v.hp / v.maxHp);
      // Framed bar: dark case, glossy fill coloured by side (the length shows the health), so
      // friend and foe are easy to tell apart where units and buildings crowd together.
      const col = v.team !== this.session.team ? BAR_ENEMY : v.owner === this.session.you ? BAR_OWN : BAR_ALLY;
      g.fillStyle(0x0c0a08, 0.85); g.fillRect(x - 1.5, y - 1.5, w + 3, 6);
      g.fillStyle(0x2a2218, 0.9); g.fillRect(x, y, w, 3);
      g.fillStyle(col); g.fillRect(x, y, w * r, 3);
      g.fillStyle(0xffffff, 0.28); g.fillRect(x, y, w * r, 1);
      g.fillStyle(TEAM_COLORS[v.team]); g.fillRect(x - 1.5, y - 1.5, 2, 6);
      const sp = v.kind === KIND_BUILDING && !constructing && v.id === sel ? BUILDINGS[v.type].spawn : undefined;
      if (sp) {
        // next-unit timer of the selected spawn building
        const prog = 1 - Math.min(1, v.spawn / (sp.interval * TICK_RATE));
        g.fillStyle(0x000000, 0.7); g.fillRect(x - 1, y + 5, w + 2, 4);
        g.fillStyle(0x5ab8ff); g.fillRect(x, y + 6, w * prog, 2);
      }
      if (constructing) {
        const prog = Math.abs(v.extra) / 100;
        g.fillStyle(0x000000, 0.7); g.fillRect(x - 1, y + 5, w + 2, 4);
        g.fillStyle(v.extra < 0 ? 0x5aa0ff : 0xe0b84a); g.fillRect(x, y + 6, w * prog, 2);
      }
    }
  }

  private diamond(g: Phaser.GameObjects.Graphics, tx: number, ty: number, w: number, h: number) {
    const pts = [toScreen(tx, ty), toScreen(tx + w, ty), toScreen(tx + w, ty + h), toScreen(tx, ty + h)];
    return pts.map((p) => new Phaser.Geom.Point(p.x, p.y));
  }

  private drawOverlay(time: number) {
    const g = this.overlay;
    const s = this.session;
    g.clear();
    // pending build orders (foundations)
    for (const [p, b, tx, ty] of s.latest.orders) {
      const size = BUILDINGS[b].size;
      const team = s.latest.players[p].team;
      g.lineStyle(2, TEAM_COLORS[team], p === s.you ? 0.8 : 0.4);
      g.strokePoints(this.diamond(g, tx, ty, size, size), true);
    }
    // selection ring
    const sel = s.selection !== null ? this.views.get(s.selection) : undefined;
    if (sel) {
      const col = sel.owner === s.you ? 0x40ff60 : sel.team === s.team ? 0xffe040 : 0xff4040;
      g.lineStyle(2, col, 0.65 + 0.3 * Math.sin(time / 180));
      if (sel.kind === KIND_UNIT || sel.kind === KIND_BUILDER) {
        const p = toScreen(sel.x, sel.y);
        const r = sel.kind === KIND_UNIT ? UNITS[sel.type].radius + 0.15 : 0.45;
        const e = isoEllipse(r);
        g.strokeEllipse(p.x, p.y, e.w, e.h);
        // Item reach of a selected builder: crossbow range (gold), repair range (green).
        const owner = sel.kind === KIND_BUILDER ? s.latest.players[sel.owner] : undefined;
        const atk = owner && itemEffect(owner, 'builderAttack');
        const rep = owner && itemEffect(owner, 'repair');
        if (atk) { const a = isoEllipse(atk.range + 0.3); g.lineStyle(1, 0xffd060, 0.45); g.strokeEllipse(p.x, p.y, a.w, a.h); }
        if (rep) { const a = isoEllipse(rep.range); g.lineStyle(1, 0x60ff80, 0.45); g.strokeEllipse(p.x, p.y, a.w, a.h); }
      } else {
        const size = sel.kind === KIND_CASTLE ? CASTLE_SIZE : BUILDINGS[sel.type].size;
        g.strokePoints(this.diamond(g, sel.x - size / 2, sel.y - size / 2, size, size), true);
        const def = sel.kind === KIND_BUILDING ? BUILDINGS[sel.type] : null;
        const rad = def?.aura?.radius ?? def?.attack?.range;
        if (rad) {
          const c = toScreen(sel.x, sel.y);
          const e = isoEllipse(rad + size / 2);
          g.lineStyle(1, col, 0.4);
          g.strokeEllipse(c.x, c.y, e.w, e.h);
        }
      }
    }
    // placement ghost
    if (s.mode.kind === 'place') {
      const def = BUILDINGS[s.mode.building];
      const { tx, ty } = this.ghostTile(def.size);
      const err = s.placementError(def.id, tx, ty);
      const ok = !err;
      g.fillStyle(ok ? 0x40ff60 : 0xff3030, 0.28);
      g.fillPoints(this.diamond(g, tx, ty, def.size, def.size), true);
      const foot = toScreen(tx + def.size, ty + def.size);
      const o = originOf(`b_${def.id}`);
      this.ghost.setTexture(`b_${def.id}`).setOrigin(o.x, o.y).setPosition(foot.x, foot.y)
        .setTint(ok ? 0xaaffaa : 0xff8888).setVisible(true);
      // own zone outline
      const z = MAP.zones[s.team];
      g.lineStyle(2, 0xffffff, 0.25 + 0.1 * Math.sin(time / 200));
      g.strokePoints(this.diamond(g, z.x, z.y, z.w, z.h), true);
      // no-build ring around the castle
      const c = MAP.castles[s.team], k = CASTLE_CLEARANCE;
      g.fillStyle(0xff3030, 0.12);
      g.fillPoints(this.diamond(g, c.x - k, c.y - k, c.w + 2 * k, c.h + 2 * k), true);
      g.lineStyle(1.5, 0xff6050, 0.5);
      g.strokePoints(this.diamond(g, c.x - k, c.y - k, c.w + 2 * k, c.h + 2 * k), true);
    } else {
      this.ghost.setVisible(false);
    }
    // rescue strike targeting
    if (s.mode.kind === 'rescue') {
      // The strike reaches the whole own build zone.
      const z = MAP.zones[s.team];
      g.lineStyle(2, 0xffd040, 0.6);
      g.strokePoints(this.diamond(g, z.x, z.y, z.w, z.h), true);
      g.fillStyle(0xffd040, 0.05);
      g.fillPoints(this.diamond(g, z.x, z.y, z.w, z.h), true);
      const t = this.hoverTile;
      const inRange = inRescueArea(s.team, t.x, t.y);
      const p = toScreen(t.x, t.y);
      const e = isoEllipse(RESCUE_RADIUS);
      g.lineStyle(3, inRange ? 0xffe060 : 0xff3030, 0.9);
      g.strokeEllipse(p.x, p.y, e.w, e.h);
      g.fillStyle(inRange ? 0xffe060 : 0xff3030, 0.15);
      g.fillEllipse(p.x, p.y, e.w, e.h);
    }
    // pending strikes (telegraph from snapshots, visible to everyone)
    for (const [p, x, y, left] of s.latest.strikes) {
      const team = s.latest.players[p].team;
      const c = toScreen(x, y);
      const e = isoEllipse(RESCUE_RADIUS * (0.6 + 0.4 * (1 - left / 20)));
      g.lineStyle(3, team === s.team ? 0xffe060 : 0xff5030, 0.9);
      g.strokeEllipse(c.x, c.y, e.w, e.h);
    }
  }

  // ---------------------------------------------------------------- effects

  private moveMarker(x: number, y: number) {
    const p = toScreen(x, y);
    const m = this.img(p.x, p.y, 'ring').setTint(0x40ff60).setScale(sc(0.8)).setDepth(7e6);
    this.tweens.add({ targets: m, scale: sc(0.2), alpha: 0, duration: 450, onComplete: () => m.destroy() });
  }

  /** Where a hit lands on the target: units at their body, structures on the face towards the attacker. */
  private hitPoint(from: View, to: View) {
    if (to.kind === KIND_UNIT || to.kind === KIND_BUILDER) {
      const p = toScreen(to.x, to.y);
      return { x: p.x, y: p.y - (to.air ? AIR_LIFT : 0) - 10 };
    }
    const s = (to.kind === KIND_CASTLE ? CASTLE_SIZE : BUILDINGS[to.type].size) / 2;
    const nx = Math.max(to.x - s, Math.min(to.x + s, from.x)), ny = Math.max(to.y - s, Math.min(to.y + s, from.y));
    const p = toScreen(nx, ny);
    return { x: p.x, y: p.y - 14 - Math.random() * 12 };
  }

  private projectile(from: View, to: View) {
    const u = from.kind === KIND_UNIT ? UNITS[from.type] : null;
    const a = toScreen(from.x, from.y);
    const ay = a.y - (from.air ? AIR_LIFT : 0) - (from.kind === KIND_UNIT || from.kind === KIND_BUILDER ? 16 : from.kind === KIND_CASTLE ? 90 : 40);
    const hp = this.hitPoint(from, to);
    const b = { x: hp.x, y: hp.y }, by = hp.y;
    let key = 'arrow', tint = 0xffffff;
    if (u?.attackType === 'magic') { key = 'orb'; tint = u.model.accent; }
    if (u?.attackType === 'siege') key = 'boulder';
    const obj = this.img(a.x, ay, key).setTint(tint).setDepth(8e6);
    if (key === 'orb') obj.setBlendMode(Phaser.BlendModes.ADD).setScale(sc(1.3));
    const dist = Math.hypot(b.x - a.x, by - ay);
    const dur = Math.min(500, 120 + dist * 0.9);
    const arc = key === 'boulder' ? 60 : 12;
    const pos = (t: number) => ({ x: a.x + (b.x - a.x) * t, y: ay + (by - ay) * t - Math.sin(t * Math.PI) * arc });
    let lastTrail = 0;
    this.tweens.addCounter({
      from: 0, to: 1, duration: dur,
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        const p = pos(t), q = pos(Math.min(1, t + 0.02));
        obj.setPosition(p.x, p.y);
        // Arrows and bolts follow the tangent of their arc; boulders tumble.
        if (key === 'boulder') obj.setRotation(t * 8); else obj.setRotation(Math.atan2(q.y - p.y, q.x - p.x));
        if (key === 'orb' && t - lastTrail > 0.08) {
          lastTrail = t;
          const tr = this.img(p.x, p.y, 'spark').setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setDepth(8e6).setScale(sc(0.7)).setAlpha(0.7);
          this.tweens.add({ targets: tr, alpha: 0, scale: sc(0.2), duration: 260, onComplete: () => tr.destroy() });
        }
      },
      onComplete: () => {
        obj.destroy();
        this.spark(b.x, by, tint === 0xffffff ? 0xffe0a0 : tint, key === 'orb' ? 6 : 3, key === 'orb' ? 0.5 : 0.35);
        if (key === 'boulder') this.puff(b.x, b.y - 4, 0x8a7a62, 10, 26);
      },
    });
  }

  private spark(x: number, y: number, color: number, n: number, size = 0.5) {
    for (let i = 0; i < n; i++) {
      const s = this.img(x, y, 'spark').setTint(color).setDepth(8e6).setScale(sc(size)).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.85);
      const ang = Math.random() * Math.PI * 2, r = 6 + Math.random() * 10;
      this.tweens.add({ targets: s, x: x + Math.cos(ang) * r, y: y + Math.sin(ang) * r * 0.5 - 6, alpha: 0, scale: sc(0.15), duration: 300 + Math.random() * 200, onComplete: () => s.destroy() });
    }
  }

  // ---------------------------------------------------------------- castle collapse

  private setRuin(v: View) {
    v.ruined = true;
    const key = `ruin${v.team}`;
    const o = originOf(key);
    v.sprite.setTexture(key).setOrigin(o.x, o.y).setScale(sc(1)).setAlpha(1).clearTint();
    v.ring?.setVisible(false);
  }

  /** Big, slow dust/smoke cloud that rises and fades. */
  private smoke(x: number, y: number, color: number, size: number) {
    const s = this.img(x, y, 'disc').setTint(color).setDepth(8.2e6).setAlpha(0.55).setDisplaySize(30 * size, 18 * size);
    this.tweens.add({
      targets: s, y: y - 40 - Math.random() * 40, x: x + (Math.random() - 0.3) * 30, alpha: 0,
      displayWidth: 90 * size, displayHeight: 50 * size, duration: 1600 + Math.random() * 1200, ease: 'Sine.easeOut',
      onComplete: () => s.destroy(),
    });
  }

  private explosion(x: number, y: number, scale = 1) {
    const flash = this.img(x, y, 'disc').setTint(0xffa040).setBlendMode(Phaser.BlendModes.ADD).setDepth(8.6e6)
      .setDisplaySize(20 * scale, 12 * scale).setAlpha(0.95);
    this.tweens.add({ targets: flash, displayWidth: 90 * scale, displayHeight: 50 * scale, alpha: 0, duration: 380, ease: 'Quad.easeOut', onComplete: () => flash.destroy() });
    this.spark(x, y, 0xffd070, Math.round(6 * scale));
    this.puff(x, y, 0x5a5048, Math.round(5 * scale), 30 * scale);
  }

  /**
   * Castle collapse: lock every player's camera, pan to the falling castle, then shake,
   * explode and crumble it into a smoking ruin. The round banner waits for this to finish.
   */
  private castleFalls(team: Team) {
    const v = [...this.views.values()].find((w) => w.kind === KIND_CASTLE && w.team === team);
    if (!v || v.ruined || this.collapsing.has(v.id)) return;
    this.collapsing.add(v.id);
    this.cinematic = true;
    this.session.setMode({ kind: 'none' });
    let done!: () => void;
    this.cinematicDone = new Promise((r) => { done = r; });
    const cam = this.cameras.main;
    const c = toScreen(v.x, v.y);
    const PAN = 1200, RUMBLE = 1700, COLLAPSE = 900, HOLD = 1000;
    cam.pan(c.x, c.y - 70, PAN, 'Sine.easeInOut', true);
    cam.zoomTo(Phaser.Math.Clamp(cam.zoom, 0.9 * DPR, 1.2 * DPR), PAN, 'Sine.easeInOut', true);
    const H = v.sprite.displayHeight, Wd = v.sprite.displayWidth;
    const rnd = () => ({ x: c.x + (Math.random() - 0.5) * Wd * 0.8, y: c.y - Math.random() * H * 0.7 });
    // Sequence on real time (not Phaser's clock, which slows down on low frame rates) so every
    // client stays in step with the server's fixed round-end pause.
    const after = (ms: number, fn: () => void) => { window.setTimeout(fn, ms); };
    let ended = false;
    const finish = () => {
      if (ended) return;
      ended = true;
      this.cinematic = false;
      this.collapsing.delete(v.id);
      done();
    };
    // If the castle view goes away mid-sequence (e.g. the next round already started on a slow
    // client), stop touching it and unlock the camera.
    const alive = () => {
      if (!ended && this.views.get(v.id) === v && v.sprite.active) return true;
      finish();
      return false;
    };
    after(PAN + RUMBLE + COLLAPSE + HOLD + 3000, finish); // safety net

    after(PAN, () => {
      if (!alive()) return;
      // 1. Rumble: the castle shakes, darkens and explodes from within.
      cam.shake(RUMBLE + COLLAPSE, 0.004);
      const baseX = v.sprite.x;
      this.tweens.add({ targets: v.sprite, x: baseX + 2, duration: 60, yoyo: true, repeat: Math.floor(RUMBLE / 120), onComplete: () => { if (v.sprite.active) v.sprite.setX(baseX); } });
      this.tweens.addCounter({ from: 255, to: 120, duration: RUMBLE, onUpdate: (tw) => {
        if (!v.sprite.active) return;
        const k = Math.round(tw.getValue() ?? 255);
        v.sprite.setTint(Phaser.Display.Color.GetColor(255, k, k));
      } });
      for (let i = 0; i < 9; i++) after(i * (RUMBLE / 9) + Math.random() * 80, () => { if (!alive()) return; const p = rnd(); this.explosion(p.x, p.y, 0.8 + Math.random() * 0.6); });

      // 2. Collapse: the castle sinks into a cloud of dust and debris…
      after(RUMBLE, () => {
        if (!alive()) return;
        cam.shake(COLLAPSE + 400, 0.012);
        this.explosion(c.x, c.y - H * 0.35, 2.4);
        this.tweens.add({ targets: v.sprite, y: v.sprite.y + H * 0.25, scaleY: v.sprite.scaleY * 0.55, duration: COLLAPSE, ease: 'Quad.easeIn' });
        for (let i = 0; i < 26; i++) {
          const d = this.img(c.x + (Math.random() - 0.5) * 40, c.y - H * 0.4, 'dot').setTint(Math.random() < 0.7 ? 0x8a867a : 0x5a5248)
            .setDepth(8.4e6).setScale(sc(1 + Math.random() * 1.8));
          const ang = Math.PI * (1.05 + Math.random() * 0.9), dist = 60 + Math.random() * 140;
          const tx = c.x + Math.cos(ang) * dist, ty = c.y + 10 + Math.random() * 40;
          this.tweens.add({ targets: d, x: tx, duration: 700 + Math.random() * 400, ease: 'Linear' });
          this.tweens.add({ targets: d, y: c.y - H * 0.4 - 50 - Math.random() * 60, duration: 300, ease: 'Quad.easeOut', yoyo: false,
            onComplete: () => this.tweens.add({ targets: d, y: ty, duration: 500 + Math.random() * 300, ease: 'Quad.easeIn',
              onComplete: () => this.tweens.add({ targets: d, alpha: 0, delay: 1500, duration: 800, onComplete: () => d.destroy() }) }) });
        }
        for (let i = 0; i < 14; i++) {
          const p = { x: c.x + (Math.random() - 0.5) * Wd * 0.9, y: c.y - Math.random() * 40 };
          after(Math.random() * COLLAPSE, () => { if (alive()) this.smoke(p.x, p.y, 0x8a8478, 1.6 + Math.random()); });
        }
        // …and what's left is a ruin.
        after(COLLAPSE, () => {
          this.tweens.killTweensOf(v.sprite);
          if (!alive()) return;
          const foot = toScreen(v.x + CASTLE_SIZE / 2, v.y + CASTLE_SIZE / 2);
          v.sprite.setPosition(foot.x, foot.y);
          this.setRuin(v);
          this.cameras.main.flash(200, 255, 230, 200);
          for (let i = 0; i < 10; i++) { const p = rnd(); this.smoke(p.x, c.y - Math.random() * 30, 0x6a645a, 2 + Math.random()); }
          after(HOLD, finish);
        });
      });
    });
  }

  private puff(x: number, y: number, color: number, n: number, spread: number) {
    for (let i = 0; i < n; i++) {
      const s = this.img(x, y, 'puff').setTint(color).setDepth(7.5e6).setAlpha(0.7).setScale(sc(0.12 + Math.random() * 0.12));
      const ang = Math.random() * Math.PI * 2, r = spread * (0.4 + Math.random() * 0.6);
      this.tweens.add({ targets: s, x: x + Math.cos(ang) * r, y: y + Math.sin(ang) * r * 0.5 - 10 - Math.random() * 14, alpha: 0, scale: sc(0.3 + Math.random() * 0.2), duration: 600 + Math.random() * 500, onComplete: () => s.destroy() });
    }
  }

  private onSimEvent(ev: SimEvent) {
    if (ev.t === 'round' || ev.t === 'match') this.castleFalls((1 - ev.winner) as Team);
    switch (ev.t) {
      case 'atk': {
        const a = this.views.get(ev.a), b = this.views.get(ev.b);
        if (!a || !b) return;
        a.atk = 260;
        if (b.x !== a.x) a.facing = b.x - b.y > a.x - a.y ? 1 : -1;
        if (ev.r) this.projectile(a, b);
        else {
          a.lunge = 160;
          const h = this.hitPoint(a, b);
          this.spark(h.x, h.y, 0xffd8a0, 2, 0.32);
        }
        return;
      }
      case 'chain': {
        const caster = this.views.get(ev.ids[0]);
        if (caster) caster.atk = 300;
        const pts = ev.ids.map((id) => this.views.get(id)).filter((v): v is View => !!v)
          .map((v) => { const p = toScreen(v.x, v.y); return { x: p.x, y: p.y - (v.air ? AIR_LIFT : 0) - 14 }; });
        if (pts.length < 2) return;
        const g = this.add.graphics().setDepth(8e6).setBlendMode(Phaser.BlendModes.ADD);
        for (const [w, c, a] of [[5, 0x4080ff, 0.4], [2, 0xd0e8ff, 1]] as const) {
          g.lineStyle(w, c, a);
          g.beginPath();
          g.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) {
            const m = { x: (pts[i - 1].x + pts[i].x) / 2 + (Math.random() - 0.5) * 14, y: (pts[i - 1].y + pts[i].y) / 2 + (Math.random() - 0.5) * 14 };
            g.lineTo(m.x, m.y); g.lineTo(pts[i].x, pts[i].y);
          }
          g.strokePath();
        }
        this.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
        return;
      }
      case 'splash': {
        const p = toScreen(ev.x, ev.y);
        const e = isoEllipse(ev.r);
        const ring = this.img(p.x, p.y, 'ringthin').setDepth(7e6).setTint(0xffc080).setDisplaySize(e.w * 0.3, e.h * 0.3);
        this.tweens.add({ targets: ring, displayWidth: e.w, displayHeight: e.h, alpha: 0, duration: 350, onComplete: () => ring.destroy() });
        this.puff(p.x, p.y, 0x9a8a6a, 6, 20);
        return;
      }
      case 'shell': {
        // Siege Battery: a heavy shell arcs across the battlefield; the target spot glows until it lands.
        const from = this.views.get(ev.a);
        const to = toScreen(ev.x, ev.y);
        const e = isoEllipse(ev.r);
        const mark = this.img(to.x, to.y, 'disc').setDisplaySize(e.w, e.h).setTint(0xff6030).setDepth(-7e6).setAlpha(0);
        const dur = (ev.f / TICK_RATE) * 1000;
        this.tweens.add({ targets: mark, alpha: 0.28, duration: dur, onComplete: () => mark.destroy() });
        if (!from) return;
        const size = BUILDINGS[from.type]?.size ?? 2;
        const a = toScreen(from.x + size / 2, from.y + size / 2);
        const ay = a.y - 50;
        const shell = this.img(a.x, ay, 'boulder').setTint(0x403830).setDepth(8.6e6).setScale(sc(1.6));
        this.puff(a.x, ay, 0x9a948a, 6, 16);
        const arc = 220;
        this.tweens.addCounter({
          from: 0, to: 1, duration: dur,
          onUpdate: (tw) => {
            const t = tw.getValue() ?? 0;
            shell.setPosition(a.x + (to.x - a.x) * t, ay + (to.y - ay) * t - Math.sin(t * Math.PI) * arc).setRotation(t * 10);
          },
          onComplete: () => {
            shell.destroy();
            this.puff(to.x, to.y - 10, 0xff9a40, 10, 40);
            this.puff(to.x, to.y - 6, 0x6a5a4a, 14, 50);
            if (this.cameras.main.worldView.contains(to.x, to.y)) this.cameras.main.shake(160, 0.004);
          },
        });
        return;
      }
      case 'zone': {
        // Howling Hollow: a whirlwind of leaves and dust spins on the spot for the cyclone's lifetime.
        const c = toScreen(ev.x, ev.y);
        const e = isoEllipse(ev.r);
        const dur = (ev.d / TICK_RATE) * 1000;
        const ring = this.img(c.x, c.y, 'ringthin').setDisplaySize(e.w, e.h).setTint(0xa8e0c0).setDepth(-6.9e6).setAlpha(0);
        this.tweens.add({ targets: ring, alpha: 0.7, duration: 300 });
        this.tweens.add({ targets: ring, alpha: 0, delay: dur - 400, duration: 400, onComplete: () => ring.destroy() });
        const bits = Array.from({ length: 14 }, (_, i) => this.img(c.x, c.y, 'puff')
          .setTint(i % 3 ? 0xc8d8c0 : 0x6aa050).setDepth(8.2e6).setAlpha(0).setScale(sc(0.12 + (i % 4) * 0.04)));
        this.tweens.addCounter({
          from: 0, to: 1, duration: dur,
          onUpdate: (tw) => {
            const t = tw.getValue() ?? 0, ms = t * dur;
            const fade = Math.min(1, ms / 300, (dur - ms) / 400);
            bits.forEach((b, i) => {
              const h = (i / bits.length);
              const ang = ms / 160 + i * 2.4;
              const rad = 0.25 + 0.75 * h;
              b.setPosition(c.x + Math.cos(ang) * e.w * 0.5 * rad, c.y + Math.sin(ang) * e.h * 0.5 * rad - h * 70)
                .setAlpha(0.75 * fade);
            });
          },
          onComplete: () => bits.forEach((b) => b.destroy()),
        });
        return;
      }
      case 'heal': {
        const healer = this.views.get(ev.a);
        if (healer && healer.kind === KIND_UNIT) healer.atk = 300;
        const b = this.views.get(ev.b);
        if (!b) return;
        const p = toScreen(b.x, b.y);
        for (let i = 0; i < 3; i++) {
          const s = this.img(p.x + (Math.random() - 0.5) * 14, p.y - 10, 'plus').setTint(0x60ff80).setDepth(8e6);
          this.tweens.add({ targets: s, y: p.y - 34, alpha: 0, duration: 700, delay: i * 80, onComplete: () => s.destroy() });
        }
        return;
      }
      case 'die': {
        const p = toScreen(ev.x, ev.y);
        if (ev.k === 'building') {
          this.puff(p.x, p.y - 10, 0x8a7a62, 22, 60);
          this.puff(p.x, p.y - 20, 0xff9a40, 8, 30);
          this.cameras.main.shake(140, 0.003);
        } else {
          const v = this.views.get(ev.id);
          if (v && v.kind === KIND_UNIT && this.cameras.main.worldView.contains(v.sprite.x, v.sprite.y)) {
            // The fallen unit topples over and fades into the grass.
            const body = this.img(v.sprite.x, v.sprite.y, v.sprite.texture.key).setOrigin(v.sprite.originX, v.sprite.originY)
              .setFlipX(v.sprite.flipX).setScale(v.sprite.scaleX, v.sprite.scaleY).setDepth(v.sprite.depth - 1);
            const dir = v.facing > 0 ? -1 : 1;
            this.tweens.add({ targets: body, angle: v.air ? 0 : 82 * dir, y: body.y + (v.air ? AIR_LIFT : 2), duration: v.air ? 420 : 320, ease: 'Quad.easeIn' });
            this.tweens.add({ targets: body, alpha: 0, delay: 650, duration: 900, onComplete: () => body.destroy() });
          }
          this.puff(p.x, p.y - 8, 0x7a1a12, 6, 12);
          this.puff(p.x, p.y - 4, 0x8a8070, 4, 14);
        }
        return;
      }
      case 'gold': {
        // Last-hit bounty: only the player who earned it sees the coin popup.
        if (ev.p !== this.session.you) return;
        const p = toScreen(ev.x, ev.y);
        const coin = this.img(p.x - 12, p.y - 30, 'coin').setDepth(9.4e6).setScale(sc(1.3));
        const txt = this.add.text(p.x - 1, p.y - 30, `+${ev.g}`, {
          fontFamily: 'MedievalSharp, Georgia, serif', fontSize: '22px', color: '#ffe04a', stroke: '#1a0e00', strokeThickness: 5,
        }).setOrigin(0, 0.5).setDepth(9.4e6).setResolution(window.devicePixelRatio || 1);
        const objs = [coin, txt];
        for (const o of objs) o.setAlpha(0);
        this.tweens.add({ targets: objs, alpha: 1, duration: 120 });
        this.tweens.add({ targets: objs, y: '-=30', duration: 1100, ease: 'Cubic.easeOut' });
        this.tweens.add({ targets: objs, alpha: 0, delay: 750, duration: 350, onComplete: () => objs.forEach((o) => o.destroy()) });
        this.tweens.add({ targets: coin, scaleX: { from: sc(1.3), to: sc(-1.3) }, duration: 260, yoyo: true, repeat: 1 });
        return;
      }
      case 'built': {
        const v = this.views.get(ev.id);
        if (!v) return;
        const p = toScreen(v.x, v.y);
        this.spark(p.x, p.y - 30, 0xffe080, 10);
        return;
      }
      case 'strike': {
        const p = toScreen(ev.x, ev.y);
        const e = isoEllipse(RESCUE_RADIUS);
        if (!ev.hit) {
          const disc = this.img(p.x, p.y, 'disc').setDisplaySize(e.w, e.h).setTint(0xffe060).setDepth(-7e6).setAlpha(0.18);
          this.telegraphs.push({ x: ev.x, y: ev.y, until: this.time.now + 1100, obj: disc });
          // A rune circle burns into the ground while the strike charges.
          const rune = this.img(p.x, p.y, 'runeCircle').setDisplaySize(e.w * 0.6, e.h * 0.6).setDepth(-6.9e6).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
          this.tweens.add({ targets: rune, displayWidth: e.w, displayHeight: e.h, alpha: 0.95, duration: 900, ease: 'Cubic.easeOut' });
          this.tweens.add({ targets: rune, alpha: 0, delay: 1000, duration: 700, onComplete: () => rune.destroy() });
          for (let i = 0; i < 14; i++) {
            const a = Math.random() * Math.PI * 2, d = Math.random();
            const m = this.img(p.x + Math.cos(a) * e.w * 0.45 * d, p.y + Math.sin(a) * e.h * 0.45 * d, 'spark').setTint(0xfff0a0)
              .setBlendMode(Phaser.BlendModes.ADD).setDepth(8.4e6).setScale(sc(0.6)).setAlpha(0);
            this.tweens.add({ targets: m, alpha: { from: 0.9, to: 0 }, y: m.y - 40 - Math.random() * 40, delay: Math.random() * 600, duration: 700, onComplete: () => m.destroy() });
          }
          return;
        }
        const beam = this.img(p.x, p.y + e.h * 0.3, 'beam').setOrigin(0.5, 1).setDisplaySize(e.w * 0.9, 900).setTint(0xfff0a0)
          .setBlendMode(Phaser.BlendModes.ADD).setDepth(8.5e6);
        this.tweens.add({ targets: beam, displayWidth: 10, alpha: 0, duration: 700, ease: 'Quad.easeIn', onComplete: () => beam.destroy() });
        const ring = this.img(p.x, p.y, 'ringthin').setDisplaySize(e.w * 0.2, e.h * 0.2).setTint(0xffffff).setDepth(7e6);
        this.tweens.add({ targets: ring, displayWidth: e.w * 1.3, displayHeight: e.h * 1.3, alpha: 0, duration: 600, onComplete: () => ring.destroy() });
        const flash = this.img(p.x, p.y, 'disc').setDisplaySize(e.w, e.h).setTint(0xffffff).setDepth(-6e6).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: flash, alpha: 0, duration: 500, onComplete: () => flash.destroy() });
        this.spark(p.x, p.y - 20, 0xfff0a0, 24);
        // Scorched earth with dying embers, a ring of dust thrown outwards.
        const scorch = this.img(p.x, p.y, 'scorch').setDisplaySize(e.w * 1.05, e.h * 1.05).setDepth(-6.8e6).setAlpha(0.9);
        this.tweens.add({ targets: scorch, alpha: 0, delay: 3500, duration: 4000, onComplete: () => scorch.destroy() });
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          this.puff(p.x + Math.cos(a) * e.w * 0.48, p.y + Math.sin(a) * e.h * 0.48, 0xb8a888, 2, 18);
        }
        this.cameras.main.shake(320, 0.008);
        this.cameras.main.flash(160, 255, 250, 210);
        if (ev.kills) {
          const txt = this.add.text(p.x, p.y - 80, `${ev.kills} slain`, { fontFamily: 'MedievalSharp, Georgia, serif', fontSize: '24px', color: '#ffe680', stroke: '#2a1a00', strokeThickness: 4 })
            .setOrigin(0.5).setDepth(9.5e6).setResolution(window.devicePixelRatio || 1);
          this.tweens.add({ targets: txt, y: p.y - 130, alpha: 0, duration: 1600, onComplete: () => txt.destroy() });
        }
        return;
      }
    }
  }
}
