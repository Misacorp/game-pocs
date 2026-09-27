/**
 * NPC entities: idle sprite, name tag (+ title), overhead quest marker, occasional speech bubble barks,
 * clickable to open dialogue.
 */
import Phaser from 'phaser';
import type { NpcDef } from '@shared/types';
import { getNpcSprite } from '../gfx';
import { bus } from '../events';

export class NpcEntity {
  readonly id: string;
  sprite: Phaser.GameObjects.Sprite;
  nameTag: Phaser.GameObjects.Text;
  marker: Phaser.GameObjects.Text;
  barkText?: Phaser.GameObjects.Text;
  barkBg?: Phaser.GameObjects.Rectangle;
  private nextBarkAt: number;
  private barkExpiresAt = 0;
  private curMarker: '!' | '?' | '…' | null = null;

  constructor(private scene: Phaser.Scene, public def: NpcDef, public x: number, public y: number, flip = false) {
    this.id = def.id;
    const info = getNpcSprite(scene, def);
    this.sprite = scene.add.sprite(x, y, info.key, 0).setOrigin(0.5, 1).setDepth(9).setFlipX(flip);
    if (info.anims.idle) this.sprite.play(info.anims.idle);
    this.sprite.setInteractive({ useHandCursor: true });
    this.sprite.on('pointerdown', () => bus.emit('ui:dialogue', { npcId: this.id }));

    const label = def.title ? `${def.name}\n${def.title}` : def.name;
    this.nameTag = scene.add.text(x, y - info.frameHeight - 14, label, {
      fontFamily: 'monospace', fontSize: '11px', color: '#ffe9b8', align: 'center', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(11);

    this.marker = scene.add.text(x, y - info.frameHeight - (def.title ? 28 : 18), '', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffe066', stroke: '#5a3d00', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(11);

    this.nextBarkAt = performance.now() + Phaser.Math.Between(4000, 12000);
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
      const y = this.nameTag.y - 14;
      this.barkText = this.scene.add.text(this.x, y, line, {
        fontFamily: 'monospace', fontSize: '11px', color: '#222', align: 'center', wordWrap: { width: 140 },
      }).setOrigin(0.5, 1).setDepth(12);
      const b = this.barkText.getBounds();
      this.barkBg = this.scene.add.rectangle(this.x, y - b.height / 2, b.width + 12, b.height + 8, 0xfff6e0, 0.92)
        .setStrokeStyle(1, 0x333333).setDepth(11.5).setOrigin(0.5, 0.5);
      this.barkExpiresAt = now + 3200;
      this.nextBarkAt = now + Phaser.Math.Between(8000, 18000);
    }
  }

  destroy(): void {
    this.sprite.destroy(); this.nameTag.destroy(); this.marker.destroy();
    this.barkText?.destroy(); this.barkBg?.destroy();
  }
}
