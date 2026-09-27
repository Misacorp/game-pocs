/**
 * Gather node sprites, portal sprite (swirly Maplestory-style), and world drop item textures.
 */
import Phaser from 'phaser';
import type { GatherNodeDef, ItemDef, Rarity } from '@shared/types';
import {
  makeCanvas, ctx2d, outlined, rect, circle, ellipse, line, poly,
  registerSpriteSheet, registerCanvasTexture, ensureAnim, shade, hexNum,
} from './canvasKit';
import { drawItemIcon } from './iconShapes';
import { OUTLINE } from './palette';
import type { SpriteInfo } from './spec';

const N = 24;

function drawNode(base: GatherNodeDef['sprite']['base'], color: string, color2: string, sparkle: number, depleted: boolean): HTMLCanvasElement {
  const art = makeCanvas(N, N);
  const ctx = ctx2d(art);
  const cx = N / 2, cy = N / 2 + 3;
  const c1 = depleted ? shade(color, -0.45) : color;
  const c2 = depleted ? shade(color2, -0.45) : color2;
  switch (base) {
    case 'ore':
      poly(ctx, [[6, 15], [4, 9], [10, 4], [17, 6], [19, 13], [13, 19], [7, 18]], shade(c1, -0.15));
      poly(ctx, [[9, 12], [12, 8], [16, 10], [13, 15]], c2);
      break;
    case 'crystal':
      poly(ctx, [[cx, 3], [cx + 6, cy], [cx + 2, 20], [cx - 2, 20], [cx - 6, cy]], c1);
      poly(ctx, [[cx, 3], [cx + 6, cy], [cx, 15]], shade(c1, 0.2));
      if (!depleted) circle(ctx, cx, cy, 2 + sparkle, c2);
      break;
    case 'herb':
      line(ctx, cx, 20, cx, 12, 1.4, '#4a7a3a');
      for (const d of [-1, 0, 1]) ellipse(ctx, cx + d * 4, 12 - Math.abs(d) * 2, 3.4, 2.2, c1);
      break;
    case 'coral':
      for (let i = 0; i < 4; i++) ellipse(ctx, 7 + i * 3.2, 18 - (i % 2) * 5, 2.6, 6, i % 2 ? c1 : c2);
      break;
    case 'mushroom':
      rect(ctx, cx - 2, 12, 4, 8, '#e8dcc0');
      ellipse(ctx, cx, 11, 8, 5, c1);
      for (let i = 0; i < 3; i++) circle(ctx, cx - 4 + i * 4, 9, 1, c2);
      break;
    case 'kelp':
      for (let i = 0; i < 4; i++) { const off = Math.sin(i * 1.3) * 3; rect(ctx, cx - 2 + off, 20 - i * 5, 4, 5, i % 2 ? c1 : c2); }
      break;
    case 'wood':
      rect(ctx, 4, 10, 16, 6, c1);
      circle(ctx, 6, 13, 2, c2); circle(ctx, 18, 13, 2, c2);
      break;
  }
  if (!depleted && sparkle > 0) {
    for (let i = 0; i < sparkle; i++) {
      const a = i * 2.4;
      poly(ctx, [[cx + Math.cos(a) * 9, cy - 9 + Math.sin(a) * 3], [cx + Math.cos(a) * 9 + 1, cy - 11 + Math.sin(a) * 3], [cx + Math.cos(a) * 9 + 2, cy - 9 + Math.sin(a) * 3]], '#ffffff');
    }
  }
  return outlined(art, OUTLINE);
}

const nodeCache = new Map<string, SpriteInfo>();

