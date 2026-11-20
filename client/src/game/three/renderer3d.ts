import * as THREE from 'three';
import {
  BUILDINGS, FX_HIDDEN, CASTLE_CLEARANCE, CASTLE_SIZE, MAP, RESCUE_RADIUS, TICK_RATE, UNITS, inRescueArea, itemEffect, type SimEvent,
} from '@bc/shared';
import { DPR, TEAM_COLORS, TX, toTile } from '../iso';
import { UNIT_TEX } from '../textures';
import { KIND_BUILDER, KIND_BUILDING, KIND_CASTLE, KIND_UNIT, UNIT_SCALE } from '../viewTypes';
import type { GameScene, View } from '../scene';
import { buildCastle, buildStructure, type Built } from './structures3d';
import { paintGround3d } from './ground3d';
import { mulberry } from './util';

/**
 * The 3D battlefield (graphics option "3D"): a three.js scene drawn under the (then transparent)
 * Phaser canvas. Phaser keeps doing everything else (snapshots → views, input, selection,
 * placement, camera movement, the minimap); this renderer reads the same views every frame and
 * follows Phaser's camera, so both modes play identically.
 *
 * World axes: three.js x = tile x (castle to castle), z = tile y (towards the viewer), y = up.
 * Terrain, rocks, trees, the castles and every building are real geometry (each building style
 * gets its own procedural shape); units stay the painted sprites, standing upright and facing
 * the camera (2.5D).
 */

const FOV = 32;
/** Camera elevation (degrees above the ground) and its lean towards the east. */
const ELEVATION = 46, AZIMUTH = 12;
/** Upright sprites are foreshortened by the camera tilt; this restores their 2D proportions. */
const SPRITE_STRETCH = 1.45;
/** Flyers hover this high (tiles). */
const AIR_HEIGHT = 0.7;

type UnitObj = { sprite: THREE.Sprite; ring: THREE.Mesh; shadow: THREE.Mesh; key: string; flip: boolean };
type StructObj = { built: Built; type: string; team: number; ghost: boolean; plate: THREE.Mesh; ruinT?: number };
interface Fx { t0: number; dur: number; obj: THREE.Object3D; tick: (k: number, now: number) => void }
interface FloatText { x: number; y: number; h: number; text: string; color: string; t0: number }

