import Phaser from 'phaser';
import {
  BUILDINGS, CASTLE_CLEARANCE, TICK_RATE, CASTLE_SIZE, MAP, RESCUE_RADIUS, RESCUE_RANGE, ROCK_GRID, UNITS, entityVisible, fogActive, inRect, rectCenter,
  visionFromRows, type EntRow, type SimEvent, type Team,
} from '@bc/shared';
import { DPR, TEAM_COLORS, TH, TW, WORLD, depthAt, isoEllipse, toScreen, toTile } from './iso';
import { TEX_RES, UNIT_TEX, buildingTexSize, generateTextures, texHeight } from './textures';
import type { MatchSession } from './session';
import { OUTER_MARGIN, OUTER_TILES, outerDecor } from './landscape';

interface View {
  id: number;
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
  flag?: Phaser.GameObjects.Image;
  scaffold?: Phaser.GameObjects.Image;
  air: boolean;
  facing: 1 | -1;
  moving: boolean;
  lunge: number;
  flash: number;
  /** Ticks until the next spawn (spawn buildings). */
  spawn: number;
  /** Castle that has collapsed (shows the ruin texture). */
  ruined?: boolean;
}

const KIND_UNIT = 0, KIND_BUILDING = 1, KIND_BUILDER = 2, KIND_CASTLE = 3;
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
    generateTextures(this);
    this.buildGround();
    const cam = this.cameras.main;
    cam.setBackgroundColor('#16210f');
    cam.setZoom(DPR);
    cam.setBounds(WORLD.minX - 300, WORLD.minY - 300, WORLD.maxX - WORLD.minX + 600, WORLD.maxY - WORLD.minY + 520);
    this.centerOnCastle();

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
    // The diamond lattice repeats every (64k × 32k) px for k×k tile variants.
    const K = 8, PW = TW * K, PH = TH * K;
    if (this.textures.exists('outerGround')) this.textures.remove('outerGround');
    const tex = this.textures.createCanvas('outerGround', PW * TEX_RES, PH * TEX_RES)!;
    const ctx = tex.getContext();
    const hash = (x: number, y: number) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
    const srcs = [0, 1, 2, 3].map((i) => this.textures.get(`w${i}`).getSourceImage() as CanvasImageSource);
    for (let a = -K; a <= 2 * K; a++) {
      for (let b = -2 * K; b <= K; b++) {
        const p = toScreen(a, b);
        const left = p.x - TW / 2, top = p.y;
        if (left >= PW || left + TW <= 0 || top >= PH || top + TH <= 0) continue;
        const hv = hash(((a % K) + K) % K, ((b % K) + K) % K);
        ctx.drawImage(srcs[hv % 4], left * TEX_RES, top * TEX_RES);
      }
    }
    tex.refresh();
    const M = OUTER_MARGIN;
    const x0 = Math.floor((WORLD.minX - M) / PW) * PW, y0 = Math.floor((WORLD.minY - M) / PH) * PH;
    const w = WORLD.maxX + M - x0, h = WORLD.maxY + M - y0;
    this.add.tileSprite(x0, y0, w * TEX_RES, h * TEX_RES, 'outerGround').setOrigin(0, 0).setScale(1 / TEX_RES).setDepth(-1.1e7);

    for (const d of outerDecor()) {
      const p = toScreen(d.x, d.y);
      const depth = depthAt(d.x, d.y);
      if (d.kind === 'tree') {
        this.img(p.x, p.y + 4, d.key).setOrigin(0.5, 1).setDepth(depth).setFlipX(d.r2 * 1000 % 2 < 1).setScale(sc(d.scale))
          .setTint(Phaser.Display.Color.GetColor(225 + Math.floor(d.r * 30), 235, 225 + Math.floor(d.r2 * 30)));
      } else if (d.kind === 'bush') {
        this.img(p.x, p.y + 2, d.key).setOrigin(0.5, 1).setDepth(depth);
      } else if (d.kind === 'rock') {
        const th = texHeight(this, d.key);
        this.img(p.x, p.y, d.key).setOrigin(0.5, (th - TH / 2 - 2) / th).setDepth(depth).setScale(sc(d.scale));
      } else {
        this.img(p.x, p.y, d.key).setDepth(-8e6).setAlpha(0.9);
      }
    }
  }

  private buildGround() {
    this.buildOuterLand();
    const w = WORLD.maxX - WORLD.minX + TW, h = WORLD.maxY - WORLD.minY + TH;
    const rt = this.add.renderTexture(WORLD.minX - TW / 2, WORLD.minY, w * TEX_RES, h * TEX_RES).setOrigin(0, 0).setDepth(-1e7).setScale(1 / TEX_RES);
    const hash = (x: number, y: number) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
    const c0 = MAP.castles[0], c1 = MAP.castles[1];
    const road = (x: number, y: number) => y >= c0.y && y < c0.y + c0.h && x >= c0.x + c0.w && x < c1.x;
    // One batched pass: per-call draw() would flush the whole framebuffer 2240 times.
    rt.beginDraw();
    for (let y = 0; y < MAP.height; y++) {
      for (let x = 0; x < MAP.width; x++) {
        const hv = hash(x, y);
        let key = `g${hv % 4}`;
        if (inRect(MAP.zones[0], x, y) || inRect(MAP.zones[1], x, y)) key = `z${hv % 2}`;
        if (road(x, y) || (road(x, y - 1) && hv % 3 === 0) || (road(x, y + 1) && hv % 3 === 0)) key = `d${hv % 2}`;
        const p = toScreen(x, y);
        rt.batchDraw(key, (p.x - WORLD.minX) * TEX_RES, (p.y - WORLD.minY) * TEX_RES);
      }
    }
    rt.endDraw();
    // build zone tint + border
    const g = this.add.graphics().setDepth(-9e6);
    for (const team of [0, 1] as const) {
      const z = MAP.zones[team];
      const pts = [toScreen(z.x, z.y), toScreen(z.x + z.w, z.y), toScreen(z.x + z.w, z.y + z.h), toScreen(z.x, z.y + z.h)];
      g.fillStyle(TEAM_COLORS[team], 0.07);
      g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x, p.y)), true);
      g.lineStyle(2, TEAM_COLORS[team], 0.35);
      g.strokePoints(pts.map((p) => new Phaser.Geom.Point(p.x, p.y)), true);
    }
    // rocks & decorations
    for (let y = 0; y < MAP.height; y++) {
      for (let x = 0; x < MAP.width; x++) {
        const hv = hash(x + 1000, y);
        if (ROCK_GRID[y * MAP.width + x]) {
          const p = toScreen(x + 1, y + 1);
          const c = toScreen(x + 0.5, y + 0.5);
          const th = texHeight(this, `rock${hv % 6}`);
          this.img(c.x, c.y, `rock${hv % 6}`).setOrigin(0.5, (th - TH / 2 - 2) / th)
            .setDepth(depthAt(x + 1, y + 1)).setFlipX(hv % 2 === 0);
        } else if (!inRect(MAP.zones[0], x, y) && !inRect(MAP.zones[1], x, y) && hv % 7 === 0 && !road(x, y)) {
          const p = toScreen(x + 0.3 + (hv % 5) / 10, y + 0.3 + (hv % 3) / 10);
          this.img(p.x, p.y, hv % 2 ? 'tuft' : 'flowers').setDepth(-8e6).setAlpha(0.9);
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
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      const cam = this.cameras.main;
      if (this.cinematic) return;
      cam.setZoom(Phaser.Math.Clamp(cam.zoom * (dy > 0 ? 0.9 : 1.1), 0.45 * DPR, 1.6 * DPR));
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
        this.moveMarker(t.x, t.y);
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
      spawn: 0, sprite: null!, air: false, facing: team === 0 ? 1 : -1, moving: false, lunge: 0, flash: 0,
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
      }
    } else {
      const size = kind === KIND_CASTLE ? CASTLE_SIZE : BUILDINGS[type].size;
      const key = kind === KIND_CASTLE ? `castle${team}` : `b_${type}`;
      const th = texHeight(this, key);
      v.ring = this.img(0, 0, 'tile_hl').setTint(TEAM_COLORS[team]).setAlpha(0.22).setScale(sc(size), sc(size));
      v.sprite = this.img(0, 0, key).setOrigin(0.5, (th - 4) / th);
      if (kind === KIND_BUILDING) {
        const h = buildingTexSize(size, BUILDINGS[type].model.height).h;
        v.flag = this.img(0, 0, 'flag').setTint(TEAM_COLORS[team]).setOrigin(0, 1);
        v.flag.setData('dy', -Math.min(h - 30, size * TH + BUILDINGS[type].model.height * 0.6));
        v.scaffold = this.img(0, 0, 'scaffold').setOrigin(0.5, 1).setVisible(false);
      }
    }
    this.views.set(id, v);
    return v;
  }

  private destroyView(v: View) {
    v.sprite.destroy(); v.shadow?.destroy(); v.ring?.destroy(); v.flag?.destroy(); v.scaffold?.destroy();
    this.views.delete(v.id);
  }

  private placeView(v: View, time: number) {
    if (v.kind === KIND_UNIT || v.kind === KIND_BUILDER) {
      const p = toScreen(v.x, v.y);
      const d = depthAt(v.x, v.y);
      const bob = v.air ? Math.sin(time / 260 + v.id) * 3 : v.moving ? -Math.abs(Math.sin(time / 90 + v.id)) * 2 : 0;
      const lungeOff = v.lunge > 0 ? Math.sin((v.lunge / 160) * Math.PI) * 5 * v.facing : 0;
      v.sprite.setPosition(p.x + lungeOff, p.y - (v.air ? AIR_LIFT : 0) + bob).setDepth(d + (v.air ? 5000 : 0));
      v.sprite.setFlipX(v.facing < 0);
      if (v.kind === KIND_UNIT) v.sprite.setScale(sc(UNIT_SCALE));
      if (v.flash > 0) v.sprite.setTint(0xffaaaa); else v.sprite.clearTint();
      v.shadow?.setPosition(p.x, p.y).setDepth(d - 0.5);
      v.ring?.setPosition(p.x, p.y).setDepth(d - 0.4);
      return;
    }
    const size = v.kind === KIND_CASTLE ? CASTLE_SIZE : BUILDINGS[v.type].size;
    const foot = toScreen(v.x + size / 2, v.y + size / 2);
    const d = depthAt(v.x + size / 2, v.y + size / 2) - 2;
    // The collapse cinematic animates the castle sprite itself.
    if (this.collapsing.has(v.id)) { v.sprite.setDepth(d); return; }
    v.sprite.setPosition(foot.x, foot.y).setDepth(d);
    const c = toScreen(v.x, v.y);
    v.ring?.setPosition(c.x, c.y).setDepth(-8e6);
    if (v.kind === KIND_BUILDING) {
      const constructing = v.extra >= 0 && v.extra < 100;
      v.sprite.setAlpha(constructing ? 0.35 + (v.extra / 100) * 0.4 : 1);
      v.sprite.setTint(v.flash > 0 ? 0xffbbbb : 0xffffff);
      v.flag!.setPosition(foot.x - size * 14, foot.y + (v.flag!.getData('dy') as number)).setDepth(d + 0.1).setVisible(!constructing);
      v.scaffold!.setVisible(constructing || v.extra < 0).setPosition(foot.x, foot.y).setDepth(d + 0.2).setAlpha(0.9);
    } else if (!v.ruined) {
      v.sprite.setTint(v.flash > 0 ? 0xffcccc : 0xffffff);
    }
  }

  // ---------------------------------------------------------------- frame

  update(time: number, dt: number) {
    this.updateCamera(Math.min(100, this.game.loop.rawDelta || dt));
    const f = this.session.frames();
    if (!f) return;
    const { a, b, alpha } = f;
    this.updateVision(a.snap);
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
      if (src[7] < v.hp) v.flash = 90;
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
    v.flag?.setVisible(false);
    v.scaffold?.setVisible(false);
    v.sprite.setTint(0x7c8aa0).setAlpha(0.75);
    this.ghosts.set(v.id, v);
  }

  /** Dark veil over every tile the team can't see; tiles bordering vision get a lighter edge. */
  private drawFog() {
    const g = this.fog;
    g.clear();
    const grid = this.vision;
    if (!grid) return;
    const W = MAP.width, H = MAP.height, B = OUTER_TILES;
    // Outside the map, a tile shares the visibility of the nearest map tile, so the fog runs on into the countryside.
    const at = (x: number, y: number) => grid[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))];
    const level = (x: number, y: number) => {
      if (at(x, y)) return 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(x + dx, y + dy)) return 1;
      return 2;
    };
    const ALPHA = [0, 0.42, 0.66];
    for (let y = -B; y < H + B; y++) {
      let x = -B;
      while (x < W + B) {
        const l = level(x, y);
        let x1 = x + 1;
        while (x1 < W + B && level(x1, y) === l) x1++;
        if (l) {
          g.fillStyle(0x05080c, ALPHA[l]);
          g.fillPoints(this.diamond(g, x, y, x1 - x, 1), true);
        }
        x = x1;
      }
    }
  }

  private drawBars() {
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
      g.fillStyle(0x000000, 0.7); g.fillRect(x - 1, y - 1, w + 2, 5);
      g.fillStyle(r > 0.6 ? 0x3ad04a : r > 0.3 ? 0xe0c030 : 0xe03a2a); g.fillRect(x, y, w * r, 3);
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
      g.lineStyle(2, col, 0.9);
      if (sel.kind === KIND_UNIT || sel.kind === KIND_BUILDER) {
        const p = toScreen(sel.x, sel.y);
        const r = sel.kind === KIND_UNIT ? UNITS[sel.type].radius + 0.15 : 0.45;
        const e = isoEllipse(r);
        g.strokeEllipse(p.x, p.y, e.w, e.h);
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
      const th = texHeight(this, `b_${def.id}`);
      this.ghost.setTexture(`b_${def.id}`).setOrigin(0.5, (th - 4) / th).setPosition(foot.x, foot.y)
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
      const c = rectCenter(MAP.castles[s.team]);
      const cp = toScreen(c.x, c.y);
      const range = isoEllipse(RESCUE_RANGE);
      g.lineStyle(2, 0xffd040, 0.6);
      g.strokeEllipse(cp.x, cp.y, range.w, range.h);
      g.fillStyle(0xffd040, 0.05);
      g.fillEllipse(cp.x, cp.y, range.w, range.h);
      const t = this.hoverTile;
      const inRange = Math.hypot(t.x - c.x, t.y - c.y) <= RESCUE_RANGE;
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

  private projectile(from: View, to: View) {
    const u = from.kind === KIND_UNIT ? UNITS[from.type] : null;
    const a = toScreen(from.x, from.y), b = toScreen(to.x, to.y);
    const ay = a.y - (from.air ? AIR_LIFT : 0) - (from.kind === KIND_UNIT ? 16 : from.kind === KIND_CASTLE ? 90 : 40);
    const by = b.y - (to.air ? AIR_LIFT : 0) - (to.kind === KIND_UNIT ? 10 : 20);
    let key = 'arrow', tint = 0xffffff;
    if (u?.attackType === 'magic') { key = 'orb'; tint = u.model.accent; }
    if (u?.attackType === 'siege') key = 'boulder';
    const obj = this.img(a.x, ay, key).setTint(tint).setDepth(8e6);
    const dist = Math.hypot(b.x - a.x, by - ay);
    const dur = Math.min(500, 120 + dist * 0.9);
    obj.setRotation(Math.atan2(by - ay, b.x - a.x));
    const arc = key === 'boulder' ? 60 : 12;
    this.tweens.addCounter({
      from: 0, to: 1, duration: dur,
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        obj.setPosition(a.x + (b.x - a.x) * t, ay + (by - ay) * t - Math.sin(t * Math.PI) * arc);
      },
      onComplete: () => { obj.destroy(); this.spark(b.x, by, tint === 0xffffff ? 0xffe0a0 : tint, 3); },
    });
  }

  private spark(x: number, y: number, color: number, n: number) {
    for (let i = 0; i < n; i++) {
      const s = this.img(x, y, 'spark').setTint(color).setDepth(8e6).setScale(sc(0.5)).setBlendMode(Phaser.BlendModes.ADD);
      const ang = Math.random() * Math.PI * 2, r = 6 + Math.random() * 10;
      this.tweens.add({ targets: s, x: x + Math.cos(ang) * r, y: y + Math.sin(ang) * r * 0.5 - 6, alpha: 0, scale: sc(0.15), duration: 300 + Math.random() * 200, onComplete: () => s.destroy() });
    }
  }

  // ---------------------------------------------------------------- castle collapse

  private setRuin(v: View) {
    v.ruined = true;
    const key = `ruin${v.team}`;
    const th = texHeight(this, key);
    v.sprite.setTexture(key).setOrigin(0.5, (th - 4) / th).setScale(sc(1)).setAlpha(1).clearTint();
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

    this.time.delayedCall(PAN, () => {
      // 1. Rumble: the castle shakes, darkens and explodes from within.
      cam.shake(RUMBLE + COLLAPSE, 0.004);
      const baseX = v.sprite.x;
      this.tweens.add({ targets: v.sprite, x: baseX + 2, duration: 60, yoyo: true, repeat: Math.floor(RUMBLE / 120), onComplete: () => v.sprite.setX(baseX) });
      this.tweens.addCounter({ from: 255, to: 120, duration: RUMBLE, onUpdate: (tw) => {
        const k = Math.round(tw.getValue() ?? 255);
        v.sprite.setTint(Phaser.Display.Color.GetColor(255, k, k));
      } });
      for (let i = 0; i < 9; i++) this.time.delayedCall(i * (RUMBLE / 9) + Math.random() * 80, () => { const p = rnd(); this.explosion(p.x, p.y, 0.8 + Math.random() * 0.6); });

      // 2. Collapse: the castle sinks into a cloud of dust and debris…
      this.time.delayedCall(RUMBLE, () => {
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
          this.time.delayedCall(Math.random() * COLLAPSE, () => this.smoke(p.x, p.y, 0x8a8478, 1.6 + Math.random()));
        }
        // …and what's left is a ruin.
        this.time.delayedCall(COLLAPSE, () => {
          this.tweens.killTweensOf(v.sprite);
          const foot = toScreen(v.x + CASTLE_SIZE / 2, v.y + CASTLE_SIZE / 2);
          v.sprite.setPosition(foot.x, foot.y);
          this.setRuin(v);
          this.cameras.main.flash(200, 255, 230, 200);
          for (let i = 0; i < 10; i++) { const p = rnd(); this.smoke(p.x, c.y - Math.random() * 30, 0x6a645a, 2 + Math.random()); }
          this.time.delayedCall(HOLD, () => {
            this.cinematic = false;
            this.collapsing.delete(v.id);
            done();
          });
        });
      });
    });
  }

  private puff(x: number, y: number, color: number, n: number, spread: number) {
    for (let i = 0; i < n; i++) {
      const s = this.img(x, y, 'dot').setTint(color).setDepth(7.5e6).setAlpha(0.8).setScale(sc(1 + Math.random()));
      const ang = Math.random() * Math.PI * 2, r = spread * (0.4 + Math.random() * 0.6);
      this.tweens.add({ targets: s, x: x + Math.cos(ang) * r, y: y + Math.sin(ang) * r * 0.5 - 10 - Math.random() * 14, alpha: 0, scale: sc(0.3), duration: 500 + Math.random() * 400, onComplete: () => s.destroy() });
    }
  }

  private onSimEvent(ev: SimEvent) {
    if (ev.t === 'round' || ev.t === 'match') this.castleFalls((1 - ev.winner) as Team);
    switch (ev.t) {
      case 'atk': {
        const a = this.views.get(ev.a), b = this.views.get(ev.b);
        if (!a || !b) return;
        if (ev.r) this.projectile(a, b);
        else {
          a.lunge = 160;
          const p = toScreen(b.x, b.y);
          this.spark(p.x, p.y - 12, 0xffffff, 2);
        }
        return;
      }
      case 'chain': {
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
      case 'heal': {
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
          fontFamily: 'Georgia, serif', fontSize: '20px', fontStyle: 'bold', color: '#ffe04a', stroke: '#1a0e00', strokeThickness: 5,
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
          const disc = this.img(p.x, p.y, 'disc').setDisplaySize(e.w, e.h).setTint(0xffe060).setDepth(-7e6).setAlpha(0.3);
          this.telegraphs.push({ x: ev.x, y: ev.y, until: this.time.now + 1100, obj: disc });
          return;
        }
        const beam = this.img(p.x, p.y, 'beam').setOrigin(0.5, 1).setDisplaySize(e.w * 0.9, 900).setTint(0xfff0a0)
          .setBlendMode(Phaser.BlendModes.ADD).setDepth(8.5e6);
        this.tweens.add({ targets: beam, displayWidth: 10, alpha: 0, duration: 700, ease: 'Quad.easeIn', onComplete: () => beam.destroy() });
        const ring = this.img(p.x, p.y, 'ringthin').setDisplaySize(e.w * 0.2, e.h * 0.2).setTint(0xffffff).setDepth(7e6);
        this.tweens.add({ targets: ring, displayWidth: e.w * 1.3, displayHeight: e.h * 1.3, alpha: 0, duration: 600, onComplete: () => ring.destroy() });
        const flash = this.img(p.x, p.y, 'disc').setDisplaySize(e.w, e.h).setTint(0xffffff).setDepth(-6e6).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: flash, alpha: 0, duration: 500, onComplete: () => flash.destroy() });
        this.spark(p.x, p.y - 20, 0xfff0a0, 24);
        this.cameras.main.shake(320, 0.008);
        this.cameras.main.flash(160, 255, 250, 210);
        if (ev.kills) {
          const txt = this.add.text(p.x, p.y - 80, `${ev.kills} slain`, { fontFamily: 'Cinzel, Georgia, serif', fontSize: '22px', color: '#ffe680', stroke: '#2a1a00', strokeThickness: 4 })
            .setOrigin(0.5).setDepth(9.5e6).setResolution(window.devicePixelRatio || 1);
          this.tweens.add({ targets: txt, y: p.y - 130, alpha: 0, duration: 1600, onComplete: () => txt.destroy() });
        }
        return;
      }
    }
  }
}
