/**
 * Procedural monster sprites for every MonsterBase (incl. boss-only templates).
 * Bosses (scale >= 2) are drawn at genuinely larger canvas resolution with extra detail,
 * not just an upscaled small sprite.
 */
import Phaser from 'phaser';
import type { MonsterDef, MonsterBase } from '@shared/types';
import {
  makeCanvas, ctx2d, outlined, rect, rrect, circle, ellipse, line, poly,
  registerSpriteSheet, ensureAnim, shade, hashStr, mix,
} from './canvasKit';
import { OUTLINE } from './palette';
import type { SpriteInfo } from './spec';

interface Pal { primary: string; secondary: string; accent?: string; eye?: string }
interface Pose { squash: number; lunge: number; flash: boolean; dead: boolean; tilt: number; mouth: boolean; t: number }

const BOX: Record<MonsterBase, [number, number]> = {
  slime: [22, 16], mushroom: [20, 22], snail: [26, 17], bird: [22, 20], crab: [27, 16],
  jelly: [20, 24], beetle: [22, 16], bat: [27, 15], wisp: [18, 18], plant: [18, 27],
  golem: [24, 28], eel: [32, 12], fish: [22, 14], humanoid: [18, 30], spider: [27, 18],
  boar: [28, 18], grub: [22, 14], wraith: [20, 28],
  hydra: [46, 32], roc: [48, 38], captain: [22, 36], heart: [40, 40],
};

function eyeDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, dead: boolean): void {
  if (dead) { line(ctx, x - r, y - r, x + r, y + r, Math.max(1, r * 0.5), color); line(ctx, x - r, y + r, x + r, y - r, Math.max(1, r * 0.5), color); return; }
  circle(ctx, x, y, r, color);
  circle(ctx, x - r * 0.3, y - r * 0.3, r * 0.35, '#ffffff');
}

function spots(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, n: number, color: string, seed: number): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + seed;
    const dist = 0.4 + ((seed + i) % 3) * 0.15;
    circle(ctx, cx + Math.cos(a) * rx * dist, cy + Math.sin(a) * ry * dist, Math.max(1, rx * 0.12), color);
  }
}

