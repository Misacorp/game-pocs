/**
 * WorldScene — the gameplay scene. STUB — the engine module replaces this.
 * Started with data { mapId, portalId? }.
 */
import Phaser from 'phaser';

export interface WorldSceneData { mapId: string; portalId?: string }

export class WorldScene extends Phaser.Scene {
  constructor() { super('World'); }
  create(data: WorldSceneData) {
    this.add.text(20, 20, `World: ${data.mapId}`, { color: '#fff' }).setScrollFactor(0);
  }
}
