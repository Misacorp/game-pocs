/**
 * MUSHROOM base (Sproutling and its recolors: Spore Mushling, Rot Mushling...): a spotted cap
 * worn like a hat over a round-bodied stem with the face, tiny stepping feet, and a sprout leaf
 * on top. `pal.primary` = cap, `pal.secondary` = stem/body, `pal.accent` = cap spots (falls back
 * to a light tint). The cap tilts as a unit around its rim, exposing its gilled underside.
 */
import { registerMonsterBase } from '../monsters';
import {
  shape, fill, stroke, path, local, glint, shade, mix, lightOf,
  critterEye, critterBlush, clamp, lerp, easeInOut, TAU, type Pt, type PathFn,
} from '../pen';

const STEM_W = 8.5, STEM_TOP = -22, RIM_Y = -22;
const CAP_APEX = -40, CAP_RX = 19;

function stemPath(breath: number): PathFn {
  const w = STEM_W * (1 + breath * 0.02);
  const pts: Pt[] = [
    [w * 0.78, -3], [w, -12], [w * 0.68, STEM_TOP * (1 + breath * 0.01)],
    [-w * 0.68, STEM_TOP * (1 + breath * 0.01)], [-w, -12], [-w * 0.78, -3],
  ];
  return path.blob(pts, 0.4);
}

function footPath(x: number, lift: number): PathFn {
  const y = -1.5 - lift * 2.5;
  const sq = 1 - lift * 0.3;
  return path.ellipse(x, y, 4.4 * (2 - sq), 2.6 * sq);
}

/** Cap + gills + spots + sprout leaf, drawn as one unit around the rim pivot so it can tilt. */
function drawCap(g: CanvasRenderingContext2D, tilt: number, primary: string, secondary: string, variant: number, spotColor: string, leaf: string): void {
  local(g, 0, RIM_Y, tilt, () => {
    const gillTone = mix(secondary, '#fff6e0', 0.55);
    fill(g, path.blob([[18, -1], [14.5, 3.2], [-14.5, 3.2], [-18, -1], [-14, -3.4], [14, -3.4]], 0.4), shade(gillTone, -0.08), 0.95);
    stroke(g, [[-14, -3.2], [14, -3.2]], shade(gillTone, -0.3), 0.7, 0.6);
    const cap = path.blob([
      [0, CAP_APEX - RIM_Y], [CAP_RX * 0.68, CAP_APEX - RIM_Y + 4.4], [CAP_RX * 0.98, -3.6],
      [CAP_RX * 0.78, 1], [-CAP_RX * 0.78, 1], [-CAP_RX * 0.98, -3.6],
      [-CAP_RX * 0.68, CAP_APEX - RIM_Y + 4.4],
    ], 0.5);
    shape(g, cap, primary, { depth: 3.6, light: lightOf(primary, 0.3), lightDepth: 1.3 });
    const nSpots = 3 + variant;
    for (let s = 0; s < nSpots; s++) {
      const a = (s / nSpots) * TAU + variant * 0.5;
      const rx = CAP_RX * 0.62, ry = (CAP_APEX - RIM_Y) * 0.55;
      const px = Math.cos(a) * rx, py = (CAP_APEX - RIM_Y) * 0.35 + Math.sin(a) * ry * 0.6;
      if (py > -2) continue;
      fill(g, path.circle(px, py, 2.2), spotColor, 0.92);
    }
    glint(g, -CAP_RX * 0.28, CAP_APEX - RIM_Y + 2, CAP_RX * 0.16, 2.2, -0.4, 0.6);
    // sprout leaf at the apex
    local(g, 0, CAP_APEX - RIM_Y, 0, () => {
      const bud = (a: number, len: number) => local(g, 0, 0, a, () => shape(g, path.blob([[0, 1], [len * 0.32, -len * 0.55], [0, -len], [-len * 0.32, -len * 0.55]], 0.5), leaf, { depth: 0.9, lw: 0.9 }));
      bud(-0.35, 6.5); bud(0.3, 7.5);
    });
  });
}

registerMonsterBase('mushroom', {
  frame: { worldW: 26, worldH: 30 },
  draw(g, pal, variant, clip, t, i) {
    const eye = pal.eye ?? '#241a14';
    const spotColor = pal.accent ?? '#fff3e0';
    const leaf = mix('#8fd96a', pal.secondary, 0.45);

    let dx = 0, dy = 0, tilt = 0, breath = 0, sx = 1, sy = 1, stepA = 0, stepB = 0;
    let eyeState: 'open' | 'closed' | 'wide' | 'squeeze' | 'x' = 'open';
    let fade = 1;
    const ph = t * TAU;

    switch (clip) {
      case 'idle': {
        breath = Math.sin(ph);
        sy = 1 + breath * 0.02; sx = 1 / sy;
        tilt = Math.sin(ph * 0.5) * 0.04;
        if (i === 5) eyeState = 'closed';
        break;
      }
      case 'move': {
        const s = Math.sin(ph);
        stepA = Math.max(0, s); stepB = Math.max(0, -s);
        dy = -(stepA + stepB) * 1.6;
        tilt = -s * 0.08;
        breath = s;
        break;
      }
      case 'attack': {
        const keys = [
          { dx: -2, dy: 2, tilt: -0.22, sy: 0.9 },
          { dx: 0, dy: -7, tilt: 0.1, sy: 1.12 },
          { dx: 7, dy: -9, tilt: 0.55, sy: 1.05 },
          { dx: 12, dy: 0, tilt: 0.85, sy: 0.76 },
          { dx: 7, dy: 0, tilt: 0.3, sy: 0.92 },
          { dx: 0, dy: 0, tilt: 0, sy: 1 },
        ];
        const k = keys[Math.min(i, keys.length - 1)];
        dx = k.dx; dy = k.dy; tilt = k.tilt; sy = k.sy; sx = 1 / sy;
        eyeState = i >= 2 && i <= 3 ? 'wide' : 'open';
        break;
      }
      case 'hurt': {
        tilt = i === 0 ? 0.6 : 0.35;
        sy = 0.78; sx = 1.12;
        eyeState = 'squeeze';
        dx = -2;
        break;
      }
      case 'die': {
        const k = i / 4;
        tilt = easeInOut(clamp(k * 1.2, 0, 1)) * 1.3;
        sy = lerp(1, 0.62, k); sx = lerp(1, 1.3, k);
        dy = k * 3;
        eyeState = 'x';
        fade = k < 0.55 ? 1 : 1 - (k - 0.55) * (1 / 0.45);
        break;
      }
      default: break;
    }

    g.save();
    g.globalAlpha *= fade;
    g.translate(dx, dy);
    g.scale(sx, sy);

    shape(g, footPath(-4.6, stepB), shade(pal.secondary, -0.15), { depth: 1 });
    shape(g, footPath(4.6, stepA), shade(pal.secondary, -0.15), { depth: 1 });

    shape(g, stemPath(breath), pal.secondary, { depth: 2.6 });

    const eyeY = -13;
    critterBlush(g, 0, eyeY + 5.6, 2, 4.8);
    critterEye(g, -3.4, eyeY, 3.6, 4, eye, { state: eyeState });
    critterEye(g, 3.6, eyeY, 3.3, 3.7, eye, { state: eyeState });

    drawCap(g, tilt, pal.primary, pal.secondary, variant, spotColor, leaf);

    g.restore();
  },
});
