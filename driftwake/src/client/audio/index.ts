/**
 * Procedural audio (WebAudio). STUB — the audio module replaces internals but keeps this API.
 */
import type { SfxId, MusicId } from '@shared/types';

export interface Volumes { master: number; music: number; sfx: number; muted: boolean }

let volumes: Volumes = { master: 0.8, music: 0.5, sfx: 0.8, muted: false };

export const audio = {
  /** Call on first user gesture (browsers block audio before that). Safe to call repeatedly. */
  init(): void {},
  playSfx(_id: SfxId, _opts?: { volume?: number; pitch?: number; pan?: number }): void {},
  /** Crossfade to a track (no-op if already playing). */
  playMusic(_id: MusicId): void {},
  stopMusic(): void {},
  setVolumes(v: Partial<Volumes>): void { volumes = { ...volumes, ...v }; },
  getVolumes(): Volumes { return volumes; },
};
