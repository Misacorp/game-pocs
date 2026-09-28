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
  return c * smoothstep(uThreshold, uThreshold + 0.25, l);
}

void main() {
  vec2 texel = 1.0 / max(resolution, vec2(1.0));
  vec3 base = texture2D(uMainSampler, outTexCoord).rgb;
  vec3 sum = brightPass(outTexCoord);
  vec2 offsets4[4];
  offsets4[0] = vec2(1.0, 0.0); offsets4[1] = vec2(-1.0, 0.0);
  offsets4[2] = vec2(0.0, 1.0); offsets4[3] = vec2(0.0, -1.0);
  for (int i = 0; i < 4; i++) sum += brightPass(outTexCoord + offsets4[i] * texel * 2.0);
  vec2 offsets8[4];
  offsets8[0] = vec2(1.0, 1.0); offsets8[1] = vec2(-1.0, 1.0);
  offsets8[2] = vec2(1.0, -1.0); offsets8[3] = vec2(-1.0, -1.0);
  for (int i = 0; i < 4; i++) sum += brightPass(outTexCoord + offsets8[i] * texel * 2.4);
  vec2 offsetsFar[4];
  offsetsFar[0] = vec2(3.2, 0.0); offsetsFar[1] = vec2(-3.2, 0.0);
  offsetsFar[2] = vec2(0.0, 3.2); offsetsFar[3] = vec2(0.0, -3.2);
  for (int i = 0; i < 4; i++) sum += brightPass(outTexCoord + offsetsFar[i] * texel * 2.4);
  sum /= 13.0;
  gl_FragColor = vec4(base + sum * uIntensity, 1.0);
}
`;

export class ThresholdBloomPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  threshold = 0.75;
  intensity = 0.9;

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
