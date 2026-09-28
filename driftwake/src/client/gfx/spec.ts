/**
 * Shared TypeScript interfaces for the gfx module. Re-exported from index.ts so the public
 * API surface (CharacterLook, SpriteInfo, etc) keeps the exact shape other modules rely on.
 */
import type Phaser from 'phaser';
import type { Appearance, ClassId, JobId, WeaponType } from '@shared/types';

export interface CharacterLook {
  classId: ClassId;
  jobId: JobId;
  appearance: Appearance;
  weaponType?: WeaponType;
  /** colors from the equipped weapon icon */
  weaponColors?: string[];
  armorColors?: string[];
  helmetColors?: string[];
  bootsColors?: string[];
  glovesColors?: string[];
}

export interface SpriteInfo {
  /** texture key (spritesheet) */
  key: string;
  frameWidth: number;
  frameHeight: number;
  /** suggested physics body size (centered horizontally, aligned to bottom of frame) */
  bodyWidth: number;
  bodyHeight: number;
  /** anim name -> Phaser anim key; characters: idle, walk, jump, fall, attack, cast, shoot, climb, hurt, dead, crouch
   *  monsters: idle, move, attack, hurt, die; npcs: idle; nodes: idle, depleted; portal: idle */
  anims: Record<string, string>;
  /** texture px per world px (illustrated rig sheets are baked at 2x). frame/body sizes above are
   *  always WORLD px; entities apply 1/texScale via entities/spriteUtil.applySpriteInfo. */
  texScale?: number;
  /** approximate art height above the feet in WORLD px, when it differs from frameHeight */
  visualHeight?: number;
}

export interface PlatformTextures { groundTop: string; groundFill: string; oneway: string; solid: string; rope: string; ladder: string; tile: number }

export interface Parallax { update(cam: Phaser.Cameras.Scene2D.Camera): void; destroy(): void }

export interface Weather { update(cam: Phaser.Cameras.Scene2D.Camera, dt: number): void; destroy(): void }

export interface VfxOpts { color: string; color2?: string; flipX?: boolean; scale?: number; width?: number; height?: number; rotation?: number; depth?: number; durationMs?: number }
