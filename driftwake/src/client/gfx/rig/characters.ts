/**
 * Illustrated player characters: maps a CharacterLook (class, job, appearance, equipment tints)
 * onto the humanoid rig through a per-class kit, then bakes the sheet.
 */
import Phaser from 'phaser';
import type { ClassId } from '@shared/types';
import type { CharacterLook, SpriteInfo } from '../spec';
import { hashStr } from '../canvasKit';
import { CLASS_COLORS } from '../palette';
import { bakeRig, renderRigFrame, type RigSpec } from './bake';
import { drawHumanoid, humanoidPose, HUMANOID_CLIPS, HUMANOID_FRAME, type HumanLook, type HumanPose } from './humanoid';
import { weaponDefaultColors } from './parts/weapons';
import { mix, shade } from './pen';
import './parts/hair';
import './parts/common';
import './classes/vanguard';

export interface ClassKit {
  /** build the rig look for this class */
  look(look: CharacterLook, base: BaseColors): HumanLook;
  /** optional per-class pose flavor (stance, idle attitude) applied after the shared clip pose */
  pose?(p: HumanPose, clip: string, t: number, i: number, n: number): void;
}

export interface BaseColors {
  outfit: string;
  armor?: string; armorAcc?: string;
  helmet?: string; helmetAcc?: string;
  boots?: string; gloves?: string;
  weapon: string[];
}

const KITS: Partial<Record<ClassId, ClassKit>> = {};
export function registerClassKit(id: ClassId, kit: ClassKit): void { KITS[id] = kit; }
export function hasClassKit(id: ClassId): boolean { return !!KITS[id]; }

function baseColors(look: CharacterLook): BaseColors {
  return {
    outfit: look.appearance.outfit || CLASS_COLORS[look.classId],
    armor: look.armorColors?.[0], armorAcc: look.armorColors?.[1],
    helmet: look.helmetColors?.[0], helmetAcc: look.helmetColors?.[1],
    boots: look.bootsColors?.[0], gloves: look.glovesColors?.[0],
    weapon: look.weaponColors?.length ? look.weaponColors : weaponDefaultColors(look.weaponType),
  };
}

// ---- vanguard ---------------------------------------------------------------

registerClassKit('vanguard', {
  look(l, b) {
    const steel = b.armor ? mix(b.armor, '#b8c2cc', 0.35) : mix('#b3bdc8', b.outfit, 0.12);
    return {
      skin: l.appearance.skin, hair: l.appearance.hair, hairStyle: l.appearance.hairStyle, eyes: l.appearance.eyes,
      outfit: 'plate',
      colors: {
        main: steel, acc: b.outfit, trim: b.armorAcc ?? '#d9b25a',
        sleeve: shade(steel, -0.28), pants: '#4a3f52',
        boots: b.boots ?? mix('#8a94a2', steel, 0.3), gloves: b.gloves ?? shade(steel, -0.05),
      },
      headgear: b.helmet ? { id: 'helm', colors: [b.helmet, b.helmetAcc ?? '#d9b25a'] } : undefined,
      weapon: l.weaponType ? { type: l.weaponType, colors: b.weapon } : undefined,
      job: l.jobId,
      face: { brows: 'stern' },
    };
  },
  pose(p, clip) {
    // a planted, shield-wall stance
    if (clip === 'idle' || clip === 'crouch') { p.lF = [p.lF[0] + 0.12, p.lF[1]]; p.lB = [p.lB[0] - 0.08, p.lB[1]]; }
  },
});

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
  const kit = KITS[look.classId];
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
  const kit = KITS[look.classId];
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
