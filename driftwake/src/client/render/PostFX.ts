/**
 * Wires the postFX chain onto a camera for the current theme/quality: threshold bloom (High
 * only) -> color grade (Medium+) -> Phaser's built-in vignette (Medium+, confirmed working in the
 * lead's spike) -> a touch of film grain is folded into the grade pass itself. Low = no postFX at
 * all. Returns a handle used to trigger runtime juice (chromatic-aberration pulses) and to step
 * the CA decay each frame; always call `clear()` before re-applying on a scene restart, since
 * postFX pipelines otherwise accumulate on the camera across `scene.restart()` calls.
 */
import Phaser from 'phaser';
import type { ThemeId } from '@shared/types';
import type { Quality } from './quality';
import { isWebGLAvailable } from './quality';
import { ThresholdBloomPipeline } from './pipelines/ThresholdBloomPipeline';
import { GradingPipeline } from './pipelines/GradingPipeline';
import { GRADING } from './pipelines/gradingPresets';

export interface PostFXHandle {
  pulseChromatic(amount?: number, decayMs?: number): void;
  step(dtMs: number): void;
  clear(): void;
}

const NOOP: PostFXHandle = { pulseChromatic() {}, step() {}, clear() {} };

export function setupPostFX(scene: Phaser.Scene, theme: ThemeId, quality: Quality): PostFXHandle {
  const cam = scene.cameras.main;
  // Always clear first: scene.restart() reuses the same Camera instance, so any pipelines from a
  // previous create() (a prior map, or a prior quality tier) would otherwise pile up.
  try { cam.resetPostPipeline(true); } catch { /* no post pipelines yet */ }
  try { cam.postFX?.clear(); } catch { /* ignore */ }

  if (quality === 'low' || !isWebGLAvailable(scene)) return NOOP;

  let grading: GradingPipeline | undefined;
  try {
    if (quality === 'high') {
      cam.setPostPipeline(ThresholdBloomPipeline);
    }
    cam.setPostPipeline(GradingPipeline);
    const inst = cam.getPostPipeline(GradingPipeline) as GradingPipeline | GradingPipeline[] | undefined;
    grading = Array.isArray(inst) ? inst[inst.length - 1] : inst;
    grading?.applyPreset(GRADING[theme]);
    cam.postFX.addVignette(0.5, 0.5, 0.72, 0.35);
  } catch (e) {
    console.warn('[postfx] failed to set up postFX chain — continuing without it', e);
    return NOOP;
  }

  return {
    pulseChromatic(amount = 0.006, decayMs = 260) { grading?.pulseChromatic(amount, decayMs); },
    step(dtMs) { grading?.step(dtMs); },
    clear() {
      try { cam.resetPostPipeline(true); } catch { /* ignore */ }
      try { cam.postFX?.clear(); } catch { /* ignore */ }
    },
  };
}
