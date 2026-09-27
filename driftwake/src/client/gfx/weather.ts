/**
 * Screen-space weather particle systems per WeatherId.
 */
import Phaser from 'phaser';
import type { WeatherId } from '@shared/types';
import { makeCanvas, ctx2d, rect, circle, ellipse, poly, registerCanvasTexture, hexNum } from './canvasKit';
import type { Weather } from './spec';

function ensureTex(scene: Phaser.Scene): void {
  if (scene.textures.exists('wx_drop')) return;
  { const c = makeCanvas(3, 12); rect(ctx2d(c), 0, 0, 3, 12, '#ffffff'); registerCanvasTexture(scene, 'wx_drop', c); }
  { const c = makeCanvas(6, 6); circle(ctx2d(c), 3, 3, 3, '#ffffff'); registerCanvasTexture(scene, 'wx_dot', c); }
  { const c = makeCanvas(10, 8); poly(ctx2d(c), [[5, 0], [10, 4], [5, 8], [0, 4]], '#ffffff'); registerCanvasTexture(scene, 'wx_leaf', c); }
  { const c = makeCanvas(4, 4); circle(ctx2d(c), 2, 2, 2, '#ffffff'); registerCanvasTexture(scene, 'wx_spore', c); }
  { const c = makeCanvas(16, 2); rect(ctx2d(c), 0, 0, 16, 2, '#ffffff'); registerCanvasTexture(scene, 'wx_streak', c); }
}

export function createWeather(scene: Phaser.Scene, w: WeatherId): Weather {
  if (w === 'none') return { update() {}, destroy() {} };
  ensureTex(scene);
  const vw = scene.scale.width, vh = scene.scale.height;
  const emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  let lightning: Phaser.GameObjects.Rectangle | undefined;
  let lightningTimer = 1500;

  const add = (texture: string, config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig): Phaser.GameObjects.Particles.ParticleEmitter => {
    const e = scene.add.particles(0, 0, texture, config).setScrollFactor(0).setDepth(200);
    emitters.push(e);
    return e;
  };

  switch (w) {
    case 'rain': case 'storm':
      add('wx_drop', { x: { min: -20, max: vw + 20 }, y: -20, lifespan: 900, speedY: { min: 500, max: 700 }, speedX: -60, scaleY: { min: 0.8, max: 1.3 }, alpha: 0.5, quantity: 3, frequency: 20, tint: 0xaad4ff });
      if (w === 'storm') lightning = scene.add.rectangle(0, 0, vw, vh, 0xffffff, 0).setOrigin(0).setScrollFactor(0).setDepth(210);
      break;
    case 'snow':
      add('wx_dot', { x: { min: 0, max: vw }, y: -10, lifespan: 6000, speedY: { min: 30, max: 70 }, speedX: { min: -20, max: 20 }, scale: { min: 0.4, max: 1 }, alpha: { min: 0.5, max: 0.9 }, quantity: 1, frequency: 90, tint: 0xffffff });
      break;
    case 'embers':
      add('wx_dot', { x: { min: 0, max: vw }, y: vh + 10, lifespan: 4000, speedY: { min: -60, max: -20 }, speedX: { min: -15, max: 15 }, scale: { start: 0.7, end: 0 }, alpha: { start: 0.9, end: 0 }, quantity: 1, frequency: 120, tint: [0xff8a3a, 0xffe07a] });
      break;
    case 'bubbles':
      add('wx_dot', { x: { min: 0, max: vw }, y: vh + 10, lifespan: 5000, speedY: { min: -50, max: -15 }, speedX: { min: -10, max: 10 }, scale: { min: 0.4, max: 1.1 }, alpha: { min: 0.3, max: 0.7 }, quantity: 1, frequency: 140, tint: 0x8fd8ff });
      break;
    case 'leaves':
      add('wx_leaf', { x: { min: -20, max: vw + 20 }, y: -10, lifespan: 5000, speedY: { min: 30, max: 60 }, speedX: { min: -50, max: -10 }, rotate: { min: 0, max: 360 }, scale: { min: 0.6, max: 1 }, alpha: 0.85, quantity: 1, frequency: 160, tint: [0x8fae4a, 0xc98a4a] });
      break;
    case 'fireflies':
      add('wx_dot', { x: { min: 0, max: vw }, y: { min: 0, max: vh }, lifespan: 3500, speedY: { min: -12, max: 12 }, speedX: { min: -12, max: 12 }, scale: { min: 0.3, max: 0.8 }, alpha: { start: 0, end: 0.9, ease: 'Sine.easeInOut' }, quantity: 1, frequency: 200, tint: [0x5adfff, 0xdfffb0], blendMode: Phaser.BlendModes.ADD });
      break;
    case 'spores':
      add('wx_spore', { x: { min: 0, max: vw }, y: vh + 5, lifespan: 6000, speedY: { min: -30, max: -10 }, speedX: { min: -18, max: 18 }, scale: { min: 0.3, max: 0.9 }, alpha: { min: 0.3, max: 0.7 }, quantity: 1, frequency: 150, tint: 0xb25be0 });
      break;
    case 'wind':
      add('wx_streak', { x: -20, y: { min: 0, max: vh }, lifespan: 700, speedX: { min: 300, max: 500 }, speedY: 0, scaleX: { min: 0.8, max: 1.6 }, alpha: { start: 0.5, end: 0 }, quantity: 1, frequency: 90, tint: 0xffffff });
      break;
  }

  return {
    update() {
      if (lightning) {
        lightningTimer -= 16;
        if (lightningTimer <= 0) {
          lightningTimer = 2500 + Math.random() * 4000;
          lightning.setAlpha(0.35);
          scene.tweens.add({ targets: lightning, alpha: 0, duration: 200 });
        }
      }
    },
    destroy() {
      emitters.forEach((e) => e.destroy());
      lightning?.destroy();
    },
  };
}
