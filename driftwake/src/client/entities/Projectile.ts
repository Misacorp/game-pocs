/**
 * Pooled projectile entities used by player skills and monster/boss ranged attacks.
 * Decoupled from concrete Player/Monster classes via small closures supplied at spawn time.
 */
import Phaser from 'phaser';
import type { VfxStyle } from '@shared/types';
import { getProjectileTexture, spawnVfx } from '../gfx';
import type { WorldLighting } from '../render/lighting';

export interface ProjectileHit { x: number; y: number; obj: unknown }

export interface ProjectileSpawnOpts {
  x: number; y: number; vx: number; vy: number;
  gravity?: number;
  /** steer toward this each frame (homing) */
  homingTarget?: () => { x: number; y: number } | null;
  homingTurnRate?: number; // rad/s, default 6
  radius?: number; // hit radius
  life?: number; // ms
  color: string;
  style: VfxStyle;
  /** number of targets this projectile can pass through after the first hit (0 = destroy on first hit) */
  pierce?: number;
  /** find a single nearby unhit target at (x,y); return null if none */
  queryHit: (x: number, y: number, already: Set<unknown>) => ProjectileHit | null;
  onHit: (hit: ProjectileHit) => void;
  /** explode on impact or expiry: spawn an aoe-ish vfx + let caller resolve splash damage */
  explodeRadius?: number;
  onExplode?: (x: number, y: number, radius: number) => void;
  /** despawn silently once out of these world bounds */
  bounds?: { width: number; height: number };
}

interface Live {
  sprite: Phaser.GameObjects.Image;
  vx: number; vy: number;
  gravity: number;
  homingTarget?: () => { x: number; y: number } | null;
  turnRate: number;
  radius: number;
  life: number;
  pierce: number;
  hitSet: Set<unknown>;
  queryHit: ProjectileSpawnOpts['queryHit'];
  onHit: ProjectileSpawnOpts['onHit'];
  explodeRadius?: number;
  onExplode?: ProjectileSpawnOpts['onExplode'];
  bounds?: { width: number; height: number };
  dead: boolean;
  lightId: string;
  /** True for the projectile's whole life whenever it spawned with pierce > 0 — i.e. it is
   *  ALLOWED to hit more than one target — independent of how much pierce it has left, so a
   *  piercing shot keeps reading as one even after using up its last piercing hit. */
  piercing: boolean;
  /** Additive glow sibling image trailing the sprite, only for piercing projectiles (see spawn()) —
   *  the visual cue that tells a piercing shot apart from a normal one. */
  glow?: Phaser.GameObjects.Image;
  trailAccumMs: number;
  trailKey: string;
}

let projLightSeq = 0;

export class ProjectileManager {
  private live: Live[] = [];

  constructor(private scene: Phaser.Scene, private lighting?: WorldLighting | null) {}

