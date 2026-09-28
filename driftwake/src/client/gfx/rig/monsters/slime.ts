/**
 * SLIME base (Puffmoss and its recolors: Cloud Puff, Blight Slime...): a jelly dome with a mossy
 * tuft, big glossy eyes and juicy squash & stretch. `pal.primary` = jelly body, `pal.secondary` =
 * inner gel tone, `pal.accent` = moss flecks/tuft (falls back to a shaded secondary). A bright,
 * non-dark `pal.eye` (see `isBrightEye`) makes the eyes emissive, same rule as the pixel bases.
 */
import { registerMonsterBase } from '../monsters';
import {
  shape, fill, stroke, path, local, glint, shade, lightOf, withAlpha,
  critterEye, critterBlush, pulse, clamp, TAU, type Pt, type PathFn,
} from '../pen';

const BW = 22, BH = 30;

/** Jelly dome silhouette. `bulge` (-1..1) swells/settles the crown for idle "breathing". */
function bodyPath(bulge: number): PathFn {
  const topY = -BH * (1 + bulge * 0.035);
  const pts: Pt[] = [
    [0, topY],
    [BW * 0.6, -BH * 0.83],
    [BW * 0.98, -BH * 0.42],
    [BW * 0.88, -BH * 0.08],
    [BW * 0.4, 0],
    [-BW * 0.4, 0],
    [-BW * 0.88, -BH * 0.08],
    [-BW * 0.98, -BH * 0.42],
    [-BW * 0.6, -BH * 0.83],
  ];
  return path.blob(pts, 0.55);
}

/** Three little leaf blades fanned around a point — the moss tuft riding the crown. */
function mossTuft(g: CanvasRenderingContext2D, color: string, ink: string): void {
  const leaf = (len: number) => path.blob([[0, 1], [len * 0.34, -len * 0.55], [0, -len], [-len * 0.34, -len * 0.55]], 0.5);
  local(g, -2.6, 0, -0.5, () => shape(g, leaf(9), color, { depth: 1, line: ink, lw: 0.9 }));
  local(g, 0, 0, 0.05, () => shape(g, leaf(11), color, { depth: 1.2, line: ink, lw: 0.9 }));
  local(g, 3, 0, 0.55, () => shape(g, leaf(8.5), color, { depth: 1, line: ink, lw: 0.9 }));
}

registerMonsterBase('slime', {
  frame: { worldW: 34, worldH: 28 },
  draw(g, pal, variant, clip, t, i) {
    const eye = pal.eye ?? '#241a14';
    const moss = pal.accent ?? shade(pal.secondary, -0.15);
    const mossInk = shade(moss, -0.45);

    let sx = 1, sy = 1, dx = 0, dy = 0, bulge = 0, mouthOpen = false;
    let eyeState: 'open' | 'closed' | 'wide' | 'squeeze' | 'x' = 'open';
    let flashAlpha = 0, fade = 1;
    const ph = t * TAU;

    switch (clip) {
      case 'idle': {
        bulge = Math.sin(ph);
        sy = 1 + bulge * 0.028; sx = 1 / sy;
        if (i === 5) eyeState = 'closed';
        break;
      }
      case 'move': {
        const hop = pulse(t);
        dy = -hop * 9;
        dx = (t - 0.5) * 4;
        const ground = clamp(1 - hop * 2.4, 0, 1);
        sy = 1 - ground * 0.3 + hop * 0.22;
        sx = 1 / sy;
        bulge = hop;
        break;
      }
      case 'attack': {
        const keys = [
          { sx: 1.22, sy: 0.82, dx: -3, dy: 2 },
          { sx: 0.86, sy: 1.26, dx: 2, dy: -6 },
          { sx: 0.8, sy: 1.34, dx: 9, dy: -8 },
          { sx: 1.3, sy: 0.78, dx: 13, dy: 0 },
          { sx: 1.12, sy: 0.9, dx: 8, dy: 0 },
          { sx: 1, sy: 1, dx: 0, dy: 0 },
        ];
        const k = keys[Math.min(i, keys.length - 1)];
        sx = k.sx; sy = k.sy; dx = k.dx; dy = k.dy;
        eyeState = i >= 1 && i <= 3 ? 'wide' : 'open';
        mouthOpen = i === 3;
        bulge = i <= 2 ? -0.4 : 0.3;
        break;
      }
      case 'hurt': {
        sx = 1.3; sy = 0.66; dx = -3 * (1 - i);
        eyeState = 'squeeze';
        flashAlpha = i === 0 ? 0.55 : 0;
        break;
      }
      case 'die': {
        const k = i / 4;
        sx = 1 + k * 0.95; sy = 1 - k * 0.78; dy = k * 2;
        eyeState = 'x';
        fade = k < 0.5 ? 1 : 1 - (k - 0.5) * 2;
        break;
      }
      default: break;
    }

    g.save();
    g.globalAlpha *= fade;
    g.translate(dx, dy);
    g.scale(sx, sy);

    const body = bodyPath(bulge);
    shape(g, body, pal.primary, { depth: 3.6 });
    // inner gel glow: a soft lighter core that reads as translucency
    fill(g, path.ellipse(-BW * 0.06, -BH * 0.56, BW * 0.5, BH * 0.3), lightOf(pal.secondary, 0.12), 0.5);
    fill(g, path.ellipse(-BW * 0.06, -BH * 0.56, BW * 0.5, BH * 0.3), pal.secondary, 0.28);
    glint(g, -BW * 0.34, -BH * 0.74, BW * 0.17, BH * 0.09, -0.4, 0.85);
    glint(g, BW * 0.42, -BH * 0.5, BW * 0.07, BH * 0.05, -0.2, 0.5);

    // variant flecks: more moss spots on higher variants (matches the pixel base's spot count)
    const nSpots = 2 + variant;
    for (let s = 0; s < nSpots; s++) {
      const a = (s / nSpots) * TAU + variant * 0.6;
      const px = Math.cos(a) * BW * 0.62, py = -BH * 0.42 + Math.sin(a) * BH * 0.34;
      if (py > -BH * 0.05) continue; // keep flecks off the ground-contact rim
      fill(g, path.circle(px, py, 2.4), moss, 0.9);
    }

    local(g, 0, -BH * (1 + bulge * 0.035) + 1.5, bulge * 0.12, () => mossTuft(g, moss, mossInk));

    const eyeY = -BH * 0.36;
    critterBlush(g, 0, eyeY + 8, 3.4, BW * 0.4);
    critterEye(g, -BW * 0.34, eyeY, 5.6, 6.2, eye, { state: eyeState });
    critterEye(g, BW * 0.34, eyeY, 5.2, 5.8, eye, { state: eyeState });
    if (mouthOpen) {
      shape(g, path.ellipse(0, -BH * 0.16, 2.6, 2), '#3a1622', { shadow: false, lw: 0.8 });
    } else {
      stroke(g, (gg) => { gg.moveTo(-3, -BH * 0.15); gg.quadraticCurveTo(0, -BH * 0.11, 3, -BH * 0.15); }, '#6a2a2e', 1);
    }

    g.restore();

    if (flashAlpha > 0) {
      g.save();
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = withAlpha('#ffffff', flashAlpha);
      g.fillRect(-2000, -2000, 4000, 4000);
      g.restore();
    }
  },
});
