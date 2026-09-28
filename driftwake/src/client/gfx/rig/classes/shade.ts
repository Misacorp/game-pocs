/**
 * SHADE — a silent blade: tight dark garb, a cloth mask over the nose and mouth, a long scarf
 * that trails hard behind with exaggerated secondary motion, and wrapped forearms/shins. A low,
 * wide-legged stance. Dagger or throwing knives in hand.
 */
import { registerOutfit, BODY, type Rig } from '../humanoid';
import { registerClassKit } from '../classKits';
import { shape, path, stroke, fill, local, shade, lightOf, mix, type Pt } from '../pen';

// ---------------------------------------------------------------------------
// tier-2 job accents: duskblade (crossed blades emblem), hexslinger (violet rune marks)
// ---------------------------------------------------------------------------

const DUSKBLADE_TINT = '#d6dde3', HEXSLINGER_TINT = '#b25be0';

function jobBackAccent(r: Rig): void {
  const { g, look } = r;
  if (look.job !== 'duskblade') return;
  const tint = DUSKBLADE_TINT, dark = shade(tint, -0.55);
  r.torso(() => {
    stroke(g, [[-3.6, -14.4], [3.6, -5.4]], dark, 1.8);
    stroke(g, [[3.6, -14.4], [-3.6, -5.4]], dark, 1.8);
    stroke(g, [[-3.6, -14.4], [3.6, -5.4]], tint, 0.9);
    stroke(g, [[3.6, -14.4], [-3.6, -5.4]], tint, 0.9);
  });
}

function jobChestAccent(r: Rig): void {
  const { g, look } = r;
  if (look.job !== 'hexslinger') return;
  const tint = HEXSLINGER_TINT;
  r.torso(() => {
    stroke(g, (gg) => { gg.arc(0, -11.4, 2.4, 0, Math.PI * 2); }, tint, 0.9, 0.9);
    fill(g, path.circle(0, -11.4, 0.9), tint, 0.95);
    fill(g, path.circle(0, -6.6, 0.8), tint, 0.9);
  });
}

// ---------------------------------------------------------------------------
// outfit: garb
// ---------------------------------------------------------------------------

