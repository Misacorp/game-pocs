/**
 * Tone-mapped replacement for Phaser's stock 'Light2D' pipeline.
 *
 * ROOT CAUSE (see playtest feedback + render/lighting.ts's AMBIENT/LIGHT_SCALE tables): the stock
 * Light.frag just does `finalColor = ambient + sum(attenuation * diffuse * intensity)` and then
 * `outColor = albedo * finalColor` with no ceiling anywhere in that chain. The moment a pixel's
 * ambient + light sum exceeds 1.0 (trivial once a personal fill light's *peak* sits on/near its
 * own owner, or when a hit-flash/level-up light lands on top of an already-lit character), every
 * channel gets multiplied past 1.0 and the 8-bit backbuffer just clips it to flat white — there is
 * no HDR intermediate to recover from, so the sprite (skin, armor, hair, all of it, not just the
 * genuinely bright bits) reads as a burnt-out white blob. Bright-but-not-emissive pixels that clip
 * this way (pale hair, a snail's pale shell) then *also* cross ThresholdBloomPipeline's brightness
 * threshold, compounding the problem with an unwanted glow.
 *
 * FIX: same diffuse-lighting math (normal map + per-light attenuation), but the combined
 * ambient+lights gain is run through a soft-knee highlight rolloff before it ever multiplies the
 * albedo: identity below `kLowerKnee` (so normal ambient/shadow readability is untouched — see (d)
 * in the task), then an exponential shoulder that eases toward (but can never reach or exceed)
 * `kCap` as the raw sum grows arbitrarily large — continuous in value *and* slope at the knee, so
 * there's no visible seam where the rolloff kicks in. The curve is applied to the gain vector's
 * *luminance* and then uniformly rescales all three channels by the resulting ratio, so hue is
 * preserved (a warm player light mixing with a cool cave ambient still reads as that same warm/cool
 * mix, just without the stacked total ever blowing out).
 *
 * This does NOT eliminate every possible fully-saturated pixel — a texture that authors a literal
 * pure #ffffff highlight (e.g. a pearl/shell-shine dab) will still read at or near full brightness
 * under any reasonably-lit ambient, same as it would under any realistic lighting model. What it
 * fixes is the *systemic* one (skin/armor/mid-tones stacking past 1.0 and clipping to white), which
 * was the actual "everything looks burnt out" complaint.
 *
 * Registered under its own key (see registerPipelines.ts) rather than overriding Phaser's built-in
 * 'Light2D' — PipelineManager.add() warns and no-ops on a name collision, and keeping the stock
 * pipeline present-but-unused is a free escape hatch if this one ever needs to be bypassed.
 * Everything else (uniform wiring, batching, normal-map binding) is inherited unchanged from
 * Phaser's LightPipeline — only the fragment shader text differs.
 */
import Phaser from 'phaser';

export const DRIFTWAKE_LIGHT_KEY = 'DriftwakeLight';

/** Below this raw ambient+lights sum, output is untouched (identity) — keeps dim/shadowed areas
 *  exactly as authored. Above it, the exponential shoulder eases toward `kCap` and can never
 *  exceed it, however many overlapping lights stack on the same pixel. */
const FRAG = `
#define SHADER_NAME DRIFTWAKE_LIGHT_FS
precision mediump float;

struct Light
{
    vec2 position;
    vec3 color;
    float intensity;
    float radius;
};

const int kMaxLights = %LIGHT_COUNT%;
const float kLowerKnee = 0.85;
const float kCap = 1.35;

uniform vec4 uCamera; /* x, y, rotation, zoom */
uniform vec2 uResolution;
uniform sampler2D uMainSampler;
uniform sampler2D uNormSampler;
uniform vec3 uAmbientLightColor;
uniform Light uLights[kMaxLights];
uniform mat3 uInverseRotationMatrix;
uniform int uLightCount;

varying vec2 outTexCoord;
varying float outTexId;
varying float outTintEffect;
varying vec4 outTint;

float softCap(float x, float lowerKnee, float cap)
{
    if (x <= lowerKnee) { return x; }
    float kneeWidth = max(0.001, cap - lowerKnee);
    float excess = x - lowerKnee;
    return lowerKnee + kneeWidth * (1.0 - exp(-excess / kneeWidth));
}

void main ()
{
    vec4 texel = vec4(outTint.bgr * outTint.a, outTint.a);
    vec4 texture = texture2D(uMainSampler, outTexCoord);
    vec4 color = texture * texel;

    if (outTintEffect == 1.0)
    {
        color.rgb = mix(texture.rgb, outTint.bgr * outTint.a, texture.a);
    }
    else if (outTintEffect == 2.0)
    {
        color = texel;
    }

    vec3 normalMap = texture2D(uNormSampler, outTexCoord).rgb;
    vec3 normal = normalize(uInverseRotationMatrix * vec3(normalMap * 2.0 - 1.0));
    vec2 res = vec2(min(uResolution.x, uResolution.y)) * uCamera.w;

    vec3 gain = uAmbientLightColor;

    for (int index = 0; index < kMaxLights; ++index)
    {
        if (index < uLightCount)
        {
            Light light = uLights[index];
            vec3 lightDir = vec3((light.position.xy / res) - (gl_FragCoord.xy / res), 0.1);
            vec3 lightNormal = normalize(lightDir);
            float distToSurf = length(lightDir) * uCamera.w;
            float diffuseFactor = max(dot(normal, lightNormal), 0.0);
            float radius = (light.radius / res.x * uCamera.w) * uCamera.w;
            float attenuation = clamp(1.0 - distToSurf * distToSurf / (radius * radius), 0.0, 1.0);
            gain += (attenuation * diffuseFactor) * light.color * light.intensity;
        }
    }

    // Hue-preserving highlight rolloff: tone-map the gain vector's luminance, then rescale all
    // three channels by the same factor so the mix of light colors is preserved, just capped.
    float lum = max(dot(gain, vec3(0.299, 0.587, 0.114)), 1e-4);
    float mappedLum = softCap(lum, kLowerKnee, kCap);
    gain *= (mappedLum / lum);

    vec4 colorOutput = vec4(gain, 1.0);

    gl_FragColor = color * vec4(colorOutput.rgb * colorOutput.a, colorOutput.a);
}
`;

/**
 * A near-drop-in subclass of Phaser's LightPipeline: only the fragment shader source differs
 * (see FRAG above), so all the JS-side plumbing (uniform wiring per-light in onRender, normal map
 * binding, batching) is inherited unchanged.
 */
export class DriftwakeLightPipeline extends Phaser.Renderer.WebGL.Pipelines.LightPipeline {
  constructor(game: Phaser.Game) {
    super({ game, fragShader: FRAG });
  }
}
