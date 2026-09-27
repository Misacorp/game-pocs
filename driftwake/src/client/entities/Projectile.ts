/**
 * Pooled projectile entities used by player skills and monster/boss ranged attacks.
 * Decoupled from concrete Player/Monster classes via small closures supplied at spawn time.
 */
import Phaser from 'phaser';
import type { VfxStyle } from '@shared/types';
import { getProjectileTexture, spawnVfx } from '../gfx';

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
}

export class ProjectileManager {
  private live: Live[] = [];

  constructor(private scene: Phaser.Scene) {}

  spawn(opts: ProjectileSpawnOpts): void {
    const key = getProjectileTexture(this.scene, opts.style, opts.color);
    const sprite = this.scene.add.image(opts.x, opts.y, key).setDepth(45);
    const angle = Math.atan2(opts.vy, opts.vx);
    sprite.setRotation(angle);
    this.live.push({
      sprite, vx: opts.vx, vy: opts.vy, gravity: opts.gravity ?? 0,
      homingTarget: opts.homingTarget, turnRate: opts.homingTurnRate ?? 6,
      radius: opts.radius ?? 8, life: opts.life ?? 3000, pierce: opts.pierce ?? 0,
      hitSet: new Set(), queryHit: opts.queryHit, onHit: opts.onHit,
      explodeRadius: opts.explodeRadius, onExplode: opts.onExplode, bounds: opts.bounds,
      dead: false,
    });
  }

  private kill(p: Live): void {
    if (p.dead) return;
    p.dead = true;
    if (p.explodeRadius) {
      spawnVfx(this.scene, 'explosion', p.sprite.x, p.sprite.y, { color: '#ffaa33', width: p.explodeRadius, height: p.explodeRadius });
      p.onExplode?.(p.sprite.x, p.sprite.y, p.explodeRadius);
    }
    p.sprite.destroy();
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
    for (const p of this.live) p.sprite.destroy();
    this.live = [];
  }
}
