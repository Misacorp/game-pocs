/**
 * Seamless 16x16 tile textures per ThemeId: ground top, ground fill, one-way platform,
 * solid block, rope, ladder.
 */
import Phaser from 'phaser';
import type { ThemeId } from '@shared/types';
import { makeCanvas, ctx2d, rect, circle, registerCanvasTexture, shade, seedRandom } from './canvasKit';
import { THEMES } from './palette';
import type { PlatformTextures } from './spec';

const T = 16;

type Family = 'planks' | 'planksDark' | 'grass' | 'mossRock' | 'kelp' | 'rock' | 'coral' | 'flesh';

const FAMILY: Record<ThemeId, Family> = {
  driftmoor: 'planks', meadow: 'grass', grotto: 'mossRock', kelpwood: 'kelp',
  galeoutpost: 'planks', stormspire: 'rock', lanternreef: 'coral', galleon: 'planksDark',
  hollow: 'flesh', heart: 'flesh',
};

function wrapDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  for (const dx of [-T, 0, T]) for (const dy of [-T, 0, T]) circle(ctx, x + dx, y + dy, r, color);
}

function fillBase(ctx: CanvasRenderingContext2D, color: string): void { rect(ctx, 0, 0, T, T, color); }

function groundTop(family: Family, top: string, accent: string, seed: number): HTMLCanvasElement {
  const c = makeCanvas(T, T); const ctx = ctx2d(c);
  const rnd = seedRandom(seed);
  switch (family) {
    case 'grass':
      fillBase(ctx, top);
      rect(ctx, 0, 0, T, 3, shade(top, 0.18));
      for (let i = 0; i < 10; i++) wrapDot(ctx, rnd() * T, rnd() * 2.4, 0.8, shade(top, -0.15));
      for (let i = 0; i < 5; i++) { const x = rnd() * T; rect(ctx, x, 0, 1, 2 + rnd() * 2, shade(top, 0.3)); }
      break;
    case 'mossRock':
      fillBase(ctx, shade(top, -0.1));
      rect(ctx, 0, 0, T, 4, top);
      for (let i = 0; i < 6; i++) wrapDot(ctx, rnd() * T, rnd() * 3, 1.1, accent);
      break;
    case 'kelp':
      fillBase(ctx, top);
      for (let x = -2; x < T; x += 5) rect(ctx, x + (seed % 3), 0, 2, T, shade(top, -0.12));
      for (let i = 0; i < 6; i++) wrapDot(ctx, rnd() * T, rnd() * T, 0.7, accent);
      break;
    case 'rock':
      fillBase(ctx, top);
      rect(ctx, 0, 0, T, 3, shade(top, 0.12));
      for (let i = 0; i < 8; i++) { const x = rnd() * T, y = rnd() * T; rect(ctx, x, y, 1 + rnd() * 2, 1, shade(top, -0.15)); }
      break;
    case 'coral':
      fillBase(ctx, shade(top, -0.15));
      for (let i = 0; i < 8; i++) wrapDot(ctx, (i * 2 + rnd() * 2) % T, T - 2 - rnd() * 4, 1.6, top);
      for (let i = 0; i < 5; i++) wrapDot(ctx, rnd() * T, rnd() * 6, 0.9, accent);
      break;
    case 'flesh':
      fillBase(ctx, top);
      for (let i = 0; i < 3; i++) { const x = rnd() * T; rect(ctx, x, 0, 1, T, shade(accent, 0.1)); }
      for (let i = 0; i < 5; i++) wrapDot(ctx, rnd() * T, rnd() * T, 1, shade(top, -0.2));
      break;
    case 'planksDark':
    case 'planks':
    default:
      fillBase(ctx, top);
      rect(ctx, 0, 0, T, 2, shade(top, 0.2));
      rect(ctx, 0, T / 2, T, 1, shade(top, -0.25));
      rect(ctx, T / 2, 0, 1, T, shade(top, -0.15));
      break;
  }
  return c;
}

