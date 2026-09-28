/**
 * STORMCALLER — a storm-touched mage: a long flowing robe (wide bell sleeves, a hem that
 * swallows the legs and swings with motion), a cinched sash, and a tall pointed witch hat with
 * a brim and a glowing band jewel that droops with secondary motion. Staff or wand in hand.
 */
import { registerOutfit, registerHeadgear, BODY, type Rig } from '../humanoid';
import { registerClassKit } from '../classKits';
import { shape, path, stroke, fill, glint, local, shade, lightOf, mix, type Pt } from '../pen';

// ---------------------------------------------------------------------------
// tier-2 job accents: tempest (lightning bolt), tidesinger (frost sigil)
// ---------------------------------------------------------------------------

const TEMPEST_TINT = '#ffe066', TIDESINGER_TINT = '#8fe0ff';

function jobChestAccent(r: Rig): void {
  const { g, look } = r;
  if (look.job === 'tempest') {
    const tint = TEMPEST_TINT, dark = shade(tint, -0.55);
    r.torso(() => {
      const pts: Pt[] = [[-3.2, -15.4], [0.8, -10], [-1.4, -9], [3, -2], [-0.6, -6.6], [1.4, -7.6]];
      shape(g, path.poly(pts), tint, { shadow: false, line: dark, lw: 0.9 });
    });
  } else if (look.job === 'tidesinger') {
    const tint = TIDESINGER_TINT;
    r.torso(() => {
      shape(g, path.circle(0, -13.6, 2.2), tint, { shadow: shade(tint, -0.3), depth: 1, line: shade(tint, -0.5), lw: 0.8 });
      fill(g, path.circle(0, -13.6, 0.9), '#ffffff', 0.9);
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI;
        stroke(g, [[-Math.cos(a) * 3.4, -13.6 - Math.sin(a) * 3.4], [Math.cos(a) * 3.4, -13.6 + Math.sin(a) * 3.4]], tint, 0.6, 0.85);
      }
    });
  }
}

// ---------------------------------------------------------------------------
// outfit: robe
// ---------------------------------------------------------------------------

registerOutfit('robe', {
  legs: 'robe',
  sleeves: 'wide',
  torso(r) {
    const { g, look, pose } = r;
    const c = look.colors;
    const main = c.main;
    const sx = -pose.sway * 1.6;
    r.torso(() => {
      // wide, soft-shouldered robe body
      const body = path.blob([
        [-8.6, -BODY.torsoH - 1], [8.6, -BODY.torsoH - 1], [10.6, -10.5], [9.6 + sx * 0.3, 2.5],
        [-9.6 + sx * 0.3, 2.5], [-10.6, -10.5],
      ], 0.3);
      shape(g, body, main, { depth: 3, light: lightOf(main, 0.16) });
      // V neckline
      shape(g, path.poly([[-3.8, -BODY.torsoH - 0.4], [0, -BODY.torsoH + 3.6], [3.8, -BODY.torsoH - 0.4]]), shade(main, -0.32), { shadow: false, lw: 0.9 });
      // collar band
      shape(g, path.rrect(-5.6, -BODY.torsoH - 0.8, 11.2, 2.6, 1.3), shade(main, -0.14), { depth: 1 });
      // sash: diagonal band with a buckle
      shape(g, path.poly([[-8.2, -7.6], [-2, -10.6], [4.4, 4.8], [-1.4, 7]]), c.acc, { depth: 1.6, light: lightOf(c.acc, 0.2) });
      shape(g, path.rrect(-2.6, -3.4, 5, 4.6, 1.4), c.trim, { depth: 1, light: '#fff3c0', lw: 0.9 });
    });
    jobChestAccent(r);
  },
  overLegs(r) {
    const { g, look, pose } = r;
    const main = look.colors.main;
    const sx = -pose.sway * 5, fy = -pose.flutter * 4;
    r.torso(() => {
      const hem = path.blob([
        [-9.6, -2], [9.6, -2], [11.2 + sx * 0.6, 11.5 + fy * 0.4], [9 + sx, 19 + fy * 0.7],
        [3 + sx * 0.7, 20.5], [-3 + sx * 0.7, 20.5], [-9 + sx, 19 + fy * 0.7], [-11.2 + sx * 0.6, 11.5 + fy * 0.4],
      ], 0.35);
      shape(g, hem, shade(main, -0.05), { depth: 3.2, light: lightOf(main, 0.12) });
      stroke(g, [[-8.6 + sx * 0.8, 18 + fy * 0.6], [8.6 + sx * 0.8, 18 + fy * 0.6]], look.colors.trim, 1, 0.75);
      stroke(g, [[0, -1], [sx * 0.4, 17 + fy * 0.5]], shade(main, -0.3), 0.9);
    });
  },
  cuff(r, side) {
    const { g, j, look } = r;
    const back = side === 'B';
    const el = back ? j.elB : j.elF;
    const a = back ? j.ang.faB : j.ang.faF;
    const trim = back ? shade(look.colors.trim, -0.16) : look.colors.trim;
    local(g, el[0], el[1], -a, () => {
      fill(g, path.rrect(-3.6, BODY.foreArm - 1.6, 7.2, 1.5, 0.75), trim, 0.85);
    });
  },
  backView(r) {
    const { g, look, pose } = r;
    const main = look.colors.main;
    const sx = pose.sway * 3, fy = -pose.flutter * 3;
    r.torso(() => {
      shape(g, path.rrect(-10.6, -BODY.torsoH - 1, 21.2, BODY.torsoH + 3, 6), main, { depth: 3 });
      shape(g, path.blob([[-10, -1], [10, -1], [11.2 + sx * 0.5, 13.5 + fy * 0.4], [6 + sx, 20], [-6 + sx, 20], [-11.2 + sx * 0.5, 13.5 + fy * 0.4]], 0.35), shade(main, -0.08), { depth: 3 });
      stroke(g, [[0, -BODY.torsoH], [sx * 0.3, -2]], shade(main, -0.3), 1);
    });
  },
});

