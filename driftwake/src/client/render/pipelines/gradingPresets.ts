/**
 * Per-theme color grading presets for GradingPipeline: lift/gamma/gain (as in a standard
 * lift-gamma-gain color wheel), saturation, a two-tone shadow/highlight split-tone, and a little
 * film grain. Deliberately separate from gfx/palette.ts (owned by the sprite artist).
 */
import type { ThemeId } from '@shared/types';

export interface GradingPreset {
  lift: [number, number, number];
  gamma: [number, number, number];
  gain: [number, number, number];
  saturation: number;
  shadowTint: [number, number, number];
  highlightTint: [number, number, number];
  splitAmount: number;
  grain: number;
  /** Enables the screen-space heat-shimmer UV wobble (heart chamber only). */
  heat?: boolean;
}

const FLAT: [number, number, number] = [0, 0, 0];
const ONE: [number, number, number] = [1, 1, 1];

export const GRADING: Record<ThemeId, GradingPreset> = {
  driftmoor: { // golden-hour harbor town
    lift: [0.02, 0.0, -0.01], gamma: [1.0, 0.98, 0.95], gain: [1.08, 1.0, 0.9],
    saturation: 1.12, shadowTint: [0.85, 0.9, 1.05], highlightTint: [1.12, 1.0, 0.8], splitAmount: 0.3, grain: 0.02,
  },
  meadow: {
    lift: FLAT, gamma: ONE, gain: [1.02, 1.03, 0.98],
    saturation: 1.05, shadowTint: [0.92, 0.96, 1.02], highlightTint: [1.04, 1.02, 0.92], splitAmount: 0.15, grain: 0.012,
  },
  grotto: { // desaturated, cool, murky
    lift: [-0.01, 0.01, 0.02], gamma: [1.05, 1.05, 1.0], gain: [0.85, 0.95, 0.95],
    saturation: 0.8, shadowTint: [0.85, 1.0, 1.0], highlightTint: [0.9, 1.05, 1.0], splitAmount: 0.2, grain: 0.03,
  },
  kelpwood: { // push toward teal-green
    lift: [-0.01, 0.01, 0.0], gamma: ONE, gain: [0.92, 1.08, 0.98],
    saturation: 1.12, shadowTint: [0.8, 1.05, 0.95], highlightTint: [0.95, 1.1, 0.85], splitAmount: 0.22, grain: 0.015,
  },
  galeoutpost: { // crisp, cool daylight
    lift: [0.0, 0.0, 0.01], gamma: ONE, gain: [0.98, 1.0, 1.04],
    saturation: 1.0, shadowTint: [0.92, 0.96, 1.05], highlightTint: [1.0, 1.0, 1.02], splitAmount: 0.1, grain: 0.012,
  },
  stormspire: { // desaturated, cold, heavy grain
    lift: [0.0, 0.0, 0.02], gamma: [1.05, 1.05, 1.08], gain: [0.82, 0.85, 0.92],
    saturation: 0.62, shadowTint: [0.85, 0.88, 1.0], highlightTint: [0.9, 0.92, 1.05], splitAmount: 0.25, grain: 0.045,
  },
  lanternreef: { // teal shadows / magenta highlights
    lift: [-0.02, 0.0, 0.02], gamma: ONE, gain: [0.95, 1.0, 1.1],
    saturation: 1.18, shadowTint: [0.75, 1.05, 1.05], highlightTint: [1.1, 0.85, 1.1], splitAmount: 0.35, grain: 0.02,
  },
  galleon: { // dark, eerie, desaturated teal-green
    lift: [-0.02, 0.0, -0.01], gamma: [1.08, 1.05, 1.08], gain: [0.8, 0.92, 0.85],
    saturation: 0.75, shadowTint: [0.85, 1.0, 0.95], highlightTint: [0.9, 1.05, 0.95], splitAmount: 0.22, grain: 0.035,
  },
  hollow: { // sickly violet
    lift: [0.02, -0.01, 0.02], gamma: ONE, gain: [0.95, 0.85, 1.05],
    saturation: 0.88, shadowTint: [0.95, 0.85, 1.05], highlightTint: [1.05, 0.85, 1.1], splitAmount: 0.3, grain: 0.03,
  },
  heart: { // intense red, heat shimmer
    lift: [0.04, -0.02, -0.02], gamma: [0.98, 1.02, 1.05], gain: [1.15, 0.85, 0.82],
    saturation: 1.25, shadowTint: [1.05, 0.8, 0.85], highlightTint: [1.15, 0.75, 0.7], splitAmount: 0.32, grain: 0.025, heat: true,
  },
};