registerOutfit('garb', {
  legs: 'pants',
  sleeves: 'fitted',
  back(r) {
    const { g, look, pose } = r;
    const c = look.colors;
    const sx = -pose.sway * 6, fy = -pose.flutter * 6;
    r.torso(() => {
      // long trailing scarf — strong secondary motion, the class's signature silhouette read
      const tail = path.blob([
        [-1, -BODY.torsoH + 1], [-5.2, -BODY.torsoH - 0.4], [-8 + sx * 0.3, -6 + fy * 0.2],
        [-11.2 + sx * 0.7, 2 + fy * 0.5], [-14 + sx * 1.1, 11 + fy * 0.9], [-15.6 + sx * 1.4, 19 + fy * 1.2],
        [-12 + sx, 22 + fy * 1.3], [-8 + sx * 0.7, 15 + fy * 0.8], [-6 + sx * 0.4, 6], [-3, -3], [-1.6, -9],
      ], 0.4);
      shape(g, tail, shade(c.acc, -0.1), { depth: 2.4, light: lightOf(c.acc, 0.16) });
      stroke(g, [[-6 + sx * 0.3, -4], [-10 + sx * 0.8, 8 + fy * 0.5], [-11.6 + sx * 1.1, 18 + fy * 0.9]], shade(c.acc, -0.35), 0.9);
    });
    jobBackAccent(r);
  },
  torso(r) {
    const { g, look } = r;
    const c = look.colors;
    r.torso(() => {
      // tight bodice
      const body = path.blob([[-7.8, -BODY.torsoH - 0.5], [8, -BODY.torsoH - 0.5], [9, -8], [8, 3.2], [-8.2, 3.2], [-8.8, -8]], 0.26);
      shape(g, body, c.main, { depth: 2.6, light: lightOf(c.main, 0.12) });
      // crossed chest wraps
      shape(g, path.poly([[-7.6, -13], [-1, -15.4], [2, -4], [-4.4, -2]]), c.acc, { depth: 1.4, light: lightOf(c.acc, 0.2) });
      shape(g, path.poly([[7.6, -13], [1, -15.4], [-2, -4], [4.4, -2]]), shade(c.acc, -0.08), { depth: 1.4 });
      // belt
      shape(g, path.rrect(-8.4, -6.4, 16.8, 2.6, 1.2), '#232028', { depth: 1 });
      shape(g, path.rrect(-2, -6.9, 4, 3.4, 0.9), c.trim, { depth: 0.8, lw: 0.8 });
    });
    jobChestAccent(r);
  },
  overLegs(r) {
    const { g, j, look } = r;
    const wrap = shade(look.colors.acc, -0.05);
    for (const side of ['B', 'F'] as const) {
      const back = side === 'B';
      const kn = back ? j.knB : j.knF, an = back ? j.anB : j.anF;
      const shinA = back ? j.ang.shB : j.ang.shF;
      const mx = kn[0] + (an[0] - kn[0]) * 0.55, my = kn[1] + (an[1] - kn[1]) * 0.55;
      local(g, mx, my, -shinA * 0.5, () => {
        shape(g, path.rrect(-3.4, -3.2, 6.8, 6, 1.8), wrap, { depth: 1.2 });
        stroke(g, [[-3, -1.4], [3, -0.4]], shade(wrap, -0.3), 0.6, 0.8);
        stroke(g, [[-3, 1.2], [3, 2.2]], shade(wrap, -0.3), 0.6, 0.8);
      });
    }
  },
  cuff(r, side) {
    const { g, j, look } = r;
    const back = side === 'B';
    const el = back ? j.elB : j.elF, ha = back ? j.haB : j.haF;
    const a = back ? j.ang.faB : j.ang.faF;
    const wrap = back ? shade(look.colors.acc, -0.18) : shade(look.colors.acc, -0.05);
    const mx = el[0] + (ha[0] - el[0]) * 0.35, my = el[1] + (ha[1] - el[1]) * 0.35;
    local(g, mx, my, -a, () => {
      shape(g, path.rrect(-3.6, -2.4, 7.2, 4.6, 1.6), wrap, { depth: 1.2 });
      stroke(g, [[-3, -1], [3, 0.4]], shade(wrap, -0.3), 0.6, 0.75);
      stroke(g, [[-3, 1.2], [3, 2.4]], shade(wrap, -0.3), 0.6, 0.75);
    });
  },
  collar(r) {
    const { g, look } = r;
    const c = look.colors;
    r.headFrame(() => {
      // popped stand collar, hugging the neck below the jaw
      shape(g, path.blob([[-7, 9], [7.5, 8], [9, 13.5], [6, 18], [-6, 18], [-8.5, 13.5]], 0.32), shade(c.main, -0.1), { depth: 1.4 });
      // cloth mask over the nose/mouth, tied at the back of the head — sits well clear of the
      // eyes (sclera reaches y~5.4), covering the lower half of the face down past the chin
      const mask = path.blob([[-7.4, 6.4], [-8.8, 10], [-4, 14], [8.6, 15], [14.8, 11.4], [16, 6.4], [11, 5.8], [3, 6.2]], 0.35);
      shape(g, mask, shade(c.acc, -0.12), { depth: 1.6, light: lightOf(c.acc, 0.14) });
      stroke(g, [[-3, 9.8], [9, 10.6]], shade(c.acc, -0.35), 0.7, 0.6);
      stroke(g, [[-7.2, 7.6], [-13, 4.6]], shade(c.acc, -0.2), 1.2, 0.8);
      stroke(g, [[-8, 11.6], [-13.6, 10.6]], shade(c.acc, -0.2), 1.2, 0.8);
    });
  },
  backView(r) {
    const { g, look, pose } = r;
    const c = look.colors;
    const sx = pose.sway * 5, fy = -pose.flutter * 5;
    r.torso(() => {
      shape(g, path.rrect(-9.4, -BODY.torsoH - 1, 18.8, BODY.torsoH - 1, 5), c.main, { depth: 3 });
      shape(g, path.blob([
        [-1, -BODY.torsoH + 1], [-4.4, -BODY.torsoH - 1], [-7.2 + sx * 0.3, -6 + fy * 0.2],
        [-10 + sx * 0.7, 3 + fy * 0.5], [-12.6 + sx * 1.1, 13 + fy * 0.9], [-9.6 + sx, 18 + fy * 1.1],
        [-6 + sx * 0.6, 9], [-3.8, -3], [-2.2, -9],
      ], 0.4), shade(c.acc, -0.1), { depth: 2.4 });
    });
  },
});

// ---------------------------------------------------------------------------
// class kit
// ---------------------------------------------------------------------------

registerClassKit('shade', {
  look(l, b) {
    const main = b.armor ?? mix(b.outfit, '#1c1a22', 0.55);
    const acc = b.armorAcc ?? shade(b.outfit, -0.15);
    return {
      skin: l.appearance.skin, hair: l.appearance.hair, hairStyle: l.appearance.hairStyle, eyes: l.appearance.eyes,
      outfit: 'garb',
      colors: {
        main, acc, trim: b.armorAcc ?? '#8a97a6',
        sleeve: shade(main, -0.1), pants: shade(main, -0.05),
        boots: b.boots ?? shade(main, -0.28), gloves: b.gloves ?? shade(main, -0.1),
      },
      headgear: b.helmet ? { id: 'helm', colors: [b.helmet, b.helmetAcc ?? '#8a97a6'] } : undefined,
      weapon: l.weaponType ? { type: l.weaponType, colors: b.weapon } : undefined,
      job: l.jobId,
      extras: { mask: true },
      face: { brows: 'stern' },
    };
  },
  pose(p, clip) {
    // a low, wide-legged, forward-leaning stance
    if (clip === 'idle' || clip === 'walk' || clip === 'crouch') {
      p.dy += 2.6;
      p.lean += 0.07;
      p.lF = [p.lF[0] + 0.16, p.lF[1]];
      p.lB = [p.lB[0] - 0.16, p.lB[1]];
    }
  },
});