// ---------------------------------------------------------------------------
// headgear: stormhat (tall pointed hat, brim, band jewel — bends with sway/flutter)
// ---------------------------------------------------------------------------

registerHeadgear('stormhat', {
  hides: 'top',
  front(r) {
    const { g, look, pose } = r;
    const colors = look.headgear?.colors ?? ['#4a3a66', '#d9b25a', '#8fe6ff'];
    const cloth = colors[0], band = colors[1] ?? '#d9b25a', jewel = colors[2] ?? lightOf(band, 0.5);
    const sx = -pose.sway * 3.2, fy = -pose.flutter * 3;
    r.headFrame(() => {
      // sit the hat ON the crown (brim just above the brows) so the eyes stay visible,
      // cocked back a touch for attitude
      g.translate(-1, -8.6); g.rotate(-0.1);
      // bent conical crown
      const cone = path.blob([
        [-9.6, -3.4], [-6 + sx * 0.28, -16 + fy * 0.3], [1.6 + sx, -33.5 + fy],
        [6.4 + sx * 0.28, -16 + fy * 0.3], [9.6, -3.4],
      ], 0.32);
      shape(g, cone, cloth, { depth: 3, light: lightOf(cloth, 0.18) });
      stroke(g, [[0.4, -5], [1 + sx * 0.5, -20 + fy * 0.4], [1.4 + sx * 0.85, -30 + fy * 0.8]], shade(cloth, -0.3), 0.9);
      // floppy brim
      shape(g, path.blob([[-18.5, -1], [0, -4.6], [18.5, -1], [16, 3.4], [0, 5], [-16, 3.4]], 0.4), shade(cloth, -0.08), { depth: 2, light: lightOf(cloth, 0.14) });
      // band + jewel
      shape(g, path.rrect(-8.6, -6, 17.2, 3, 1.4), band, { depth: 1, light: lightOf(band, 0.3), lw: 0.9 });
      shape(g, path.circle(0, -4.5, 2.2), jewel, { shadow: shade(jewel, -0.35), depth: 1.2, line: shade(jewel, -0.55) });
      glint(g, -0.7, -5.3, 0.9, 0.6, -0.4, 0.9);
    });
  },
});

// ---------------------------------------------------------------------------
// class kit
// ---------------------------------------------------------------------------

registerClassKit('stormcaller', {
  look(l, b) {
    const main = b.armor ?? b.outfit;
    const acc = b.armorAcc ?? shade(mix(main, '#2a1e4a', 0.35), 0.05);
    const hatCloth = b.helmet ?? shade(main, -0.22);
    const hatBand = b.helmet ? (b.helmetAcc ?? '#d9b25a') : (b.armorAcc ?? '#d9b25a');
    const hatJewel = b.weapon[2] ?? lightOf(hatBand, 0.55);
    return {
      skin: l.appearance.skin, hair: l.appearance.hair, hairStyle: l.appearance.hairStyle, eyes: l.appearance.eyes,
      outfit: 'robe',
      colors: {
        main, acc, trim: b.armorAcc ?? '#d9b25a',
        sleeve: main, pants: shade(main, -0.2),
        boots: b.boots ?? shade(main, -0.35), gloves: b.gloves ?? shade(main, -0.1),
      },
      headgear: { id: 'stormhat', colors: [hatCloth, hatBand, hatJewel] },
      weapon: l.weaponType ? { type: l.weaponType, colors: b.weapon } : undefined,
      job: l.jobId,
      face: { brows: 'soft' },
    };
  },
  pose(p, clip) {
    // a light, grounded stance; a touch of extra sway so the hem/hat read as fabric
    if (clip === 'idle') p.sway *= 1.25;
  },
});
