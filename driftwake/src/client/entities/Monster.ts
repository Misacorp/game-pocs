/**
 * Monster entity: movement AI per behavior, contact damage, boss attacks[]/phases[], status effects,
 * hp bar, hit reactions, death.
 */
import Phaser from 'phaser';
import type { DerivedStats, MonsterAttack, MonsterDef } from '@shared/types';
import { rollMonsterDamage } from '@shared/logic';
import { getMonsterSprite, spawnTelegraph, spawnVfx } from '../gfx';
import { audio } from '../audio';
import { bus } from '../events';
import { StatusEffects } from '../combat/StatusEffects';
import type { DamageTextPool } from '../combat/DamageText';
import type { ProjectileManager } from './Projectile';
import { applyBodyBottomAligned, playAnim } from './spriteUtil';

export interface MonsterWorldCtx {
  bounds: { width: number; height: number };
  getPlayer: () => { x: number; y: number; vy: number; grounded: boolean };
  isPlayerDodging: () => boolean;
  getPlayerStats: () => DerivedStats;
  getPlayerLevel: () => number;
  damagePlayer: (amount: number, knockbackDirX: number) => void;
  projectiles: ProjectileManager;
  damageText: DamageTextPool;
  cameraShake: (ms: number, intensity: number) => void;
  hitstop: (ms: number) => void;
  groundYAt: (x: number, fromY: number) => number;
  spawnMonsterNear: (monsterId: string, x: number, y: number, aggro: boolean) => void;
  rng: () => number;
  queryPlayerHit: (x: number, y: number) => { x: number; y: number; obj: unknown } | null;
}

let seq = 0;

export class MonsterEntity {
  readonly uid: string;
  sprite: Phaser.Physics.Arcade.Sprite;
  hp: number;
  maxHp: number;
  facing: 1 | -1 = -1;
  status = new StatusEffects();
  dead = false;
  isBoss: boolean;
  patrolMinX: number;
  patrolMaxX: number;
  onDeath?: (m: MonsterEntity) => void;
  hpBar?: { bg: Phaser.GameObjects.Rectangle; fill: Phaser.GameObjects.Rectangle; label?: Phaser.GameObjects.Text };
  private aggro = false;
  private lastHitAt = 0;
  private contactCooldownUntil = 0;
  private state: 'patrol' | 'chase' | 'telegraph' | 'charging' | 'stagger' = 'patrol';
  private hopTimer = 0;
  private sineT = Math.random() * Math.PI * 2;
  private chargeDirX = 1;
  private chargeUntil = 0;
  private telegraphUntil = 0;
  private attackCooldowns = new Map<string, number>();
  private phaseIndex = -1;
  private homeX: number;
  private homeY: number;
  private flashUntil = 0;

