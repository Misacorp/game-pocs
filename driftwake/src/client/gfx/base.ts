/**
 * Shared small textures used across the engine (particles, soft glow, ground shadow).
 */
import Phaser from 'phaser';
import { makeCanvas, ctx2d, circle, ellipse, registerCanvasTexture } from './canvasKit';

export function registerBaseTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('px_circle')) return;
  { const c = makeCanvas(8, 8); circle(ctx2d(c), 4, 4, 4, '#ffffff'); registerCanvasTexture(scene, 'px_circle', c); }
  { const c = makeCanvas(2, 2); ctx2d(c).fillRect(0, 0, 2, 2); registerCanvasTexture(scene, 'px_dot', c); }
  {
    const c = makeCanvas(32, 32); const ctx = ctx2d(c);
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32);
    registerCanvasTexture(scene, 'px_glow', c);
  }
  {
    const c = makeCanvas(28, 12); const ctx = ctx2d(c);
    ellipse(ctx, 14, 6, 13, 5, 'rgba(0,0,0,0.35)');
    registerCanvasTexture(scene, 'px_shadow', c);
  }
}
