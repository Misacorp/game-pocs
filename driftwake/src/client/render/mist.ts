/**
 * Drifting mist/fog bands for the dark, enclosed themes (caves, storms) — a soft noise texture
 * (Canvas2D-generated once, animated purely via tilePosition, same trick as gfx/parallax.ts's
 * haze layer) scrolling slowly across the mid-screen band. Cheap: one extra TileSprite draw.
 */
import Phaser from 'phaser';
import type { ThemeId } from '@shared/types';
import { makeCanvas, ctx2d, withAlpha, seedRandom } from '../gfx/canvasKit';

const MIST_THEMES: Partial<Record<ThemeId, { color: string; density: number }>> = {
  grotto: { color: '#3e6e63', density: 0.16 },
  stormspire: { color: '#8a8fa8', density: 0.14 },
};

function mistCanvas(color: string, density: number): HTMLCanvasElement {
  const w = 512, h = 160;
  const c = makeCanvas(w, h);
  const ctx = ctx2d(c);
  const rnd = seedRandom(77);
  for (let i = 0; i < 10; i++) {
    const cx = rnd() * w, cy = rnd() * h, r = 60 + rnd() * 90;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, withAlpha(color, density));
    g.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  return c;
}

export interface MistLayer { update(cam: Phaser.Cameras.Scene2D.Camera, dt: number): void; destroy(): void }

export function createMist(scene: Phaser.Scene, theme: ThemeId): MistLayer | null {
  const cfg = MIST_THEMES[theme];
  if (!cfg) return null;
  const key = `dw_mist_${theme}`;
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, mistCanvas(cfg.color, cfg.density));
  const tile = scene.add.tileSprite(0, 0, 10, 10, key).setOrigin(0, 0).setDepth(30).setAlpha(0.8).setBlendMode(Phaser.BlendModes.SCREEN);
  let t = 0;
  return {
    update(cam, dt) {
      t += dt / 1000;
      const tl = cam.getWorldPoint(0, 0);
      const br = cam.getWorldPoint(cam.width, cam.height);
      const w = br.x - tl.x, h = br.y - tl.y;
      tile.setPosition(tl.x, tl.y + h * 0.35).setSize(w, h * 0.5);
      tile.tilePositionX = t * 6 + cam.scrollX * 0.05;
      tile.tilePositionY = Math.sin(t * 0.1) * 6;
    },
    destroy() { tile.destroy(); },
  };
}