function drawBase(base: MonsterBase, ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, p: Pal, variant: number, pose: Pose): void {
  const eye = p.eye ?? '#181018';
  const sq = 1 - pose.squash * 0.35;
  const sx = 1 + pose.squash * 0.22;
  ctx.save();
  ctx.translate(cx + pose.lunge * s * 0.5, cy);
  ctx.rotate((pose.tilt * Math.PI) / 180);
  ctx.scale(sx, sq);
  ctx.translate(-cx, -cy);
  const [bw, bh] = BOX[base];
  const w = bw * s, h = bh * s;

  switch (base) {
    case 'slime': {
      ellipse(ctx, cx, cy + h * 0.15, w * 0.5, h * 0.42, p.primary);
      ellipse(ctx, cx, cy - h * 0.05, w * 0.42, h * 0.3, p.secondary);
      eyeDot(ctx, cx - w * 0.16, cy + h * 0.04, s * 1.5, eye, pose.dead);
      eyeDot(ctx, cx + w * 0.16, cy + h * 0.04, s * 1.5, eye, pose.dead);
      if (pose.mouth) ellipse(ctx, cx, cy + h * 0.22, s * 2.2, s * 1.4, '#3a1622');
      spots(ctx, cx, cy, w * 0.4, h * 0.3, 2 + variant, p.accent ?? p.secondary, variant);
      break;
    }
    case 'mushroom': {
      ellipse(ctx, cx, cy - h * 0.18, w * 0.52, h * 0.34, p.primary);
      rect(ctx, cx - w * 0.16, cy - h * 0.02, w * 0.32, h * 0.42, p.secondary);
      spots(ctx, cx, cy - h * 0.22, w * 0.42, h * 0.24, 3 + variant, p.accent ?? '#fff', variant + 1);
      eyeDot(ctx, cx - w * 0.12, cy + h * 0.16, s * 1.3, eye, pose.dead);
      eyeDot(ctx, cx + w * 0.12, cy + h * 0.16, s * 1.3, eye, pose.dead);
      break;
    }
    case 'snail': {
      ellipse(ctx, cx - w * 0.1, cy + h * 0.18, w * 0.42, h * 0.32, p.secondary);
      circle(ctx, cx + w * 0.06, cy - h * 0.08, w * 0.3, p.primary);
      circle(ctx, cx + w * 0.06, cy - h * 0.08, w * 0.16, shade(p.primary, -0.2));
      line(ctx, cx - w * 0.32, cy + h * 0.02, cx - w * 0.44, cy - h * 0.32, s * 0.8, p.secondary);
      line(ctx, cx - w * 0.2, cy + h * 0.02, cx - w * 0.28, cy - h * 0.34, s * 0.8, p.secondary);
      eyeDot(ctx, cx - w * 0.44, cy - h * 0.34, s * 1.1, eye, pose.dead);
      eyeDot(ctx, cx - w * 0.28, cy - h * 0.36, s * 1.1, eye, pose.dead);
      break;
    }
    case 'bird': {
      ellipse(ctx, cx, cy, w * 0.34, h * 0.4, p.primary);
      poly(ctx, [[cx - w * 0.3, cy - h * 0.1], [cx - w * 0.55 - pose.lunge * s, cy - h * 0.05], [cx - w * 0.28, cy + h * 0.18]], p.secondary);
      poly(ctx, [[cx + w * 0.28, cy + h * 0.2], [cx + w * 0.5, cy + h * 0.05], [cx + w * 0.3, cy - h * 0.1]], p.secondary);
      poly(ctx, [[cx, cy + h * 0.42], [cx + w * 0.22, cy + h * 0.6], [cx - w * 0.05, cy + h * 0.48]], p.accent ?? '#f0a030');
      eyeDot(ctx, cx + w * 0.12, cy - h * 0.12, s * 1.3, eye, pose.dead);
      break;
    }
    case 'crab': {
      ellipse(ctx, cx, cy + h * 0.05, w * 0.4, h * 0.34, p.primary);
      for (const d of [-1, 1]) { poly(ctx, [[cx + d * w * 0.3, cy], [cx + d * w * 0.55, cy - h * 0.25], [cx + d * w * 0.45, cy - h * 0.1], [cx + d * w * 0.6, cy + h * 0.05], [cx + d * w * 0.35, cy + h * 0.12]], p.secondary); }
      for (let i = -2; i <= 2; i++) line(ctx, cx + i * w * 0.14, cy + h * 0.3, cx + i * w * 0.18 + pose.lunge * s * 0.3, cy + h * 0.5, s * 1.1, p.secondary);
      eyeDot(ctx, cx - w * 0.12, cy - h * 0.14, s * 1.2, eye, pose.dead);
      eyeDot(ctx, cx + w * 0.12, cy - h * 0.14, s * 1.2, eye, pose.dead);
      break;
    }
    case 'jelly': {
      ctx.globalAlpha = 0.85;
      ellipse(ctx, cx, cy - h * 0.15, w * 0.46, h * 0.32, p.primary);
      ctx.globalAlpha = 1;
      for (let i = -2; i <= 2; i++) line(ctx, cx + i * w * 0.16, cy + h * 0.05, cx + i * w * 0.2, cy + h * 0.48 - pose.squash * h * 0.15, s * 1, p.secondary);
      eyeDot(ctx, cx - w * 0.12, cy - h * 0.16, s * 1.3, eye, pose.dead);
      eyeDot(ctx, cx + w * 0.12, cy - h * 0.16, s * 1.3, eye, pose.dead);
      break;
    }
    case 'beetle': {
      ellipse(ctx, cx, cy + h * 0.05, w * 0.42, h * 0.36, p.primary);
      line(ctx, cx, cy - h * 0.28, cx, cy + h * 0.3, s * 0.6, p.secondary);
      for (const d of [-1, 1]) poly(ctx, [[cx + d * w * 0.36, cy - h * 0.3], [cx + d * w * 0.5, cy - h * 0.42 - variant], [cx + d * w * 0.4, cy - h * 0.12]], p.secondary);
      eyeDot(ctx, cx - w * 0.1, cy - h * 0.06, s * 1.2, eye, pose.dead);
      eyeDot(ctx, cx + w * 0.1, cy - h * 0.06, s * 1.2, eye, pose.dead);
      break;
    }
    case 'bat': {
      circle(ctx, cx, cy, w * 0.2, p.primary);
      poly(ctx, [[cx - w * 0.16, cy - h * 0.05], [cx - w * 0.55 - pose.lunge * s, cy - h * 0.3 - pose.tilt * s * 0.1], [cx - w * 0.42, cy + h * 0.05], [cx - w * 0.15, cy + h * 0.15]], p.secondary);
      poly(ctx, [[cx + w * 0.16, cy - h * 0.05], [cx + w * 0.55 + pose.lunge * s, cy - h * 0.3 - pose.tilt * s * 0.1], [cx + w * 0.42, cy + h * 0.05], [cx + w * 0.15, cy + h * 0.15]], p.secondary);
      poly(ctx, [[cx - w * 0.12, cy - h * 0.22], [cx - w * 0.05, cy - h * 0.4], [cx, cy - h * 0.2]], p.primary);
      poly(ctx, [[cx + w * 0.12, cy - h * 0.22], [cx + w * 0.05, cy - h * 0.4], [cx, cy - h * 0.2]], p.primary);
      eyeDot(ctx, cx - w * 0.06, cy, s * 1.1, p.eye ?? '#ff3344', pose.dead);
      eyeDot(ctx, cx + w * 0.06, cy, s * 1.1, p.eye ?? '#ff3344', pose.dead);
      break;
    }
    case 'wisp': {
      const glowR = w * 0.36 + Math.abs(pose.squash) * s;
      ctx.save(); ctx.globalAlpha = 0.35; circle(ctx, cx, cy, glowR * 1.4, p.accent ?? p.primary); ctx.restore();
      circle(ctx, cx, cy, glowR, p.primary);
      circle(ctx, cx, cy, glowR * 0.55, p.secondary);
      eyeDot(ctx, cx - glowR * 0.28, cy, s * 1, eye, pose.dead);
      eyeDot(ctx, cx + glowR * 0.28, cy, s * 1, eye, pose.dead);
      break;
    }
    case 'plant': {
      rect(ctx, cx - w * 0.08, cy - h * 0.1, w * 0.16, h * 0.5, p.secondary);
      for (const d of [-1, 1]) poly(ctx, [[cx, cy - h * 0.1], [cx + d * w * 0.4, cy - h * 0.3 - pose.lunge * s], [cx + d * w * 0.22, cy + h * 0.05]], p.secondary);
      ellipse(ctx, cx, cy - h * 0.42, w * 0.34, h * 0.24, p.primary);
      eyeDot(ctx, cx - w * 0.1, cy - h * 0.44, s * 1.1, eye, pose.dead);
      eyeDot(ctx, cx + w * 0.1, cy - h * 0.44, s * 1.1, eye, pose.dead);
      if (pose.mouth) ellipse(ctx, cx, cy - h * 0.32, s * 2, s * 1.4, '#3a1622');
      break;
    }
    case 'golem': {
      rrect(ctx, cx - w * 0.34, cy - h * 0.42, w * 0.68, h * 0.6, s * 2, p.primary);
      rect(ctx, cx - w * 0.4, cy + h * 0.12, w * 0.22, h * 0.28, p.secondary);
      rect(ctx, cx + w * 0.18, cy + h * 0.12, w * 0.22, h * 0.28, p.secondary);
      circle(ctx, cx, cy - h * 0.14, w * 0.16 + variant * 1, p.accent ?? '#5adfff');
      eyeDot(ctx, cx - w * 0.14, cy - h * 0.22, s * 1.2, p.eye ?? '#5adfff', pose.dead);
      eyeDot(ctx, cx + w * 0.14, cy - h * 0.22, s * 1.2, p.eye ?? '#5adfff', pose.dead);
      break;
    }
    case 'eel': {
      const segs = 6;
      for (let i = 0; i < segs; i++) {
        const t = i / (segs - 1);
        const yy = Math.sin(t * Math.PI * 2 + pose.t) * h * 0.14;
        ellipse(ctx, cx - w * 0.42 + t * w * 0.84, cy + yy, w * 0.09, h * (0.32 - t * 0.14), i % 2 === 0 ? p.primary : p.secondary);
      }
      poly(ctx, [[cx + w * 0.42, cy], [cx + w * 0.55, cy - h * 0.2], [cx + w * 0.5, cy]], p.accent ?? p.secondary);
      eyeDot(ctx, cx - w * 0.4, cy - h * 0.06, s * 1, eye, pose.dead);
      break;
    }
    case 'fish': {
      ellipse(ctx, cx, cy, w * 0.36, h * 0.32, p.primary);
      poly(ctx, [[cx - w * 0.32, cy], [cx - w * 0.5 - pose.lunge * s, cy - h * 0.24], [cx - w * 0.5 - pose.lunge * s, cy + h * 0.24]], p.secondary);
      poly(ctx, [[cx, cy - h * 0.28], [cx + w * 0.08, cy - h * 0.5], [cx + w * 0.16, cy - h * 0.24]], p.secondary);
      eyeDot(ctx, cx + w * 0.14, cy - h * 0.04, s * 1.2, eye, pose.dead);
      break;
    }
    case 'humanoid': {
      circle(ctx, cx, cy - h * 0.36, w * 0.24, p.accent ?? '#d9b48a');
      rrect(ctx, cx - w * 0.26, cy - h * 0.16, w * 0.52, h * 0.42, s * 1.5, p.primary);
      line(ctx, cx - w * 0.28, cy - h * 0.05, cx - w * 0.5 - pose.lunge * s * 1.5, cy + h * 0.1, s * 2, p.secondary);
      line(ctx, cx + w * 0.28, cy - h * 0.05, cx + w * 0.5 + pose.lunge * s * 1.5, cy + h * 0.1, s * 2, p.secondary);
      line(ctx, cx - w * 0.12, cy + h * 0.26, cx - w * 0.14, cy + h * 0.5, s * 2.2, p.secondary);
      line(ctx, cx + w * 0.12, cy + h * 0.26, cx + w * 0.14, cy + h * 0.5, s * 2.2, p.secondary);
      eyeDot(ctx, cx - w * 0.08, cy - h * 0.37, s * 1, eye, pose.dead);
      eyeDot(ctx, cx + w * 0.08, cy - h * 0.37, s * 1, eye, pose.dead);
      break;
    }
    case 'spider': {
      circle(ctx, cx, cy + h * 0.1, w * 0.24, p.primary);
      circle(ctx, cx, cy - h * 0.2, w * 0.16, p.secondary);
      for (const d of [-1, 1]) for (let i = 0; i < 4; i++) { const a = (i / 3 - 0.5) * 1.6 + pose.t * 0.2; line(ctx, cx + d * w * 0.1, cy + h * 0.06, cx + d * (w * 0.4 + Math.cos(a) * w * 0.1), cy + h * 0.1 + Math.sin(a) * h * 0.3, s * 0.7, p.secondary); }
      eyeDot(ctx, cx - w * 0.06, cy - h * 0.22, s * 1, p.eye ?? '#ff3344', pose.dead);
      eyeDot(ctx, cx + w * 0.06, cy - h * 0.22, s * 1, p.eye ?? '#ff3344', pose.dead);
      break;
    }
    case 'boar': {
      ellipse(ctx, cx, cy, w * 0.42, h * 0.3, p.primary);
      circle(ctx, cx + w * 0.36, cy - h * 0.1, w * 0.2, p.primary);
      poly(ctx, [[cx + w * 0.5, cy - h * 0.02], [cx + w * 0.66, cy + h * 0.02], [cx + w * 0.5, cy + h * 0.14]], '#f2ead0');
      for (const d of [-1, 1]) line(ctx, cx + d * w * 0.2, cy + h * 0.24, cx + d * w * 0.2, cy + h * 0.46, s * 2, p.secondary);
      eyeDot(ctx, cx + w * 0.4, cy - h * 0.16, s * 1.1, eye, pose.dead);
      break;
    }
    case 'grub': {
      for (let i = 0; i < 4; i++) circle(ctx, cx - w * 0.34 + i * w * 0.22, cy + Math.sin(i + pose.t) * h * 0.05, w * (0.2 - i * 0.01), i % 2 ? p.secondary : p.primary);
      eyeDot(ctx, cx - w * 0.42, cy - h * 0.06, s * 1, eye, pose.dead);
      break;
    }
    case 'wraith': {
      ctx.save(); ctx.globalAlpha = 0.8;
      poly(ctx, [[cx - w * 0.3, cy - h * 0.3], [cx + w * 0.3, cy - h * 0.3], [cx + w * 0.36, cy + h * 0.4], [cx + w * 0.12, cy + h * 0.22], [cx, cy + h * 0.42], [cx - w * 0.12, cy + h * 0.22], [cx - w * 0.36, cy + h * 0.4]], p.primary);
      ctx.restore();
      circle(ctx, cx, cy - h * 0.36, w * 0.22, p.secondary);
      eyeDot(ctx, cx - w * 0.08, cy - h * 0.38, s * 1.1, p.eye ?? '#c85bff', pose.dead);
      eyeDot(ctx, cx + w * 0.08, cy - h * 0.38, s * 1.1, p.eye ?? '#c85bff', pose.dead);
      break;
    }
    case 'hydra': {
      ellipse(ctx, cx, cy + h * 0.18, w * 0.4, h * 0.26, p.primary);
      const heads = 3;
      for (let i = 0; i < heads; i++) {
        const hx = cx + (i - 1) * w * 0.26;
        const hy = cy - h * 0.16 - Math.abs(i - 1) * h * 0.06 - (i === 1 ? pose.lunge * s * 1.5 : 0);
        line(ctx, cx + (i - 1) * w * 0.14, cy + h * 0.05, hx, hy + h * 0.14, s * 2.2, p.secondary);
        circle(ctx, hx, hy, w * 0.13, p.secondary);
        eyeDot(ctx, hx - w * 0.04, hy - h * 0.02, s * 1.2, p.eye ?? '#ffcf40', pose.dead);
        eyeDot(ctx, hx + w * 0.04, hy - h * 0.02, s * 1.2, p.eye ?? '#ffcf40', pose.dead);
        if (pose.mouth) ellipse(ctx, hx, hy + h * 0.06, s * 2, s * 1.2, '#3a1622');
      }
      spots(ctx, cx, cy + h * 0.2, w * 0.36, h * 0.2, 5, p.accent ?? shade(p.primary, -0.2), variant);
      break;
    }
    case 'roc': {
      ellipse(ctx, cx, cy, w * 0.22, h * 0.4, p.primary);
      const wingFlap = Math.sin(pose.t) * 0.3 + 0.3;
      poly(ctx, [[cx - w * 0.16, cy - h * 0.1], [cx - w * 0.62, cy - h * 0.5 - wingFlap * h * 0.3], [cx - w * 0.5, cy + h * 0.02], [cx - w * 0.2, cy + h * 0.24]], p.secondary);
      poly(ctx, [[cx + w * 0.16, cy - h * 0.1], [cx + w * 0.62, cy - h * 0.5 - wingFlap * h * 0.3], [cx + w * 0.5, cy + h * 0.02], [cx + w * 0.2, cy + h * 0.24]], p.secondary);
      circle(ctx, cx, cy - h * 0.36, w * 0.15, p.primary);
      poly(ctx, [[cx - w * 0.1, cy - h * 0.34], [cx - w * 0.28, cy - h * 0.3], [cx - w * 0.1, cy - h * 0.24]], p.accent ?? '#f0a030');
      poly(ctx, [[cx, cy + h * 0.36], [cx + w * 0.1, cy + h * 0.56], [cx - w * 0.06, cy + h * 0.44]], p.accent ?? '#f0a030');
      eyeDot(ctx, cx + w * 0.04, cy - h * 0.38, s * 1.4, p.eye ?? '#ffe070', pose.dead);
      break;
    }
    case 'captain': {
      ctx.save(); ctx.globalAlpha = 0.75;
      poly(ctx, [[cx - w * 0.24, cy - h * 0.2], [cx + w * 0.24, cy - h * 0.2], [cx + w * 0.3, cy + h * 0.46], [cx, cy + h * 0.3], [cx - w * 0.3, cy + h * 0.46]], p.primary);
      ctx.restore();
      circle(ctx, cx, cy - h * 0.36, w * 0.2, p.secondary);
      poly(ctx, [[cx - w * 0.26, cy - h * 0.44], [cx + w * 0.26, cy - h * 0.44], [cx + w * 0.14, cy - h * 0.54], [cx - w * 0.14, cy - h * 0.54]], p.accent ?? '#1a1a22');
      eyeDot(ctx, cx - w * 0.06, cy - h * 0.37, s * 1.1, p.eye ?? '#5adfff', pose.dead);
      eyeDot(ctx, cx + w * 0.06, cy - h * 0.37, s * 1.1, p.eye ?? '#5adfff', pose.dead);
      line(ctx, cx + w * 0.28, cy - h * 0.1, cx + w * 0.5 + pose.lunge * s * 2, cy - h * 0.5 - pose.lunge * s * 2, s * 1.6, '#8a97a6');
      poly(ctx, [[cx + w * 0.46 + pose.lunge * s * 2, cy - h * 0.56 - pose.lunge * s * 2], [cx + w * 0.6 + pose.lunge * s * 2, cy - h * 0.44 - pose.lunge * s * 2], [cx + w * 0.5 + pose.lunge * s * 2, cy - h * 0.36 - pose.lunge * s * 2]], '#c9d6de');
      break;
    }
    case 'heart': {
      const pulse = 1 + Math.sin(pose.t) * 0.06;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(pulse, pulse); ctx.translate(-cx, -cy);
      poly(ctx, [[cx, cy + h * 0.42], [cx - w * 0.4, cy - h * 0.04], [cx - w * 0.4, cy - h * 0.3], [cx - w * 0.14, cy - h * 0.42], [cx, cy - h * 0.24], [cx + w * 0.14, cy - h * 0.42], [cx + w * 0.4, cy - h * 0.3], [cx + w * 0.4, cy - h * 0.04]], p.primary);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; line(ctx, cx, cy, cx + Math.cos(a) * w * 0.42, cy + Math.sin(a) * h * 0.42, s * 1.1, p.secondary); }
      circle(ctx, cx, cy - h * 0.02, w * 0.14, p.accent ?? '#ff2f4f');
      ctx.restore();
      eyeDot(ctx, cx - w * 0.1, cy - h * 0.1, s * 1.3, p.eye ?? '#ffffff', pose.dead);
      eyeDot(ctx, cx + w * 0.1, cy - h * 0.1, s * 1.3, p.eye ?? '#ffffff', pose.dead);
      break;
    }
  }
  ctx.restore();
}

