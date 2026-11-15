import Phaser from 'phaser';
import { MAP, ROCK_GRID } from '@bc/shared';
import { WORLD, depthAt, toScreen } from './iso';
import { roadMask } from './ground';
import { css, grad, paper, radial, rng } from './paint';

/**
 * Small signs of life on the battlefield: grass swaying in the wind, a flock of birds now and
 * then (with shadows racing over the ground), butterflies and slow shafts of sunlight.
 */
export class Ambient {
  private tufts: Phaser.GameObjects.Image[] = [];
  private birds: Array<{ img: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Image; x: number; y: number; vx: number; vy: number; ph: number }> = [];
  private nextFlock = 4000;
  private flies: Array<{ img: Phaser.GameObjects.Image; hx: number; hy: number; ph: number }> = [];
  private shafts: Phaser.GameObjects.Image[] = [];

  constructor(private scene: Phaser.Scene, private res: number) {
    this.textures();
    const r = rng(2024);
    // Grass tufts (not on the road or rocks).
    for (let i = 0; i < 420; i++) {
      const tx = 0.5 + r() * (MAP.width - 1), ty = 0.5 + r() * (MAP.height - 1);
      if (roadMask(tx, ty) > 0.1 || ROCK_GRID[Math.floor(ty) * MAP.width + Math.floor(tx)]) continue;
      const p = toScreen(tx, ty);
      const img = scene.add.image(p.x, p.y + 1, `tuft${i % 3}`).setOrigin(0.5, 1).setDepth(depthAt(tx, ty) - 1)
        .setScale((0.8 + r() * 0.6) / res).setData('ph', tx * 0.35 + ty * 0.2);
      this.tufts.push(img);
    }
    // Butterflies fluttering around a few meadow spots.
    for (let i = 0; i < 10; i++) {
      const tx = 2 + r() * (MAP.width - 4), ty = 1 + r() * (MAP.height - 2);
      if (roadMask(tx, ty) > 0.1) continue;
      const p = toScreen(tx, ty);
      const img = scene.add.image(p.x, p.y, 'butterfly').setScale(1 / res).setTint([0xfff0a0, 0xffffff, 0xc8d8ff, 0xffb0d0][i % 4]);
      this.flies.push({ img, hx: p.x, hy: p.y - 14, ph: r() * 10 });
    }
    // Light shafts follow the camera (screen-space feel), additive and faint.
    for (let i = 0; i < 4; i++) {
      this.shafts.push(scene.add.image(0, 0, 'shaft').setBlendMode(Phaser.BlendModes.ADD).setDepth(4.65e6).setAlpha(0));
    }
  }

  private textures() {
    const T = this.scene.textures;
    const R = this.res;
    const add = (key: string, c: HTMLCanvasElement) => { if (T.exists(key)) T.remove(key); T.addCanvas(key, c); };
    for (let k = 0; k < 3; k++) {
      const p = paper(14, 14, R);
      const r = rng(70 + k);
      for (let i = 0; i < 7; i++) {
        const x = 7 + (r() - 0.5) * 6, h = 7 + r() * 6, lean = (r() - 0.5) * 5;
        p.ctx.strokeStyle = css(i % 3 === 0 ? 0x8aa048 : i % 3 === 1 ? 0x5a7a30 : 0x3e5a24, 0.95); p.ctx.lineWidth = 0.9;
        p.ctx.beginPath(); p.ctx.moveTo(x, 14); p.ctx.quadraticCurveTo(x + lean * 0.3, 14 - h * 0.6, x + lean, 14 - h); p.ctx.stroke();
      }
      add(`tuft${k}`, p.canvas);
    }
    const b = paper(14, 8, R);
    b.ctx.strokeStyle = css(0x1a1612); b.ctx.lineWidth = 1.3;
    b.ctx.beginPath(); b.ctx.moveTo(1, 2); b.ctx.quadraticCurveTo(4, 5, 7, 5); b.ctx.quadraticCurveTo(10, 5, 13, 2); b.ctx.stroke();
    add('bird', b.canvas);
    const bf = paper(6, 5, R);
    bf.ctx.fillStyle = css(0xffffff); bf.ctx.beginPath(); bf.ctx.ellipse(1.6, 2.2, 1.6, 2, -0.4, 0, Math.PI * 2); bf.ctx.ellipse(4.4, 2.2, 1.6, 2, 0.4, 0, Math.PI * 2); bf.ctx.fill();
    add('butterfly', bf.canvas);
    const sh = paper(160, 900, Math.min(R, 1));
    sh.ctx.fillStyle = grad(sh.ctx, 0, 0, 160, 0, [[0, 0xffe0a0, 0], [0.5, 0xffe0a0, 0.5], [1, 0xffe0a0, 0]]);
    sh.ctx.fillRect(0, 0, 160, 900);
    sh.ctx.globalCompositeOperation = 'destination-in';
    sh.ctx.fillStyle = grad(sh.ctx, 0, 0, 0, 900, [[0, 0xffffff, 1], [1, 0xffffff, 0]]);
    sh.ctx.fillRect(0, 0, 160, 900);
    add('shaft', sh.canvas);
    const bs = paper(12, 6, R);
    bs.ctx.fillStyle = radial(bs.ctx, 6, 3, 6, [[0, 0x000000, 0.4], [1, 0x000000, 0]]);
    bs.ctx.fillRect(0, 0, 12, 6);
    add('birdShadow', bs.canvas);
  }

