/**
 * Gather nodes (MapDef.gather + GATHER_NODES/fixtures): Z near a node plays hits with progress,
 * dispatches {type:'gather'} once fully harvested, shows a depleted state for respawnMs, and
 * toasts if the player's profession level is too low.
 */
import Phaser from 'phaser';
import type { MapDef } from '@shared/types';
import type { SpriteInfo } from '../../gfx';
import { getGatherNodeSprite } from '../../gfx';
import { getGatherNodeDef } from '../../dev/fixtures';
import { session } from '../../session';
import { bus } from '../../events';

export interface NodeEntry {
  nodeId: string; sprite: Phaser.GameObjects.Sprite; x: number; y: number;
  hitsDone: number; depleted: boolean; respawnAt: number;
}

function playAnimSafe(sprite: Phaser.GameObjects.Sprite, info: SpriteInfo, name: string): void {
  const k = info.anims[name];
  if (k) sprite.play(k);
}

export class GatherManager {
  private nodes: NodeEntry[] = [];
  private lastHitAt = 0;

  constructor(private scene: Phaser.Scene, map: MapDef) {
    for (const g of map.gather) {
      const def = getGatherNodeDef(g.nodeId);
      if (!def) { console.warn(`[GatherManager] unknown gather node "${g.nodeId}" in map ${map.id}`); continue; }
      const info = getGatherNodeSprite(scene, def);
      const sprite = scene.add.sprite(g.x, g.y, info.key, 0).setOrigin(0.5, 1).setDepth(4);
      playAnimSafe(sprite, info, 'idle');
      this.nodes.push({ nodeId: g.nodeId, sprite, x: g.x, y: g.y, hitsDone: 0, depleted: false, respawnAt: 0 });
    }
  }

  nearby(x: number, y: number, range = 30): NodeEntry | null {
    let best: NodeEntry | null = null; let bestD = range;
    for (const n of this.nodes) {
      if (n.depleted) continue;
      const d = Phaser.Math.Distance.Between(x, y, n.x, n.y);
      if (d < bestD) { bestD = d; best = n; }
    }
    return best;
  }

  interact(entry: NodeEntry): void {
    const now = performance.now();
    if (now - this.lastHitAt < 260) return;
    this.lastHitAt = now;
    const def = getGatherNodeDef(entry.nodeId);
    if (!def) return;
    const profLevel = session.state.professions[def.profession]?.level ?? 0;
    if (profLevel < def.level) {
      bus.emit('ui:toast', { text: `Requires ${def.profession} level ${def.level}.`, kind: 'warn' });
      return;
    }
    entry.hitsDone++;
    this.scene.tweens.add({ targets: entry.sprite, angle: 6, duration: 60, yoyo: true });
    bus.emit('ui:toast', { text: `${def.name}: ${entry.hitsDone}/${def.hits}`, kind: 'info' });
    if (entry.hitsDone >= def.hits) {
      entry.depleted = true;
      entry.respawnAt = now + def.respawnMs;
      const info = getGatherNodeSprite(this.scene, def);
      playAnimSafe(entry.sprite, info, 'depleted');
      entry.sprite.setAlpha(0.4);
      session.dispatch({ type: 'gather', nodeId: entry.nodeId, mapId: session.state.mapId });
    }
  }

  update(): void {
    const now = performance.now();
    for (const n of this.nodes) {
      if (n.depleted && now >= n.respawnAt) {
        n.depleted = false; n.hitsDone = 0; n.sprite.setAlpha(1);
        const def = getGatherNodeDef(n.nodeId);
        if (def) playAnimSafe(n.sprite, getGatherNodeSprite(this.scene, def), 'idle');
      }
    }
  }

  destroy(): void { for (const n of this.nodes) n.sprite.destroy(); this.nodes = []; }
}
