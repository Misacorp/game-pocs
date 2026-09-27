/**
 * Small shared helpers for Arcade sprites built from gfx SpriteInfo sheets.
 */
import Phaser from 'phaser';
import type { SpriteInfo } from '../gfx';

/** Size + offset the physics body so it's centered horizontally and flush with the bottom of the frame
 *  (sprites use origin 0.5,1 so x,y is the "feet" position). */
export function applyBodyBottomAligned(sprite: Phaser.Physics.Arcade.Sprite, info: SpriteInfo): void {
  const body = sprite.body as Phaser.Physics.Arcade.Body;
  body.setSize(info.bodyWidth, info.bodyHeight);
  body.setOffset((info.frameWidth - info.bodyWidth) / 2, info.frameHeight - info.bodyHeight);
}

/** Play an anim by logical name if it exists on this sprite's sheet; no-op + warn-free otherwise. */
export function playAnim(sprite: Phaser.GameObjects.Sprite, info: SpriteInfo, name: string, opts?: { ignoreIfPlaying?: boolean }): void {
  const key = info.anims[name];
  if (!key) return;
  if (opts?.ignoreIfPlaying !== false && sprite.anims?.currentAnim?.key === key) return;
  sprite.play(key);
}

/** Simple 0..1 flicker helper for i-frames: call each frame, apply to sprite.setAlpha(). */
export function invulnAlpha(now: number, untilMs: number, periodMs = 90): number {
  if (now >= untilMs) return 1;
  return Math.floor((untilMs - now) / periodMs) % 2 === 0 ? 0.35 : 0.9;
}
