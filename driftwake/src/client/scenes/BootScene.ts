import Phaser from 'phaser';
import { registerBaseTextures } from '../gfx';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    registerBaseTextures(this);
    this.game.events.emit('boot-complete');
  }
}