  update(time: number, dt: number) {
    const cam = this.scene.cameras.main;
    const v = cam.worldView;
    const t = time / 1000;
    // Wind: a gust travels across the map; tufts in view lean with it.
    for (const g of this.tufts) {
      if (g.x < v.x - 20 || g.x > v.right + 20 || g.y < v.y - 20 || g.y > v.bottom + 30) continue;
      const ph = g.getData('ph') as number;
      const gust = Math.max(0, Math.sin(t * 0.6 - ph * 0.25)) ** 3;
      g.setRotation(Math.sin(t * 2.2 + ph) * 0.06 + gust * 0.22);
    }
    // Butterflies.
    for (const f of this.flies) {
      const x = f.hx + Math.sin(t * 0.7 + f.ph) * 26 + Math.sin(t * 1.9 + f.ph * 2) * 8;
      const y = f.hy + Math.cos(t * 0.9 + f.ph) * 10 + Math.sin(t * 2.7 + f.ph) * 4;
      f.img.setPosition(x, y).setDepth(y + 24).setScale((0.4 + 0.6 * Math.abs(Math.sin(t * 14 + f.ph))) / this.res, 1 / this.res);
    }
    // A flock of birds every so often.
    this.nextFlock -= dt;
    if (this.nextFlock <= 0 && !this.birds.length) {
      this.nextFlock = 18000 + Math.random() * 20000;
      const n = 5 + Math.floor(Math.random() * 5);
      const sx = v.x - 60, sy = v.y + v.height * (0.2 + Math.random() * 0.5);
      for (let i = 0; i < n; i++) {
        const img = this.scene.add.image(0, 0, 'bird').setDepth(9.2e6).setScale(1 / this.res).setAlpha(0.85);
        const shadow = this.scene.add.image(0, 0, 'birdShadow').setDepth(4.5e6).setScale(1.4 / this.res);
        this.birds.push({ img, shadow, x: sx - (i % 3) * 18 - Math.random() * 30, y: sy + (i - n / 2) * 12 + Math.random() * 10, vx: 95 + Math.random() * 10, vy: -12 + Math.random() * 6, ph: Math.random() * 6 });
      }
    }
    for (let i = this.birds.length - 1; i >= 0; i--) {
      const b = this.birds[i];
      b.x += b.vx * dt / 1000; b.y += b.vy * dt / 1000;
      const flap = Math.sin(t * 11 + b.ph);
      b.img.setPosition(b.x, b.y).setScale(1 / this.res, (0.5 + 0.5 * flap) / this.res);
      b.shadow.setPosition(b.x + 50, b.y + 120);
      if (b.x > WORLD.maxX + 600 || b.x > v.right + 300) { b.img.destroy(); b.shadow.destroy(); this.birds.splice(i, 1); }
    }
    // Light shafts, slanting from the upper left, slowly breathing.
    const z = cam.zoom;
    this.shafts.forEach((s, i) => {
      const x = v.x + v.width * (0.12 + i * 0.24) + Math.sin(t * 0.05 + i) * 30;
      s.setPosition(x, v.y - 40).setOrigin(0.5, 0).setRotation(-0.55).setScale(1.6 / z * (window.devicePixelRatio || 1) / 2 + 0.4, 1.2 / z * (window.devicePixelRatio || 1) / 2 + 0.3)
        .setAlpha(0.05 + 0.035 * Math.sin(t * 0.3 + i * 1.7));
    });
  }
}
