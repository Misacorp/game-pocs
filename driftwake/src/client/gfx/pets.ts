/**
 * Procedural companion-pet sprites (idle + move anims), drawn in the same pixel style as
 * gfx/monsters.ts. Each PetSpecies gets a small, cute body with a couple of anims; the Pet entity
 * (src/client/entities/Pet.ts) picks 'idle' while stationary and 'move' while following/chasing loot.
 */
import Phaser from 'phaser';
import type { PetSpecies } from '@shared/types';
import {
  makeCanvas, ctx2d, circle, ellipse, line, poly, registerSpriteSheet, ensureAnim, hashStr,
} from './canvasKit';
import { outlineHued, emissiveDab } from './shading';
import type { SpriteInfo } from './spec';

const BOX: Record<PetSpecies, [number, number]> = {
  puffling: [16, 12], shellsnail: [18, 13], kelpfox: [20, 15], stormkit: [17, 15], lanternfish: [19, 13], whalecalf: [22, 16],
};

interface Pose { bob: number; hop: number; flip: boolean; t: number }

function eye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color = '#181018'): void {
  circle(ctx, x, y, r, color);
  circle(ctx, x - r * 0.3, y - r * 0.3, r * 0.35, '#ffffff');
}

function drawPet(species: PetSpecies, ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, colors: string[], pose: Pose): void {
  const [c1, c2, c3] = colors;
  const [bw, bh] = BOX[species];
  const w = bw * s, h = bh * s;
  const yy = cy - pose.hop * s;
  ctx.save();
  ctx.translate(cx, yy + pose.bob * s * 0.6);

  switch (species) {
    case 'puffling': {
      ellipse(ctx, 0, h * 0.1, w * 0.46, h * 0.38, c1);
      ellipse(ctx, 0, -h * 0.06, w * 0.36, h * 0.26, c2 ?? c1);
      eye(ctx, -w * 0.14, h * 0.02, s * 1.2);
      eye(ctx, w * 0.14, h * 0.02, s * 1.2);
      break;
    }
    case 'shellsnail': {
      ellipse(ctx, -w * 0.06, h * 0.14, w * 0.4, h * 0.28, c2 ?? c1);
      circle(ctx, w * 0.1, -h * 0.02, w * 0.28, c1);
      circle(ctx, w * 0.1, -h * 0.02, w * 0.14, c3 ?? c1);
      line(ctx, -w * 0.3, h * 0.02, -w * 0.4, -h * 0.26, s * 0.8, c2 ?? c1);
      eye(ctx, -w * 0.4, -h * 0.28, s * 1);
      break;
    }
    case 'kelpfox': {
      ellipse(ctx, 0, h * 0.12, w * 0.4, h * 0.28, c1);
      circle(ctx, w * 0.28, -h * 0.08, w * 0.2, c1);
      poly(ctx, [[-w * 0.02, -h * 0.32], [w * 0.1, -h * 0.5], [w * 0.16, -h * 0.24]], c2 ?? c1);
      poly(ctx, [[w * 0.24, -h * 0.34], [w * 0.4, -h * 0.5], [w * 0.4, -h * 0.2]], c2 ?? c1);
      poly(ctx, [[-w * 0.34, h * 0.1], [-w * 0.56 - pose.hop * s * 0.4, -h * 0.06], [-w * 0.3, h * 0.28]], c3 ?? c2 ?? c1);
      eye(ctx, w * 0.32, -h * 0.1, s * 1.1);
      break;
    }
    case 'stormkit': {
      ellipse(ctx, 0, h * 0.14, w * 0.44, h * 0.34, c1);
      circle(ctx, 0, -h * 0.18, w * 0.28, c1);
      poly(ctx, [[-w * 0.4, h * 0.02], [-w * 0.6, -h * 0.14 - pose.bob * s * 0.3], [-w * 0.3, h * 0.14]], c2 ?? c1);
      poly(ctx, [[w * 0.4, h * 0.02], [w * 0.6, -h * 0.14 - pose.bob * s * 0.3], [w * 0.3, h * 0.14]], c2 ?? c1);
      poly(ctx, [[-w * 0.06, -h * 0.36], [0, -h * 0.5], [w * 0.06, -h * 0.36]], c3 ?? '#f0a030');
      eye(ctx, -w * 0.1, -h * 0.2, s * 1);
      eye(ctx, w * 0.1, -h * 0.2, s * 1);
      break;
    }
    case 'lanternfish': {
      ellipse(ctx, 0, 0, w * 0.42, h * 0.3, c1);
      poly(ctx, [[-w * 0.36, 0], [-w * 0.54, -h * 0.2], [-w * 0.54, h * 0.2]], c2 ?? c1);
      line(ctx, w * 0.2, -h * 0.24, w * 0.36, -h * 0.34, s * 0.8, c2 ?? c1);
      emissiveDab(ctx, w * 0.36, -h * 0.34, s * 2.6, c3 ?? '#ffe066', { coreStop: 0.32 }); // the little lure, genuinely glowing
      eye(ctx, w * 0.14, -h * 0.02, s * 1.1);
      break;
    }
    case 'whalecalf': {
      ctx.save(); ctx.globalAlpha = 0.3; ellipse(ctx, 0, h * 0.2, w * 0.3, h * 0.16, c3 ?? '#ffe6a8'); ctx.restore();
      ellipse(ctx, 0, 0, w * 0.46, h * 0.36, c1);
      ellipse(ctx, 0, h * 0.06, w * 0.3, h * 0.2, c2 ?? c1);
      poly(ctx, [[-w * 0.4, h * 0.2], [-w * 0.58, h * 0.36], [-w * 0.42, h * 0.4], [-w * 0.28, h * 0.28]], c1);
      poly(ctx, [[w * 0.4, -h * 0.02], [w * 0.6, -h * 0.16 - pose.bob * s * 0.4], [w * 0.44, h * 0.06]], c1);
      eye(ctx, -w * 0.18, -h * 0.08, s * 1.2);
      break;
    }
  }
  ctx.restore();
}

