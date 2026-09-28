/**
 * Threshold bloom: Phaser's built-in `postFX.addBloom` has no luminance threshold and blurs the
 * whole frame, which ruins crisp pixel art (confirmed in the lead's spike). This pipeline instead
 * bright-passes each tap of a small fixed kernel (a texel only contributes to the glow sum if
 * *that texel itself* is above `uThreshold`), so dark/crisp pixel-art areas contribute nothing and
 * stay perfectly sharp — only genuinely bright pixels (lights, VFX, glowing eyes/crystals) bloom.
 * Single pass, ~13 taps: cheap enough for High quality at 720p.
 */
import Phaser from 'phaser';

const FRAG = `
#define SHADER_NAME DRIFTWAKE_BLOOM_FS
precision mediump float;
uniform sampler2D uMainSampler;
uniform vec2 resolution;
uniform float uThreshold;
uniform float uIntensity;
varying vec2 outTexCoord;

vec3 brightPass(vec2 uv) {
  vec3 c = texture2D(uMainSampler, uv).rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  // A tight, high knee: DriftwakeLightPipeline (render/pipelines/LightingPipeline.ts) now runs
  // every lit sprite/tile's ambient+lights gain through a soft-knee rolloff before it multiplies
  // the albedo, so a well-lit (but not emissive) pixel should essentially never approach 1.0 raw
  // luminance any more — only genuinely emissive draws (VFX glows/sparks/eyes, which are additively
  // blended on TOP of an already-lit background and so routinely push well past 1.0) should still
  // cross this. The threshold sits high, with a fairly narrow knee just under it, precisely so a
  // stray near-white texture pixel (pale hair, a shell highlight) sitting at the top of its capped
  // lit range doesn't also trip the bloom and read as a glowing hotspot.
  return c * smoothstep(uThreshold, uThreshold + 0.1, l);
}

void main() {
  vec2 texel = 1.0 / max(resolution, vec2(1.0));
  vec3 base = texture2D(uMainSampler, outTexCoord).rgb;
  // 9 taps (down from 13) — still reads as a soft glow at the small radii bloom actually needs,
  // for noticeably less per-pixel cost (this runs full-screen, every frame).
  vec3 sum = brightPass(outTexCoord);
  vec2 offsets4[4];
  offsets4[0] = vec2(1.0, 0.0); offsets4[1] = vec2(-1.0, 0.0);
  offsets4[2] = vec2(0.0, 1.0); offsets4[3] = vec2(0.0, -1.0);
  for (int i = 0; i < 4; i++) sum += brightPass(outTexCoord + offsets4[i] * texel * 2.2);
  vec2 offsets8[4];
  offsets8[0] = vec2(1.0, 1.0); offsets8[1] = vec2(-1.0, 1.0);
  offsets8[2] = vec2(1.0, -1.0); offsets8[3] = vec2(-1.0, -1.0);
  for (int i = 0; i < 4; i++) sum += brightPass(outTexCoord + offsets8[i] * texel * 2.6);
  sum /= 9.0;
  gl_FragColor = vec4(base + sum * uIntensity, 1.0);
}
`;

export class ThresholdBloomPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  threshold = 0.95;
  intensity = 0.75;

  constructor(game: Phaser.Game) {
    super({ game, fragShader: FRAG });
  }

  override onPreRender(): void {
    this.set1f('uThreshold', this.threshold);
    this.set1f('uIntensity', this.intensity);
  }

  override onDraw(target: Phaser.Renderer.WebGL.RenderTarget): void {
    this.set2f('resolution', target.width, target.height);
    this.bindAndDraw(target);
  }
}
