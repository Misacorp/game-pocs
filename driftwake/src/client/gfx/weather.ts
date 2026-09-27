/**
 * Screen-space weather particle systems per WeatherId.
 *
 * Positioned every update() from the camera's actual world-space view (via cam.getWorldPoint)
 * rather than scrollFactor(0) + fixed screen coordinates, since Phaser's camera zoom pivots
 * around the camera's origin (default center) — a scrollFactor(0) object at a fixed x/y is not
 * guaranteed to land at that screen position once zoom != 1. Recomputing each frame keeps this
 * correct for whatever origin/zoom/scroll the engine's camera ends up using.
 */
import Phaser from 'phaser';
import type { WeatherId } from '@shared/types';
import { makeCanvas, ctx2d, rect, circle, poly, registerCanvasTexture } from './canvasKit';
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
  // World-space spread equal to a full screen's worth at the camera's current zoom, so the
  // emitter (positioned at the camera's world top-left each frame) covers the whole viewport.
  const zoom = scene.cameras.main.zoom || 1;
  const vw = scene.scale.width / zoom, vh = scene.scale.height / zoom;
  const emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  let lightning: Phaser.GameObjects.Rectangle | undefined;
  let lightningTimer = 1500;

  const add = (texture: string, config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig): Phaser.GameObjects.Particles.ParticleEmitter => {
    const e = scene.add.particles(0, 0, texture, config).setDepth(200);
    emitters.push(e);
    return e;
  };

  switch (w) {
    case 'rain': case 'storm':
      add('wx_drop', { x: { min: -20, max: vw + 20 }, y: -20, lifespan: 900, speedY: { min: 500, max: 700 }, speedX: -60, scaleY: { min: 0.8, max: 1.3 }, alpha: 0.5, quantity: 3, frequency: 20, tint: 0xaad4ff });
      if (w === 'storm') lightning = scene.add.rectangle(0, 0, 10, 10, 0xffffff, 0).setOrigin(0).setDepth(210);
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
    update(cam: Phaser.Cameras.Scene2D.Camera) {
      const tl = cam.getWorldPoint(0, 0);
      for (const e of emitters) e.setPosition(tl.x, tl.y);
      if (lightning) {
        const br = cam.getWorldPoint(cam.width, cam.height);
        lightning.setPosition(tl.x, tl.y).setDisplaySize(br.x - tl.x, br.y - tl.y);
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
