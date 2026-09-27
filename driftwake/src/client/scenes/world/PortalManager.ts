/**
 * Spawns portals from MapDef.portals with a label; ↑ near one uses it (reqs checked via shared logic,
 * locked text shown as a toast otherwise); all actual map transitions happen when 'mapChanged' arrives.
 */
import Phaser from 'phaser';
import type { MapDef, PortalDef } from '@shared/types';
import { checkConditions } from '@shared/logic';
import { session } from '../../session';
import { bus } from '../../events';
import { getPortalSprite } from '../../gfx';
import { makeCrispLabel } from '../../entities/spriteUtil';

interface PortalEntry { def: PortalDef; sprite: Phaser.GameObjects.Sprite; label: Phaser.GameObjects.Text }

export class PortalManager {
  private entries: PortalEntry[] = [];

  constructor(private scene: Phaser.Scene, map: MapDef) {
    const info = getPortalSprite(scene);
    for (const p of map.portals) {
      const sprite = scene.add.sprite(p.x, p.y, info.key, 0).setOrigin(0.5, 1).setDepth(3);
      if (info.anims.idle) sprite.play(info.anims.idle);
      const label = makeCrispLabel(scene, p.x, p.y - info.frameHeight - 4, p.label ?? p.to, { color: '#bfe9ff' })
        .setOrigin(0.5, 1).setDepth(3.1);
      this.entries.push({ def: p, sprite, label });
    }
  }

  nearby(x: number, y: number, range = 36): PortalDef | null {
    let best: PortalDef | null = null; let bestD = range;
    for (const e of this.entries) {
      const d = Phaser.Math.Distance.Between(x, y, e.def.x, e.def.y);
      if (d < bestD) { bestD = d; best = e.def; }
    }
    return best;
  }

  positions(): { x: number; y: number }[] { return this.entries.map((e) => ({ x: e.def.x, y: e.def.y })); }

  use(p: PortalDef): void {
    if (!checkConditions(session.state, p.reqs)) {
      bus.emit('ui:toast', { text: p.lockedText ?? 'This way is locked.', kind: 'warn' });
      return;
    }
    session.dispatch({ type: 'changeMap', mapId: p.to, portalId: p.toPortal, fromPortalId: p.id });
  }

  destroy(): void { for (const e of this.entries) { e.sprite.destroy(); e.label.destroy(); } this.entries = []; }
}
