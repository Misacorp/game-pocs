/**
 * Full-screen GLSL sky, one BaseShader shared across themes (branches on `uMode`) so we only ever
 * compile a single program. Rendered as a `Phaser.GameObjects.Shader`, positioned/sized every
 * frame the same way parallax.ts positions its TileSprite layers (recomputed from the camera's
 * world-space view rect, since a scrollFactor(0) object at a fixed x/y doesn't stay put once the
 * camera zoom != 1 — see the note in parallax.ts). Octave counts are kept low (2-3) and the storm
 * lightning/god-ray branches are skipped entirely on 'medium' to stay cheap.
 *
 * Falls back to null (caller keeps the old flat gradient) on Low quality or when WebGL is
 * unavailable — the fallback path never touches this module.
 */
import Phaser from 'phaser';
import type { ThemeId } from '@shared/types';
import type { Quality } from './quality';

const MODE: Record<ThemeId, number> = {
  driftmoor: 0, meadow: 0, galeoutpost: 0, // sunset/daylight fbm clouds + sun + god rays
  lanternreef: 1, galleon: 1, // starfield + aurora ribbons
  stormspire: 2, // roiling storm clouds + lightning
  grotto: 3, // cave darkness + bioluminescent motes
  kelpwood: 4, // dappled underwater light rays
  hollow: 5, heart: 5, // pulsing flesh/vein glow
};