export function getGatherNodeSprite(scene: Phaser.Scene, def: GatherNodeDef): SpriteInfo {
  const key = `node_${def.id}`;
  const cached = nodeCache.get(key);
  if (cached && scene.textures.exists(key)) return cached;
  const sp = def.sprite;
  const c2 = sp.color2 ?? shade(sp.color, -0.25);
  const frames = [
    drawNode(sp.base, sp.color, c2, 0, false),
    drawNode(sp.base, sp.color, c2, 1, false),
    drawNode(sp.base, sp.color, c2, 2, false),
    drawNode(sp.base, sp.color, c2, 0, true),
  ];
  registerSpriteSheet(scene, key, frames, N, N);
  const anims = {
    idle: ensureAnim(scene, key, `${key}:idle`, 0, 2, 3, -1),
    depleted: ensureAnim(scene, key, `${key}:depleted`, 3, 3, 1, -1),
  };
  const info: SpriteInfo = { key, frameWidth: N, frameHeight: N, bodyWidth: 16, bodyHeight: 18, anims };
  nodeCache.set(key, info);
  return info;
}

// ---------------------------------------------------------------------------
// portal
// ---------------------------------------------------------------------------

let portalInfo: SpriteInfo | undefined;

export function getPortalSprite(scene: Phaser.Scene): SpriteInfo {
  const key = 'portal';
  if (portalInfo && scene.textures.exists(key)) return portalInfo;
  const w = 32, h = 48;
  const frames: HTMLCanvasElement[] = [];
  const N_FRAMES = 8;
  for (let f = 0; f < N_FRAMES; f++) {
    const art = makeCanvas(w, h);
    const ctx = ctx2d(art);
    const cx = w / 2, cy = h / 2;
    const rot = (f / N_FRAMES) * Math.PI * 2;
    ellipse(ctx, cx, cy, 10, 20, '#0a1830');
    for (let ring = 0; ring < 3; ring++) {
      const rr = 6 + ring * 4;
      ctx.strokeStyle = ring % 2 === 0 ? '#66ccff' : '#a0e6ff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 2; a += 0.35) {
        const ang = a + rot * (ring + 1) * (ring % 2 === 0 ? 1 : -1);
        const rx = cx + Math.cos(ang) * rr * 0.5;
        const ry = cy + Math.sin(ang) * rr;
        if (a === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ellipse(ctx, cx, cy, 3, 8, '#e0f8ff');
    frames.push(outlined(art, '#0a1420', false));
  }
  registerSpriteSheet(scene, key, frames, w, h);
  const anims = { idle: ensureAnim(scene, key, `${key}:idle`, 0, N_FRAMES - 1, 10, -1) };
  portalInfo = { key, frameWidth: w, frameHeight: h, bodyWidth: 14, bodyHeight: 36, anims };
  return portalInfo;
}

// ---------------------------------------------------------------------------
// drops
// ---------------------------------------------------------------------------

const RARITY_RING: Record<Rarity, string> = {
  common: '#9aa0a8', uncommon: '#4fd06a', rare: '#4a9dff', epic: '#b866ff', legendary: '#ffb03a',
};

const dropCache = new Map<string, string>();

export function getDropTexture(scene: Phaser.Scene, item: ItemDef | 'gold', rarity?: Rarity): string {
  const key = item === 'gold' ? 'drop_gold' : `drop_${item.id}_${rarity ?? item.rarity}`;
  const cached = dropCache.get(key);
  if (cached && scene.textures.exists(key)) return cached;
  const size = 18;
  const art = makeCanvas(size, size);
  const ctx = ctx2d(art);
  ctx.save();
  ctx.translate(1, 1);
  if (item === 'gold') {
    drawItemIcon(ctx, 'coin', ['#ffd24a', '#c98a1a']);
  } else {
    const ring = RARITY_RING[rarity ?? item.rarity];
    if ((rarity ?? item.rarity) !== 'common') { ctx.globalAlpha = 0.5; circle(ctx, 8, 8, 7.5, ring); ctx.globalAlpha = 1; }
    drawItemIcon(ctx, item.icon.shape, item.icon.colors);
  }
  ctx.restore();
  registerCanvasTexture(scene, key, outlined(art, OUTLINE, false));
  dropCache.set(key, key);
  return key;
}
