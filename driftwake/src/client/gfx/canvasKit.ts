/**
 * Low level canvas helpers shared by every procedural-art module.
 * Everything here is pure Canvas2D — no Phaser types except where a texture is registered.
 */
import Phaser from 'phaser';

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return c;
}

export function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

// ---------------------------------------------------------------------------
// color math
// ---------------------------------------------------------------------------

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
/** amt > 0 lightens toward white, amt < 0 darkens toward black. */
export function shade(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  const t = amt > 0 ? 255 : 0;
  const f = Math.abs(amt);
  return rgbToHex(r + (t - r) * f, g + (t - g) * f, b + (t - b) * f);
}
export function mix(hexA: string, hexB: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(hexA);
  const [br, bg, bb] = hexToRgb(hexB);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}
export function withAlpha(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
export function hexNum(hex: string): number {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

// ---------------------------------------------------------------------------
// pixel-art outline pass
// ---------------------------------------------------------------------------

/**
 * Returns a NEW canvas the same size as `src`, with a 1px outline of `color` drawn
 * behind every opaque region of `src` (classic pixel-art outline look).
 * Leaves 1px margin unused in the source drawing, or the outline may be clipped at edges.
 */
export function outlined(src: HTMLCanvasElement, color = '#171016', diagonals = true): HTMLCanvasElement {
  const w = src.width, h = src.height;
  const sctx = ctx2d(src);
  const data = sctx.getImageData(0, 0, w, h);
  const alpha = data.data;
  const isOpaque = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    return alpha[(y * w + x) * 4 + 3] > 20;
  };
  const out = makeCanvas(w, h);
  const octx = ctx2d(out);
  const outData = octx.createImageData(w, h);
  const [cr, cg, cb] = hexToRgb(color);
  const dirs = diagonals
    ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
    : [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (isOpaque(x, y)) continue;
      let touches = false;
      for (const [dx, dy] of dirs) { if (isOpaque(x + dx, y + dy)) { touches = true; break; } }
      if (touches) {
        const i = (y * w + x) * 4;
        outData.data[i] = cr; outData.data[i + 1] = cg; outData.data[i + 2] = cb; outData.data[i + 3] = 255;
      }
    }
  }
  octx.putImageData(outData, 0, 0);
  octx.drawImage(src, 0, 0);
  return out;
}

// ---------------------------------------------------------------------------
// simple primitives (integer pixel snapping keeps the art crisp)
// ---------------------------------------------------------------------------

export function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
/** Rounded rect using stepped pixel corners (no anti-aliased curves). */
export function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string): void {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); r = Math.min(r, Math.floor(Math.min(w, h) / 2));
  ctx.fillStyle = color;
  ctx.fillRect(x + r, y, w - 2 * r, h);
  ctx.fillRect(x, y + r, w, h - 2 * r);
  for (let i = 0; i < r; i++) {
    const inset = r - Math.floor(Math.sqrt(Math.max(0, r * r - (r - i) * (r - i))));
    ctx.fillRect(x + inset, y + i, w - 2 * inset, 1);
    ctx.fillRect(x + inset, y + h - 1 - i, w - 2 * inset, 1);
  }
}
export function circle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  const rr = Math.round(r);
  for (let y = -rr; y <= rr; y++) {
    const span = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)));
    ctx.fillRect(Math.round(cx - span), Math.round(cy + y), span * 2, 1);
  }
}
export function ellipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string): void {
  ctx.fillStyle = color;
  const rr = Math.round(ry);
  for (let y = -rr; y <= rr; y++) {
    const t = y / ry;
    const span = rx * Math.sqrt(Math.max(0, 1 - t * t));
    ctx.fillRect(Math.round(cx - span), Math.round(cy + y), Math.round(span * 2), 1);
  }
}
export function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, w: number, color: string): void {
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
}
export function poly(ctx: CanvasRenderingContext2D, pts: [number, number][], color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
  ctx.closePath(); ctx.fill();
}

// ---------------------------------------------------------------------------
// nearest-neighbor scaling (for DOM icons requested at arbitrary sizes)
// ---------------------------------------------------------------------------

export function scaleNearest(src: HTMLCanvasElement, targetW: number, targetH = targetW): HTMLCanvasElement {
  const out = makeCanvas(targetW, targetH);
  const octx = ctx2d(out);
  octx.imageSmoothingEnabled = false;
  octx.drawImage(src, 0, 0, src.width, src.height, 0, 0, targetW, targetH);
  return out;
}

// ---------------------------------------------------------------------------
// Phaser texture registration
// ---------------------------------------------------------------------------

export function registerCanvasTexture(scene: Phaser.Scene, key: string, c: HTMLCanvasElement): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, c);
  const tex = scene.textures.get(key);
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

/** Builds a horizontal spritesheet texture out of same-size frame canvases. */
export function registerSpriteSheet(scene: Phaser.Scene, key: string, frames: HTMLCanvasElement[], frameW: number, frameH: number): void {
  const sheet = makeCanvas(frameW * frames.length, frameH);
  const sctx = ctx2d(sheet);
  frames.forEach((f, i) => sctx.drawImage(f, i * frameW, 0));
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addSpriteSheet(key, sheet as unknown as HTMLImageElement, { frameWidth: frameW, frameHeight: frameH });
  scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
}

export function ensureAnim(scene: Phaser.Scene, key: string, animKey: string, start: number, end: number, frameRate: number, repeat: number): string {
  if (!scene.anims.exists(animKey)) {
    scene.anims.create({ key: animKey, frames: scene.anims.generateFrameNumbers(key, { start, end }), frameRate, repeat });
  }
  return animKey;
}

let seedState = 1;
export function seedRandom(seed: number): () => number {
  let s = seed % 2147483647; if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