function poseFor(anim: string, i: number, n: number): Pose {
  const t = (i / Math.max(1, n)) * Math.PI * 2;
  if (anim === 'move') return { bob: Math.abs(Math.sin(t)) * 0.5, hop: Math.abs(Math.sin(t)) * 1.6, flip: false, t };
  return { bob: Math.sin(t) * 0.35, hop: 0, flip: false, t };
}

const ANIM_TABLE: { name: string; frames: number; frameRate: number; repeat: number }[] = [
  { name: 'idle', frames: 3, frameRate: 4, repeat: -1 },
  { name: 'move', frames: 4, frameRate: 9, repeat: -1 },
];

const infoCache = new Map<string, SpriteInfo>();

/** Build/fetch the spritesheet for a pet species + its item colors (so different-colored variants get distinct textures). */
export function getPetSprite(scene: Phaser.Scene, species: PetSpecies, colors: string[]): SpriteInfo {
  const key = `pet_${species}_${hashStr(colors.join('|')).toString(36)}`;
  const cached = infoCache.get(key);
  if (cached && scene.textures.exists(key)) return cached;

  const [bw, bh] = BOX[species];
  const pad = 6;
  const fw = Math.ceil(bw) + pad * 2;
  const fh = Math.ceil(bh) + pad * 2 + 6; // extra headroom for hop
  const frames: HTMLCanvasElement[] = [];
  const ranges: { name: string; start: number; end: number; frameRate: number; repeat: number }[] = [];
  for (const t of ANIM_TABLE) {
    const start = frames.length;
    for (let i = 0; i < t.frames; i++) {
      const art = makeCanvas(fw, fh);
      const ctx = ctx2d(art);
      drawPet(species, ctx, fw / 2, fh / 2 + 4, 1, colors, poseFor(t.name, i, t.frames));
      frames.push(outlineHued(art));
    }
    ranges.push({ name: t.name, start, end: frames.length - 1, frameRate: t.frameRate, repeat: t.repeat });
  }
  registerSpriteSheet(scene, key, frames, fw, fh);
  const anims: Record<string, string> = {};
  for (const r of ranges) anims[r.name] = ensureAnim(scene, key, `${key}:${r.name}`, r.start, r.end, r.frameRate, r.repeat);

  const info: SpriteInfo = { key, frameWidth: fw, frameHeight: fh, bodyWidth: Math.round(bw * 0.7), bodyHeight: Math.round(bh * 0.8), anims };
  infoCache.set(key, info);
  return info;
}
