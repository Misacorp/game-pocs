/**
 * Executes basic attacks and skills for the player: builds a level/stat-scaled CastDescriptor from
 * SkillDef/JobDef.basicAttack, resolves all SkillEffect kinds against the live monster list, applies
 * damage via shared logic, status effects, lifesteal, buffs, hit-stop and camera shake.
 */
import Phaser from 'phaser';
import type { DerivedStats, JobDef, SkillDef, SkillEffect, SfxId, StatusOnHit, SkillIconSpec, VfxStyle, StatMods } from '@shared/types';
import { rollPlayerDamage, scalar } from '@shared/logic';
import { session } from '../session';
import { bus } from '../events';
import { audio } from '../audio';
import { spawnVfx, spawnTelegraph } from '../gfx';
import type { ProjectileManager } from '../entities/Projectile';
import type { DamageTextPool } from './DamageText';
import type { BuffManager } from './Buffs';
import type { MonsterEntity } from '../entities/Monster';

export interface PlayerHandle {
  x: number; y: number; facing: 1 | -1;
  performDash(distance: number, durationMs: number, invulnMs: number, vertical?: number): void;
  blink(distance: number): void;
  playCastAnim(anim: 'attack' | 'cast' | 'shoot', lockMs: number): void;
  heal(amount: number): void;
  nudge(dx: number): void;
}

export interface CastDescriptor {
  id: string;
  name: string;
  effect: SkillEffect;
  damagePct: number;
  hits: number;
  maxTargets?: number;
  vfx?: { style: VfxStyle; color: string; color2?: string; scale?: number };
  sfx?: SfxId;
  status?: StatusOnHit;
  lifesteal: number;
  castTimeMs: number;
  anim: 'attack' | 'cast' | 'shoot';
  mpCost: number;
  hpCostPct: number;
  cooldownMs: number;
  buff?: { stats: StatMods; durationMs: number; icon?: SkillIconSpec };
  channel?: boolean;
}

export function evalScalarMods(mods: Record<string, any> | undefined, level: number): StatMods {
  const out: StatMods = {};
  if (!mods) return out;
  for (const k in mods) (out as any)[k] = scalar(mods[k], level);
  return out;
}

export function buildSkillDescriptor(skill: SkillDef, level: number, stats: DerivedStats): CastDescriptor {
  const cdRaw = scalar(skill.cooldownMs, level);
  return {
    id: skill.id, name: skill.name, effect: skill.effect ?? { kind: 'none' },
    damagePct: skill.damagePct ? scalar(skill.damagePct, level) : 100,
    hits: skill.hits ?? 1, maxTargets: skill.maxTargets,
    vfx: skill.vfx, sfx: skill.sfx, status: skill.status,
    lifesteal: scalar(skill.lifesteal, level),
    castTimeMs: skill.castTimeMs ?? 350, anim: skill.anim ?? 'attack',
    mpCost: scalar(skill.mpCost, level), hpCostPct: scalar(skill.hpCostPct, level),
    cooldownMs: Math.max(0, Math.round(cdRaw * (1 - stats.cooldownReduction))),
    buff: skill.buff ? { stats: evalScalarMods(skill.buff.stats, level), durationMs: scalar(skill.buff.durationMs, level), icon: skill.icon } : undefined,
    channel: skill.channel,
  };
}

export function buildBasicAttackDescriptor(job: JobDef): CastDescriptor {
  const b = job.basicAttack;
  return {
    id: 'attack', name: 'Attack', effect: b.effect, damagePct: b.damagePct ?? 100, hits: 1,
    vfx: { style: b.vfx.style, color: b.vfx.color }, sfx: b.sfx, lifesteal: 0,
    castTimeMs: b.castTimeMs, anim: b.anim, mpCost: 0, hpCostPct: 0, cooldownMs: 0,
  };
}

function knockbackOf(effect: SkillEffect): number | undefined {
  return 'knockback' in effect ? (effect as any).knockback : undefined;
}

