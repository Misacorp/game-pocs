/**
 * Non-colliding world decoration, themed per ThemeId where it matters. Anchored bottom-center.
 */
import Phaser from 'phaser';
import type { DecorKind, ThemeId } from '@shared/types';
import { makeCanvas, ctx2d, outlined, rect, rrect, circle, ellipse, line, poly, registerCanvasTexture, shade, hashStr, seedRandom } from './canvasKit';
import { THEMES, OUTLINE } from './palette';

type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number, theme: ThemeId) => void;

function organicColor(theme: ThemeId): { primary: string; secondary: string; accent: string } {
  const pal = THEMES[theme];
  return { primary: pal.groundAccent, secondary: shade(pal.groundAccent, -0.25), accent: pal.glow };
}

const SIZE: Partial<Record<DecorKind, [number, number]>> = {
  house: [40, 40], shop: [40, 36], tent: [30, 26], lamp: [10, 26], lantern: [14, 18], sign: [16, 20],
  crate: [16, 14], barrel: [14, 16], fence: [24, 14], well: [22, 18], tree: [30, 42], bush: [20, 14],
  flower: [8, 8], grass: [12, 8], rock: [18, 12], mushroom: [16, 16], kelp: [12, 36], coral: [18, 20],
  crystal: [12, 18], barnacle: [10, 10], bones: [22, 10], ruin: [26, 30], pillar: [12, 40], statue: [18, 32],
  windmill: [26, 44], mast: [10, 48], anchor: [16, 20], banner: [14, 24], campfire: [16, 12], vine: [8, 40],
  shell: [12, 10], pod: [10, 12], tendril: [10, 30], chest: [18, 12],
};

