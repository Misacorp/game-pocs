/**
 * The player entity: Maplestory-feel platforming movement, universal dash, learned-skill flash
 * jump (doubleJump effect), rope/ladder climbing, knockback + i-frames, HP/MP regen, and
 * equipment-driven sprite rebuilds.
 */
import Phaser from 'phaser';
import type { CharacterState, DerivedStats, EquipSlot, JobDef, RopeDef } from '@shared/types';
import { PLAYER_BASE_SPEED, PLAYER_JUMP_VELOCITY, PLAYER_INVULN_MS, COMBAT_REGEN_DELAY_MS } from '@shared/constants';
import { scalar } from '@shared/logic';
import { ITEMS } from '@shared/data';
import { getCharacterSprite, spawnVfx, type CharacterLook, type SpriteInfo } from '../gfx';
import { audio } from '../audio';
import { session } from '../session';
import { getSkillDef } from '../dev/fixtures';
import { isGodmode } from '../dev/debug';
import type { DamageTextPool } from '../combat/DamageText';
import type { PlayerHandle } from '../combat/SkillRunner';
import { applyBodyBottomAligned, playAnim, invulnAlpha } from './spriteUtil';
import type { WorldLighting } from '../render/lighting';
import { ContactShadow } from '../render/ContactShadow';

export interface PlayerWorldCtx {
  ropeAt: (x: number, y: number) => RopeDef | null;
  /** Nearest platform surface y at (x,y) within tolerance px (above or below), or null — used to
   *  let the player step off a rope/ladder onto a platform instead of needing to jump off it. */
  platformSurfaceNear?: (x: number, y: number, tolerance?: number) => number | null;
  inTown: () => boolean;
  cameraShake: (ms: number, intensity: number) => void;
  damageText: DamageTextPool;
  lighting?: WorldLighting | null;
  groundYAt?: (x: number, fromY: number) => number;
  pulseChromatic?: (amount: number) => void;
}

export interface PlayerInputState {
  left: boolean; right: boolean; up: boolean; down: boolean;
  jumpPressed: boolean; jumpReleased: boolean;
  dashPressed: boolean;
}

const DASH_DISTANCE = 95, DASH_DURATION_MS = 140, DASH_COOLDOWN_MS = 900, DASH_INVULN_MS = 160;
const COYOTE_MS = 110, JUMP_BUFFER_MS = 120, CLIMB_SPEED = 95;
/** How close (px) a platform surface must be to a rope/ladder's authored top for the player to be
 *  able to step off onto it there, instead of needing to jump — see Player.tryMountAtRopeTop(). */
const ROPE_MOUNT_TOLERANCE = 16;

export class Player implements PlayerHandle {
  sprite: Phaser.Physics.Arcade.Sprite;
  facing: 1 | -1 = 1;
  private info: SpriteInfo;
  private lookSignature = '';
  grounded = false;
  private coyoteUntil = 0;
  private jumpBufferUntil = 0;
  private jumpsUsed = 0;
  private dashUntil = 0;
  private dashCooldownUntil = 0;
  private dashVX = 0; private dashVY = 0;
  private wasDashing = false;
  private invulnUntil = 0;
  private castLockUntil = 0;
  private castAnimName: 'attack' | 'cast' | 'shoot' = 'attack';
  /** bumps on every cast so back-to-back swings restart the anim instead of freezing on its last frame */
  private castSeq = 0;
  private castSeqShown = 0;
  private castLockMs = 0;
  climbing = false;
  private currentRope: RopeDef | null = null;
  private lastDamageAt = 0;
  private regenAccumMs = 0;
  dead = false;
  private shadow: ContactShadow;
  private static readonly LIGHT_ID = 'player';

