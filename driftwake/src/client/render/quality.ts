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

/** The Settings window (ui/windows/settings.ts) stores these JSON-encoded via its own `store`
 *  helper (`JSON.stringify('high')` -> the 6 characters `"high"`, quotes included) — read them the
 *  same way rather than as raw strings, or a real value here will never match. */
function readStoredString(key: string): string | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    try { return JSON.parse(raw); } catch { return raw; } // tolerate a raw (non-JSON) value too
  } catch { return null; }
}

export function getQuality(): Quality {
  const v = readStoredString(STORAGE_KEY);
  if (v === 'low' || v === 'medium' || v === 'high') return v;
  return 'high';
}

export function isShakeEnabled(): boolean {
  return readStoredString(SHAKE_KEY) !== 'off';
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
