/**
 * One combined post pass: lift/gamma/gain color grade, saturation, a shadow/highlight split-tone,
 * film grain, a short chromatic-aberration pulse (heavy hits / boss slams — decays on its own once
 * triggered), and a screen-space heat-shimmer UV wobble (heart chamber only). Kept as a single
 * pipeline rather than several stacked ones to minimize the number of full-frame passes.
 */
import Phaser from 'phaser';
import type { GradingPreset } from './gradingPresets';

const FRAG = `
#define SHADER_NAME DRIFTWAKE_GRADE_FS
precision mediump float;
uniform sampler2D uMainSampler;
uniform vec2 resolution;
uniform float time;
uniform vec3 uLift;
uniform vec3 uGamma;
uniform vec3 uGain;
uniform float uSaturation;
uniform vec3 uShadowTint;
uniform vec3 uHighlightTint;
uniform float uSplitAmount;
uniform float uGrain;
uniform float uCaAmount;
uniform float uHeat;
varying vec2 outTexCoord;

float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }

vec3 gradeLGG(vec3 c) {
  c = c * uGain + uLift * (1.0 - c);
  c = pow(clamp(c, 0.0, 4.0), 1.0 / max(uGamma, vec3(0.05)));
  return c;
}

void main() {
  vec2 uv = outTexCoord;
  if (uHeat > 0.5) {
    float w = sin(uv.y * 40.0 + time * 3.0) * 0.0028 + sin(uv.y * 13.0 - time * 1.7) * 0.0018;
    uv.x += w;
  }
  vec3 col;
  if (uCaAmount > 0.0008) {
    vec2 dir = (uv - 0.5) * uCaAmount;
    col.r = texture2D(uMainSampler, uv - dir).r;
    col.g = texture2D(uMainSampler, uv).g;
    col.b = texture2D(uMainSampler, uv + dir).b;
  } else {
    col = texture2D(uMainSampler, uv).rgb;
  }
  col = gradeLGG(col);
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, uSaturation);
  col = mix(col, col * uShadowTint, (1.0 - clamp(lum, 0.0, 1.0)) * uSplitAmount);
  col = mix(col, col * uHighlightTint, clamp(lum, 0.0, 1.0) * uSplitAmount);
  if (uGrain > 0.0005) {
    float g = (rand(uv * resolution + time * 61.0) - 0.5) * uGrain;
    col += g;
  }
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

export class GradingPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  lift: [number, number, number] = [0, 0, 0];
  gamma: [number, number, number] = [1, 1, 1];
  gain: [number, number, number] = [1, 1, 1];
  saturation = 1;
  shadowTint: [number, number, number] = [1, 1, 1];
  highlightTint: [number, number, number] = [1, 1, 1];
  splitAmount = 0;
  grain = 0;
  heat = false;

  private caAmount = 0;
  private caDecayPerMs = 0;

  constructor(game: Phaser.Game) {
    super({ game, fragShader: FRAG });
  }

  applyPreset(p: GradingPreset): void {
    this.lift = p.lift; this.gamma = p.gamma; this.gain = p.gain;
    this.saturation = p.saturation; this.shadowTint = p.shadowTint; this.highlightTint = p.highlightTint;
    this.splitAmount = p.splitAmount; this.grain = p.grain; this.heat = !!p.heat;
  }

  /** Trigger a short chromatic-aberration kick (heavy hit / boss slam); decays back to 0 over ~decayMs. */
  pulseChromatic(amount = 0.006, decayMs = 260): void {
    this.caAmount = Math.max(this.caAmount, amount);
    this.caDecayPerMs = this.caAmount / Math.max(1, decayMs);
  }

  /** Called once per game step (WorldScene.update) — decays the CA pulse independent of render calls. */
  step(dtMs: number): void {
    if (this.caAmount <= 0) return;
    this.caAmount = Math.max(0, this.caAmount - this.caDecayPerMs * dtMs);
  }

  override onPreRender(): void {
    this.set1f('time', this.game.loop.getDuration());
    this.set3f('uLift', ...this.lift);
    this.set3f('uGamma', ...this.gamma);
    this.set3f('uGain', ...this.gain);
    this.set1f('uSaturation', this.saturation);
    this.set3f('uShadowTint', ...this.shadowTint);
    this.set3f('uHighlightTint', ...this.highlightTint);
    this.set1f('uSplitAmount', this.splitAmount);
    this.set1f('uGrain', this.grain);
    this.set1f('uCaAmount', this.caAmount);
    this.set1f('uHeat', this.heat ? 1 : 0);
  }

  override onDraw(target: Phaser.Renderer.WebGL.RenderTarget): void {
    this.set2f('resolution', target.width, target.height);
    this.bindAndDraw(target);
  }
}
