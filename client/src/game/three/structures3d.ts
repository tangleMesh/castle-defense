import * as THREE from 'three';
import { CASTLE_SIZE, type BuildingDef } from '@bc/shared';
import { TEAM_COLORS } from '../iso';
import { hashStr, mulberry } from './util';

/**
 * Procedural 3D buildings. Every building style maps to an archetype (tower, hut, temple, portal,
 * well, crystal, citadel, …); the style's name seeds the proportions and details, and the model's
 * wall and roof colours paint it, so each style keeps its own look in 3D. Built around the origin,
 * footprint `size` × `size` tiles, standing on y = 0.
 */
export interface Built {
  group: THREE.Group;
  /** Top of the building (tiles), for health bars and beams. */
  height: number;
  scaffold?: THREE.Object3D;
  animate?: (time: number) => void;
}

type Arch =
  | 'house' | 'hall' | 'tower' | 'spire' | 'totem' | 'hut' | 'tent' | 'pen' | 'dome' | 'temple' | 'pyramid' | 'portal' | 'well'
  | 'volcano' | 'rocks' | 'crystal' | 'statue' | 'factory' | 'generator' | 'citadel' | 'cage' | 'tree' | 'mushroom' | 'crypt'
  | 'graveyard' | 'nest' | 'lantern' | 'eye' | 'banner' | 'cart' | 'mine' | 'chest';

const ARCH: Record<string, Arch> = {
  hall: 'hall', warhall: 'hall', moonhall: 'hall', honorhall: 'hall', academy: 'hall', elfrange: 'hall', stable: 'hall', plaguebarn: 'hall', slaughterhouse: 'hall',
  workshop: 'house', lab: 'house', exchange: 'house', shadowhouse: 'house',
  tower: 'tower', speartower: 'tower', icetower: 'tower', arcanetower: 'tower', soulturret: 'tower', frostlauncher: 'tower',
  guardspire: 'spire', wizardspire: 'spire', obelisk: 'spire', lightobelisk: 'spire', pillar: 'spire', oracle: 'spire', starfall: 'spire', eraser: 'spire',
  totempole: 'totem', stasistotem: 'totem',
  hut: 'hut', trollhut: 'hut', icehut: 'hut', murloccamp: 'hut', ruinhut: 'hut',
  shamantent: 'tent', kodopen: 'pen',
  igloo: 'dome', mound: 'dome', icecave: 'dome', hauntedmine: 'mine',
  temple: 'temple', shrine: 'temple', altar: 'temple', bonetemple: 'temple', snaketemple: 'temple', moonshrine: 'temple', goldshrine: 'temple',
  felshrine: 'temple', destructionshrine: 'temple', greedaltar: 'temple', codex: 'temple',
  pyramid: 'pyramid',
  voidportal: 'portal', hellgate: 'portal', demongate: 'portal', hawkportal: 'portal', magicruin: 'portal',
  well: 'well', fountain: 'well', bloodfountain: 'well', swampwell: 'well', wonderwell: 'well', spawningpool: 'well', reptilepool: 'well',
  nagaspring: 'well', painwell: 'well', deathpit: 'well',
  volcano: 'volcano',
  rockpile: 'rocks', snowrocks: 'rocks', serpentrock: 'rocks', skullpile: 'rocks', scrapheap: 'rocks',
  wildstone: 'crystal', moonstone: 'crystal', nexus: 'crystal',
  coralstatue: 'statue', demonstatue: 'statue', tidalguardian: 'statue', blightprotector: 'statue', forgottenone: 'statue',
  factory: 'factory', foundry: 'factory', hangar: 'factory', orcworks: 'factory', glaiveworks: 'factory', elfsiege: 'factory',
  generator: 'generator', tesla: 'generator',
  citadel: 'citadel', chaoscitadel: 'citadel', icepalace: 'citadel', magiccity: 'citadel', necropolis: 'citadel', worldfreezer: 'citadel',
  cage: 'cage', demoncage: 'cage',
  tree: 'tree', blightancient: 'tree',
  frostshroom: 'mushroom',
  crypt: 'crypt', dragongrave: 'crypt',
  graveyard: 'graveyard',
  nest: 'nest', roost: 'nest', icenest: 'nest', dragonnest: 'nest',
  moonlantern: 'lantern',
  corruptioneye: 'eye',
  banner: 'banner',
  haycart: 'cart',
  treasure: 'chest',
};

