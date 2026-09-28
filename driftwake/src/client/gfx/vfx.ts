/**
 * VFX: spawnVfx (one-shot effects for every VfxStyle), projectile textures, telegraphs,
 * hit sparks. Built from a small set of cached base textures tinted/scaled/rotated at
 * spawn time — no per-hit texture generation.
 */
import Phaser from 'phaser';
import type { VfxStyle } from '@shared/types';
import { makeCanvas, ctx2d, rect, circle, ellipse, line, poly, registerCanvasTexture, hexNum, withAlpha } from './canvasKit';
import { outlineHued, emissiveDab } from './shading';
import type { VfxOpts } from './spec';

// ---------------------------------------------------------------------------
// base white textures (tinted at draw time)
// ---------------------------------------------------------------------------

let baseReady = false;
function ensureBase(scene: Phaser.Scene): void {
  if (scene.textures.exists('vfx_soft')) return;
  {
    const c = makeCanvas(32, 32); const ctx = ctx2d(c);
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32);
    registerCanvasTexture(scene, 'vfx_soft', c);
  }
  {
    const c = makeCanvas(32, 32); const ctx = ctx2d(c);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(16, 16, 11, 0, Math.PI * 2); ctx.stroke();
    registerCanvasTexture(scene, 'vfx_ring', c);
  }
  {
    const c = makeCanvas(28, 20); const ctx = ctx2d(c);
    ctx.fillStyle = '#ffffff'; ctx.beginPath();
    ctx.moveTo(2, 18); ctx.quadraticCurveTo(14, -4, 26, 10); ctx.quadraticCurveTo(14, 8, 4, 20); ctx.closePath(); ctx.fill();
    registerCanvasTexture(scene, 'vfx_crescent', c);
  }
  {
    const c = makeCanvas(16, 16); const ctx = ctx2d(c);
    poly(ctx, [[8, 0], [10, 6], [16, 8], [10, 10], [8, 16], [6, 10], [0, 8], [6, 6]], '#ffffff');
    registerCanvasTexture(scene, 'vfx_spark', c);
  }
  {
    const c = makeCanvas(12, 32); const ctx = ctx2d(c);
    ctx.fillStyle = '#ffffff';
    poly(ctx, [[6, 0], [10, 12], [7, 13], [11, 32], [2, 16], [6, 15], [1, 2]], '#ffffff');
    registerCanvasTexture(scene, 'vfx_bolt', c);
  }
  {
    const c = makeCanvas(14, 18); const ctx = ctx2d(c);
    ellipse(ctx, 7, 10, 6, 8, '#ffffff');
    registerCanvasTexture(scene, 'vfx_drop', c);
  }
  {
    const c = makeCanvas(16, 4); const ctx = ctx2d(c);
    rect(ctx, 0, 0, 16, 4, '#ffffff');
    registerCanvasTexture(scene, 'vfx_line', c);
  }
  {
    const c = makeCanvas(8, 8); const ctx = ctx2d(c);
    circle(ctx, 4, 4, 4, '#ffffff');
    registerCanvasTexture(scene, 'vfx_dot', c);
  }
  {
    // a tight, near-opaque white core (vs. vfx_soft's wide gentle falloff) — layered untinted
    // on top of a tinted glow so a hit reads as "white-hot center fading to saturated color"
    // instead of one flat tint, which is what actually sells bloom on an effect.
    const c = makeCanvas(20, 20); const ctx = ctx2d(c);
    const g = ctx.createRadialGradient(10, 10, 0, 10, 10, 10);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 20, 20);
    registerCanvasTexture(scene, 'vfx_hotcore', c);
  }
  baseReady = true;
}

/** Drops a small, untinted white-hot flash on top of a (usually tinted) effect — the "core"
 *  that fades into its saturated color halo, instead of one flat-colored blob. */
