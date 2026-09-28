/**
 * One-time global registration of our custom PostFXPipeline classes with the renderer's Pipeline
 * Manager — required before any camera can reference them by class (see PipelineManager
 * .getPostPipeline: an unregistered class is silently ignored, not an error). Call once, right
 * after the Phaser.Game is constructed. No-ops safely on a Canvas-only renderer.
 */
import Phaser from 'phaser';
import { ThresholdBloomPipeline } from './ThresholdBloomPipeline';
import { GradingPipeline } from './GradingPipeline';
import { DriftwakeLightPipeline, DRIFTWAKE_LIGHT_KEY } from './LightingPipeline';

let registered = false;

export function registerPipelines(game: Phaser.Game): void {
  if (registered) return;
  const renderer = game.renderer;
  if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return;
  registered = true;
  renderer.pipelines.addPostPipeline('ThresholdBloom', ThresholdBloomPipeline);
  renderer.pipelines.addPostPipeline('ColorGrade', GradingPipeline);
  // Tone-mapped stand-in for the stock 'Light2D' pipeline (see LightingPipeline.ts) — a normal
  // (non-PostFX) pipeline, so it needs an instance registered via `add`, not `addPostPipeline`.
  renderer.pipelines.add(DRIFTWAKE_LIGHT_KEY, new DriftwakeLightPipeline(game));
}
