/**
 * NPC entities: idle sprite, name tag (+ title), overhead quest marker, occasional speech bubble barks,
 * clickable to open dialogue.
 */
import Phaser from 'phaser';
import type { NpcDef } from '@shared/types';
import { getNpcSprite } from '../gfx';
import { bus } from '../events';
import { makeCrispLabel } from './spriteUtil';
import type { WorldLighting } from '../render/lighting';
import { ContactShadow } from '../render/ContactShadow';

/** Quest marker colors: lantern (!) for available, tide (?) for turn-in, a dim tide-blue for "in progress". */
const MARKER_COLOR: Record<'!' | '?' | '…', string> = { '!': '#ffb347', '?': '#5fe3c6', '…': '#9fd4ff' };

export class NpcEntity {
  /** Global (map-wide) bark rate limit so at most one NPC talks at a time, ~12s apart. */
  private static nextGlobalBarkAt = 0;
  private static activeBarker: NpcEntity | null = null;

  readonly id: string;
  sprite: Phaser.GameObjects.Sprite;
  nameTag: Phaser.GameObjects.Text;
  titleTag?: Phaser.GameObjects.Text;
  marker: Phaser.GameObjects.Text;
  barkText?: Phaser.GameObjects.Text;
  barkBg?: Phaser.GameObjects.Rectangle;
  private barkExpiresAt = 0;
  private curMarker: '!' | '?' | '…' | null = null;
  private near = false;
  private shadow: ContactShadow;
  private lightId?: string;

  constructor(private scene: Phaser.Scene, public def: NpcDef, public x: number, public y: number, flip = false, private lighting?: WorldLighting | null) {
    this.id = def.id;
    const info = getNpcSprite(scene, def);
    this.sprite = scene.add.sprite(x, y, info.key, 0).setOrigin(0.5, 1).setDepth(9).setFlipX(flip);
    if (info.anims.idle) this.sprite.play(info.anims.idle);
    this.sprite.setInteractive({ useHandCursor: true });
    this.sprite.on('pointerdown', () => bus.emit('ui:dialogue', { npcId: this.id }));
    lighting?.lit(this.sprite, info.key);
    this.shadow = new ContactShadow(scene, info.bodyWidth * 1.4, 8);
    this.shadow.update(x, y, y);
    if (lighting) {
      // A small personal fill light so NPCs always read clearly against the scene's ambient,
      // regardless of whether they happen to be standing near a decor light.
      this.lightId = `npc_${this.id}_${x}_${y}`;
      lighting.addLight({ id: this.lightId, x: () => x, y: () => y - info.frameHeight * 0.6, color: 0xfff0d8, radius: 95, intensity: 0.68 });
    }

    // Stack (top -> bottom, closest to the head last): marker, title (near-only), name.
    const nameY = y - info.frameHeight - 4;
    const titleY = nameY - 9;
    this.nameTag = makeCrispLabel(scene, x, nameY, def.name).setOrigin(0.5, 1).setDepth(11);
    if (def.title) {
      this.titleTag = makeCrispLabel(scene, x, titleY, def.title, { fontSize: '7px', color: '#c9bfa3' })
        .setOrigin(0.5, 1).setDepth(11).setAlpha(0.85).setVisible(false);
    }

    this.marker = makeCrispLabel(scene, x, (def.title ? titleY : nameY) - 11, '', { fontSize: '13px', color: MARKER_COLOR['!'], strokeThickness: 3 })
      .setOrigin(0.5, 1).setDepth(11);
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
    this.marker.setColor(m ? MARKER_COLOR[m] : MARKER_COLOR['!']);
    if (m) this.scene.tweens.add({ targets: this.marker, y: this.marker.y - 4, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    else this.scene.tweens.killTweensOf(this.marker);
  }

  private clearBark(): void {
    if (this.barkText) { this.barkText.destroy(); this.barkText = undefined; }
    if (this.barkBg) { this.barkBg.destroy(); this.barkBg = undefined; }
    this.barkExpiresAt = 0;
    if (NpcEntity.activeBarker === this) NpcEntity.activeBarker = null;
  }

  update(now: number): void {
    if (this.barkExpiresAt && now > this.barkExpiresAt) this.fadeOutBark();
    if (!this.def.barks || this.def.barks.length === 0 || this.barkText) return;
    if (!this.near || NpcEntity.activeBarker || now < NpcEntity.nextGlobalBarkAt) return;

    const line = Phaser.Utils.Array.GetRandom(this.def.barks);
    const y = (this.titleTag ?? this.nameTag).y - 9;
    // Styled as a small whale-hide plate rather than a generic pale speech bubble.
    this.barkText = makeCrispLabel(this.scene, this.x, y, line, { color: '#f1e6cf', strokeThickness: 0, wordWrap: { width: 140 } })
      .setOrigin(0.5, 1).setDepth(12).setAlpha(0);
    const b = this.barkText.getBounds();
    this.barkBg = this.scene.add.rectangle(this.x, y - b.height / 2, b.width + 10, b.height + 6, 0x16242b, 0.9)
      .setStrokeStyle(1, 0xf1e6cf, 0.25).setDepth(11.5).setOrigin(0.5, 0.5).setAlpha(0);
    this.scene.tweens.add({ targets: this.barkText, alpha: { from: 0, to: 1 }, duration: 180 });
    this.scene.tweens.add({ targets: this.barkBg, alpha: { from: 0, to: 0.9 }, duration: 180 });

    NpcEntity.activeBarker = this;
    this.barkExpiresAt = now + 3000;
    NpcEntity.nextGlobalBarkAt = now + 12000;
  }

  private fadeOutBark(): void {
    const targets = [this.barkText, this.barkBg].filter(Boolean) as Phaser.GameObjects.GameObject[];
    this.barkExpiresAt = 0;
    if (NpcEntity.activeBarker === this) NpcEntity.activeBarker = null;
    if (targets.length === 0) return;
    this.scene.tweens.add({
      targets, alpha: 0, duration: 220,
      onComplete: () => { this.barkText?.destroy(); this.barkBg?.destroy(); this.barkText = undefined; this.barkBg = undefined; },
    });
  }

  destroy(): void {
    this.sprite.destroy(); this.nameTag.destroy(); this.titleTag?.destroy(); this.marker.destroy();
    this.shadow.destroy();
    if (this.lightId) this.lighting?.removeLight(this.lightId);
    this.clearBark();
  }
}
