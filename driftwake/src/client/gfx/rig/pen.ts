/**
 * Illustrated-style drawing kit ("rig pen"). Every part of an illustrated character is a vector
 * shape filled with a base color, a cel-shaded shadow crescent on the side away from the key
 * light (top-left), an optional warm rim highlight on the lit side, and a hue-derived ink line.
 * See ART_BIBLE.md in this folder for the rules these helpers encode.
 *
 * Coordinates are TEXTURE pixels (RIG_SCALE per world pixel). Path functions only ADD subpaths
 * to the current path (they never call beginPath) so they can be composed and shifted.
 */
import { shade, mix, withAlpha, hexToRgb } from '../canvasKit';
import { coolShadow, warmHighlight, outlineTone, emissiveDab, glowHalo } from '../shading';

export { emissiveDab, glowHalo, shade, mix, withAlpha };

/** Texture pixels per world pixel for every rig-baked sheet (camera zoom 2 => 1:1 on screen). */
export const RIG_SCALE = 2;
/** Default ink line width in texture px. Silhouette gets an extra outer rim at bake time. */
export const LINE_W = 1.35;
/** Direction TOWARD the key light (up and slightly toward the facing side, so faces stay lit —
 *  flipX mirrors it with the sprite). Shadow crescents land on the opposite (back-bottom) side. */
export const LIGHT_DIR: [number, number] = [0.5, -0.86];

export type PathFn = (g: CanvasRenderingContext2D) => void;
export type Pt = [number, number];

// ---------------------------------------------------------------------------
// path builders
// ---------------------------------------------------------------------------

export const path = {
  rrect(x: number, y: number, w: number, h: number, r: number | number[]): PathFn {
    return (g) => { g.roundRect(x, y, w, h, r as number); };
  },
  ellipse(cx: number, cy: number, rx: number, ry: number, rot = 0): PathFn {
    return (g) => { g.moveTo(cx + Math.cos(rot) * rx, cy + Math.sin(rot) * rx); g.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), rot, 0, Math.PI * 2); g.closePath(); };
  },
  circle(cx: number, cy: number, r: number): PathFn { return path.ellipse(cx, cy, r, r); },
  poly(pts: Pt[]): PathFn {
    return (g) => { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); };
  },
  /** Smooth closed curve through `pts` (Catmull-Rom -> cubic Bezier). tension 0 = polygon, ~0.5 = round. */
  blob(pts: Pt[], tension = 0.5): PathFn {
    return (g) => { smoothThrough(g, pts, tension, true); };
  },
  /** Open smooth curve, then closed with a straight segment — handy for hair locks / capes. */
  curve(pts: Pt[], tension = 0.5): PathFn {
    return (g) => { smoothThrough(g, pts, tension, false); g.closePath(); };
  },
  /** Tapered capsule from (x0,y0,r0) to (x1,y1,r1) — limbs, handles, tentacles. */
  capsule(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): PathFn {
    return (g) => {
      const a = Math.atan2(y1 - y0, x1 - x0);
      g.moveTo(x0 + Math.cos(a + Math.PI / 2) * r0, y0 + Math.sin(a + Math.PI / 2) * r0);
      g.arc(x0, y0, r0, a + Math.PI / 2, a + Math.PI * 1.5);
      g.arc(x1, y1, r1, a - Math.PI / 2, a + Math.PI / 2);
      g.closePath();
    };
  },
  /** Union of several paths drawn as one shape (only safe when they don't overlap each other
   *  under evenodd — use for disjoint pieces like two eyes). */
  join(...fns: PathFn[]): PathFn { return (g) => { for (const f of fns) f(g); }; },
};

function smoothThrough(g: CanvasRenderingContext2D, pts: Pt[], tension: number, closed: boolean): void {
  const n = pts.length;
  if (n < 2) return;
  const at = (i: number): Pt => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  g.moveTo(pts[0][0], pts[0][1]);
  const segs = closed ? n : n - 1;
  const k = tension / 3 * 2; // (1/6 * 2 * tension)*2 ≈ classic CR at tension .5
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) * k / 2, c1y = p1[1] + (p2[1] - p0[1]) * k / 2;
    const c2x = p2[0] - (p3[0] - p1[0]) * k / 2, c2y = p2[1] - (p3[1] - p1[1]) * k / 2;
    g.bezierCurveTo(c1x, c1y, c2x, c2y, p2[0], p2[1]);
  }
  if (closed) g.closePath();
}

// ---------------------------------------------------------------------------
// tone helpers (all derived from one base color so palettes stay disciplined)
// ---------------------------------------------------------------------------

