/**
 * Per-ThemeId parallax backgrounds: a sky gradient plus 3-5 scrolling layers, always featuring
 * distant drifting skywhales. Layers are screen-locked TileSprites whose tilePosition is driven
 * manually from the camera scroll, so the background always covers the viewport regardless of
 * camera position or map size.
 */
import Phaser from 'phaser';
import type { ThemeId } from '@shared/types';
import { makeCanvas, ctx2d, rect, circle, ellipse, poly, line, shade, withAlpha, seedRandom, registerCanvasTexture } from './canvasKit';
import { THEMES } from './palette';
import type { Parallax } from './spec';

const VIEW_W = 640, VIEW_H = 360; // world-unit viewport at zoom 2

function skyCanvas(theme: ThemeId): HTMLCanvasElement {
  const pal = THEMES[theme];
  const c = makeCanvas(VIEW_W, VIEW_H);
  const ctx = ctx2d(c);
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, pal.skyTop); g.addColorStop(0.55, pal.skyMid); g.addColorStop(1, pal.skyBottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // glow disc (sun/moon)
  const gx = VIEW_W * 0.72, gy = VIEW_H * 0.28;
  const rg = ctx.createRadialGradient(gx, gy, 4, gx, gy, 90);
  rg.addColorStop(0, withAlpha(pal.glow, 0.9)); rg.addColorStop(1, withAlpha(pal.glow, 0));
  ctx.fillStyle = rg; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (pal.dark) {
    const rnd = seedRandom(theme.length * 51 + 3);
    for (let i = 0; i < 70; i++) { const x = rnd() * VIEW_W, y = rnd() * VIEW_H * 0.7; ctx.fillStyle = withAlpha('#ffffff', 0.15 + rnd() * 0.4); ctx.fillRect(x, y, 1, 1); }
  }
  return c;
}

function drawWhale(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, color: string, rnd: () => number): void {
  const h = w * 0.42;
  ellipse(ctx, cx, cy, w * 0.5, h * 0.5, color);
  poly(ctx, [[cx - w * 0.46, cy], [cx - w * 0.7, cy - h * 0.28], [cx - w * 0.5, cy + h * 0.1]], color); // tail fin
  ellipse(ctx, cx + w * 0.3, cy + h * 0.05, w * 0.14, h * 0.22, color); // head bump
  for (let i = 0; i < 4; i++) { // tiny town/tree silhouettes on the back
    const tx = cx - w * 0.28 + i * w * 0.16 + rnd() * 6;
    const ty = cy - h * 0.42;
    ctx.fillStyle = color;
    ctx.fillRect(tx, ty - 3 - (i % 2) * 2, 2, 4 + (i % 2) * 2);
  }
}

function whaleLayer(theme: ThemeId): HTMLCanvasElement {
  const pal = THEMES[theme];
  const w = 900, h = 240;
  const c = makeCanvas(w, h);
  const ctx = ctx2d(c);
  const rnd = seedRandom(theme.length * 31 + 11);
  const color = withAlpha(pal.farSilhouette, 0.85);
  drawWhale(ctx, w * 0.18, h * 0.55, 190, color, rnd);
  drawWhale(ctx, w * 0.62, h * 0.32, 130, withAlpha(pal.farSilhouette, 0.6), rnd);
  drawWhale(ctx, w * 0.86, h * 0.68, 100, withAlpha(pal.farSilhouette, 0.5), rnd);
  return c;
}

type Kind = 'cloud' | 'islands' | 'stalactite' | 'kelp' | 'windmillCliff' | 'stormClouds' | 'coralReef' | 'shipRibs' | 'boneArch' | 'veins';

const MID_KIND: Record<ThemeId, Kind> = {
  driftmoor: 'cloud', meadow: 'cloud', grotto: 'stalactite', kelpwood: 'kelp', galeoutpost: 'windmillCliff',
  stormspire: 'stormClouds', lanternreef: 'coralReef', galleon: 'shipRibs', hollow: 'boneArch', heart: 'veins',
};