  spawn(opts: ProjectileSpawnOpts): void {
    const key = getProjectileTexture(this.scene, opts.style, opts.color);
    const sprite = this.scene.add.image(opts.x, opts.y, key).setDepth(45);
    const angle = Math.atan2(opts.vy, opts.vx);
    sprite.setRotation(angle);
    const lightId = `proj${projLightSeq++}`;
    const tint = Phaser.Display.Color.HexStringToColor(opts.color).color;
    const piercing = (opts.pierce ?? 0) > 0;
    // Every projectile emits a small, brief light that tracks it — most visible for the
    // additive-blended bolt/orb/fire styles, harmless (just dim) for solid ones like arrows.
    // A piercing shot gets a bigger, brighter light so it reads as "hotter" even before the
    // glow sibling/trail below are visible.
    this.lighting?.addLight({
      id: lightId, x: () => sprite.x, y: () => sprite.y,
      color: tint, radius: piercing ? 80 : 55, intensity: piercing ? 1.15 : 0.85,
    });
    // Visual cue for pierce (c): a soft additive glow riding just behind the sprite, plus a short
    // fading trail spawned as it flies — makes a piercing shot visibly different from a normal one
    // (which gets neither), so players can tell them apart before they ever see it punch through.
    const glow = piercing
      ? this.scene.add.image(opts.x, opts.y, key).setDepth(44).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5).setScale(1.7)
      : undefined;
    this.live.push({
      sprite, vx: opts.vx, vy: opts.vy, gravity: opts.gravity ?? 0,
      homingTarget: opts.homingTarget, turnRate: opts.homingTurnRate ?? 6,
      radius: opts.radius ?? 8, life: opts.life ?? 3000, pierce: opts.pierce ?? 0,
      hitSet: new Set(), queryHit: opts.queryHit, onHit: opts.onHit,
      explodeRadius: opts.explodeRadius, onExplode: opts.onExplode, bounds: opts.bounds,
      dead: false, lightId, piercing, glow, trailAccumMs: 0, trailKey: key,
    });
  }

  private kill(p: Live): void {
    if (p.dead) return;
    p.dead = true;
    if (p.explodeRadius) {
      spawnVfx(this.scene, 'explosion', p.sprite.x, p.sprite.y, { color: '#ffaa33', width: p.explodeRadius, height: p.explodeRadius });
      p.onExplode?.(p.sprite.x, p.sprite.y, p.explodeRadius);
      const ex = p.sprite.x, ey = p.sprite.y;
      this.lighting?.addLight({ id: p.lightId, x: () => ex, y: () => ey, color: 0xffaa33, radius: p.explodeRadius * 2.2, intensity: 1.2, ttl: 180 });
    } else {
      this.lighting?.removeLight(p.lightId);
    }
    p.sprite.destroy();
    p.glow?.destroy();
  }

  /** Piercing-only afterimage: a fading, shrinking duplicate dropped at the current position,
   *  a few times per second — reads as a short bright streak trailing the shot. */
  private spawnTrailGhost(p: Live): void {
    const ghost = this.scene.add.image(p.sprite.x, p.sprite.y, p.trailKey)
      .setDepth(43).setRotation(p.sprite.rotation).setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.4);
    this.scene.tweens.add({ targets: ghost, alpha: 0, scale: 0.4, duration: 220, onComplete: () => ghost.destroy() });
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    for (const p of this.live) {
      if (p.dead) continue;
      if (p.homingTarget) {
        const t = p.homingTarget();
        if (t) {
          const desired = Math.atan2(t.y - p.sprite.y, t.x - p.sprite.x);
          const cur = Math.atan2(p.vy, p.vx);
          let diff = Phaser.Math.Angle.Wrap(desired - cur);
          const maxTurn = p.turnRate * dt;
          diff = Phaser.Math.Clamp(diff, -maxTurn, maxTurn);
          const speed = Math.hypot(p.vx, p.vy);
          const na = cur + diff;
          p.vx = Math.cos(na) * speed; p.vy = Math.sin(na) * speed;
        }
      }
      p.vy += p.gravity * dt;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      p.sprite.setRotation(Math.atan2(p.vy, p.vx));
      if (p.glow) p.glow.setPosition(p.sprite.x, p.sprite.y).setRotation(p.sprite.rotation);
      if (p.piercing) {
        p.trailAccumMs += dtMs;
        if (p.trailAccumMs >= 35) { p.trailAccumMs = 0; this.spawnTrailGhost(p); }
      }
      p.life -= dtMs;
      const hit = p.queryHit(p.sprite.x, p.sprite.y, p.hitSet);
      if (hit) {
        p.hitSet.add(hit.obj);
        p.onHit(hit);
        if (p.pierce <= 0) { this.kill(p); continue; }
        p.pierce--;
      }
      if (p.life <= 0) { this.kill(p); continue; }
      if (p.bounds && (p.sprite.x < -50 || p.sprite.x > p.bounds.width + 50 || p.sprite.y > p.bounds.height + 100 || p.sprite.y < -200)) {
        this.kill(p); continue;
      }
    }
    if (this.live.length > 64) this.live = this.live.filter((p) => !p.dead);
    else this.live = this.live.filter((p) => !p.dead);
  }

  destroy(): void {
    for (const p of this.live) { p.sprite.destroy(); p.glow?.destroy(); this.lighting?.removeLight(p.lightId); }
    this.live = [];
  }
}