const DRAW: Record<DecorKind, DrawFn> = {
  house: (ctx, w, h) => { const wood = '#8a6a48'; rrect(ctx, 2, h * 0.32, w - 4, h * 0.68, 2, wood); poly(ctx, [[0, h * 0.34], [w / 2, 0], [w, h * 0.34]], shade(wood, -0.25)); rect(ctx, w * 0.4, h * 0.5, w * 0.2, h * 0.5, shade(wood, -0.35)); circle(ctx, w * 0.2, h * 0.55, 3, '#ffe07a'); },
  shop: (ctx, w, h) => { const wood = '#a9784a'; rrect(ctx, 2, h * 0.4, w - 4, h * 0.6, 2, wood); rect(ctx, 0, h * 0.32, w, h * 0.14, shade(wood, 0.25)); rect(ctx, w * 0.3, h * 0.55, w * 0.4, h * 0.45, shade(wood, -0.3)); },
  tent: (ctx, w, h) => { poly(ctx, [[2, h], [w / 2, 0], [w - 2, h]], '#c9a15c'); poly(ctx, [[w * 0.4, h], [w / 2, h * 0.4], [w * 0.6, h]], '#8a6a48'); },
  lamp: (ctx, w, h) => { rect(ctx, w / 2 - 1, h * 0.25, 2, h * 0.75, '#4a4038'); circle(ctx, w / 2, h * 0.16, w * 0.32, '#ffdd88'); },
  lantern: (ctx, w, h) => { rect(ctx, w / 2 - 0.5, 0, 1, h * 0.2, '#3a3226'); rrect(ctx, w * 0.2, h * 0.2, w * 0.6, h * 0.6, 2, '#5a4636'); ellipse(ctx, w / 2, h * 0.5, w * 0.22, h * 0.22, '#ffdd88'); },
  sign: (ctx, w, h) => { rect(ctx, w / 2 - 1.5, h * 0.3, 3, h * 0.7, '#6b5438'); rrect(ctx, 0, 0, w, h * 0.4, 1, '#8a6a48'); },
  crate: (ctx, w, h) => { rect(ctx, 0, 0, w, h, '#8a6a48'); rect(ctx, 0, h * 0.4, w, 1.5, '#5a4636'); rect(ctx, w * 0.4, 0, 1.5, h, '#5a4636'); },
  barrel: (ctx, w, h) => { rrect(ctx, 0, 0, w, h, 3, '#7a5636'); rect(ctx, 0, h * 0.2, w, 1.5, '#4a3826'); rect(ctx, 0, h * 0.7, w, 1.5, '#4a3826'); },
  fence: (ctx, w, h) => { for (let x = 0; x < w; x += 6) rect(ctx, x, 0, 2.4, h, '#8a6a48'); rect(ctx, 0, h * 0.3, w, 2, '#6b5438'); rect(ctx, 0, h * 0.7, w, 2, '#6b5438'); },
  well: (ctx, w, h) => { ctx.fillStyle = '#6b5438'; ctx.beginPath(); ctx.ellipse(w / 2, h * 0.7, w * 0.48, h * 0.28, 0, 0, Math.PI * 2); ctx.fill(); ellipse(ctx, w / 2, h * 0.65, w * 0.32, h * 0.16, '#1c2a30'); poly(ctx, [[2, h * 0.5], [2, 0], [w - 2, 0], [w - 2, h * 0.5]], '#8a6a48'); },
  tree: (ctx, w, h, theme) => {
    const c = organicColor(theme);
    if (theme === 'kelpwood') { line(ctx, w / 2, h, w / 2, h * 0.15, 3, c.secondary); for (let i = 0; i < 5; i++) ellipse(ctx, w / 2 + (i % 2 ? 6 : -6), h * 0.2 + i * h * 0.12, 8, 4, c.primary); }
    else if (theme === 'hollow' || theme === 'heart') { line(ctx, w / 2, h, w / 2, h * 0.3, 3, '#3a1f40'); for (const s of [-1, 1]) line(ctx, w / 2, h * 0.5, w / 2 + s * 10, h * 0.2, 2, '#3a1f40'); circle(ctx, w / 2, h * 0.18, 6, c.accent); }
    else { rect(ctx, w / 2 - 2, h * 0.45, 4, h * 0.55, '#6b5438'); circle(ctx, w / 2, h * 0.32, w * 0.42, c.primary); circle(ctx, w * 0.3, h * 0.45, w * 0.28, shade(c.primary, -0.1)); circle(ctx, w * 0.68, h * 0.42, w * 0.3, shade(c.primary, 0.08)); }
  },
  bush: (ctx, w, h, theme) => { const c = organicColor(theme); circle(ctx, w * 0.3, h * 0.6, h * 0.5, c.primary); circle(ctx, w * 0.7, h * 0.5, h * 0.55, shade(c.primary, -0.08)); },
  flower: (ctx, w, h, theme) => { const c = organicColor(theme); line(ctx, w / 2, h, w / 2, h * 0.4, 1, '#4a7a3a'); circle(ctx, w / 2, h * 0.25, 3, c.accent); },
  grass: (ctx, w, h, theme) => { const c = organicColor(theme); for (let i = 0; i < 4; i++) line(ctx, i * 3 + 1, h, i * 3 - 1 + (i % 2) * 2, h * 0.1, 1.4, c.primary); },
  rock: (ctx, w, h, theme) => { poly(ctx, [[0, h], [2, h * 0.3], [w * 0.5, 0], [w - 2, h * 0.4], [w, h]], shade(THEMES[theme].groundFill, 0.1)); },
  mushroom: (ctx, w, h, theme) => { const c = organicColor(theme); rect(ctx, w / 2 - 1.5, h * 0.4, 3, h * 0.6, '#e8dcc0'); ellipse(ctx, w / 2, h * 0.35, w * 0.46, h * 0.3, c.primary); circle(ctx, w * 0.35, h * 0.28, 1.4, c.accent); circle(ctx, w * 0.62, h * 0.35, 1.4, c.accent); },
  kelp: (ctx, w, h, theme) => { const c = organicColor(theme); for (let i = 0; i < h; i += 5) { const off = Math.sin(i * 0.5) * 3; rect(ctx, w / 2 - 2 + off, h - i, 4, 5, i % 10 ? c.primary : c.secondary); } },
  coral: (ctx, w, h, theme) => { const c = organicColor(theme); for (let i = 0; i < 3; i++) ellipse(ctx, w * 0.2 + i * w * 0.3, h - 4 - i * 3, 6, 10, i % 2 ? c.primary : c.accent); },
  crystal: (ctx, w, h, theme) => { const c = organicColor(theme); poly(ctx, [[w / 2, 0], [w, h * 0.5], [w * 0.7, h], [w * 0.3, h], [0, h * 0.5]], c.accent); poly(ctx, [[w / 2, h * 0.15], [w * 0.8, h * 0.5], [w / 2, h]], shade(c.accent, -0.15)); },
  barnacle: (ctx, w, h, theme) => { const c = organicColor(theme); circle(ctx, w / 2, h * 0.6, w * 0.42, c.secondary); circle(ctx, w / 2, h * 0.45, w * 0.2, c.accent); },
  bones: (ctx, w, h) => { for (let i = 0; i < 3; i++) ellipse(ctx, i * 8 + 2, h * 0.6, 3, 5, '#e8e0c8'); line(ctx, 0, h * 0.5, w, h * 0.5, 2, '#e8e0c8'); },
  ruin: (ctx, w, h, theme) => { const stone = shade(THEMES[theme].groundFill, 0.15); rect(ctx, 2, h * 0.3, w * 0.3, h * 0.7, stone); rect(ctx, w * 0.6, h * 0.15, w * 0.32, h * 0.85, stone); rect(ctx, 0, h * 0.28, w, 3, shade(stone, -0.2)); },
  pillar: (ctx, w, h, theme) => { const stone = shade(THEMES[theme].groundFill, 0.15); rect(ctx, w * 0.2, 0, w * 0.6, h, stone); rect(ctx, w * 0.1, 0, w * 0.8, 3, shade(stone, -0.2)); rect(ctx, w * 0.1, h - 3, w * 0.8, 3, shade(stone, -0.2)); },
  statue: (ctx, w, h, theme) => { const stone = shade(THEMES[theme].groundFill, 0.2); rect(ctx, w * 0.3, h * 0.5, w * 0.4, h * 0.5, stone); circle(ctx, w / 2, h * 0.32, w * 0.24, stone); rect(ctx, w * 0.15, h * 0.9, w * 0.7, h * 0.1, shade(stone, -0.1)); },
  windmill: (ctx, w, h) => { rect(ctx, w * 0.4, h * 0.2, w * 0.2, h * 0.8, '#8a6a48'); for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; line(ctx, w / 2, h * 0.2, w / 2 + Math.cos(a) * w * 0.4, h * 0.2 + Math.sin(a) * w * 0.4, 3, '#d8cdb0'); } },
  mast: (ctx, w, h) => { rect(ctx, w / 2 - 1.5, 0, 3, h, '#6b5438'); poly(ctx, [[w / 2, h * 0.1], [w, h * 0.28], [w / 2, h * 0.45]], '#d8cdb0'); },
  anchor: (ctx, w, h) => { circle(ctx, w / 2, h * 0.18, 3, '#8a97a6'); rect(ctx, w / 2 - 1.2, h * 0.2, 2.4, h * 0.6, '#8a97a6'); ctx.strokeStyle = '#8a97a6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(w / 2, h * 0.78, w * 0.32, 0.2, Math.PI - 0.2); ctx.stroke(); },
  banner: (ctx, w, h, theme) => { const c = organicColor(theme); rect(ctx, w / 2 - 1, 0, 2, h, '#5a4636'); poly(ctx, [[w / 2, h * 0.08], [w, h * 0.14], [w / 2 + 2, h * 0.4], [w, h * 0.5], [w / 2, h * 0.56]], c.accent); },
  campfire: (ctx, w, h) => { for (let i = 0; i < 3; i++) line(ctx, i * 5, h, i * 5 + 3, h * 0.5, 2, '#5a4636'); poly(ctx, [[w / 2 - 3, h * 0.55], [w / 2, h * 0.05], [w / 2 + 3, h * 0.55]], '#ff8a3a'); poly(ctx, [[w / 2 - 1.5, h * 0.5], [w / 2, h * 0.2], [w / 2 + 1.5, h * 0.5]], '#ffe07a'); },
  vine: (ctx, w, h, theme) => { const c = organicColor(theme); for (let y = 0; y < h; y += 4) line(ctx, w / 2 + Math.sin(y * 0.4) * 2, y, w / 2 + Math.sin((y + 4) * 0.4) * 2, y + 4, 1.6, c.primary); },
  shell: (ctx, w, h, theme) => { const c = organicColor(theme); ellipse(ctx, w / 2, h * 0.7, w * 0.45, h * 0.3, c.primary); for (let i = -2; i <= 2; i++) line(ctx, w / 2, h * 0.4, w / 2 + i * 3, h * 0.85, 1, shade(c.primary, -0.2)); },
  pod: (ctx, w, h, theme) => { const c = organicColor(theme); ellipse(ctx, w / 2, h * 0.5, w * 0.38, h * 0.45, c.secondary); circle(ctx, w / 2, h * 0.5, w * 0.16, c.accent); },
  tendril: (ctx, w, h, theme) => { const c = organicColor(theme); for (let y = 0; y < h; y += 5) circle(ctx, w / 2 + Math.sin(y * 0.5) * 3, h - y, 2, y % 10 ? c.secondary : c.accent); },
  chest: (ctx, w, h) => { rrect(ctx, 0, h * 0.35, w, h * 0.65, 2, '#8a6a48'); rrect(ctx, 0, 0, w, h * 0.4, 2, '#a9784a'); rect(ctx, w / 2 - 2, h * 0.3, 4, h * 0.2, '#e8c95a'); },
};

const cache = new Map<string, { key: string }>();

export function getDecorTexture(scene: Phaser.Scene, kind: DecorKind, theme: ThemeId): { key: string } {
  const key = `decor_${theme}_${kind}`;
  const cached = cache.get(key);
  if (cached && scene.textures.exists(key)) return cached;
  const [w, h] = SIZE[kind] ?? [20, 24];
  const art = makeCanvas(w, h);
  const ctx = ctx2d(art);
  (DRAW[kind] ?? DRAW.rock)(ctx, w, h, theme);
  registerCanvasTexture(scene, key, outlined(art, OUTLINE, false));
  const result = { key };
  cache.set(key, result);
  return result;
}
