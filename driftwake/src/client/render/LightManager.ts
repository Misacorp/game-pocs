/**
 * Fixed-size pool of Phaser Light2D lights, backing an unbounded set of "candidate" light
 * sources (player, lamps/lanterns/campfires, crystals, portals, projectiles, telegraphs, hit
 * flashes...). Each frame the nearest `budget` candidates (by distance to the camera's midpoint,
 * with `priority` able to force a source to always win — used by the player's own light) are
 * mapped onto the pool; everything else is simply not rendered that frame. This keeps the actual
 * `scene.lights` list size fixed at `budget` regardless of how many decor/vfx sources register
 * themselves, respecting Phaser's compiled-in `maxLights` shader constant and the quality tier's
 * intended light budget (16 on High, 8 on Medium; Low doesn't use Light2D at all).
 */
import Phaser from 'phaser';

export interface LightSource {
  id: string;
  x: () => number;
  y: () => number;
  color: number; // 0xRRGGBB
  radius: number;
  intensity: number;
  /** 0..1 flicker amount (fire/lanterns); omitted/0 = steady. */
  flicker?: number;
  /** Higher priority sources are kept even when far from camera (the player's own light). */
  priority?: number;
  /** Remaining lifetime in ms; the manager decrements it and auto-removes at <=0. Omit for persistent sources. */
  ttl?: number;
}

function hashSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

/** Pure selection logic (unit-testable without a live Phaser scene): picks the nearest `budget`
 *  sources to (camX, camY), with priority acting as a large distance bonus so high-priority
 *  sources are effectively always kept. */
export function selectNearestLights(sources: LightSource[], camX: number, camY: number, budget: number): LightSource[] {
  const scored = sources.map((s) => {
    const dx = s.x() - camX, dy = s.y() - camY;
    const dist = Math.hypot(dx, dy) - (s.priority ?? 0) * 1_000_000;
    return { s, dist };
  });
  scored.sort((a, b) => a.dist - b.dist);
  return scored.slice(0, budget).map((e) => e.s);
}

export class LightManager {
  private pool: Phaser.GameObjects.Light[] = [];
  private sources = new Map<string, LightSource>();
  readonly budget: number;

  constructor(private scene: Phaser.Scene, budget: number) {
    this.budget = budget;
    for (let i = 0; i < budget; i++) this.pool.push(scene.lights.addLight(-9999, -9999, 10, 0xffffff, 0));
  }

  add(src: LightSource): void { this.sources.set(src.id, src); }
  remove(id: string): void { this.sources.delete(id); }
  has(id: string): boolean { return this.sources.has(id); }

  update(dtMs: number, camX: number, camY: number): void {
    if (this.sources.size) {
      for (const [id, s] of this.sources) {
        if (s.ttl === undefined) continue;
        s.ttl -= dtMs;
        if (s.ttl <= 0) this.sources.delete(id);
      }
    }
    const nearest = selectNearestLights([...this.sources.values()], camX, camY, this.pool.length);
    const now = performance.now() / 1000;
    for (let i = 0; i < this.pool.length; i++) {
      const light = this.pool[i];
      const src = nearest[i];
      if (!src) { light.setIntensity(0); continue; }
      let mult = 1;
      if (src.flicker) {
        const seed = hashSeed(src.id) * 97;
        mult = 1 + Math.sin(now * 11 + seed) * src.flicker * 0.4 + Math.sin(now * 29 + seed * 3) * src.flicker * 0.15;
        mult = Math.max(0.15, mult);
      }
      light.setPosition(src.x(), src.y());
      light.setColor(src.color);
      light.setRadius(src.radius);
      light.setIntensity(src.intensity * mult);
    }
  }

  destroy(): void {
    for (const l of this.pool) { try { this.scene.lights.removeLight(l); } catch { /* scene already tearing down */ } }
    this.pool = [];
    this.sources.clear();
  }
}
