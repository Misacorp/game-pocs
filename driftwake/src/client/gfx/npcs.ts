/**
 * NPC sprites (32x40, single idle anim with blink/breathe) + portraits.
 */
import Phaser from 'phaser';
import type { NpcDef, NpcBase } from '@shared/types';
import {
  makeCanvas, ctx2d, rect, rrect, circle, ellipse, line, poly,
  registerSpriteSheet, ensureAnim, shade, hashStr, scaleNearest,
} from './canvasKit';
import { outlineHued, emissiveDab, warmHighlight, coolShadow } from './shading';
import type { SpriteInfo } from './spec';

const FW = 32, FH = 40, CX = 16;

interface Pal { skin: string; hair: string; outfit: string; accent?: string }

function limb(ctx: CanvasRenderingContext2D, ox: number, oy: number, deg: number, len: number, w: number, color: string, tip?: string): [number, number] {
  const rad = (deg * Math.PI) / 180;
  const ex = ox + Math.sin(rad) * len, ey = oy + Math.cos(rad) * len;
  line(ctx, ox, oy, ex, ey, w, color);
  if (tip) circle(ctx, ex, ey, w * 0.6, tip);
  return [ex, ey];
}

function drawNpcBody(ctx: CanvasRenderingContext2D, def: NpcDef, blink: boolean, bob: number): void {
  const p = def.sprite.palette;
  const acc = def.sprite.accessory;
  const base = def.sprite.base;
  const cx = CX;
  const hunch = base === 'elder' ? 2 : 0;
  const small = base === 'child' ? 0.72 : base === 'creature' ? 0.6 : 1;
  const headCy = 12 + bob + hunch * 0.6;
  const r = 7.2 * (small < 1 ? 0.92 : 1);
  const torsoTop = 18 + bob * 0.6 + hunch;
  const torsoBot = base === 'child' ? 33 : 29 + hunch;
  const legLen = base === 'child' ? 5 : 9;

  ctx.save();
  if (small < 1) { ctx.translate(cx, 40); ctx.scale(small, small); ctx.translate(-cx, -40); }

  // legs
  limb(ctx, cx - 3, torsoBot, 4, legLen, 3.2, shade(p.outfit, -0.35), shade(p.outfit, -0.4));
  limb(ctx, cx + 3, torsoBot, -4, legLen, 3.2, shade(p.outfit, -0.35), shade(p.outfit, -0.4));

  // arms
  const armSway = acc === 'staff' || acc === 'hammer' ? -10 : 6;
  limb(ctx, cx - 4.4, torsoTop + 1.5, -armSway, 8.4, 2.6, p.outfit, p.skin);
  limb(ctx, cx + 4.4, torsoTop + 1.5, armSway, 8.4, 2.6, p.outfit, p.skin);

  // torso silhouette per base
  const w = base === 'child' ? 8 : 11;
  switch (base) {
    case 'guard':
      rrect(ctx, cx - w / 2, torsoTop, w, torsoBot - torsoTop, 2, p.accent ?? '#8a97a6');
      rect(ctx, cx - w / 2 - 1, torsoTop + 1, 2, 3, shade(p.accent ?? '#8a97a6', -0.2));
      rect(ctx, cx + w / 2 - 1, torsoTop + 1, 2, 3, shade(p.accent ?? '#8a97a6', -0.2));
      break;
    case 'smith':
      rrect(ctx, cx - w / 2 - 1, torsoTop, w + 2, torsoBot - torsoTop, 2, p.outfit);
      rect(ctx, cx - w / 2, torsoTop + 2, w, torsoBot - torsoTop - 2, shade('#c9b088', 0.1));
      break;
    case 'mystic':
    case 'spirit':
      poly(ctx, [[cx - w * 0.55, torsoTop], [cx + w * 0.55, torsoTop], [cx + w * 0.9, torsoBot + 3], [cx - w * 0.9, torsoBot + 3]], p.outfit);
      break;
    case 'sailor':
      rrect(ctx, cx - w / 2, torsoTop, w, torsoBot - torsoTop, 2, p.outfit);
      poly(ctx, [[cx - w * 0.3, torsoTop], [cx, torsoTop + 3], [cx + w * 0.3, torsoTop]], p.accent ?? '#e2ddc8');
      break;
    case 'scholar':
      rrect(ctx, cx - w / 2, torsoTop, w, torsoBot - torsoTop + 2, 2, p.outfit);
      break;
    default:
      rrect(ctx, cx - w / 2, torsoTop, w, torsoBot - torsoTop, 2, p.outfit);
  }
  if (base === 'merchant') rect(ctx, cx - w / 2, torsoTop + (torsoBot - torsoTop) * 0.4, w, (torsoBot - torsoTop) * 0.55, p.accent ?? '#caa66a');
  // form-describing edge tone: warm key-light rim (left) + cool shadow (right), same ramp as players
  rect(ctx, cx - w / 2, torsoTop, 1, torsoBot - torsoTop, warmHighlight(p.outfit, 0.35));
  rect(ctx, cx + w / 2 - 1, torsoTop, 1, torsoBot - torsoTop, coolShadow(p.outfit, 0.35));

  // head
  circle(ctx, cx, headCy, r, p.skin);
  if (blink) { line(ctx, cx - r * 0.42, headCy + r * 0.05, cx - r * 0.1, headCy + r * 0.05, 1, '#12100f'); line(ctx, cx + r * 0.1, headCy + r * 0.05, cx + r * 0.42, headCy + r * 0.05, 1, '#12100f'); }
  else {
    circle(ctx, cx - r * 0.42, headCy + r * 0.05, 1.3, '#12100f');
    circle(ctx, cx + r * 0.42, headCy + r * 0.05, 1.3, '#12100f');
  }
  if (base === 'spirit') { ctx.save(); ctx.globalAlpha = 0.55; ctx.restore(); }

  // hair (simple cap, most NPCs have modest hair)
  if (base !== 'creature') ellipse(ctx, cx, headCy - r * 0.5, r * 1.0, r * 0.5, p.hair);

  // accessory
  switch (acc) {
    case 'hat': poly(ctx, [[cx - r * 1.1, headCy - r * 0.6], [cx + r * 1.1, headCy - r * 0.6], [cx + r * 0.5, headCy - r * 1.8], [cx - r * 0.5, headCy - r * 1.8]], p.accent ?? '#5a4636'); rect(ctx, cx - r * 1.2, headCy - r * 0.65, r * 2.4, r * 0.3, p.accent ?? '#5a4636'); break;
    case 'hood': poly(ctx, [[cx - r * 1.15, headCy - r * 0.3], [cx, headCy - r * 2], [cx + r * 1.15, headCy - r * 0.3], [cx + r * 0.9, headCy + r * 0.6], [cx - r * 0.9, headCy + r * 0.6]], p.outfit); break;
    case 'beard': poly(ctx, [[cx - r * 0.6, headCy + r * 0.2], [cx + r * 0.6, headCy + r * 0.2], [cx, headCy + r * 1.3]], p.hair); break;
    case 'glasses': rect(ctx, cx - r * 0.7, headCy + r * 0.02, r * 0.5, r * 0.32, '#00000000'); ctx.strokeStyle = '#2a241f'; ctx.lineWidth = 0.8; ctx.strokeRect(cx - r * 0.68, headCy - r * 0.05, r * 0.5, r * 0.34); ctx.strokeRect(cx + r * 0.18, headCy - r * 0.05, r * 0.5, r * 0.34); break;
    case 'apron': rect(ctx, cx - w / 2 + 1, torsoTop + 2, w - 2, torsoBot - torsoTop - 2, p.accent ?? '#caa66a'); break;
    case 'cape': poly(ctx, [[cx - w * 0.6, torsoTop], [cx - w * 0.9, torsoBot + 4], [cx, torsoBot + 2], [cx + w * 0.2, torsoTop]], shade(p.outfit, -0.3)); break;
    case 'horns': poly(ctx, [[cx - r * 0.7, headCy - r * 0.6], [cx - r * 1.15, headCy - r * 1.7], [cx - r * 0.35, headCy - r * 0.9]], p.accent ?? '#e8e0c8'); poly(ctx, [[cx + r * 0.7, headCy - r * 0.6], [cx + r * 1.15, headCy - r * 1.7], [cx + r * 0.35, headCy - r * 0.9]], p.accent ?? '#e8e0c8'); break;
    case 'lantern': emissiveDab(ctx, cx - w * 0.75, torsoTop + 6, 3.4, p.accent ?? '#ffdd88', { coreStop: 0.35 }); rect(ctx, cx - w * 0.78, torsoTop + 3, 0.8, 3, '#3a3226'); break;
    case 'staff': line(ctx, cx - w * 0.7, torsoBot, cx - w * 0.7, torsoTop - 8, 1.6, '#7a5636'); emissiveDab(ctx, cx - w * 0.7, torsoTop - 9, 3, p.accent ?? '#8a6ad6', { coreStop: 0.35 }); break;
    case 'hammer': line(ctx, cx + w * 0.75, torsoBot - 2, cx + w * 0.75, torsoTop - 2, 1.8, '#6b4a30'); rect(ctx, cx + w * 0.6, torsoTop - 5, w * 0.32, 3.4, '#8a97a6'); break;
  }
  ctx.restore();
}

