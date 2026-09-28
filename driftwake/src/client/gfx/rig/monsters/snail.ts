/**
 * SNAIL base (Shellsnail): a spiral shell rider on a soft gliding foot, with a pair of eye
 * stalks that sway and lag behind each other. `pal.primary` = shell, `pal.secondary` = foot/body,
 * `pal.accent` = spiral/rim tint (falls back to a shaded primary). Facing +x: the head and eye
 * stalks lead at the front, the shell trails behind and above.
 */
import { registerMonsterBase } from '../monsters';
import {
  shape, fill, stroke, path, local, glint, shade, lightOf,
  critterEye, critterBlush, clamp, lerp, easeInOut, TAU, type Pt, type PathFn,
} from '../pen';

const FOOT_W = 22, FOOT_TOP = -19;
const SHELL_R = 14.5, SHELL_X = -6, SHELL_Y = -30;

/** Soft gliding foot. `ripple` (0..1) is the phase of a peristaltic wave along the underside. */
function footPath(ripple: number): PathFn {
  const wave = (x: number, amp: number) => Math.sin(x * 0.17 - ripple * TAU) * amp;
  const pts: Pt[] = [
    [20, -6 + wave(20, 1)],
    [16, -16],
    [-2, FOOT_TOP],
    [-19, -13.5],
    [-23, -4 + wave(-23, 1.2)],
    [-13, 1.5 + wave(-13, 1.6)],
    [3, 2.2 + wave(3, 1.8)],
    [15, 0.4 + wave(15, 1.4)],
  ];
  return path.blob(pts, 0.45);
}