function hotCore(scene: Phaser.Scene, x: number, y: number, scale: number, life = 140): void {
  const h = scene.add.image(x, y, 'vfx_hotcore').setDepth(62).setScale(scale).setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({ targets: h, scale: scale * 1.4, alpha: 0, duration: life, onComplete: () => h.destroy() });
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function img(scene: Phaser.Scene, key: string, x: number, y: number, opts: VfxOpts): Phaser.GameObjects.Image {
  const im = scene.add.image(x, y, key).setDepth(opts.depth ?? 60).setTint(hexNum(opts.color));
  im.setScale((opts.scale ?? 1) * (opts.flipX ? -1 : 1), opts.scale ?? 1);
  if (opts.rotation) im.setRotation(opts.rotation);
  if (opts.width) im.displayWidth = opts.width * (opts.flipX ? -1 : 1);
  if (opts.height) im.displayHeight = opts.height;
  return im;
}

/** Same as img(), but additive-blended — for the "light" part of an effect (glows, energy,
 *  sparks) as opposed to its solid/material part (a blade, an ice shard). This is most of what
 *  makes a hit or skill "pop": additive light overdraws brighter instead of just alpha-covering. */
function glowImg(scene: Phaser.Scene, key: string, x: number, y: number, opts: VfxOpts): Phaser.GameObjects.Image {
  return img(scene, key, x, y, opts).setBlendMode(Phaser.BlendModes.ADD);
}

function fadeOut(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject, duration: number, extra: Record<string, unknown> = {}): void {
  scene.tweens.add({ targets: target, alpha: 0, duration, ...extra, onComplete: () => target.destroy() });
}

function burst(scene: Phaser.Scene, x: number, y: number, texture: string, tint: number, count: number, speed: number, life: number, scaleStart = 0.9, scaleEnd = 0, gravityY = 0): void {
  const emitter = scene.add.particles(x, y, texture, {
    tint, speed: { min: speed * 0.4, max: speed }, lifespan: life, quantity: count,
    scale: { start: scaleStart, end: scaleEnd }, alpha: { start: 1, end: 0 }, gravityY,
    blendMode: Phaser.BlendModes.ADD, emitting: false,
  }).setDepth(55);
  emitter.explode(count);
  scene.time.delayedCall(life + 60, () => emitter.destroy());
}

// ---------------------------------------------------------------------------
// spawnVfx
// ---------------------------------------------------------------------------

export function spawnVfx(scene: Phaser.Scene, style: VfxStyle, x: number, y: number, opts: VfxOpts): void {
  ensureBase(scene);
  const dur = opts.durationMs ?? 260;
  const scale = opts.scale ?? 1;
  const color2 = opts.color2 ?? opts.color;
  switch (style) {
    case 'slash': case 'arc': {
      const rot = opts.rotation ?? 0;
      // additive under-glow trailing the blade — this is most of the "pop": the crescent alone
      // reads as a shape, the glow behind it reads as light/energy
      const glow = glowImg(scene, 'vfx_soft', x, y, { ...opts, scale: scale * 0.9 });
      glow.setAlpha(0.55);
      scene.tweens.add({ targets: glow, scale: scale * 1.3, alpha: 0, duration: dur * 0.8, onComplete: () => glow.destroy() });
      hotCore(scene, x, y, scale * 0.5, 120); // white-hot edge fading to color
      const s = img(scene, 'vfx_crescent', x, y, { ...opts, scale: scale * 1.1 });
      s.setRotation(rot);
      // a fainter, larger "smear" crescent lags one tick behind for a motion-blur trail
      const smear = img(scene, 'vfx_crescent', x, y, { ...opts, scale: scale * 1.25 });
      smear.setRotation(rot); smear.setAlpha(0.35);
      scene.tweens.add({ targets: s, angle: (opts.flipX ? -1 : 1) * 40, alpha: 0, scaleX: s.scaleX * 1.3, duration: dur, onComplete: () => s.destroy() });
      scene.tweens.add({ targets: smear, angle: (opts.flipX ? -1 : 1) * 40, alpha: 0, scaleX: smear.scaleX * 1.5, duration: dur * 1.25, delay: 40, onComplete: () => smear.destroy() });
      burst(scene, x, y, 'vfx_spark', hexNum(opts.color), 3, 60 * scale, 160);
      break;
    }
    case 'heavySlash': {
      const glow = glowImg(scene, 'vfx_soft', x, y, { ...opts, scale: scale * 1.1, color: color2 });
      glow.setAlpha(0.6);
      scene.tweens.add({ targets: glow, scale: scale * 1.7, alpha: 0, duration: dur, onComplete: () => glow.destroy() });
      hotCore(scene, x, y, scale * 0.7, 150);
      const s1 = img(scene, 'vfx_crescent', x, y, { ...opts, scale: scale * 1.5 });
      const s2 = img(scene, 'vfx_crescent', x, y, { ...opts, scale: scale * 1.1, color: color2 });
      s2.setAlpha(0.7);
      scene.tweens.add({ targets: [s1, s2], angle: (opts.flipX ? -1 : 1) * 55, alpha: 0, duration: dur + 80, onComplete: () => { s1.destroy(); s2.destroy(); } });
      burst(scene, x, y, 'vfx_spark', hexNum(opts.color), 6, 120 * scale, 220);
      break;
    }
    case 'thrust': {
      const s = img(scene, 'vfx_line', x, y, { ...opts, width: (opts.width ?? 26) * 0.2, height: opts.height ?? 5 });
      const tipX = x + (opts.flipX ? -1 : 1) * (opts.width ?? 26);
      scene.tweens.add({
        targets: s, x: tipX, alpha: 0, duration: dur * 0.7, onComplete: () => {
          s.destroy();
          const flash = glowImg(scene, 'vfx_soft', tipX, y, { ...opts, scale: scale * 0.6 });
          scene.tweens.add({ targets: flash, scale: scale, alpha: 0, duration: 140, onComplete: () => flash.destroy() });
        },
      });
      break;
    }
    case 'spin': {
      const glow = glowImg(scene, 'vfx_soft', x, y, { ...opts, scale: scale * 0.5 });
      scene.tweens.add({ targets: glow, scale: scale * 1.1, alpha: 0, duration: dur + 80, onComplete: () => glow.destroy() });
      const r = glowImg(scene, 'vfx_ring', x, y, { ...opts, scale: scale * 0.4 });
      scene.tweens.add({ targets: r, scale: scale * 1.4, alpha: 0, angle: 200, duration: dur + 100, onComplete: () => r.destroy() });
      break;
    }
    case 'bolt': {
      const core = glowImg(scene, 'vfx_soft', x, y, { ...opts, scale: scale * 0.8 });
      scene.tweens.add({ targets: core, scale: scale * 1.2, alpha: 0, duration: 180, onComplete: () => core.destroy() });
      for (let i = 0; i < 3; i++) {
        const line2 = glowImg(scene, 'vfx_line', x, y, { ...opts, width: 10 + i * 4, height: 2, rotation: (Math.random() - 0.5) * 1.2 });
        scene.tweens.add({ targets: line2, alpha: 0, scaleX: 1.6, duration: 150, onComplete: () => line2.destroy() });
      }
      break;
    }
    case 'bullet': case 'arrow': case 'shuriken': case 'dagger': {
      const s = img(scene, 'vfx_dot', x, y, { ...opts, width: 6, height: 6 });
      fadeOut(scene, s, 150);
      break;
    }
    case 'orb': {
      const g = glowImg(scene, 'vfx_soft', x, y, { ...opts, scale: scale * 1.3 });
      scene.tweens.add({ targets: g, scale: scale * 1.7, alpha: 0, duration: dur, onComplete: () => g.destroy() });
      // rim glow: a bright ring plus a small hot core reads as an orb with real depth, not a flat disc
      const rim = glowImg(scene, 'vfx_ring', x, y, { ...opts, scale: scale * 0.45, color: color2 });
      rim.setAlpha(0.7);
      scene.tweens.add({ targets: rim, scale: scale * 0.6, alpha: 0.9, yoyo: true, duration: dur * 0.5, repeat: 1, onComplete: () => rim.destroy() });
      hotCore(scene, x, y, scale * 0.35, dur);
      break;
    }
    case 'explosion': {
      // snappy: the flash reads instantly, the ring/sparks finish just after — under 350ms total
      const g = glowImg(scene, 'vfx_soft', x, y, { ...opts, scale: scale * 0.6, color: opts.color });
      scene.tweens.add({ targets: g, scale: scale * 2.4, alpha: 0, duration: Math.min(dur + 70, 300), onComplete: () => g.destroy() });
      hotCore(scene, x, y, scale * 0.9, 160); // hot white core at the heart of the blast
      const ring = glowImg(scene, 'vfx_ring', x, y, { ...opts, scale: scale * 0.3, color: color2 });
      scene.tweens.add({ targets: ring, scale: scale * 2.1, alpha: 0, duration: Math.min(dur + 90, 340), onComplete: () => ring.destroy() });
      burst(scene, x, y, 'vfx_spark', hexNum(opts.color), 14, 150 * scale, 300);
      break;
    }
    case 'lightning': {
      const b = glowImg(scene, 'vfx_bolt', x, y - 16 * scale, { ...opts, scale });
      b.setOrigin(0.5, 0);
      scene.tweens.add({ targets: b, alpha: 0, duration: 220, onComplete: () => b.destroy() });
      hotCore(scene, x, y - 16 * scale, scale * 0.5, 110); // white core at the strike point
      const flash = glowImg(scene, 'vfx_soft', x, y, { ...opts, scale: scale * 1.2 });
      fadeOut(scene, flash, 180);
      break;
    }
    case 'ice': {
      for (let i = 0; i < 4; i++) {
        const d = img(scene, 'vfx_drop', x + (i - 1.5) * 5, y - 4, { ...opts, scale: scale * 0.7, rotation: (i - 1.5) * 0.3 });
        scene.tweens.add({ targets: d, y: d.y + 10, alpha: 0, duration: dur + 100, onComplete: () => d.destroy() });
      }
      break;
    }
    case 'water': case 'bubble': {
      burst(scene, x, y, 'vfx_dot', hexNum(opts.color), 8, 60 * scale, 320, 0.8, 0.1, style === 'bubble' ? -40 : 60);
      break;
    }
    case 'wave': {
      const w = img(scene, 'vfx_line', x, y, { ...opts, width: 4, height: opts.height ?? 12 });
      scene.tweens.add({ targets: w, scaleX: (opts.width ?? 60) / 16, alpha: 0, duration: dur + 150, onComplete: () => w.destroy() });
      break;
    }
    case 'wind': {
      for (let i = 0; i < 3; i++) {
        const s = img(scene, 'vfx_crescent', x - i * 4, y + (i - 1) * 6, { ...opts, scale: scale * 0.5, color: withAlphaTint(opts.color) });
        scene.tweens.add({ targets: s, x: s.x + (opts.flipX ? -1 : 1) * 24, alpha: 0, duration: dur, onComplete: () => s.destroy() });
      }
      break;
    }
    case 'fire': {
      burst(scene, x, y, 'vfx_drop', hexNum(opts.color), 10, 50 * scale, 340, 0.9, 0.1, -70);
      break;
    }
    case 'shadow': {
      const g = img(scene, 'vfx_soft', x, y, { ...opts, scale: scale * 1.1 });
      g.setBlendMode(Phaser.BlendModes.MULTIPLY);
      scene.tweens.add({ targets: g, scale: scale * 1.6, alpha: 0, duration: dur, onComplete: () => g.destroy() });
      break;
    }
    case 'holy': {
      const ring = glowImg(scene, 'vfx_ring', x, y, { ...opts, scale: scale * 0.5 });
      scene.tweens.add({ targets: ring, scale: scale * 1.6, alpha: 0, duration: dur + 150, onComplete: () => ring.destroy() });
      burst(scene, x, y - 6, 'vfx_dot', hexNum(opts.color), 6, 30, 400, 0.7, 0, -50);
      break;
    }
    case 'poison': {
      burst(scene, x, y, 'vfx_soft', hexNum(opts.color), 6, 20, 500, 0.7, 0.2, -30);
      break;
    }
    case 'heal': {
      burst(scene, x, y + 6, 'vfx_dot', hexNum(opts.color), 8, 24, 600, 0.9, 0.1, -60);
      break;
    }
    case 'buff': {
      const ring = glowImg(scene, 'vfx_ring', x, y, { ...opts, scale: scale * 0.4 });
      scene.tweens.add({ targets: ring, scale: scale * 1.2, y: y - 4, alpha: 0, duration: dur + 200, onComplete: () => ring.destroy() });
      break;
    }
    case 'shield': {
      const g = glowImg(scene, 'vfx_soft', x, y, { ...opts, scale: scale * 1.3 });
      g.setAlpha(0.5);
      scene.tweens.add({ targets: g, alpha: 0, scale: scale * 1.6, duration: dur + 150, onComplete: () => g.destroy() });
      break;
    }
    case 'smoke': {
      burst(scene, x, y, 'vfx_soft', hexNum(opts.color), 6, 18, 500, 0.8, 0.2, -20);
      break;
    }
    case 'spark': {
      const s = glowImg(scene, 'vfx_spark', x, y, { ...opts, scale: scale * 0.8 });
      scene.tweens.add({ targets: s, scale: 0, angle: 90, duration: 160, onComplete: () => s.destroy() });
      break;
    }
    default: {
      const g = img(scene, 'vfx_soft', x, y, { ...opts, scale });
      fadeOut(scene, g, dur);
    }
  }
}

function withAlphaTint(color: string): string { return color; }

// ---------------------------------------------------------------------------
// projectile textures
// ---------------------------------------------------------------------------

const projCache = new Map<string, string>();

export function getProjectileTexture(scene: Phaser.Scene, style: VfxStyle, color: string): string {
  const key = `proj_${style}_${color}`;
  if (projCache.has(key) && scene.textures.exists(key)) return projCache.get(key)!;
  let art: HTMLCanvasElement;
  switch (style) {
    case 'arrow':
      art = makeCanvas(16, 5); { const c = ctx2d(art); rect(c, 0, 2, 10, 1, '#8a6a48'); poly(c, [[9, 0], [15, 2.5], [9, 5]], color); }
      break;
    case 'bullet':
      art = makeCanvas(8, 3); { const c = ctx2d(art); rect(c, 0, 0, 8, 3, color); }
      break;
    case 'bolt':
      art = makeCanvas(6, 12); { const c = ctx2d(art); poly(c, [[3, 0], [5, 5], [4, 6], [6, 12], [0, 6], [1, 5]], color); }
      break;
    case 'shuriken':
      art = makeCanvas(12, 12); { const c = ctx2d(art); poly(c, [[6, 0], [8, 4], [12, 6], [8, 8], [6, 12], [4, 8], [0, 6], [4, 4]], color); circle(c, 6, 6, 1.4, '#20202a'); }
      break;
    case 'dagger':
      art = makeCanvas(12, 4); { const c = ctx2d(art); rect(c, 0, 1, 3, 2, '#6b5438'); poly(c, [[3, 0], [11, 1.5], [11, 2.5], [3, 4]], color); }
      break;
    case 'ice':
      art = makeCanvas(8, 10); { const c = ctx2d(art); poly(c, [[4, 0], [8, 5], [5, 5], [4, 10], [3, 5], [0, 5]], color); emissiveDab(c, 4, 5, 3, '#cdefff', { coreStop: 0.3, alpha: 0.7 }); }
      break;
    case 'fire':
      art = makeCanvas(8, 10); { const c = ctx2d(art); ellipse(c, 4, 6, 3.5, 4.5, color); emissiveDab(c, 4, 4, 3, '#ffe07a', { coreStop: 0.3 }); }
      break;
    case 'orb': default:
      art = makeCanvas(10, 10); { const c = ctx2d(art); emissiveDab(c, 5, 5, 4.4, color, { coreStop: 0.3 }); }
      break;
  }
  registerCanvasTexture(scene, key, outlineHued(art, false));
  projCache.set(key, key);
  return key;
}

// ---------------------------------------------------------------------------
// telegraphs & hit sparks
// ---------------------------------------------------------------------------

export function spawnTelegraph(scene: Phaser.Scene, shape: 'circle' | 'rect', x: number, y: number, w: number, h: number, durationMs: number, color = '#ff3344'): void {
  const c = hexNum(color);
  const outline = shape === 'circle'
    ? scene.add.circle(x, y, w / 2).setStrokeStyle(2, c, 0.9).setFillStyle(c, 0)
    : scene.add.rectangle(x, y, w, h).setStrokeStyle(2, c, 0.9).setFillStyle(c, 0);
  const fill = shape === 'circle' ? scene.add.circle(x, y, w / 2, c, 0.08) : scene.add.rectangle(x, y, w, h, c, 0.08);
  outline.setDepth(41); fill.setDepth(40);
  scene.tweens.add({
    targets: fill, alpha: 0.45, duration: durationMs, ease: 'Cubic.easeIn',
    onComplete: () => { outline.destroy(); fill.destroy(); },
  });
  scene.tweens.add({ targets: outline, alpha: 0.3, duration: durationMs * 0.4, yoyo: true, repeat: Math.max(0, Math.floor(durationMs / 300)) });
}

export function spawnHitSpark(scene: Phaser.Scene, x: number, y: number, crit: boolean): void {
  ensureBase(scene);
  const color = crit ? '#ffcc33' : '#ffffff';
  const tint = hexNum(color);
  const s = scene.add.image(x, y, 'vfx_spark').setTint(tint).setDepth(70).setScale(crit ? 1.3 : 0.8).setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({ targets: s, scale: 0, angle: crit ? 160 : 90, duration: crit ? 220 : 140, onComplete: () => s.destroy() });
  // a quick additive impact ring on every hit (bigger + brighter on a crit) — this, more than the
  // spark alone, is what sells a hit as having landed with real weight
  const ring = scene.add.image(x, y, 'vfx_ring').setTint(tint).setDepth(69).setScale(crit ? 0.35 : 0.2).setAlpha(crit ? 0.9 : 0.6).setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({ targets: ring, scale: crit ? 1.1 : 0.7, alpha: 0, duration: crit ? 240 : 160, onComplete: () => ring.destroy() });
  if (crit) { burst(scene, x, y, 'vfx_dot', tint, 6, 70, 200, 0.7, 0); hotCore(scene, x, y, 0.5, 130); }
}
