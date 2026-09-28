/**
 * Seamless 16x16 tile textures per ThemeId: ground top, ground fill, one-way platform,
 * solid block, rope, ladder.
 */
import Phaser from 'phaser';
import type { ThemeId } from '@shared/types';
import { makeCanvas, ctx2d, rect, circle, ellipse, poly, registerCanvasTexture, shade, seedRandom } from './canvasKit';
import { THEMES } from './palette';
import { warmHighlight, coolShadow } from './shading';
import type { PlatformTextures } from './spec';

const T = 16;
/** groundTop is drawn WV tiles wide (a whole seamless repeat block) instead of a single 16x16
 *  tile, so the TileSprite that renders it shows a natural 3-tile rotation of variants as it
 *  tiles across the map — different-looking ground "chosen deterministically by x" with zero
 *  changes needed in the terrain-building code that consumes this texture. */
const WV = 3;
const FULL = T * WV;

type Family = 'planks' | 'planksDark' | 'grass' | 'mossRock' | 'kelp' | 'rock' | 'coral' | 'flesh';

const FAMILY: Record<ThemeId, Family> = {
  driftmoor: 'planks', meadow: 'grass', grotto: 'mossRock', kelpwood: 'kelp',
  galeoutpost: 'planks', stormspire: 'rock', lanternreef: 'coral', galleon: 'planksDark',
  hollow: 'flesh', heart: 'flesh',
};

function wrapDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, span = T): void {
  for (const dx of [-span, 0, span]) for (const dy of [-T, 0, T]) circle(ctx, x + dx, y + dy, r, color);
}

function fillBase(ctx: CanvasRenderingContext2D, color: string, w = T): void { rect(ctx, 0, 0, w, T, color); }
/** Same as fillBase but at a given column offset — used inside the wide groundTop variant strip. */
function fillAt(ctx: CanvasRenderingContext2D, ox: number, color: string): void { rect(ctx, ox, 0, T, T, color); }

