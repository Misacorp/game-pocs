/**
 * Rendering quality tiers, read from localStorage ('driftwake:gfx') with a live-updating
 * subscription to the shared event bus ('settings:changed', emitted by the Settings window once
 * the UI/brand agent wires up its control). Also exposes the independent 'driftwake:shake' flag.
 *
 * Every render subsystem (sky shaders, Light2D, postFX, atmosphere) reads `getQuality()` at scene
 * *creation* time only — WorldScene listens for 'settings:changed' itself and restarts the scene,
 * which is the simplest way to guarantee every quality-gated subsystem (shaders, lights, custom
 * pipelines, RenderTextures) gets torn down and rebuilt cleanly rather than trying to hot-swap
 * a Light2D scene or postFX chain in place.
 */
import Phaser from 'phaser';
import { bus } from '../events';

export type Quality = 'low' | 'medium' | 'high';

const STORAGE_KEY = 'driftwake:gfx';
const SHAKE_KEY = 'driftwake:shake';

function readStorage(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function getQuality(): Quality {
  const v = readStorage(STORAGE_KEY);
  if (v === 'low' || v === 'medium' || v === 'high') return v;
  return 'high';
}

export function isShakeEnabled(): boolean {
  return readStorage(SHAKE_KEY) !== 'off';
}

/** True only for a real WebGL renderer — every shader/Light2D/postFX subsystem must gate on this
 *  and fall back to the plain old look on the Canvas renderer (or if WebGL init failed). */
export function isWebGLAvailable(scene: Phaser.Scene): boolean {
  try { return scene.sys.game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer; } catch { return false; }
}

/** Subscribe to 'settings:changed'; returns an unsubscribe function. */
export function onSettingsChanged(cb: () => void): () => void {
  return bus.on('settings:changed', cb);
}