const matCache = new Map<string, THREE.Material>();
function mat(color: number, opts: { emissive?: number; rough?: number; flat?: boolean; metal?: number } = {}): THREE.MeshStandardMaterial {
  const key = `${color}|${opts.emissive ?? 0}|${opts.rough ?? 0.85}|${opts.flat ? 1 : 0}|${opts.metal ?? 0}`;
  let m = matCache.get(key) as THREE.MeshStandardMaterial | undefined;
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color, roughness: opts.rough ?? 0.85, metalness: opts.metal ?? 0, flatShading: opts.flat ?? false,
      emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.emissive ? 0.9 : 0,
    });
    m.userData.emissive = opts.emissive ?? 0x000000;
    matCache.set(key, m);
  }
  return m;
}

const shade = (c: number, f: number) => {
  const r = Math.min(255, Math.round(((c >> 16) & 255) * f)), g = Math.min(255, Math.round(((c >> 8) & 255) * f)), b = Math.min(255, Math.round((c & 255) * f));
  return (r << 16) | (g << 8) | b;
};

function mesh(geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  return o;
}

/** A gabled roof (triangular prism) of width w (x), depth d (z) and height h, base at y. */
function gable(w: number, d: number, h: number, m: THREE.Material, y: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  geo.translate(0, 0, -d / 2);
  return mesh(geo, m, 0, y, 0);
}

function flag(team: number, x: number, y: number, z: number, scale = 1) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.03 * scale, 0.03 * scale, 1.1 * scale, 5), mat(0x3a2a1a), 0, 0.55 * scale, 0));
  const cloth = mesh(new THREE.PlaneGeometry(0.55 * scale, 0.32 * scale), mat(TEAM_COLORS[team], { rough: 0.7 }), 0.28 * scale, 0.92 * scale, 0);
  (cloth.material as THREE.Material).side = THREE.DoubleSide;
  g.add(cloth);
  g.position.set(x, y, z);
  return { g, cloth };
}

