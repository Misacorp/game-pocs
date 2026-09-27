/**
 * Subtle darkness overlay with a soft light following the player, for maps flagged `dark`.
 * Implemented as a screen-space RenderTexture: fill dark, then erase a radial-gradient "light"
 * hole at the player's screen position each frame.
 */
import Phaser from 'phaser';

const LIGHT_KEY = '__dw_light_radial';

function ensureLightTexture(scene: Phaser.Scene, size: number): void {
  if (scene.textures.exists(LIGHT_KEY)) return;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.7)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  scene.textures.addImage(LIGHT_KEY, canvas as unknown as HTMLImageElement);
}

export class DarkOverlay {
  private rt: Phaser.GameObjects.RenderTexture;
  private radius: number;
  private destroyed = false;

  constructor(private scene: Phaser.Scene, radius = 190, private darkness = 0.82) {
    this.radius = radius;
    ensureLightTexture(scene, radius * 2);
    this.rt = scene.add.renderTexture(0, 0, scene.scale.width, scene.scale.height)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(999);
  }

  update(cam: Phaser.Cameras.Scene2D.Camera, playerWorldX: number, playerWorldY: number): void {
    if (this.destroyed) return;
    const w = this.scene.scale.width, h = this.scene.scale.height;
    if (this.rt.width !== w || this.rt.height !== h) this.rt.resize(w, h);
    this.rt.clear();
    this.rt.fill(0x000000, this.darkness);
    const sx = (playerWorldX - cam.worldView.x) * cam.zoom;
    const sy = (playerWorldY - cam.worldView.y) * cam.zoom;
    this.rt.erase(LIGHT_KEY, sx - this.radius, sy - this.radius - 20);
  }

  destroy(): void { this.destroyed = true; this.rt.destroy(); }
}
