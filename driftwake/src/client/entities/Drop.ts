/**
 * Loot drop entities: pop out of a kill, land on a platform, bob idle, glow for rare+,
 * auto-pickup on overlap or Z, fly to the player, expire after DROP_LIFETIME_MS.
 */
import Phaser from 'phaser';
import type { ItemDef, Rarity } from '@shared/types';
import type { LootDrop } from '@shared/protocol';
import { DROP_LIFETIME_MS, RARITY_COLORS } from '@shared/constants';
import { getDropTexture } from '../gfx';
import type { WorldLighting } from '../render/lighting';

export interface DropEntry {
  dropId: string;
  sprite: Phaser.GameObjects.Image;
  glow?: Phaser.GameObjects.Arc;
  beam?: Phaser.GameObjects.Rectangle;
  landed: boolean;
  landY: number;
  bornAt: number;
  pickedUp: boolean;
  lightId?: string;
}

let dropLightSeq = 0;

export class DropManager {
  private drops: DropEntry[] = [];
  private bobT = 0;

  constructor(
    private scene: Phaser.Scene,
    /** find the platform surface y directly below (x, fromY); returns fromY+300 if none found */
    private groundYAt: (x: number, fromY: number) => number,
    private lighting?: WorldLighting | null,
  ) {}

  spawnMany(drops: LootDrop[], x: number, y: number, itemOf: (itemId: string) => ItemDef | undefined, rarityOf: (d: LootDrop) => Rarity | undefined): void {
    let i = 0;
    for (const d of drops) {
      const def = d.itemId ? itemOf(d.itemId) : undefined;
      this.spawnOne(d, x, y, def, rarityOf(d), i++);
    }
  }

  private spawnOne(drop: LootDrop, x: number, y: number, def: ItemDef | undefined, rarity: Rarity | undefined, seq: number): void {
    const key = def ? getDropTexture(this.scene, def) : getDropTexture(this.scene, 'gold');
    const sprite = this.scene.add.image(x, y - 6, key).setDepth(6);
    this.lighting?.lit(sprite, key);
    const now = performance.now();
    const entry: DropEntry = { dropId: drop.dropId, sprite, landed: false, landY: y, bornAt: now, pickedUp: false };

    if (rarity === 'rare' || rarity === 'epic' || rarity === 'legendary') {
      const color = Phaser.Display.Color.HexStringToColor(RARITY_COLORS[rarity]).color;
      const glow = this.scene.add.circle(x, y - 6, 12, color, 0.35).setDepth(5);
      this.scene.tweens.add({ targets: glow, alpha: 0.15, scale: 1.3, duration: 600, yoyo: true, repeat: -1 });
      entry.glow = glow;
      if (rarity === 'epic' || rarity === 'legendary') {
        const beam = this.scene.add.rectangle(x, y - 40, 6, 80, color, 0.25).setDepth(4);
        this.scene.tweens.add({ targets: beam, alpha: 0.08, duration: 700, yoyo: true, repeat: -1 });
        entry.beam = beam;
        entry.lightId = `drop${dropLightSeq++}`;
        this.lighting?.addLight({ id: entry.lightId, x: () => sprite.x, y: () => sprite.y, color, radius: 70, intensity: 0.8, flicker: 0.15 });
      }
    }

    const targetX = x + Phaser.Math.Between(-18, 18) * (seq % 2 === 0 ? 1 : -1) - (seq > 1 ? Phaser.Math.Between(-10, 10) : 0);
    const groundY = this.groundYAt(targetX, y);
    entry.landY = groundY - 6;
    sprite.setPosition(x, y - 10);
    this.scene.tweens.add({
      targets: sprite, x: targetX, y: y - 34, duration: 160, ease: 'Quad.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: [sprite, entry.glow, entry.beam].filter(Boolean), y: '+=' + (entry.landY - (y - 34)), duration: 260, ease: 'Bounce.Out',
          onComplete: () => {
            entry.landed = true;
            this.scene.tweens.add({ targets: sprite, y: entry.landY - 3, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          },
        });
      },
    });
    if (entry.glow) this.scene.tweens.add({ targets: entry.glow, x: targetX, duration: 420 });
    if (entry.beam) this.scene.tweens.add({ targets: entry.beam, x: targetX, duration: 420 });

    this.drops.push(entry);
  }

  /** Nearest active (not yet picked up) drop within `maxDist` of (x,y), or null. For pet auto-loot. */
  nearestTo(x: number, y: number, maxDist: number): { dropId: string; x: number; y: number } | null {
    let best: DropEntry | null = null; let bestD = maxDist;
    for (const d of this.drops) {
      if (d.pickedUp) continue;
      const dist = Math.hypot(d.sprite.x - x, d.sprite.y - y);
      if (dist < bestD) { bestD = dist; best = d; }
    }
    return best ? { dropId: best.dropId, x: best.sprite.x, y: best.sprite.y } : null;
  }

  /** Pet auto-loot reached its target: animate the drop flying to (px,py) same as a normal pickup. */
  petPickup(dropId: string, px: number, py: number): boolean {
    const d = this.drops.find((e) => e.dropId === dropId && !e.pickedUp);
    if (!d) return false;
    d.pickedUp = true;
    this.flyToAndRemove(d, px, py);
    return true;
  }

  /**
   * Called every frame. Returns dropIds that should be dispatched as picked up this frame.
   */
  update(dtMs: number, playerX: number, playerY: number, zPressed: boolean): string[] {
    const now = performance.now();
    const toPickup: string[] = [];
    for (const d of this.drops) {
      if (d.pickedUp) continue;
      if (now - d.bornAt > DROP_LIFETIME_MS) { this.expire(d); continue; }
      const dx = d.sprite.x - playerX, dy = d.sprite.y - playerY;
      const dist = Math.hypot(dx, dy);
      if (dist < 22 || (dist < 46 && zPressed)) {
        d.pickedUp = true;
        toPickup.push(d.dropId);
        this.flyToAndRemove(d, playerX, playerY);
      }
    }
    this.drops = this.drops.filter((d) => d.sprite.active || d.pickedUp === false);
    return toPickup;
  }

  private flyToAndRemove(d: DropEntry, px: number, py: number): void {
    const targets = [d.sprite, d.glow, d.beam].filter(Boolean) as Phaser.GameObjects.GameObject[];
    if (d.lightId) this.lighting?.removeLight(d.lightId);
    this.scene.tweens.add({
      targets, x: px, y: py - 20, alpha: 0, scale: 0.4, duration: 220, ease: 'Quad.easeIn',
      onComplete: () => { d.sprite.destroy(); d.glow?.destroy(); d.beam?.destroy(); },
    });
    this.drops = this.drops.filter((e) => e !== d);
  }

  private expire(d: DropEntry): void {
    const targets = [d.sprite, d.glow, d.beam].filter(Boolean) as Phaser.GameObjects.GameObject[];
    if (d.lightId) this.lighting?.removeLight(d.lightId);
    this.scene.tweens.add({ targets, alpha: 0, duration: 400, onComplete: () => { d.sprite.destroy(); d.glow?.destroy(); d.beam?.destroy(); } });
    this.drops = this.drops.filter((e) => e !== d);
  }

  destroy(): void {
    for (const d of this.drops) { d.sprite.destroy(); d.glow?.destroy(); d.beam?.destroy(); if (d.lightId) this.lighting?.removeLight(d.lightId); }
    this.drops = [];
  }
}
