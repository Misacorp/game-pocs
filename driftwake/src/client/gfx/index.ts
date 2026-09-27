/**
 * Procedural graphics API. STUB implementation (colored boxes) — the gfx module replaces the
 * internals but MUST keep these exported signatures.
 *
 * All textures are generated at runtime from code (Canvas2D) — there are no image assets.
 * Sizes are in art pixels (camera zoom renders at 2x).
 */
import Phaser from 'phaser';
import type {
  Appearance, ClassId, JobId, WeaponType, MonsterDef, NpcDef, GatherNodeDef, DecorKind, ThemeId,
  VfxStyle, ItemDef, SkillDef, IconSpec, WeatherId, Rarity, SkillIconSpec,
} from '@shared/types';

export interface CharacterLook {
  classId: ClassId;
  jobId: JobId;
  appearance: Appearance;
  weaponType?: WeaponType;
  /** colors from the equipped weapon icon */
  weaponColors?: string[];
  armorColors?: string[];
  helmetColors?: string[];
  bootsColors?: string[];
  glovesColors?: string[];
}

export interface SpriteInfo {
  /** texture key (spritesheet) */
  key: string;
  frameWidth: number;
  frameHeight: number;
  /** suggested physics body size (centered horizontally, aligned to bottom of frame) */
  bodyWidth: number;
  bodyHeight: number;
  /** anim name -> Phaser anim key; characters: idle, walk, jump, fall, attack, cast, shoot, climb, hurt, dead, crouch
   *  monsters: idle, move, attack, hurt, die; npcs: idle; nodes: idle, depleted; portal: idle */
  anims: Record<string, string>;
}

const cache = new Map<string, SpriteInfo>();

function boxSheet(scene: Phaser.Scene, key: string, w: number, h: number, color: string, animNames: string[], frames = 2): SpriteInfo {
  const hit = cache.get(key);
  if (hit && scene.textures.exists(key)) return hit;
  if (!scene.textures.exists(key)) {
    const canvas = document.createElement('canvas');
    canvas.width = w * frames; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    for (let i = 0; i < frames; i++) {
      ctx.fillStyle = color; ctx.fillRect(i * w + 2, 2 + (i % 2), w - 4, h - 2 - (i % 2));
      ctx.fillStyle = '#000'; ctx.fillRect(i * w + w - 8, 6, 2, 2);
    }
    scene.textures.addSpriteSheet(key, canvas as unknown as HTMLImageElement, { frameWidth: w, frameHeight: h });
  }
  const anims: Record<string, string> = {};
  for (const a of animNames) {
    const ak = `${key}:${a}`;
    if (!scene.anims.exists(ak)) scene.anims.create({ key: ak, frames: scene.anims.generateFrameNumbers(key, { start: 0, end: frames - 1 }), frameRate: 4, repeat: -1 });
    anims[a] = ak;
  }
  const info = { key, frameWidth: w, frameHeight: h, bodyWidth: Math.round(w * 0.6), bodyHeight: Math.round(h * 0.8), anims };
  cache.set(key, info);
  return info;
}

/** Call once during boot. Generates shared textures (particles, drops, portal, etc). */
export function registerBaseTextures(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  g.fillStyle(0xffffff); g.fillCircle(4, 4, 4); g.generateTexture('px_circle', 8, 8); g.clear();
  g.fillStyle(0xffffff); g.fillRect(0, 0, 2, 2); g.generateTexture('px_dot', 2, 2); g.clear();
  g.destroy();
}

