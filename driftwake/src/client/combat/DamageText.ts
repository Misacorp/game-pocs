/**
 * Pooled Maplestory-style floating combat text.
 *  - orange: normal damage dealt to monsters
 *  - red-gold, bigger: crit damage dealt to monsters
 *  - purple: damage taken by the player
 *  - green: healing
 *  - white/gold: "+N EXP"
 */
import Phaser from 'phaser';
import { ensurePixelFontLoading, pixelFontFamily } from '../render/pixelFont';

export type DamageTextKind = 'normal' | 'crit' | 'playerHurt' | 'heal' | 'xp' | 'info';

const STYLE: Record<DamageTextKind, { color: string; stroke: string; size: number }> = {
  normal: { color: '#ffb347', stroke: '#5a2d00', size: 16 },
  crit: { color: '#ffd23f', stroke: '#7a0000', size: 24 },
  playerHurt: { color: '#c77dff', stroke: '#2b0033', size: 16 },
  heal: { color: '#7dffb3', stroke: '#003b1f', size: 15 },
  xp: { color: '#ffffff', stroke: '#333333', size: 13 },
  info: { color: '#f0e6ff', stroke: '#2b2440', size: 14 },
};

interface Pooled { text: Phaser.GameObjects.Text; inUse: boolean }

export class DamageTextPool {
  private pool: Pooled[] = [];
  /** Small per-target stack offset so repeated hits don't overlap exactly. */
  private stackOffsets = new Map<string, number>();

  constructor(private scene: Phaser.Scene) { ensurePixelFontLoading(); }

  private acquire(): Phaser.GameObjects.Text {
    let p = this.pool.find((e) => !e.inUse);
    if (!p) {
      const text = this.scene.add.text(0, 0, '', { fontFamily: pixelFontFamily(), fontStyle: 'bold' }).setOrigin(0.5).setDepth(120);
      text.setResolution(3);
      p = { text, inUse: false };
      this.pool.push(p);
    }
    p.inUse = true;
    p.text.setFontFamily(pixelFontFamily());
    p.text.setVisible(true).setActive(true);
    return p.text;
  }

  private release(text: Phaser.GameObjects.Text) {
    const p = this.pool.find((e) => e.text === text);
    if (p) p.inUse = false;
    text.setVisible(false).setActive(false);
  }

  spawn(x: number, y: number, value: string | number, kind: DamageTextKind, targetKey?: string): void {
    const style = STYLE[kind];
    const text = this.acquire();
    let stack = 0;
    if (targetKey) {
      stack = this.stackOffsets.get(targetKey) ?? 0;
      this.stackOffsets.set(targetKey, stack + 1);
      this.scene.time.delayedCall(400, () => this.stackOffsets.set(targetKey, Math.max(0, (this.stackOffsets.get(targetKey) ?? 1) - 1)));
    }
    const jitterX = (Math.random() - 0.5) * 14;
    text.setText(String(value))
      .setPosition(x + jitterX, y - 12 - stack * 4)
      .setFontSize(style.size)
      .setColor(style.color)
      .setStroke(style.stroke, 4)
      .setScale(kind === 'crit' ? 0.6 : 1)
      .setAlpha(1)
      .setDepth(120);
    if (kind === 'crit') {
      this.scene.tweens.add({ targets: text, scale: 1.15, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
    }
    this.scene.tweens.add({
      targets: text,
      y: text.y - (kind === 'xp' ? 26 : 34),
      alpha: 0,
      duration: kind === 'xp' ? 900 : 700,
      delay: kind === 'crit' ? 120 : 0,
      ease: 'Quad.easeOut',
      onComplete: () => this.release(text),
    });
  }

  destroy(): void {
    for (const p of this.pool) p.text.destroy();
    this.pool = [];
  }
}
