/**
 * NPC entities: idle sprite, name tag (+ title), overhead quest marker, occasional speech bubble barks,
 * clickable to open dialogue.
 */
import Phaser from 'phaser';
import type { NpcDef } from '@shared/types';
import { getNpcSprite } from '../gfx';
import { bus } from '../events';
import { makeCrispLabel } from './spriteUtil';

export class NpcEntity {
  readonly id: string;
  sprite: Phaser.GameObjects.Sprite;
  nameTag: Phaser.GameObjects.Text;
  titleTag?: Phaser.GameObjects.Text;
  marker: Phaser.GameObjects.Text;
  barkText?: Phaser.GameObjects.Text;
  barkBg?: Phaser.GameObjects.Rectangle;
  private nextBarkAt: number;
  private barkExpiresAt = 0;
  private curMarker: '!' | '?' | '…' | null = null;
  private near = false;

  constructor(private scene: Phaser.Scene, public def: NpcDef, public x: number, public y: number, flip = false) {
    this.id = def.id;
    const info = getNpcSprite(scene, def);
    this.sprite = scene.add.sprite(x, y, info.key, 0).setOrigin(0.5, 1).setDepth(9).setFlipX(flip);
    if (info.anims.idle) this.sprite.play(info.anims.idle);
    this.sprite.setInteractive({ useHandCursor: true });
    this.sprite.on('pointerdown', () => bus.emit('ui:dialogue', { npcId: this.id }));

    // Stack (top -> bottom, closest to the head last): marker, title (near-only), name.
    const nameY = y - info.frameHeight - 4;
    const titleY = nameY - 9;
    this.nameTag = makeCrispLabel(scene, x, nameY, def.name).setOrigin(0.5, 1).setDepth(11);
    if (def.title) {
      this.titleTag = makeCrispLabel(scene, x, titleY, def.title, { fontSize: '7px', color: '#c9bfa3' })
        .setOrigin(0.5, 1).setDepth(11).setAlpha(0.85).setVisible(false);
    }

    this.marker = makeCrispLabel(scene, x, (def.title ? titleY : nameY) - 11, '', { fontSize: '13px', color: '#ffe066', strokeThickness: 3 })
      .setOrigin(0.5, 1).setDepth(11);

    this.nextBarkAt = performance.now() + Phaser.Math.Between(4000, 12000);
  }

  /** Toggle the (dimmer) title line — only shown once the player is close, to reduce clutter. */
  setNear(near: boolean): void {
    if (near === this.near) return;
    this.near = near;
    this.titleTag?.setVisible(near);
  }

  setMarker(m: '!' | '?' | '…' | null): void {
    if (m === this.curMarker) return;
    this.curMarker = m;
    this.marker.setText(m ?? '');
    this.marker.setColor(m === '?' ? '#7dffb3' : m === '…' ? '#9fd4ff' : '#ffe066');
    if (m) this.scene.tweens.add({ targets: this.marker, y: this.marker.y - 4, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    else this.scene.tweens.killTweensOf(this.marker);
  }

  update(now: number): void {
    if (!this.def.barks || this.def.barks.length === 0) return;
    if (this.barkExpiresAt && now > this.barkExpiresAt) {
      this.barkText?.destroy(); this.barkBg?.destroy();
      this.barkText = undefined; this.barkBg = undefined;
      this.barkExpiresAt = 0;
    }
    if (!this.barkText && now > this.nextBarkAt) {
      const line = Phaser.Utils.Array.GetRandom(this.def.barks);
      const y = (this.titleTag ?? this.nameTag).y - 10;
      this.barkText = makeCrispLabel(this.scene, this.x, y, line, { color: '#222', strokeThickness: 0, wordWrap: { width: 140 } })
        .setOrigin(0.5, 1).setDepth(12);
      const b = this.barkText.getBounds();
      this.barkBg = this.scene.add.rectangle(this.x, y - b.height / 2, b.width + 12, b.height + 8, 0xfff6e0, 0.92)
        .setStrokeStyle(1, 0x333333).setDepth(11.5).setOrigin(0.5, 0.5);
      this.barkExpiresAt = now + 3200;
      this.nextBarkAt = now + Phaser.Math.Between(8000, 18000);
    }
  }

  destroy(): void {
    this.sprite.destroy(); this.nameTag.destroy(); this.titleTag?.destroy(); this.marker.destroy();
    this.barkText?.destroy(); this.barkBg?.destroy();
  }
}