export function getCharacterSprite(scene: Phaser.Scene, look: CharacterLook): SpriteInfo {
  return boxSheet(scene, `char_${look.jobId}_${look.appearance.outfit}`, 32, 40, look.appearance.outfit, ['idle', 'walk', 'jump', 'fall', 'attack', 'cast', 'shoot', 'climb', 'hurt', 'dead', 'crouch']);
}
export function getMonsterSprite(scene: Phaser.Scene, def: MonsterDef): SpriteInfo {
  const s = Math.round(24 * (def.sprite.scale ?? 1));
  return boxSheet(scene, `mon_${def.id}`, s, s, def.sprite.palette.primary, ['idle', 'move', 'attack', 'hurt', 'die']);
}
export function getNpcSprite(scene: Phaser.Scene, def: NpcDef): SpriteInfo {
  return boxSheet(scene, `npc_${def.id}`, 32, 40, def.sprite.palette.outfit, ['idle']);
}
export function getGatherNodeSprite(scene: Phaser.Scene, def: GatherNodeDef): SpriteInfo {
  return boxSheet(scene, `node_${def.id}`, 24, 24, def.sprite.color, ['idle', 'depleted']);
}
export function getPortalSprite(scene: Phaser.Scene): SpriteInfo {
  return boxSheet(scene, 'portal', 32, 48, '#66ccff', ['idle']);
}
export function getDecorTexture(scene: Phaser.Scene, kind: DecorKind, theme: ThemeId): { key: string } {
  return { key: boxSheet(scene, `decor_${theme}_${kind}`, 24, 32, '#55667788', ['idle'], 1).key };
}
export interface PlatformTextures { groundTop: string; groundFill: string; oneway: string; solid: string; rope: string; ladder: string; tile: number }
export function getPlatformTextures(scene: Phaser.Scene, theme: ThemeId): PlatformTextures {
  const k = (n: string, c: string) => boxSheet(scene, `tile_${theme}_${n}`, 16, 16, c, ['idle'], 1).key;
  return { groundTop: k('gtop', '#6a8'), groundFill: k('gfill', '#453'), oneway: k('oneway', '#a86'), solid: k('solid', '#777'), rope: k('rope', '#c96'), ladder: k('ladder', '#a74'), tile: 16 };
}
export interface Parallax { update(cam: Phaser.Cameras.Scene2D.Camera): void; destroy(): void }
export function createParallax(scene: Phaser.Scene, _theme: ThemeId, _w: number, _h: number): Parallax {
  const bg = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x223344).setOrigin(0).setScrollFactor(0).setDepth(-100);
  return { update() {}, destroy() { bg.destroy(); } };
}
export interface Weather { update(cam: Phaser.Cameras.Scene2D.Camera, dt: number): void; destroy(): void }
export function createWeather(_scene: Phaser.Scene, _w: WeatherId): Weather { return { update() {}, destroy() {} }; }
export function getProjectileTexture(scene: Phaser.Scene, style: VfxStyle, color: string): string {
  return boxSheet(scene, `proj_${style}_${color}`, 10, 4, color, ['idle'], 1).key;
}
export interface VfxOpts { color: string; color2?: string; flipX?: boolean; scale?: number; width?: number; height?: number; rotation?: number; depth?: number; durationMs?: number }
/** One-shot visual effect centered at x,y (auto-destroys). */
export function spawnVfx(scene: Phaser.Scene, _style: VfxStyle, x: number, y: number, opts: VfxOpts): void {
  const r = scene.add.rectangle(x, y, opts.width ?? 24, opts.height ?? 24, Phaser.Display.Color.HexStringToColor(opts.color).color, 0.6).setDepth(opts.depth ?? 50);
  scene.tweens.add({ targets: r, alpha: 0, duration: opts.durationMs ?? 250, onComplete: () => r.destroy() });
}
/** Telegraph marker for boss/monster attacks: rect/circle warning area that fills over durationMs. */
export function spawnTelegraph(scene: Phaser.Scene, shape: 'circle' | 'rect', x: number, y: number, w: number, h: number, durationMs: number, color = '#ff3344'): void {
  const r = shape === 'circle' ? scene.add.circle(x, y, w / 2, Phaser.Display.Color.HexStringToColor(color).color, 0.25) : scene.add.rectangle(x, y, w, h, Phaser.Display.Color.HexStringToColor(color).color, 0.25);
  r.setDepth(40);
  scene.tweens.add({ targets: r, alpha: 0.6, duration: durationMs, onComplete: () => r.destroy() });
}
export function spawnHitSpark(scene: Phaser.Scene, x: number, y: number, crit: boolean): void {
  spawnVfx(scene, 'spark', x, y, { color: crit ? '#ffcc33' : '#ffffff', width: 8, height: 8, durationMs: 150 });
}
export function getDropTexture(scene: Phaser.Scene, item: ItemDef | 'gold', _rarity?: Rarity): string {
  return boxSheet(scene, item === 'gold' ? 'drop_gold' : `drop_${item.id}`, 12, 12, item === 'gold' ? '#ffd24a' : item.icon.colors[0], ['idle'], 1).key;
}

// ---- DOM icons (data URLs) ----------------------------------------------------
const urlCache = new Map<string, string>();
function colorUrl(key: string, color: string, size: number): string {
  const k = `${key}_${size}`;
  const hit = urlCache.get(k);
  if (hit) return hit;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d')!; ctx.fillStyle = color; ctx.fillRect(size * 0.2, size * 0.2, size * 0.6, size * 0.6);
  const url = c.toDataURL(); urlCache.set(k, url); return url;
}
export function iconUrl(spec: IconSpec, size = 32): string { return colorUrl(`icon_${spec.shape}_${spec.colors.join()}`, spec.colors[0], size); }
export function itemIconUrl(def: ItemDef, size = 32): string { return iconUrl(def.icon, size); }
export function skillIconUrl(def: SkillDef | { icon: SkillIconSpec; id: string }, size = 32): string { return colorUrl(`skill_${def.id}`, def.icon.colors[0], size); }
export function npcPortraitUrl(def: NpcDef, size = 96): string { return colorUrl(`npcp_${def.id}`, def.sprite.palette.outfit, size); }
export function characterPortraitUrl(look: CharacterLook, size = 96): string { return colorUrl(`charp_${look.jobId}_${look.appearance.outfit}`, look.appearance.outfit, size); }
/** Full-body preview canvas data URL for character creation (idle frame, scaled). */
export function characterPreviewUrl(look: CharacterLook, scale = 4): string { return colorUrl(`charprev_${look.jobId}_${look.appearance.outfit}_${look.appearance.hair}`, look.appearance.outfit, 32 * scale); }