  constructor(
    private scene: Phaser.Scene,
    public def: MonsterDef,
    x: number, y: number,
    private ctx: MonsterWorldCtx,
  ) {
    this.uid = `mon${++seq}`;
    this.isBoss = def.behavior === 'boss' || !!def.isBoss;
    this.hp = def.hp; this.maxHp = def.hp;
    this.homeX = x; this.homeY = y;
    this.patrolMinX = x - 90; this.patrolMaxX = x + 90;
    if (def.immune) for (const k of def.immune) this.status.immune.add(k);

    const info = getMonsterSprite(scene, def);
    this.sprite = scene.physics.add.sprite(x, y, info.key, 0).setOrigin(0.5, 1).setDepth(9);
    applyBodyBottomAligned(this.sprite, info);
    (this.sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(def.behavior !== 'flyer');
    this.sprite.setData('info', info);
    this.sprite.setData('monster', this);
    playAnim(this.sprite, info, 'idle');

    if (this.isBoss) {
      const scale = def.sprite.scale ?? 3;
      this.sprite.setScale(scale);
      bus.emit('ui:banner', { title: def.name, subtitle: def.title, kind: 'boss' });
      audio.playSfx('bossRoar');
      this.publishBossBar();
    }
  }

  private info() { return this.sprite.getData('info'); }

  setPatrolRange(minX: number, maxX: number): void { this.patrolMinX = minX; this.patrolMaxX = maxX; }
  setAggro(v: boolean): void { this.aggro = v; }

  private publishBossBar(): void {
    bus.emit('ui:bossBar', this.dead ? null : { name: this.def.name, title: this.def.title, hp: Math.max(0, this.hp), maxHp: this.maxHp });
  }

  /** Called by SkillRunner / player attacks. Returns true if the hit landed (monster alive after). */
  takeDamage(amount: number, opts: { crit?: boolean; knockback?: number; sourceX?: number } = {}): void {
    if (this.dead) return;
    this.hp -= amount;
    this.lastHitAt = performance.now();
    if (!this.aggro && this.def.behavior !== 'stationary') this.aggro = true;
    const info = this.info();
    playAnim(this.sprite, info, 'hurt');
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => { if (!this.dead) this.sprite.clearTint(); });
    this.ctx.damageText.spawn(this.sprite.x, this.sprite.y - this.sprite.displayHeight, Math.round(amount), opts.crit ? 'crit' : 'normal', this.uid);
    if (opts.crit) { this.ctx.hitstop(45); this.ctx.cameraShake(90, 0.003); audio.playSfx('crit'); }
    else audio.playSfx('hit');
    if (opts.knockback && (this.def.knockbackResist ?? 0) < 1) {
      const kb = opts.knockback * (1 - (this.def.knockbackResist ?? 0));
      const dir = opts.sourceX !== undefined ? Math.sign(this.sprite.x - opts.sourceX) || 1 : this.facing;
      this.sprite.setVelocity(dir * kb, -60);
    }
    if (this.isBoss) this.publishBossBar();
    if (this.hp <= 0) this.die();
  }

  private die(): void {
    if (this.dead) return;
    this.dead = true;
    this.status.clear();
    const info = this.info();
    playAnim(this.sprite, info, 'die');
    audio.playSfx('monsterDie');
    this.sprite.body.enable = false;
    this.hpBar?.bg.destroy(); this.hpBar?.fill.destroy(); this.hpBar?.label?.destroy();
    if (this.isBoss) { bus.emit('ui:bossBar', null); audio.playSfx('bossRoar'); }
    this.scene.tweens.add({
      targets: this.sprite, alpha: 0, y: this.sprite.y - 10, duration: 600, ease: 'Quad.easeOut',
      onComplete: () => { this.onDeath?.(this); this.sprite.destroy(); },
    });
  }

  private ensureHpBar(): void {
    if (this.isBoss || this.hpBar) return;
    const w = 30;
    const bg = this.scene.add.rectangle(this.sprite.x, this.sprite.y - this.sprite.displayHeight - 8, w, 4, 0x000000, 0.6).setDepth(10);
    const fill = this.scene.add.rectangle(this.sprite.x - w / 2, this.sprite.y - this.sprite.displayHeight - 8, w, 4, 0xff4444, 0.95).setOrigin(0, 0.5).setDepth(10.1);
    this.hpBar = { bg, fill };
  }

  private updateHpBar(): void {
    if (this.isBoss) return;
    const showing = this.hp < this.maxHp && !this.dead;
    if (!showing) { if (this.hpBar) { this.hpBar.bg.setVisible(false); this.hpBar.fill.setVisible(false); } return; }
    this.ensureHpBar();
    if (!this.hpBar) return;
    const { bg, fill } = this.hpBar;
    bg.setVisible(true).setPosition(this.sprite.x, this.sprite.y - this.sprite.displayHeight - 8);
    const w = bg.width;
    fill.setVisible(true).setPosition(this.sprite.x - w / 2, bg.y);
    fill.width = Math.max(0, w * (this.hp / this.maxHp));
  }

  private aggroRange(): number { return this.isBoss ? 260 : this.def.aggressive ? 160 : 40; }

