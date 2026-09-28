/**
 * Routes the public sprite/portrait API to the illustrated rig (gfx/rig/**) or the original
 * pixel-art generators, per the art-style toggle (gfx/rig/style.ts). Anything the rig doesn't
 * cover yet silently falls back to pixel art, so the two styles can coexist during the trial.
 */
import type Phaser from 'phaser';
import type { MonsterDef, NpcDef } from '@shared/types';
import type { CharacterLook, SpriteInfo } from './spec';
import { getCharacterSprite as pixelCharacter } from './characters';
import { getMonsterSprite as pixelMonster } from './monsters';
import { getNpcSprite as pixelNpc, npcPortraitUrl as pixelNpcPortrait } from './npcs';
import { characterPortraitUrl as pixelPortrait, characterPreviewUrl as pixelPreview } from './icons';
import { isIllustrated } from './rig/style';
import { getRigCharacterSprite, rigCharacterIdleCanvas, characterRigSpec } from './rig/characters';
import { getRigMonsterSprite, hasRigMonster } from './rig/monsters';
import { getRigNpcSprite, hasRigNpc, rigNpcPortraitUrl, portraitCrop } from './rig/npcs';
import { frameToDataUrl, isRigBaked } from './rig/bake';
import { RIG_SCALE } from './rig/pen';
import { hashStr } from './canvasKit';
import './rig/register';

export function getCharacterSprite(scene: Phaser.Scene, look: CharacterLook): SpriteInfo {
  return isIllustrated() ? getRigCharacterSprite(scene, look) : pixelCharacter(scene, look);
}

const deferred: { scene: Phaser.Scene; look: CharacterLook; cbs: ((info: SpriteInfo) => void)[] }[] = [];
let deferArmed = false;
function pumpDeferred(): void {
  const job = deferred.shift();
  if (job && job.scene.sys?.isActive()) {
    const info = getRigCharacterSprite(job.scene, job.look);
    for (const cb of job.cbs) cb(info);
  }
  if (deferred.length) setTimeout(pumpDeferred, 60); else deferArmed = false;
}

/**
 * For characters that don't need to be illustrated on their very first frame (other players,
 * bots): returns the cheap pixel sheet immediately when the illustrated one isn't baked yet, and
 * bakes it in the background (one sheet per tick, so a map full of players never stalls a frame
 * for long), calling `onUpgrade` with the illustrated sheet once ready.
 */
export function getCharacterSpriteDeferred(scene: Phaser.Scene, look: CharacterLook, onUpgrade: (info: SpriteInfo) => void): SpriteInfo {
  if (!isIllustrated()) return pixelCharacter(scene, look);
  if (isRigBaked(scene, characterRigSpec(look).key)) return getRigCharacterSprite(scene, look);
  const key = JSON.stringify(look);
  const existing = deferred.find((d) => d.scene === scene && JSON.stringify(d.look) === key);
  if (existing) existing.cbs.push(onUpgrade); else deferred.push({ scene, look, cbs: [onUpgrade] });
  if (!deferArmed) { deferArmed = true; setTimeout(pumpDeferred, 120); }
  return pixelCharacter(scene, look);
}

export function getMonsterSprite(scene: Phaser.Scene, def: MonsterDef): SpriteInfo {
  return isIllustrated() && hasRigMonster(def) ? getRigMonsterSprite(scene, def) : pixelMonster(scene, def);
}

export function getNpcSprite(scene: Phaser.Scene, def: NpcDef): SpriteInfo {
  return isIllustrated() && hasRigNpc(def) ? getRigNpcSprite(scene, def) : pixelNpc(scene, def);
}

export function npcPortraitUrl(def: NpcDef, size = 96): string {
  return isIllustrated() && hasRigNpc(def) ? rigNpcPortraitUrl(def, size) : pixelNpcPortrait(def, size);
}

const urlCache = new Map<string, string>();

export function characterPortraitUrl(look: CharacterLook, size = 96): string {
  if (!isIllustrated()) return pixelPortrait(look, size);
  const k = `p_${hashStr(JSON.stringify(look)).toString(36)}_${size}`;
  const hit = urlCache.get(k); if (hit) return hit;
  const res = Math.max(1, size / 64);
  const url = portraitCrop(rigCharacterIdleCanvas(look, res), res, size);
  urlCache.set(k, url);
  return url;
}

/** Full-body preview, same 4:5 aspect (32x40 * scale CSS px) as the pixel version, rendered at 2x
 *  that for crisp high-DPI display. */
export function characterPreviewUrl(look: CharacterLook, scale = 4): string {
  if (!isIllustrated()) return pixelPreview(look, scale);
  const k = `v_${hashStr(JSON.stringify(look)).toString(36)}_${scale}`;
  const hit = urlCache.get(k); if (hit) return hit;
  const outW = 32 * scale * 2, outH = 40 * scale * 2;
  // crop a 40x50 world-px window (4:5) around the character from the 56x50 frame
  const res = outH / (50 * RIG_SCALE);
  const frame = rigCharacterIdleCanvas(look, res);
  const px = RIG_SCALE * res;
  const url = frameToDataUrl(frame, frame.width / 2 - 20 * px, 0, 40 * px, 50 * px, outW, outH);
  urlCache.set(k, url);
  return url;
}
