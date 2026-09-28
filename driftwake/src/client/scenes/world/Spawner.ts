/**
 * Spawns monsters per MapDef.spawns (within their x/y range, on the terrain), tracks per-spawn
 * respawn timers, and spawns the map boss when its reqs pass. Also used by boss "summon" attacks.
 */
import Phaser from 'phaser';
import type { MapDef, MonsterDef, SpawnDef } from '@shared/types';
import { checkConditions } from '@shared/logic';
import { DEFAULT_RESPAWN_MS } from '@shared/constants';
import { session } from '../../session';
import { getMonsterDef } from '../../dev/fixtures';
import { MonsterEntity, type MonsterWorldCtx } from '../../entities/Monster';
import { onewayProcess, type Terrain } from './Terrain';

interface PendingRespawn { monsterId: string; x: number; y: number; respawnMs: number; readyAt: number }

export class Spawner {
  monsters: MonsterEntity[] = [];
  private pending: PendingRespawn[] = [];

  constructor(
    private scene: Phaser.Scene,
    private map: MapDef,
    private terrain: Terrain,
    private makeCtx: () => MonsterWorldCtx,
    private onDeath: (m: MonsterEntity) => void,
  ) {}

  init(): void {
    for (const s of this.map.spawns) {
      const def = getMonsterDef(s.monsterId);
      if (!def) { console.warn(`[Spawner] unknown monster id "${s.monsterId}" in map ${this.map.id}`); continue; }
      for (let i = 0; i < s.count; i++) this.spawnFromSpawnDef(def, s);
    }
    if (this.map.boss) {
      const b = this.map.boss;
      if (checkConditions(session.state, b.reqs)) {
        const def = getMonsterDef(b.monsterId);
        if (def) this.spawnOne(def, b.x, b.y, false, b.respawnMs);
        else console.warn(`[Spawner] unknown boss monster id "${b.monsterId}" in map ${this.map.id}`);
      }
    }
  }

  private spawnFromSpawnDef(def: MonsterDef, s: SpawnDef): void {
    const x1 = s.x1 ?? 60, x2 = s.x2 ?? this.map.width - 60;
    const x = Phaser.Math.Between(Math.round(Math.min(x1, x2)), Math.round(Math.max(x1, x2)));
    const y = this.terrain.groundYAt(x, 0);
    this.spawnOne(def, x, y, false, s.respawnMs ?? def.respawnMs ?? DEFAULT_RESPAWN_MS);
  }

  spawnOne(def: MonsterDef, x: number, y: number, forceAggro: boolean, respawnMs?: number): MonsterEntity {
    const m = new MonsterEntity(this.scene, def, x, y, this.makeCtx());
    const seg = this.terrain.platformSegmentAt(x);
    m.setPatrolRange(seg.minX, seg.maxX);
    if (forceAggro) m.setAggro(true);
    if (def.behavior !== 'flyer') {
      this.scene.physics.add.collider(m.sprite, this.terrain.solidGroup);
      this.scene.physics.add.collider(m.sprite, this.terrain.onewayGroup, undefined, onewayProcess(() => 0));
    }
    m.onDeath = (mm) => {
      this.monsters = this.monsters.filter((e) => e !== mm);
      this.onDeath(mm);
      if (respawnMs) this.pending.push({ monsterId: def.id, x, y, respawnMs, readyAt: performance.now() + respawnMs });
    };
    this.monsters.push(m);
    return m;
  }

  /** Ephemeral, non-respawning spawn — used by boss "summon" attacks. */
  spawnNear(monsterId: string, x: number, y: number): void {
    const def = getMonsterDef(monsterId);
    if (!def) { console.warn(`[Spawner] unknown summon monster id "${monsterId}"`); return; }
    this.spawnOne(def, x, y, true, undefined);
  }

  update(): void {
    if (this.pending.length === 0) return;
    const now = performance.now();
    if (!this.pending.some((p) => p.readyAt <= now)) return;
    const ready = this.pending.filter((p) => p.readyAt <= now);
    this.pending = this.pending.filter((p) => p.readyAt > now);
    for (const p of ready) {
      const def = getMonsterDef(p.monsterId);
      if (def) this.spawnOne(def, p.x, p.y, false, p.respawnMs);
    }
  }

  destroy(): void {
    for (const m of this.monsters) m.destroy();
    this.monsters = [];
    this.pending = [];
  }
}