  update(dtMs: number): void {
    if (this.dead) return;
    const now = performance.now();
    const dt = dtMs / 1000;
    const p = this.ctx.getPlayer();
    const dx = p.x - this.sprite.x, dy = p.y - this.sprite.y;
    const dist = Math.hypot(dx, dy);

    // aggro management
    if (this.def.aggressive && dist < this.aggroRange()) this.aggro = true;
    if (!this.def.aggressive && !this.aggro) { /* only aggro on hit */ }
    if (this.aggro && !this.isBoss && dist > this.aggroRange() * 2.2 && now - this.lastHitAt > 6000) this.aggro = false;

    this.status.update(now, (kind, power) => {
      const dot = Math.max(1, Math.round(this.maxHp * power * 0.03));
      this.hp -= dot;
      this.ctx.damageText.spawn(this.sprite.x, this.sprite.y - this.sprite.displayHeight, dot, 'normal', this.uid);
      if (this.hp <= 0) this.die();
    });
    if (this.status.isStunned(now)) { this.sprite.setVelocityX(0); this.updateVisualTint(now); this.updateHpBar(); return; }

    const info = this.info();
    const speedMult = this.status.speedMult(now);

    if (this.isBoss) this.updateBoss(now, dt, p, dist);
    else this.updateNormal(now, dt, p, dist, speedMult, info);

    this.updateVisualTint(now);
    this.updateHpBar();

    // contact damage
    if (now > this.contactCooldownUntil && dist < (this.isBoss ? 40 : 18) && Math.abs(dy) < (this.isBoss ? 50 : 26)) {
      this.tryContactDamage(p);
    }
  }

  private updateVisualTint(now: number): void {
    if (now < this.flashUntil) return;
    const tint = this.status.currentTint(now);
    if (tint !== null) this.sprite.setTint(tint); else this.sprite.clearTint();
  }

  private tryContactDamage(p: { x: number }): void {
    if (this.ctx.isPlayerDodging()) return;
    const stats = this.ctx.getPlayerStats();
    if (this.ctx.rng() < stats.avoid) return;
    this.contactCooldownUntil = performance.now() + 700;
    const dmg = rollMonsterDamage(this.def, 1, stats, this.ctx.getPlayerLevel(), this.ctx.rng);
    this.ctx.damagePlayer(dmg, Math.sign(p.x - this.sprite.x) || 1);
  }

  // ---- normal (non-boss) behavior -----------------------------------------
  private updateNormal(now: number, dt: number, p: { x: number; y: number }, dist: number, speedMult: number, info: any): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const chasing = this.aggro && dist < this.aggroRange() * 2.5;
    const speed = this.def.speed * speedMult * (chasing ? 1.3 : 1);