/** Ink (line) color for a fill: dark, hue-consistent, never pure black. */
export function ink(fill: string): string { return mix(outlineTone(fill), '#1d1420', 0.35); }
export function shadowOf(fill: string, amt = 0.32): string { return coolShadow(fill, amt); }
/** Skin gets a warm rosy shadow rather than the cool ramp (cool-shifted skin reads sickly/orange). */
export function skinShadow(skin: string, amt = 0.2): string { return shade(mix(skin, '#b8586a', 0.28), -amt); }
export function lightOf(fill: string, amt = 0.28): string { return warmHighlight(fill, amt); }

// ---------------------------------------------------------------------------
// the core cel-shaded shape
// ---------------------------------------------------------------------------

export interface ShapeOpts {
  /** shadow crescent color; false = none; default derived from fill */
  shadow?: string | false;
  /** crescent thickness in px (how far the lit copy is shifted toward the light) */
  depth?: number;
  /** rim highlight color; false = none (default none) */
  light?: string | false;
  lightDepth?: number;
  /** ink color; false = no line; default derived from fill */
  line?: string | false;
  lw?: number;
  alpha?: number;
  /** override light direction for this shape (e.g. undersides) */
  dir?: Pt;
}

/** Fill + shadow crescent + optional rim light + ink line. */
export function shape(g: CanvasRenderingContext2D, p: PathFn, fill: string, o: ShapeOpts = {}): void {
  g.save();
  if (o.alpha !== undefined) g.globalAlpha *= o.alpha;
  g.beginPath(); p(g);
  g.fillStyle = fill; g.fill();
  const dir = o.dir ?? LIGHT_DIR;
  const shadow = o.shadow === undefined ? shadowOf(fill) : o.shadow;
  if (shadow || o.light) {
    g.save();
    g.beginPath(); p(g); g.clip();
    if (shadow) crescent(g, p, shadow, dir, o.depth ?? 3);
    if (o.light) crescent(g, p, o.light, [-dir[0], -dir[1]], o.lightDepth ?? 1.6);
    g.restore();
  }
  const line = o.line === undefined ? ink(fill) : o.line;
  if (line) {
    g.beginPath(); p(g);
    g.lineWidth = o.lw ?? LINE_W; g.lineJoin = 'round'; g.lineCap = 'round';
    g.strokeStyle = line; g.stroke();
  }
  g.restore();
}

/** Fills (shape minus shape-shifted-toward-`dir`) — i.e. the band on the side facing AWAY from
 *  `dir` * depth. Must be called with the shape already set as the clip. */
function crescent(g: CanvasRenderingContext2D, p: PathFn, color: string, dir: Pt, depth: number): void {
  g.beginPath();
  g.rect(-4096, -4096, 8192, 8192);
  g.save(); g.translate(dir[0] * depth, dir[1] * depth); p(g); g.restore();
  g.fillStyle = color; g.fill('evenodd');
}

/** Fill only (no shading/line) — details, blush, glints. */
export function fill(g: CanvasRenderingContext2D, p: PathFn, color: string, alpha = 1): void {
  g.save(); g.globalAlpha *= alpha; g.beginPath(); p(g); g.fillStyle = color; g.fill(); g.restore();
}

/** Stroke only — seams, stitching, cracks, fold lines. */
export function stroke(g: CanvasRenderingContext2D, p: PathFn | Pt[], color: string, lw = LINE_W, alpha = 1): void {
  g.save(); g.globalAlpha *= alpha; g.beginPath();
  if (typeof p === 'function') p(g); else { g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]); }
  g.lineWidth = lw; g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = color; g.stroke(); g.restore();
}

/** Soft ambient-occlusion smudge clipped to `clip` — e.g. the shadow the head casts on the torso. */
export function occlude(g: CanvasRenderingContext2D, clip: PathFn, cx: number, cy: number, r: number, color = '#1d1420', alpha = 0.28): void {
  g.save();
  g.beginPath(); clip(g); g.clip();
  const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
  gr.addColorStop(0, withAlpha(color, alpha)); gr.addColorStop(1, withAlpha(color, 0));
  g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2);
  g.restore();
}

/** Glossy specular glint: a small white ellipse (use sparingly — eyes, slime, metal, gems). */
export function glint(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = -0.5, alpha = 0.85): void {
  fill(g, path.ellipse(x, y, rx, ry, rot), '#ffffff', alpha);
}

/** Runs `fn` in a local frame translated to (x,y) and rotated by `rot` radians. */
export function local(g: CanvasRenderingContext2D, x: number, y: number, rot: number, fn: () => void, sx = 1, sy = 1): void {
  g.save(); g.translate(x, y); if (rot) g.rotate(rot); if (sx !== 1 || sy !== 1) g.scale(sx, sy); fn(); g.restore();
}

// ---------------------------------------------------------------------------
// small math
// ---------------------------------------------------------------------------

