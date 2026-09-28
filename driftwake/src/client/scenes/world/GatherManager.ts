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
import type { WorldLighting } from '../../render/lighting';

export interface NodeEntry {
  nodeId: string; sprite: Phaser.GameObjects.Sprite; x: number; y: number;
  hitsDone: number; depleted: boolean; respawnAt: number; lightId?: string;
}

/** Gather node bases whose art actually glows (crystal facets / coral polyps) — these carry a
 *  small point light while not depleted. */
const GLOWING_BASES = new Set(['crystal', 'coral']);

function playAnimSafe(sprite: Phaser.GameObjects.Sprite, info: SpriteInfo, name: string): void {
  const k = info.anims[name];
  if (k) sprite.play(k);
}

let nodeLightSeq = 0;

export class GatherManager {
  private nodes: NodeEntry[] = [];
  private lastHitAt = 0;

  constructor(private scene: Phaser.Scene, map: MapDef, private lighting?: WorldLighting | null) {
    for (const g of map.gather) {
      const def = getGatherNodeDef(g.nodeId);
      if (!def) { console.warn(`[GatherManager] unknown gather node "${g.nodeId}" in map ${map.id}`); continue; }
      const info = getGatherNodeSprite(scene, def);
      const sprite = scene.add.sprite(g.x, g.y, info.key, 0).setOrigin(0.5, 1).setDepth(4);
      playAnimSafe(sprite, info, 'idle');
      lighting?.lit(sprite, info.key, { normalMap: false });
      const entry: NodeEntry = { nodeId: g.nodeId, sprite, x: g.x, y: g.y, hitsDone: 0, depleted: false, respawnAt: 0 };
      if (lighting && GLOWING_BASES.has(def.sprite.base)) {
        entry.lightId = `node${nodeLightSeq++}`;
        const color = Phaser.Display.Color.HexStringToColor(def.sprite.color).color;
        lighting.addLight({ id: entry.lightId, x: () => sprite.x, y: () => sprite.y - 8, color, radius: 55, intensity: 0.7, flicker: 0.1 });
      }
      this.nodes.push(entry);
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
      if (entry.lightId) this.lighting?.removeLight(entry.lightId);
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
        if (n.lightId && def && GLOWING_BASES.has(def.sprite.base)) {
          const color = Phaser.Display.Color.HexStringToColor(def.sprite.color).color;
          this.lighting?.addLight({ id: n.lightId, x: () => n.sprite.x, y: () => n.sprite.y - 8, color, radius: 55, intensity: 0.7, flicker: 0.1 });
        }
      }
    }
  }

  destroy(): void {
    for (const n of this.nodes) { n.sprite.destroy(); if (n.lightId) this.lighting?.removeLight(n.lightId); }
    this.nodes = [];
  }
}