/** A building of definition `def`, owned by `team`. */
export function buildStructure(def: BuildingDef, team: number): Built {
  const { style, wall, roof } = def.model;
  const arch = ARCH[style] ?? 'house';
  const rnd = mulberry(hashStr(style));
  const S = def.size;
  const k = S / 2;
  const H = (0.7 + def.model.height / 24) * Math.max(0.8, k);
  const W = mat(wall, { flat: true }), R = mat(roof, { flat: true }), dark = mat(shade(wall, 0.45));
  const glowM = mat(roof, { emissive: roof });
  const g = new THREE.Group();
  let top = H;
  const anims: Array<(t: number) => void> = [];
  const door = () => g.add(mesh(new THREE.BoxGeometry(0.34 * k, 0.55 * k, 0.05), dark, 0, 0.28 * k, S * 0.43 + 0.02));

  switch (arch) {
    case 'house': case 'hall': {
      const long = arch === 'hall';
      const w = S * (long ? 0.9 : 0.78), d = S * (long ? 0.62 : 0.72), h = H * (long ? 0.5 : 0.55);
      g.add(mesh(new THREE.BoxGeometry(w, h, d), W, 0, h / 2, 0));
      g.add(gable(w * 1.08, d * 1.12, H * (0.35 + rnd() * 0.15), R, h));
      if (rnd() < 0.6) g.add(mesh(new THREE.BoxGeometry(0.18 * k, 0.6 * k, 0.18 * k), dark, w * 0.28, h + 0.35 * k, -d * 0.15));
      if (long && rnd() < 0.7) { const a = 0.45 * k; g.add(mesh(new THREE.BoxGeometry(a, h * 0.7, a), W, -w / 2 - a * 0.3, h * 0.35, d * 0.15)); }
      // Stone plinth and warm lit windows on the front.
      g.add(mesh(new THREE.BoxGeometry(w * 1.04, h * 0.14, d * 1.04), dark, 0, h * 0.07, 0));
      const win = mat(0xffd68a, { emissive: 0xffb04a });
      const nw = long ? 3 : 2;
      for (let i = 0; i < nw; i++) {
        const x = -w * 0.32 + (i / (nw - 1)) * w * 0.64;
        if (Math.abs(x) < 0.2 * k) continue;
        g.add(mesh(new THREE.BoxGeometry(0.16 * k, 0.18 * k, 0.03), win, x, h * 0.58, d / 2 + 0.01));
      }
      door();
      top = h + H * 0.45;
      break;
    }
    case 'tower': {
      const square = rnd() < 0.4;
      const r = 0.32 * S;
      const h = H * 1.35;
      g.add(mesh(square ? new THREE.BoxGeometry(r * 1.7, h, r * 1.7) : new THREE.CylinderGeometry(r * 0.85, r, h, 10), W, 0, h / 2, 0));
      if (square || rnd() < 0.4) {
        for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; g.add(mesh(new THREE.BoxGeometry(0.16 * k, 0.22 * k, 0.16 * k), W, Math.cos(a) * r * 0.85, h + 0.1 * k, Math.sin(a) * r * 0.85)); }
        g.add(mesh(new THREE.ConeGeometry(r * 0.6, h * 0.3, 8), R, 0, h + h * 0.15, 0));
      } else g.add(mesh(new THREE.ConeGeometry(r * 1.25, h * 0.45, 10), R, 0, h + h * 0.22, 0));
      const orb = mesh(new THREE.OctahedronGeometry(0.14 * S), glowM, 0, h + h * 0.5, 0);
      if (style !== 'tower' && style !== 'speartower') { g.add(orb); anims.push((t) => { orb.rotation.y = t / 600; }); }
      top = h * 1.5;
      break;
    }
    case 'spire': {
      const h = H * 1.6;
      g.add(mesh(new THREE.BoxGeometry(S * 0.55, 0.25, S * 0.55), dark, 0, 0.12, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.08 * S, 0.24 * S, h, 4 + Math.floor(rnd() * 3)), W, 0, h / 2 + 0.2, 0));
      const c = mesh(new THREE.OctahedronGeometry(0.2 * S), glowM, 0, h + 0.45, 0);
      g.add(c);
      anims.push((t) => { c.rotation.y = t / 500; c.position.y = h + 0.45 + Math.sin(t / 400) * 0.08; });
      top = h + 0.7;
      break;
    }
    case 'totem': {
      let y = 0;
      for (let i = 0; i < 4; i++) {
        const r = 0.22 * S * (1 - i * 0.06), hh = H * 0.32;
        g.add(mesh(new THREE.CylinderGeometry(r, r * 1.05, hh, 8), i % 2 ? R : W, 0, y + hh / 2, 0));
        g.add(mesh(new THREE.BoxGeometry(r * 0.5, hh * 0.25, 0.05), dark, 0, y + hh * 0.6, r + 0.01));
        y += hh;
      }
      g.add(mesh(new THREE.BoxGeometry(S * 0.7, 0.1 * S, 0.1 * S), R, 0, y - 0.2, 0));
      top = y;
      break;
    }
    case 'hut': case 'tent': {
      const tent = arch === 'tent';
      const r = S * 0.4, h = tent ? 0.15 : H * 0.4;
      if (!tent) g.add(mesh(new THREE.CylinderGeometry(r, r * 1.04, h, 12), W, 0, h / 2, 0));
      g.add(mesh(new THREE.ConeGeometry(r * (tent ? 1.05 : 1.25), H * (tent ? 1.1 : 0.7), tent ? 7 : 12), R, 0, h + H * (tent ? 0.55 : 0.35), 0));
      for (let i = 0; tent && i < 3; i++) { const a = i * 2.1; g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 4), dark, Math.cos(a) * 0.12, h + H * 1.1, Math.sin(a) * 0.12)); }
      door();
      top = h + H * (tent ? 1.1 : 0.7);
      break;
    }
    case 'pen': {
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 5), dark, Math.cos(a) * S * 0.44, 0.3, Math.sin(a) * S * 0.44)); }
      g.add(mesh(new THREE.TorusGeometry(S * 0.44, 0.03, 4, 24), dark, 0, 0.45, 0).rotateX(Math.PI / 2));
      g.add(mesh(new THREE.ConeGeometry(S * 0.25, H * 0.7, 7), R, -S * 0.12, H * 0.35, -S * 0.1));
      g.add(mesh(new THREE.BoxGeometry(S * 0.3, H * 0.25, S * 0.2), W, S * 0.15, H * 0.12, S * 0.12));
      top = H * 0.8;
      break;
    }
    case 'dome': case 'mine': {
      const r = S * 0.45;
      const dm = mesh(new THREE.SphereGeometry(r, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), W);
      dm.scale.y = H / r * 0.55;
      g.add(dm);
      if (arch === 'mine') {
        g.add(mesh(new THREE.BoxGeometry(0.5 * k, 0.55 * k, 0.4), dark, 0, 0.28 * k, r * 0.85));
        g.add(mesh(new THREE.BoxGeometry(0.62 * k, 0.08, 0.45), R, 0, 0.6 * k, r * 0.85));
        const lamp = mesh(new THREE.SphereGeometry(0.07, 8, 6), glowM, 0.3 * k, 0.5 * k, r * 0.95);
        g.add(lamp);
      } else g.add(mesh(new THREE.CylinderGeometry(0.22 * k, 0.24 * k, 0.4 * k, 10, 1, false, 0, Math.PI), dark, 0, 0.2 * k, r * 0.8).rotateY(-Math.PI / 2));
      top = H * 0.6;
      break;
    }
    case 'temple': {
      const w = S * 0.86, h = H * 0.6;
      g.add(mesh(new THREE.BoxGeometry(w, 0.2, w), dark, 0, 0.1, 0));
      g.add(mesh(new THREE.BoxGeometry(w * 0.85, 0.12, w * 0.85), W, 0, 0.26, 0));
      const n = 3 + Math.floor(rnd() * 2);
      for (let i = 0; i < n; i++) for (const sz of [-1, 1]) {
        const x = -w * 0.36 + (i / (n - 1)) * w * 0.72;
        g.add(mesh(new THREE.CylinderGeometry(0.07 * S, 0.08 * S, h, 8), W, x, 0.32 + h / 2, sz * w * 0.34));
      }
      g.add(mesh(new THREE.BoxGeometry(w * 0.9, 0.14, w * 0.85), W, 0, 0.32 + h + 0.07, 0));
      if (rnd() < 0.5) g.add(gable(w * 0.9, w * 0.85, H * 0.3, R, 0.32 + h + 0.14));
      else { const dm = mesh(new THREE.SphereGeometry(w * 0.32, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), R, 0, 0.32 + h + 0.14, 0); g.add(dm); }
      const altar = mesh(new THREE.OctahedronGeometry(0.13 * S), glowM, 0, 0.32 + h * 0.4, 0);
      g.add(altar);
      anims.push((t) => { altar.rotation.y = t / 700; });
      top = 0.32 + h + H * 0.35;
      break;
    }
    case 'pyramid': {
      let y = 0;
      for (let i = 0; i < 4; i++) { const w = S * (0.9 - i * 0.2), h = H * 0.22; g.add(mesh(new THREE.BoxGeometry(w, h, w), i % 2 ? R : W, 0, y + h / 2, 0)); y += h; }
      g.add(mesh(new THREE.ConeGeometry(S * 0.12, H * 0.3, 4), glowM, 0, y + H * 0.15, 0));
      top = y + H * 0.3;
      break;
    }
    case 'portal': {
      const r = S * 0.36;
      for (const sx of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.25 * k, H, 0.3 * k), W, sx * r, H / 2, 0));
      const arc = mesh(new THREE.TorusGeometry(r, 0.13 * k, 8, 20, Math.PI), W, 0, H, 0);
      g.add(arc);
      const inner = mesh(new THREE.CircleGeometry(r * 0.92, 24), mat(roof, { emissive: roof, rough: 0.3 }), 0, H * 0.62, 0);
      inner.scale.y = 1.25;
      (inner.material as THREE.Material).side = THREE.DoubleSide;
      g.add(inner);
      g.add(mesh(new THREE.BoxGeometry(S * 0.9, 0.15, S * 0.5), dark, 0, 0.07, 0));
      anims.push((t) => { inner.rotation.z = t / 900; });
      top = H + r * 0.5;
      break;
    }
    case 'well': {
      const r = S * 0.4;
      g.add(mesh(new THREE.CylinderGeometry(r, r * 1.05, 0.45, 16, 1, true), W, 0, 0.22, 0));
      g.add(mesh(new THREE.TorusGeometry(r, 0.07, 6, 20), W, 0, 0.45, 0).rotateX(Math.PI / 2));
      const water = mesh(new THREE.CircleGeometry(r * 0.96, 20), mat(roof, { emissive: shade(roof, 0.5), rough: 0.2 }), 0, 0.36, 0);
      water.rotation.x = -Math.PI / 2;
      g.add(water);
      if (rnd() < 0.6) {
        g.add(mesh(new THREE.CylinderGeometry(0.08 * S, 0.12 * S, H * 0.7, 8), W, 0, H * 0.35, 0));
        const jet = mesh(new THREE.SphereGeometry(0.12 * S, 10, 8), mat(roof, { emissive: roof }), 0, H * 0.75, 0);
        g.add(jet);
        anims.push((t) => { jet.scale.setScalar(1 + 0.15 * Math.sin(t / 220)); });
        top = H * 0.85;
      } else top = 0.6;
      break;
    }
    case 'volcano': {
      g.add(mesh(new THREE.CylinderGeometry(S * 0.12, S * 0.46, H, 10, 1, true), W, 0, H / 2, 0));
      const lava = mesh(new THREE.CircleGeometry(S * 0.12, 10), mat(0xff6020, { emissive: 0xff5010 }), 0, H - 0.02, 0);
      lava.rotation.x = -Math.PI / 2;
      g.add(lava);
      top = H;
      break;
    }
    case 'rocks': {
      const n = 4 + Math.floor(rnd() * 4);
      for (let i = 0; i < n; i++) {
        const s = (0.25 + rnd() * 0.3) * S;
        const r = mesh(new THREE.DodecahedronGeometry(s, 0), i % 3 === 0 ? R : W, (rnd() - 0.5) * S * 0.6, s * 0.55, (rnd() - 0.5) * S * 0.6);
        r.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
        g.add(r);
      }
      top = S * 0.8;
      break;
    }
    case 'crystal': {
      const n = 3 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) {
        const h = H * (0.5 + rnd() * 0.7), r = 0.1 * S + rnd() * 0.1 * S;
        const c = mesh(new THREE.CylinderGeometry(0, r, h, 5), i === 0 ? glowM : mat(wall, { flat: true, rough: 0.3 }), (rnd() - 0.5) * S * 0.5, h / 2, (rnd() - 0.5) * S * 0.5);
        c.rotation.set((rnd() - 0.5) * 0.4, rnd() * 3, (rnd() - 0.5) * 0.4);
        g.add(c);
      }
      g.add(mesh(new THREE.DodecahedronGeometry(S * 0.3, 0), dark, 0, 0.1, 0));
      top = H * 1.1;
      break;
    }
    case 'statue': {
      g.add(mesh(new THREE.BoxGeometry(S * 0.6, 0.4, S * 0.6), dark, 0, 0.2, 0));
      const body = mesh(new THREE.CylinderGeometry(0.18 * S, 0.24 * S, H * 0.7, 8), W, 0, 0.4 + H * 0.35, 0);
      g.add(body);
      g.add(mesh(new THREE.SphereGeometry(0.15 * S, 10, 8), W, 0, 0.4 + H * 0.78, 0));
      for (const sx of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.08 * S, H * 0.45, 0.08 * S), R, sx * 0.24 * S, 0.4 + H * 0.5, 0).rotateZ(sx * 0.4));
      const eyes = mesh(new THREE.BoxGeometry(0.16 * S, 0.03, 0.02), glowM, 0, 0.4 + H * 0.8, 0.14 * S);
      g.add(eyes);
      top = 0.4 + H * 0.95;
      break;
    }
    case 'factory': {
      const w = S * 0.86, d = S * 0.66, h = H * 0.45;
      g.add(mesh(new THREE.BoxGeometry(w, h, d), W, 0, h / 2, 0));
      for (let i = 0; i < 3; i++) g.add(gable(w / 3, d, h * 0.45, R, h).translateX(-w / 3 + i * w / 3));
      const nch = 1 + Math.floor(rnd() * 2);
      for (let i = 0; i < nch; i++) g.add(mesh(new THREE.CylinderGeometry(0.1 * k, 0.12 * k, H * 0.8, 8), dark, w * 0.3 - i * 0.35 * k, h + H * 0.3, -d * 0.25));
      const furnace = mesh(new THREE.BoxGeometry(0.4 * k, 0.25 * k, 0.04), mat(0xff8030, { emissive: 0xff6020 }), 0, 0.2 * k, d / 2 + 0.02);
      g.add(furnace);
      anims.push((t) => { (furnace.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.7 + 0.3 * Math.sin(t / 150); });
      top = h + H * 0.7;
      break;
    }
    case 'generator': {
      g.add(mesh(new THREE.BoxGeometry(S * 0.7, 0.3, S * 0.7), dark, 0, 0.15, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.16 * S, 0.22 * S, H, 10), W, 0, 0.3 + H / 2, 0));
      for (let i = 0; i < 3; i++) g.add(mesh(new THREE.TorusGeometry(0.24 * S, 0.035 * S, 6, 16), mat(0xc08040, { metal: 0.6, rough: 0.4 }), 0, 0.5 + i * H * 0.28, 0).rotateX(Math.PI / 2));
      const ball = mesh(new THREE.SphereGeometry(0.17 * S, 12, 10), mat(0x9ad8ff, { emissive: 0x6ac0ff }), 0, 0.3 + H + 0.15 * S, 0);
      g.add(ball);
      anims.push((t) => { (ball.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + 0.6 * Math.abs(Math.sin(t / 90)); });
      top = 0.3 + H + 0.3 * S;
      break;
    }
    case 'citadel': {
      const w = S * 0.5, h = H * 0.9;
      g.add(mesh(new THREE.BoxGeometry(w, h, w), W, 0, h / 2, 0));
      g.add(mesh(new THREE.ConeGeometry(w * 0.75, H * 0.5, 4), R, 0, h + H * 0.25, 0).rotateY(Math.PI / 4));
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4, r = S * 0.36;
        const th = h * 0.75;
        g.add(mesh(new THREE.CylinderGeometry(0.12 * S, 0.14 * S, th, 8), W, Math.cos(a) * r, th / 2, Math.sin(a) * r));
        g.add(mesh(new THREE.ConeGeometry(0.17 * S, H * 0.35, 8), R, Math.cos(a) * r, th + H * 0.17, Math.sin(a) * r));
      }
      const gem = mesh(new THREE.OctahedronGeometry(0.1 * S), glowM, 0, h + H * 0.6, 0);
      g.add(gem);
      anims.push((t) => { gem.rotation.y = t / 500; });
      top = h + H * 0.65;
      break;
    }
    case 'cage': {
      g.add(mesh(new THREE.BoxGeometry(S * 0.86, 0.2, S * 0.86), dark, 0, 0.1, 0));
      const bars = mat(0x3a3a40, { metal: 0.7, rough: 0.4 });
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2, r = S * 0.38;
        g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, H, 4), bars, Math.cos(a) * r, 0.2 + H / 2, Math.sin(a) * r));
      }
      g.add(mesh(new THREE.CylinderGeometry(S * 0.42, S * 0.42, 0.14, 16), R, 0, 0.2 + H, 0));
      const beast = mesh(new THREE.SphereGeometry(S * 0.2, 10, 8), mat(roof, { emissive: shade(roof, 0.6) }), 0, 0.2 + S * 0.22, 0);
      g.add(beast);
      anims.push((t) => { beast.position.x = Math.sin(t / 700) * S * 0.12; });
      top = 0.2 + H + 0.1;
      break;
    }
    case 'tree': {
      g.add(mesh(new THREE.CylinderGeometry(0.16 * S, 0.26 * S, H * 0.9, 7), W, 0, H * 0.45, 0));
      const n = 3 + Math.floor(rnd() * 2);
      for (let i = 0; i < n; i++) {
        const s = (0.36 + rnd() * 0.16) * S;
        const leaf = mesh(new THREE.IcosahedronGeometry(s, 0), R, (rnd() - 0.5) * S * 0.4, H * 0.7 + s * 0.6 + rnd() * 0.3, (rnd() - 0.5) * S * 0.4);
        g.add(leaf);
      }
      for (const sx of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.05 * S, 0.09 * S, 0.5 * S, 5), W, sx * 0.25 * S, 0.12, 0.1).rotateZ(sx * 1.1));
      const eyes = mesh(new THREE.BoxGeometry(0.18 * S, 0.04, 0.02), glowM, 0, H * 0.45, 0.2 * S);
      g.add(eyes);
      top = H * 0.7 + S * 0.7;
      break;
    }
    case 'mushroom': {
      g.add(mesh(new THREE.CylinderGeometry(0.1 * S, 0.16 * S, H * 0.6, 8), W, 0, H * 0.3, 0));
      const cap = mesh(new THREE.SphereGeometry(0.42 * S, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(roof, { emissive: shade(roof, 0.4) }), 0, H * 0.58, 0);
      cap.scale.y = 0.6;
      g.add(cap);
      top = H * 0.85;
      break;
    }
    case 'crypt': {
      const w = S * 0.8;
      g.add(mesh(new THREE.BoxGeometry(w, H * 0.45, w * 0.7), W, 0, H * 0.22, 0));
      g.add(mesh(new THREE.BoxGeometry(w * 1.05, 0.1, w * 0.78), R, 0, H * 0.45 + 0.05, 0));
      g.add(mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), R, 0, H * 0.45 + 0.4, 0));
      g.add(mesh(new THREE.BoxGeometry(0.3, 0.08, 0.08), R, 0, H * 0.45 + 0.5, 0));
      door();
      top = H * 0.45 + 0.7;
      break;
    }
    case 'graveyard': {
      for (let i = 0; i < 7; i++) {
        const t = mesh(new THREE.BoxGeometry(0.22 * k, 0.4 * k, 0.07), W, (rnd() - 0.5) * S * 0.7, 0.2 * k, (rnd() - 0.5) * S * 0.7);
        t.rotation.set((rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.6, (rnd() - 0.5) * 0.3);
        g.add(t);
      }
      const wisp = mesh(new THREE.SphereGeometry(0.1, 8, 6), glowM, 0, 0.6, 0);
      g.add(wisp);
      anims.push((t) => { wisp.position.set(Math.sin(t / 900) * S * 0.25, 0.6 + Math.sin(t / 300) * 0.1, Math.cos(t / 1100) * S * 0.25); });
      top = 0.8;
      break;
    }
    case 'nest': {
      g.add(mesh(new THREE.CylinderGeometry(0.12 * S, 0.2 * S, H * 0.6, 6), dark, 0, H * 0.3, 0));
      g.add(mesh(new THREE.TorusGeometry(S * 0.32, S * 0.1, 6, 14), W, 0, H * 0.62, 0).rotateX(Math.PI / 2));
      for (let i = 0; i < 3; i++) g.add(mesh(new THREE.SphereGeometry(0.1 * S, 8, 6), R, (i - 1) * 0.14 * S, H * 0.68, (i % 2 - 0.5) * 0.1 * S));
      top = H * 0.8;
      break;
    }
    case 'lantern': {
      g.add(mesh(new THREE.CylinderGeometry(0.05 * S, 0.07 * S, H, 6), W, 0, H / 2, 0));
      g.add(mesh(new THREE.BoxGeometry(S * 0.4, 0.05 * S, 0.05 * S), W, 0, H * 0.95, 0));
      const l = mesh(new THREE.SphereGeometry(0.13 * S, 12, 10), mat(roof, { emissive: roof }), S * 0.16, H * 0.8, 0);
      g.add(l);
      anims.push((t) => { l.position.x = S * 0.16 + Math.sin(t / 500) * 0.04; });
      top = H;
      break;
    }
    case 'eye': {
      g.add(mesh(new THREE.CylinderGeometry(0.1 * S, 0.3 * S, H * 0.6, 7), W, 0, H * 0.3, 0));
      const ball = mesh(new THREE.SphereGeometry(0.26 * S, 16, 12), mat(0xf0e8d0), 0, H * 0.6 + 0.26 * S, 0);
      const iris = mesh(new THREE.SphereGeometry(0.12 * S, 12, 8), mat(roof, { emissive: roof }), 0, 0, 0.18 * S);
      ball.add(iris);
      g.add(ball);
      anims.push((t) => { ball.rotation.y = Math.sin(t / 900) * 0.8; });
      top = H * 0.6 + 0.55 * S;
      break;
    }
    case 'banner': {
      g.add(mesh(new THREE.ConeGeometry(S * 0.34, H * 0.7, 6), W, 0, H * 0.35, 0));
      for (const sx of [-1, 1]) {
        g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, H * 1.2, 5), dark, sx * S * 0.38, H * 0.6, S * 0.2));
        g.add(mesh(new THREE.PlaneGeometry(0.3 * S, 0.5 * S), R, sx * S * 0.38 + 0.16 * S, H * 1.0, S * 0.2));
      }
      top = H * 1.2;
      break;
    }
    case 'chest': {
      // Treasure Chest: an iron-bound chest on a stone step, lid open, gold glowing inside.
      g.add(mesh(new THREE.BoxGeometry(S * 0.85, 0.2, S * 0.7), mat(0x8a8478, { flat: true }), 0, 0.1, 0));
      const cw = S * 0.62, ch = 0.55, cd = S * 0.42;
      g.add(mesh(new THREE.BoxGeometry(cw, ch, cd), W, 0, 0.2 + ch / 2, 0));
      const gold = mesh(new THREE.BoxGeometry(cw * 0.92, 0.08, cd * 0.9), mat(roof, { emissive: shade(roof, 0.6), metal: 0.6, rough: 0.35 }), 0, 0.2 + ch + 0.02, 0);
      g.add(gold);
      const lid = mesh(new THREE.BoxGeometry(cw, 0.08, cd), W, 0, 0, 0);
      const hinge = new THREE.Group(); hinge.position.set(0, 0.2 + ch, -cd / 2); lid.position.set(0, 0, cd / 2); hinge.add(lid); hinge.rotation.x = -1.1;
      g.add(hinge);
      const iron = mat(0x3a3a40, { metal: 0.7, rough: 0.4 });
      for (const u of [-0.32, 0.32]) g.add(mesh(new THREE.BoxGeometry(0.06, ch + 0.02, cd + 0.02), iron, u * cw, 0.2 + ch / 2, 0));
      g.add(mesh(new THREE.BoxGeometry(0.14, 0.14, 0.03), mat(0xd0b060, { metal: 0.8, rough: 0.3 }), 0, 0.2 + ch * 0.6, cd / 2 + 0.02));
      for (let i = 0; i < 6; i++) { const c = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 10), mat(roof, { metal: 0.7, rough: 0.3 }), (rnd() - 0.5) * S * 0.8, 0.02, cd / 2 + 0.15 + rnd() * 0.3); g.add(c); }
      anims.push((t) => { (gold.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + 0.25 * Math.sin(t / 400); });
      top = 0.2 + ch + 0.5;
      break;
    }
    case 'cart': {
      g.add(mesh(new THREE.BoxGeometry(S * 0.7, 0.3, S * 0.45), W, 0, 0.45, 0));
      for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) g.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 12), dark, sx * S * 0.25, 0.2, sz * S * 0.25).rotateX(Math.PI / 2));
      const hay = mesh(new THREE.SphereGeometry(S * 0.3, 10, 8), R, 0, 0.75, 0);
      hay.scale.set(1.1, 0.7, 0.8);
      g.add(hay);
      top = 1.1;
      break;
    }
  }
  // Every building flies its owner's colours.
  const f = flag(team, S * 0.38, Math.min(top, H) * 0.55, -S * 0.3, 0.9 * Math.max(0.8, k));
  g.add(f.g);
  anims.push((t) => { f.cloth.rotation.y = Math.sin(t / 300 + S) * 0.35; });
  // Scaffold while under construction.
  const scaffold = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(S * 0.95, top, S * 0.95)), new THREE.LineBasicMaterial({ color: 0x8a6a3a }));
  scaffold.position.y = top / 2;
  scaffold.visible = false;
  g.add(scaffold);
  return { group: g, height: top, scaffold, animate: (t) => { for (const a of anims) a(t); } };
}