function groundFill(family: Family, fill: string, accent: string, seed: number): HTMLCanvasElement {
  const c = makeCanvas(T, T); const ctx = ctx2d(c);
  const rnd = seedRandom(seed + 7);
  fillBase(ctx, fill);
  switch (family) {
    case 'flesh':
      for (let i = 0; i < 4; i++) { const x = rnd() * T; rect(ctx, x, 0, 1, T, shade(accent, -0.1)); }
      for (let i = 0; i < 4; i++) wrapDot(ctx, rnd() * T, rnd() * T, 1.3, shade(fill, 0.15));
      break;
    case 'planks':
    case 'planksDark':
      for (let y = 4; y < T; y += 5) rect(ctx, 0, y, T, 1, shade(fill, -0.2));
      break;
    default:
      for (let i = 0; i < 10; i++) wrapDot(ctx, rnd() * T, rnd() * T, 0.8 + rnd(), shade(fill, rnd() > 0.5 ? 0.12 : -0.15));
  }
  return c;
}

function oneway(family: Family, color: string, accent: string, seed: number): HTMLCanvasElement {
  const c = makeCanvas(T, T); const ctx = ctx2d(c);
  const rnd = seedRandom(seed + 13);
  switch (family) {
    case 'kelp':
      fillBase(ctx, 'rgba(0,0,0,0)');
      rect(ctx, 2, 0, 3, 12, color); rect(ctx, 9, 0, 3, 12, shade(color, -0.1));
      wrapDot(ctx, 3, 4, 1, accent); wrapDot(ctx, 10, 8, 1, accent);
      break;
    case 'coral':
      fillBase(ctx, 'rgba(0,0,0,0)');
      for (let i = 0; i < 4; i++) circle(ctx, 2 + i * 4, 8 + (i % 2) * 2, 3, i % 2 ? color : shade(color, 0.15));
      break;
    case 'flesh':
      fillBase(ctx, color);
      rect(ctx, 0, 4, T, 1, shade(accent, 0.2));
      rect(ctx, 0, 9, T, 1, shade(accent, 0.2));
      break;
    default:
      fillBase(ctx, color);
      rect(ctx, 0, 0, T, 2, shade(color, 0.2));
      rect(ctx, 4, 0, 1, 12, shade(color, -0.25));
      rect(ctx, 11, 0, 1, 12, shade(color, -0.25));
  }
  return c;
}

function solid(family: Family, color: string, accent: string, seed: number): HTMLCanvasElement {
  const c = makeCanvas(T, T); const ctx = ctx2d(c);
  fillBase(ctx, color);
  rect(ctx, 0, 0, T, 1, shade(color, 0.2));
  rect(ctx, 0, T - 1, T, 1, shade(color, -0.25));
  rect(ctx, 0, 8, T, 1, shade(color, -0.15));
  rect(ctx, 8, 0, 1, 8, shade(color, -0.1));
  rect(ctx, 0, 9, 8, 1, shade(color, -0.1));
  if (family === 'flesh') wrapDot(ctx, 8, 8, 1.4, accent);
  return c;
}

function rope(color: string): HTMLCanvasElement {
  const c = makeCanvas(T, T); const ctx = ctx2d(c);
  rect(ctx, 6, 0, 4, T, color);
  for (let y = 0; y < T; y += 4) { rect(ctx, 6, y, 4, 1, shade(color, -0.3)); rect(ctx, 6, y + 2, 2, 1, shade(color, 0.2)); }
  return c;
}
function ladder(color: string): HTMLCanvasElement {
  const c = makeCanvas(T, T); const ctx = ctx2d(c);
  rect(ctx, 2, 0, 2, T, color); rect(ctx, 12, 0, 2, T, color);
  rect(ctx, 2, 6, 12, 2, shade(color, -0.15));
  return c;
}

const cache = new Map<string, PlatformTextures>();

export function getPlatformTextures(scene: Phaser.Scene, theme: ThemeId): PlatformTextures {
  const cached = cache.get(theme);
  if (cached && scene.textures.exists(cached.groundTop)) return cached;
  const pal = THEMES[theme];
  const family = FAMILY[theme];
  const seed = theme.length * 97;
  const reg = (name: string, canvas: HTMLCanvasElement) => { const key = `tile_${theme}_${name}`; registerCanvasTexture(scene, key, canvas); return key; };

  const result: PlatformTextures = {
    groundTop: reg('gtop', groundTop(family, pal.groundTop, pal.groundAccent, seed)),
    groundFill: reg('gfill', groundFill(family, pal.groundFill, pal.groundAccent, seed)),
    oneway: reg('oneway', oneway(family, pal.oneway, pal.groundAccent, seed)),
    solid: reg('solid', solid(family, pal.solid, pal.groundAccent, seed)),
    rope: reg('rope', rope(pal.rope)),
    ladder: reg('ladder', ladder(pal.rope)),
    tile: T,
  };
  cache.set(theme, result);
  return result;
}
