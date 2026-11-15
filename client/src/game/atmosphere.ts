import Phaser from 'phaser';
import { WORLD } from './iso';
import { paper, rng, softEllipse } from './paint';

/**
 * Mood layer of the battlefield: late-afternoon colour grade, vignette, cloud shadows
 * drifting over the land and motes of pollen glinting in the sun.
 */
export class Atmosphere {
  private clouds: Array<{ img: Phaser.GameObjects.Image; vx: number; vy: number }> = [];
  private motes: Array<{ img: Phaser.GameObjects.Image; x: number; y: number; ph: number; sp: number; life: number }> = [];

  constructor(private scene: Phaser.Scene, res: number) {
    this.makeTextures(res);
    this.grade();
    const r = rng(17);
    for (let i = 0; i < 7; i++) {
      const img = scene.add.image(0, 0, 'cloudShadow').setDepth(4.4e6).setScale((1.4 + r() * 1.6) / res, (1.0 + r() * 1.0) / res)
        .setAlpha(0.16 + r() * 0.08).setTint(0x101830);
      img.setPosition(WORLD.minX + r() * (WORLD.maxX - WORLD.minX), WORLD.minY + r() * (WORLD.maxY - WORLD.minY));
      this.clouds.push({ img, vx: 9 + r() * 5, vy: 3 + r() * 2 });
    }
    for (let i = 0; i < 16; i++) {
      const img = scene.add.image(0, 0, 'mote').setDepth(4.6e6).setBlendMode(Phaser.BlendModes.ADD).setScale(0.7 / res);
      this.motes.push({ img, x: 0, y: 0, ph: r() * 10, sp: 0.4 + r() * 0.8, life: 0 });
    }
  }

  private makeTextures(res: number) {
    const tex = this.scene.textures;
    if (!tex.exists('cloudShadow')) {
      const p = paper(420, 220, res);
      const r = rng(5);
      for (let i = 0; i < 26; i++) {
        const x = 70 + r() * 280, y = 60 + r() * 100;
        softEllipse(p.ctx, x, y, 50 + r() * 70, 26 + r() * 40, 0xffffff, 0.22);
      }
      tex.addCanvas('cloudShadow', p.canvas);
    }
    if (!tex.exists('mote')) {
      const p = paper(8, 8, res);
      softEllipse(p.ctx, 4, 4, 4, 4, 0xfff0c0, 0.9);
      tex.addCanvas('mote', p.canvas);
    }
  }

  /** Warm, slightly richer colours with a soft vignette. */
  private grade() {
    const cam = this.scene.cameras.main;
    if (!cam.postFX) return; // canvas renderer
    const cm = cam.postFX.addColorMatrix();
    // Warm highlights, cooler shadows-ish: lift red, trim blue, add contrast and saturation.
    cm.set([
      1.08, 0.02, 0, 0, 0.012,
      0, 1.02, 0, 0, 0.004,
      0, 0.02, 0.9, 0, -0.008,
      0, 0, 0, 1, 0,
    ]);
    cm.saturate(0.02, true);
    cm.contrast(0.1, true);
    cam.postFX.addVignette(0.5, 0.5, 0.92, 0.32);
  }

  update(dt: number) {
    const cam = this.scene.cameras.main;
    const v = cam.worldView;
    const s = dt / 1000;
    // Clouds drift across the whole world and wrap around.
    const x0 = WORLD.minX - 900, x1 = WORLD.maxX + 900, y0 = WORLD.minY - 500, y1 = WORLD.maxY + 500;
    for (const c of this.clouds) {
      c.img.x += c.vx * s; c.img.y += c.vy * s;
      if (c.img.x > x1) c.img.x = x0;
      if (c.img.y > y1) c.img.y = y0;
    }
    // Motes live inside the current view.
    const t = performance.now() / 1000;
    for (const m of this.motes) {
      m.life -= s;
      if (m.life <= 0 || m.x < v.x - 40 || m.x > v.right + 40 || m.y < v.y - 40 || m.y > v.bottom + 40) {
        m.x = v.x + Math.random() * v.width; m.y = v.y + Math.random() * v.height; m.life = 6 + Math.random() * 10;
      }
      m.x += (Math.sin(t * 0.5 * m.sp + m.ph) * 6 + 4) * s;
      m.y += (Math.cos(t * 0.7 * m.sp + m.ph) * 4 - 3) * s;
      const fade = Math.min(1, m.life / 2, (16 - m.life) / 2);
      m.img.setPosition(m.x, m.y).setAlpha(Math.max(0, fade) * (0.12 + 0.28 * (0.5 + 0.5 * Math.sin(t * 3 * m.sp + m.ph))));
    }
  }
}