/** A team's castle: curtain walls, four round towers in the team colour, a keep and banners. */
export function buildCastle(team: number): Built {
  const g = new THREE.Group();
  const S = CASTLE_SIZE;
  const stone = mat(0x9c968a, { flat: true }), dark = mat(0x6a655c, { flat: true }), roofM = mat(TEAM_COLORS[team], { flat: true, rough: 0.6 });
  const wallH = 1.6, r = S / 2 - 0.4;
  for (const [x, z, w, d] of [[0, -r, 2 * r, 0.5], [0, r, 2 * r, 0.5], [-r, 0, 0.5, 2 * r], [r, 0, 0.5, 2 * r]] as const) {
    g.add(mesh(new THREE.BoxGeometry(w, wallH, d), stone, x, wallH / 2, z));
    const n = Math.round(Math.max(w, d) / 0.5);
    for (let i = 0; i < n; i += 2) {
      const t = -0.5 + (i + 0.5) / n;
      g.add(mesh(new THREE.BoxGeometry(w > d ? 0.28 : 0.55, 0.3, w > d ? 0.55 : 0.28), stone, x + (w > d ? t * w : 0), wallH + 0.15, z + (w > d ? 0 : t * d)));
    }
  }
  g.add(mesh(new THREE.BoxGeometry(1.4, 1.2, 0.2), dark, 0, 0.6, r + 0.2));
  const keepW = S * 0.42, keepH = 4;
  g.add(mesh(new THREE.BoxGeometry(keepW, keepH, keepW), stone, 0, keepH / 2, -0.2));
  g.add(mesh(new THREE.ConeGeometry(keepW * 0.8, 1.6, 4), roofM, 0, keepH + 0.8, -0.2).rotateY(Math.PI / 4));
  const flags: THREE.Mesh[] = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const th = 3;
    g.add(mesh(new THREE.CylinderGeometry(0.7, 0.8, th, 12), stone, sx * r, th / 2, sz * r));
    g.add(mesh(new THREE.ConeGeometry(0.95, 1.5, 12), roofM, sx * r, th + 0.75, sz * r));
    const f = flag(team, sx * r, th + 1.4, sz * r, 1.3);
    g.add(f.g);
    flags.push(f.cloth);
  }
  const top = keepH + 1.6;
  return { group: g, height: top, animate: (t) => { flags.forEach((c, i) => { c.rotation.y = Math.sin(t / 300 + i) * 0.35; }); } };
}