/** Logarithmic-ish spiral polyline for the shell's engraved groove. */
function spiralPath(turns: number, r0: number): PathFn {
  return (g) => {
    const steps = Math.round(26 * turns);
    for (let k = 0; k <= steps; k++) {
      const a = (k / steps) * TAU * turns + 0.6;
      const rr = r0 * (1 - (k / steps) * 0.82);
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.86;
      if (k === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
  };
}

registerMonsterBase('snail', {
  frame: { worldW: 34, worldH: 26 },
  draw(g, pal, variant, clip, t, i) {
    const eye = pal.eye ?? '#241a14';
    const rim = pal.accent ?? lightOf(pal.primary, 0.3);

    let dx = 0, dy = 0, shellDx = 0, rot = 0, ripple = 0, stalkLen = 15, sy = 1, sx = 1;
    let eyeState: 'open' | 'closed' | 'wide' | 'squeeze' | 'x' = 'open';
    let hideHead = false, fade = 1;
    const ph = t * TAU;

    switch (clip) {
      case 'idle': {
        ripple = t * 0.15;
        if (i === 5) eyeState = 'closed';
        break;
      }
      case 'move': {
        ripple = t;
        dy = -Math.abs(Math.sin(ph)) * 1.4;
        break;
      }
      case 'attack': {
        const keys = [
          { dx: -3, shell: -1, len: 15, sy: 1.04 },
          { dx: -5, shell: -2, len: 7, sy: 0.94 },
          { dx: 5, shell: 4, len: 4, sy: 0.96 },
          { dx: 13, shell: 10, len: 2, sy: 0.8 },
          { dx: 8, shell: 5, len: 5, sy: 0.9 },
          { dx: 0, shell: 0, len: 15, sy: 1 },
        ];
        const k = keys[Math.min(i, keys.length - 1)];
        dx = k.dx; shellDx = k.shell; stalkLen = k.len; sy = k.sy; sx = 1 / sy;
        eyeState = i >= 2 && i <= 3 ? 'wide' : 'open';
        break;
      }
      case 'hurt': {
        stalkLen = 2.5; hideHead = i === 0;
        sy = 0.72; sx = 1.14;
        eyeState = 'squeeze';
        dx = -2;
        break;
      }
      case 'die': {
        // retreat into the shell (stalks pull in, foot pulls flat and low) with a slight
        // topple, then fade — reads as "give up and hide" rather than a full flip.
        const k = i / 4;
        rot = easeInOut(clamp(k * 1.1, 0, 1)) * 0.42;
        stalkLen = lerp(15, 0, clamp(k * 2.2, 0, 1));
        sy = lerp(1, 0.5, k); sx = lerp(1, 1.2, k);
        dy = k * 2;
        eyeState = 'x';
        fade = k < 0.55 ? 1 : 1 - (k - 0.55) * (1 / 0.45);
        break;
      }
      default: break;
    }

    g.save();
    g.globalAlpha *= fade;
    g.translate(0, -4);
    g.rotate(rot);
    g.translate(0, 4);
    g.translate(dx, dy);
    g.scale(sx, sy);

    // foot (drawn first so the shell overlaps its back)
    shape(g, footPath(ripple), pal.secondary, { depth: 2.6 });
    fill(g, path.ellipse(2, -3, FOOT_W * 0.55, 3.4), shade(pal.secondary, 0.12), 0.3);

    // head + eye stalks (front of the foot); hidden while retracted for 'hurt'
    if (!hideHead) {
      const headX = 15, headY = -13;
      fill(g, path.ellipse(headX, headY + 2, 5.4, 4.2), pal.secondary, 1);
      const stalk = (base: Pt, baseAng: number, sway: number, w0: number, w1: number) => {
        const a = baseAng + sway;
        const tip: Pt = [base[0] + Math.sin(a) * stalkLen, base[1] - Math.cos(a) * stalkLen];
        shape(g, path.capsule(base[0], base[1], w0, tip[0], tip[1], w1), pal.secondary, { depth: 1.4 });
        return tip;
      };
      const swayA = Math.sin(ph + (clip === 'move' ? 0.5 : 0)) * (clip === 'idle' || clip === 'move' ? 0.16 : 0.04);
      const swayB = Math.sin(ph - 0.9 + (clip === 'move' ? 0.5 : 0)) * (clip === 'idle' || clip === 'move' ? 0.16 : 0.04);
      const tipA = stalk([headX + 1, headY - 1], 0.42, swayA, 2.1, 1.15);
      const tipB = stalk([headX - 5, headY - 2], 0.52, swayB, 1.9, 1.05);
      if (stalkLen > 5) {
        critterEye(g, tipA[0], tipA[1] - 1, 3.4, 3.8, eye, { state: eyeState });
        critterEye(g, tipB[0], tipB[1] - 1, 3.1, 3.5, eye, { state: eyeState });
        // a single cheek on the head, just under the stalks (both cheeks would float off the body in profile)
        fill(g, path.ellipse(headX + 1.5, headY + 3.4, 2.4, 1.5), '#ff8fa8', 0.4);
      } else {
        critterEye(g, headX, headY, 2.6, 2.6, eye, { state: 'squeeze' });
      }
    }

    // shell (spiral, rim highlight, gloss) — leads the lunge on the headbutt
    local(g, SHELL_X + shellDx, SHELL_Y, 0, () => {
      const shellPath = path.circle(0, 0, SHELL_R);
      shape(g, shellPath, pal.primary, { depth: 3.4, light: lightOf(pal.primary, 0.3), lightDepth: 1.4 });
      stroke(g, spiralPath(2.1, SHELL_R * 0.86), shade(pal.primary, -0.38), 1.1);
      stroke(g, (gg) => { gg.arc(0, 0, SHELL_R * 0.98, Math.PI * 1.05, Math.PI * 1.65); }, rim, 1.6, 0.8);
      glint(g, -SHELL_R * 0.32, -SHELL_R * 0.42, SHELL_R * 0.22, SHELL_R * 0.14, -0.4, 0.75);
      // variant flecks on the shell (mirrors the pixel base's variant-driven detail)
      for (let s = 0; s < variant; s++) {
        const a = (s / Math.max(1, variant)) * TAU + 1.1;
        fill(g, path.circle(Math.cos(a) * SHELL_R * 0.5, Math.sin(a) * SHELL_R * 0.45, 1.8), pal.accent ?? shade(pal.primary, -0.25), 0.85);
      }
    });

    g.restore();
  },
});
