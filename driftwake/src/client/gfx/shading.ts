/**
 * HD-2D-friendly shading helpers shared by every procedural-art module: hue-shifted
 * warm-highlight / cool-shadow tone ramps, a "selective" outline pass that darkens the
 * adjacent silhouette color instead of stamping flat black, and emissive dabs (a near-white
 * hot center fading to a saturated color) for anything the bloom pass should pick up —
 * monster eyes, lantern glass, crystals, magic weapon tips, portal cores, fireflies, blight
 * veins, etc. Pure additions on top of canvasKit; nothing here replaces its exports.
 */
import { makeCanvas, ctx2d, hexToRgb, rgbToHex, withAlpha } from './canvasKit';

// ---------------------------------------------------------------------------
// HSL tone ramps
// ---------------------------------------------------------------------------

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return [h, s, l];
}
function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1; if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360 / 360;
  if (s <= 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Lightens/darkens `hex` by `lightDelta` (-1..1, toward black/white like canvasKit's shade())
 * while nudging its hue toward `hueTargetDeg` by at most `maxHueDeg` (an ABSOLUTE degree cap,
 * not a fraction of the full distance) and nudging saturation by `satDelta`. This is what
 * gives shadows a cool purple-blue cast and highlights a warm cast instead of a flat gray
 * tint. The cap matters: a naive "shortest angular path" lerp can swing a saturated warm
 * color (e.g. gold, hue ~48°) briefly through pure red at partial completion before settling
 * near a cool blue target — a small, bounded nudge never travels far enough for that.
 */
export function shadeHue(hex: string, lightDelta: number, hueTargetDeg: number, maxHueDeg = 20, satDelta = 0): string {
  const [r, g, b] = hexToRgb(hex);
  let [h, s, l] = rgbToHsl(r, g, b);
  const diff = ((hueTargetDeg - h + 540) % 360) - 180; // shortest signed path, -180..180
  const shift = Math.max(-maxHueDeg, Math.min(maxHueDeg, diff));
  h = (h + shift + 360) % 360;
  s = clamp01(s + satDelta);
  l = clamp01(l + lightDelta * 0.5);
  const [nr, ng, nb] = hslToRgb(h, s, l);
  return rgbToHex(nr, ng, nb);
}

/** Cool purple-blue shadow tone for a given base color. amt 0..1 intensity. */
export function coolShadow(hex: string, amt = 0.35): string { return shadeHue(hex, -amt, 250, 22, 0.05 * amt); }
/** Warm highlight tone for a given base color. amt 0..1 intensity. */
export function warmHighlight(hex: string, amt = 0.3): string { return shadeHue(hex, amt, 40, 18, 0.05 * amt); }
/** A dark, hue-consistent outline tone derived from a fill color (never pure black, and never
 *  a stray saturated hue swing on warm colors — desaturated a touch so a small hue nudge on a
 *  fully-saturated source can never read as an odd bright fringe). */
export function outlineTone(hex: string): string { return shadeHue(hex, -0.6, 250, 16, -0.14); }

// ---------------------------------------------------------------------------
// selective (hued) outline pass
// ---------------------------------------------------------------------------

/**
 * Like canvasKit's `outlined()`, but instead of stamping every edge pixel with one flat
 * color, each outline pixel is a darkened, cool-shifted version of whichever opaque
 * neighbor it's touching — so a warm skin edge gets a warm-dark outline and a cool armor
 * edge gets a cool-dark one, instead of a uniform silhouette-black ring.
 */
export function outlineHued(src: HTMLCanvasElement, diagonals = true, fallback = '#171016'): HTMLCanvasElement {
  const w = src.width, h = src.height;
  const sctx = ctx2d(src);
  const data = sctx.getImageData(0, 0, w, h);
  const px = data.data;
  const isOpaque = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && px[(y * w + x) * 4 + 3] > 20;
  const out = makeCanvas(w, h);
  const octx = ctx2d(out);
  const outData = octx.createImageData(w, h);
  const dirs = diagonals
    ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
    : [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const toneCache = new Map<number, [number, number, number]>();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (isOpaque(x, y)) continue;
      let ni = -1;
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy;
        if (isOpaque(nx, ny)) { ni = (ny * w + nx) * 4; break; }
      }
      if (ni < 0) continue;
      let tone = toneCache.get(ni);
      if (!tone) {
        const hex = rgbToHex(px[ni], px[ni + 1], px[ni + 2]);
        tone = hexToRgb(outlineTone(hex));
        toneCache.set(ni, tone);
      }
      const i = (y * w + x) * 4;
      outData.data[i] = tone[0]; outData.data[i + 1] = tone[1]; outData.data[i + 2] = tone[2]; outData.data[i + 3] = 255;
    }
  }
  octx.putImageData(outData, 0, 0);
  octx.drawImage(src, 0, 0);
  void fallback; // kept for signature parity with canvasKit's outlined(); tone is always neighbor-derived
  return out;
}

// ---------------------------------------------------------------------------
// emissive dabs — bright, bloom-friendly pixels
// ---------------------------------------------------------------------------

/**
 * Draws a bloom-friendly emissive spot at (cx,cy): a near-white-hot center fading through
 * saturated `color` to transparent at the rim. Use for monster eyes, lantern glass, crystal
 * facets, weapon orbs, portal cores, fireflies, blight veins — anything the threshold-bloom
 * pass should pick out as a light source rather than flat-lit material.
 */
export function emissiveDab(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, opts: { core?: string; alpha?: number; coreStop?: number } = {}): void {
  if (r <= 0) return;
  const core = opts.core ?? '#ffffff';
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, core);
  g.addColorStop(Math.min(0.9, Math.max(0.05, opts.coreStop ?? 0.32)), color);
  g.addColorStop(1, withAlpha(color, 0));
  ctx.save();
  ctx.globalAlpha = opts.alpha ?? 1;
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/**
 * A soft additive glow halo (no hot core) to sit *behind* a solid emissive shape — e.g. a
 * lit window pane or a lantern's glass — so it reads as light spilling out rather than a
 * flat-colored patch. Composited with 'lighter' so it only ever brightens.
 */
export function glowHalo(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, alpha = 0.5): void {
  if (r <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, color);
  g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