export interface SkillRunnerCtx {
  getMonsters: () => MonsterEntity[];
  getStats: () => DerivedStats;
  getJob: () => JobDef;
  getLevel: () => number;
  cameraShake: (ms: number, intensity: number) => void;
  hitstop: (ms: number) => void;
  bounds: { width: number; height: number };
}

/** Closest distance from a point to a monster's physics body (0 if inside). Big monsters/bosses need body-based checks. */
function distToBody(m: MonsterEntity, x: number, y: number): number {
  const b = m.sprite.body as Phaser.Physics.Arcade.Body | null;
  if (!b) return Phaser.Math.Distance.Between(x, y, m.sprite.x, m.sprite.y - m.sprite.displayHeight / 2);
  const cx = Phaser.Math.Clamp(x, b.x, b.x + b.width);
  const cy = Phaser.Math.Clamp(y, b.y, b.y + b.height);
  return Phaser.Math.Distance.Between(x, y, cx, cy);
}

/** Does the monster's body overlap the axis-aligned rect [x1,x2]x[y1,y2]? */
function bodyOverlaps(m: MonsterEntity, x1: number, y1: number, x2: number, y2: number): boolean {
  const b = m.sprite.body as Phaser.Physics.Arcade.Body | null;
  const bx = b ? b.x : m.sprite.x - 8, by = b ? b.y : m.sprite.y - 16, bw = b ? b.width : 16, bh = b ? b.height : 16;
  const lx = Math.min(x1, x2), rx = Math.max(x1, x2), ty = Math.min(y1, y2), byy = Math.max(y1, y2);
  return bx <= rx && bx + bw >= lx && by <= byy && by + bh >= ty;
}

export class SkillRunner {
  constructor(
    private scene: Phaser.Scene,
    private ctx: SkillRunnerCtx,
    private projectiles: ProjectileManager,
    private damageText: DamageTextPool,
    private buffs: BuffManager,
  ) {}

  private now() { return performance.now(); }

  /** HP-cost skills (Reaver) may never reduce the player below 1 HP via their own cost. */
  private hpCostOf(desc: CastDescriptor): number {
    return desc.hpCostPct > 0 ? Math.round(session.stats.maxHp * desc.hpCostPct) : 0;
  }

  isReady(desc: CastDescriptor): boolean {
    if (desc.cooldownMs > 0 && !session.isReady(`skill:${desc.id}`)) return false;
    if (desc.mpCost > 0 && session.mp < desc.mpCost) return false;
    if (desc.hpCostPct > 0 && session.hp - this.hpCostOf(desc) < 1) return false;
    return true;
  }

  cast(desc: CastDescriptor, caster: PlayerHandle, opts: { silent?: boolean } = {}): boolean {
    if (!this.isReady(desc)) {
      if (!opts.silent && desc.mpCost > 0 && session.mp < desc.mpCost) bus.emit('ui:toast', { text: 'Not enough MP', kind: 'warn' });
      return false;
    }
    const hpCost = this.hpCostOf(desc);
    if (hpCost > 0 || desc.mpCost > 0) session.setVitals(session.hp - hpCost, session.mp - desc.mpCost);
    if (desc.cooldownMs > 0) session.setCooldown(`skill:${desc.id}`, desc.cooldownMs);
    caster.playCastAnim(desc.anim, desc.castTimeMs);
    if (desc.sfx) audio.playSfx(desc.sfx);

    let totalDealt = 0;
    try {
      for (let i = 0; i < Math.max(1, desc.hits); i++) totalDealt += this.runEffect(desc, caster);
    } catch (e) {
      // A single malformed/edge-case skill effect must never freeze the game loop — log and move on.
      console.error(`[SkillRunner] effect for "${desc.id}" threw`, e);
    }
    if (desc.lifesteal > 0 && totalDealt > 0) caster.heal(totalDealt * desc.lifesteal);

    if (desc.buff) {
      this.buffs.add({ id: desc.id, name: desc.name, stats: desc.buff.stats, expiresAt: this.now() + desc.buff.durationMs, icon: desc.buff.icon });
      bus.emit('ui:toast', { text: `${desc.name}!`, kind: 'good' });
    }
    return true;
  }

