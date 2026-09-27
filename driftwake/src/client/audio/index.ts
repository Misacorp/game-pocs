/**
 * Procedural audio synthesis via WebAudio API.
 * All sounds are synthesized on-the-fly; no external audio files.
 */
import type { SfxId, MusicId } from '@shared/types';
import { initAudioContext, getAudioContext } from './context';
import { synthesizeSfx } from './sfx';
import { playMusicTrack, stopMusicTrack } from './music';

export interface Volumes { master: number; music: number; sfx: number; muted: boolean }

const DEFAULT_VOLUMES: Volumes = { master: 0.8, music: 0.5, sfx: 0.8, muted: false };
const STORAGE_KEY = 'driftwake:volumes';

let volumes: Volumes = loadVolumes();
let pendingMusicTrack: MusicId | null = null;

/**
 * Load volumes from localStorage with fallback to defaults.
 */
function loadVolumes(): Volumes {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_VOLUMES, ...JSON.parse(stored) };
    }
  } catch {
    // Silent fail if localStorage unavailable or corrupted
  }
  return { ...DEFAULT_VOLUMES };
}

/**
 * Save volumes to localStorage.
 */
function saveVolumes(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(volumes));
  } catch {
    // Silent fail if localStorage unavailable
  }
}

/**
 * Apply volumes to gain nodes.
 */
function applyVolumes(): void {
  const { masterGain, musicGain, sfxGain } = getAudioContext();
  if (!masterGain || !musicGain || !sfxGain) return;

  const masterVolume = volumes.muted ? 0 : volumes.master;
  masterGain.gain.value = masterVolume;
  musicGain.gain.value = volumes.music;
  sfxGain.gain.value = volumes.sfx;
}

export const audio = {
  /**
   * Initialize AudioContext on first user gesture.
   * Safe to call repeatedly; will resume suspended contexts.
   * Never throws (wraps in try/catch).
   */
  init(): void {
    try {
      initAudioContext();
      applyVolumes();

      // If music was requested before init, start it now
      if (pendingMusicTrack) {
        const track = pendingMusicTrack;
        pendingMusicTrack = null;
        playMusicTrack(track);
      }
    } catch (err) {
      console.warn('Audio init failed (WebAudio unavailable)', err);
    }
  },

  /**
   * Play a sound effect.
   * Synthesizes the sound on-the-fly based on SfxId.
   * Rate-limited and concurrent-voice-limited to avoid overwhelming the audio context.
   */
  playSfx(id: SfxId, opts?: { volume?: number; pitch?: number; pan?: number }): void {
    try {
      const { ctx } = getAudioContext();
      if (!ctx) {
        console.warn(`Attempted to play SFX '${id}' before audio.init()`);
        return;
      }

      // Apply volume multiplier
      let volumeOpt = opts?.volume ?? 1;
      if (volumes.muted) volumeOpt = 0;
      else volumeOpt *= volumes.sfx;

      synthesizeSfx(id, { ...opts, volume: volumeOpt });
    } catch (err) {
      console.warn(`Error playing SFX '${id}'`, err);
    }
  },

  /**
   * Crossfade to a music track.
   * No-op if the same track is already playing.
   * If called before init(), the track is queued and starts when init() is called.
   */
  playMusic(id: MusicId): void {
    try {
      const { ctx } = getAudioContext();
      if (!ctx) {
        // Queue for later
        pendingMusicTrack = id;
        return;
      }

      if (volumes.muted) return; // Don't start music while muted

      playMusicTrack(id);
    } catch (err) {
      console.warn(`Error playing music '${id}'`, err);
    }
  },

  /**
   * Fade out and stop current music track.
   */
  stopMusic(durationMs?: number): void {
    try {
      stopMusicTrack(durationMs);
      pendingMusicTrack = null;
    } catch (err) {
      console.warn('Error stopping music', err);
    }
  },

  /**
   * Set volume levels and mute state.
   * Persists to localStorage.
   */
  setVolumes(v: Partial<Volumes>): void {
    volumes = { ...volumes, ...v };
    saveVolumes();
    applyVolumes();
  },

  /**
   * Get current volume levels and mute state.
   */
  getVolumes(): Volumes {
    return { ...volumes };
  },
};
