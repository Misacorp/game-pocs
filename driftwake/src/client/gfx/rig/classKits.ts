/**
 * Class-kit registry: maps a resolved CharacterLook + equipment tints (BaseColors) onto a
 * HumanLook for one class, plus an optional pose flavor (stance). Kept in its own module —
 * rather than inline in characters.ts — so each class file (classes/vanguard.ts etc) can
 * register its outfit/headgear AND its ClassKit without characters.ts and the class files
 * ever importing each other in a cycle: class files import from here, characters.ts imports
 * from here too and pulls in the class files for their registration side effects.
 */
import type { ClassId } from '@shared/types';
import type { CharacterLook } from '../spec';
import { CLASS_COLORS } from '../palette';
import { weaponDefaultColors } from './parts/weapons';
import type { HumanLook, HumanPose } from './humanoid';

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
export function getClassKit(id: ClassId): ClassKit | undefined { return KITS[id]; }
export function hasClassKit(id: ClassId): boolean { return !!KITS[id]; }

export function baseColors(look: CharacterLook): BaseColors {
  return {
    outfit: look.appearance.outfit || CLASS_COLORS[look.classId],
    armor: look.armorColors?.[0], armorAcc: look.armorColors?.[1],
    helmet: look.helmetColors?.[0], helmetAcc: look.helmetColors?.[1],
    boots: look.bootsColors?.[0], gloves: look.glovesColors?.[0],
    weapon: look.weaponColors?.length ? look.weaponColors : weaponDefaultColors(look.weaponType),
  };
}