export const TAU = Math.PI * 2;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** Smooth 0..1..0 pulse over a normalized t (sin half-wave). */
export const pulse = (t: number) => Math.sin(clamp(t, 0, 1) * Math.PI);
export const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
export const easeIn = (t: number) => t * t;
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
/** Point at distance `len` from (x,y) along angle `a` where 0 = straight DOWN, +a swings toward +x. */
export function along(x: number, y: number, a: number, len: number): Pt { return [x + Math.sin(a) * len, y + Math.cos(a) * len]; }

// ---------------------------------------------------------------------------
// critter face (monsters): big anime eyes + blush, shared by every MonsterBase drawer
// ---------------------------------------------------------------------------

/** True when a palette eye color is bright enough to read as a colored light source rather than
 *  flat dark pigment — the same rule the pixel-art monsters use (see DEFAULT_EYE in gfx/monsters.ts). */
export function isBrightEye(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.42;
}

export interface CritterEyeOpts {
  state?: 'open' | 'closed' | 'happy' | 'squeeze' | 'wide' | 'x';
  /** horizontal look offset, -1..1 (pupil/iris shift, e.g. for swaying eye stalks) */
  look?: number;
}

/** Big glossy anime-style critter eye (slimes, snails, mushrooms, birds...): white sclera,
 *  gradient iris (dark top, light bottom per ART_BIBLE), pupil and two glints. `rx`/`ry` are the
 *  sclera radii in texture px. A bright, non-dark `iris` (see `isBrightEye`) gets an emissive
 *  underlay so colored-eye variants read as a light source, same as the pixel-art rule. */
export function critterEye(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, iris: string, o: CritterEyeOpts = {}): void {
  const state = o.state ?? 'open';
  const lineC = mix(shade(iris, -0.5), '#1d1420', 0.45);
  if (state === 'closed') {
    stroke(g, (gg) => { gg.moveTo(x - rx, y + ry * 0.1); gg.quadraticCurveTo(x, y + ry * 0.75, x + rx, y + ry * 0.05); }, lineC, Math.max(1, rx * 0.3));
    return;
  }
  if (state === 'x') {
    stroke(g, [[x - rx * 0.75, y - ry * 0.7], [x + rx * 0.75, y + ry * 0.7]], lineC, Math.max(1, rx * 0.24));
    stroke(g, [[x - rx * 0.75, y + ry * 0.7], [x + rx * 0.75, y - ry * 0.7]], lineC, Math.max(1, rx * 0.24));
    return;
  }
  let eRx = rx, eRy = ry;
  if (state === 'squeeze') eRy *= 0.3;
  else if (state === 'happy') eRy *= 0.5;
  else if (state === 'wide') { eRx *= 1.14; eRy *= 1.16; }
  const ix = x + (o.look ?? 0) * rx * 0.28;
  if (isBrightEye(iris)) emissiveDab(g, ix, y, Math.max(eRx, eRy) * 2.2, iris, { coreStop: 0.35, alpha: 0.85 });
  const sclera = path.ellipse(x, y, eRx, eRy);
  fill(g, sclera, '#fffaf2');
  g.save(); g.beginPath(); sclera(g); g.clip();
  const grad = g.createLinearGradient(0, y - eRy, 0, y + eRy);
  grad.addColorStop(0, shade(iris, -0.42)); grad.addColorStop(0.55, iris); grad.addColorStop(1, lightOf(iris, 0.42));
  g.fillStyle = grad;
  g.beginPath(); g.ellipse(ix, y + eRy * 0.1, eRx * 0.82, eRy * 0.9, 0, 0, TAU); g.fill();
  fill(g, path.ellipse(ix, y + eRy * 0.32, eRx * 0.42, eRy * 0.48), shade(iris, -0.75));
  g.restore();
  if (state !== 'happy' && state !== 'squeeze') {
    stroke(g, (gg) => { gg.moveTo(x - eRx * 1.05, y - eRy * 0.5); gg.quadraticCurveTo(x, y - eRy * 1.2, x + eRx * 1.05, y - eRy * 0.5); }, lineC, Math.max(0.9, eRx * 0.17));
  }
  glint(g, ix - eRx * 0.32, y - eRy * 0.4, eRx * 0.32, eRy * 0.36, -0.3, 0.95);
  glint(g, ix + eRx * 0.26, y + eRy * 0.32, eRx * 0.15, eRy * 0.17, 0, 0.7);
}

/** A soft pink blush pair under/beside the eyes — the "cute mob" personality tell, same rule
 *  the pixel-art monsters use (blush on friendly early-game bases). */
export function critterBlush(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, spread: number, alpha = 0.32): void {
  fill(g, path.ellipse(cx - spread, cy, r, r * 0.62), '#ff8fa8', alpha);
  fill(g, path.ellipse(cx + spread, cy, r, r * 0.62), '#ff8fa8', alpha);
}