/** One 16px sub-tile's decorative top edge, for variant index v (0..WV-1) at column origin `ox`. */
function groundTopVariant(ctx: CanvasRenderingContext2D, family: Family, top: string, accent: string, rnd: () => number, ox: number, v: number): void {
  switch (family) {
    case 'grass':
      fillAt(ctx, ox, top);
      rect(ctx, ox, 0, T, 3, shade(top, 0.18));
      // grass tufts: variant 1 is a tall single blade, others a scattered clump — reads as natural variation
      if (v === 1) { rect(ctx, ox + T * 0.5 - 0.5, -2, 1, 4.5, shade(top, 0.32)); rect(ctx, ox + T * 0.4, -1, 1, 3, shade(top, 0.25)); }
      for (let i = 0; i < 8 + v * 2; i++) { const x = ox + rnd() * T; rect(ctx, x, -0.5, 1, 1.6 + rnd() * 2.2, shade(top, 0.28 + rnd() * 0.1)); }
      for (let i = 0; i < 6; i++) circle(ctx, ox + rnd() * T, rnd() * 2, 0.7, shade(top, -0.15));
      break;
    case 'mossRock':
      fillAt(ctx, ox, shade(top, -0.1));
      rect(ctx, ox, 0, T, 4, top);
      for (let i = 0; i < 6; i++) circle(ctx, ox + rnd() * T, rnd() * 3, 1.1, accent);
      // hanging moss drips at the seam into the fill below — length varies per variant
      for (let i = 0; i < 2 + v; i++) { const x = ox + 2 + rnd() * (T - 4); rect(ctx, x, T - 5, 1, 3 + rnd() * (2 + v * 1.5), shade(accent, -0.1)); }
      break;
    case 'kelp':
      fillAt(ctx, ox, top);
      for (let x = -2; x < T; x += 5) rect(ctx, ox + x + (v % 3), 0, 2, T, shade(top, -0.12));
      for (let i = 0; i < 6; i++) circle(ctx, ox + rnd() * T, rnd() * T, 0.7, accent);
      // small frond tips curling above the edge
      for (let i = 0; i < 2; i++) { const x = ox + 3 + i * 8 + v * 2; poly(ctx, [[x, 1], [x + 2, -2 - v], [x + 3, 1]], shade(top, 0.2)); }
      break;
    case 'rock':
      fillAt(ctx, ox, top);
      rect(ctx, ox, 0, T, 3, shade(top, 0.12));
      for (let i = 0; i < 8; i++) { const x = ox + rnd() * T, y = rnd() * T; rect(ctx, x, y, 1 + rnd() * 2, 1, shade(top, -0.15)); }
      // jagged silhouette notch + an occasional crystal glint for variety
      poly(ctx, [[ox + 2 + v * 3, 0], [ox + 5 + v * 3, -2.5 - v], [ox + 8 + v * 3, 0]], shade(top, -0.2));
      if (v === 2) circle(ctx, ox + T * 0.7, 1.4, 1, accent);
      break;
    case 'coral':
      fillAt(ctx, ox, shade(top, -0.15));
      for (let i = 0; i < 8; i++) circle(ctx, ox + (i * 2 + rnd() * 2) % T, T - 2 - rnd() * 4, 1.6, top);
      for (let i = 0; i < 5; i++) circle(ctx, ox + rnd() * T, rnd() * 6, 0.9, accent);
      // coral fringe knuckles poking above the line, height varies by variant
      for (let i = 0; i < 3; i++) { const x = ox + 2 + i * 5 + (v % 2); ellipse(ctx, x, 0.5 - v * 0.4, 1.4, 2 + v * 0.8, i % 2 ? top : shade(top, 0.15)); }
      break;
    case 'flesh':
      fillAt(ctx, ox, top);
      for (let i = 0; i < 3; i++) { const x = ox + rnd() * T; rect(ctx, x, 0, 1, T, shade(accent, 0.1)); }
      for (let i = 0; i < 5; i++) circle(ctx, ox + rnd() * T, rnd() * T, 1, shade(top, -0.2));
      // a pulsing vein bulge along the top, bigger on the "swollen" variant
      ellipse(ctx, ox + T * 0.5, 1, 3 + v * 1.2, 1.4 + v * 0.5, shade(accent, 0.15));
      break;
    case 'planksDark':
    case 'planks':
    default:
      fillAt(ctx, ox, top);
      rect(ctx, ox, 0, T, 2, shade(top, 0.2));
      rect(ctx, ox, T / 2, T, 1, shade(top, -0.25));
      rect(ctx, ox + T / 2, 0, 1, T, shade(top, -0.15));
      // a nail head per plank, position varies so the seam between planks doesn't repeat obviously
      circle(ctx, ox + 3 + v * 4, 1, 0.6, shade(top, -0.3));
      break;
  }
}