  constructor(private scene: Phaser.Scene, x: number, y: number, private worldCtx: PlayerWorldCtx) {
    const look = Player.buildLook(session.state, session.job);
    this.info = getCharacterSprite(scene, look);
    this.lookSignature = Player.lookSignature(session.state);
    this.sprite = scene.physics.add.sprite(x, y, this.info.key, 0).setOrigin(0.5, 1).setDepth(15).setCollideWorldBounds(true);
    applyBodyBottomAligned(this.sprite, this.info);
    playAnim(this.sprite, this.info, 'idle');
    worldCtx.lighting?.lit(this.sprite, this.info.key);
    // The player always carries a soft warm light with them — priority guarantees it always wins
    // a slot in the light budget over decor/vfx, however many of those are nearby.
    // LIGHTING FIX: this used to sit right on top of the sprite (y - 0.6*height, i.e. roughly chest
    // height) at intensity 1.1 — attenuation is ~1 at zero distance regardless of radius, so the
    // light's own owner sat at its peak and (pre tone-mapping) blew out to flat white. Now offset
    // well above the head and slightly ahead of facing (so its peak lands past the character, not
    // on it), wider and dimmer — DriftwakeLightPipeline's rolloff (see pipelines/LightingPipeline.ts)
    // handles the rest, but not sitting in your own hotspot is most of the fix.
    worldCtx.lighting?.addLight({
      id: Player.LIGHT_ID,
      x: () => this.sprite.x + this.facing * this.sprite.displayWidth * 0.4,
      y: () => this.sprite.y - this.sprite.displayHeight * 1.25,
      color: 0xffe9c2, radius: 190, intensity: 0.6, flicker: 0.06, priority: 3,
    });
    this.shadow = new ContactShadow(scene, this.info.bodyWidth * 1.5, 8);
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }
  get vy() { return (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.y; }
  get vx() { return (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.x; }
  isInvulnerable(now = performance.now()): boolean { return now < this.invulnUntil; }

  static buildLook(state: CharacterState, job: JobDef): CharacterLook {
    const colorsOf = (slot: EquipSlot) => { const inst = state.equipment[slot]; return inst ? ITEMS[inst.itemId]?.icon.colors : undefined; };
    const weaponInst = state.equipment.weapon;
    const weaponDef = weaponInst ? ITEMS[weaponInst.itemId] : undefined;
    return {
      classId: state.classId, jobId: state.jobId, appearance: state.appearance,
      weaponType: weaponDef?.equip?.weaponType ?? job.weaponTypes[0],
      weaponColors: colorsOf('weapon'), armorColors: colorsOf('armor'), helmetColors: colorsOf('helmet'),
      bootsColors: colorsOf('boots'), glovesColors: colorsOf('gloves'),
    };
  }

  static lookSignature(state: CharacterState): string {
    const eq = state.equipment;
    return [
      state.jobId, state.appearance.outfit, state.appearance.hair, state.appearance.hairStyle, state.appearance.skin,
      eq.weapon?.itemId, eq.armor?.itemId, eq.helmet?.itemId, eq.boots?.itemId, eq.gloves?.itemId,
    ].join('|');
  }

  /** Call whenever session emits 'state' — cheaply no-ops unless equipment/appearance/job actually changed. */
  syncLook(): void {
    const sig = Player.lookSignature(session.state);
    if (sig === this.lookSignature) return;
    this.lookSignature = sig;
    const look = Player.buildLook(session.state, session.job);
    this.info = getCharacterSprite(this.scene, look);
    const anim = this.sprite.anims?.currentAnim?.key;
    this.sprite.setTexture(this.info.key, 0);
    applyBodyBottomAligned(this.sprite, this.info);
    this.worldCtx.lighting?.lit(this.sprite, this.info.key);
    if (anim) { /* anim keys are namespaced per-texture; replay idle to avoid a stale frame */ }
    playAnim(this.sprite, this.info, 'idle');
  }

  /**
   * Attempts to step off a rope/ladder onto a platform whose surface sits within
   * ROPE_MOUNT_TOLERANCE px of the rope's authored top (above or below — some maps' tops land a
   * few px shy of, or past, the platform surface). No-ops if nothing is close enough, leaving the
   * player clamped at the rope top as before (still free to jump off).
   */
  private tryMountAtRopeTop(rope: RopeDef): void {
    const surfaceY = this.worldCtx.platformSurfaceNear?.(rope.x, rope.top, ROPE_MOUNT_TOLERANCE);
    if (surfaceY == null) return;
    this.climbing = false;
    this.currentRope = null;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(true);
    // A small hop up-and-onto the ledge (settles via normal gravity/collision, same as a landing)
    // rather than teleporting flat onto it — reads as a deliberate step, not a snap.
    this.sprite.y = surfaceY - 5;
    body.setVelocity(this.facing * 30, -70);
  }

  private isDashing(now: number): boolean { return now < this.dashUntil; }
  isCasting(now = performance.now()): boolean { return now < this.castLockUntil; }

  update(dtMs: number, input: PlayerInputState, stats: DerivedStats): void {
    if (this.dead) return;
    const now = performance.now();
    const dt = dtMs / 1000;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const dashing = this.isDashing(now);

    this.grounded = body.blocked.down || body.touching.down;
    if (this.grounded) { this.coyoteUntil = now + COYOTE_MS; if (!dashing) this.jumpsUsed = 0; }

    if (dashing) {
      body.setVelocity(this.dashVX, this.dashVY);
      this.wasDashing = true;
    } else {
      if (this.wasDashing) {
        body.setAllowGravity(true);
        this.wasDashing = false;
        // The dash sets velocity directly every frame at (well) above run speed — left alone, that
        // carries over into normal movement afterward: held-direction movement re-clamps to run
        // speed within one frame anyway, but with no direction held the old decel ramp bled off the
        // leftover dash speed gradually, "sliding" the player much further than intended (this hit
        // the universal dash and every skill dash routed through performDash alike). Clamp/zero it
        // the instant the dash ends instead of letting normal deceleration do it over time.
        const maxSpeed = PLAYER_BASE_SPEED * (1 + stats.speed / 100);
        if (input.left || input.right) body.setVelocityX(Phaser.Math.Clamp(body.velocity.x, -maxSpeed, maxSpeed));
        else body.setVelocityX(0);
      }

      const rope = this.worldCtx.ropeAt(this.sprite.x, this.sprite.y);
      if (rope && (input.up || input.down)) { this.climbing = true; this.currentRope = rope; }
      if (this.climbing && (!rope || (!input.up && !input.down && this.grounded))) { this.climbing = false; this.currentRope = null; }

      if (this.climbing && this.currentRope) {
        body.setAllowGravity(false);
        const vy = input.up ? -CLIMB_SPEED : input.down ? CLIMB_SPEED : 0;
        body.setVelocity(0, vy);
        this.sprite.x += (this.currentRope.x - this.sprite.x) * Math.min(1, dt * 10);
        this.sprite.y = Phaser.Math.Clamp(this.sprite.y, this.currentRope.top + 6, this.currentRope.bottom);
        if (input.jumpPressed) {
          this.climbing = false;
          body.setAllowGravity(true);
          body.setVelocityY(-PLAYER_JUMP_VELOCITY * (1 + stats.jump / 100) * 0.8);
          body.setVelocityX(this.facing * 160);
        } else if (input.up && this.sprite.y <= this.currentRope.top + 6 + 0.5) {
          // Reached the top while climbing up (or the player is holding ↑ after arriving there) —
          // Maplestory-style: step off onto the platform right there instead of forcing a jump.
          this.tryMountAtRopeTop(this.currentRope);
        }
      } else {
        body.setAllowGravity(true);
        this.horizontalMovement(body, input, stats, dt);
        // Down+jump is the dedicated "drop through a one-way platform" command (WorldScene arms
        // dropThroughUntil for this) — it must never also fire a normal upward jump.
        if (!(input.down && this.grounded)) this.jumpLogic(body, input, stats, now);
      }

      if (input.dashPressed && now > this.dashCooldownUntil && !this.climbing) {
        this.performDash(DASH_DISTANCE, DASH_DURATION_MS, DASH_INVULN_MS);
        this.dashCooldownUntil = now + DASH_COOLDOWN_MS;
      }
      if (!this.grounded && !this.climbing && input.jumpPressed && this.jumpsUsed >= 1) this.tryDoubleJump(now, stats);
    }

    this.updateAnim(now, dashing);
    this.updateRegen(dtMs, stats);
    if (this.worldCtx.groundYAt) this.shadow.update(this.sprite.x, this.worldCtx.groundYAt(this.sprite.x, this.sprite.y), this.sprite.y);
    session.position.x = this.sprite.x;
    session.position.y = this.sprite.y;
  }

  private horizontalMovement(body: Phaser.Physics.Arcade.Body, input: PlayerInputState, stats: DerivedStats, dt: number): void {
    const maxSpeed = PLAYER_BASE_SPEED * (1 + stats.speed / 100);
    const accel = maxSpeed / 0.12;
    const decel = maxSpeed / 0.08;
    let dir = 0;
    if (input.left) dir -= 1;
    if (input.right) dir += 1;
    if (dir !== 0) this.facing = dir as 1 | -1;
    let vx = body.velocity.x;
    if (dir !== 0) {
      vx += dir * accel * dt;
      vx = dir > 0 ? Math.min(vx, maxSpeed) : Math.max(vx, -maxSpeed);
    } else if (vx > 0) vx = Math.max(0, vx - decel * dt);
    else if (vx < 0) vx = Math.min(0, vx + decel * dt);
    body.setVelocityX(vx);
    this.sprite.setFlipX(this.facing === -1);
  }

  private jumpLogic(body: Phaser.Physics.Arcade.Body, input: PlayerInputState, stats: DerivedStats, now: number): void {
    if (input.jumpPressed) this.jumpBufferUntil = now + JUMP_BUFFER_MS;
    const canJump = (this.grounded || now < this.coyoteUntil) && now < this.jumpBufferUntil;
    if (canJump) {
      body.setVelocityY(-PLAYER_JUMP_VELOCITY * (1 + stats.jump / 100));
      this.jumpsUsed = 1;
      this.coyoteUntil = 0; this.jumpBufferUntil = 0;
      audio.playSfx('jump');
    }
    if (input.jumpReleased && body.velocity.y < 0) body.setVelocityY(body.velocity.y * 0.45);
  }

  private tryDoubleJump(now: number, stats: DerivedStats): void {
    for (const skillId of Object.keys(session.state.skills)) {
      const lvl = session.state.skills[skillId];
      if (!lvl) continue;
      const def = getSkillDef(skillId);
      const effect = def?.effect;
      if (!effect || effect.kind !== 'doubleJump') continue;
      const key = `skill:${skillId}`;
      if (!session.isReady(key)) continue;
      const mpCost = scalar(def.mpCost, lvl);
      if (session.mp < mpCost) continue;
      if (mpCost > 0) session.setVitals(session.hp, session.mp - mpCost);
      const cdMs = scalar(def.cooldownMs, lvl) * (1 - stats.cooldownReduction);
      if (cdMs > 0) session.setCooldown(key, cdMs);
      const power = effect.power * (1 + stats.jump / 100);
      const body = this.sprite.body as Phaser.Physics.Arcade.Body;
      body.setVelocityY(-power);
      if (effect.horizontalBoost) body.setVelocityX(this.facing * effect.horizontalBoost);
      this.jumpsUsed = 2;
      spawnVfx(this.scene, 'wind', this.sprite.x, this.sprite.y - 12, { color: '#cceeff', width: 20, height: 20 });
      audio.playSfx('jump');
      return;
    }
  }

  // ---- PlayerHandle (used by SkillRunner) ----------------------------------
  performDash(distance: number, durationMs: number, invulnMs: number, vertical = 0): void {
    const now = performance.now();
    this.dashUntil = now + durationMs;
    this.invulnUntil = Math.max(this.invulnUntil, now + invulnMs);
    const speed = distance / (durationMs / 1000);
    this.dashVX = this.facing * speed;
    this.dashVY = vertical ? -vertical : 0;
    (this.sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    audio.playSfx('dash');
    this.spawnDashPuffs();
  }

  private spawnDashPuffs(): void {
    for (let i = 0; i < 3; i++) {
      this.scene.time.delayedCall(i * 60, () => {
        if (this.dead) return;
        spawnVfx(this.scene, 'smoke', this.sprite.x - this.facing * 10, this.sprite.y - 16, { color: '#dfe8ff', width: 16, height: 16, durationMs: 220 });
      });
    }
  }

  blink(distance: number): void {
    spawnVfx(this.scene, 'smoke', this.sprite.x, this.sprite.y - 16, { color: '#cceeff', width: 18, height: 18 });
    this.sprite.x += this.facing * distance;
    this.invulnUntil = Math.max(this.invulnUntil, performance.now() + 150);
    spawnVfx(this.scene, 'smoke', this.sprite.x, this.sprite.y - 16, { color: '#cceeff', width: 18, height: 18 });
  }

  playCastAnim(anim: 'attack' | 'cast' | 'shoot', lockMs: number): void {
    this.castAnimName = anim;
    this.castLockMs = Math.max(80, lockMs);
    this.castLockUntil = performance.now() + this.castLockMs;
    this.castSeq++;
  }

  heal(amount: number): void {
    if (amount <= 0) return;
    session.setVitals(session.hp + amount, session.mp);
    this.worldCtx.damageText.spawn(this.sprite.x, this.sprite.y - this.sprite.displayHeight, `+${Math.round(amount)}`, 'heal');
  }

  nudge(dx: number): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(body.velocity.x + dx);
  }

  // ---- damage / death -------------------------------------------------------
  takeDamage(amount: number, knockbackDirX: number): void {
    const now = performance.now();
    if (this.dead || now < this.invulnUntil || isGodmode()) return;
    this.invulnUntil = now + PLAYER_INVULN_MS;
    this.lastDamageAt = now;
    session.setVitals(session.hp - amount, session.mp);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(true);
    body.setVelocity(knockbackDirX * 220, -180);
    audio.playSfx('playerHurt');
    this.worldCtx.cameraShake(120, 0.004);
    this.worldCtx.damageText.spawn(this.sprite.x, this.sprite.y - this.sprite.displayHeight, Math.round(amount), 'playerHurt');
    playAnim(this.sprite, this.info, 'hurt');
    this.worldCtx.pulseChromatic?.(Math.min(0.012, 0.004 + amount / 4000));
    const fx = this.sprite.x, fy = this.sprite.y - this.sprite.displayHeight * 0.6;
    this.worldCtx.lighting?.addLight({ id: `hurtflash${now}`, x: () => fx, y: () => fy, color: 0xff5566, radius: 90, intensity: 1.1, ttl: 140 });
    if (session.hp <= 0) this.die();
  }

  private die(): void {
    if (this.dead) return;
    this.dead = true;
    this.climbing = false;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    playAnim(this.sprite, this.info, 'dead');
    audio.playSfx('death');
    session.dispatch({ type: 'die' });
  }

  revive(x: number, y: number): void {
    this.dead = false;
    this.sprite.setPosition(x, y).setAlpha(1);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setAllowGravity(true);
    body.setVelocity(0, 0);
    this.invulnUntil = performance.now() + 900;
    playAnim(this.sprite, this.info, 'idle');
  }

  private updateAnim(now: number, dashing: boolean): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    let name = 'idle';
    if (this.dead) name = 'dead';
    else if (now < this.castLockUntil) name = this.castAnimName;
    else if (this.climbing) name = 'climb';
    else if (dashing) name = 'walk';
    else if (!this.grounded) name = body.velocity.y < 0 ? 'jump' : 'fall';
    else if (Math.abs(body.velocity.x) > 6) name = 'walk';
    const casting = !this.dead && now < this.castLockUntil && name === this.castAnimName;
    if (casting && this.castSeqShown !== this.castSeq) {
      // restart the swing and fit its duration to the skill's lock time (clamped so very long
      // casts don't crawl and very fast ones don't skip frames entirely)
      this.castSeqShown = this.castSeq;
      playAnim(this.sprite, this.info, name, { ignoreIfPlaying: false });
      const anim = this.sprite.anims.currentAnim;
      const animMs = anim ? (anim.frames.length / Math.max(1, anim.frameRate)) * 1000 : 0;
      this.sprite.anims.timeScale = animMs > 0 ? Phaser.Math.Clamp(animMs / this.castLockMs, 0.7, 2.2) : 1;
    } else {
      if (!casting && this.sprite.anims.timeScale !== 1) this.sprite.anims.timeScale = 1;
      playAnim(this.sprite, this.info, name);
    }
    this.sprite.setAlpha(this.dead ? 1 : invulnAlpha(now, this.invulnUntil));
  }

  private updateRegen(dtMs: number, stats: DerivedStats): void {
    this.regenAccumMs += dtMs;
    if (this.regenAccumMs < 5000 || this.dead) return;
    this.regenAccumMs -= 5000;
    const now = performance.now();
    const outOfCombat = now - this.lastDamageAt > COMBAT_REGEN_DELAY_MS;
    const mult = this.worldCtx.inTown() ? 3 : outOfCombat ? 2 : 1;
    if (stats.hpRegen <= 0 && stats.mpRegen <= 0) return;
    const hp = Math.min(stats.maxHp, session.hp + stats.hpRegen * mult);
    const mp = Math.min(stats.maxMp, session.mp + stats.mpRegen * mult);
    session.setVitals(hp, mp);
  }

  destroy(): void {
    this.worldCtx.lighting?.removeLight(Player.LIGHT_ID);
    this.shadow.destroy();
    this.sprite.destroy();
  }
}