  private aliveMonsters(): MonsterEntity[] { return this.ctx.getMonsters().filter((m) => !m.dead); }

  private nearest(x: number, y: number, within: number, exclude?: Set<MonsterEntity>): MonsterEntity | null {
    let best: MonsterEntity | null = null; let bestD = within;
    for (const m of this.aliveMonsters()) {
      if (exclude?.has(m)) continue;
      const d = distToBody(m, x, y);
      if (d <= bestD) { bestD = d; best = m; }
    }
    return best;
  }

  private inRadius(x: number, y: number, radius: number, max: number): MonsterEntity[] {
    return this.aliveMonsters()
      .map((m) => ({ m, d: distToBody(m, x, y) }))
      .filter((e) => e.d <= radius).sort((a, b) => a.d - b.d).slice(0, max).map((e) => e.m);
  }

  private resolveHit(m: MonsterEntity, desc: CastDescriptor, sourceX: number): number {
    const now = this.now();
    const { damage, crit } = rollPlayerDamage(
      this.ctx.getStats(), this.ctx.getJob(), desc.damagePct,
      { level: m.def.level, defense: m.def.defense, isBoss: m.isBoss, vulnerability: m.status.damageTakenBonus(now) },
      this.ctx.getLevel(), Math.random,
    );
    m.takeDamage(damage, { crit, knockback: knockbackOf(desc.effect), sourceX });
    m.status.rollAndApply(desc.status, now);
    if (desc.vfx) spawnVfx(this.scene, desc.vfx.style, m.sprite.x, m.sprite.y - m.sprite.displayHeight / 2, { color: desc.vfx.color, color2: desc.vfx.color2, scale: desc.vfx.scale });
    return damage;
  }

