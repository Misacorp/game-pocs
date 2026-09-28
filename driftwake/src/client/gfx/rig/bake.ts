/**
 * Rig baker: rasterizes a rig's animation clips into one grid spritesheet at RIG_SCALE texture
 * px per world px, registers it with Phaser (linear filtering — illustrated art must not be
 * nearest-sampled), creates the anims, and returns a SpriteInfo whose sizes are in WORLD px.
 * Entities apply `info.texScale` via spriteUtil.applySpriteInfo so the sprite displays at the
 * same world size as the pixel-art version.
 */
import Phaser from 'phaser';
import { makeCanvas, ctx2d, ensureAnim } from '../canvasKit';
import type { SpriteInfo } from '../spec';
import { RIG_SCALE } from './pen';

export interface RigClip {
  name: string;
  frames: number;
  frameRate: number;
  /** -1 loop, 0 once */
  repeat: number;
}

export interface RigSpec {
  key: string;
  /** frame size in WORLD px */
  worldW: number;
  worldH: number;
  /** physics body in WORLD px */
  bodyW: number;
  bodyH: number;
  /** approximate top of the art above the feet, in WORLD px (labels/lights anchor here) */
  visualH?: number;
  /** ground line in texture px above the frame bottom (room for the outline rim) */
  groundPad?: number;
  clips: RigClip[];
  /**
   * Draws one frame. `g` is pre-transformed so (0,0) is the FEET (bottom-center of the frame,
   * minus groundPad) and units are texture px; up is -y; the character faces +x.
   * `t` is the normalized clip phase in [0,1) for loops (i/n) or [0,1] for one-shots (i/(n-1)).
   */
  draw(g: CanvasRenderingContext2D, clip: string, t: number, i: number, n: number): void;
  /** silhouette rim outline color (false to skip) */
  rim?: string | false;
}

const COLS = 8;
const infoCache = new Map<string, SpriteInfo>();

/** Renders a single frame of a rig to its own canvas (texture px). */
export function renderRigFrame(spec: RigSpec, clip: RigClip, i: number, res = 1): HTMLCanvasElement {
  const fw = Math.round(spec.worldW * RIG_SCALE * res), fh = Math.round(spec.worldH * RIG_SCALE * res);
  const c = makeCanvas(fw, fh);
  const g = ctx2d(c);
  g.imageSmoothingEnabled = true;
  const n = clip.frames;
  const t = clip.repeat === 0 ? (n > 1 ? i / (n - 1) : 1) : i / n;
  g.save();
  g.translate(fw / 2, fh - (spec.groundPad ?? 2) * res);
  g.scale(res, res);
  spec.draw(g, clip.name, t, i, n);
  g.restore();
  return spec.rim === false ? c : rimOutline(c, spec.rim ?? '#1a1119', res);
}

/** Bakes (or returns the cached) spritesheet for a rig spec. */
export function bakeRig(scene: Phaser.Scene, spec: RigSpec): SpriteInfo {
  const cached = infoCache.get(spec.key);
  if (cached && scene.textures.exists(spec.key)) return cached;

  const fw = Math.round(spec.worldW * RIG_SCALE), fh = Math.round(spec.worldH * RIG_SCALE);
  const total = spec.clips.reduce((s, c) => s + c.frames, 0);
  const cols = Math.min(COLS, total);
  const rows = Math.ceil(total / cols);
  const sheet = makeCanvas(fw * cols, fh * rows);
  const sg = ctx2d(sheet);
  const ranges: { clip: RigClip; start: number; end: number }[] = [];
  let idx = 0;
  for (const clip of spec.clips) {
    const start = idx;
    for (let i = 0; i < clip.frames; i++, idx++) {
      const f = renderRigFrame(spec, clip, i);
      sg.drawImage(f, (idx % cols) * fw, Math.floor(idx / cols) * fh);
    }
    ranges.push({ clip, start, end: idx - 1 });
  }
  if (scene.textures.exists(spec.key)) scene.textures.remove(spec.key);
  scene.textures.addSpriteSheet(spec.key, sheet as unknown as HTMLImageElement, { frameWidth: fw, frameHeight: fh });
  const tex = scene.textures.get(spec.key);
  tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
  // render/lighting.ts reads this so the alpha-derived normal map bevel matches the doubled resolution
  (tex.customData as Record<string, unknown>).normalBevel = 2 * RIG_SCALE;

  const anims: Record<string, string> = {};
  for (const r of ranges) {
    const animKey = `${spec.key}:${r.clip.name}`;
    if (scene.anims.exists(animKey)) scene.anims.remove(animKey);
    anims[r.clip.name] = ensureAnim(scene, spec.key, animKey, r.start, r.end, r.clip.frameRate, r.clip.repeat);
  }
  const info: SpriteInfo = {
    key: spec.key, frameWidth: spec.worldW, frameHeight: spec.worldH,
    bodyWidth: spec.bodyW, bodyHeight: spec.bodyH, anims,
    texScale: RIG_SCALE, visualHeight: spec.visualH,
  };
  infoCache.set(spec.key, info);
  return info;
}

/**
 * Anti-aliased silhouette rim: stamps a solid-color copy of the frame's alpha at 8 offsets
 * around it, then draws the frame on top — a thicker OUTER line than the per-part ink lines,
 * which is what makes illustrated sprites pop off busy parallax backgrounds.
 */
export function rimOutline(src: HTMLCanvasElement, color: string, r = 1): HTMLCanvasElement {
  const w = src.width, h = src.height;
  const tint = makeCanvas(w, h);
  const tg = ctx2d(tint);
  tg.drawImage(src, 0, 0);
  tg.globalCompositeOperation = 'source-in';
  tg.fillStyle = color; tg.fillRect(0, 0, w, h);
  const out = makeCanvas(w, h);
  const og = ctx2d(out);
  og.imageSmoothingEnabled = true;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    og.drawImage(tint, Math.cos(a) * r, Math.sin(a) * r);
  }
  og.drawImage(src, 0, 0);
  return out;
}

/** Crops/scales a rendered frame into a data URL for DOM use (portraits, previews). */
export function frameToDataUrl(frame: HTMLCanvasElement, sx: number, sy: number, sw: number, sh: number, outW: number, outH: number): string {
  const c = makeCanvas(outW, outH);
  const g = ctx2d(c);
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(frame, sx, sy, sw, sh, 0, 0, outW, outH);
  return c.toDataURL();
}