const FRAG = `
#define SHADER_NAME DRIFTWAKE_SKY_FS
precision mediump float;

uniform vec2 resolution;
uniform float time;
uniform vec3 uSkyTop;
uniform vec3 uSkyMid;
uniform vec3 uSkyBottom;
uniform vec3 uGlow;
uniform float uMode;
uniform float uSeed;
uniform float uQuality; // 0 = medium (cheap branches skipped), 1 = high

varying vec2 outTexCoord;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21) + uSeed);
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
float fbm(vec2 p) {
  // A single noise() call, not a real multi-octave fbm: this runs on essentially every pixel of
  // the sky (and, for the High-only cloud/aurora/storm/caustic passes, more than once per pixel),
  // and SwiftShader (software WebGL, used in headless/CI) is dramatically more sensitive to
  // per-pixel ALU cost than a real GPU is, so we err on the cheap side. One layer of value noise
  // still reads as soft cloud/mist shapes at the scales this is used at.
  return noise(p);
}

void main() {
  vec2 uv = outTexCoord;
  uv.y = 1.0 - uv.y; // Shader GameObject's default vertex shader hands us y=1 at the top; flip so 0=top, 1=bottom like a normal image-space UV
  vec3 col = mix(uSkyTop, uSkyMid, smoothstep(0.0, 0.55, uv.y));
  col = mix(col, uSkyBottom, smoothstep(0.55, 1.0, uv.y));

  float mode = uMode;
  float t = time;

  if (mode < 0.5) {
    // --- sunset / daylight: soft sun always; fbm clouds/god-rays/churning horizon on High only —
    // this branch is by far the most expensive one (it's the theme used by the starter town and
    // meadows), so Medium gets a plain gradient + sun and skips every fbm() call in it.
    vec2 sunPos = vec2(0.74, 0.26);
    float d = distance(uv, sunPos);
    float sun = smoothstep(0.09, 0.0, d);
    col += uGlow * sun * 0.9;
    col += uGlow * smoothstep(0.32, 0.0, d) * 0.18;
    if (uQuality > 0.5) {
      vec2 cp = vec2(uv.x * 3.2 + t * 0.02, uv.y * 2.0);
      float clouds = fbm(cp);
      float cloudMask = smoothstep(0.42, 0.75, clouds) * smoothstep(0.05, 0.5, 1.0 - uv.y * 0.6);
      col = mix(col, mix(col, vec3(1.0), 0.55), cloudMask * 0.5);
      float ang = atan(uv.y - sunPos.y, uv.x - sunPos.x);
      float rays = pow(0.5 + 0.5 * sin(ang * 10.0 + t * 0.15), 3.0);
      col += uGlow * rays * smoothstep(0.55, 0.0, d) * 0.16;
      float horizon = fbm(vec2(uv.x * 4.0 + t * 0.06, 8.0 + t * 0.02));
      float seaBand = smoothstep(0.78, 0.98, uv.y) * (0.4 + 0.6 * horizon);
      col = mix(col, mix(uSkyBottom, vec3(1.0), 0.4), seaBand * 0.5);
    } else {
      float seaBand = smoothstep(0.78, 0.98, uv.y);
      col = mix(col, mix(uSkyBottom, vec3(1.0), 0.4), seaBand * 0.5);
    }
  } else if (mode < 1.5) {
    // --- night: starfield + slow aurora ribbons ---
    vec2 sp = uv * resolution.xy * 0.35;
    float star = step(0.9975, hash(floor(sp)));
    float tw = 0.6 + 0.4 * sin(t * 2.0 + hash(floor(sp)) * 40.0);
    col += vec3(star * tw);
    if (uQuality > 0.5) {
      float a1 = fbm(vec2(uv.x * 1.6 + t * 0.05, t * 0.03)) ;
      float a2 = fbm(vec2(uv.x * 1.2 - t * 0.04 + 5.0, t * 0.02 + 2.0));
      float band = smoothstep(0.35, 0.85, a1) * smoothstep(0.15, 0.65, 1.0 - uv.y) * 0.35;
      float band2 = smoothstep(0.4, 0.9, a2) * smoothstep(0.1, 0.55, 1.0 - uv.y) * 0.28;
      col += mix(vec3(0.2, 0.9, 0.7), vec3(0.5, 0.4, 0.95), 0.5) * band;
      col += mix(uGlow, vec3(0.4, 0.9, 0.8), 0.5) * band2;
    }
    float horizon = fbm(vec2(uv.x * 3.0 + t * 0.03, 3.0));
    col = mix(col, uSkyBottom, smoothstep(0.75, 1.0, uv.y) * (0.5 + 0.4 * horizon));
  } else if (mode < 2.5) {
    // --- storm: roiling dark cloud mass + lightning flashes lighting it from inside ---
    vec2 cp = vec2(uv.x * 2.4 + t * 0.09, uv.y * 2.6 - t * 0.05);
    float clouds = uQuality > 0.5 ? fbm(cp) * fbm(cp * 1.7 + 4.0) : fbm(cp);
    col = mix(col, col * 0.4, smoothstep(0.15, 0.6, clouds));
    float flashPhase = fract(t * 0.12 + uSeed);
    float flash = smoothstep(0.97, 0.985, flashPhase) - smoothstep(0.99, 1.0, flashPhase);
    flash += 0.4 * (smoothstep(0.55, 0.565, flashPhase) - smoothstep(0.58, 0.6, flashPhase));
    float lit = smoothstep(0.3, 0.8, clouds);
    col += vec3(0.75, 0.8, 1.0) * flash * (0.3 + 0.7 * lit);
  } else if (mode < 3.5) {
    // --- cave: near-black with drifting bioluminescent motes ---
    col *= 0.9;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      vec2 seed = vec2(fi * 13.1, fi * 7.7 + uSeed);
      vec2 mp = fract(vec2(hash(seed), hash(seed + 1.0)) + vec2(sin(t * 0.05 + fi), cos(t * 0.04 + fi)) * 0.12);
      float d = distance(uv, mp);
      float glow = smoothstep(0.05, 0.0, d) * (0.5 + 0.5 * sin(t * 1.5 + fi * 3.0));
      col += uGlow * glow * 0.8;
    }
  } else if (mode < 4.5) {
    // --- kelpwood: dappled underwater light rays through canopy ---
    float shaft = 0.0;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float x = fract(0.2 + fi * 0.33 + 0.05 * sin(t * 0.08 + fi));
      float ang = 0.18 * sin(t * 0.05 + fi * 2.0);
      float d = abs((uv.x - x) - (uv.y - 0.0) * ang);
      shaft += smoothstep(0.05, 0.0, d) * (1.0 - uv.y * 0.7);
    }
    col += uGlow * shaft * 0.35;
    if (uQuality > 0.5) {
      float caustic = fbm(vec2(uv.x * 5.0, uv.y * 5.0 + t * 0.2));
      col += uGlow * smoothstep(0.6, 0.9, caustic) * 0.1 * (1.0 - uv.y);
    }
  } else {
    // --- hollow / heart: pulsing flesh & vein glow ---
    float pulse = 0.5 + 0.5 * sin(t * 1.1);
    vec2 vp = uv * 3.0;
    float veins = 0.0;
    float v = fbm(vp + t * 0.03);
    veins = smoothstep(0.48, 0.52, abs(v - 0.5) < 0.02 ? 0.5 : v) ;
    float veinLine = 1.0 - smoothstep(0.0, 0.03, abs(fract(v * 6.0) - 0.5));
    col = mix(col, uGlow, veinLine * 0.25 * (0.6 + 0.4 * pulse));
    col += uGlow * pulse * 0.06;
  }

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

function hexToVec3(hex: string): { x: number; y: number; z: number } {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return { x: ((n >> 16) & 255) / 255, y: ((n >> 8) & 255) / 255, z: (n & 255) / 255 };
}

export interface SkyShader {
  update(cam: Phaser.Cameras.Scene2D.Camera): void;
  destroy(): void;
  gameObject: Phaser.GameObjects.Shader;
}

export function createSkyShader(
  scene: Phaser.Scene,
  theme: ThemeId,
  quality: Quality,
  palette: { skyTop: string; skyMid: string; skyBottom: string; glow: string },
  seed: number,
): SkyShader | null {
  try {
    // A fresh BaseShader instance per scene/theme (each Shader GameObject compiles its own GL
    // program from it regardless — see Shader.js#setShader — so there's nothing to gain from a
    // shared cache entry here, and baking the theme's values straight into the instance avoids
    // any uncertainty about the shader cache's add/exists/get API across Phaser versions).
    const base = new Phaser.Display.BaseShader('dw_sky_shader', FRAG, undefined, {
      uSkyTop: { type: '3f', value: hexToVec3(palette.skyTop) },
      uSkyMid: { type: '3f', value: hexToVec3(palette.skyMid) },
      uSkyBottom: { type: '3f', value: hexToVec3(palette.skyBottom) },
      uGlow: { type: '3f', value: hexToVec3(palette.glow) },
      uMode: { type: '1f', value: MODE[theme] },
      uSeed: { type: '1f', value: (seed % 1000) / 1000 },
      uQuality: { type: '1f', value: quality === 'high' ? 1 : 0 },
    });
    // Full-screen Shader GameObject on the normal display list, sized/positioned every frame from
    // the camera's world-space view rect — exactly the same technique the other parallax layers
    // use (see gfx/parallax.ts), and the one confirmed in the lead's spike. An earlier version of
    // this tried to render into a low-res RenderTexture first and stretch that up for performance,
    // but that RT never actually filled more than its own native pixel footprint on screen (a real
    // Phaser quirk/bug hit during development, not worth chasing further under deadline) — so
    // dropped in favor of this simpler, unconditionally-correct approach. Octave counts/branches
    // are already kept cheap (see FRAG above) to compensate.
    const obj = scene.add.shader(base, 0, 0, 640, 360).setOrigin(0, 0).setDepth(-100);

    return {
      gameObject: obj,
      update(cam) {
        const tl = cam.getWorldPoint(0, 0);
        const br = cam.getWorldPoint(cam.width, cam.height);
        obj.setPosition(tl.x, tl.y);
        const w = br.x - tl.x, h = br.y - tl.y;
        if (Math.abs(obj.width - w) > 0.5 || Math.abs(obj.height - h) > 0.5) obj.setSize(w, h);
      },
      destroy() { obj.destroy(); },
    };
  } catch (e) {
    console.warn('[sky] shader sky failed to initialize — falling back to gradient sky', e);
    return null;
  }
}