  private runEffect(desc: CastDescriptor, caster: PlayerHandle): number {
    const effect = desc.effect;
    let dealt = 0;
    switch (effect.kind) {
      case 'melee': {
        const dir = caster.facing;
        const cx = caster.x + dir * (effect.range / 2);
        const cy = caster.y - (effect.offsetY ?? 14);
        const max = desc.maxTargets ?? (effect.hitsAll ? Infinity : 1);
        const targets = this.aliveMonsters().filter((m) =>
          bodyOverlaps(m, caster.x - dir * 6, cy - effect.height / 2 - 8, caster.x + dir * (effect.range + 6), cy + effect.height / 2 + 8),
        ).sort((a, b) => Math.abs(a.sprite.x - caster.x) - Math.abs(b.sprite.x - caster.x)).slice(0, max);
        for (const m of targets) dealt += this.resolveHit(m, desc, caster.x);
        if (desc.vfx) spawnVfx(this.scene, desc.vfx.style, cx, cy, { color: desc.vfx.color, flipX: dir < 0, width: effect.range, height: effect.height });
        if (effect.lunge) caster.nudge(effect.lunge * dir);
        break;
      }
      case 'projectile': {
        const count = effect.count ?? 1;
        const spread = effect.spreadDeg ?? 0;
        for (let i = 0; i < count; i++) {
          const t = count > 1 ? (i / (count - 1)) - 0.5 : 0;
          const ang = (spread * t * Math.PI) / 180;
          const dir = caster.facing;
          const baseAng = dir < 0 ? Math.PI : 0;
          const vx = Math.cos(baseAng + ang) * effect.speed;
          const vy = Math.sin(baseAng + ang) * effect.speed;
          const hitSetLocal = new Set<MonsterEntity>();
          this.projectiles.spawn({
            x: caster.x + dir * 14, y: caster.y - 20, vx, vy, gravity: effect.gravity ?? 0,
            pierce: effect.pierce ?? 0, radius: 9, life: (effect.range / Math.max(1, effect.speed)) * 1000 + 400,
            color: desc.vfx?.color ?? '#ffffff', style: desc.vfx?.style ?? 'bullet', bounds: this.ctx.bounds,
            homingTarget: effect.homing ? () => { const n = this.nearest(caster.x, caster.y, 500, hitSetLocal); return n ? { x: n.sprite.x, y: n.sprite.y - n.sprite.displayHeight / 2 } : null; } : undefined,
            queryHit: (x, y, already) => {
              const m = this.aliveMonsters().find((mm) => !already.has(mm) && distToBody(mm, x, y) < 7);
              return m ? { x: m.sprite.x, y: m.sprite.y, obj: m } : null;
            },
            onHit: (hit) => { const m = hit.obj as MonsterEntity; hitSetLocal.add(m); dealt += this.resolveHit(m, desc, caster.x);
              if (effect.explodeRadius) for (const near of this.inRadius(hit.x, hit.y, effect.explodeRadius, 8)) if (near !== m) dealt += this.resolveHit(near, desc, caster.x);
            },
            explodeRadius: effect.explodeRadius,
          });
        }
        break;
      }
      case 'aoe': {
        const fire = () => {
          let cx = caster.x, cy = caster.y - 16;
          if (effect.at === 'front') cx = caster.x + (effect.offsetX ?? 40) * caster.facing;
          else if (effect.at === 'nearest') {
            const n = this.nearest(caster.x, caster.y, effect.range ?? 300);
            if (n) { cx = n.sprite.x; cy = n.sprite.y - n.sprite.displayHeight / 2; }
          }
          if (desc.vfx) spawnVfx(this.scene, desc.vfx.style, cx, cy, { color: desc.vfx.color, width: effect.radius * 2, height: effect.radius * 2 });
          const max = desc.maxTargets ?? Infinity;
          for (const m of this.inRadius(cx, cy, effect.radius, max)) dealt += this.resolveHit(m, desc, caster.x);
        };
        if (effect.delayMs) { spawnTelegraph(this.scene, 'circle', caster.x, caster.y, effect.radius * 2, effect.radius * 2, effect.delayMs); this.scene.time.delayedCall(effect.delayMs, fire); }
        else fire();
        break;
      }
      case 'chain': {
        const hitSet = new Set<MonsterEntity>();
        let from = { x: caster.x, y: caster.y - 16 };
        let mult = 1;
        for (let j = 0; j <= effect.jumps; j++) {
          const n = this.nearest(from.x, from.y, effect.range, hitSet);
          if (!n) break;
          hitSet.add(n);
          const scaled: CastDescriptor = { ...desc, damagePct: desc.damagePct * mult };
          dealt += this.resolveHit(n, scaled, caster.x);
          if (desc.vfx) spawnVfx(this.scene, desc.vfx.style, n.sprite.x, n.sprite.y - n.sprite.displayHeight / 2, { color: desc.vfx.color });
          from = { x: n.sprite.x, y: n.sprite.y - n.sprite.displayHeight / 2 };
          mult *= effect.falloff ?? 0.75;
        }
        break;
      }
      case 'dash': {
        const duration = Math.max(120, Math.round(effect.distance / 0.4286));
        caster.performDash(effect.distance, duration, effect.invulnMs, effect.vertical);
        if (desc.damagePct > 0) {
          const hit = new Set<MonsterEntity>();
          const ticks = Math.max(3, Math.round(duration / 40));
          this.scene.time.addEvent({ delay: 40, repeat: ticks, callback: () => {
            for (const m of this.inRadius(caster.x, caster.y - 16, 34, 8)) if (!hit.has(m)) { hit.add(m); dealt += this.resolveHit(m, desc, caster.x); }
          } });
        }
        break;
      }
      case 'teleport': {
        const fromX = caster.x, fromY = caster.y;
        caster.blink(effect.distance);
        if (desc.damagePct > 0) {
          const minX = Math.min(fromX, caster.x) - 20, maxX = Math.max(fromX, caster.x) + 20;
          for (const m of this.aliveMonsters()) {
            if (bodyOverlaps(m, minX, fromY - 70, maxX, fromY + 10)) dealt += this.resolveHit(m, desc, fromX);
          }
        }
        break;
      }
      case 'doubleJump': {
        bus.emit('ui:toast', { text: 'Jump while airborne to flash jump.', kind: 'info' });
        break;
      }
      case 'zone': {
        this.runZone(desc, effect, caster);
        break;
      }
      case 'rain': {
        const n = effect.count;
        const cx = caster.x + (effect.offsetX ?? 0);
        for (let i = 0; i < n; i++) {
          this.scene.time.delayedCall((i / n) * effect.durationMs, () => {
            const rx = cx + Phaser.Math.Between(-effect.width / 2, effect.width / 2);
            this.projectiles.spawn({
              x: rx, y: caster.y - 260, vx: 0, vy: 340, gravity: 260, color: desc.vfx?.color ?? '#88ccff', style: desc.vfx?.style ?? 'ice',
              radius: 10, life: 1800, bounds: this.ctx.bounds,
              queryHit: (x, y, already) => {
                const m = this.aliveMonsters().find((mm) => !already.has(mm) && distToBody(mm, x, y) < 7);
                return m ? { x: m.sprite.x, y: m.sprite.y, obj: m } : null;
              },
              onHit: (hit) => { dealt += this.resolveHit(hit.obj as MonsterEntity, desc, caster.x); },
            });
          });
        }
        break;
      }
      case 'heal': {
        caster.heal(this.ctx.getStats().maxHp * effect.pct);
        spawnVfx(this.scene, 'heal', caster.x, caster.y - 16, { color: '#7dffb3' });
        break;
      }
      case 'summon': {
        this.runSummon(desc, effect, caster);
        break;
      }
      case 'none':
        break;
    }
    return dealt;
  }

