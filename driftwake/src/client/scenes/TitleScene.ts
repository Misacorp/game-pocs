/**
 * TitleScene — an animated parallax backdrop rendered behind the DOM title/char-select UI.
 * The UI module draws its DOM screens on top of the canvas via #ui; this scene just keeps the
 * canvas alive and pretty underneath it.
 */
import Phaser from 'phaser';
import { createParallax, createWeather, type Parallax, type Weather } from '../gfx';

export class TitleScene extends Phaser.Scene {
  private parallax!: Parallax;
  private weatherFx!: Weather;

  constructor() { super('Title'); }

  create(): void {
    this.cameras.main.setZoom(1);
    this.parallax = createParallax(this, 'driftmoor', this.scale.width, this.scale.height);
    this.weatherFx = createWeather(this, 'embers');
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.events.once('shutdown', () => { this.parallax?.destroy(); this.weatherFx?.destroy(); });
  }

  update(_time: number, delta: number): void {
    this.parallax.update(this.cameras.main);
    this.weatherFx.update(this.cameras.main, delta);
  }
}