const infoCache = new Map<string, SpriteInfo>();

export function getNpcSprite(scene: Phaser.Scene, def: NpcDef): SpriteInfo {
  const key = `npc_${def.id}`;
  const cached = infoCache.get(key);
  if (cached && scene.textures.exists(key)) return cached;

  const frames: HTMLCanvasElement[] = [0, 1, 0, 2].map((f) => {
    const art = makeCanvas(FW, FH);
    const ctx = ctx2d(art);
    drawNpcBody(ctx, def, f === 1, f === 2 ? -1 : 0);
    return outlineHued(art);
  });
  registerSpriteSheet(scene, key, frames, FW, FH);
  const anims = { idle: ensureAnim(scene, key, `${key}:idle`, 0, 3, 3, -1) };
  const info: SpriteInfo = { key, frameWidth: FW, frameHeight: FH, bodyWidth: 15, bodyHeight: 32, anims };
  infoCache.set(key, info);
  return info;
}

const urlCache = new Map<string, string>();

export function npcPortraitUrl(def: NpcDef, size = 96): string {
  const k = `npcportrait_${def.id}_${size}`;
  const hit = urlCache.get(k); if (hit) return hit;
  const native = makeCanvas(48, 48);
  const ctx = ctx2d(native);
  const p = def.sprite.palette;
  ctx.fillStyle = shade(p.outfit, 0.55); ctx.fillRect(0, 0, 48, 48);
  circle(ctx, 24, 30, 18, p.outfit);
  circle(ctx, 24, 20, 13, p.skin);
  circle(ctx, 20, 20, 1.6, '#12100f'); circle(ctx, 28, 20, 1.6, '#12100f');
  ellipse(ctx, 24, 12, 12, 6, p.hair);
  if (def.sprite.accessory === 'beard') poly(ctx, [[18, 24], [30, 24], [24, 34]], p.hair);
  if (def.sprite.accessory === 'hat') { poly(ctx, [[12, 13], [36, 13], [30, 1], [18, 1]], p.accent ?? '#5a4636'); rect(ctx, 10, 12, 28, 3, p.accent ?? '#5a4636'); }
  if (def.sprite.accessory === 'glasses') { ctx.strokeStyle = '#2a241f'; ctx.lineWidth = 1; ctx.strokeRect(15, 18, 7, 5); ctx.strokeRect(26, 18, 7, 5); }
  const withLine = outlineHued(native);
  const scaled = scaleNearest(withLine, size, size);
  const url = scaled.toDataURL();
  urlCache.set(k, url);
  return url;
}
