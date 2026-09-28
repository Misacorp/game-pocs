/**
 * Builds a map's static physics terrain (ground/oneway/solid platforms), ropes/ladders, and decor
 * from a MapDef, and exposes small spatial queries used by movement, monster AI and boss attacks.
 */
import Phaser from 'phaser';
import type { DecorKind, MapDef, PlatformType, RopeDef } from '@shared/types';
import { getPlatformTextures, getDecorTexture, type PlatformTextures } from '../../gfx';
import { THEMES } from '../../gfx/palette';
import type { WorldLighting } from '../../render/lighting';

interface Rect { x: number; y: number; w: number; h: number; type: PlatformType }

/** Decor kinds whose art (see gfx/decor.ts) actually draws a lit window/flame/glow — everything
 *  else stays unlit rather than implying a light source that isn't visually there. Colors are
 *  fixed warm tones for the fire/window kinds; 'crystal' instead uses the theme's own glow accent
 *  so it reads as matching whatever color that theme's crystals are drawn in. */
const LIGHT_DECOR: Partial<Record<DecorKind, { color?: number; radius: number; intensity: number; flicker: number; heightFrac: number }>> = {
  lamp: { color: 0xffdd88, radius: 85, intensity: 1.0, flicker: 0.18, heightFrac: 0.82 },
  lantern: { color: 0xffdd88, radius: 65, intensity: 0.9, flicker: 0.22, heightFrac: 0.55 },
  campfire: { color: 0xff8a3a, radius: 95, intensity: 1.35, flicker: 0.4, heightFrac: 0.5 },
  crystal: { radius: 70, intensity: 0.85, flicker: 0.12, heightFrac: 0.55 },
  house: { color: 0xffcf7a, radius: 60, intensity: 0.55, flicker: 0.05, heightFrac: 0.55 },
  shop: { color: 0xffcf7a, radius: 55, intensity: 0.5, flicker: 0.05, heightFrac: 0.55 },
};

/** World-px of extra room below the map's nominal height that ground platforms extend into (and
 *  the camera/physics bounds allow scrolling into) so the DOM HUD never covers bare void — the
 *  camera gets slack to sit the player higher on screen, above the bottom HUD. Shared with
 *  WorldScene, which sizes the camera/physics world bounds by the same amount. */
export const CAMERA_BOTTOM_SLACK = 130;

export interface Terrain {
  solidGroup: Phaser.Physics.Arcade.StaticGroup;
  onewayGroup: Phaser.Physics.Arcade.StaticGroup;
  ropes: RopeDef[];
  /** Topmost platform surface y at x, at or below fromY (used to land drops / query ground level). */
  groundYAt(x: number, fromY: number): number;
  /** Rope/ladder overlapping (x,y), or null. */
  ropeAt(x: number, y: number): RopeDef | null;
  /** The x-range of the platform under x (for monster patrol bounds), padded inward a little. */
  platformSegmentAt(x: number): { minX: number; maxX: number };
  destroy(): void;
}

function addBody(scene: Phaser.Scene, group: Phaser.Physics.Arcade.StaticGroup, x: number, y: number, w: number, h: number): void {
  const rect = scene.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0);
  scene.physics.add.existing(rect, true);
  group.add(rect);
}

