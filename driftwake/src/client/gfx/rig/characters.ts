/**
 * Illustrated player characters: maps a CharacterLook (class, job, appearance, equipment tints)
 * onto the humanoid rig through a per-class kit, then bakes the sheet. The kit registry itself
 * lives in `classKits.ts` (re-exported here) so class modules can register without a cycle.
 */
import Phaser from 'phaser';
import type { CharacterLook, SpriteInfo } from '../spec';
import { hashStr } from '../canvasKit';
import { bakeRig, renderRigFrame, type RigSpec } from './bake';
import { drawHumanoid, humanoidPose, HUMANOID_CLIPS, HUMANOID_FRAME, type HumanLook } from './humanoid';
import { getClassKit, registerClassKit, hasClassKit, baseColors, type ClassKit, type BaseColors } from './classKits';
import { shade } from './pen';
import './parts/hair';
import './parts/common';
import './classes/vanguard';
import './classes/stormcaller';
import './classes/windrunner';
import './classes/shade';

export { registerClassKit, hasClassKit, type ClassKit, type BaseColors };

// ---- generic fallback (until a class ships its own kit) -------------------

function fallbackKit(l: CharacterLook, b: BaseColors): HumanLook {
  const main = b.armor ?? b.outfit;
  return {
    skin: l.appearance.skin, hair: l.appearance.hair, hairStyle: l.appearance.hairStyle, eyes: l.appearance.eyes,
    outfit: 'tunic',
    colors: { main, acc: b.armorAcc ?? shade(main, -0.3), trim: '#d9b25a', sleeve: shade(main, -0.1), pants: '#3e3848', boots: b.boots ?? '#5a3a2a', gloves: b.gloves ?? l.appearance.skin },
    headgear: b.helmet ? { id: 'helm', colors: [b.helmet, b.helmetAcc ?? '#d9b25a'] } : undefined,
    weapon: l.weaponType ? { type: l.weaponType, colors: b.weapon } : undefined,
    job: l.jobId,
  };
}

// ---- public -------------------------------------------------------------------

export function rigLook(look: CharacterLook): HumanLook {
  const b = baseColors(look);
  const kit = getClassKit(look.classId);
  return kit ? kit.look(look, b) : fallbackKit(look, b);
}

function lookKey(look: CharacterLook): string {
  const a = look.appearance;
  return `rigc_${hashStr([
    look.classId, look.jobId, look.weaponType ?? '', a.skin, a.hair, a.hairStyle, a.eyes, a.outfit,
    ...(look.weaponColors ?? []), ...(look.armorColors ?? []), ...(look.helmetColors ?? []),
    ...(look.bootsColors ?? []), ...(look.glovesColors ?? []),
  ].join('|')).toString(36)}`;
}

export function characterRigSpec(look: CharacterLook): RigSpec {
  const hl = rigLook(look);
  const kit = getClassKit(look.classId);
  return {
    key: lookKey(look),
    ...HUMANOID_FRAME,
    bodyW: HUMANOID_FRAME.bodyW, bodyH: HUMANOID_FRAME.bodyH, visualH: HUMANOID_FRAME.visualH,
    clips: HUMANOID_CLIPS,
    draw(g, clip, t, i, n) {
      const p = humanoidPose(clip, t, i, n, look.weaponType);
      kit?.pose?.(p, clip, t, i, n);
      drawHumanoid(g, hl, p, clip, t);
    },
  };
}

export function getRigCharacterSprite(scene: Phaser.Scene, look: CharacterLook): SpriteInfo {
  return bakeRig(scene, characterRigSpec(look));
}

/** Idle frame 0 at `res`x the sheet resolution (for DOM portraits/previews). */
export function rigCharacterIdleCanvas(look: CharacterLook, res = 1): HTMLCanvasElement {
  const spec = characterRigSpec(look);
  return renderRigFrame(spec, spec.clips[0], 0, res);
}