    switch (this.def.behavior) {
      case 'stationary': {
        body.setVelocityX(0);
        this.facing = p.x < this.sprite.x ? -1 : 1;
        this.sprite.setFlipX(this.facing === -1);
        if (this.aggro || this.def.aggressive) this.runAttacks(now, p, dist);
        playAnim(this.sprite, info, 'idle');
        break;
      }
      case 'flyer': {
        this.sineT += dt;
        const targetX = chasing ? p.x : Phaser.Math.Clamp(this.sprite.x, this.patrolMinX, this.patrolMaxX);
        const dirX = chasing ? Math.sign(p.x - this.sprite.x) : Math.sign((this.patrolMinX + this.patrolMaxX) / 2 - this.sprite.x) || 1;
        body.setVelocityX(dirX * speed * (chasing ? 1.6 : 0.6));
        const bob = Math.sin(this.sineT * 2) * 40;
        const baseY = chasing ? p.y - 10 : this.homeY;
        body.setVelocityY((baseY + bob - this.sprite.y) * 2.2);
        if (Math.abs(this.sprite.x - targetX) < 4 && !chasing) body.setVelocityX(0);
        this.facing = body.velocity.x < 0 ? -1 : body.velocity.x > 0 ? 1 : this.facing;
        this.sprite.setFlipX(this.facing === -1);
        playAnim(this.sprite, info, 'move');
        break;
      }
      case 'hopper': {
        this.hopTimer -= dt * 1000;
        if (body.blocked.down || body.touching.down) {
          if (this.hopTimer <= 0) {
            const dirX = chasing ? Math.sign(p.x - this.sprite.x) || this.facing : (this.sprite.x <= this.patrolMinX ? 1 : this.sprite.x >= this.patrolMaxX ? -1 : this.facing);
            this.facing = dirX as 1 | -1;
            body.setVelocity(dirX * speed * 1.4, -190);
            playAnim(this.sprite, info, 'move');
            this.hopTimer = chasing ? 500 : Phaser.Math.Between(700, 1400);
          } else {
            body.setVelocityX(body.velocity.x * 0.85);
          }
        }
        this.sprite.setFlipX(this.facing === -1);
        break;
      }
      case 'charger': {
        if (this.state === 'telegraph') {
          body.setVelocityX(0);
          this.sprite.setTint(now % 200 < 100 ? 0xff5555 : 0xffffff);
          if (now > this.telegraphUntil) {
            this.state = 'charging';
            this.chargeDirX = Math.sign(p.x - this.sprite.x) || this.facing;
            this.chargeUntil = now + 550;
            this.flashUntil = now + 560;
            audio.playSfx('gunshot');
          }
          break;
        }
        if (this.state === 'charging') {
          this.sprite.clearTint();
          body.setVelocityX(this.chargeDirX * speed * 3.2);
          this.facing = this.chargeDirX as 1 | -1;
          this.sprite.setFlipX(this.facing === -1);
          playAnim(this.sprite, info, 'attack');
          if (now > this.chargeUntil || body.blocked.left || body.blocked.right) { this.state = 'patrol'; body.setVelocityX(0); }
          break;
        }
        if (chasing && dist < 130 && now > (this.attackCooldowns.get('charge') ?? 0)) {
          this.state = 'telegraph'; this.telegraphUntil = now + 500;
          this.attackCooldowns.set('charge', now + 3200);
          spawnTelegraph(this.scene, 'rect', this.sprite.x + (p.x > this.sprite.x ? 40 : -40), this.sprite.y - 12, 90, 24, 500);
          break;
        }
        this.patrolOrChase(body, p, chasing, speed, info);
        break;
      }
      case 'walker':
      default: {
        this.patrolOrChase(body, p, chasing, speed, info);
        break;
      }
    }
  }

  private patrolOrChase(body: Phaser.Physics.Arcade.Body, p: { x: number }, chasing: boolean, speed: number, info: any): void {
    let dirX: number;
    if (chasing) dirX = Math.sign(p.x - this.sprite.x) || this.facing;
    else {
      if (this.sprite.x <= this.patrolMinX) dirX = 1;
      else if (this.sprite.x >= this.patrolMaxX) dirX = -1;
      else dirX = this.facing;
    }
    if (body.blocked.left && dirX < 0) dirX = 1;
    if (body.blocked.right && dirX > 0) dirX = -1;
    this.facing = dirX as 1 | -1;
    body.setVelocityX(dirX * speed);
    this.sprite.setFlipX(this.facing === -1);
    playAnim(this.sprite, info, Math.abs(body.velocity.x) > 4 ? 'move' : 'idle');
  }

  // ---- boss ----------------------------------------------------------------
  private currentPhase() {
    if (!this.def.phases || this.def.phases.length === 0) return null;
    const frac = this.hp / this.maxHp;
    let best = this.def.phases[0];
    for (const ph of this.def.phases) if (frac <= ph.hpBelow) best = ph;
    return best;
  }

  private updateBoss(now: number, _dt: number, p: { x: number; y: number }, dist: number): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const phase = this.currentPhase();
    const phIdx = this.def.phases ? this.def.phases.indexOf(phase!) : -1;
    if (phase && phIdx !== this.phaseIndex) {
      this.phaseIndex = phIdx;
      if (phase.shout) bus.emit('ui:banner', { title: this.def.name, subtitle: phase.shout, kind: 'boss' });
      audio.playSfx('bossRoar');
      this.ctx.cameraShake(200, 0.006);
    }
    if (this.state === 'telegraph' || this.state === 'charging') {
      // handled by delayed callbacks scheduled in runAttacks(); keep idle drift
      body.setVelocityX(0);
      return;
    }
    // gentle drift/face player
    const dirX = Math.sign(p.x - this.sprite.x);
    this.facing = (dirX || this.facing) as 1 | -1;
    this.sprite.setFlipX(this.facing === -1);
    const speedMult = phase?.speedMult ?? 1;
    body.setVelocityX(dist > 90 ? dirX * this.def.speed * 0.6 * speedMult : 0);
    this.runAttacks(now, p, dist, phase?.attacks);
  }

  private runAttacks(now: number, p: { x: number; y: number }, dist: number, allowedIds?: string[]): void {
    const attacks = this.def.attacks;
    if (!attacks || attacks.length === 0) return;
    const pool = allowedIds ? attacks.filter((a) => allowedIds.includes(a.id)) : attacks;
    for (const atk of pool) {
      const readyAt = this.attackCooldowns.get(atk.id) ?? 0;
      if (now < readyAt) continue;
      if (dist > atk.range) continue;
      this.attackCooldowns.set(atk.id, now + atk.cooldownMs);
      this.telegraphAndFire(atk, p);
      break; // one attack decision per tick
    }
  }

  private telegraphAndFire(atk: MonsterAttack, p: { x: number; y: number }): void {
    const targetX = p.x, targetY = p.y;
    this.state = 'telegraph';
    playAnim(this.sprite, this.info(), 'attack');
    const color = atk.color ?? '#ff3344';
    switch (atk.kind) {
      case 'projectile':
        spawnTelegraph(this.scene, 'circle', this.sprite.x, this.sprite.y - 20, 20, 20, atk.telegraphMs, color);
        break;
      case 'slam':
        spawnTelegraph(this.scene, 'circle', targetX, targetY, atk.radius ?? 60, atk.radius ?? 60, atk.telegraphMs, color);
        break;
      case 'shockwave':
        spawnTelegraph(this.scene, 'rect', this.sprite.x, this.ctx.groundYAt(this.sprite.x, this.sprite.y) - 4, this.ctx.bounds.width, 10, atk.telegraphMs, color);
        break;
      case 'beam':
        spawnTelegraph(this.scene, 'rect', this.ctx.bounds.width / 2, this.sprite.y, this.ctx.bounds.width, 20, atk.telegraphMs, color);
        break;
      case 'rain':
        spawnTelegraph(this.scene, 'rect', targetX, targetY - 100, 140, 200, atk.telegraphMs, color);
        break;
      case 'leap':
        spawnTelegraph(this.scene, 'circle', targetX, targetY, atk.radius ?? 50, atk.radius ?? 50, atk.telegraphMs, color);
        break;
      case 'summon':
        spawnTelegraph(this.scene, 'circle', this.sprite.x, this.sprite.y - 10, 40, 40, atk.telegraphMs, '#aa66ff');
        break;
      case 'charge':
        spawnTelegraph(this.scene, 'rect', this.sprite.x + (targetX > this.sprite.x ? 60 : -60), this.sprite.y - 12, 120, 24, atk.telegraphMs, color);
        break;
    }
    this.scene.time.delayedCall(atk.telegraphMs, () => { if (!this.dead) this.fireAttack(atk, targetX, targetY); });
  }

  private fireAttack(atk: MonsterAttack, targetX: number, targetY: number): void {
    const dmg = Math.round(this.def.attack * atk.damageMult);
    const dealToPlayerIfNear = (x: number, y: number, radius: number) => {
      const p = this.ctx.getPlayer();
      if (Math.hypot(p.x - x, p.y - y) <= radius && !this.ctx.isPlayerDodging()) {
        const stats = this.ctx.getPlayerStats();
        if (this.ctx.rng() >= stats.avoid) this.ctx.damagePlayer(dmg, Math.sign(p.x - x) || 1);
      }
    };
    switch (atk.kind) {
      case 'projectile': {
        const count = atk.count ?? 1;
        for (let i = 0; i < count; i++) {
          const spread = (i - (count - 1) / 2) * 0.25;
          const ang = Math.atan2(targetY - this.sprite.y, targetX - this.sprite.x) + spread;
          const speed = atk.projectileSpeed ?? 220;
          this.ctx.projectiles.spawn({
            x: this.sprite.x, y: this.sprite.y - 16, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
            color: atk.color ?? '#ff5566', style: atk.vfx ?? 'bolt', radius: 9, life: 3000, bounds: this.ctx.bounds,
            queryHit: (x, y) => this.ctx.queryPlayerHit(x, y),
            onHit: () => {
              if (this.ctx.isPlayerDodging()) return;
              const stats = this.ctx.getPlayerStats();
              if (this.ctx.rng() >= stats.avoid) this.ctx.damagePlayer(dmg, Math.sign(targetX - this.sprite.x) || 1);
            },
          });
        }
        break;
      }
      case 'slam':
        spawnVfx(this.scene, atk.vfx ?? 'explosion', targetX, targetY, { color: atk.color ?? '#ff5544', width: (atk.radius ?? 60) * 2, height: (atk.radius ?? 60) });
        dealToPlayerIfNear(targetX, targetY, atk.radius ?? 60);
        this.ctx.cameraShake(150, 0.004);
        break;
      case 'charge': {
        this.state = 'charging';
        const dirX = Math.sign(targetX - this.sprite.x) || this.facing;
        const body = this.sprite.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(dirX * this.def.speed * 3);
        this.scene.time.delayedCall(500, () => { this.state = 'patrol'; body.setVelocityX(0); });
        this.scene.time.addEvent({ delay: 60, repeat: 7, callback: () => dealToPlayerIfNear(this.sprite.x, this.sprite.y - 16, 26) });
        break;
      }
      case 'summon':
        for (let i = 0; i < (atk.summonCount ?? 1); i++) {
          this.ctx.spawnMonsterNear(atk.summonId ?? this.def.id, this.sprite.x + Phaser.Math.Between(-40, 40), this.sprite.y, true);
        }
        break;
      case 'beam':
        spawnVfx(this.scene, 'lightning', this.ctx.bounds.width / 2, this.sprite.y, { color: atk.color ?? '#66e0ff', width: this.ctx.bounds.width, height: 20, durationMs: 200 });
        dealToPlayerIfNear(this.ctx.getPlayer().x, this.sprite.y, 30);
        this.ctx.cameraShake(120, 0.003);
        break;
      case 'rain': {
        const n = atk.count ?? 6;
        for (let i = 0; i < n; i++) {
          this.scene.time.delayedCall(i * 90, () => {
            const rx = targetX + Phaser.Math.Between(-70, 70);
            this.ctx.projectiles.spawn({
              x: rx, y: this.sprite.y - 260, vx: 0, vy: 380, gravity: 300, color: atk.color ?? '#ffaa33', style: atk.vfx ?? 'fire',
              radius: 10, life: 1600, bounds: this.ctx.bounds,
              queryHit: (x, y) => this.ctx.queryPlayerHit(x, y),
              onHit: () => dealToPlayerIfNear(rx, targetY, 20),
              explodeRadius: 18,
            });
          });
        }
        break;
      }
      case 'shockwave': {
        const groundY = this.ctx.groundYAt(this.sprite.x, this.sprite.y);
        for (const dir of [-1, 1]) {
          let x = this.sprite.x;
          this.scene.time.addEvent({
            delay: 30, repeat: 24,
            callback: () => {
              x += dir * 22;
              const p = this.ctx.getPlayer();
              const airborne = p.y < groundY - 40;
              if (!airborne) dealToPlayerIfNear(x, groundY - 10, 20);
            },
          });
        }
        this.ctx.cameraShake(180, 0.004);
        break;
      }
      case 'leap': {
        this.scene.tweens.add({
          targets: this.sprite, x: targetX, duration: 380, ease: 'Quad.easeIn',
          onComplete: () => {
            spawnVfx(this.scene, 'explosion', targetX, targetY, { color: atk.color ?? '#ff8844', width: (atk.radius ?? 50) * 2, height: atk.radius ?? 50 });
            dealToPlayerIfNear(targetX, targetY, atk.radius ?? 50);
            this.ctx.cameraShake(160, 0.005);
          },
        });
        break;
      }
    }
    this.state = 'patrol';
  }

  destroy(): void {
    this.status.clear();
    this.hpBar?.bg.destroy(); this.hpBar?.fill.destroy(); this.hpBar?.label?.destroy();
    this.sprite.destroy();
  }
}
