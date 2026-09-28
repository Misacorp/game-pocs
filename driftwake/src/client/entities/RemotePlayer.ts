/**
 * Non-colliding, interpolated render of another player on the same map (multiplayer presence).
 */
import Phaser from 'phaser';
import type { JobId } from '@shared/types';
import type { RemotePlayer, PresenceUpdate } from '@shared/protocol';
import { getCharacterSprite, type SpriteInfo } from '../gfx';
import { makeCrispLabel, playAnim, applySpriteScale, visualTop } from './spriteUtil';

export class RemotePlayerEntity {
  sprite: Phaser.GameObjects.Sprite;
  nameTag: Phaser.GameObjects.Text;
  private info: SpriteInfo;
  private targetX: number;
  private targetY: number;
  private destroyed = false;

  constructor(scene: Phaser.Scene, data: RemotePlayer) {
    this.info = getCharacterSprite(scene, { classId: data.classId, jobId: data.jobId as JobId, appearance: data.appearance });
    this.sprite = scene.add.sprite(data.x, data.y, this.info.key, 0).setOrigin(0.5, 1).setDepth(14).setFlipX(data.facing === -1).setAlpha(0.92);
    applySpriteScale(this.sprite, this.info);
    this.nameTag = makeCrispLabel(scene, data.x, data.y - visualTop(this.info) - 5, data.title ? `${data.name} <${data.title}>` : data.name, {
      color: '#9fd4ff',
    }).setOrigin(0.5, 1).setDepth(14.1);
    this.targetX = data.x; this.targetY = data.y;
    playAnim(this.sprite, this.info, 'idle');
  }

  applyMove(p: PresenceUpdate): void {
    if (this.destroyed || !this.sprite.scene) return;
    this.targetX = p.x; this.targetY = p.y;
    this.sprite.setFlipX(p.facing === -1);
    if (this.sprite.anims) playAnim(this.sprite, this.info, p.anim || 'idle');
  }

  update(dt: number): void {
    if (this.destroyed || !this.sprite.scene) return;
    const t = Math.min(1, dt * 12);
    this.sprite.x = Phaser.Math.Linear(this.sprite.x, this.targetX, t);
    this.sprite.y = Phaser.Math.Linear(this.sprite.y, this.targetY, t);
    this.nameTag.setPosition(this.sprite.x, this.sprite.y - visualTop(this.info) - 6);
  }

  destroy(): void {
    this.destroyed = true;
    this.sprite.destroy();
    this.nameTag.destroy();
  }
}
