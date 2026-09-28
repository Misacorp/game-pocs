/**
 * World Light2D wiring: ambient color per theme, the light budget (LightManager), and the
 * normal-map-on-first-use hook that lets any already-registered gfx texture opt into lighting
 * without the gfx modules themselves knowing anything about Light2D.
 */
import Phaser from 'phaser';
import type { ThemeId } from '@shared/types';
import { buildNormalMapFromAlpha } from '../gfx/canvasKit';
import { LightManager, type LightSource } from './LightManager';
import { isWebGLAvailable, type Quality } from './quality';
import { DRIFTWAKE_LIGHT_KEY } from './pipelines/LightingPipeline';

/** Ambient color per theme — warm dusk in town, bright daylight in the fields, deep blue/near-black
 *  in caves and the reef, sickly violet/red in the Blight zones. Deliberately separate from
 *  gfx/palette.ts (owned by the sprite artist) since this is a lighting-only concern. */
const AMBIENT: Record<ThemeId, number> = {
  // Tuning pass 3: sprites are now lit through DriftwakeLightPipeline (pipelines/LightingPipeline.ts)
  // instead of stock Light2D — the combined ambient+lights gain is run through a soft-knee
  // highlight rolloff (identity below ~0.85, eased/capped at 1.35 above it) before it multiplies the
  // albedo, so stacking no longer clips straight to flat white. That headroom is what let pass 2's
  // player/decor LIGHT_SCALE come back up a little in the bright daylight themes (a small, evenly-
  // distributed fill reads fine now that it can't blow out) while dark themes needed no further
  // change — they were only ever clipping because of the old hard clip, not because they were
  // under-lit; the rolloff makes the same intensities read as a proper glow instead of a white blob.
  driftmoor: 0x584a60,
  meadow: 0x7f93aa,
  grotto: 0x1c2f2a,
  kelpwood: 0x1e3f30,
  galeoutpost: 0x76819e,
  stormspire: 0x363a52,
  lanternreef: 0x1c3454,
  galleon: 0x163a2a,
  hollow: 0x33193f,
  heart: 0x341318,
};

/** Multiplies every light's authored intensity (player/NPC/monster personal lights, decor,
 *  projectiles, hit-flashes...) by theme so the same nominal intensities read as a subtle fill in
 *  bright daylight (no hotspots on the player/NPCs/walls) and a real, pop-off-the-background glow
 *  in caves/night/blight zones (where ambient alone still can't carry full readability). */
const LIGHT_SCALE: Record<ThemeId, number> = {
  driftmoor: 0.52, meadow: 0.46, galeoutpost: 0.52,
  grotto: 1.15, kelpwood: 0.9, stormspire: 0.85,
  lanternreef: 1.25, galleon: 1.2, hollow: 1.1, heart: 1.1,
};

const normalMapped = new Set<string>();
const pendingQueue: { scene: Phaser.Scene; key: string }[] = [];
let queueArmed = false;

type IdleWindow = Window & { requestIdleCallback?: (cb: (deadline: { timeRemaining: () => number }) => void, opts?: { timeout: number }) => number };

/** Actually generating a normal map (getImageData + putImageData over a whole texture/spritesheet)
 *  is cheap in isolation, but a busy scene first-touches dozens of distinct textures (tiles, decor,
 *  every monster/NPC sheet, the player...) in the same tick — doing all of that synchronously at
 *  scene-create time was measured to stall the main thread for seconds under headless SwiftShader,
 *  which is exactly the kind of stall that would also hurt on a weaker real GPU. So `ensureNormalMap`
 *  only enqueues; this drains a couple of entries per idle callback (or a timer, if
 *  requestIdleCallback isn't available) instead. Light2D lights/ambient already look correct in the
 *  meantime — Phaser's LightPipeline falls back to a flat default normal for any texture that
 *  doesn't have one yet (see LightPipeline#getNormalMap), so there's nothing to gate on this. */