function groundTop(family: Family, top: string, accent: string, seed: number): HTMLCanvasElement {
  const c = makeCanvas(FULL, T); const ctx = ctx2d(c);
  for (let v = 0; v < WV; v++) groundTopVariant(ctx, family, top, accent, seedRandom(seed + v * 41), v * T, v);
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

/** Underside hanging detail drawn below a one-way platform's structural top (y >= fromY),
 *  themed per family — moss drips, icicle-like barnacles, coral fringe, dangling roots... —
 *  so platforms read as something with an underside, not just a floating bar. */
function underside(ctx: CanvasRenderingContext2D, family: Family, color: string, accent: string, rnd: () => number, fromY: number): void {
  switch (family) {
    case 'mossRock': // hanging moss drips
      for (let i = 0; i < 4; i++) { const x = 1 + rnd() * (T - 2); rect(ctx, x, fromY, 1, 2 + rnd() * 3, shade(accent, -0.1)); }
      circle(ctx, T * 0.3, fromY + 3, 1, shade(accent, 0.1));
      break;
    case 'rock': // icicle-like barnacle spikes
      for (let i = 0; i < 3; i++) { const x = 2 + i * 4.5; poly(ctx, [[x - 1.3, fromY], [x, fromY + 3 + (i % 2)], [x + 1.3, fromY]], shade(color, -0.1)); }
      break;
    case 'coral': // coral fringe knuckles
      for (let i = 0; i < 4; i++) ellipse(ctx, 2 + i * 3.6, fromY + 1.5, 1.5, 2.4 + (i % 2), i % 2 ? color : accent);
      break;
    case 'kelp': // thin dangling kelp strands
      for (let i = 0; i < 3; i++) { const x = 2 + i * 5; rect(ctx, x + Math.sin(i) * 1, fromY, 1.2, 3 + (i % 2) * 2, i % 2 ? color : accent); }
      break;
    case 'grass': // dangling roots
      for (let i = 0; i < 3; i++) { const x = 3 + i * 5; rect(ctx, x, fromY, 1, 2 + rnd() * 2, shade('#6b5438', -0.1)); }
      break;
    case 'flesh': // slow drips of the pulsing vein color
      for (let i = 0; i < 3; i++) circle(ctx, 2 + i * 5.5, fromY + 1 + rnd(), 1, shade(accent, 0.15));
      break;
    default: // planks — a crossbeam shadow suggests real structure underneath
      rect(ctx, 2, fromY, T - 4, 1, shade(color, -0.3));
  }
}

function oneway(family: Family, color: string, accent: string, seed: number): HTMLCanvasElement {
  const c = makeCanvas(T, T); const ctx = ctx2d(c);
  const rnd = seedRandom(seed + 13);
  switch (family) {
    case 'kelp':
      fillBase(ctx, 'rgba(0,0,0,0)');
      rect(ctx, 2, 0, 3, 12, color); rect(ctx, 9, 0, 3, 12, shade(color, -0.1));
      rect(ctx, 2, 0, 3, 1.4, warmHighlight(color, 0.25)); rect(ctx, 9, 0, 3, 1.4, warmHighlight(shade(color, -0.1), 0.2));
      wrapDot(ctx, 3, 4, 1, accent); wrapDot(ctx, 10, 8, 1, accent);
      underside(ctx, family, color, accent, rnd, 12);
      break;
    case 'coral':
      fillBase(ctx, 'rgba(0,0,0,0)');
      for (let i = 0; i < 4; i++) circle(ctx, 2 + i * 4, 8 + (i % 2) * 2, 3, i % 2 ? color : shade(color, 0.15));
      underside(ctx, family, color, accent, rnd, 11);
      break;
    case 'flesh':
      fillBase(ctx, color);
      rect(ctx, 0, 4, T, 1, warmHighlight(accent, 0.3));
      rect(ctx, 0, 9, T, 1, coolShadow(accent, 0.25));
      underside(ctx, family, color, accent, rnd, 13);
      break;
    default:
      fillBase(ctx, color);
      rect(ctx, 0, 0, T, 2, warmHighlight(color, 0.3)); // top-lit edge
      rect(ctx, 4, 0, 1, 12, coolShadow(color, 0.3));
      rect(ctx, 11, 0, 1, 12, coolShadow(color, 0.3));
      underside(ctx, family, color, accent, rnd, 12);
  }
  return c;
}

function solid(family: Family, color: string, accent: string, seed: number): HTMLCanvasElement {
  const c = makeCanvas(T, T); const ctx = ctx2d(c);
  fillBase(ctx, color);
  rect(ctx, 0, 0, T, 1, warmHighlight(color, 0.3)); // top-lit edge
  rect(ctx, 0, T - 1, T, 1, coolShadow(color, 0.3));
  rect(ctx, 0, 8, T, 1, coolShadow(color, 0.2));
  rect(ctx, 8, 0, 1, 8, coolShadow(color, 0.15));
  rect(ctx, 0, 9, 8, 1, coolShadow(color, 0.15));
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
