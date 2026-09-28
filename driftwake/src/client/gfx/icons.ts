/**
 * DOM icon data-URLs: item/skill icons (native 16x16 pixel art, nearest-neighbor scaled),
 * plus character portrait/preview data URLs built from the character renderer.
 */
import type { IconSpec, ItemDef, SkillDef, SkillIconSpec } from '@shared/types';
import { makeCanvas, ctx2d, scaleNearest, hashStr, line, rect } from './canvasKit';
import { drawItemIcon, drawSkillIcon } from './iconShapes';
import { characterIdleCanvas } from './characters';
import type { CharacterLook } from './spec';
import { outlineHued } from './shading';

const urlCache = new Map<string, string>();

function drawGlyph(ctx: CanvasRenderingContext2D, glyph: string): void {
  if (glyph === '+') { line(ctx, 12, 10.5, 15, 10.5, 1, '#3ad160'); line(ctx, 13.5, 9, 13.5, 12, 1, '#3ad160'); }
  else if (glyph === '*') { line(ctx, 11, 9, 15, 13, 1, '#ffe07a'); line(ctx, 15, 9, 11, 13, 1, '#ffe07a'); }
  else { rect(ctx, 11.5, 9.5, 3.5, 3.5, '#00000088'); }
}

export function iconUrl(spec: IconSpec, size = 32): string {
  const key = `icon_${spec.shape}_${spec.colors.join(',')}_${spec.glyph ?? ''}_${size}`;
  const hit = urlCache.get(key); if (hit) return hit;
  const art = makeCanvas(16, 16);
  const ctx = ctx2d(art);
  drawItemIcon(ctx, spec.shape, spec.colors);
  if (spec.glyph) drawGlyph(ctx, spec.glyph);
  const outlinedArt = outlineHued(art, false);
  const url = scaleNearest(outlinedArt, size, size).toDataURL();
  urlCache.set(key, url);
  return url;
}

export function itemIconUrl(def: ItemDef, size = 32): string {
  return iconUrl(def.icon, size);
}

export function skillIconUrl(def: SkillDef | { icon: SkillIconSpec; id: string }, size = 32): string {
  const key = `skillicon_${def.icon.shape}_${def.icon.colors.join(',')}_${size}`;
  const hit = urlCache.get(key); if (hit) return hit;
  const art = makeCanvas(16, 16);
  const ctx = ctx2d(art);
  drawSkillIcon(ctx, def.icon.shape, def.icon.colors);
  const outlinedArt = outlineHued(art, false);
  const url = scaleNearest(outlinedArt, size, size).toDataURL();
  urlCache.set(key, url);
  return url;
}

export function characterPortraitUrl(look: CharacterLook, size = 96): string {
  const key = `charportrait_${JSON.stringify(look)}_${size}`;
  const kk = hashStr(key).toString(36);
  const hit = urlCache.get(kk); if (hit) return hit;
  const full = characterIdleCanvas(look);
  // crop head & shoulders (top ~22px of the 32x40 frame) and pad into a square portrait
  const native = makeCanvas(28, 28);
  const ctx = ctx2d(native);
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.drawImage(full, 0, 0, 32, 24, -2, 2, 32, 24);
  const url = scaleNearest(native, size, size).toDataURL();
  urlCache.set(kk, url);
  return url;
}

export function characterPreviewUrl(look: CharacterLook, scale = 4): string {
  const key = hashStr(`${JSON.stringify(look)}_${scale}`).toString(36);
  const hit = urlCache.get(key); if (hit) return hit;
  const full = characterIdleCanvas(look);
  const url = scaleNearest(full, full.width * scale, full.height * scale).toDataURL();
  urlCache.set(key, url);
  return url;
}