function poseFor(anim: string, i: number, n: number): Pose {
  const t = (i / Math.max(1, n)) * Math.PI * 2;
  switch (anim) {
    case 'idle': return { squash: 0.06 * Math.sin(t), lunge: 0, flash: false, dead: false, tilt: 0, mouth: false, t };
    case 'move': return { squash: 0.16 * Math.abs(Math.sin(t)), lunge: 0, flash: false, dead: false, tilt: 6 * Math.sin(t), mouth: false, t };
    case 'attack': {
      const k = i / (n - 1 || 1);
      return { squash: -0.1, lunge: (k < 0.6 ? k / 0.6 : (1 - k) / 0.4) * 1.4, flash: false, dead: false, tilt: 0, mouth: k > 0.3 && k < 0.85, t };
    }
    case 'hurt': return { squash: -0.18, lunge: -0.6, flash: true, dead: false, tilt: -8, mouth: false, t };
    case 'die': return { squash: 0.3, lunge: 0, flash: false, dead: true, tilt: 90, mouth: false, t };
    default: return { squash: 0, lunge: 0, flash: false, dead: false, tilt: 0, mouth: false, t };
  }
}

const ANIM_TABLE: { name: string; frames: number; frameRate: number; repeat: number }[] = [
  { name: 'idle', frames: 3, frameRate: 4, repeat: -1 },
  { name: 'move', frames: 4, frameRate: 8, repeat: -1 },
  { name: 'attack', frames: 3, frameRate: 10, repeat: 0 },
  { name: 'hurt', frames: 1, frameRate: 6, repeat: 0 },
  { name: 'die', frames: 1, frameRate: 4, repeat: 0 },
];

