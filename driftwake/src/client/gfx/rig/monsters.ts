/**
 * Illustrated monsters. A drawer is registered per MonsterBase (so every monster built on that
 * base — Puffmoss, Frostpuff, Hexgoo... — gets the illustrated look recolored by its palette and
 * `variant`), and the baker produces the standard monster clips: idle, move, attack, hurt, die.
 */
import Phaser from 'phaser';
import type { MonsterBase, MonsterDef } from '@shared/types';
import type { SpriteInfo } from '../spec';
import { hashStr } from '../canvasKit';
import { BOX } from '../monsters';
import { bakeRig, renderRigFrame, type RigClip, type RigSpec } from './bake';

export interface MonsterPal { primary: string; secondary: string; accent?: string; eye?: string }

export interface MonsterDrawer {
  /** frame size in WORLD px at scale 1 (art may use ~70% of it; leave room for squash/lunge) */
  frame: { worldW: number; worldH: number };
  /** override the default clip table */
  clips?: RigClip[];
  /**
   * Draw one frame. Origin = feet (bottom-center), texture px, up = -y, facing +x.
   * `s` = def.sprite.scale (already applied to the canvas — draw at scale-1 sizes).
   */
  draw(g: CanvasRenderingContext2D, pal: MonsterPal, variant: number, clip: string, t: number, i: number, n: number): void;
}

export const MONSTER_CLIPS: RigClip[] = [
  { name: 'idle', frames: 8, frameRate: 8, repeat: -1 },
  { name: 'move', frames: 8, frameRate: 12, repeat: -1 },
  { name: 'attack', frames: 6, frameRate: 14, repeat: 0 },
  { name: 'hurt', frames: 2, frameRate: 10, repeat: 0 },
  { name: 'die', frames: 5, frameRate: 10, repeat: 0 },
];

const DRAWERS = new Map<MonsterBase, MonsterDrawer>();
export function registerMonsterBase(base: MonsterBase, d: MonsterDrawer): void { DRAWERS.set(base, d); }
export function hasRigMonster(def: MonsterDef): boolean { return DRAWERS.has(def.sprite.base); }
export function rigMonsterBases(): MonsterBase[] { return [...DRAWERS.keys()]; }

export function monsterRigSpec(def: MonsterDef): RigSpec {
  const d = DRAWERS.get(def.sprite.base);
  if (!d) throw new Error(`no rig drawer for monster base ${def.sprite.base}`);
  const s = def.sprite.scale ?? 1;
  const variant = def.sprite.variant ?? 0;
  const pal = def.sprite.palette;
  const [bw, bh] = BOX[def.sprite.base];
  return {
    key: `rigm_${def.id}_${hashStr(`${def.sprite.base}|${pal.primary}|${pal.secondary}|${pal.accent}|${pal.eye}|${s}|${variant}`).toString(36)}`,
    worldW: Math.ceil(d.frame.worldW * s), worldH: Math.ceil(d.frame.worldH * s),
    // physics parity with the pixel sprites (see gfx/monsters.ts getMonsterSprite)
    bodyW: Math.round(bw * s * 0.7), bodyH: Math.round(bh * s * 0.8),
    clips: d.clips ?? MONSTER_CLIPS,
    draw(g, clip, t, i, n) {
      g.save(); g.scale(s, s);
      d.draw(g, pal, variant, clip, t, i, n);
      g.restore();
    },
  };
}

export function getRigMonsterSprite(scene: Phaser.Scene, def: MonsterDef): SpriteInfo {
  return bakeRig(scene, monsterRigSpec(def));
}

export function rigMonsterIdleCanvas(def: MonsterDef, res = 1): HTMLCanvasElement {
  const spec = monsterRigSpec(def);
  return renderRigFrame(spec, spec.clips[0], 0, res);
}
