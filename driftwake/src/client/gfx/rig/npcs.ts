/**
 * Illustrated NPCs: built on the humanoid rig (NPC_CLIPS: a single calm idle). Each NPC kit maps
 * an NpcDef onto a HumanLook + optional idle flavor. Kits are registered per NPC id first, then
 * per NpcBase, so a base kit (e.g. 'elder') can cover every NPC of that base once it's generic
 * enough — the trial ships Old Pell only.
 */
import Phaser from 'phaser';
import type { NpcBase, NpcDef } from '@shared/types';
import type { SpriteInfo } from '../spec';
import { hashStr } from '../canvasKit';
import { bakeRig, renderRigFrame, frameToDataUrl, type RigSpec } from './bake';
import { drawHumanoid, humanoidPose, NPC_CLIPS, HUMANOID_FRAME, type HumanLook, type HumanPose } from './humanoid';
import { RIG_SCALE } from './pen';
import './parts/hair';
import './parts/common';

export interface NpcKit {
  look(def: NpcDef): HumanLook;
  /** idle flavor on top of the shared idle pose (stoop, cane, gestures...) */
  pose?(p: HumanPose, t: number, i: number, n: number): void;
  /** extra props drawn after the character (canes, lanterns), origin feet */
  props?(g: CanvasRenderingContext2D, def: NpcDef, p: HumanPose, t: number): void;
  /** props drawn before the character */
  backProps?(g: CanvasRenderingContext2D, def: NpcDef, p: HumanPose, t: number): void;
}

const BY_ID = new Map<string, NpcKit>();
const BY_BASE = new Map<NpcBase, NpcKit>();
export function registerNpcKit(id: string, kit: NpcKit): void { BY_ID.set(id, kit); }
export function registerNpcBaseKit(base: NpcBase, kit: NpcKit): void { BY_BASE.set(base, kit); }
function kitFor(def: NpcDef): NpcKit | undefined { return BY_ID.get(def.id) ?? BY_BASE.get(def.sprite.base); }
export function hasRigNpc(def: NpcDef): boolean { return !!kitFor(def); }

export function npcRigSpec(def: NpcDef): RigSpec {
  const kit = kitFor(def);
  if (!kit) throw new Error(`no rig kit for npc ${def.id}`);
  const look = kit.look(def);
  const p = def.sprite.palette;
  return {
    key: `rign_${def.id}_${hashStr(`${def.sprite.base}|${p.skin}|${p.hair}|${p.outfit}|${p.accent}|${def.sprite.accessory}`).toString(36)}`,
    ...HUMANOID_FRAME,
    clips: NPC_CLIPS,
    draw(g, clip, t, i, n) {
      const pose = humanoidPose('idle', t, i, n, look.weapon?.type);
      if (!look.weapon) pose.wHand = 'none';
      kit.pose?.(pose, t, i, n);
      kit.backProps?.(g, def, pose, t);
      drawHumanoid(g, look, pose, clip, t);
      kit.props?.(g, def, pose, t);
    },
  };
}

export function getRigNpcSprite(scene: Phaser.Scene, def: NpcDef): SpriteInfo {
  return bakeRig(scene, npcRigSpec(def));
}

const urlCache = new Map<string, string>();
/** Head-and-shoulders portrait rendered straight from the rig (vector, so any size stays crisp). */
export function rigNpcPortraitUrl(def: NpcDef, size = 96): string {
  const k = `${def.id}_${size}`;
  const hit = urlCache.get(k); if (hit) return hit;
  const res = Math.max(1, size / 64);
  const spec = npcRigSpec(def);
  const frame = renderRigFrame(spec, spec.clips[0], 0, res);
  const url = portraitCrop(frame, res, size);
  urlCache.set(k, url);
  return url;
}

/** Crops the head+shoulders out of a humanoid frame rendered at `res`. */
export function portraitCrop(frame: HTMLCanvasElement, res: number, size: number): string {
  const px = RIG_SCALE * res;
  // head center sits ~27 world px above the feet; crop a 32-world-px square around it
  const cx = frame.width / 2 + 2 * px, cy = frame.height - (1 + 27) * px;
  const half = 16 * px;
  return frameToDataUrl(frame, cx - half, cy - half * 0.95, half * 2, half * 2, size, size);
}