function render(base: MonsterBase, pal: Pal, scale: number, variant: number, pose: Pose): HTMLCanvasElement {
  const [bw, bh] = BOX[base];
  const pad = 6;
  const w = Math.ceil(bw * scale) + pad * 2;
  const h = Math.ceil(bh * scale) + pad * 2;
  const art = makeCanvas(w, h);
  const ctx = ctx2d(art);
  const cx = w / 2, cy = h / 2 + (base === 'bird' || base === 'roc' || base === 'bat' || base === 'wisp' ? 0 : pad * 0.2);
  drawBase(base, ctx, cx, cy, scale, pal, variant, pose);
  if (pose.flash) {
    ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(0, 0, w, h); ctx.restore();
  }
  return outlined(art, OUTLINE);
}

const infoCache = new Map<string, SpriteInfo>();

export function getMonsterSprite(scene: Phaser.Scene, def: MonsterDef): SpriteInfo {
  const scale = def.sprite.scale ?? 1;
  const variant = def.sprite.variant ?? 0;
  const key = `mon_${def.id}_${hashStr(`${def.sprite.base}|${def.sprite.palette.primary}|${def.sprite.palette.secondary}|${scale}|${variant}`).toString(36)}`;
  const cached = infoCache.get(key);
  if (cached && scene.textures.exists(key)) return cached;

  const [bw, bh] = BOX[def.sprite.base];
  const pad = 6;
  const fw = Math.ceil(bw * scale) + pad * 2;
  const fh = Math.ceil(bh * scale) + pad * 2;
  const frames: HTMLCanvasElement[] = [];
  const ranges: { name: string; start: number; end: number; frameRate: number; repeat: number }[] = [];
  for (const t of ANIM_TABLE) {
    const start = frames.length;
    for (let i = 0; i < t.frames; i++) frames.push(render(def.sprite.base, def.sprite.palette, scale, variant, poseFor(t.name, i, t.frames)));
    ranges.push({ name: t.name, start, end: frames.length - 1, frameRate: t.frameRate, repeat: t.repeat });
  }
  registerSpriteSheet(scene, key, frames, fw, fh);
  const anims: Record<string, string> = {};
  for (const r of ranges) anims[r.name] = ensureAnim(scene, key, `${key}:${r.name}`, r.start, r.end, r.frameRate, r.repeat);

  const info: SpriteInfo = { key, frameWidth: fw, frameHeight: fh, bodyWidth: Math.round(bw * scale * 0.7), bodyHeight: Math.round(bh * scale * 0.8), anims };
  infoCache.set(key, info);
  return info;
}