  private runZone(desc: CastDescriptor, effect: Extract<SkillEffect, { kind: 'zone' }>, caster: PlayerHandle): void {
    let cx = effect.at === 'front' ? caster.x + (effect.offsetX ?? 40) * caster.facing : caster.x;
    const marker = this.scene.add.circle(cx, caster.y - 4, effect.radius, Phaser.Display.Color.HexStringToColor(desc.vfx?.color ?? '#66dd55').color, 0.22).setDepth(4);
    let elapsed = 0;
    const tickMs = effect.tickMs;
    const total = effect.durationMs;
    const timer = this.scene.time.addEvent({
      delay: tickMs, repeat: Math.floor(total / tickMs) - 1,
      callback: () => {
        if (effect.follow) { cx = caster.x; marker.x = cx; }
        for (const m of this.inRadius(cx, caster.y - 4, effect.radius, Infinity)) this.resolveHit(m, desc, cx);
      },
    });
    this.scene.time.delayedCall(total, () => { timer.remove(false); marker.destroy(); });
  }

  private runSummon(desc: CastDescriptor, effect: Extract<SkillEffect, { kind: 'summon' }>, caster: PlayerHandle): void {
    const x = caster.x + caster.facing * 30, y = caster.y;
    const color = Phaser.Display.Color.HexStringToColor(desc.vfx?.color ?? '#ffaa33').color;
    const turret = this.scene.add.circle(x, y - 10, 8, color).setStrokeStyle(2, 0x222222).setDepth(9);
    const timer = this.scene.time.addEvent({
      delay: effect.intervalMs, repeat: Math.floor(effect.durationMs / effect.intervalMs) - 1,
      callback: () => {
        const n = this.nearest(turret.x, turret.y, effect.range);
        if (!n) return;
        const ang = Math.atan2((n.sprite.y - n.sprite.displayHeight / 2) - turret.y, n.sprite.x - turret.x);
        const speed = effect.projectileSpeed ?? 260;
        this.projectiles.spawn({
          x: turret.x, y: turret.y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, color: desc.vfx?.color ?? '#ffaa33',
          style: desc.vfx?.style ?? 'bullet', radius: 8, life: 1500, bounds: this.ctx.bounds,
          queryHit: (px, py, already) => {
            const m = this.aliveMonsters().find((mm) => !already.has(mm) && distToBody(mm, px, py) < 7);
            return m ? { x: m.sprite.x, y: m.sprite.y, obj: m } : null;
          },
          onHit: (hit) => { this.resolveHit(hit.obj as MonsterEntity, desc, turret.x); },
        });
      },
    });
    this.scene.time.delayedCall(effect.durationMs, () => { timer.remove(false); turret.destroy(); });
  }
}
