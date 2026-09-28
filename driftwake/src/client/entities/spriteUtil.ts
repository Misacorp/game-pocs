/**
 * Small shared helpers for Arcade sprites built from gfx SpriteInfo sheets.
 */
import Phaser from 'phaser';
import type { SpriteInfo } from '../gfx';
import { ensurePixelFontLoading, pixelFontFamily } from '../render/pixelFont';

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

/**
 * Small, crisp world-space label. Font sizes here are in WORLD px — the camera runs at 2x zoom,
 * so keep these small (7-9px) and let `resolution` keep the glyphs sharp once magnified, instead
 * of sizing for the final on-screen look (which doubles everything and blurs it).
 */
/** World-space labels (NPC names/titles, quest markers, portal labels, speech-bubble barks, remote
 *  player names, pet emotes...) all render in the brand's pixel font once it's loaded, falling
 *  back to monospace gracefully until then — see render/pixelFont.ts. */
export function makeCrispLabel(
  scene: Phaser.Scene, x: number, y: number, text: string,
  style: Phaser.Types.GameObjects.Text.TextStyle = {}, resolution = 3,
): Phaser.GameObjects.Text {
  ensurePixelFontLoading();
  const t = scene.add.text(x, y, text, {
    fontFamily: pixelFontFamily(), fontSize: '8px', color: '#f1e6cf', align: 'center', stroke: '#000', strokeThickness: 2,
    ...style,
  });
  t.setResolution(resolution);
  return t;
}
