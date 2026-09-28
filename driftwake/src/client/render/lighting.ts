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

/** Ambient color per theme — warm dusk in town, bright daylight in the fields, deep blue/near-black
 *  in caves and the reef, sickly violet/red in the Blight zones. Deliberately separate from
 *  gfx/palette.ts (owned by the sprite artist) since this is a lighting-only concern. */
const AMBIENT: Record<ThemeId, number> = {
  // Raised from the first pass: characters (player/NPCs) were reading too dark against the dusk
  // town ambient. Player/NPC personal fill lights (Player.ts, Npc.ts) do the rest of the work —
  // gameplay readability wins over moodier-but-dimmer ambient.
  driftmoor: 0x6a5b74,
  meadow: 0x92a5be,
  grotto: 0x14211e,
  kelpwood: 0x1a3a2c,
  galeoutpost: 0x848fac,
  stormspire: 0x2c2e3a,
  lanternreef: 0x121e34,
  galleon: 0x0e241c,
  hollow: 0x22132a,
  heart: 0x241012,
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
  return {
    manager,
    lit(obj, textureKey, opts) {
      if (opts?.normalMap !== false) ensureNormalMap(scene, textureKey);
      try { obj.setPipeline('Light2D'); } catch { /* pipeline unavailable (canvas fallback) */ }
      return obj;
    },
    addLight(src) { manager.add(src); },
    removeLight(id) { manager.remove(id); },
    update(dtMs, cam) { manager.update(dtMs, cam.midPoint.x, cam.midPoint.y); },
    destroy() { manager.destroy(); },
  };
}