function midLayer(theme: ThemeId): HTMLCanvasElement {
  const pal = THEMES[theme]; const kind = MID_KIND[theme];
  const w = 760, h = 220;
  const c = makeCanvas(w, h); const ctx = ctx2d(c);
  const rnd = seedRandom(theme.length * 71 + 5);
  const col = withAlpha(pal.midSilhouette, 0.8);
  switch (kind) {
    case 'cloud':
      for (let i = 0; i < 6; i++) { const cx = rnd() * w, cy = 30 + rnd() * 60, r = 20 + rnd() * 24; ellipse(ctx, cx, cy, r, r * 0.5, col); ellipse(ctx, cx + r * 0.5, cy + r * 0.15, r * 0.6, r * 0.4, col); ellipse(ctx, cx - r * 0.5, cy + r * 0.15, r * 0.6, r * 0.4, col); }
      break;
    case 'islands':
      for (let i = 0; i < 4; i++) { const cx = i * 200 + rnd() * 60, cy = 60 + rnd() * 40; poly(ctx, [[cx - 40, cy], [cx + 40, cy], [cx + 20, cy + 26], [cx - 20, cy + 26]], col); }
      break;
    case 'stalactite':
      for (let i = 0; i < 10; i++) { const x = i * (w / 10) + rnd() * 20; const len = 30 + rnd() * 50; poly(ctx, [[x, 0], [x + 14, 0], [x + 7, len]], col); }
      break;
    case 'kelp':
      for (let i = 0; i < 8; i++) { const x = i * (w / 8) + rnd() * 30; for (let s = -1; s <= 1; s += 2) line(ctx, x, h, x + s * (14 + rnd() * 10), h * 0.15, 6, col); }
      break;
    case 'windmillCliff':
      for (let i = 0; i < 3; i++) { const cx = i * 260 + 80; rect(ctx, cx - 3, 60, 6, 90, col); circle(ctx, cx, 55, 30, withAlpha(pal.midSilhouette, 0.5)); for (let b = 0; b < 4; b++) { const a = (b / 4) * Math.PI * 2; line(ctx, cx, 55, cx + Math.cos(a) * 26, 55 + Math.sin(a) * 26, 4, col); } }
      break;
    case 'stormClouds':
      for (let i = 0; i < 5; i++) { const cx = rnd() * w, cy = 20 + rnd() * 50, r = 40 + rnd() * 30; ellipse(ctx, cx, cy, r, r * 0.45, withAlpha('#14141c', 0.85)); }
      break;
    case 'coralReef':
      for (let i = 0; i < 7; i++) { const x = i * (w / 7) + rnd() * 20, base = h - 10; for (let s = 0; s < 3; s++) ellipse(ctx, x + s * 6 - 6, base - s * 14, 10, 16, withAlpha(pal.midSilhouette, 0.7)); }
      for (let i = 0; i < 12; i++) circle(ctx, rnd() * w, rnd() * h * 0.6, 1.6, withAlpha(pal.glow, 0.6)); // fish shoal dots
      break;
    case 'shipRibs':
      for (let i = 0; i < 6; i++) { const x = i * (w / 6) + 30; poly(ctx, [[x - 24, h], [x, 20], [x + 24, h]], withAlpha(pal.midSilhouette, 0.55)); }
      break;
    case 'boneArch':
      for (let i = 0; i < 3; i++) { const cx = i * 260 + 120; ctx.strokeStyle = col; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(cx, h + 40, 90, Math.PI, 0); ctx.stroke(); }
      break;
    case 'veins':
      for (let i = 0; i < 10; i++) { let x = rnd() * w, y = 0; ctx.strokeStyle = withAlpha(pal.glow, 0.35); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y); for (let s = 0; s < 6; s++) { x += (rnd() - 0.5) * 40; y += h / 6; ctx.lineTo(x, y); } ctx.stroke(); }
      break;
  }
  return c;
}

function nearLayer(theme: ThemeId): HTMLCanvasElement {
  const pal = THEMES[theme];
  const w = 520, h = 100;
  const c = makeCanvas(w, h); const ctx = ctx2d(c);
  const rnd = seedRandom(theme.length * 113 + 9);
  const col = withAlpha(shade(pal.groundFill, -0.1), 0.9);
  for (let i = 0; i < 9; i++) { const x = i * (w / 9) + rnd() * 20; const r = 12 + rnd() * 14; ellipse(ctx, x, h - 4, r, r * 0.6, col); }
  return c;
}

export function createParallax(scene: Phaser.Scene, theme: ThemeId, _w: number, _h: number): Parallax {
  const pal = THEMES[theme];
  const zoom = scene.cameras.main.zoom || 2;
  const vw = scene.scale.width / zoom, vh = scene.scale.height / zoom;

  const skyKey = `bg_${theme}_sky`; registerCanvasTexture(scene, skyKey, skyCanvas(theme));
  const whaleKey = `bg_${theme}_whale`; registerCanvasTexture(scene, whaleKey, whaleLayer(theme));
  const midKey = `bg_${theme}_mid`; registerCanvasTexture(scene, midKey, midLayer(theme));
  const nearKey = `bg_${theme}_near`; registerCanvasTexture(scene, nearKey, nearLayer(theme));

  const sky = scene.add.image(0, 0, skyKey).setOrigin(0).setScrollFactor(0).setDepth(-100).setDisplaySize(vw, vh);
  const whale = scene.add.tileSprite(0, vh * 0.05, vw, vh * 0.55, whaleKey).setOrigin(0).setScrollFactor(0).setDepth(-90);
  const mid = scene.add.tileSprite(0, vh * 0.1, vw, vh * 0.6, midKey).setOrigin(0).setScrollFactor(0).setDepth(-80).setAlpha(0.9);
  const near = scene.add.tileSprite(0, vh - vh * 0.28, vw, vh * 0.3, nearKey).setOrigin(0).setScrollFactor(0).setDepth(-70).setAlpha(0.95);

  let lightning: Phaser.GameObjects.Rectangle | undefined;
  let lightningTimer = 2000 + Math.random() * 3000;
  if (pal.weather === 'storm') {
    lightning = scene.add.rectangle(0, 0, vw, vh, 0xffffff, 0).setOrigin(0).setScrollFactor(0).setDepth(-75);
  }

  let t = 0;
  const start = performance.now();

  return {
    update(cam: Phaser.Cameras.Scene2D.Camera) {
      t = (performance.now() - start) / 1000;
      whale.tilePositionX = cam.scrollX * 0.04 + t * 1.6;
      whale.tilePositionY = Math.sin(t * 0.15) * 3;
      mid.tilePositionX = cam.scrollX * 0.16 + t * 0.6;
      near.tilePositionX = cam.scrollX * 0.42;
      if (lightning) {
        lightningTimer -= 16;
        if (lightningTimer <= 0) {
          lightningTimer = 3000 + Math.random() * 4000;
          lightning.setAlpha(0.5);
          scene.tweens.add({ targets: lightning, alpha: 0, duration: 220, ease: 'Cubic.easeOut' });
        }
      }
    },
    destroy() {
      sky.destroy(); whale.destroy(); mid.destroy(); near.destroy(); lightning?.destroy();
    },
  };
}