function drainQueue(): void {
  const budgetPerTick = 2;
  let n = 0;
  while (pendingQueue.length && n < budgetPerTick) {
    const { scene, key } = pendingQueue.shift()!;
    n++;
    try {
      if (!scene.textures.exists(key)) continue;
      const tex = scene.textures.get(key);
      const src = tex.getSourceImage(0) as unknown;
      if (!(src instanceof HTMLCanvasElement)) continue;
      const normal = buildNormalMapFromAlpha(src, { bevel: 2 });
      tex.setDataSource(normal as unknown as HTMLCanvasElement);
    } catch (e) {
      console.warn(`[lighting] normal map generation failed for "${key}" (falls back to flat shading)`, e);
    }
  }
  if (pendingQueue.length) armQueue(); else queueArmed = false;
}

function armQueue(): void {
  if (queueArmed) return;
  queueArmed = true;
  const w = window as IdleWindow;
  if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(drainQueue, { timeout: 250 });
  else setTimeout(drainQueue, 16);
}

/** Idempotent, cached-by-key: queues a normal map to be generated and attached as
 *  texture.dataSource in the background, a couple of textures per idle tick, so the Light2D
 *  pipeline can bevel-shade the sprite once it's ready. Safe to call repeatedly (across scene
 *  restarts — the TextureManager and this module-level cache both persist for the game's life). */
export function ensureNormalMap(scene: Phaser.Scene, key: string): void {
  if (normalMapped.has(key)) return;
  normalMapped.add(key);
  pendingQueue.push({ scene, key });
  armQueue();
}

export interface WorldLighting {
  readonly manager: LightManager;
  /** Attach the Light2D pipeline to a game object, and (unless `normalMap: false`) queue a
   *  generated normal map so it picks up bevel shading once ready. Bevel relief is most worth its
   *  (deferred, but non-zero) cost on characters/monsters/NPCs — the things the eye actually
   *  studies — so terrain tiles, decor and small icons are lit with a flat default normal
   *  (`normalMap: false`): still correctly darkened/tinted by ambient + nearby lights, just
   *  without per-pixel relief. This is the main lever for keeping the number of queued normal-map
   *  jobs (and thus how long the background queue keeps competing with the main thread) bounded
   *  on a busy map with many distinct tile/decor textures. */
  lit<T extends Phaser.GameObjects.GameObject & { setPipeline: (key: string) => unknown }>(obj: T, textureKey: string, opts?: { normalMap?: boolean }): T;
  addLight(src: LightSource): void;
  removeLight(id: string): void;
  update(dtMs: number, cam: Phaser.Cameras.Scene2D.Camera): void;
  destroy(): void;
}

export function setupWorldLighting(scene: Phaser.Scene, theme: ThemeId, quality: Quality): WorldLighting | null {
  if (quality === 'low' || !isWebGLAvailable(scene)) return null;
  try {
    scene.lights.enable();
    scene.lights.setAmbientColor(AMBIENT[theme] ?? 0x333333);
  } catch (e) {
    console.warn('[lighting] scene.lights.enable() failed — disabling dynamic lighting for this scene', e);
    return null;
  }
  const budget = quality === 'high' ? 8 : 4;
  const manager = new LightManager(scene, budget);
  const lightScale = LIGHT_SCALE[theme] ?? 1;
  return {
    manager,
    lit(obj, textureKey, opts) {
      if (opts?.normalMap !== false) ensureNormalMap(scene, textureKey);
      // DriftwakeLightPipeline (see pipelines/LightingPipeline.ts), not stock 'Light2D' — same
      // diffuse/normal-map math, but with a soft highlight rolloff so lit sprites can't clip to
      // flat white the way stock Light2D's uncapped additive sum did.
      try { obj.setPipeline(DRIFTWAKE_LIGHT_KEY); } catch { /* pipeline unavailable (canvas fallback) */ }
      return obj;
    },
    addLight(src) { manager.add({ ...src, intensity: src.intensity * lightScale }); },
    removeLight(id) { manager.remove(id); },
    update(dtMs, cam) { manager.update(dtMs, cam.midPoint.x, cam.midPoint.y); },
    destroy() { manager.destroy(); },
  };
}