export function buildTerrain(scene: Phaser.Scene, map: MapDef, lighting?: WorldLighting | null): Terrain {
  const textures: PlatformTextures = getPlatformTextures(scene, map.theme);
  const solidGroup = scene.physics.add.staticGroup();
  const onewayGroup = scene.physics.add.staticGroup();
  const rects: Rect[] = [];
  const visuals: Phaser.GameObjects.GameObject[] = [];
  let lightSeq = 0;

  for (const p of map.platforms) {
    const h = p.h ?? (p.type === 'ground' ? Math.max(48, map.height + CAMERA_BOTTOM_SLACK - p.y) : p.type === 'oneway' ? 12 : 16);
    rects.push({ x: p.x, y: p.y, w: p.w, h, type: p.type });
    if (p.type === 'ground') {
      const topH = Math.min(16, h);
      const top = scene.add.tileSprite(p.x, p.y, p.w, topH, textures.groundTop).setOrigin(0, 0).setDepth(1);
      lighting?.lit(top, textures.groundTop);
      visuals.push(top);
      if (h > topH) {
        const fill = scene.add.tileSprite(p.x, p.y + topH, p.w, h - topH, textures.groundFill).setOrigin(0, 0).setDepth(0.9);
        lighting?.lit(fill, textures.groundFill);
        visuals.push(fill);
      }
      addBody(scene, solidGroup, p.x, p.y, p.w, h);
    } else if (p.type === 'oneway') {
      const v = scene.add.tileSprite(p.x, p.y, p.w, h, textures.oneway).setOrigin(0, 0).setDepth(1);
      lighting?.lit(v, textures.oneway);
      visuals.push(v);
      addBody(scene, onewayGroup, p.x, p.y, p.w, h);
    } else {
      const v = scene.add.tileSprite(p.x, p.y, p.w, h, textures.solid).setOrigin(0, 0).setDepth(1);
      lighting?.lit(v, textures.solid);
      visuals.push(v);
      addBody(scene, solidGroup, p.x, p.y, p.w, h);
    }
  }

  for (const r of map.ropes) {
    const key = r.kind === 'ladder' ? textures.ladder : textures.rope;
    const v = scene.add.tileSprite(r.x - 4, r.top, 8, r.bottom - r.top, key).setOrigin(0, 0).setDepth(2);
    lighting?.lit(v, key);
    visuals.push(v);
  }

  const glowAccent = Phaser.Display.Color.HexStringToColor(THEMES[map.theme].glow).color;
  for (const d of map.decor) {
    const tex = getDecorTexture(scene, d.kind, map.theme);
    const img = scene.add.image(d.x, d.y, tex.key).setOrigin(0.5, 1).setScale(d.scale ?? 1).setFlipX(!!d.flip);
    img.setDepth(d.front ? 60 : -10);
    lighting?.lit(img, tex.key);
    visuals.push(img);

    const lightCfg = LIGHT_DECOR[d.kind];
    if (lighting && lightCfg) {
      const id = `decor${lightSeq++}`;
      const lx = d.x, ly = d.y - img.displayHeight * lightCfg.heightFrac;
      lighting.addLight({
        id, x: () => lx, y: () => ly,
        color: lightCfg.color ?? glowAccent, radius: lightCfg.radius, intensity: lightCfg.intensity, flicker: lightCfg.flicker,
      });
    }
  }

  function platformsAtX(x: number): Rect[] {
    return rects.filter((r) => x >= r.x && x <= r.x + r.w);
  }

  function groundYAt(x: number, fromY: number): number {
    let best = map.height;
    for (const r of platformsAtX(x)) if (r.y >= fromY - 1 && r.y < best) best = r.y;
    return best;
  }

  function ropeAt(x: number, y: number): RopeDef | null {
    for (const r of map.ropes) if (Math.abs(x - r.x) < 12 && y >= r.top - 6 && y <= r.bottom + 8) return r;
    return null;
  }

  function platformSegmentAt(x: number): { minX: number; maxX: number } {
    const here = platformsAtX(x).sort((a, b) => a.y - b.y)[0];
    if (!here) return { minX: x - 70, maxX: x + 70 };
    return { minX: here.x + 14, maxX: here.x + here.w - 14 };
  }

  return {
    solidGroup, onewayGroup, ropes: map.ropes, groundYAt, ropeAt, platformSegmentAt,
    destroy() {
      for (const v of visuals) { try { v.destroy(); } catch { /* already gone */ } }
      // Arcade's own scene/world shutdown may have already torn these groups down (e.g. on a
      // fast scene.restart()) — guard the internal children Set before clearing.
      for (const g of [solidGroup, onewayGroup]) {
        try { if (g && (g as unknown as { children?: unknown }).children) g.clear(true, true); } catch { /* already gone */ }
      }
    },
  };
}

/**
 * Arcade collider "process" callback implementing the one-way platform rule: only collide when the
 * body approached from above (was at/above the platform top last frame) and isn't currently dropping
 * through, and never while moving upward.
 */
export function onewayProcess(dropThroughUntil: () => number) {
  return (obj1: unknown, obj2: unknown): boolean => {
    const playerObj = obj1 as Phaser.Physics.Arcade.Sprite;
    const platformObj = obj2 as Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.StaticBody };
    const body = playerObj.body as Phaser.Physics.Arcade.Body;
    if (performance.now() < dropThroughUntil()) return false;
    if (body.velocity.y < -10) return false;
    const platformTop = platformObj.body.y;
    const prevBottom = body.prev.y + body.height;
    return prevBottom <= platformTop + 3;
  };
}
