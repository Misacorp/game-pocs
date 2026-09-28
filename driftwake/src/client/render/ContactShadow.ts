/**
 * Soft blurred-ellipse contact shadow anchored under a character/monster/NPC. Reuses the
 * `px_shadow` texture already registered globally by gfx/base.ts (via BootScene) — cheap to draw,
 * enabled on every quality tier.
 */
import Phaser from 'phaser';

export class ContactShadow {
  private img: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, width: number, depth: number) {
    this.img = scene.add.image(0, 0, 'px_shadow').setDepth(depth).setAlpha(0.4);
    this.img.displayWidth = width;
    this.img.displayHeight = width * (12 / 28);
  }

  /** @param x sprite x (world) @param groundY the ground surface y directly below @param feetY the sprite's own (feet) y — used to shrink/fade the shadow the higher above ground it is. */
  update(x: number, groundY: number, feetY: number): void {
    const above = Math.max(0, groundY - feetY);
    const shrink = Phaser.Math.Clamp(1 - above / 150, 0.3, 1);
    this.img.setPosition(x, groundY - 1).setScale(shrink, shrink * 0.7).setAlpha(0.4 * shrink);
  }

  setVisible(v: boolean): void { this.img.setVisible(v); }
  destroy(): void { this.img.destroy(); }
}
