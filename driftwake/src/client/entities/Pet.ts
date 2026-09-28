/**
 * Companion pet entity: floats/hops behind the player with a little lag, idles + bobs when not
 * moving, faces the direction it's travelling, occasionally emotes, and (when a loot drop lands
 * within its lootRadius of the player) flies out to it and reports back so WorldScene can dispatch
 * the normal 'pickup' action — the server stays authoritative; the pet never grants loot itself.
 */
import Phaser from 'phaser';
import type { ItemDef } from '@shared/types';
import { getPetSprite } from '../gfx';
import { playAnim, makeCrispLabel } from './spriteUtil';
import type { WorldLighting } from '../render/lighting';

const FOLLOW_LERP = 3.2; // per second, exponential smoothing toward the anchor point
const CHASE_SPEED = 165; // px/s while flying to a drop
const REACH_DIST = 12;
const EMOTE_MIN_MS = 9000, EMOTE_MAX_MS = 16000;
const EMOTES = ['♥', '♪', '✦'];

export class Pet {
  sprite: Phaser.GameObjects.Sprite;
  readonly itemId: string;
  readonly lootRadius: number;
  facing: 1 | -1 = 1;
  /** Drop id this pet is currently flying toward, if any. */
  chasingDropId: string | null = null;
  private chaseTarget = { x: 0, y: 0 };
  private bobT = Math.random() * 10;
  private lastBob = 0;
  private nextEmoteAt = performance.now() + EMOTE_MIN_MS + Math.random() * EMOTE_MAX_MS;
  private readonly info: ReturnType<typeof getPetSprite>;

  constructor(private scene: Phaser.Scene, def: ItemDef, x: number, y: number, lighting?: WorldLighting | null) {
    if (!def.pet) throw new Error(`Pet entity built from non-pet item '${def.id}'`);
    this.itemId = def.id;
    this.lootRadius = def.pet.lootRadius;
    this.info = getPetSprite(scene, def.pet.species, def.icon.colors);
    this.sprite = scene.add.sprite(x, y, this.info.key, 0).setOrigin(0.5, 1).setDepth(14);
    playAnim(this.sprite, this.info, 'idle');
    lighting?.lit(this.sprite, this.info.key);
  }

  teleport(x: number, y: number): void {
    this.sprite.setPosition(x, y);
    this.chasingDropId = null;
  }

  /** Called by WorldScene when a drop within lootRadius is found for this pet to fetch. */
  chase(dropId: string, x: number, y: number): void {
    this.chasingDropId = dropId;
    this.chaseTarget.x = x; this.chaseTarget.y = y;
  }

  /** Update movement/anim. Returns the dropId to report as "reached" this frame, if any. */
  update(dtMs: number, target: { x: number; y: number; facing: 1 | -1 }): string | null {
    const dt = dtMs / 1000;
    this.bobT += dtMs * 0.004;
    let reached: string | null = null;

    let desiredX: number, desiredY: number, moving: boolean;
    if (this.chasingDropId) {
      desiredX = this.chaseTarget.x; desiredY = this.chaseTarget.y - 4;
      const dist = Math.hypot(this.sprite.x - desiredX, this.sprite.y - desiredY);
      if (dist < REACH_DIST) {
        reached = this.chasingDropId;
        this.chasingDropId = null;
      } else {
        const spd = Math.min(dist, CHASE_SPEED * dt);
        const ang = Math.atan2(desiredY - this.sprite.y, desiredX - this.sprite.x);
        this.sprite.x += Math.cos(ang) * spd;
        this.sprite.y += Math.sin(ang) * spd;
      }
      moving = true;
    } else {
      desiredX = target.x - target.facing * 20;
      desiredY = target.y - 4;
      const dx = desiredX - this.sprite.x, dy = desiredY - this.sprite.y;
      const dist = Math.hypot(dx, dy);
      const lerp = Math.min(1, FOLLOW_LERP * dt);
      this.sprite.x += dx * lerp;
      this.sprite.y += dy * lerp;
      moving = dist > 6;
    }

    if (moving) {
      const dx = desiredX - this.sprite.x;
      if (Math.abs(dx) > 1.5) this.facing = dx > 0 ? 1 : -1;
    }
    this.sprite.setFlipX(this.facing === -1);
    const bobOffset = Math.sin(this.bobT) * 2;
    this.sprite.y += bobOffset - this.lastBob;
    this.lastBob = bobOffset;
    playAnim(this.sprite, this.info, moving ? 'move' : 'idle');

    const now = performance.now();
    if (now > this.nextEmoteAt) {
      this.nextEmoteAt = now + EMOTE_MIN_MS + Math.random() * (EMOTE_MAX_MS - EMOTE_MIN_MS);
      this.emote();
    }
    return reached;
  }

  private emote(): void {
    const glyph = EMOTES[Math.floor(Math.random() * EMOTES.length)];
    const label = makeCrispLabel(this.scene, this.sprite.x, this.sprite.y - this.sprite.displayHeight - 2, glyph, { fontSize: '10px', color: '#ffb3d1' }).setDepth(16);
    this.scene.tweens.add({ targets: label, y: label.y - 14, alpha: 0, duration: 900, ease: 'Quad.easeOut', onComplete: () => label.destroy() });
  }

  destroy(): void { this.sprite.destroy(); }
}