export class Renderer3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 600);
  private sun = new THREE.DirectionalLight(0xfff1d6, 2.1);
  private target = new THREE.Vector3(MAP.width / 2, 0, MAP.height / 2);
  private overlay: HTMLCanvasElement;
  private octx: CanvasRenderingContext2D;
  private units = new Map<number, UnitObj>();
  private structs = new Map<number, StructObj>();
  private texCache = new Map<string, THREE.Texture>();
  private fx: Fx[] = [];
  private texts: FloatText[] = [];
  private frameGroup = new THREE.Group();
  private fogTex: THREE.DataTexture;
  private fogPlane: THREE.Mesh;
  private fogFor: Uint8Array | null | undefined = undefined;
  private glowTex: THREE.Texture;
  private raycaster = new THREE.Raycaster();
  private ground: THREE.Mesh;
  private shared = {
    ring: new THREE.RingGeometry(0.82, 1, 32),
    disc: new THREE.CircleGeometry(1, 32),
    sphere: new THREE.SphereGeometry(1, 10, 8),
    auraRing: new THREE.RingGeometry(0.96, 1, 64),
  };
  /** Ground rings of aura carriers (fill, edge, travelling wave), kept per entity. */
  private auras = new Map<number, { g: THREE.Group; fill: THREE.Mesh; edge: THREE.Mesh; wave: THREE.Mesh }>();
  /** Cosmetic hit effects alive right now (extras are skipped above a budget). */
  private fxLive = 0;
  private onResize = () => this.resize();

  constructor(private gs: GameScene, private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(DPR);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    const el = this.renderer.domElement;
    el.className = 'three-canvas';
    this.overlay = document.createElement('canvas');
    this.overlay.className = 'three-overlay';
    this.octx = this.overlay.getContext('2d')!;
    container.append(el, this.overlay);

    this.scene.background = new THREE.Color(0x8fb2c8);
    this.scene.fog = new THREE.Fog(0x8fb2c8, 70, 190);
    this.scene.add(new THREE.HemisphereLight(0xd8ecff, 0x41502c, 1.25));
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.03;
    const sc = this.sun.shadow.camera;
    sc.left = -32; sc.right = 32; sc.top = 32; sc.bottom = -32; sc.near = 1; sc.far = 120;
    this.scene.add(this.sun, this.sun.target);
    this.scene.add(this.frameGroup);

    this.glowTex = radialTexture();
    this.ground = this.buildTerrain();
    // Fog of war: a dark sheet over the map whose alpha follows the vision grid (smoothly filtered).
    const data = new Uint8Array(MAP.width * MAP.height * 4);
    this.fogTex = new THREE.DataTexture(data, MAP.width, MAP.height, THREE.RGBAFormat);
    this.fogTex.magFilter = THREE.LinearFilter;
    this.fogTex.minFilter = THREE.LinearFilter;
    this.fogPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(MAP.width, MAP.height),
      new THREE.MeshBasicMaterial({ color: 0x0a1018, transparent: true, opacity: 0.85, alphaMap: this.fogTex, depthWrite: false }),
    );
    this.fogPlane.rotation.x = -Math.PI / 2;
    this.fogPlane.position.set(MAP.width / 2, 0.06, MAP.height / 2);
    this.fogPlane.renderOrder = 2;
    this.scene.add(this.fogPlane);

    window.addEventListener('resize', this.onResize);
    this.resize();
  }

  dispose() {
    window.removeEventListener('resize', this.onResize);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      for (const mat of mats) { (mat as THREE.MeshBasicMaterial).map?.dispose(); mat.dispose(); }
    });
    for (const t of this.texCache.values()) t.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.overlay.remove();
  }

  private resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.overlay.width = Math.round(w * DPR);
    this.overlay.height = Math.round(h * DPR);
    this.overlay.style.width = `${w}px`;
    this.overlay.style.height = `${h}px`;
  }

  // ---------------------------------------------------------------- world

  private buildTerrain(): THREE.Mesh {
    const W = MAP.width, H = MAP.height;
    // Surrounding countryside: a wide meadow fading into the distance haze.
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(W + 260, H + 220), new THREE.MeshLambertMaterial({ color: 0x4d6b31 }));
    outer.rotation.x = -Math.PI / 2;
    outer.position.set(W / 2, -0.02, H / 2);
    outer.receiveShadow = true;
    this.scene.add(outer);
    // The battlefield: a painted top-down texture (grass, build zones, castle yards, paths).
    const tex = new THREE.CanvasTexture(paintGround3d());
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshLambertMaterial({ map: tex }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(W / 2, 0, H / 2);
    ground.receiveShadow = true;
    this.scene.add(ground);
    // Rocks: clusters of faceted boulders filling each rock rectangle.
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a8578, roughness: 0.95, flatShading: true });
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rnd = mulberry(7);
    for (const r of MAP.rocks) {
      const n = Math.max(1, Math.round(r.w * r.h * 0.9));
      for (let k = 0; k < n; k++) {
        const m = new THREE.Mesh(rockGeo, rockMat);
        const s = 0.45 + rnd() * 0.45;
        m.scale.set(s * (0.9 + rnd() * 0.4), s * (0.6 + rnd() * 0.6), s * (0.9 + rnd() * 0.4));
        m.position.set(r.x + 0.5 + rnd() * Math.max(0, r.w - 1), s * 0.35, r.y + 0.5 + rnd() * Math.max(0, r.h - 1));
        m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
        m.castShadow = true; m.receiveShadow = true;
        this.scene.add(m);
      }
    }
    // Forest around the battlefield (instanced trunks and crowns).
    const N = 900;
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.18, 1, 6), new THREE.MeshLambertMaterial({ color: 0x5a4028 }), N);
    const crown = new THREE.InstancedMesh(new THREE.ConeGeometry(0.9, 2.2, 7), new THREE.MeshLambertMaterial({ color: 0x2f5a2a, flatShading: true }), N);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3();
    const tint = new THREE.Color();
    let i = 0;
    while (i < N) {
      const x = -40 + rnd() * (W + 80), y = -30 + rnd() * (H + 60);
      if (x > -2 && x < W + 2 && y > -2 && y < H + 2) continue;
      const s = 0.8 + rnd() * 0.9;
      q.setFromEuler(new THREE.Euler(0, rnd() * 6, 0));
      m4.compose(pos.set(x, 0.5 * s, y), q, scl.set(s, s, s));
      trunk.setMatrixAt(i, m4);
      m4.compose(pos.set(x, s * 1.9, y), q, scl.set(s, s, s));
      crown.setMatrixAt(i, m4);
      crown.setColorAt(i, tint.setHSL(0.27 + rnd() * 0.06, 0.4 + rnd() * 0.15, 0.2 + rnd() * 0.08));
      i++;
    }
    trunk.castShadow = crown.castShadow = true;
    this.scene.add(trunk, crown);
    return ground;
  }

  // ---------------------------------------------------------------- camera & picking

  /** Follow Phaser's camera: the same view centre and the same pixels per tile along x. */
  private updateCamera() {
    const cam = this.gs.cameras.main;
    // Phaser skips the per-frame update of a hidden camera (scroll bounds, view rectangle, midpoint),
    // and edge/arrow scrolling, panning and the minimap rely on it: run it here.
    (cam as unknown as { preRender: () => void }).preRender();
    const mid = cam.midPoint;
    const t = toTile(mid.x, mid.y);
    this.target.set(t.x, 0, t.y);
    const zoomCss = cam.zoom / DPR;
    const pxPerTile = TX * zoomCss;
    const D = window.innerHeight / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * pxPerTile);
    const el = THREE.MathUtils.degToRad(ELEVATION), az = THREE.MathUtils.degToRad(AZIMUTH);
    const off = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(D);
    // The castle-collapse cinematic shakes Phaser's camera: shake this one too.
    const shake = (cam as unknown as { shakeEffect?: { isRunning: boolean } }).shakeEffect?.isRunning ? 0.12 : 0;
    const j = new THREE.Vector3((Math.random() - 0.5) * shake, 0, (Math.random() - 0.5) * shake);
    this.camera.position.copy(this.target).add(off).add(j);
    this.camera.lookAt(this.target.clone().add(j));
    this.camera.far = D * 6 + 100;
    this.camera.updateProjectionMatrix();
    // The sun's shadow box follows the view.
    this.sun.position.copy(this.target).add(new THREE.Vector3(18, 34, 14));
    this.sun.target.position.copy(this.target);
    const half = Math.min(60, Math.max(20, D * 0.75));
    const sc = this.sun.shadow.camera;
    if (sc.right !== half) { sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.updateProjectionMatrix(); }
  }

  private ndc(cssX: number, cssY: number) {
    return new THREE.Vector2((cssX / window.innerWidth) * 2 - 1, -(cssY / window.innerHeight) * 2 + 1);
  }

  /** Map tile under a screen point (CSS pixels): where the view ray meets the ground. */
  tileAt(cssX: number, cssY: number): { x: number; y: number } {
    this.raycaster.setFromCamera(this.ndc(cssX, cssY), this.camera);
    const r = this.raycaster.ray;
    if (Math.abs(r.direction.y) < 1e-6) return { x: this.target.x, y: this.target.z };
    const k = -r.origin.y / r.direction.y;
    return { x: r.origin.x + r.direction.x * k, y: r.origin.z + r.direction.z * k };
  }

  /** Screen position (CSS px) of a world point, or null when behind the camera. */
  private toScreen(x: number, h: number, y: number): { x: number; y: number } | null {
    const v = new THREE.Vector3(x, h, y).project(this.camera);
    if (v.z > 1) return null;
    return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight };
  }

  /** Entity under a screen point: units and builders first (by their sprite), then structures. */
  pick(cssX: number, cssY: number): number | null {
    let best: number | null = null, bestD = 26;
    for (const v of this.gs.views.values()) {
      if (v.kind !== KIND_UNIT && v.kind !== KIND_BUILDER) continue;
      const o = this.units.get(v.id);
      if (!o || !o.sprite.visible) continue;
      const p = this.toScreen(v.x, o.sprite.position.y + Math.abs(o.sprite.scale.y) * 0.18, v.y);
      if (!p) continue;
      const d = Math.hypot(p.x - cssX, p.y - cssY);
      if (d < bestD) { bestD = d; best = v.id; }
    }
    if (best !== null) return best;
    this.raycaster.setFromCamera(this.ndc(cssX, cssY), this.camera);
    const objs = [...this.structs.values()].filter((s) => !s.ghost).map((s) => s.built.group);
    const hit = this.raycaster.intersectObjects(objs, true)[0];
    if (hit) {
      let o: THREE.Object3D | null = hit.object;
      while (o && o.userData.id === undefined) o = o.parent;
      if (o) return o.userData.id as number;
    }
    const t = this.tileAt(cssX, cssY);
    for (const v of this.gs.views.values()) {
      if (v.kind !== KIND_BUILDING && v.kind !== KIND_CASTLE) continue;
      const size = v.kind === KIND_CASTLE ? CASTLE_SIZE : BUILDINGS[v.type].size;
      if (Math.abs(t.x - v.x) <= size / 2 + 0.2 && Math.abs(t.y - v.y) <= size / 2 + 0.2) return v.id;
    }
    return null;
  }

  // ---------------------------------------------------------------- textures

  /** A Phaser-generated canvas texture (unit frames, builders, sheep) as a three.js texture. */
  private tex(key: string, flip: boolean): THREE.Texture | null {
    const k = flip ? `${key}|f` : key;
    const hit = this.texCache.get(k);
    if (hit) return hit;
    if (!this.gs.textures.exists(key)) return null;
    const img = this.gs.textures.get(key).getSourceImage() as HTMLCanvasElement;
    const t = new THREE.CanvasTexture(img);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    if (flip) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; }
    t.needsUpdate = true;
    this.texCache.set(k, t);
    return t;
  }

  // ---------------------------------------------------------------- per frame

  frame(time: number) {
    this.updateCamera();
    const views = this.gs.views;
    const seenU = new Set<number>(), seenS = new Set<number>();
    for (const v of views.values()) {
      if (v.kind === KIND_UNIT || v.kind === KIND_BUILDER) { this.placeUnit(v, time); seenU.add(v.id); }
      else { this.placeStructure(v, false, time); seenS.add(v.id); }
    }
    // Last-seen enemy buildings in the fog.
    for (const g of this.gs.ghosts.values()) { this.placeStructure(g, true, time); seenS.add(g.id); }
    for (const [id, o] of this.units) if (!seenU.has(id)) { this.scene.remove(o.sprite, o.ring, o.shadow); (o.sprite.material as THREE.Material).dispose(); (o.ring.material as THREE.Material).dispose(); (o.shadow.material as THREE.Material).dispose(); this.units.delete(id); }
    for (const [id, o] of this.structs) if (!seenS.has(id)) { this.removeStruct(o); this.structs.delete(id); }
    this.updateFog();
    this.updateAuras(time);
    this.drawFrameOverlays(time);
    this.stepFx(time);
    this.renderer.render(this.scene, this.camera);
    this.drawBars(time);
  }

  private placeUnit(v: View, time: number) {
    let o = this.units.get(v.id);
    const key = v.sprite.texture.key;
    const flip = v.sprite.flipX;
    if (!o) {
      const mat = new THREE.SpriteMaterial({ transparent: true, alphaTest: 0.04, depthWrite: true });
      const sprite = new THREE.Sprite(mat);
      sprite.center.set(0.5, 1 - UNIT_TEX.footY / UNIT_TEX.h);
      const r = v.kind === KIND_UNIT ? UNITS[v.type].radius : 0.32;
      const ring = new THREE.Mesh(this.shared.ring, new THREE.MeshBasicMaterial({ color: TEAM_COLORS[v.team], transparent: true, opacity: v.kind === KIND_BUILDER ? 0.9 : 0.55, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.scale.setScalar(v.kind === KIND_BUILDER ? 0.45 : r * 1.25);
      const shadow = new THREE.Mesh(this.shared.disc, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2;
      shadow.scale.setScalar(Math.max(0.25, r * 1.1));
      o = { sprite, ring, shadow, key: '', flip: false };
      this.units.set(v.id, o);
      this.scene.add(sprite, ring, shadow);
    }
    if (o.key !== key || o.flip !== flip) {
      const t = this.tex(key, flip);
      if (t) { (o.sprite.material as THREE.SpriteMaterial).map = t; (o.sprite.material as THREE.SpriteMaterial).needsUpdate = true; o.key = key; o.flip = flip; }
    }
    const s = (v.kind === KIND_UNIT ? UNIT_SCALE : 1.1);
    const w = (UNIT_TEX.w * s) / TX, h = (UNIT_TEX.h * s) / TX * SPRITE_STRETCH;
    // Phaser's per-frame scale carries the idle breathing; keep its ratio.
    const breathe = v.sprite.scaleY / (v.sprite.scaleX || 1);
    o.sprite.scale.set(w, h * breathe, 1);
    const lift = v.air ? AIR_HEIGHT + Math.sin(time / 260 + v.id) * 0.06 : 0;
    const lunge = v.lunge > 0 ? Math.sin((v.lunge / 160) * Math.PI) * 0.12 * v.facing : 0;
    o.sprite.position.set(v.x + lunge, lift, v.y + 0.001);
    const mat = o.sprite.material as THREE.SpriteMaterial;
    mat.opacity = v.sprite.alpha;
    const tint = v.sprite.isTinted ? v.sprite.tintTopLeft : 0xffffff;
    // Hit flash: a warm brightening for a moment, then the 2D sprite's red tint.
    if (v.flash > 70) mat.color.setRGB(1.7, 1.35, 1.25); else mat.color.setHex(tint);
    o.ring.position.set(v.x, 0.03, v.y);
    o.shadow.position.set(v.x, 0.02, v.y);
    o.shadow.visible = v.sprite.alpha > 0.5;
    (o.shadow.material as THREE.MeshBasicMaterial).opacity = v.air ? 0.16 : 0.28;
  }

  private placeStructure(v: View, ghost: boolean, time: number) {
    let o = this.structs.get(v.id);
    if (o && (o.type !== v.type || o.team !== v.team || o.ghost !== ghost)) { this.removeStruct(o); this.structs.delete(v.id); o = undefined; }
    if (!o) {
      const built = v.kind === KIND_CASTLE ? buildCastle(v.team) : buildStructure(BUILDINGS[v.type], v.team);
      built.group.userData.id = v.id;
      built.group.traverse((m) => { if ((m as THREE.Mesh).isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      if (ghost) built.group.traverse((m) => {
        const mesh = m as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
        mat.color.lerp(new THREE.Color(0x707070), 0.7); mat.transparent = true; mat.opacity = 0.55;
        mesh.material = mat;
        mesh.castShadow = false;
      });
      const size = v.kind === KIND_CASTLE ? CASTLE_SIZE : BUILDINGS[v.type].size;
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(size + 0.2, size + 0.2), new THREE.MeshBasicMaterial({ color: TEAM_COLORS[v.team], transparent: true, opacity: ghost ? 0.06 : 0.16, depthWrite: false }));
      plate.rotation.x = -Math.PI / 2;
      o = { built, type: v.type, team: v.team, ghost, plate };
      this.structs.set(v.id, o);
      this.scene.add(built.group, plate);
    }
    const g = o.built.group;
    g.position.set(v.x, 0, v.y);
    o.plate.position.set(v.x, 0.025, v.y);
    // Under construction: it rises out of its scaffold; upgrading: it pulses.
    const constructing = v.kind === KIND_BUILDING && v.extra !== 100 && !ghost;
    const prog = constructing ? Math.abs(v.extra) / 100 : 1;
    const rise = v.extra < 0 ? 1 : 0.12 + 0.88 * prog;
    let sy = rise;
    if (v.extra < 0) sy = 0.96 + 0.04 * Math.sin(time / 120);
    // A fallen castle sinks into a smoking ruin.
    if (v.kind === KIND_CASTLE && (v.ruined || v.hp <= 0)) {
      o.ruinT ??= time;
      const k = Math.min(1, (time - o.ruinT) / 1600);
      sy = 1 - 0.62 * k;
      g.rotation.z = 0.06 * k;
      if (Math.random() < 0.08) this.puff(v.x + (Math.random() - 0.5) * 3, 1 + Math.random() * 2, v.y + (Math.random() - 0.5) * 3, 0x4a4640, 2, 0.8, 1400);
      if (k < 1 && Math.random() < 0.25) this.burst(v.x + (Math.random() - 0.5) * 3, 1 + Math.random() * 2.5, v.y + (Math.random() - 0.5) * 3, 0xffa040, 1.2);
    } else { o.ruinT = undefined; g.rotation.z = 0; }
    g.scale.set(1, sy, 1);
    o.built.scaffold && (o.built.scaffold.visible = constructing && v.extra >= 0);
    o.built.animate?.(time);
  }

  private removeStruct(o: StructObj) {
    this.scene.remove(o.built.group, o.plate);
    o.built.group.traverse((m) => {
      const mesh = m as THREE.Mesh;
      if (!mesh.geometry) return;
      // Geometries belong to this building; materials are shared per colour (cached), except ghost clones.
      mesh.geometry.dispose();
      if (o.ghost) (mesh.material as THREE.Material).dispose();
    });
    o.plate.geometry.dispose();
    (o.plate.material as THREE.Material).dispose();
  }

  // ---------------------------------------------------------------- fog of war

  private updateFog() {
    const vis = this.gs.vision;
    if (vis === this.fogFor) return;
    this.fogFor = vis;
    this.fogPlane.visible = !!vis;
    if (!vis) return;
    const d = this.fogTex.image.data as Uint8Array;
    // DataTexture rows run bottom-up in UV space; the plane's v axis points to -z (north).
    for (let y = 0; y < MAP.height; y++) for (let x = 0; x < MAP.width; x++) {
      const i = ((MAP.height - 1 - y) * MAP.width + x) * 4;
      const a = vis[y * MAP.width + x] ? 0 : 150;
      d[i] = d[i + 1] = d[i + 2] = a; d[i + 3] = 255;
    }
    this.fogTex.needsUpdate = true;
  }

  // ---------------------------------------------------------------- overlays (rebuilt every frame)

  private ovRing(x: number, y: number, r: number, color: number, opacity: number, width = 0.06, h = 0.05) {
    const inner = Math.max(0, 1 - width / Math.max(r, 0.01));
    // Overlays draw on top of everything (like the 2D overlay), so walls and units never hide them.
    const m = new THREE.Mesh(new THREE.RingGeometry(inner, 1, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.scale.setScalar(r); m.position.set(x, h, y); m.renderOrder = 10;
    this.frameGroup.add(m);
    return m;
  }

  private ovDisc(x: number, y: number, r: number, color: number, opacity: number) {
    const m = new THREE.Mesh(this.shared.disc, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.scale.setScalar(r); m.position.set(x, 0.05, y); m.renderOrder = 3;
    this.frameGroup.add(m);
  }

  /** Rectangle outline (tile coordinates of its corner) and optional fill. */
  private ovRect(tx: number, ty: number, w: number, h: number, color: number, opacity: number, fill = 0) {
    const pts = [[tx, ty], [tx + w, ty], [tx + w, ty + h], [tx, ty + h], [tx, ty]].map(([x, y]) => new THREE.Vector3(x, 0.07, y));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest: false }));
    line.renderOrder = 10;
    this.frameGroup.add(line);
    if (fill > 0) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: fill, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(tx + w / 2, 0.06, ty + h / 2); m.renderOrder = 3;
      this.frameGroup.add(m);
    }
  }

  private clearFrameGroup() {
    for (const c of [...this.frameGroup.children]) {
      const m = c as THREE.Mesh;
      if (m.geometry !== this.shared.disc && m.geometry !== this.shared.ring) m.geometry?.dispose();
      (m.material as THREE.Material)?.dispose();
      this.frameGroup.remove(c);
    }
  }

  private ghostBox?: THREE.Mesh;

  private drawFrameOverlays(time: number) {
    this.clearFrameGroup();
    const s = this.gs.session;
    const snap = s.latest;
    if (!snap) return;
    // Pending build orders (foundations).
    for (const [p, b, tx, ty] of snap.orders) {
      const size = BUILDINGS[b].size;
      this.ovRect(tx, ty, size, size, TEAM_COLORS[snap.players[p].team], p === s.you ? 0.85 : 0.45);
    }
    // Selection.
    const sel = s.selection !== null ? this.gs.views.get(s.selection) : undefined;
    if (sel) {
      const col = sel.owner === s.you ? 0x40ff60 : sel.team === s.team ? 0xffe040 : 0xff4040;
      const a = 0.65 + 0.3 * Math.sin(time / 180);
      if (sel.kind === KIND_UNIT || sel.kind === KIND_BUILDER) {
        this.ovRing(sel.x, sel.y, sel.kind === KIND_UNIT ? UNITS[sel.type].radius + 0.2 : 0.5, col, a, 0.08);
        const owner = sel.kind === KIND_BUILDER ? snap.players[sel.owner] : undefined;
        const atk = owner && itemEffect(owner, 'builderAttack');
        const rep = owner && itemEffect(owner, 'repair');
        if (atk) this.ovRing(sel.x, sel.y, atk.range + 0.3, 0xffd060, 0.45, 0.05);
        if (rep) this.ovRing(sel.x, sel.y, rep.range, 0x60ff80, 0.45, 0.05);
      } else {
        const size = sel.kind === KIND_CASTLE ? CASTLE_SIZE : BUILDINGS[sel.type].size;
        this.ovRect(sel.x - size / 2 - 0.1, sel.y - size / 2 - 0.1, size + 0.2, size + 0.2, col, a);
        const def = sel.kind === KIND_BUILDING ? BUILDINGS[sel.type] : null;
        const rad = def?.aura?.radius ?? def?.attack?.range;
        if (rad) this.ovRing(sel.x, sel.y, rad + size / 2, col, 0.4, 0.05);
      }
    }
    // Placement ghost: a translucent block on the hovered spot, the own zone and the castle's no-build ring.
    if (s.mode.kind === 'place') {
      const def = BUILDINGS[s.mode.building];
      const { tx, ty } = this.gs.ghostTileAt(def.size);
      const ok = !s.placementError(def.id, tx, ty);
      if (!this.ghostBox) {
        this.ghostBox = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.35, depthWrite: false }));
        this.scene.add(this.ghostBox);
      }
      this.ghostBox.visible = true;
      (this.ghostBox.material as THREE.MeshBasicMaterial).color.setHex(ok ? 0x40ff60 : 0xff3030);
      const hgt = 0.6 + (def.model.height ?? 20) / 30;
      this.ghostBox.scale.set(def.size * 0.92, hgt, def.size * 0.92);
      this.ghostBox.position.set(tx + def.size / 2, hgt / 2, ty + def.size / 2);
      this.ovRect(tx, ty, def.size, def.size, ok ? 0x40ff60 : 0xff3030, 0.9, 0.25);
      const z = MAP.zones[s.team];
      this.ovRect(z.x, z.y, z.w, z.h, 0xffffff, 0.25 + 0.1 * Math.sin(time / 200));
      const c = MAP.castles[s.team], k = CASTLE_CLEARANCE;
      this.ovRect(c.x - k, c.y - k, c.w + 2 * k, c.h + 2 * k, 0xff6050, 0.5, 0.12);
    } else if (this.ghostBox) this.ghostBox.visible = false;
    // Rescue strike targeting.
    if (s.mode.kind === 'rescue') {
      const z = MAP.zones[s.team];
      this.ovRect(z.x, z.y, z.w, z.h, 0xffd040, 0.6, 0.05);
      const t = this.gs.hoverTile;
      const ok = inRescueArea(s.team, t.x, t.y);
      this.ovRing(t.x, t.y, RESCUE_RADIUS, ok ? 0xffe060 : 0xff3030, 0.9, 0.12);
      this.ovDisc(t.x, t.y, RESCUE_RADIUS, ok ? 0xffe060 : 0xff3030, 0.15);
    }
    // Own buried mines.
    const blink = Math.floor(time / 450) % 2 === 0;
    for (const [, x, y] of snap.mines ?? []) {
      this.ovDisc(x, y, 0.28, 0x2a2620, 0.8);
      this.ovRing(x, y, 0.28, 0xc0a040, 0.7, 0.05);
      this.ovDisc(x, y, 0.08, blink ? 0xff5030 : 0x802010, 1);
    }
    // Pending rescue strikes (everyone sees the telegraph).
    for (const [p, x, y, left] of snap.strikes) {
      const team = snap.players[p].team;
      this.ovRing(x, y, RESCUE_RADIUS * (0.6 + 0.4 * (1 - left / 20)), team === s.team ? 0xffe060 : 0xff5030, 0.9, 0.12);
    }
  }

  // ---------------------------------------------------------------- health bars & floating text (2D overlay)

  private drawBars(time: number) {
    const g = this.octx;
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const BAR_OWN = '#3ad04a', BAR_ALLY = '#3ab8c8', BAR_ENEMY = '#e0402e';
    const s = this.gs.session, sel = s.selection;
    const zoom = this.gs.cameras.main.zoom / DPR;
    for (const v of this.gs.views.values()) {
      if (v.kind === KIND_BUILDER || v.ruined) continue;
      const constructing = v.kind === KIND_BUILDING && v.extra !== 100;
      if (v.kind !== KIND_UNIT && !(v.hp < v.maxHp || v.id === sel || constructing || this.gs.showAllBars)) continue;
      let p: { x: number; y: number } | null, w: number;
      if (v.kind === KIND_UNIT) {
        const o = this.units.get(v.id);
        if (!o) continue;
        const sc = UNITS[v.type].model.scale;
        p = this.toScreen(v.x, o.sprite.position.y + o.sprite.scale.y * 0.42 * sc, v.y);
        w = (18 + sc * 8) * Math.max(0.7, zoom);
      } else {
        const o = this.structs.get(v.id);
        const size = v.kind === KIND_CASTLE ? CASTLE_SIZE : BUILDINGS[v.type].size;
        p = this.toScreen(v.x, (o?.built.height ?? 2) * o!.built.group.scale.y + 0.4, v.y);
        w = size * 22 * Math.max(0.7, zoom);
      }
      if (!p) continue;
      const x = p.x - w / 2, y = p.y;
      const r = Math.max(0, v.hp / v.maxHp);
      g.fillStyle = 'rgba(12,10,8,0.85)'; g.fillRect(x - 1.5, y - 1.5, w + 3, 6);
      g.fillStyle = 'rgba(42,34,24,0.9)'; g.fillRect(x, y, w, 3);
      g.fillStyle = v.team !== s.team ? BAR_ENEMY : v.owner === s.you ? BAR_OWN : BAR_ALLY; g.fillRect(x, y, w * r, 3);
      g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillRect(x, y, w * r, 1);
      g.fillStyle = `#${TEAM_COLORS[v.team].toString(16).padStart(6, '0')}`; g.fillRect(x - 1.5, y - 1.5, 2, 6);
      const sp = v.kind === KIND_BUILDING && !constructing && v.id === sel ? BUILDINGS[v.type].spawn : undefined;
      if (sp) {
        const prog = 1 - Math.min(1, v.spawn / (sp.interval * TICK_RATE));
        g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(x - 1, y + 5, w + 2, 4);
        g.fillStyle = '#5ab8ff'; g.fillRect(x, y + 6, w * prog, 2);
      }
      if (constructing) {
        g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(x - 1, y + 5, w + 2, 4);
        g.fillStyle = v.extra < 0 ? '#5aa0ff' : '#e0b84a'; g.fillRect(x, y + 6, w * (Math.abs(v.extra) / 100), 2);
      }
    }
    // Floating gold numbers.
    g.font = 'bold 13px Georgia, serif';
    g.textAlign = 'center';
    this.texts = this.texts.filter((t) => {
      const k = (time - t.t0) / 1100;
      if (k >= 1) return false;
      const p = this.toScreen(t.x, t.h + k * 1.2, t.y);
      if (!p) return true;
      g.globalAlpha = 1 - k;
      g.lineWidth = 3; g.strokeStyle = '#2a1a00'; g.strokeText(t.text, p.x, p.y);
      g.fillStyle = t.color; g.fillText(t.text, p.x, p.y);
      g.globalAlpha = 1;
      return true;
    });
  }

  // ---------------------------------------------------------------- effects

  private addFx(obj: THREE.Object3D, dur: number, tick: Fx['tick']) {
    this.scene.add(obj);
    this.fx.push({ t0: performance.now(), dur, obj, tick });
  }

  private stepFx(_time: number) {
    const now = performance.now();
    // Effects may start new ones while they run (a missile's impact flash): those go into the new
    // list, so swap it in first instead of filtering in place (they would be lost and stay on the map).
    const running = this.fx;
    this.fx = [];
    for (const f of running) {
      const k = (now - f.t0) / f.dur;
      if (k >= 1) {
        this.scene.remove(f.obj);
        f.obj.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.geometry && m.geometry !== this.shared.disc && m.geometry !== this.shared.ring && m.geometry !== this.shared.sphere) m.geometry.dispose();
          (m.material as THREE.Material | undefined)?.dispose();
        });
        continue;
      }
      f.tick(k, now);
      this.fx.push(f);
    }
  }

  private glow(color: number, size: number, opacity = 1) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.setScalar(size);
    return s;
  }

  /** A burst of soft particles drifting up and outwards. */
  private puff(x: number, h: number, y: number, color: number, n: number, size: number, dur = 700) {
    const g = new THREE.Group();
    const parts = Array.from({ length: n }, () => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color, transparent: true, opacity: 0.7, depthWrite: false }));
      s.scale.setScalar(size * (0.6 + Math.random() * 0.6));
      g.add(s);
      return { s, vx: (Math.random() - 0.5) * 1.2, vy: 0.4 + Math.random() * 0.9, vz: (Math.random() - 0.5) * 1.2 };
    });
    g.position.set(x, h, y);
    this.addFx(g, dur, (k) => {
      for (const p of parts) {
        p.s.position.set(p.vx * k, p.vy * k, p.vz * k);
        (p.s.material as THREE.SpriteMaterial).opacity = 0.7 * (1 - k);
      }
    });
  }

  /** A bright additive flash. */
  private burst(x: number, h: number, y: number, color: number, size: number, dur = 380) {
    const s = this.glow(color, size);
    s.position.set(x, h, y);
    this.addFx(s, dur, (k) => { s.scale.setScalar(size * (0.6 + k)); (s.material as THREE.SpriteMaterial).opacity = 1 - k; });
  }

  /** Cosmetic extras only while few are running (big fights stay readable). */
  private budget(): boolean {
    if (this.fxLive > 140) return false;
    this.fxLive++;
    setTimeout(() => { this.fxLive--; }, 300);
    return true;
  }

  /**
   * Auras as faint pulsing rings on the ground: gold for ally buffs, green for regeneration,
   * violet for curses on enemies (their wave runs inwards). Map-wide auras only glow at their building.
   */
  private updateAuras(time: number) {
    const seen = new Set<number>();
    const pulse = 0.5 + 0.5 * Math.sin(time / 480);
    // A pack of carriers of the same aura shows one ring, not a stack of them.
    const drawn: Array<{ type: string; team: number; x: number; y: number; r: number }> = [];
    for (const v of this.gs.views.values()) {
      const def = v.kind === KIND_UNIT ? UNITS[v.type] : v.kind === KIND_BUILDING ? BUILDINGS[v.type] : undefined;
      const aura = def?.aura;
      if (!aura || v.ruined || v.hp <= 0 || ((v.fx ?? 0) & FX_HIDDEN) || (v.kind === KIND_BUILDING && v.extra >= 0 && v.extra < 100)) continue;
      if (drawn.some((d) => d.type === v.type && d.team === v.team && Math.hypot(d.x - v.x, d.y - v.y) < d.r * 0.6)) continue;
      drawn.push({ type: v.type, team: v.team, x: v.x, y: v.y, r: aura.radius });
      seen.add(v.id);
      let o = this.auras.get(v.id);
      const curse = aura.target === 'enemy';
      const col = curse ? 0xb060ff : aura.stat === 'regen' ? 0x60ff90 : 0xffd060;
      if (!o) {
        const mat = (op: number) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide });
        const fill = new THREE.Mesh(this.shared.disc, mat(0.04)), edge = new THREE.Mesh(this.shared.auraRing, mat(0.25)), wave = new THREE.Mesh(this.shared.auraRing, mat(0.2));
        const g = new THREE.Group();
        for (const m of [fill, edge, wave]) { m.rotation.x = -Math.PI / 2; g.add(m); }
        g.position.y = 0.05;
        this.scene.add(g);
        o = { g, fill, edge, wave };
        this.auras.set(v.id, o);
      }
      const size = v.kind === KIND_UNIT ? 0 : BUILDINGS[v.type].size;
      const r = aura.radius > 20 ? size * 0.9 : aura.radius + size / 2;
      o.g.position.x = v.x; o.g.position.z = v.y;
      o.fill.scale.setScalar(r); o.edge.scale.setScalar(r);
      (o.fill.material as THREE.MeshBasicMaterial).opacity = aura.radius > 20 ? 0.08 + 0.08 * pulse : v.kind === KIND_UNIT ? 0.03 : 0.045;
      (o.edge.material as THREE.MeshBasicMaterial).opacity = aura.radius > 20 ? 0 : 0.1 + 0.1 * pulse;
      const t = (time / 1600 + v.id * 0.37) % 1, k = curse ? 1 - t : t;
      o.wave.scale.setScalar(Math.max(0.05, r * (0.3 + 0.7 * k)));
      (o.wave.material as THREE.MeshBasicMaterial).opacity = aura.radius > 20 ? 0 : 0.14 * (1 - Math.abs(0.5 - t) * 2);
    }
    for (const [id, o] of this.auras) {
      if (seen.has(id)) continue;
      this.scene.remove(o.g);
      for (const m of [o.fill, o.edge, o.wave]) (m.material as THREE.Material).dispose();
      this.auras.delete(id);
    }
  }

  /** An expanding ring on the ground. */
  private shock(x: number, y: number, r: number, color: number, dur = 420) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.08, y);
    this.addFx(m, dur, (k) => { m.scale.setScalar(Math.max(0.05, r * (0.2 + 0.8 * k))); (m.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k); });
  }

  /** A short glowing line between points (lightning, beams). */
  private streak(pts: THREE.Vector3[], color: number, dur: number, jitter = 0) {
    const all: THREE.Vector3[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const steps = jitter ? 6 : 1;
      for (let k = 0; k <= steps; k++) {
        const p = a.clone().lerp(b, k / steps);
        if (jitter && k > 0 && k < steps) p.add(new THREE.Vector3((Math.random() - 0.5) * jitter, (Math.random() - 0.5) * jitter, (Math.random() - 0.5) * jitter));
        all.push(p);
      }
    }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(all), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.addFx(line, dur, (k) => { (line.material as THREE.LineBasicMaterial).opacity = 1 - k; });
  }

  /** A glowing missile flying from a to b (on an arc when `arc` > 0), then `onHit`. */
  private missile(a: THREE.Vector3, b: THREE.Vector3, color: number, size: number, dur: number, arc = 0, onHit?: () => void) {
    const s = this.glow(color, size);
    let hit = false;
    this.addFx(s, dur, (k) => {
      s.position.copy(a).lerp(b, k);
      s.position.y += arc * 4 * k * (1 - k);
      if (k > 0.97 && !hit) { hit = true; onHit?.(); }
    });
  }

  private posOf(id: number, height = 0.6): THREE.Vector3 | null {
    const v = this.gs.views.get(id);
    if (!v) return null;
    if (v.kind === KIND_UNIT || v.kind === KIND_BUILDER) {
      const o = this.units.get(id);
      return new THREE.Vector3(v.x, (o?.sprite.position.y ?? 0) + height, v.y);
    }
    const o = this.structs.get(id);
    return new THREE.Vector3(v.x, (o?.built.height ?? 2) * 0.6, v.y);
  }

  /** The green marker where a move order went. */
  marker(x: number, y: number) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.75, 1, 32), new THREE.MeshBasicMaterial({ color: 0x40ff60, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.08, y);
    this.addFx(m, 450, (k) => { m.scale.setScalar(0.7 * (1 - k) + 0.1); (m.material as THREE.MeshBasicMaterial).opacity = 1 - k; });
  }

  /** Visual reaction to a simulation event (mirrors the 2D scene's effects). */
  event(ev: SimEvent) {
    switch (ev.t) {
      case 'atk': {
        const a = this.posOf(ev.a), b = this.posOf(ev.b);
        if (!a || !b) return;
        const u = this.gs.views.get(ev.a);
        const ud = u?.kind === KIND_UNIT ? UNITS[u.type] : undefined;
        const col = ud?.attackType === 'magic' ? ud.model.accent : ud?.attackType === 'siege' ? 0xffa060 : 0xffe0a0;
        const extra = this.budget();
        if (ev.r) this.missile(a, b, col, ud?.attackType === 'magic' ? 0.55 : 0.42, Math.min(320, 60 + a.distanceTo(b) * 45), ud?.attackType === 'siege' ? 0.5 : 0.15, () => {
          this.burst(b.x, b.y, b.z, col, 0.6, 180);
          if (extra) this.shock(b.x, b.z, ud?.attackType === 'siege' ? 0.9 : 0.45, col, 260);
        });
        else {
          this.burst(b.x, b.y, b.z, 0xfff0c0, (ud?.dmg ?? 20) >= 60 ? 0.75 : 0.55, 160);
          if (extra) this.shock(b.x, b.z, 0.4, 0xffd8a0, 220);
        }
        return;
      }
      case 'chain': {
        const pts = ev.ids.map((id) => this.posOf(id, 0.7)).filter((p): p is THREE.Vector3 => !!p);
        if (pts.length > 1) this.streak(pts, 0x9ad8ff, 260, 0.35);
        for (const p of pts.slice(1)) this.burst(p.x, p.y, p.z, 0x9ad8ff, 0.6, 220);
        return;
      }
      case 'splash': this.shock(ev.x, ev.y, ev.r, 0xffc080); this.puff(ev.x, 0.3, ev.y, 0x9a8a6a, 5, 0.6); return;
      case 'mine':
        this.shock(ev.x, ev.y, ev.r, 0xffa040, 480);
        this.burst(ev.x, 0.4, ev.y, 0xffc060, 1.6, 300);
        this.puff(ev.x, 0.3, ev.y, 0x6a5a40, 9, 0.8, 900);
        return;
      case 'shell': {
        const a = this.posOf(ev.a, 1.2) ?? new THREE.Vector3(ev.x, 2, ev.y);
        const b = new THREE.Vector3(ev.x, 0.2, ev.y);
        const dur = (ev.f / TICK_RATE) * 1000;
        this.shock(ev.x, ev.y, ev.r, 0xff6040, dur);
        this.missile(a, b, 0xffb060, 0.7, dur, 5, () => {
          this.burst(b.x, 0.6, b.z, 0xffa040, ev.r * 2.2, 450);
          this.puff(b.x, 0.4, b.z, 0x5a5048, 10, 1.1, 1200);
          this.shock(b.x, b.z, ev.r * 1.2, 0xffc080);
        });
        return;
      }
      case 'zone': {
        const dur = (ev.d / TICK_RATE) * 1000;
        const col = ev.air ? 0xff7030 : 0x9ad0ff;
        const disc = new THREE.Mesh(this.shared.disc, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));
        disc.rotation.x = -Math.PI / 2; disc.scale.setScalar(ev.r); disc.position.set(ev.x, ev.air ? AIR_HEIGHT : 0.09, ev.y);
        const swirl = new THREE.Mesh(new THREE.TorusGeometry(ev.r * 0.7, 0.06, 6, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
        swirl.rotation.x = -Math.PI / 2; swirl.position.set(ev.x, (ev.air ? AIR_HEIGHT : 0) + 0.6, ev.y);
        const grp = new THREE.Group(); grp.add(disc, swirl);
        this.addFx(grp, dur, (k, now) => {
          swirl.rotation.z = now / 300;
          swirl.position.y = (ev.air ? AIR_HEIGHT : 0) + 0.4 + 0.3 * Math.sin(now / 200);
          const f = k < 0.1 ? k / 0.1 : k > 0.85 ? (1 - k) / 0.15 : 1;
          (disc.material as THREE.MeshBasicMaterial).opacity = 0.22 * f;
          (swirl.material as THREE.MeshBasicMaterial).opacity = 0.5 * f;
        });
        return;
      }
      case 'stasis': this.shock(ev.x, ev.y, ev.r, 0x8ab8ff, 700); this.burst(ev.x, 1, ev.y, 0x8ab8ff, 3, 600); return;
      case 'hex': {
        const p = this.posOf(ev.id); if (p) { this.puff(p.x, p.y, p.z, 0xff90e0, 10, 0.5); this.burst(p.x, p.y, p.z, 0xffd0f8, 1, 300); }
        return;
      }
      case 'beam': {
        const a = this.posOf(ev.a), b = this.posOf(ev.b);
        if (!a || !b) return;
        a.y = (this.structs.get(ev.a)?.built.height ?? 2) + 0.2;
        this.streak([a, b], 0xfff0a0, 320);
        this.burst(b.x, b.y, b.z, 0xffe080, 1, 300);
        return;
      }
      case 'slay': { const p = this.posOf(ev.b); if (p) { this.burst(p.x, p.y, p.z, 0x9a40ff, 1.4, 400); this.puff(p.x, p.y, p.z, 0x3a1a4a, 8, 0.6); } return; }
      case 'charm': { const p = this.posOf(ev.id); if (p) { this.shock(p.x, p.z, 0.8, 0x60ffb0); this.burst(p.x, p.y, p.z, 0x60ffb0, 1, 400); } return; }
      case 'wave': {
        const len = Math.hypot(ev.x2 - ev.x, ev.y2 - ev.y);
        const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.5, ev.r * 2), new THREE.MeshBasicMaterial({ color: 0x4ab0ff, transparent: true, opacity: 0.45, depthWrite: false }));
        m.position.set((ev.x + ev.x2) / 2, 0.25, (ev.y + ev.y2) / 2);
        m.rotation.y = -Math.atan2(ev.y2 - ev.y, ev.x2 - ev.x);
        this.addFx(m, 700, (k) => { m.scale.set(Math.max(0.02, k), 1 + Math.sin(k * Math.PI), 1); (m.material as THREE.MeshBasicMaterial).opacity = 0.45 * (1 - k * k); });
        return;
      }
      case 'revive': {
        const p = this.posOf(ev.id, 0);
        if (!p) return;
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 3, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe080, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
        col.position.set(p.x, 1.5, p.z);
        this.addFx(col, 800, (k) => { (col.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - k); col.scale.set(1 - k * 0.5, 1, 1 - k * 0.5); });
        return;
      }
      case 'heal': { const p = this.posOf(ev.b); if (p) this.puff(p.x, p.y, p.z, 0x80ff90, 5, 0.3, 600); return; }
      case 'die': {
        const big = ev.k === 'building';
        this.puff(ev.x, big ? 0.8 : 0.4, ev.y, big ? 0x6a6050 : 0x8a7a60, big ? 14 : 5, big ? 1.4 : 0.5, big ? 1400 : 650);
        if (big) this.burst(ev.x, 0.8, ev.y, 0xffa040, 3, 500);
        return;
      }
      case 'gold': this.texts.push({ x: ev.x, y: ev.y, h: 1.2, text: `+${ev.g}`, color: '#ffd84a', t0: performance.now() }); return;
      case 'built': { const p = this.posOf(ev.id, 0); if (p) this.puff(p.x, 0.3, p.z, 0xb0a080, 10, 0.8, 900); return; }
      case 'strike': {
        this.burst(ev.x, 1.5, ev.y, 0xfff0a0, RESCUE_RADIUS * 2.4, 650);
        this.shock(ev.x, ev.y, RESCUE_RADIUS, 0xffe060, 700);
        this.puff(ev.x, 0.5, ev.y, 0xffd070, 16, 1, 1100);
        return;
      }
      default: return;
    }
  }
}

function radialTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
